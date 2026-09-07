import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { users, type Role, type User } from '@/lib/db/schema';
import { forbidden, unauthenticated } from '@/lib/http/errors';
import { auth } from './config';

/**
 * Server-side authorization.
 *
 * These are the real gate. The interface hiding a control is presentation, not
 * security — every route calls one of these before it acts (FR-003).
 *
 * Each call re-reads the user from the database rather than trusting the
 * session cookie's claims. That costs one indexed lookup per request and buys
 * immediate effect for role changes and deactivations: a demoted Admin is an
 * Uploader on their very next request, and a deactivated account is refused
 * even though its cookie is still valid.
 */

export type ActingUser = Pick<User, 'id' | 'email' | 'name' | 'role' | 'isActive'>;

/** The signed-in user, or null. Never throws — for pages that render either way. */
export async function getCurrentUser(): Promise<ActingUser | null> {
  const session = await auth();
  const id = session?.user?.id ? Number(session.user.id) : Number.NaN;
  if (!Number.isFinite(id)) return null;

  const found = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  const user = found[0];
  // A deleted or deactivated account has a live cookie until it expires; the
  // database is what decides.
  if (!user || !user.isActive) return null;
  return user;
}

/** Requires any signed-in user. Throws 401 otherwise. */
export async function requireUser(): Promise<ActingUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthenticated();
  return user;
}

/** Requires an Admin. Throws 401 when anonymous, 403 when merely an Uploader. */
export async function requireAdmin(): Promise<ActingUser> {
  const user = await requireUser();
  if (user.role !== 'admin') throw forbidden();
  return user;
}

export function isAdmin(user: { role: Role } | null | undefined): boolean {
  return user?.role === 'admin';
}
