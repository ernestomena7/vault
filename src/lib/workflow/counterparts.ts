import 'server-only';
import { and, eq } from 'drizzle-orm';
import type { MySqlTransaction } from 'drizzle-orm/mysql-core';
import { missions, quests, stages } from '@/lib/db/schema';
import { normalizeName, segmentFromName } from '@/lib/naming';
import type { StoragePort } from '@/lib/storage/port';

/**
 * Counterpart resolution across Approval Statuses.
 *
 * The taxonomy is duplicated under every status, so a file that moves needs the
 * equivalent Quest, Mission and Stage under its destination. They are matched by
 * normalized name (FR-008) and created when absent (FR-036) — a transition is
 * never blocked because an Admin has not duplicated a branch by hand, which is
 * what REQ-4.3 requires.
 *
 * Everything here runs inside the caller's transaction, so a failure part-way
 * leaves no half-built branch behind.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Tx = MySqlTransaction<any, any, any, any>;

export interface CounterpartSource {
  questName: string;
  questPath: string;
  missionName: string;
  missionPath: string;
  stageName: string;
}

export interface Counterparts {
  questId: number;
  missionId: number;
  stageId: number;
  questPath: string;
  missionPath: string;
  created: boolean;
}

export async function resolveCounterparts(
  tx: Tx,
  targetStatusId: number,
  source: CounterpartSource,
): Promise<Counterparts> {
  let created = false;

  // --- Quest ---------------------------------------------------------------
  const questMatches = await tx
    .select()
    .from(quests)
    .where(
      and(
        eq(quests.approvalStatusId, targetStatusId),
        eq(quests.nameNormalized, normalizeName(source.questName)),
      ),
    )
    .limit(1);

  let quest = questMatches[0];
  if (!quest) {
    const [inserted] = await tx
      .insert(quests)
      .values({
        approvalStatusId: targetStatusId,
        name: source.questName,
        // Reuse the source segment so the same Quest keeps the same folder name
        // beneath every status.
        dropboxPath: source.questPath || segmentFromName(source.questName),
      })
      .$returningId();
    const reloaded = await tx.select().from(quests).where(eq(quests.id, inserted!.id)).limit(1);
    quest = reloaded[0]!;
    created = true;
  }

  // --- Mission -------------------------------------------------------------
  const missionMatches = await tx
    .select()
    .from(missions)
    .where(
      and(
        eq(missions.questId, quest.id),
        eq(missions.nameNormalized, normalizeName(source.missionName)),
      ),
    )
    .limit(1);

  let mission = missionMatches[0];
  if (!mission) {
    const [inserted] = await tx
      .insert(missions)
      .values({
        questId: quest.id,
        name: source.missionName,
        dropboxPath: source.missionPath || segmentFromName(source.missionName),
      })
      .$returningId();
    const reloaded = await tx.select().from(missions).where(eq(missions.id, inserted!.id)).limit(1);
    mission = reloaded[0]!;
    created = true;
  }

  // --- Stage ---------------------------------------------------------------
  const stageMatches = await tx
    .select()
    .from(stages)
    .where(
      and(
        eq(stages.missionId, mission.id),
        eq(stages.nameNormalized, normalizeName(source.stageName)),
      ),
    )
    .limit(1);

  let stage = stageMatches[0];
  if (!stage) {
    const [inserted] = await tx
      .insert(stages)
      .values({ missionId: mission.id, name: source.stageName })
      .$returningId();
    const reloaded = await tx.select().from(stages).where(eq(stages.id, inserted!.id)).limit(1);
    stage = reloaded[0]!;
    created = true;
  }

  return {
    questId: quest.id,
    missionId: mission.id,
    stageId: stage.id,
    questPath: quest.dropboxPath,
    missionPath: mission.dropboxPath,
    created,
  };
}

/**
 * Creates the destination folders. Idempotent by contract — an existing folder
 * is success, not an error (storage port item 2).
 */
export async function ensureDestinationFolders(
  storage: StoragePort,
  folderPath: string,
): Promise<void> {
  await storage.ensureFolder(folderPath);
}
