'use client';

import { useState } from 'react';
import { IconButton, Tooltip } from '@/components/ds';

/**
 * Opens a file's Dropbox location in a new tab (FR-001/FR-002). The blank tab is opened
 * synchronously, before the `await fetch`, because several browsers only allow `window.open`
 * as the direct result of a user gesture — opening it after the await would be silently
 * blocked in enough browsers to matter (research.md R-002).
 */
export function DropboxLinkButton({
  fileId,
  integrityState,
}: {
  fileId: number;
  integrityState: 'valid' | 'broken';
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (integrityState === 'broken') {
    return (
      <Tooltip label="This file is missing from Dropbox">
        <IconButton
          icon="external-link"
          aria-label="Open in Dropbox"
          variant="ghost"
          size="sm"
          disabled
        />
      </Tooltip>
    );
  }

  async function handleClick(event: React.MouseEvent) {
    // The row itself opens the file's detail page on click (FR-003).
    event.stopPropagation();
    if (busy) return;

    const tab = window.open('', '_blank');
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/files/${fileId}/link`);
    const payload = (await response.json().catch(() => ({}))) as {
      url?: string;
      error?: { message?: string };
    };
    setBusy(false);

    if (!response.ok || !payload.url) {
      tab?.close();
      setError(payload.error?.message ?? 'That could not be opened.');
      return;
    }

    if (tab) tab.location.href = payload.url;
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <IconButton
        icon="external-link"
        aria-label="Open in Dropbox"
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={handleClick}
      />
      {error && (
        <span
          style={{ color: 'var(--danger)', fontSize: 'var(--text-body-sm)', whiteSpace: 'nowrap' }}
        >
          {error}
        </span>
      )}
    </span>
  );
}
