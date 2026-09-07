import 'server-only';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { missions, quests, stages } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth/guards';
import { ApiError } from '@/lib/http/errors';
import { normalizeName } from '@/lib/naming';
import { assertDeletable, assertValidFolderPath, describeUsage, type TaxonomyLevel } from './lifecycle';

/**
 * Quest, Mission and Stage differ only in their parent column and whether they
 * carry a folder. Everything else — duplicate-name refusal, path validation,
 * in-use protection — is identical, so it lives here once rather than in three
 * near-copies that would drift apart.
 */

type Table = typeof quests | typeof missions | typeof stages;

interface LevelConfig {
  table: Table;
  level: TaxonomyLevel;
  parentColumn: 'approvalStatusId' | 'questId' | 'missionId';
  hasFolder: boolean;
}

export const LEVELS: Record<'quests' | 'missions' | 'stages', LevelConfig> = {
  quests: { table: quests, level: 'quest', parentColumn: 'approvalStatusId', hasFolder: true },
  missions: { table: missions, level: 'mission', parentColumn: 'questId', hasFolder: true },
  // Stage contributes to the file name only — it has no folder of its own.
  stages: { table: stages, level: 'stage', parentColumn: 'missionId', hasFolder: false },
};

interface CreateInput {
  parentId: number;
  name: string;
  dropboxPath?: string;
  dropboxUrl?: string;
}

export async function createEntry(config: LevelConfig, input: CreateInput) {
  await requireAdmin();

  const table = config.table as typeof quests;
  const parentColumn = table[config.parentColumn as 'approvalStatusId'];

  const siblings = await db.select().from(table).where(eq(parentColumn, input.parentId));
  if (siblings.some((row) => row.nameNormalized === normalizeName(input.name))) {
    throw new ApiError(
      'duplicate_name',
      `There is already a ${config.level} called "${input.name.trim()}" here.`,
    );
  }

  const values: Record<string, unknown> = {
    [config.parentColumn]: input.parentId,
    name: input.name.trim(),
  };

  if (config.hasFolder) {
    values.dropboxPath = assertValidFolderPath(input.dropboxPath ?? `/${input.name.trim()}`);
    if (input.dropboxUrl) values.dropboxUrl = input.dropboxUrl;
  }

  const [inserted] = await db
    .insert(table)
    .values(values as never)
    .$returningId();

  const created = await db.select().from(table).where(eq(table.id, inserted!.id)).limit(1);
  return NextResponse.json(created[0], { status: 201 });
}

interface UpdateInput {
  name?: string;
  dropboxPath?: string;
  dropboxUrl?: string;
  isActive?: boolean;
}

export async function updateEntry(config: LevelConfig, id: number, input: UpdateInput) {
  await requireAdmin();

  const table = config.table as typeof quests;
  const existing = await db.select().from(table).where(eq(table.id, id)).limit(1);
  const row = existing[0];
  if (!row) throw new ApiError('not_found', `That ${config.level} could not be found.`);

  if (input.name !== undefined) {
    const parentColumn = table[config.parentColumn as 'approvalStatusId'];
    const parentId = (row as unknown as Record<string, number>)[config.parentColumn]!;
    const siblings = await db.select().from(table).where(eq(parentColumn, parentId));

    if (
      siblings.some(
        (sibling) =>
          sibling.id !== id && sibling.nameNormalized === normalizeName(input.name as string),
      )
    ) {
      throw new ApiError(
        'duplicate_name',
        `There is already a ${config.level} called "${input.name.trim()}" here.`,
      );
    }
  }

  const values: Record<string, unknown> = {};
  if (input.name !== undefined) values.name = input.name.trim();
  if (input.isActive !== undefined) values.isActive = input.isActive;
  if (config.hasFolder) {
    if (input.dropboxPath !== undefined) {
      values.dropboxPath = assertValidFolderPath(input.dropboxPath);
    }
    if (input.dropboxUrl !== undefined) values.dropboxUrl = input.dropboxUrl;
  }

  // Edits are forward-looking: files already placed keep their name and
  // location (FR-031). Nothing here touches the files table.
  await db
    .update(table)
    .set(values as never)
    .where(eq(table.id, id));

  const updated = await db.select().from(table).where(eq(table.id, id)).limit(1);
  return NextResponse.json(updated[0]);
}

export async function deleteEntry(config: LevelConfig, id: number) {
  await requireAdmin();

  const table = config.table as typeof quests;
  const existing = await db.select().from(table).where(eq(table.id, id)).limit(1);
  if (!existing[0]) throw new ApiError('not_found', `That ${config.level} could not be found.`);

  await assertDeletable(config.level, id);
  await db.delete(table).where(eq(table.id, id));

  return NextResponse.json({ deleted: true, id });
}

/** What a delete would affect, for a confirmation prompt (FR-030). */
export async function usageOf(config: LevelConfig, id: number) {
  await requireAdmin();
  return NextResponse.json(await describeUsage(config.level, id));
}
