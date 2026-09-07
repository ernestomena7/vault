import { asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { UserManager } from './user-manager';

export const metadata = { title: 'Users · Vault' };
export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const admin = await requireAdmin();

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .orderBy(asc(users.name));

  return (
    <div style={{ maxWidth: 820 }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1
          style={{
            fontSize: 'var(--text-heading-lg)',
            lineHeight: 'var(--leading-heading-lg)',
            fontWeight: 'var(--fw-semibold)',
          }}
        >
          Users
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
          Uploaders can upload and see their own files. Admins can do everything, including this
          page. A role change takes effect on that person&apos;s next request.
        </p>
      </header>

      <UserManager users={rows} currentUserId={admin.id} />
    </div>
  );
}
