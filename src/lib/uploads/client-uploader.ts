'use client';

/**
 * Browser-side upload.
 *
 * This is the only place in Vault that touches file bytes, and it runs in the
 * user's browser, not on the server (Constitution I). Files go straight to
 * content.dropboxapi.com in chunks; Vault's own server sees small JSON requests
 * either side and nothing in between.
 *
 * If you are checking whether the constitution still holds, open the network
 * tab during an upload: the large requests must go to Dropbox's host, never to
 * this app's origin. That is true for a batch of twenty exactly as for one.
 */

const DROPBOX_CONTENT_HOST = 'https://content.dropboxapi.com/2';

export interface UploadGrant {
  uploadId: string;
  standardName: string;
  folderPath: string;
  dropboxSessionId: string;
  uploadToken: string;
  tokenExpiresAt: string;
  chunkSizeBytes: number;
  /**
   * The exact path to commit to, already resolved server-side against whatever
   * root is configured. The browser uses it verbatim and works nothing out for
   * itself — that is what keeps the naming guarantee the server's to make.
   */
  commitPath: string;
  /**
   * Namespace selector for a Dropbox team account, echoed back on every call.
   * Absent for a personal account. Opaque, and not a credential.
   */
  pathRoot?: string;
}

export interface UploadProgress {
  bytesSent: number;
  totalBytes: number;
  percent: number;
}

export class UploadError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

/**
 * Dropbox rejects a Dropbox-API-Arg header carrying raw non-ASCII bytes, so
 * everything outside ASCII is escaped.
 *
 * Written with explicit escapes rather than literal characters: a file name
 * with an accent in it is entirely ordinary, and this is the code path that has
 * to survive one.
 */
export function asciiHeader(value: unknown): string {
  return JSON.stringify(value).replace(/[^\x00-\x7f]/g, (char) => {
    const code = char.charCodeAt(0).toString(16).padStart(4, '0');
    return `\\u${code}`;
  });
}

async function postChunk(
  endpoint: string,
  token: string,
  apiArg: unknown,
  body: Blob,
  pathRoot?: string,
): Promise<Response> {
  const response = await fetch(`${DROPBOX_CONTENT_HOST}/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': asciiHeader(apiArg),
      'Content-Type': 'application/octet-stream',
      // Without this, a team account's calls land in the member's personal
      // namespace, where the destination folder simply does not exist.
      ...(pathRoot ? { 'Dropbox-API-Path-Root': pathRoot } : {}),
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    // 429 and 5xx are worth another attempt; a 400 means we asked wrongly.
    const retryable = response.status === 429 || response.status >= 500;
    throw new UploadError(
      `Dropbox rejected a chunk (${response.status}): ${detail.slice(0, 200)}`,
      retryable,
    );
  }
  return response;
}

async function withRetry<T>(attempt: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      if (error instanceof UploadError && !error.retryable) throw error;
      // Only the failed chunk is retried, not the whole file - which is the
      // point of chunking a multi-gigabyte upload (research.md R-003).
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** i));
    }
  }
  throw lastError;
}

export interface TransferOptions {
  file: File;
  grant: UploadGrant;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}

/**
 * Sends one file to Dropbox in chunks and commits it at the exact path and name
 * the server dictated. The browser cannot choose either.
 */
export async function transferToDropbox({
  file,
  grant,
  onProgress,
  signal,
}: TransferOptions): Promise<void> {
  const chunkSize = grant.chunkSizeBytes;
  let offset = 0;

  onProgress?.({ bytesSent: 0, totalBytes: file.size, percent: 0 });

  while (offset < file.size) {
    if (signal?.aborted) throw new UploadError('Upload cancelled.', false);

    const end = Math.min(offset + chunkSize, file.size);
    const chunk = file.slice(offset, end);
    const isLast = end >= file.size;

    if (isLast) {
      await withRetry(() =>
        postChunk(
          'files/upload_session/finish',
          grant.uploadToken,
          {
            cursor: { session_id: grant.dropboxSessionId, offset },
            commit: {
              // The server's path, verbatim.
              path: grant.commitPath,
              mode: 'add',
              // Never let Dropbox pick a different name - the enforced
              // convention is the product (FR-016, SC-001).
              autorename: false,
              mute: true,
            },
          },
          chunk,
          grant.pathRoot,
        ),
      );
    } else {
      await withRetry(() =>
        postChunk(
          'files/upload_session/append_v2',
          grant.uploadToken,
          { cursor: { session_id: grant.dropboxSessionId, offset }, close: false },
          chunk,
          grant.pathRoot,
        ),
      );
    }

    offset = end;
    onProgress?.({
      bytesSent: offset,
      totalBytes: file.size,
      percent: file.size === 0 ? 100 : Math.round((offset / file.size) * 100),
    });
  }
}

// ---------------------------------------------------------------------------
// Batches
// ---------------------------------------------------------------------------

export interface BatchSelection {
  approvalStatusId: number;
  questId: number;
  missionId: number;
}

/** One file the uploader has queued, before anything is authorized. */
export interface PendingFile {
  clientRef: string;
  file: File;
  stageId: number;
  distinguishingText?: string;
}

export interface UploadResult {
  id: number;
  standardName: string;
  distinguishingText: string | null;
  folderPath: string;
  approvalStatusId: number;
  sizeBytes: number;
  uploadedAt: string;
}

export type FileState = 'queued' | 'transferring' | 'succeeded' | 'failed';

export interface FileOutcome {
  clientRef: string;
  state: FileState;
  percent: number;
  standardName?: string;
  fileId?: number;
  error?: string;
}

export interface BatchOutcome {
  outcomes: FileOutcome[];
  succeededFileIds: number[];
  failedRefs: string[];
  /** True when every file in the batch landed. Drives the incomplete mark. */
  complete: boolean;
}

interface BatchGrant {
  folderPath: string;
  uploadToken: string;
  tokenExpiresAt: string;
  chunkSizeBytes: number;
  pathRoot?: string;
  files: Array<{
    clientRef: string;
    uploadId: string;
    standardName: string;
    dropboxSessionId: string;
    commitPath: string;
  }>;
}

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
}

/** A refusal from Vault, carrying the code and the conflicting files if any. */
export class AuthorizeError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly conflicts: string[] = [],
  ) {
    super(message);
    this.name = 'AuthorizeError';
  }
}

async function readAuthorizeError(response: Response): Promise<never> {
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
  const rawConflicts = body.error?.details?.conflicts;
  const conflicts = Array.isArray(rawConflicts) ? (rawConflicts as string[]) : [];

  throw new AuthorizeError(
    body.error?.message ?? 'That upload could not be authorized.',
    body.error?.code ?? 'internal_error',
    conflicts,
  );
}

export interface BatchOptions {
  onFileProgress?: (clientRef: string, percent: number) => void;
  onFileState?: (clientRef: string, state: FileState, detail?: string) => void;
  signal?: AbortSignal;
}

/**
 * The whole batch flow.
 *
 * Authorize once for every file (metadata only), then transfer them ONE AT A
 * TIME straight to Dropbox, confirming each as it lands. Sequential because
 * parallel transfers of multi-gigabyte files compete for one uplink, make
 * progress reporting incoherent, and cannot be assumed safe on shared hosting
 * (FR-021).
 *
 * Authorization is all-or-nothing: if any file would collide, nothing at all is
 * transferred (FR-016). That check lives on the server and happens before this
 * function moves a single byte, which is the point of doing it there.
 */
export async function uploadBatch(
  selection: BatchSelection,
  pending: PendingFile[],
  options: BatchOptions = {},
): Promise<BatchOutcome> {
  const authorizeResponse = await fetch('/api/uploads/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...selection,
      files: pending.map((item) => ({
        clientRef: item.clientRef,
        stageId: item.stageId,
        ...(item.distinguishingText?.trim()
          ? { distinguishingText: item.distinguishingText.trim() }
          : {}),
        originalName: item.file.name,
        sizeBytes: item.file.size,
        mimeType: item.file.type || 'application/octet-stream',
      })),
    }),
  });

  if (!authorizeResponse.ok) {
    // Nothing has been transferred and nothing was created server-side.
    await readAuthorizeError(authorizeResponse);
  }

  const batch = (await authorizeResponse.json()) as BatchGrant;
  const grantByRef = new Map(batch.files.map((file) => [file.clientRef, file]));

  const outcomes: FileOutcome[] = pending.map((item) => ({
    clientRef: item.clientRef,
    state: 'queued',
    percent: 0,
    ...(grantByRef.get(item.clientRef)?.standardName
      ? { standardName: grantByRef.get(item.clientRef)!.standardName }
      : {}),
  }));

  const succeededFileIds: number[] = [];
  const failedRefs: string[] = [];

  for (const [index, item] of pending.entries()) {
    const outcome = outcomes[index]!;
    const grant = grantByRef.get(item.clientRef);

    if (!grant) {
      outcome.state = 'failed';
      outcome.error = 'The server did not authorize this file.';
      failedRefs.push(item.clientRef);
      continue;
    }

    if (options.signal?.aborted) {
      // Cancelled: files already done stay, files not started never begin.
      outcome.state = 'queued';
      continue;
    }

    outcome.state = 'transferring';
    options.onFileState?.(item.clientRef, 'transferring');

    try {
      await transferToDropbox({
        file: item.file,
        grant: {
          uploadId: grant.uploadId,
          standardName: grant.standardName,
          folderPath: batch.folderPath,
          dropboxSessionId: grant.dropboxSessionId,
          uploadToken: batch.uploadToken,
          tokenExpiresAt: batch.tokenExpiresAt,
          chunkSizeBytes: batch.chunkSizeBytes,
          commitPath: grant.commitPath,
          ...(batch.pathRoot ? { pathRoot: batch.pathRoot } : {}),
        },
        onProgress: (progress) => {
          outcome.percent = progress.percent;
          options.onFileProgress?.(item.clientRef, progress.percent);
        },
        ...(options.signal ? { signal: options.signal } : {}),
      });

      const result = await confirmOne(grant.uploadId, 'succeeded');
      outcome.state = 'succeeded';
      outcome.percent = 100;
      outcome.fileId = result.id;
      succeededFileIds.push(result.id);
      options.onFileState?.(item.clientRef, 'succeeded');
    } catch (error) {
      // Close out the pending row rather than leaving it to expire.
      await confirmOne(grant.uploadId, 'failed').catch(() => undefined);

      outcome.state = 'failed';
      outcome.error = error instanceof Error ? error.message : 'The transfer failed.';
      failedRefs.push(item.clientRef);
      options.onFileState?.(item.clientRef, 'failed', outcome.error);
      // Keep going. The rest of the batch is independent, and stopping would
      // discard transfers the uploader has already waited for.
    }
  }

  const complete = failedRefs.length === 0;

  // Mark what landed when a sibling did not (FR-027), or clear a stale mark
  // when everything did.
  if (succeededFileIds.length > 0) {
    await fetch('/api/uploads/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileIds: succeededFileIds, complete }),
    }).catch(() => undefined);
  }

  return { outcomes, succeededFileIds, failedRefs, complete };
}

async function confirmOne(
  uploadId: string,
  clientOutcome: 'succeeded' | 'failed',
): Promise<UploadResult> {
  const response = await fetch('/api/uploads/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId, clientOutcome }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new UploadError(body.error?.message ?? 'The upload could not be confirmed.', false);
  }

  return (await response.json()) as UploadResult;
}
