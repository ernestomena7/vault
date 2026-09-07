'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Select } from '@/components/ds';

interface AllowedStatus {
  id: number;
  name: string;
  direction: 'forward' | 'back';
}

/**
 * The only place a file's status changes.
 *
 * The options come from the server, which derived them from the workflow order.
 * `expectedCurrentStatusId` travels with the request so that if another Admin
 * moved this file while the page was open, the server refuses rather than
 * overwriting their decision (FR-041).
 */
export function TransitionControl({
  fileId,
  currentStatusId,
  currentStatusName,
  allowed,
}: {
  fileId: number;
  currentStatusId: number;
  currentStatusName: string;
  allowed: AllowedStatus[];
}) {
  const router = useRouter();
  const [target, setTarget] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function move() {
    if (target === '') return;
    setBusy(true);
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/files/${fileId}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toApprovalStatusId: Number(target),
        expectedCurrentStatusId: currentStatusId,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      setError(body.error?.message ?? 'That move could not be completed.');
      setBusy(false);
      return;
    }

    const body = (await response.json()) as {
      transition: { to: string; createdFolders: boolean };
    };
    setNotice(
      body.transition.createdFolders
        ? `Moved to ${body.transition.to}. The destination folders were created.`
        : `Moved to ${body.transition.to}.`,
    );
    setBusy(false);
    setTarget('');
    router.refresh();
  }

  if (allowed.length === 0) {
    return (
      <Card style={{ padding: 'var(--space-5)' }}>
        <h2 className="eyebrow" style={{ marginBottom: 'var(--space-3)' }}>
          Move this file
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {currentStatusName} is the only status available, so there is nowhere to move this file.
        </p>
      </Card>
    );
  }

  return (
    <Card style={{ padding: 'var(--space-5)', display: 'grid', gap: 'var(--space-4)' }}>
      <div>
        <h2 className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>
          Move this file
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 'var(--text-body-sm)' }}>
          A file moves forward one step at a time, and back to any earlier step.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, maxWidth: 320 }}>
          <Select
            label="New status"
            value={target}
            disabled={busy}
            options={[
              { value: '', label: 'Choose a status' },
              ...allowed.map((status) => ({
                value: String(status.id),
                label:
                  status.direction === 'forward'
                    ? `${status.name} (next step)`
                    : `${status.name} (back)`,
              })),
            ]}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              setTarget(event.target.value)
            }
          />
        </div>
        <Button onClick={() => void move()} loading={busy} disabled={target === ''}>
          Move
        </Button>
      </div>

      {error && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            fontSize: 'var(--text-body-sm)',
          }}
        >
          {error}
        </p>
      )}

      {notice && (
        <p
          style={{
            margin: 0,
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--success-bg)',
            color: 'var(--success)',
            fontSize: 'var(--text-body-sm)',
          }}
        >
          {notice}
        </p>
      )}
    </Card>
  );
}
