import 'server-only';
import { and, eq, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { fileTransitions, files, users } from '@/lib/db/schema';
import { ApiError } from '@/lib/http/errors';

/**
 * The last-Admin guard (FR-005).
 *
 * Vault must never end up with nobody who can administer it — there is no
 * recovery path short of editing the database by hand. The count runs inside a
 * transaction with the rows locked, so two Admins demoting each other at the
 * same moment cannot both succeed.
 */

type Change = 'demote' | 'deactivate' | 'delete';

const REASON: Record<Change, string> = {
  demote: 'change the role of',
  deactivate: 'deactivate',
  delete: 'delete',
};

/**
 * Runs `change` only if at least one active Admin remains afterwards.
 * The caller supplies the mutation so the check and the write share a
 * transaction.
 */
export async function withLastAdminGuard<T>(
  userId: number,
  changeKind: Change,
  change: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const target = await tx.select().from(users).where(eq(users.id, userId)).for('update').limit(1);
    const user = target[0];
    if (!user) throw new ApiError('not_found', 'That user could not be found.');

    // Only a change affecting an active Admin can strand the system.
    if (user.role === 'admin' && user.isActive) {
      const others = await tx
        .select({ total: sql<number>`COUNT(*)` })
        .from(users)
        .where(and(eq(users.role, 'admin'), eq(users.isActive, true), ne(users.id, userId)));

      if (Number(others[0]?.total ?? 0) === 0) {
        throw new ApiError(
          'last_admin',
          `This is the only active admin, so you cannot ${REASON[changeKind]} it. Make someone else an admin first.`,
        );
      }
    }

    return change(tx);
  });
}

/**
 * Refuses to delete a user whose work is referenced, so history keeps its
 * attribution. Deactivation is the alternative (spec Assumptions).
 */
export async function assertUserDeletable(userId: number): Promise<void> {
  const uploaded = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(files)
    .where(eq(files.uploadedBy, userId));

  if (Number(uploaded[0]?.total ?? 0) > 0) {
    throw new ApiError(
      'in_use',
      'This person has uploaded files, so their account cannot be deleted without breaking that history. Deactivate it instead — they lose access and the files stay attributed to them.',
    );
  }

  const acted = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(fileTransitions)
    .where(eq(fileTransitions.actorId, userId));

  if (Number(acted[0]?.total ?? 0) > 0) {
    throw new ApiError(
      'in_use',
      'This person appears in the approval history, so their account cannot be deleted. Deactivate it instead.',
    );
  }
}
