'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Icon } from '@/components/ds';

/**
 * Clears the incomplete-set mark from files whose batch never finished.
 *
 * The mark says a set was left unfinished; it cannot say which files were
 * missing, because the grouping is deliberately not stored (FR-033). So the
 * only two useful actions are to finish the set by uploading the rest, or to
 * decide it does not matter and dismiss it (FR-029).
 */
export function DismissIncomplete({ fileIds }: { fileIds: number[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (fileIds.length === 0) return null;

  async function dismiss() {
    setBusy(true);
    setError(null);

    const response = await fetch('/api/uploads/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileIds, complete: true }),
    });

    setBusy(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      setError(body.error?.message ?? 'The mark could not be cleared.');
      return;
    }
    router.refresh();
  }

  return (
    <Card
      style={{
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-5)',
        background: 'var(--warning-bg)',
        borderColor: 'var(--warning)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        flexWrap: 'wrap',
      }}
    >
      <Icon name="alert-circle" size={18} color="var(--warning)" />
      <span style={{ flex: 1, minWidth: 220 }}>
        {fileIds.length} file{fileIds.length === 1 ? '' : 's'} uploaded as part of a set that did
        not finish. Upload the rest, or dismiss this if the set is no longer needed.
      </span>
      <Button variant="secondary" size="sm" loading={busy} onClick={() => void dismiss()}>
        Dismiss
      </Button>
      {error && (
        <span style={{ color: 'var(--danger)', fontSize: 'var(--text-body-sm)' }}>{error}</span>
      )}
    </Card>
  );
}
