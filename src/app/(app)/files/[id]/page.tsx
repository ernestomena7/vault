import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guards';
import { getFileById, getFileHistory } from '@/lib/db/queries/files';
import { listApprovalStatuses } from '@/lib/db/queries/taxonomy';
import { allowedTransitionsFor } from '@/lib/workflow/transitions';
import { Card, Icon } from '@/components/ds';
import { FileStatus } from '@/components/file-status';
import { TransitionControl } from './transition-control';

export const dynamic = 'force-dynamic';

export default async function FileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  const fileId = Number(id);
  if (!Number.isFinite(fileId)) notFound();

  const [file, statuses] = await Promise.all([getFileById(fileId), listApprovalStatuses()]);
  if (!file) notFound();

  const history = await getFileHistory(fileId);

  // Exactly what this file may do next: one step forward, or anywhere back.
  const allowed = allowedTransitionsFor(file.approvalStatusPosition, statuses);

  return (
    <div style={{ maxWidth: 780 }}>
      <Link
        href="/files"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          color: 'var(--text-secondary)',
          marginBottom: 'var(--space-5)',
        }}
      >
        <Icon name="chevron-right" size={14} style={{ transform: 'rotate(180deg)' }} />
        Back to approvals
      </Link>

      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1
          className="mono"
          style={{
            fontSize: 'var(--text-heading-md)',
            lineHeight: 'var(--leading-heading-md)',
            fontWeight: 'var(--fw-semibold)',
          }}
        >
          {file.standardName}
        </h1>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            marginTop: 'var(--space-3)',
          }}
        >
          <FileStatus
            name={file.approvalStatusName}
            position={file.approvalStatusPosition}
            totalStatuses={statuses.length}
          />
          <span className="mono" style={{ color: 'var(--text-tertiary)' }}>
            {file.dropboxFolderPath}
          </span>
        </div>
      </header>

      {file.integrityState === 'broken' && (
        <Card
          style={{
            padding: 'var(--space-5)',
            marginBottom: 'var(--space-5)',
            background: 'var(--danger-bg)',
            borderColor: 'var(--danger)',
          }}
        >
          <strong style={{ color: 'var(--danger)' }}>This file is missing from Dropbox</strong>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
            Vault has a record of it, but nothing is at the path above. It was probably moved or
            deleted in Dropbox directly. Moving it through the workflow will not work until it is
            back.
          </p>
        </Card>
      )}

      <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
        <Card style={{ padding: 'var(--space-5)' }}>
          <h2 className="eyebrow" style={{ marginBottom: 'var(--space-4)' }}>
            Details
          </h2>
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 'var(--space-4)',
              margin: 0,
            }}
          >
            <Detail label="Quest" value={file.questName} />
            <Detail label="Mission" value={file.missionName} />
            <Detail label="Stage" value={file.stageName} />
            <Detail label="Uploaded by" value={file.uploaderName} />
            <Detail
              label="Uploaded"
              value={new Date(file.uploadedAt).toISOString().slice(0, 16).replace('T', ' ')}
              mono
            />
            <Detail
              label="Size"
              value={`${(file.sizeBytes / (1024 * 1024)).toFixed(1)} MB`}
              mono
            />
          </dl>
        </Card>

        <TransitionControl
          fileId={file.id}
          currentStatusId={file.approvalStatusId}
          currentStatusName={file.approvalStatusName}
          allowed={allowed.map((status) => ({
            id: status.id,
            name: status.name,
            direction: status.position > file.approvalStatusPosition ? 'forward' : 'back',
          }))}
        />

        <Card style={{ padding: 'var(--space-5)' }}>
          <h2 className="eyebrow" style={{ marginBottom: 'var(--space-4)' }}>
            History
          </h2>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--space-3)' }}>
            {history.map((entry) => (
              <li
                key={entry.id}
                style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  alignItems: 'baseline',
                  paddingBottom: 'var(--space-3)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <span
                  className="mono"
                  style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}
                >
                  {new Date(entry.createdAt).toISOString().slice(0, 16).replace('T', ' ')}
                </span>
                <span style={{ color: entry.outcome === 'failed' ? 'var(--danger)' : undefined }}>
                  {entry.fromStatusName
                    ? `${entry.actorName} moved it from ${entry.fromStatusName} to ${entry.toStatusName}`
                    : `${entry.actorName} uploaded it to ${entry.toStatusName}`}
                  {entry.outcome === 'failed' && ' — failed'}
                  {entry.detail && (
                    <span style={{ color: 'var(--text-tertiary)' }}> ({entry.detail})</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className={mono ? 'mono' : undefined} style={{ margin: 0, marginTop: 'var(--space-1)' }}>
        {value}
      </dd>
    </div>
  );
}
