/**
 * The storage port — the ONLY storage contract the application knows.
 *
 * Two implementations satisfy it: the Dropbox adapter (lib/storage/dropbox) and
 * an in-memory fake (lib/storage/fake). Both are exercised by the same contract
 * suite so the fake cannot drift (Constitution V).
 *
 * Note what is absent: there is no `upload(bytes)`. By design. File content
 * never passes through this application (Constitution I) — the port authorizes
 * transfers and inspects their results; the bytes travel browser → provider.
 *
 * The provider SDK is imported nowhere outside lib/storage/dropbox/. That single
 * rule is what makes a move to GCP a deployment change, not a rewrite
 * (Constitution III). It is enforced by a lint rule in eslint.config.mjs.
 *
 * See specs/001-dropbox-upload-approval/contracts/storage-port.md
 */

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** The requested object does not exist. Distinct from a transport failure. */
export class NotFoundError extends Error {
  readonly kind = 'not_found' as const;
  constructor(readonly path: string) {
    super(`Nothing found at ${path}`);
    this.name = 'NotFoundError';
  }
}

/** A different object already holds the destination name. Nothing was moved. */
export class DestinationOccupiedError extends Error {
  readonly kind = 'destination_occupied' as const;
  constructor(readonly path: string) {
    super(`A different file already occupies ${path}`);
    this.name = 'DestinationOccupiedError';
  }
}

/**
 * The provider could not be reached, or failed. Callers must not need to know
 * Dropbox error shapes — every transport and provider failure arrives here.
 */
export class StorageUnavailableError extends Error {
  readonly kind = 'storage_unavailable' as const;
  constructor(
    message: string,
    readonly options?: { retryAfterSeconds?: number; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'StorageUnavailableError';
  }
  get retryAfterSeconds(): number | undefined {
    return this.options?.retryAfterSeconds;
  }
}

/** A path or name that cannot be expressed as a valid provider segment. */
export class InvalidPathError extends Error {
  readonly kind = 'invalid_path' as const;
  constructor(readonly segment: string, reason: string) {
    super(`Invalid path segment "${segment}": ${reason}`);
    this.name = 'InvalidPathError';
  }
}

export type StorageError =
  | NotFoundError
  | DestinationOccupiedError
  | StorageUnavailableError
  | InvalidPathError;

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export interface FolderResolution {
  exists: boolean;
}

export interface FolderCreation {
  /** false when the folder was already there — never an error (FR-036). */
  created: boolean;
}

export interface FileProbe {
  exists: boolean;
  id?: string;
  sizeBytes?: number;
}

export interface FileMetadata {
  id: string;
  sizeBytes: number;
  modifiedAt: Date;
  path: string;
}

export interface UploadGrant {
  sessionId: string;
  /**
   * A short-lived credential scoped to writing only — never the app's refresh
   * token, never a full-scope token (Constitution IV, research.md R-002).
   */
  token: string;
  tokenExpiresAt: Date;
  chunkSizeBytes: number;
  /**
   * The exact provider path the file must be committed to, already resolved
   * against any configured root. The browser commits to this verbatim: it does
   * not know where the root is and must not have to work it out (SC-001).
   */
  commitPath: string;
  /**
   * Opaque namespace selector the browser echoes back to the provider, for a
   * team account whose content is not in the member's personal namespace.
   * Undefined for a personal account. Not a credential.
   */
  pathRoot?: string;
}

/** One file's slot within a batch grant. */
export interface UploadSession {
  sessionId: string;
  /** The exact provider path this file must be committed to. */
  commitPath: string;
}

/**
 * A grant covering several files at once.
 *
 * One credential serves the whole batch rather than one per file: the tokens
 * would be identical in scope, issued to the same browser within the same
 * minute, so minting twenty of them buys nothing and costs twenty round trips
 * before the first byte moves (research.md R-003).
 */
export interface BatchUploadGrant {
  token: string;
  tokenExpiresAt: Date;
  chunkSizeBytes: number;
  pathRoot?: string;
  /** In the same order as the requested files. */
  sessions: UploadSession[];
}

export interface BatchUploadRequest {
  folderPath: string;
  fileName: string;
  sizeBytes: number;
}

/** A child folder, as returned by listFolders. */
export interface FolderEntry {
  name: string;
  path: string;
}

export interface MoveResult {
  /** The provider's stable id, preserved across the move. */
  id: string;
}

export interface TemporaryLink {
  url: string;
  /** Always bounded. Never a permanent public URL (FR-043). */
  expiresAt: Date;
}

// ---------------------------------------------------------------------------
// The port
// ---------------------------------------------------------------------------

export interface StoragePort {
  /** Does this folder exist? */
  resolveFolder(folderPath: string): Promise<FolderResolution>;

  /**
   * Create the folder and any missing ancestors. Idempotent: an existing folder
   * reports `created: false` and is not an error.
   */
  ensureFolder(folderPath: string): Promise<FolderCreation>;

  /**
   * The immediate child folders of a folder, sorted by name. Files are not
   * returned — this exists to read a folder *structure*, not its contents.
   *
   * An absent folder returns an empty list rather than throwing: "nothing
   * there" and "no children" are the same answer to the caller.
   */
  listFolders(folderPath: string): Promise<FolderEntry[]>;

  /** Probe for a file. An absent file reports `exists: false` — it does not throw. */
  fileExists(folderPath: string, fileName: string): Promise<FileProbe>;

  /** Read metadata. Throws NotFoundError when absent. */
  getMetadata(folderPath: string, fileName: string): Promise<FileMetadata>;

  /**
   * Authorize a browser-driven upload. Returns a session and a write-only
   * credential; the application never sees the bytes that follow.
   */
  beginUpload(folderPath: string, fileName: string, sizeBytes: number): Promise<UploadGrant>;

  /**
   * Authorize several browser-driven uploads under ONE credential.
   *
   * Still no bytes: this opens the sessions and issues the credential, and the
   * browser does the transferring (Constitution I).
   */
  beginUploads(requests: BatchUploadRequest[]): Promise<BatchUploadGrant>;

  /**
   * Move a file between folders, keeping its name. Provider autorename MUST be
   * disabled: an occupied destination raises DestinationOccupiedError and moves
   * nothing (FR-039). Silent renaming here would break the naming guarantee.
   */
  moveFile(fromFolderPath: string, toFolderPath: string, fileName: string): Promise<MoveResult>;

  /** A time-limited link for a viewer. */
  createTemporaryLink(folderPath: string, fileName: string): Promise<TemporaryLink>;
}
