'use client';

import { useEffect, useState } from 'react';
import { Button, Dialog, Input } from '@/components/ds';

/**
 * Edits an Approval Status, Quest or Mission's name and Dropbox folder path.
 *
 * Shared by the three because the shape is identical and the server enforces
 * the same rules for all of them: the new name must not collide with a
 * sibling, the path must be a legal Dropbox segment, and the change is
 * forward-looking only — a file already placed under the old name and path
 * keeps both (FR-031). Nothing here renames or moves a file.
 */
export function EditTaxonomyDialog({
  open,
  label,
  initialName,
  initialPath,
  onClose,
  onSave,
}: {
  open: boolean;
  /** What this entry is called in conversation, e.g. "quest" or "approval status". */
  label: string;
  initialName: string;
  initialPath: string;
  onClose: () => void;
  /** Resolves `true` on success, or the server's own message on refusal. */
  onSave: (name: string, path: string) => Promise<true | string>;
}) {
  const [name, setName] = useState(initialName);
  const [path, setPath] = useState(initialPath);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed from the current values each time the dialog opens, so editing one
  // entry after another never carries the previous entry's draft into view.
  useEffect(() => {
    if (open) {
      setName(initialName);
      setPath(initialPath);
      setError(null);
    }
  }, [open, initialName, initialPath]);

  const dirty = name.trim() !== initialName || path.trim() !== initialPath;

  async function save() {
    setBusy(true);
    setError(null);
    const result = await onSave(name.trim(), path.trim()).catch(
      () => 'That could not be saved.',
    );
    setBusy(false);
    if (result === true) onClose();
    else setError(result);
  }

  return (
    <Dialog
      open={open}
      title={`Edit ${label}`}
      description="Existing files already placed here keep their current name and location — this only changes where new ones go."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => void save()}
            loading={busy}
            disabled={!dirty || name.trim() === '' || path.trim() === ''}
          >
            Save
          </Button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <Input
          label="Name"
          value={name}
          disabled={busy}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        />
        <Input
          label="Dropbox folder path"
          value={path}
          disabled={busy}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPath(e.target.value)}
        />
        {error && (
          <p style={{ margin: 0, color: 'var(--danger)', fontSize: 'var(--text-body-sm)' }}>
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
