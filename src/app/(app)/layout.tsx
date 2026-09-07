import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';
import { AppNav } from '@/components/app-nav';

/**
 * The signed-in shell.
 *
 * An Uploader sees no administrative navigation at all — not disabled, absent
 * (US1 scenario 2). The links being hidden is presentation; the routes behind
 * them refuse an Uploader on their own (FR-003).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AppNav role={user.role} userName={user.name} />
      <main style={{ flex: 1, minWidth: 0, background: 'var(--bg-canvas)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: 'var(--space-8) var(--space-7)' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
