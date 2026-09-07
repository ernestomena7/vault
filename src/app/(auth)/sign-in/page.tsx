import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';
import { SignInForm } from './sign-in-form';
import { VaultMark } from '@/components/vault-mark';

export const metadata = { title: 'Sign in · Vault' };

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) redirect('/upload');

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-6)',
        // The one place a gradient wash is allowed: the auth screen.
        background:
          'radial-gradient(1200px 600px at 50% -10%, var(--accent-subtle-bg), transparent 70%)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ marginBottom: 'var(--space-7)' }}>
          <div style={{ color: 'var(--accent)', marginBottom: 'var(--space-4)' }}>
            <VaultMark size={40} />
          </div>
          <h1
            style={{
              fontSize: 'var(--text-display-md)',
              lineHeight: 'var(--leading-display-md)',
              fontWeight: 'var(--fw-bold)',
              letterSpacing: '-0.02em',
            }}
          >
            Vault
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
            Sign in to upload and manage files.
          </p>
        </div>
        <SignInForm />
      </div>
    </main>
  );
}
