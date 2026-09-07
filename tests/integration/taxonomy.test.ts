import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asc, eq, like } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  approvalStatuses,
  fileTransitions,
  files,
  missions,
  quests,
  stages,
  users,
} from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';
import {
  assertDeletable,
  assertValidFolderPath,
  describeUsage,
  reorderStatuses,
} from '@/lib/taxonomy/lifecycle';
import { allowedTransitionsFor } from '@/lib/workflow/transitions';
import { ApiError } from '@/lib/http/errors';
import { InvalidPathError } from '@/lib/storage/port';

/**
 * Taxonomy management.
 *
 * Two guarantees matter here: an entry a file depends on can never be deleted
 * out from under it (FR-029), and reordering statuses immediately changes what
 * transitions are legal, with no migration (FR-024).
 */

const PREFIX = 'X Status ';

let adminId: number;
let statusIds: number[] = [];
let questId: number;
let missionId: number;
let stageId: number;

async function purge() {
  const leftovers = await db
    .select({ id: approvalStatuses.id })
    .from(approvalStatuses)
    .where(like(approvalStatuses.name, `${PREFIX}%`));

  for (const status of leftovers) {
    const questRows = await db
      .select({ id: quests.id })
      .from(quests)
      .where(eq(quests.approvalStatusId, status.id));

    for (const quest of questRows) {
      const missionRows = await db
        .select({ id: missions.id })
        .from(missions)
        .where(eq(missions.questId, quest.id));

      for (const mission of missionRows) {
        const stageRows = await db
          .select({ id: stages.id })
          .from(stages)
          .where(eq(stages.missionId, mission.id));

        for (const stage of stageRows) {
          const fileRows = await db
            .select({ id: files.id })
            .from(files)
            .where(eq(files.stageId, stage.id));
          for (const file of fileRows) {
            await db.delete(fileTransitions).where(eq(fileTransitions.fileId, file.id));
            await db.delete(files).where(eq(files.id, file.id));
          }
          await db.delete(stages).where(eq(stages.id, stage.id));
        }
        await db.delete(missions).where(eq(missions.id, mission.id));
      }
      await db.delete(quests).where(eq(quests.id, quest.id));
    }
    await db.delete(approvalStatuses).where(eq(approvalStatuses.id, status.id));
  }
}

beforeAll(async () => {
  await purge();

  const [admin] = await db
    .insert(users)
    .values({
      email: `taxonomy-${Date.now()}@vault.test`,
      name: 'Taxonomy Admin',
      passwordHash: await hashPassword('correct horse battery staple'),
      role: 'admin',
    })
    .$returningId();
  adminId = admin!.id;

  const base = 600_000 + (Date.now() % 100_000);
  statusIds = [];
  for (let i = 0; i < 3; i += 1) {
    const [status] = await db
      .insert(approvalStatuses)
      .values({
        name: `${PREFIX}${base + i}`,
        dropboxPath: `/${PREFIX}${base + i}`,
        position: base + i,
      })
      .$returningId();
    statusIds.push(status!.id);
  }

  const [quest] = await db
    .insert(quests)
    .values({ approvalStatusId: statusIds[0]!, name: 'Marketing', dropboxPath: '/Marketing' })
    .$returningId();
  questId = quest!.id;

  const [mission] = await db
    .insert(missions)
    .values({ questId, name: 'Launch', dropboxPath: '/Launch' })
    .$returningId();
  missionId = mission!.id;

  const [stage] = await db
    .insert(stages)
    .values({ missionId, name: 'Final' })
    .$returningId();
  stageId = stage!.id;
});

afterAll(async () => {
  await purge();
});

describe('sibling names', () => {
  it('refuses a duplicate name under the same parent, ignoring case and spacing', async () => {
    // The generated name_normalized column plus its unique index is what makes
    // counterpart matching across statuses trustworthy (FR-008).
    await expect(
      db
        .insert(quests)
        .values({ approvalStatusId: statusIds[0]!, name: '  marketing ', dropboxPath: '/dup' }),
    ).rejects.toThrow();
  });

  it('allows the same name under a different parent', async () => {
    // The whole point of the per-status model: "Marketing" exists once per
    // approval status, as separate rows linked only by name.
    const [inserted] = await db
      .insert(quests)
      .values({ approvalStatusId: statusIds[1]!, name: 'Marketing', dropboxPath: '/Marketing' })
      .$returningId();

    expect(inserted!.id).toBeGreaterThan(0);
    await db.delete(quests).where(eq(quests.id, inserted!.id));
  });
});

describe('deleting an entry that is in use', () => {
  it('is refused, and the message offers deactivation instead (FR-029)', async () => {
    const [file] = await db
      .insert(files)
      .values({
        standardName: 'Marketing - Launch - Final.mp4',
        originalName: 'raw.mp4',
        extension: 'mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1024,
        approvalStatusId: statusIds[0]!,
        questId,
        missionId,
        stageId,
        dropboxFolderPath: '/x/Marketing/Launch',
        dropboxFileId: 'x-1',
        uploadedBy: adminId,
        uploadedAt: new Date(),
      })
      .$returningId();

    const error = (await assertDeletable('quest', questId).catch(
      (e: unknown) => e,
    )) as InstanceType<typeof ApiError>;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('in_use');
    expect(error.status).toBe(409);
    expect(error.message).toContain('Deactivate it instead');

    await db.delete(files).where(eq(files.id, file!.id));
  });

  it('is refused while it still has children, naming them (FR-030)', async () => {
    const error = (await assertDeletable('quest', questId).catch(
      (e: unknown) => e,
    )) as InstanceType<typeof ApiError>;

    expect(error.code).toBe('in_use');
    expect(error.message).toContain('mission');
  });

  it('reports what a delete would affect', async () => {
    const usage = await describeUsage('status', statusIds[0]!);
    expect(usage.childCounts.quests).toBeGreaterThanOrEqual(1);
    expect(usage.childCounts.missions).toBeGreaterThanOrEqual(1);
    expect(usage.childCounts.stages).toBeGreaterThanOrEqual(1);
  });

  it('permits deleting a leaf nothing depends on', async () => {
    const [spare] = await db
      .insert(stages)
      .values({ missionId, name: 'Disposable' })
      .$returningId();

    await expect(assertDeletable('stage', spare!.id)).resolves.toBeUndefined();
    await db.delete(stages).where(eq(stages.id, spare!.id));
  });
});

describe('folder paths', () => {
  it('normalizes a path', () => {
    expect(assertValidFolderPath('01 Pending/')).toBe('/01 Pending');
  });

  it.each(['bad:name', 'a/b?c', ''])('refuses %s', (bad) => {
    expect(() => assertValidFolderPath(bad)).toThrow();
  });

  it('refuses a segment Dropbox would reject', () => {
    expect(() => assertValidFolderPath('/good/ba*d')).toThrow(InvalidPathError);
  });
});

describe('reordering the workflow', () => {
  it('leaves positions contiguous from 1 and changes legality at once (FR-024)', async () => {
    const all = await db.select().from(approvalStatuses).orderBy(asc(approvalStatuses.position));
    const reversed = [...all].reverse().map((s) => s.id);

    await reorderStatuses(reversed);

    const after = await db.select().from(approvalStatuses).orderBy(asc(approvalStatuses.position));
    expect(after.map((s) => s.position)).toEqual(after.map((_, index) => index + 1));
    expect(after.map((s) => s.id)).toEqual(reversed);

    // Legality is derived from position, so it moved with the reorder.
    const first = after[0]!;
    const allowed = allowedTransitionsFor(first.position, after);
    expect(allowed.map((s) => s.id)).toEqual([after[1]!.id]);

    // Put it back so other suites see the original order.
    await reorderStatuses([...after].reverse().map((s) => s.id));
  });

  it('refuses a partial ordering', async () => {
    const all = await db.select().from(approvalStatuses);
    const error = (await reorderStatuses([all[0]!.id]).catch(
      (e: unknown) => e,
    )) as InstanceType<typeof ApiError>;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('validation_failed');
  });
});
