import { requireUser } from '@/lib/auth/guards';
import { canUpload } from '@/lib/config/env';
import { listApprovalStatuses } from '@/lib/db/queries/taxonomy';
import { UploadForm } from './upload-form';

export const metadata = { title: 'Upload · Vault' };
export const dynamic = 'force-dynamic';

export default async function UploadPage() {
  await requireUser();
  const statuses = await listApprovalStatuses({ activeOnly: true });

  // Checked here, before the form renders, so somebody cannot queue twenty
  // files and fill in every stage only to be told at the end that uploading was
  // never possible. `canUpload` is the strict question — a pasted access token
  // is enough to browse Dropbox but not to hand the browser a credential.
  const storageReady = canUpload();

  return (
    <div style={{ maxWidth: 620 }}>
      <header style={{ marginBottom: 'var(--space-7)' }}>
        <h1
          style={{
            fontSize: 'var(--text-heading-lg)',
            lineHeight: 'var(--leading-heading-lg)',
            fontWeight: 'var(--fw-semibold)',
          }}
        >
          Upload a video
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
          Choose where it belongs. Vault names the file and files it away for you.
        </p>
      </header>

      <UploadForm
        statuses={statuses.map((status) => ({ id: status.id, name: status.name }))}
        storageReady={storageReady}
      />
    </div>
  );
}
