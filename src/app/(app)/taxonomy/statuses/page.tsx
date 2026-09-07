import { requireAdmin } from '@/lib/auth/guards';
import { listApprovalStatuses } from '@/lib/db/queries/taxonomy';
import { StatusManager } from './status-manager';

export const metadata = { title: 'Approval statuses · Vault' };
export const dynamic = 'force-dynamic';

export default async function StatusesPage() {
  await requireAdmin();
  const statuses = await listApprovalStatuses();

  return (
    <div style={{ maxWidth: 760 }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1
          style={{
            fontSize: 'var(--text-heading-lg)',
            lineHeight: 'var(--leading-heading-lg)',
            fontWeight: 'var(--fw-semibold)',
          }}
        >
          Approval statuses
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
          The order here is the workflow. A file moves forward one step at a time, and back to any
          earlier step — so changing the order changes what is possible for every file.
        </p>
      </header>

      <StatusManager
        statuses={statuses.map((status) => ({
          id: status.id,
          name: status.name,
          dropboxPath: status.dropboxPath,
          position: status.position,
          isActive: status.isActive,
        }))}
      />
    </div>
  );
}
