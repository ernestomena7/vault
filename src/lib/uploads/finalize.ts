import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { files } from '@/lib/db/schema';
import { ApiError } from '@/lib/http/errors';
import type { ActingUser } from '@/lib/auth/guards';

/**
 * The incomplete-set mark.
 *
 * When a batch finishes with at least one failure, the files that landed are
 * marked so the incompleteness is visible later and not only in the moment
 * (FR-027). Nothing is ever deleted to undo a batch — what reached Dropbox
 * stays there (FR-026).
 *
 * Two things about this are worth stating plainly rather than discovering:
 *
 * 1. The mark carries no batch reference, because the grouping is not stored
 *    (FR-033). A marked file can say its set was unfinished; it cannot say
 *    which siblings were missing.
 *
 * 2. The server cannot verify the claim. It never witnesses a transfer
 *    (Constitution I), so it only ever sees successful confirmations — a batch
 *    that failed looks the same as one that was abandoned. It therefore takes
 *    the client's word. That is proportionate here because the worst a
 *    dishonest client achieves is a wrong badge in a list, not a wrong file, a
 *    wrong name, or a wrong permission.
 */

export interface FinalizeResult {
  updated: number;
  incompleteSet: boolean;
}

export async function finalizeBatch(
  actor: ActingUser,
  input: { fileIds: number[]; complete: boolean },
): Promise<FinalizeResult> {
  const found = await db
    .select({ id: files.id, uploadedBy: files.uploadedBy })
    .from(files)
    .where(inArray(files.id, input.fileIds));

  if (found.length !== input.fileIds.length) {
    throw new ApiError('not_found', 'One of those files could not be found.');
  }

  // An Uploader may only mark their own work; an Admin may mark anything.
  if (actor.role !== 'admin') {
    const foreign = found.find((file) => file.uploadedBy !== actor.id);
    if (foreign) {
      throw new ApiError('forbidden', 'You can only change files you uploaded.');
    }
  }

  const incompleteSet = !input.complete;

  await db
    .update(files)
    .set({ incompleteSet })
    .where(
      actor.role === 'admin'
        ? inArray(files.id, input.fileIds)
        : and(inArray(files.id, input.fileIds), eq(files.uploadedBy, actor.id)),
    );

  return { updated: found.length, incompleteSet };
}
