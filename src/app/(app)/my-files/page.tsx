import { requireUser } from '@/lib/auth/guards';
import { listFiles } from '@/lib/db/queries/files';
import { listApprovalStatuses } from '@/lib/db/queries/taxonomy';
import { FilesTable } from '@/components/files-table';
import { DismissIncomplete } from '@/components/dismiss-incomplete';

export const metadata = { title: 'My files · Vault' };
export const dynamic = 'force-dynamic';

/**
 * An Uploader's own uploads, read-only. The scope comes from the session, so
 * there is nothing to tamper with in the URL.
 */
export default async function MyFilesPage() {
  const user = await requireUser();

  const [{ items, total }, statuses] = await Promise.all([
    listFiles({ page: 1, pageSize: 50, restrictToUploaderId: user.id }),
    listApprovalStatuses(),
  ]);

  const incomplete = items.filter((file) => file.incompleteSet).map((file) => file.id);

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
          My files
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
          {total === 0
            ? 'Nothing here yet. Upload your first video to get started.'
            : `${total} file${total === 1 ? '' : 's'} you have uploaded.`}
        </p>
      </header>

      <DismissIncomplete fileIds={incomplete} />

      {items.length > 0 && <FilesTable files={items} totalStatuses={statuses.length} />}
    </div>
  );
}
