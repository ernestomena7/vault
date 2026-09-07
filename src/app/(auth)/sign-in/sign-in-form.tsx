'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button, Card, Input } from '@/components/ds';

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn('credentials', { email, password, redirect: false });

    if (result?.error) {
      // Deliberately identical for a wrong password, an unknown email, and a
      // deactivated account — the message reveals nothing (US1 scenario 4).
      setError('Those details did not match an active account.');
      setSubmitting(false);
      return;
    }

    router.replace('/upload');
    router.refresh();
  }

  return (
    <Card style={{ padding: 'var(--space-6)' }}>
      <form
        onSubmit={onSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <Input
          label="Email"
          type="email"
          value={email}
          autoComplete="username"
          required
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          value={password}
          autoComplete="current-password"
          required
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
        />

        {error && (
          <p
            role="alert"
            style={{
              color: 'var(--danger)',
              background: 'var(--danger-bg)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-body-sm)',
              margin: 0,
            }}
          >
            {error}
          </p>
        )}

        <Button type="submit" loading={submitting} fullWidth>
          Sign in
        </Button>
      </form>
    </Card>
  );
}
