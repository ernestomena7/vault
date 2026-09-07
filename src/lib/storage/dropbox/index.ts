import 'server-only';
import { Dropbox } from 'dropbox';
import { getDropboxEnv } from '@/lib/config/env';
import { assertValidSegment, joinPath, normalizeFolderPath } from '@/lib/naming';
import {
  DestinationOccupiedError,
  NotFoundError,
  StorageUnavailableError,
  type FileMetadata,
  type FileProbe,
  type FolderCreation,
  type FolderResolution,
  type MoveResult,
  type StoragePort,
  type TemporaryLink,
  type UploadGrant,
  type BatchUploadGrant,
  type BatchUploadRequest,
  type UploadSession,
  type FolderEntry,
} from '../port';
import { getServerAccessToken, mintBrowserUploadToken } from './tokens';

/**
 * The Dropbox adapter — the ONLY module in the application permitted to import
 * the Dropbox SDK (Constitution III, enforced by a lint rule).
 *
 * Its job is to translate Dropbox's error shapes into the port's four error
 * types so nothing upstream needs to know what a `path/conflict/folder` summary
 * string looks like.
 *
 * It never handles file content. `beginUpload` returns a session and a
 * write-only credential; the browser sends the bytes (Constitution I).
 */

const DROPBOX_ROOT_MARKER = ''; // Dropbox represents its root as an empty string.

/**
 * The `Dropbox-API-Path-Root` header value, or undefined for a personal account.
 *
 * A Dropbox Business member's API calls default to their HOME namespace — their
 * own folder. Content in the team space lives in a different namespace, so
 * without this header every team path resolves to nothing, which looks exactly
 * like "the folder does not exist".
 *
 * Exported because the browser has to send the same header on its upload calls;
 * it is a namespace selector, not a credential.
 */
export function pathRootHeader(): string | undefined {
  const namespaceId = getDropboxEnv().DROPBOX_PATH_ROOT_NAMESPACE_ID;
  if (!namespaceId) return undefined;
  return JSON.stringify({ '.tag': 'root', root: namespaceId });
}

function client(accessToken: string): Dropbox {
  const pathRoot = pathRootHeader();
  return new Dropbox({ accessToken, fetch, ...(pathRoot ? { pathRoot } : {}) });
}

/**
 * Prefixes the configured root. Empty for an App-folder app, where Dropbox
 * already scopes paths; set to the containing folder for a Full Dropbox app.
 */
function toDropboxPath(folderPath: string): string {
  const rooted = normalizeFolderPath(
    `${getDropboxEnv().DROPBOX_ROOT_PATH}${normalizeFolderPath(folderPath)}`,
  );
  return rooted === '' ? DROPBOX_ROOT_MARKER : rooted;
}

interface DropboxApiError {
  status?: number;
  error?: { error_summary?: string; error?: { '.tag'?: string } };
  headers?: Headers;
}

function summaryOf(error: unknown): string {
  const api = error as DropboxApiError;
  return api?.error?.error_summary ?? '';
}

function isNotFound(error: unknown): boolean {
  const summary = summaryOf(error);
  return summary.includes('not_found') || summary.includes('path/not_found');
}

function isConflict(error: unknown): boolean {
  return summaryOf(error).includes('conflict');
}

function retryAfterFrom(error: unknown): number | undefined {
  const header = (error as DropboxApiError)?.headers?.get?.('Retry-After');
  const parsed = header ? Number.parseInt(header, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Everything that is not a recognised domain condition becomes StorageUnavailable. */
function asStorageFailure(error: unknown, action: string): StorageUnavailableError {
  const api = error as DropboxApiError;
  const summary = summaryOf(error);
  const detail = summary || (error instanceof Error ? error.message : 'unknown error');
  const retryAfterSeconds = api?.status === 429 ? (retryAfterFrom(error) ?? 30) : undefined;
  return new StorageUnavailableError(`Dropbox failed to ${action}: ${detail}`, {
    retryAfterSeconds,
    cause: error,
  });
}

function validateFolder(folderPath: string): void {
  for (const segment of normalizeFolderPath(folderPath).split('/').filter(Boolean)) {
    assertValidSegment(segment, 'Folder name');
  }
}

export class DropboxStorage implements StoragePort {
  async resolveFolder(folderPath: string): Promise<FolderResolution> {
    const dbx = client(await getServerAccessToken());
    try {
      const result = await dbx.filesGetMetadata({ path: toDropboxPath(folderPath) });
      return { exists: result.result['.tag'] === 'folder' };
    } catch (error) {
      if (isNotFound(error)) return { exists: false };
      throw asStorageFailure(error, 'resolve a folder');
    }
  }

  async ensureFolder(folderPath: string): Promise<FolderCreation> {
    validateFolder(folderPath);
    const path = toDropboxPath(folderPath);
    if (path === DROPBOX_ROOT_MARKER) return { created: false };

    const dbx = client(await getServerAccessToken());
    try {
      // Dropbox creates missing ancestors for a nested path.
      await dbx.filesCreateFolderV2({ path, autorename: false });
      return { created: true };
    } catch (error) {
      if (isConflict(error)) {
        // Already there. Success, not an error — FR-036 depends on this.
        return { created: false };
      }
      throw asStorageFailure(error, 'create a folder');
    }
  }

  async listFolders(folderPath: string): Promise<FolderEntry[]> {
    const dbx = client(await getServerAccessToken());
    const base = normalizeFolderPath(folderPath);
    const entries: FolderEntry[] = [];

    try {
      let result = await dbx.filesListFolder({
        path: toDropboxPath(folderPath),
        recursive: false,
      });

      // Dropbox pages large folders; without following the cursor a taxonomy
      // import would silently stop partway and look like a complete result.
      for (;;) {
        for (const entry of result.result.entries) {
          if (entry['.tag'] !== 'folder') continue;
          entries.push({ name: entry.name, path: `${base}/${entry.name}` });
        }
        if (!result.result.has_more) break;
        result = await dbx.filesListFolderContinue({ cursor: result.result.cursor });
      }
    } catch (error) {
      // An absent folder is an empty structure, not a failure.
      if (isNotFound(error)) return [];
      throw asStorageFailure(error, 'list a folder');
    }

    return entries.sort((a, b) => a.name.localeCompare(b.name));
  }

  async fileExists(folderPath: string, fileName: string): Promise<FileProbe> {
    const dbx = client(await getServerAccessToken());
    try {
      const result = await dbx.filesGetMetadata({
        path: toDropboxPath(joinPath(folderPath, fileName)),
      });
      const meta = result.result;
      if (meta['.tag'] !== 'file') return { exists: false };
      return { exists: true, id: meta.id, sizeBytes: meta.size };
    } catch (error) {
      // Absent is a plain answer, not an exception.
      if (isNotFound(error)) return { exists: false };
      throw asStorageFailure(error, 'check whether a file exists');
    }
  }

  async getMetadata(folderPath: string, fileName: string): Promise<FileMetadata> {
    const path = joinPath(folderPath, fileName);
    const dbx = client(await getServerAccessToken());
    try {
      const result = await dbx.filesGetMetadata({ path: toDropboxPath(path) });
      const meta = result.result;
      if (meta['.tag'] !== 'file') throw new NotFoundError(path);
      return {
        id: meta.id,
        sizeBytes: meta.size,
        modifiedAt: new Date(meta.server_modified),
        path,
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      // This distinction is what lets confirm tell "the upload did not land"
      // apart from "Dropbox is unreachable" (FR-042).
      if (isNotFound(error)) throw new NotFoundError(path);
      throw asStorageFailure(error, 'read file metadata');
    }
  }

  async beginUpload(
    folderPath: string,
    fileName: string,
    _sizeBytes: number,
  ): Promise<UploadGrant> {
    validateFolder(folderPath);
    assertValidSegment(fileName, 'File name');

    // The session is started with the server's token; the browser then appends
    // and finishes with the write-only token minted below. No bytes here.
    const dbx = client(await getServerAccessToken());

    let sessionId: string;
    try {
      const started = await dbx.filesUploadSessionStart({
        close: false,
        contents: new Blob([]),
      });
      sessionId = started.result.session_id;
    } catch (error) {
      throw asStorageFailure(error, 'start an upload session');
    }

    const { accessToken, expiresAt } = await mintBrowserUploadToken();

    return {
      sessionId,
      token: accessToken,
      tokenExpiresAt: expiresAt,
      chunkSizeBytes: getDropboxEnv().UPLOAD_CHUNK_SIZE_BYTES,
      // Resolved here, against the configured root, so the browser commits to
      // exactly the place the server chose.
      commitPath: toDropboxPath(joinPath(folderPath, fileName)),
      ...(pathRootHeader() ? { pathRoot: pathRootHeader() } : {}),
    };
  }

  /**
   * Opens one session per file and mints a SINGLE credential for all of them.
   *
   * Sessions are opened in parallel because they are independent and a batch of
   * twenty would otherwise wait on twenty sequential round trips before the
   * first byte could move. Still no bytes here: each session is opened empty
   * and the browser fills it (Constitution I).
   */
  async beginUploads(requests: BatchUploadRequest[]): Promise<BatchUploadGrant> {
    for (const request of requests) {
      validateFolder(request.folderPath);
      assertValidSegment(request.fileName, 'File name');
    }

    const dbx = client(await getServerAccessToken());

    let sessions: UploadSession[];
    try {
      sessions = await Promise.all(
        requests.map(async (request) => {
          const started = await dbx.filesUploadSessionStart({
            close: false,
            contents: new Blob([]),
          });
          return {
            sessionId: started.result.session_id,
            commitPath: toDropboxPath(joinPath(request.folderPath, request.fileName)),
          };
        }),
      );
    } catch (error) {
      throw asStorageFailure(error, 'start upload sessions');
    }

    const { accessToken, expiresAt } = await mintBrowserUploadToken();
    const pathRoot = pathRootHeader();

    return {
      token: accessToken,
      tokenExpiresAt: expiresAt,
      chunkSizeBytes: getDropboxEnv().UPLOAD_CHUNK_SIZE_BYTES,
      ...(pathRoot ? { pathRoot } : {}),
      sessions,
    };
  }

  async moveFile(
    fromFolderPath: string,
    toFolderPath: string,
    fileName: string,
  ): Promise<MoveResult> {
    const from = joinPath(fromFolderPath, fileName);
    const to = joinPath(toFolderPath, fileName);
    const dbx = client(await getServerAccessToken());

    try {
      const result = await dbx.filesMoveV2({
        from_path: toDropboxPath(from),
        to_path: toDropboxPath(to),
        // Never silently rename. An occupied destination must fail loudly, or
        // the enforced naming convention becomes a suggestion (FR-039).
        autorename: false,
        allow_ownership_transfer: false,
      });
      const meta = result.result.metadata;
      return { id: meta['.tag'] === 'file' ? meta.id : '' };
    } catch (error) {
      const summary = summaryOf(error);
      if (summary.includes('to/conflict')) throw new DestinationOccupiedError(to);
      if (summary.includes('from_lookup/not_found') || isNotFound(error)) {
        throw new NotFoundError(from);
      }
      if (isConflict(error)) throw new DestinationOccupiedError(to);
      throw asStorageFailure(error, 'move a file');
    }
  }

  async createTemporaryLink(folderPath: string, fileName: string): Promise<TemporaryLink> {
    const path = joinPath(folderPath, fileName);
    const dbx = client(await getServerAccessToken());
    try {
      const result = await dbx.filesGetTemporaryLink({ path: toDropboxPath(path) });
      return {
        url: result.result.link,
        // Dropbox temporary links live for four hours.
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      };
    } catch (error) {
      if (isNotFound(error)) throw new NotFoundError(path);
      throw asStorageFailure(error, 'create a temporary link');
    }
  }
}

let instance: DropboxStorage | undefined;

export function getDropboxStorage(): DropboxStorage {
  instance ??= new DropboxStorage();
  return instance;
}
