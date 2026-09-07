import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { fileTransitions, files, pendingUploads, type FileRecord } from '@/lib/db/schema';
import { extractExtension } from '@/lib/naming';
import { getStorage } from '@/lib/storage';
import { NotFoundError } from '@/lib/storage/port';
import { ApiError } from '@/lib/http/errors';
import type { ConfirmUploadInput } from '@/lib/validation';

/**
 * Confirming an upload.
 *
 * The client's report is a hint, never evidence. The server loads the row it
 * wrote at authorization time, asks Dropbox what is actually at the path *it*
 * chose, and only then records a file. A client that lies about where the file
 * went, or that never transferred anything, produces no record (FR-020).
 */
export async function confirmUpload(
  userId: number,
  input: ConfirmUploadInput,
): Promise<FileRecord> {
  const rows = await db
    .select()
    .from(pendingUploads)
    .where(and(eq(pendingUploads.id, input.uploadId), eq(pendingUploads.userId, userId)))
    .limit(1);

  const pending = rows[0];
  // Scoped to the calling user: an upload handle is useless to anyone else.
  if (!pending) {
    throw new ApiError('unknown_upload', 'That upload could not be found.');
  }

  if (pending.state === 'completed') {
    throw new ApiError('already_confirmed', 'That upload has already been recorded.');
  }
  if (pending.state !== 'authorized') {
    throw new ApiError('unknown_upload', 'That upload is no longer valid. Start it again.');
  }

  if (input.clientOutcome === 'failed') {
    await markFailed(pending.id, 'The browser reported a failed transfer.');
    throw new ApiError(
      'verification_failed',
      'The upload did not complete. Nothing was recorded, so you can try again.',
    );
  }

  // The verification. Note it uses the server's recorded path and name, not
  // anything from the request body.
  const storage = await getStorage();
  let metadata;
  try {
    metadata = await storage.getMetadata(pending.dropboxFolderPath, pending.standardName);
  } catch (error) {
    if (error instanceof NotFoundError) {
      await markFailed(pending.id, 'No file was found at the authorized path.');
      throw new ApiError(
        'verification_failed',
        'That file is not in Dropbox, so nothing was recorded. Try uploading again.',
      );
    }
    // A transport failure is NOT a failed upload — the file may well be there.
    // Leaving the row 'authorized' allows a retry of the confirm alone.
    throw error;
  }

  if (metadata.sizeBytes !== pending.declaredSizeBytes) {
    await markFailed(
      pending.id,
      `Size mismatch: expected ${pending.declaredSizeBytes} bytes, found ${metadata.sizeBytes}.`,
    );
    throw new ApiError(
      'verification_failed',
      'The uploaded file does not match what was authorized, so nothing was recorded.',
    );
  }

  const uploadedAt = new Date();

  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(files)
      .values({
        standardName: pending.standardName,
        originalName: pending.originalName,
        // As the server authorized it, never as the client later reports it.
        distinguishingText: pending.distinguishingText,
        extension: extractExtension(pending.originalName),
        mimeType: pending.mimeType,
        // The verified size, not the declared one.
        sizeBytes: metadata.sizeBytes,
        approvalStatusId: pending.approvalStatusId,
        questId: pending.questId,
        missionId: pending.missionId,
        stageId: pending.stageId,
        dropboxFolderPath: pending.dropboxFolderPath,
        dropboxFileId: metadata.id,
        uploadedBy: userId,
        uploadedAt,
        integrityState: 'valid',
      })
      .$returningId();

    const fileId = inserted!.id;

    // The initial placement is part of the audit trail: every status a file has
    // ever held is accounted for (FR-040).
    await tx.insert(fileTransitions).values({
      fileId,
      fromStatusId: null,
      toStatusId: pending.approvalStatusId,
      actorId: userId,
      outcome: 'succeeded',
      detail: 'Initial upload',
    });

    await tx
      .update(pendingUploads)
      .set({ state: 'completed' })
      .where(eq(pendingUploads.id, pending.id));

    const created = await tx.select().from(files).where(eq(files.id, fileId)).limit(1);
    return created[0]!;
  });
}

async function markFailed(uploadId: string, reason: string): Promise<void> {
  await db
    .update(pendingUploads)
    .set({ state: 'failed', dropboxSessionId: null })
    .where(eq(pendingUploads.id, uploadId));
  console.warn(`Upload ${uploadId} failed verification: ${reason}`);
}
