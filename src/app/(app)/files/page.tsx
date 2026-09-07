import { requireAdmin } from '@/lib/auth/guards';
import { listFiles } from '@/lib/db/queries/files';
import { listApprovalStatuses } from '@/lib/db/queries/taxonomy';
import { FilesTable } from '@/components/files-table';
import { StatusFilter } from './status-filter';

export const metadata = { title: 'Approvals · Vault' };
export const dynamic = 'force-dynamic';

/** The Admin approval queue (FR-027). Uploaders never reach this route. */
export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const statusFilter = params.status ? Number(params.status) : undefined;

  const [{ items, total }, statuses] = await Promise.all([
    listFiles({
      page: 1,
      pageSize: 100,
      ...(Number.isFinite(statusFilter) ? { status: statusFilter } : {}),
    }),
    listApprovalStatuses(),
  ]);

  const broken = items.filter((file) => file.integrityState === 'broken').length;

  return (
    <div>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1
          style={{
            fontSize: 'var(--text-heading-lg)',
            lineHeight: 'var(--leading-heading-lg)',
            fontWeight: 'var(--fw-semibold)',
          }}
        >
          Approvals
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
          {total === 0
            ? 'No files have been uploaded yet.'
            : `${total} file${total === 1 ? '' : 's'}. Open one to move it through the workflow.`}
        </p>
        {broken > 0 && (
          <p
            style={{
              marginTop: 'var(--space-3)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              fontSize: 'var(--text-body-sm)',
            }}
          >
            {broken} file{broken === 1 ? ' is' : 's are'} missing from Dropbox. Open a file to see
            what happened.
          </p>
        )}
      </header>

      <div style={{ marginBottom: 'var(--space-5)' }}>
        <StatusFilter
          statuses={statuses.map((s) => ({ id: s.id, name: s.name }))}
          selected={Number.isFinite(statusFilter) ? (statusFilter as number) : null}
        />
      </div>

      {items.length > 0 && (
        <FilesTable
          files={items}
          totalStatuses={statuses.length}
          showUploader
          linkToDetail
          showDropboxLink
        />
      )}
    </div>
  );
}
