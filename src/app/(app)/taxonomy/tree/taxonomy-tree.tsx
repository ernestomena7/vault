'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, IconButton, Input, Select } from '@/components/ds';
import { EditTaxonomyDialog } from '@/components/edit-taxonomy-dialog';

interface Entry {
  id: number;
  name: string;
  path?: string;
  isActive: boolean;
}

type Level = 'quests' | 'missions' | 'stages';

export function TaxonomyTree({
  statuses,
  selectedStatusId,
  quests,
  selectedQuestId,
  missions,
  selectedMissionId,
  stages,
}: {
  statuses: Array<{ id: number; name: string }>;
  selectedStatusId: number | null;
  quests: Entry[];
  selectedQuestId: number | null;
  missions: Entry[];
  selectedMissionId: number | null;
  stages: Entry[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function navigate(next: { status?: number; quest?: number; mission?: number }) {
    const params = new URLSearchParams();
    if (next.status) params.set('status', String(next.status));
    if (next.quest) params.set('quest', String(next.quest));
    if (next.mission) params.set('mission', String(next.mission));
    router.push(`/taxonomy/tree?${params.toString()}`);
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
      // An in-use refusal explains the deactivation alternative in its message.
      setError(payload.error?.message ?? 'That did not work.');
      return false;
    }
    router.refresh();
    return true;
  }

  /** Separate from `call`: errors surface inside the dialog, not the page banner behind it. */
  async function saveEdit(
    level: Level,
    id: number,
    newName: string,
    newPath: string,
  ): Promise<true | string> {
    const response = await fetch(`/api/taxonomy/${level}/${id}`, {
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
      <div style={{ maxWidth: 300 }}>
        <Select
          label="Approval status"
          value={selectedStatusId === null ? '' : String(selectedStatusId)}
          options={statuses.map((status) => ({ value: String(status.id), label: status.name }))}
          onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
            navigate({ status: Number(event.target.value) })
          }
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-4)',
          alignItems: 'start',
        }}
      >
        <Column
          title="Quests"
          entryLabel="quest"
          level="quests"
          entries={quests}
          selectedId={selectedQuestId}
          parentId={selectedStatusId}
          parentField="approvalStatusId"
          hasFolder
          busy={busy}
          onSelect={(id) => navigate({ status: selectedStatusId ?? undefined, quest: id })}
          onCall={call}
          onSaveEdit={(id, n, p) => saveEdit('quests', id, n, p)}
        />

        <Column
          title="Missions"
          entryLabel="mission"
          level="missions"
          entries={missions}
          selectedId={selectedMissionId}
          parentId={selectedQuestId}
          parentField="questId"
          hasFolder
          busy={busy}
          emptyHint="Choose a quest to see its missions."
          onSelect={(id) =>
            navigate({
              status: selectedStatusId ?? undefined,
              quest: selectedQuestId ?? undefined,
              mission: id,
            })
          }
          onCall={call}
          onSaveEdit={(id, n, p) => saveEdit('missions', id, n, p)}
        />

        <Column
          title="Stages"
          entryLabel="stage"
          level="stages"
          entries={stages}
          selectedId={null}
          parentId={selectedMissionId}
          parentField="missionId"
          hasFolder={false}
          busy={busy}
          emptyHint="Choose a mission to see its stages."
          onCall={call}
        />
      </div>

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

function Column({
  title,
  entryLabel,
  level,
  entries,
  selectedId,
  parentId,
  parentField,
  hasFolder,
  busy,
  emptyHint,
  onSelect,
  onCall,
  onSaveEdit,
}: {
  title: string;
  /** Singular, lowercase — how one entry is named in a sentence, e.g. "quest". */
  entryLabel: string;
  level: Level;
  entries: Entry[];
  selectedId: number | null;
  parentId: number | null;
  parentField: string;
  hasFolder: boolean;
  busy: boolean;
  emptyHint?: string;
  onSelect?: (id: number) => void;
  onCall: (url: string, method: string, body?: unknown) => Promise<boolean>;
  /** Absent for Stages — they have no folder path, and editing them was not asked for. */
  onSaveEdit?: (id: number, name: string, path: string) => Promise<true | string>;
}) {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  return (
    <Card style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-3)' }}>
      <h2 className="eyebrow">{title}</h2>

      {parentId === null ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-body-sm)', margin: 0 }}>
          {emptyHint}
        </p>
      ) : (
        <>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--space-1)' }}>
            {entries.map((entry) => (
              <li
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-sm)',
                  background:
                    entry.id === selectedId ? 'var(--accent-subtle-bg)' : 'transparent',
                  opacity: entry.isActive ? 1 : 0.55,
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelect?.(entry.id)}
                  disabled={!onSelect}
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    background: 'none',
                    border: 0,
                    color: 'var(--text-primary)',
                    cursor: onSelect ? 'pointer' : 'default',
                    font: 'inherit',
                  }}
                >
                  {entry.name}
                  {!entry.isActive && (
                    <span style={{ color: 'var(--text-tertiary)' }}> — inactive</span>
                  )}
                </button>

                {onSaveEdit && (
                  <IconButton
                    icon="pencil"
                    aria-label={`Edit ${entry.name}`}
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => setEditingEntry(entry)}
                  />
                )}
                <IconButton
                  icon={entry.isActive ? 'x-circle' : 'check-circle-2'}
                  aria-label={
                    entry.isActive ? `Deactivate ${entry.name}` : `Reactivate ${entry.name}`
                  }
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void onCall(`/api/taxonomy/${level}/${entry.id}`, 'PATCH', {
                      isActive: !entry.isActive,
                    })
                  }
                />
                <IconButton
                  icon="trash-2"
                  aria-label={`Delete ${entry.name}`}
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void onCall(`/api/taxonomy/${level}/${entry.id}`, 'DELETE')}
                />
              </li>
            ))}
            {entries.length === 0 && (
              <li style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-body-sm)' }}>
                Nothing here yet.
              </li>
            )}
          </ul>

          <div style={{ display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Input
              label="New name"
              size="sm"
              value={name}
              disabled={busy}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            />
            {hasFolder && (
              <Input
                label="Folder path"
                size="sm"
                placeholder={name ? `/${name.trim()}` : '/Name'}
                value={path}
                disabled={busy}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPath(e.target.value)}
              />
            )}
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || name.trim() === ''}
              onClick={async () => {
                const ok = await onCall(`/api/taxonomy/${level}`, 'POST', {
                  [parentField]: parentId,
                  name,
                  ...(hasFolder ? { dropboxPath: path.trim() || `/${name.trim()}` } : {}),
                });
                if (ok) {
                  setName('');
                  setPath('');
                }
              }}
            >
              Add
            </Button>
          </div>
        </>
      )}

      {onSaveEdit && (
        <EditTaxonomyDialog
          open={editingEntry !== null}
          label={entryLabel}
          initialName={editingEntry?.name ?? ''}
          initialPath={editingEntry?.path ?? ''}
          onClose={() => setEditingEntry(null)}
          onSave={(newName, newPath) => onSaveEdit(editingEntry!.id, newName, newPath)}
        />
      )}
    </Card>
  );
}
