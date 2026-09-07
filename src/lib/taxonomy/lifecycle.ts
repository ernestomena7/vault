import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { approvalStatuses, files, missions, quests, stages } from '@/lib/db/schema';
import { assertValidSegment, normalizeFolderPath } from '@/lib/naming';
import { ApiError } from '@/lib/http/errors';

/**
 * Deleting and deactivating taxonomy.
 *
 * Nothing that a file record points at may be deleted (FR-029). The alternative
 * offered is deactivation: the entry stops appearing in upload menus while
 * every existing file and every audit entry stays readable. History that
 * silently loses its labels is worse than a slightly longer list.
 */

export type TaxonomyLevel = 'status' | 'quest' | 'mission' | 'stage';

const LABEL: Record<TaxonomyLevel, string> = {
  status: 'approval status',
  quest: 'quest',
  mission: 'mission',
  stage: 'stage',
};

export interface UsageReport {
  fileCount: number;
  childCounts: { quests?: number; missions?: number; stages?: number };
}

async function countFiles(level: TaxonomyLevel, id: number): Promise<number> {
  const column = {
    status: files.approvalStatusId,
    quest: files.questId,
    mission: files.missionId,
    stage: files.stageId,
  }[level];

  const rows = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(files)
    .where(eq(column, id));
  return Number(rows[0]?.total ?? 0);
}

/** What a delete or deactivate would affect, so the Admin is told first (FR-030). */
export async function describeUsage(level: TaxonomyLevel, id: number): Promise<UsageReport> {
  const fileCount = await countFiles(level, id);
  const childCounts: UsageReport['childCounts'] = {};

  if (level === 'status') {
    const questRows = await db
      .select({ id: quests.id })
      .from(quests)
      .where(eq(quests.approvalStatusId, id));
    childCounts.quests = questRows.length;

    let missionTotal = 0;
    let stageTotal = 0;
    for (const quest of questRows) {
      const missionRows = await db
        .select({ id: missions.id })
        .from(missions)
        .where(eq(missions.questId, quest.id));
      missionTotal += missionRows.length;
      for (const mission of missionRows) {
        const stageRows = await db
          .select({ id: stages.id })
          .from(stages)
          .where(eq(stages.missionId, mission.id));
        stageTotal += stageRows.length;
      }
    }
    childCounts.missions = missionTotal;
    childCounts.stages = stageTotal;
  }

  if (level === 'quest') {
    const missionRows = await db
      .select({ id: missions.id })
      .from(missions)
      .where(eq(missions.questId, id));
    childCounts.missions = missionRows.length;

    let stageTotal = 0;
    for (const mission of missionRows) {
      const stageRows = await db
        .select({ id: stages.id })
        .from(stages)
        .where(eq(stages.missionId, mission.id));
      stageTotal += stageRows.length;
    }
    childCounts.stages = stageTotal;
  }

  if (level === 'mission') {
    const stageRows = await db
      .select({ id: stages.id })
      .from(stages)
      .where(eq(stages.missionId, id));
    childCounts.stages = stageRows.length;
  }

  return { fileCount, childCounts };
}

function describeChildren(usage: UsageReport): string {
  const parts: string[] = [];
  if (usage.childCounts.quests) parts.push(`${usage.childCounts.quests} quest(s)`);
  if (usage.childCounts.missions) parts.push(`${usage.childCounts.missions} mission(s)`);
  if (usage.childCounts.stages) parts.push(`${usage.childCounts.stages} stage(s)`);
  return parts.join(', ');
}

/**
 * Refuses a delete that would orphan records, and says what to do instead.
 * Also refuses one that would strand children, naming them (FR-030).
 */
export async function assertDeletable(level: TaxonomyLevel, id: number): Promise<void> {
  const usage = await describeUsage(level, id);

  if (usage.fileCount > 0) {
    throw new ApiError(
      'in_use',
      `${usage.fileCount} file${usage.fileCount === 1 ? '' : 's'} still ${
        usage.fileCount === 1 ? 'uses' : 'use'
      } this ${LABEL[level]}, so it cannot be deleted. Deactivate it instead — it will stop appearing in upload menus and existing files keep their history.`,
      { fileCount: usage.fileCount, level },
    );
  }

  const children = describeChildren(usage);
  if (children) {
    throw new ApiError(
      'in_use',
      `This ${LABEL[level]} still contains ${children}. Remove those first, or deactivate it instead.`,
      { level, ...usage.childCounts },
    );
  }
}

/** Validates a folder path is expressible as Dropbox segments (FR-022). */
export function assertValidFolderPath(path: string): string {
  const normalized = normalizeFolderPath(path);
  if (normalized === '') {
    throw new ApiError('invalid_folder_segment', 'A Dropbox folder path is required.');
  }
  for (const segment of normalized.split('/').filter(Boolean)) {
    assertValidSegment(segment, 'Folder name');
  }
  return normalized;
}

/**
 * Rewrites the workflow order in one transaction.
 *
 * `position` is uniquely indexed, so the rows are first parked on a high offset
 * to avoid tripping the constraint mid-rewrite, then written to their final
 * values. Positions come out contiguous from 1 (FR-024).
 */
export async function reorderStatuses(orderedIds: number[]): Promise<void> {
  const existing = await db.select({ id: approvalStatuses.id }).from(approvalStatuses);
  const existingIds = new Set(existing.map((row) => row.id));

  if (orderedIds.length !== existingIds.size || orderedIds.some((id) => !existingIds.has(id))) {
    throw new ApiError(
      'validation_failed',
      'Send every approval status exactly once, in the new order.',
    );
  }

  await db.transaction(async (tx) => {
    const parkOffset = 100_000;
    for (const [index, id] of orderedIds.entries()) {
      await tx
        .update(approvalStatuses)
        .set({ position: parkOffset + index })
        .where(eq(approvalStatuses.id, id));
    }
    for (const [index, id] of orderedIds.entries()) {
      await tx
        .update(approvalStatuses)
        .set({ position: index + 1 })
        .where(eq(approvalStatuses.id, id));
    }
  });
}

/** The next free position, for a newly created status. */
export async function nextStatusPosition(): Promise<number> {
  const rows = await db
    .select({ max: sql<number>`COALESCE(MAX(position), 0)` })
    .from(approvalStatuses);
  return Number(rows[0]?.max ?? 0) + 1;
}
