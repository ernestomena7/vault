'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, IconButton, Input } from '@/components/ds';
import { EditTaxonomyDialog } from '@/components/edit-taxonomy-dialog';

interface Status {
  id: number;
  name: string;
  dropboxPath: string;
  position: number;
  isActive: boolean;
}

export function StatusManager({ statuses }: { statuses: Status[] }) {
  const router = useRouter();
  const [order, setOrder] = useState(statuses);
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Status | null>(null);

  const dirty = order.some((status, index) => status.id !== statuses[index]?.id);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setOrder(next);
  }

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

  /** Separate from `call`: errors surface inside the dialog, not the page banner behind it. */
  async function saveEdit(id: number, newName: string, newPath: string): Promise<true | string> {
    const response = await fetch(`/api/taxonomy/statuses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, dropboxPath: newPath }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      return payload.error?.message ?? 'That could not be saved.';
    }
    router.refresh();
    return true;
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <Card style={{ padding: 'var(--space-5)' }}>
        <h2 className="eyebrow" style={{ marginBottom: 'var(--space-4)' }}>
          Workflow order
        </h2>

        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--space-2)' }}>
          {order.map((status, index) => (
            <li
              key={status.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-raised)',
                opacity: status.isActive ? 1 : 0.55,
              }}
            >
              <span className="mono" style={{ color: 'var(--text-tertiary)', width: 22 }}>
                {index + 1}
              </span>
              <span style={{ flex: 1 }}>
                {status.name}
                {!status.isActive && (
                  <span style={{ color: 'var(--text-tertiary)' }}> — inactive</span>
                )}
              </span>
              <span className="mono" style={{ color: 'var(--text-tertiary)' }}>
                {status.dropboxPath}
              </span>
              <IconButton
                icon="pencil"
                aria-label={`Edit ${status.name}`}
                variant="ghost"
                disabled={busy}
                onClick={() => setEditing(status)}
              />
              <IconButton
                icon="chevron-down"
                aria-label={`Move ${status.name} up`}
                disabled={index === 0 || busy}
                onClick={() => move(index, -1)}
                style={{ transform: 'rotate(180deg)' }}
              />
              <IconButton
                icon="chevron-down"
                aria-label={`Move ${status.name} down`}
                disabled={index === order.length - 1 || busy}
                onClick={() => move(index, 1)}
              />
            </li>
          ))}
        </ol>

        {dirty && (
          <div
            style={{
              marginTop: 'var(--space-4)',
              display: 'flex',
              gap: 'var(--space-3)',
              alignItems: 'center',
            }}
          >
            <Button
              loading={busy}
              onClick={() =>
                void call('/api/taxonomy/statuses/reorder', 'POST', {
                  orderedIds: order.map((s) => s.id),
                })
              }
            >
              Save order
            </Button>
            <Button variant="ghost" onClick={() => setOrder(statuses)} disabled={busy}>
              Reset
            </Button>
          </div>
        )}
      </Card>

      <Card style={{ padding: 'var(--space-5)', display: 'grid', gap: 'var(--space-4)' }}>
        <h2 className="eyebrow">Add a status</h2>
        <Input
          label="Name"
          value={name}
          disabled={busy}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        />
        <Input
          label="Dropbox folder path"
          helperText="Relative to the Vault app folder, for example /05 Archived"
          value={path}
          disabled={busy}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPath(e.target.value)}
        />
        <div>
          <Button
            loading={busy}
            disabled={name.trim() === '' || path.trim() === ''}
            onClick={async () => {
              const ok = await call('/api/taxonomy/statuses', 'POST', {
                name,
                dropboxPath: path,
              });
              if (ok) {
                setName('');
                setPath('');
              }
            }}
          >
            Add status
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

      <EditTaxonomyDialog
        open={editing !== null}
        label="approval status"
        initialName={editing?.name ?? ''}
        initialPath={editing?.dropboxPath ?? ''}
        onClose={() => setEditing(null)}
        onSave={(newName, newPath) => saveEdit(editing!.id, newName, newPath)}
      />
    </div>
  );
}
