import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  approvalStatuses,
  fileTransitions,
  files,
  missions,
  quests,
  stages,
  type FileRecord,
} from '@/lib/db/schema';
import { buildFolderPath } from '@/lib/naming';
import { getStorage } from '@/lib/storage';
import { DestinationOccupiedError, NotFoundError } from '@/lib/storage/port';
import { ApiError } from '@/lib/http/errors';
import { assertTransitionAllowed } from './transitions';
import { resolveCounterparts } from './counterparts';

/**
 * Moving a file to another Approval Status.
 *
 * The order of operations is the whole design, and it is deliberate: nothing in
 * the database changes until the file has actually moved in Dropbox. A failure
 * anywhere leaves the file where it was, on the status it had, with the failure
 * recorded (FR-038).
 *
 *   1. Lock the file row and confirm it is still where the caller thought.
 *   2. Check the move is legal.
 *   3. Resolve or create the counterpart taxonomy under the target status.
 *   4. Create the destination folders.
 *   5. Refuse if a different file already holds the name there.
 *   6. Move the file.
 *   7. Only now: update the record and write the audit entry.
 */

export interface TransitionResult {
  file: FileRecord;
  fromStatusName: string;
  toStatusName: string;
  createdTaxonomy: boolean;
}

export async function transitionFile(
  actorId: number,
  fileId: number,
  input: { toApprovalStatusId: number; expectedCurrentStatusId: number },
): Promise<TransitionResult> {
  const storage = await getStorage();
  const allStatuses = await db.select().from(approvalStatuses);

  // Recorded outside the transaction so a rollback cannot erase the evidence
  // that an attempt was made. Held in an object because the assignment happens
  // inside a closure, where a plain let would narrow to null for the catch.
  const audit: { fromStatusId: number | null } = { fromStatusId: null };

  try {
    return await db.transaction(async (tx) => {
      // 1. Lock, and verify the caller is acting on the state they saw.
      const locked = await tx
        .select()
        .from(files)
        .where(eq(files.id, fileId))
        .for('update')
        .limit(1);

      const file = locked[0];
      if (!file) throw new ApiError('not_found', 'That file could not be found.');

      if (file.approvalStatusId !== input.expectedCurrentStatusId) {
        const current = allStatuses.find((s) => s.id === file.approvalStatusId);
        throw new ApiError(
          'stale_status',
          `Someone already moved this file to ${current?.name ?? 'another status'}. Reload to see where it is now.`,
          { currentStatusId: file.approvalStatusId, currentStatusName: current?.name },
        );
      }

      const from = allStatuses.find((s) => s.id === file.approvalStatusId);
      const to = allStatuses.find((s) => s.id === input.toApprovalStatusId);
      if (!from || !to) throw new ApiError('not_found', 'That approval status could not be found.');

      // 2. Legality.
      assertTransitionAllowed(from, to, allStatuses);
      audit.fromStatusId = from.id;

      // Names travel with the file; the destination branch is found or built
      // from them.
      const source = await tx
        .select({
          questName: quests.name,
          questPath: quests.dropboxPath,
          missionName: missions.name,
          missionPath: missions.dropboxPath,
          stageName: stages.name,
        })
        .from(files)
        .innerJoin(quests, eq(files.questId, quests.id))
        .innerJoin(missions, eq(files.missionId, missions.id))
        .innerJoin(stages, eq(files.stageId, stages.id))
        .where(eq(files.id, fileId))
        .limit(1);

      const names = source[0]!;

      // 3. Counterparts under the target status, created if missing.
      const counterparts = await resolveCounterparts(tx, to.id, names);

      const destinationFolder = buildFolderPath({
        statusPath: to.dropboxPath,
        questPath: counterparts.questPath,
        missionPath: counterparts.missionPath,
      });

      // 4. Folders.
      await storage.ensureFolder(destinationFolder);

      // 5. Nothing may be overwritten.
      const occupant = await storage.fileExists(destinationFolder, file.standardName);
      if (occupant.exists && occupant.id !== file.dropboxFileId) {
        throw new DestinationOccupiedError(`${destinationFolder}/${file.standardName}`);
      }

      // 6. The move itself.
      const moved = await storage.moveFile(
        file.dropboxFolderPath,
        destinationFolder,
        file.standardName,
      );

      // 7. Record it.
      await tx
        .update(files)
        .set({
          approvalStatusId: to.id,
          questId: counterparts.questId,
          missionId: counterparts.missionId,
          stageId: counterparts.stageId,
          dropboxFolderPath: destinationFolder,
          dropboxFileId: moved.id || file.dropboxFileId,
          integrityState: 'valid',
        })
        .where(eq(files.id, fileId));

      await tx.insert(fileTransitions).values({
        fileId,
        fromStatusId: from.id,
        toStatusId: to.id,
        actorId,
        outcome: 'succeeded',
        detail: counterparts.created ? 'Created the destination folder structure' : null,
      });

      const updated = await tx.select().from(files).where(eq(files.id, fileId)).limit(1);

      return {
        file: updated[0]!,
        fromStatusName: from.name,
        toStatusName: to.name,
        createdTaxonomy: counterparts.created,
      };
    });
  } catch (error) {
    // A refused move is still part of the story of this file (FR-038).
    if (audit.fromStatusId !== null && shouldAudit(error)) {
      await recordFailure(fileId, audit.fromStatusId, input.toApprovalStatusId, actorId, error);
    }

    if (error instanceof NotFoundError) {
      // The object is gone from where we believed it was — that is a broken
      // record, not a transient failure (FR-042).
      await db.update(files).set({ integrityState: 'broken' }).where(eq(files.id, fileId));
    }

    throw error;
  }
}

/** Legality refusals are user error, not events worth an audit row. */
function shouldAudit(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.code !== 'illegal_transition' && error.code !== 'stale_status';
  }
  return true;
}

async function recordFailure(
  fileId: number,
  fromStatusId: number,
  toStatusId: number,
  actorId: number,
  error: unknown,
): Promise<void> {
  const detail =
    error instanceof DestinationOccupiedError
      ? 'A different file already occupies that name at the destination'
      : error instanceof Error
        ? error.message.slice(0, 500)
        : 'Unknown failure';

  await db
    .insert(fileTransitions)
    .values({ fileId, fromStatusId, toStatusId, actorId, outcome: 'failed', detail })
    .catch(() => undefined);
}

/** Re-checks a file against the provider and updates its integrity state (FR-042). */
export async function verifyIntegrity(fileId: number): Promise<'valid' | 'broken'> {
  const storage = await getStorage();
  const rows = await db.select().from(files).where(eq(files.id, fileId)).limit(1);
  const file = rows[0];
  if (!file) throw new ApiError('not_found', 'That file could not be found.');

  const probe = await storage.fileExists(file.dropboxFolderPath, file.standardName);
  const state = probe.exists ? 'valid' : 'broken';

  if (state !== file.integrityState) {
    await db.update(files).set({ integrityState: state }).where(eq(files.id, fileId));
  }
  return state;
}

/** Files whose stored object has gone missing, for the Admin queue. */
export async function countBrokenFiles(): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(files)
    .where(and(eq(files.integrityState, 'broken')));
  return Number(rows[0]?.total ?? 0);
}
