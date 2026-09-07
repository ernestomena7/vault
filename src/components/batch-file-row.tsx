'use client';

import { Icon, IconButton, Input, ProgressBar, Select } from '@/components/ds';
import type { FileState } from '@/lib/uploads/client-uploader';

export interface StageOption {
  id: number;
  name: string;
}

export interface BatchRow {
  clientRef: string;
  file: File;
  stageId: number | null;
  distinguishingText: string;
  state: FileState;
  percent: number;
  error?: string;
  /** Set when the server refused the batch because of this row. */
  conflict?: string;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const STATE_COLOR: Record<FileState, string> = {
  queued: 'var(--text-tertiary)',
  transferring: 'var(--accent)',
  succeeded: 'var(--success)',
  failed: 'var(--danger)',
};

const STATE_LABEL: Record<FileState, string> = {
  queued: 'Waiting',
  transferring: 'Uploading',
  succeeded: 'Uploaded',
  failed: 'Failed',
};

/**
 * One file in the batch: what it is, where it will go, and what it will be
 * called.
 *
 * The name preview matters more than it looks. The naming rule is the whole
 * product, and showing the result as the uploader types is the difference
 * between the rule being visible and being discovered after the upload.
 */
export function BatchFileRow({
  row,
  stages,
  disabled,
  namePreview,
  textError,
  onStageChange,
  onTextChange,
  onRemove,
}: {
  row: BatchRow;
  stages: StageOption[];
  disabled: boolean;
  namePreview: string | null;
  textError: string | null;
  onStageChange: (stageId: number | null) => void;
  onTextChange: (text: string) => void;
  onRemove: () => void;
}) {
  const busy = disabled || row.state === 'transferring' || row.state === 'succeeded';

  return (
    <li
      style={{
        display: 'grid',
        gap: 'var(--space-3)',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-surface-raised)',
        border: `1px solid ${row.conflict || row.error ? 'var(--danger)' : 'var(--border-subtle)'}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <Icon name="film" size={16} color={STATE_COLOR[row.state]} />
        <span className="mono" style={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }}>
          {row.file.name}
        </span>
        <span className="mono" style={{ color: 'var(--text-tertiary)' }}>
          {formatSize(row.file.size)}
        </span>
        <span style={{ color: STATE_COLOR[row.state], fontSize: 'var(--text-body-sm)' }}>
          {STATE_LABEL[row.state]}
        </span>
        <IconButton
          icon="x"
          aria-label={`Remove ${row.file.name}`}
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={onRemove}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(140px, 1fr) minmax(160px, 1.4fr)',
          gap: 'var(--space-3)',
        }}
      >
        <Select
          label="Stage"
          size="sm"
          value={row.stageId === null ? '' : String(row.stageId)}
          disabled={busy}
          options={[
            { value: '', label: 'Choose a stage' },
            ...stages.map((stage) => ({ value: String(stage.id), label: stage.name })),
          ]}
          onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
            onStageChange(event.target.value === '' ? null : Number(event.target.value))
          }
        />
        <Input
          label="Distinguishing text"
          size="sm"
          placeholder="Optional, e.g. take 2"
          helperText={
            textError ?? 'Only needed when two files would otherwise share a name.'
          }
          {...(textError ? { error: textError } : {})}
          value={row.distinguishingText}
          disabled={busy}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onTextChange(event.target.value)
          }
        />
      </div>

      {namePreview && (
        <div style={{ fontSize: 'var(--text-body-sm)' }}>
          <span className="eyebrow">Will be named</span>{' '}
          <span className="mono" style={{ color: 'var(--text-primary)' }}>
            {namePreview}
          </span>
        </div>
      )}

      {row.state === 'transferring' && <ProgressBar value={row.percent} />}

      {(row.conflict || row.error) && (
        <p style={{ margin: 0, color: 'var(--danger)', fontSize: 'var(--text-body-sm)' }}>
          {row.conflict ?? row.error}
        </p>
      )}
    </li>
  );
}
