import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { approvalStatuses, missions, quests, stages } from '@/lib/db/schema';
import { ApiError } from '@/lib/http/errors';

/**
 * Taxonomy reads.
 *
 * The tree is strictly nested and duplicated under every Approval Status, so
 * every level is queried by its parent id. That is what makes the upload form's
 * cascade a server-side fact rather than client-side filtering (FR-011): an
 * Uploader cannot request Quests that do not belong to the chosen status.
 */

export async function listApprovalStatuses(options: { activeOnly?: boolean } = {}) {
  const where = options.activeOnly ? eq(approvalStatuses.isActive, true) : undefined;
  return db
    .select()
    .from(approvalStatuses)
    .where(where)
    .orderBy(asc(approvalStatuses.position));
}

export async function listQuests(approvalStatusId: number, options: { activeOnly?: boolean } = {}) {
  const conditions = [eq(quests.approvalStatusId, approvalStatusId)];
  if (options.activeOnly) conditions.push(eq(quests.isActive, true));
  return db
    .select()
    .from(quests)
    .where(and(...conditions))
    .orderBy(asc(quests.name));
}

export async function listMissions(questId: number, options: { activeOnly?: boolean } = {}) {
  const conditions = [eq(missions.questId, questId)];
  if (options.activeOnly) conditions.push(eq(missions.isActive, true));
  return db
    .select()
    .from(missions)
    .where(and(...conditions))
    .orderBy(asc(missions.name));
}

export async function listStages(missionId: number, options: { activeOnly?: boolean } = {}) {
  const conditions = [eq(stages.missionId, missionId)];
  if (options.activeOnly) conditions.push(eq(stages.isActive, true));
  return db
    .select()
    .from(stages)
    .where(and(...conditions))
    .orderBy(asc(stages.name));
}

export interface ResolvedChain {
  status: typeof approvalStatuses.$inferSelect;
  quest: typeof quests.$inferSelect;
  mission: typeof missions.$inferSelect;
  stage: typeof stages.$inferSelect;
}

/**
 * Resolves and validates a full selection in one query.
 *
 * The join is the validation: a Stage that does not belong to the given Mission,
 * to the given Quest, to the given Status simply produces no row. A client
 * cannot mix branches by sending ids from different subtrees (FR-010).
 */
export async function resolveChain(input: {
  approvalStatusId: number;
  questId: number;
  missionId: number;
  stageId: number;
  activeOnly?: boolean;
}): Promise<ResolvedChain> {
  const conditions = [
    eq(approvalStatuses.id, input.approvalStatusId),
    eq(quests.id, input.questId),
    eq(missions.id, input.missionId),
    eq(stages.id, input.stageId),
  ];

  if (input.activeOnly !== false) {
    conditions.push(
      eq(approvalStatuses.isActive, true),
      eq(quests.isActive, true),
      eq(missions.isActive, true),
      eq(stages.isActive, true),
    );
  }

  const rows = await db
    .select({ status: approvalStatuses, quest: quests, mission: missions, stage: stages })
    .from(stages)
    .innerJoin(missions, eq(stages.missionId, missions.id))
    .innerJoin(quests, eq(missions.questId, quests.id))
    .innerJoin(approvalStatuses, eq(quests.approvalStatusId, approvalStatuses.id))
    .where(and(...conditions))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new ApiError(
      'invalid_taxonomy_chain',
      'That combination is not available. Choose an approval status, quest, mission and stage that belong together.',
    );
  }
  return row;
}
