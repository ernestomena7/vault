import 'server-only';
import { and, desc, eq, like, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { approvalStatuses, fileTransitions, files, missions, quests, stages, users } from '@/lib/db/schema';
import type { FileListQuery } from '@/lib/validation';

/**
 * File reads.
 *
 * The uploader scope is applied here, server-side. An Uploader passing another
 * user's id in the query string still gets their own files, because the filter
 * is never taken from the request (spec Assumptions).
 */

export interface FileListItem {
  id: number;
  standardName: string;
  questName: string;
  missionName: string;
  stageName: string;
  approvalStatusId: number;
  approvalStatusName: string;
  approvalStatusPosition: number;
  uploaderName: string;
  uploadedAt: Date;
  sizeBytes: number;
  dropboxFolderPath: string;
  integrityState: 'valid' | 'broken';
  distinguishingText: string | null;
  /** Landed as part of a batch that did not fully succeed (FR-027). */
  incompleteSet: boolean;
}

const selection = {
  id: files.id,
  standardName: files.standardName,
  questName: quests.name,
  missionName: missions.name,
  stageName: stages.name,
  approvalStatusId: approvalStatuses.id,
  approvalStatusName: approvalStatuses.name,
  approvalStatusPosition: approvalStatuses.position,
  uploaderName: users.name,
  uploadedAt: files.uploadedAt,
  sizeBytes: files.sizeBytes,
  dropboxFolderPath: files.dropboxFolderPath,
  integrityState: files.integrityState,
  distinguishingText: files.distinguishingText,
  incompleteSet: files.incompleteSet,
};

function baseQuery() {
  return db
    .select(selection)
    .from(files)
    .innerJoin(approvalStatuses, eq(files.approvalStatusId, approvalStatuses.id))
    .innerJoin(quests, eq(files.questId, quests.id))
    .innerJoin(missions, eq(files.missionId, missions.id))
    .innerJoin(stages, eq(files.stageId, stages.id))
    .innerJoin(users, eq(files.uploadedBy, users.id));
}

export interface ListFilesOptions extends FileListQuery {
  /** Set for an Uploader; omitted for an Admin, who sees everything. */
  restrictToUploaderId?: number;
}

export async function listFiles(options: ListFilesOptions): Promise<{
  items: FileListItem[];
  total: number;
}> {
  const conditions: SQL[] = [];

  if (options.restrictToUploaderId !== undefined) {
    conditions.push(eq(files.uploadedBy, options.restrictToUploaderId));
  }
  if (options.status !== undefined) {
    conditions.push(eq(files.approvalStatusId, options.status));
  }
  if (options.questId !== undefined) {
    conditions.push(eq(files.questId, options.questId));
  }
  if (options.q) {
    conditions.push(like(files.standardName, `%${options.q}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (options.page - 1) * options.pageSize;

  const [items, counted] = await Promise.all([
    baseQuery().where(where).orderBy(desc(files.uploadedAt)).limit(options.pageSize).offset(offset),
    db
      .select({ total: sql<number>`COUNT(*)` })
      .from(files)
      .where(where),
  ]);

  return { items: items as FileListItem[], total: Number(counted[0]?.total ?? 0) };
}

export async function getFileById(
  id: number,
  options: { restrictToUploaderId?: number } = {},
): Promise<FileListItem | undefined> {
  const conditions: SQL[] = [eq(files.id, id)];
  if (options.restrictToUploaderId !== undefined) {
    conditions.push(eq(files.uploadedBy, options.restrictToUploaderId));
  }

  const rows = await baseQuery().where(and(...conditions)).limit(1);
  return rows[0] as FileListItem | undefined;
}

export interface TransitionHistoryItem {
  id: number;
  fromStatusName: string | null;
  toStatusName: string;
  actorName: string;
  outcome: 'succeeded' | 'failed';
  detail: string | null;
  createdAt: Date;
}

/** The append-only trail for one file, newest first (FR-040). */
export async function getFileHistory(fileId: number): Promise<TransitionHistoryItem[]> {
  const fromStatus = db
    .select({ id: approvalStatuses.id, name: approvalStatuses.name })
    .from(approvalStatuses)
    .as('from_status');

  const rows = await db
    .select({
      id: fileTransitions.id,
      fromStatusName: fromStatus.name,
      toStatusName: approvalStatuses.name,
      actorName: users.name,
      outcome: fileTransitions.outcome,
      detail: fileTransitions.detail,
      createdAt: fileTransitions.createdAt,
    })
    .from(fileTransitions)
    .innerJoin(approvalStatuses, eq(fileTransitions.toStatusId, approvalStatuses.id))
    .innerJoin(users, eq(fileTransitions.actorId, users.id))
    .leftJoin(fromStatus, eq(fileTransitions.fromStatusId, fromStatus.id))
    .where(eq(fileTransitions.fileId, fileId))
    .orderBy(desc(fileTransitions.createdAt));

  return rows as TransitionHistoryItem[];
}
