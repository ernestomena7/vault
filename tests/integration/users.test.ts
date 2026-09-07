import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq, like, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { assertUserDeletable, withLastAdminGuard } from '@/lib/auth/admin-guard';
import { ApiError } from '@/lib/http/errors';

/**
 * User administration.
 *
 * The guarantee worth testing hardest is FR-005: Vault can never be left
 * without an active Admin, because there is no recovery from that short of
 * editing the database by hand.
 */

const PREFIX = 'usertest-';

let adminA: number;
let adminB: number;
let uploader: number;

async function purge() {
  await db.delete(users).where(like(users.email, `${PREFIX}%`));
}

async function makeUser(
  suffix: string,
  role: 'admin' | 'uploader',
  isActive = true,
): Promise<number> {
  const [row] = await db
    .insert(users)
    .values({
      email: `${PREFIX}${suffix}@vault.test`,
      name: `User ${suffix}`,
      passwordHash: await hashPassword('correct horse battery staple'),
      role,
      isActive,
    })
    .$returningId();
  return row!.id;
}

/** How many active admins exist outside this fixture's own accounts. */
async function otherActiveAdmins(): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(users)
    .where(
      and(eq(users.role, 'admin'), eq(users.isActive, true), ne(users.email, `${PREFIX}a@vault.test`)),
    );
  return Number(rows[0]?.total ?? 0);
}

beforeAll(purge);
afterAll(purge);

beforeEach(async () => {
  await purge();
  adminA = await makeUser('a', 'admin');
  adminB = await makeUser('b', 'admin');
  uploader = await makeUser('c', 'uploader');
});

describe('password storage', () => {
  it('never stores the password itself, and verifies the right one', async () => {
    const rows = await db.select().from(users).where(eq(users.id, uploader)).limit(1);
    const hash = rows[0]!.passwordHash;

    expect(hash).not.toContain('correct horse battery staple');
    expect(hash.split('$')).toHaveLength(5);
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong password entirely', hash)).resolves.toBe(false);
  });

  it('produces a different hash for the same password each time', async () => {
    const first = await hashPassword('same password');
    const second = await hashPassword('same password');
    expect(first).not.toBe(second);
    await expect(verifyPassword('same password', first)).resolves.toBe(true);
  });

  it('rejects a malformed stored hash without throwing', async () => {
    await expect(verifyPassword('anything', 'not-a-real-hash')).resolves.toBe(false);
  });
});

describe('the last admin (FR-005)', () => {
  it('can be demoted while another active admin exists', async () => {
    await withLastAdminGuard(adminA, 'demote', async (tx) => {
      await tx.update(users).set({ role: 'uploader' }).where(eq(users.id, adminA));
    });

    const after = await db.select().from(users).where(eq(users.id, adminA)).limit(1);
    expect(after[0]!.role).toBe('uploader');
  });

  it('cannot be demoted once it is the only one left', async () => {
    // Remove every other active admin, including any seeded outside this suite.
    await db
      .update(users)
      .set({ role: 'uploader' })
      .where(and(eq(users.role, 'admin'), ne(users.id, adminA)));

    expect(await otherActiveAdmins()).toBe(0);

    const error = (await withLastAdminGuard(adminA, 'demote', async (tx) => {
      await tx.update(users).set({ role: 'uploader' }).where(eq(users.id, adminA));
    }).catch((e: unknown) => e)) as InstanceType<typeof ApiError>;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('last_admin');
    expect(error.status).toBe(409);

    // Still an admin — the guard rolled the change back.
    const after = await db.select().from(users).where(eq(users.id, adminA)).limit(1);
    expect(after[0]!.role).toBe('admin');
  });

  it('cannot be deactivated once it is the only one left', async () => {
    await db
      .update(users)
      .set({ role: 'uploader' })
      .where(and(eq(users.role, 'admin'), ne(users.id, adminA)));

    const error = (await withLastAdminGuard(adminA, 'deactivate', async (tx) => {
      await tx.update(users).set({ isActive: false }).where(eq(users.id, adminA));
    }).catch((e: unknown) => e)) as InstanceType<typeof ApiError>;

    expect(error.code).toBe('last_admin');

    const after = await db.select().from(users).where(eq(users.id, adminA)).limit(1);
    expect(after[0]!.isActive).toBe(true);
  });

  it('does not count an inactive admin as cover', async () => {
    await db.update(users).set({ isActive: false }).where(eq(users.id, adminB));
    await db
      .update(users)
      .set({ role: 'uploader' })
      .where(and(eq(users.role, 'admin'), ne(users.id, adminA), ne(users.id, adminB)));

    const error = (await withLastAdminGuard(adminA, 'demote', async (tx) => {
      await tx.update(users).set({ role: 'uploader' }).where(eq(users.id, adminA));
    }).catch((e: unknown) => e)) as InstanceType<typeof ApiError>;

    // An account that cannot sign in is not an administrator for this purpose.
    expect(error.code).toBe('last_admin');
  });

  it('does not block changes to a non-admin', async () => {
    await expect(
      withLastAdminGuard(uploader, 'deactivate', async (tx) => {
        await tx.update(users).set({ isActive: false }).where(eq(users.id, uploader));
      }),
    ).resolves.toBeUndefined();
  });
});

describe('deleting an account', () => {
  it('is allowed when the person has no files and no history', async () => {
    await expect(assertUserDeletable(uploader)).resolves.toBeUndefined();
  });
});
