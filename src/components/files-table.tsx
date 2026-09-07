'use client';

import { useRouter } from 'next/navigation';
import { Icon, Table } from '@/components/ds';
import { FileStatus } from '@/components/file-status';
import { DropboxLinkButton } from '@/components/dropbox-link-button';

export interface FileRow {
  id: number;
  standardName: string;
  questName: string;
  missionName: string;
  stageName: string;
  approvalStatusName: string;
  approvalStatusPosition: number;
  uploaderName: string;
  uploadedAt: string | Date;
  sizeBytes: number;
  integrityState: 'valid' | 'broken';
  incompleteSet?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Filenames, sizes and timestamps are data — the design system sets them in mono. */
export function FilesTable({
  files,
  totalStatuses,
  showUploader = false,
  linkToDetail = false,
  showDropboxLink = false,
}: {
  files: FileRow[];
  totalStatuses: number;
  showUploader?: boolean;
  linkToDetail?: boolean;
  /** The Approvals queue only (FR-001) — out of scope for "My files" (spec.md Out of Scope). */
  showDropboxLink?: boolean;
}) {
  const router = useRouter();

  const columns = [
    {
      key: 'standardName',
      label: 'File',
      mono: true,
      render: (row: FileRow) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {row.integrityState === 'broken' && (
            // FR-042: a file missing from Dropbox is never shown as ordinary.
            <span title="This file is missing from Dropbox" style={{ color: 'var(--danger)' }}>
              <Icon name="alert-circle" size={14} />
            </span>
          )}
          {row.incompleteSet && (
            // FR-027/FR-028. The mark carries no batch reference, so it can say
            // the set was unfinished but not which files were missing.
            <span
              title="Uploaded as part of a set that did not finish"
              style={{ color: 'var(--warning)' }}
            >
              <Icon name="alert-circle" size={14} />
            </span>
          )}
          <span className="mono">{row.standardName}</span>
        </span>
      ),
    },
    { key: 'questName', label: 'Quest' },
    { key: 'missionName', label: 'Mission' },
    { key: 'stageName', label: 'Stage' },
    ...(showUploader ? [{ key: 'uploaderName', label: 'Uploader' }] : []),
    {
      key: 'approvalStatusName',
      label: 'Status',
      render: (row: FileRow) => (
        <FileStatus
          name={row.approvalStatusName}
          position={row.approvalStatusPosition}
          totalStatuses={totalStatuses}
        />
      ),
    },
    {
      key: 'sizeBytes',
      label: 'Size',
      mono: true,
      render: (row: FileRow) => <span className="mono">{formatSize(row.sizeBytes)}</span>,
    },
    {
      key: 'uploadedAt',
      label: 'Uploaded',
      mono: true,
      render: (row: FileRow) => (
        <span className="mono">
          {new Date(row.uploadedAt).toISOString().slice(0, 16).replace('T', ' ')}
        </span>
      ),
    },
    ...(showDropboxLink
      ? [
          {
            key: 'dropboxLink',
            label: '',
            render: (row: FileRow) => (
              <DropboxLinkButton fileId={row.id} integrityState={row.integrityState} />
            ),
          },
        ]
      : []),
  ];

  return (
    <Table
      columns={columns}
      rows={files}
      onRowClick={linkToDetail ? (row: FileRow) => router.push(`/files/${row.id}`) : undefined}
    />
  );
}
