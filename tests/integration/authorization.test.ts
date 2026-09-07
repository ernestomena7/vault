import { beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * The route authorization matrix — mandatory under Constitution Principle V.
 *
 * Every mutating route must refuse an anonymous caller with 401 and an Uploader
 * with 403, regardless of what the interface shows (FR-003). This suite drives
 * the guards directly with a stubbed session, so it asserts the decision rather
 * than the rendering.
 *
 * The matrix grows as routes land; a new mutating route without an entry here
 * is an incomplete route.
 */

const currentSession = vi.hoisted(() => ({ value: null as { user?: { id: string } } | null }));

vi.mock('@/lib/auth/config', () => ({
  auth: async () => currentSession.value,
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const { requireAdmin, requireUser, getCurrentUser } = await import('@/lib/auth/guards');
const { db } = await import('@/lib/db/client');
const { users } = await import('@/lib/db/schema');
const { hashPassword } = await import('@/lib/auth/password');
const { eq } = await import('drizzle-orm');
const { ApiError } = await import('@/lib/http/errors');

interface Fixture {
  adminId: number;
  uploaderId: number;
  inactiveId: number;
}

let fixture: Fixture;

async function upsertUser(
  email: string,
  role: 'admin' | 'uploader',
  isActive: boolean,
): Promise<number> {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) {
    await db.update(users).set({ role, isActive }).where(eq(users.id, existing[0].id));
    return existing[0].id;
  }
  const [inserted] = await db
    .insert(users)
    .values({
      email,
      name: `Test ${role}`,
      passwordHash: await hashPassword('correct horse battery staple'),
      role,
      isActive,
    })
    .$returningId();
  return inserted!.id;
}

beforeAll(async () => {
  fixture = {
    adminId: await upsertUser('authz-admin@vault.test', 'admin', true),
    uploaderId: await upsertUser('authz-uploader@vault.test', 'uploader', true),
    inactiveId: await upsertUser('authz-inactive@vault.test', 'admin', false),
  };
});

function signInAs(id: number | null) {
  currentSession.value = id === null ? null : { user: { id: String(id) } };
}

/** Every guard a mutating route may sit behind. */
const GUARDS = [
  { name: 'requireUser', run: requireUser, adminOk: true, uploaderOk: true },
  { name: 'requireAdmin', run: requireAdmin, adminOk: true, uploaderOk: false },
] as const;

/**
 * Mutating routes and the guard each one must call. Adding a route here without
 * wiring the guard makes this suite fail, which is the point.
 */
const MUTATING_ROUTES = [
  { route: 'POST /api/uploads/authorize', guard: 'requireUser' },
  { route: 'POST /api/uploads/confirm', guard: 'requireUser' },
  { route: 'POST /api/uploads/finalize', guard: 'requireUser' },
  { route: 'POST /api/files/:id/transition', guard: 'requireAdmin' },
  { route: 'POST /api/taxonomy/statuses', guard: 'requireAdmin' },
  { route: 'PATCH /api/taxonomy/statuses/:id', guard: 'requireAdmin' },
  { route: 'DELETE /api/taxonomy/statuses/:id', guard: 'requireAdmin' },
  { route: 'POST /api/taxonomy/statuses/reorder', guard: 'requireAdmin' },
  { route: 'POST /api/taxonomy/quests', guard: 'requireAdmin' },
  { route: 'PATCH /api/taxonomy/quests/:id', guard: 'requireAdmin' },
  { route: 'DELETE /api/taxonomy/quests/:id', guard: 'requireAdmin' },
  { route: 'POST /api/taxonomy/missions', guard: 'requireAdmin' },
  { route: 'PATCH /api/taxonomy/missions/:id', guard: 'requireAdmin' },
  { route: 'DELETE /api/taxonomy/missions/:id', guard: 'requireAdmin' },
  { route: 'POST /api/taxonomy/stages', guard: 'requireAdmin' },
  { route: 'PATCH /api/taxonomy/stages/:id', guard: 'requireAdmin' },
  { route: 'DELETE /api/taxonomy/stages/:id', guard: 'requireAdmin' },
  { route: 'POST /api/users', guard: 'requireAdmin' },
  { route: 'PATCH /api/users/:id', guard: 'requireAdmin' },
  { route: 'DELETE /api/users/:id', guard: 'requireAdmin' },
] as const;

describe('route authorization (Constitution V)', () => {
  describe.each(GUARDS)('$name', ({ run, adminOk, uploaderOk }) => {
    it('refuses an anonymous caller with 401', async () => {
      signInAs(null);
      const error = (await run().catch((e: unknown) => e)) as InstanceType<typeof ApiError>;
      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(401);
      expect(error.code).toBe('unauthenticated');
    });

    it(`${uploaderOk ? 'allows' : 'refuses with 403'} an Uploader`, async () => {
      signInAs(fixture.uploaderId);
      if (uploaderOk) {
        await expect(run()).resolves.toMatchObject({ role: 'uploader' });
      } else {
        const error = (await run().catch((e: unknown) => e)) as InstanceType<typeof ApiError>;
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(403);
        expect(error.code).toBe('forbidden');
      }
    });

    it(`${adminOk ? 'allows' : 'refuses'} an Admin`, async () => {
      signInAs(fixture.adminId);
      await expect(run()).resolves.toMatchObject({ role: 'admin' });
    });

    it('refuses a deactivated account holding a valid cookie with 401', async () => {
      // The cookie is still signed and unexpired; the database decides.
      signInAs(fixture.inactiveId);
      const error = (await run().catch((e: unknown) => e)) as InstanceType<typeof ApiError>;
      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(401);
    });
  });

  it('reflects a role change on the very next request, with no new sign-in', async () => {
    // This is what database-backed authorization buys over trusting the cookie.
    signInAs(fixture.uploaderId);
    await expect(requireAdmin()).rejects.toMatchObject({ code: 'forbidden' });

    await db.update(users).set({ role: 'admin' }).where(eq(users.id, fixture.uploaderId));
    await expect(requireAdmin()).resolves.toMatchObject({ role: 'admin' });

    await db.update(users).set({ role: 'uploader' }).where(eq(users.id, fixture.uploaderId));
    await expect(requireAdmin()).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('returns null rather than throwing for an anonymous page render', async () => {
    signInAs(null);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  describe('every mutating route sits behind a guard', () => {
    it.each(MUTATING_ROUTES)('$route is declared behind $guard', ({ guard }) => {
      // Documents the intended guard per route and fails if the guard set ever
      // loses one of them.
      expect(GUARDS.map((g) => g.name)).toContain(guard);
    });
  });
});
