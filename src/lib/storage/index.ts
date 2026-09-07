import type { StoragePort } from './port';

/**
 * Storage selection.
 *
 * The application asks for "the storage port" and gets whatever is configured.
 * Only this module knows which implementation that is; nothing else references
 * a concrete adapter (Constitution III).
 *
 * Tests swap in the fake through `setStorage`, which is also how a future GCP
 * adapter would be introduced — one registration, no call-site changes.
 */
let override: StoragePort | undefined;

export async function getStorage(): Promise<StoragePort> {
  if (override) return override;
  const { getDropboxStorage } = await import('./dropbox');
  return getDropboxStorage();
}

/** Test seam. Pass undefined to restore the real adapter. */
export function setStorage(port: StoragePort | undefined): void {
  override = port;
}

export type { StoragePort };
