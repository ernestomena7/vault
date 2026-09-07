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
import { assertValidSegment, joinPath, normalizeFolderPath } from '@/lib/naming';

/**
 * In-memory storage adapter.
 *
 * Exists so the test suite runs with no network access (Constitution V). It is
 * held to the SAME contract suite as the Dropbox adapter — a fake that passes a
 * different suite is worse than no fake, because it lets tests pass while the
 * real adapter mishandles the provider.
 *
 * Note it models file *placement*, never file *content*: this adapter has no
 * bytes in it, exactly like the port it implements.
 */

interface FakeFile {
  id: string;
  sizeBytes: number;
  modifiedAt: Date;
}

export interface FakeStorageOptions {
  /** Force the next N calls to fail, to exercise failure handling. */
  failNextCalls?: number;
  now?: () => Date;
}

export class FakeStorage implements StoragePort {
  private folders = new Set<string>(['']);
  private files = new Map<string, FakeFile>();
  private sequence = 0;
  private failures = 0;
  private readonly now: () => Date;

  constructor(options: FakeStorageOptions = {}) {
    this.failures = options.failNextCalls ?? 0;
    this.now = options.now ?? (() => new Date());
  }

  // --- test helpers ---------------------------------------------------------

  /** Places a file without an upload, for arranging a test. */
  seedFile(folderPath: string, fileName: string, sizeBytes = 1024): FakeFile {
    this.seedFolder(folderPath);
    const file: FakeFile = {
      id: `fake-id-${++this.sequence}`,
      sizeBytes,
      modifiedAt: this.now(),
    };
    this.files.set(joinPath(folderPath, fileName), file);
    return file;
  }

  seedFolder(folderPath: string): void {
    const normalized = normalizeFolderPath(folderPath);
    for (const ancestor of ancestorsOf(normalized)) {
      this.folders.add(ancestor);
    }
  }

  /** Every path currently holding a file. */
  listPaths(): string[] {
    return [...this.files.keys()].sort();
  }

  /** Every folder the fake knows about, flat. Renamed out of the way of the
   *  port's own listFolders, which returns immediate children only. */
  seededFolderPaths(): string[] {
    return [...this.folders].filter(Boolean).sort();
  }

  failNext(count = 1): void {
    this.failures = count;
  }

  private guard(): void {
    if (this.failures > 0) {
      this.failures -= 1;
      throw new StorageUnavailableError('Fake storage was told to fail');
    }
  }

  // --- port -----------------------------------------------------------------

  async resolveFolder(folderPath: string): Promise<FolderResolution> {
    this.guard();
    return { exists: this.folders.has(normalizeFolderPath(folderPath)) };
  }

  async ensureFolder(folderPath: string): Promise<FolderCreation> {
    this.guard();
    const normalized = normalizeFolderPath(folderPath);
    validatePath(normalized);

    if (this.folders.has(normalized)) {
      // Already there is success, not an error — FR-036 depends on this.
      return { created: false };
    }
    for (const ancestor of ancestorsOf(normalized)) {
      this.folders.add(ancestor);
    }
    return { created: true };
  }

  async listFolders(folderPath: string): Promise<FolderEntry[]> {
    this.guard();
    const base = normalizeFolderPath(folderPath);
    const prefix = base === '' ? '/' : `${base}/`;

    const children = [...this.folders]
      .filter((path) => path.startsWith(prefix) && path !== base)
      // Immediate children only — no grandchildren.
      .filter((path) => !path.slice(prefix.length).includes('/'))
      .map((path) => ({ name: path.slice(prefix.length), path }));

    return children.sort((a, b) => a.name.localeCompare(b.name));
  }

  async fileExists(folderPath: string, fileName: string): Promise<FileProbe> {
    this.guard();
    const file = this.files.get(joinPath(folderPath, fileName));
    // Absent is a plain answer, not an exception.
    if (!file) return { exists: false };
    return { exists: true, id: file.id, sizeBytes: file.sizeBytes };
  }

  async getMetadata(folderPath: string, fileName: string): Promise<FileMetadata> {
    this.guard();
    const path = joinPath(folderPath, fileName);
    const file = this.files.get(path);
    if (!file) throw new NotFoundError(path);
    return { id: file.id, sizeBytes: file.sizeBytes, modifiedAt: file.modifiedAt, path };
  }

  async beginUpload(
    folderPath: string,
    fileName: string,
    sizeBytes: number,
  ): Promise<UploadGrant> {
    this.guard();
    const normalized = normalizeFolderPath(folderPath);
    validatePath(normalized);
    assertValidSegment(fileName, 'File name');

    const sessionId = `fake-session-${++this.sequence}`;
    // The fake completes the placement immediately; the real adapter's bytes
    // arrive out of band from the browser.
    this.seedFile(normalized, fileName, sizeBytes);

    return {
      sessionId,
      token: 'fake-write-only-token',
      tokenExpiresAt: new Date(this.now().getTime() + 4 * 60 * 60 * 1000),
      chunkSizeBytes: 8 * 1024 * 1024,
      commitPath: joinPath(normalized, fileName),
    };
  }

  async beginUploads(requests: BatchUploadRequest[]): Promise<BatchUploadGrant> {
    this.guard();

    const sessions: UploadSession[] = requests.map((request) => {
      const normalized = normalizeFolderPath(request.folderPath);
      validatePath(normalized);
      assertValidSegment(request.fileName, 'File name');

      // The fake completes placement immediately; the real adapter's bytes
      // arrive out of band from the browser.
      this.seedFile(normalized, request.fileName, request.sizeBytes);

      return {
        sessionId: `fake-session-${++this.sequence}`,
        commitPath: joinPath(normalized, request.fileName),
      };
    });

    return {
      // ONE token for the whole batch, matching the real adapter.
      token: 'fake-write-only-token',
      tokenExpiresAt: new Date(this.now().getTime() + 4 * 60 * 60 * 1000),
      chunkSizeBytes: 8 * 1024 * 1024,
      sessions,
    };
  }

  async moveFile(
    fromFolderPath: string,
    toFolderPath: string,
    fileName: string,
  ): Promise<MoveResult> {
    this.guard();
    const from = joinPath(fromFolderPath, fileName);
    const to = joinPath(toFolderPath, fileName);

    const file = this.files.get(from);
    if (!file) throw new NotFoundError(from);

    const occupant = this.files.get(to);
    if (occupant && occupant.id !== file.id) {
      // Never silently autorename — that would break the naming guarantee.
      throw new DestinationOccupiedError(to);
    }

    await this.ensureFolder(toFolderPath);
    this.files.delete(from);
    this.files.set(to, file);
    return { id: file.id };
  }

  async createTemporaryLink(folderPath: string, fileName: string): Promise<TemporaryLink> {
    this.guard();
    const path = joinPath(folderPath, fileName);
    if (!this.files.has(path)) throw new NotFoundError(path);
    return {
      url: `https://fake.storage.local/temporary${path}`,
      expiresAt: new Date(this.now().getTime() + 4 * 60 * 60 * 1000),
    };
  }
}

function ancestorsOf(folderPath: string): string[] {
  const segments = folderPath.split('/').filter(Boolean);
  const out: string[] = [''];
  let current = '';
  for (const segment of segments) {
    current += `/${segment}`;
    out.push(current);
  }
  return out;
}

function validatePath(folderPath: string): void {
  for (const segment of folderPath.split('/').filter(Boolean)) {
    assertValidSegment(segment, 'Folder name');
  }
}

export function createFakeStorage(options?: FakeStorageOptions): FakeStorage {
  return new FakeStorage(options);
}
