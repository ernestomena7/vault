'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, IconButton, Input, Select } from '@/components/ds';

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'uploader';
  isActive: boolean;
}

export function UserManager({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'uploader'>('uploader');
  const [password, setPassword] = useState('');

  async function call(url: string, method: string, body?: unknown): Promise<boolean> {
    setBusy(true);
    setError(null);
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    setBusy(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      setError(payload.error?.message ?? 'That did not work.');
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <Card style={{ padding: 'var(--space-4)' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--space-1)' }}>
          {users.map((user) => (
            <li
              key={user.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-raised)',
                opacity: user.isActive ? 1 : 0.55,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div>{user.name}</div>
                <div className="mono" style={{ color: 'var(--text-tertiary)' }}>
                  {user.email}
                </div>
              </div>

              {!user.isActive && <Badge tone="neutral">Inactive</Badge>}
              {user.id === currentUserId && <Badge tone="accent">You</Badge>}

              <div style={{ width: 150 }}>
                <Select
                  value={user.role}
                  disabled={busy}
                  options={[
                    { value: 'uploader', label: 'Uploader' },
                    { value: 'admin', label: 'Admin' },
                  ]}
                  onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                    void call(`/api/users/${user.id}`, 'PATCH', { role: event.target.value })
                  }
                />
              </div>

              <IconButton
                icon={user.isActive ? 'x-circle' : 'check-circle-2'}
                aria-label={user.isActive ? `Deactivate ${user.name}` : `Reactivate ${user.name}`}
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() =>
                  void call(`/api/users/${user.id}`, 'PATCH', { isActive: !user.isActive })
                }
              />
              <IconButton
                icon="trash-2"
                aria-label={`Delete ${user.name}`}
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => void call(`/api/users/${user.id}`, 'DELETE')}
              />
            </li>
          ))}
        </ul>
      </Card>

      <Card style={{ padding: 'var(--space-5)', display: 'grid', gap: 'var(--space-4)' }}>
        <h2 className="eyebrow">Add someone</h2>
        <Input
          label="Name"
          value={name}
          disabled={busy}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          value={email}
          disabled={busy}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        />
        <Select
          label="Role"
          value={role}
          disabled={busy}
          options={[
            { value: 'uploader', label: 'Uploader' },
            { value: 'admin', label: 'Admin' },
          ]}
          onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
            setRole(event.target.value as 'admin' | 'uploader')
          }
        />
        <Input
          label="Password"
          type="password"
          helperText="At least 12 characters. Share it with them directly."
          value={password}
          disabled={busy}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
        />
        <div>
          <Button
            loading={busy}
            disabled={name.trim() === '' || email.trim() === '' || password.length < 12}
            onClick={async () => {
              const ok = await call('/api/users', 'POST', { name, email, role, password });
              if (ok) {
                setName('');
                setEmail('');
                setPassword('');
                setRole('uploader');
              }
            }}
          >
            Add user
          </Button>
        </div>
      </Card>

      {error && (
        <Card
          style={{
            padding: 'var(--space-4)',
            background: 'var(--danger-bg)',
            borderColor: 'var(--danger)',
          }}
        >
          <span style={{ color: 'var(--danger)' }}>{error}</span>
        </Card>
      )}
    </div>
  );
}
