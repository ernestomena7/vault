import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, like } from 'drizzle-orm';
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
import { createFakeStorage, type FakeStorage } from '@/lib/storage/fake';
import { setStorage } from '@/lib/storage';
import { transitionFile, verifyIntegrity } from '@/lib/workflow/execute';
import { ApiError } from '@/lib/http/errors';

/**
 * The approval pipeline against the fake adapter.
 *
 * The interesting cases are the ones where something goes wrong: a failed move
 * must leave the file exactly where it was, and an occupied destination must
 * refuse rather than overwrite. That is SC-006 — zero files lost or overwritten.
 */

let storage: FakeStorage;
let adminId: number;
let statusIds: number[] = [];
let fileId: number;


/**
 * Removes anything a previous run left behind. The unique indexes are real, so
 * a crashed run would otherwise poison every run after it — leaf tables first,
 * because the foreign keys are ON DELETE RESTRICT by design.
 */
async function clearPreviousRuns() {
  const leftovers = await db
    .select({ id: approvalStatuses.id })
    .from(approvalStatuses)
    .where(like(approvalStatuses.name, 'T Status %'));

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

    await db.delete(fileTransitions).where(eq(fileTransitions.toStatusId, status.id));
    await db.delete(approvalStatuses).where(eq(approvalStatuses.id, status.id));
  }
}

beforeAll(async () => {
  await clearPreviousRuns();

  const [admin] = await db
    .insert(users)
    .values({
      email: `transition-${Date.now()}@vault.test`,
      name: 'Transition Admin',
      passwordHash: await hashPassword('correct horse battery staple'),
      role: 'admin',
    })
    .$returningId();
  adminId = admin!.id;

  // A three-step workflow with positions well clear of the seeded ones.
  const base = 100_000 + (Date.now() % 500_000);
  statusIds = [];
  for (let i = 0; i < 3; i += 1) {
    const [status] = await db
      .insert(approvalStatuses)
      .values({
        name: `T Status ${base + i}`,
        dropboxPath: `/T Status ${base + i}`,
        position: base + i,
      })
      .$returningId();
    statusIds.push(status!.id);
  }
});

/** Builds the Quest/Mission/Stage branch under one status. */
async function branchUnder(statusId: number) {
  const [quest] = await db
    .insert(quests)
    .values({ approvalStatusId: statusId, name: 'Onboarding', dropboxPath: '/Onboarding' })
    .$returningId();
  const [mission] = await db
    .insert(missions)
    .values({ questId: quest!.id, name: 'Welcome', dropboxPath: '/Welcome' })
    .$returningId();
  const [stage] = await db
    .insert(stages)
    .values({ missionId: mission!.id, name: 'Rough cut' })
    .$returningId();
  return { questId: quest!.id, missionId: mission!.id, stageId: stage!.id };
}

/** Removes the whole taxonomy subtree under the test statuses, leaves first. */
async function clearBranches() {
  for (const statusId of statusIds) {
    const questRows = await db
      .select({ id: quests.id })
      .from(quests)
      .where(eq(quests.approvalStatusId, statusId));

    for (const quest of questRows) {
      const missionRows = await db
        .select({ id: missions.id })
        .from(missions)
        .where(eq(missions.questId, quest.id));

      for (const mission of missionRows) {
        await db.delete(stages).where(eq(stages.missionId, mission.id));
        await db.delete(missions).where(eq(missions.id, mission.id));
      }
      await db.delete(quests).where(eq(quests.id, quest.id));
    }
  }
}

beforeEach(async () => {
  storage = createFakeStorage();
  setStorage(storage);

  await db.delete(fileTransitions).where(eq(fileTransitions.actorId, adminId));
  await db.delete(files).where(eq(files.uploadedBy, adminId));
  await clearBranches();

  // Only the FIRST status gets a branch: the counterparts under the others must
  // be created by the transition itself (FR-036).
  const branch = await branchUnder(statusIds[0]!);

  const startFolder = await db
    .select()
    .from(approvalStatuses)
    .where(eq(approvalStatuses.id, statusIds[0]!))
    .limit(1);

  const startPath = `${startFolder[0]!.dropboxPath}/Onboarding/Welcome`;
  storage.seedFile(startPath, 'Onboarding - Welcome - Rough cut.mp4', 4096);

  const [file] = await db
    .insert(files)
    .values({
      standardName: 'Onboarding - Welcome - Rough cut.mp4',
      originalName: 'raw.mp4',
      extension: 'mp4',
      mimeType: 'video/mp4',
      sizeBytes: 4096,
      approvalStatusId: statusIds[0]!,
      questId: branch.questId,
      missionId: branch.missionId,
      stageId: branch.stageId,
      dropboxFolderPath: startPath,
      dropboxFileId: 'fake-id-1',
      uploadedBy: adminId,
      uploadedAt: new Date(),
    })
    .$returningId();
  fileId = file!.id;
});

afterAll(() => {
  setStorage(undefined);
});

describe('advancing a file', () => {
  it('creates the missing counterpart branch and moves the file (FR-036)', async () => {
    const result = await transitionFile(adminId, fileId, {
      toApprovalStatusId: statusIds[1]!,
      expectedCurrentStatusId: statusIds[0]!,
    });

    expect(result.createdTaxonomy).toBe(true);
    expect(result.file.approvalStatusId).toBe(statusIds[1]);
    // Same name, new status root, same Quest/Mission sub-path.
    expect(result.file.dropboxFolderPath).toMatch(/\/Onboarding\/Welcome$/);
    expect(result.file.standardName).toBe('Onboarding - Welcome - Rough cut.mp4');

    const paths = storage.listPaths();
    expect(paths).toHaveLength(1);
    expect(paths[0]).toContain('Onboarding - Welcome - Rough cut.mp4');
  });

  it('repoints the file at the counterpart taxonomy rows, not the originals', async () => {
    const before = await db.select().from(files).where(eq(files.id, fileId)).limit(1);
    const result = await transitionFile(adminId, fileId, {
      toApprovalStatusId: statusIds[1]!,
      expectedCurrentStatusId: statusIds[0]!,
    });

    expect(result.file.questId).not.toBe(before[0]!.questId);

    const quest = await db
      .select()
      .from(quests)
      .where(eq(quests.id, result.file.questId))
      .limit(1);
    expect(quest[0]!.approvalStatusId).toBe(statusIds[1]);
    // Matched by name, so the branch is recognisably the same one.
    expect(quest[0]!.name).toBe('Onboarding');
  });

  it('reuses an existing counterpart instead of creating a second one', async () => {
    await branchUnder(statusIds[1]!);

    const result = await transitionFile(adminId, fileId, {
      toApprovalStatusId: statusIds[1]!,
      expectedCurrentStatusId: statusIds[0]!,
    });

    expect(result.createdTaxonomy).toBe(false);

    const questsUnderTarget = await db
      .select()
      .from(quests)
      .where(eq(quests.approvalStatusId, statusIds[1]!));
    expect(questsUnderTarget).toHaveLength(1);
  });

  it('writes an audit entry naming both statuses and the actor (FR-040)', async () => {
    await transitionFile(adminId, fileId, {
      toApprovalStatusId: statusIds[1]!,
      expectedCurrentStatusId: statusIds[0]!,
    });

    const history = await db
      .select()
      .from(fileTransitions)
      .where(eq(fileTransitions.fileId, fileId));

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      fromStatusId: statusIds[0],
      toStatusId: statusIds[1],
      actorId: adminId,
      outcome: 'succeeded',
    });
  });

  it('allows a multi-step move backward in one action', async () => {
    await transitionFile(adminId, fileId, {
      toApprovalStatusId: statusIds[1]!,
      expectedCurrentStatusId: statusIds[0]!,
    });
    await transitionFile(adminId, fileId, {
      toApprovalStatusId: statusIds[2]!,
      expectedCurrentStatusId: statusIds[1]!,
    });

    const back = await transitionFile(adminId, fileId, {
      toApprovalStatusId: statusIds[0]!,
      expectedCurrentStatusId: statusIds[2]!,
    });
    expect(back.file.approvalStatusId).toBe(statusIds[0]);
  });

  it('refuses a two-step forward jump', async () => {
    const error = (await transitionFile(adminId, fileId, {
      toApprovalStatusId: statusIds[2]!,
      expectedCurrentStatusId: statusIds[0]!,
    }).catch((e: unknown) => e)) as InstanceType<typeof ApiError>;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('illegal_transition');

    const unchanged = await db.select().from(files).where(eq(files.id, fileId)).limit(1);
    expect(unchanged[0]!.approvalStatusId).toBe(statusIds[0]);
  });
});

describe('failures leave the file where it was', () => {
  it('refuses to overwrite a different file at the destination (FR-039)', async () => {
    const target = await db
      .select()
      .from(approvalStatuses)
      .where(eq(approvalStatuses.id, statusIds[1]!))
      .limit(1);

    // Someone else's file already holds that name at the destination.
    storage.seedFile(
      `${target[0]!.dropboxPath}/Onboarding/Welcome`,
      'Onboarding - Welcome - Rough cut.mp4',
      1234,
    );

    const error = (await transitionFile(adminId, fileId, {
      toApprovalStatusId: statusIds[1]!,
      expectedCurrentStatusId: statusIds[0]!,
    }).catch((e: unknown) => e)) as InstanceType<typeof ApiError>;

    expect(error).toBeInstanceOf(Error);

    const unchanged = await db.select().from(files).where(eq(files.id, fileId)).limit(1);
    expect(unchanged[0]!.approvalStatusId).toBe(statusIds[0]);

    // Both files still exist — nothing was overwritten.
    expect(storage.listPaths()).toHaveLength(2);
  });

  it('records a failed transition when the provider fails (FR-038)', async () => {
    storage.failNext(1);

    await transitionFile(adminId, fileId, {
      toApprovalStatusId: statusIds[1]!,
      expectedCurrentStatusId: statusIds[0]!,
    }).catch(() => undefined);

    const unchanged = await db.select().from(files).where(eq(files.id, fileId)).limit(1);
    expect(unchanged[0]!.approvalStatusId).toBe(statusIds[0]);

    const history = await db
      .select()
      .from(fileTransitions)
      .where(eq(fileTransitions.fileId, fileId));
    expect(history[0]?.outcome).toBe('failed');
  });

  it('detects a concurrent change instead of overwriting it (FR-041)', async () => {
    // Another Admin already moved the file.
    await db
      .update(files)
      .set({ approvalStatusId: statusIds[1]! })
      .where(eq(files.id, fileId));

    const error = (await transitionFile(adminId, fileId, {
      toApprovalStatusId: statusIds[1]!,
      expectedCurrentStatusId: statusIds[0]!,
    }).catch((e: unknown) => e)) as InstanceType<typeof ApiError>;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('stale_status');
    expect(error.status).toBe(409);
  });
});

describe('integrity', () => {
  it('marks a file broken when its object is gone from Dropbox (FR-042)', async () => {
    const emptied = createFakeStorage();
    setStorage(emptied);

    expect(await verifyIntegrity(fileId)).toBe('broken');

    const row = await db.select().from(files).where(eq(files.id, fileId)).limit(1);
    expect(row[0]!.integrityState).toBe('broken');

    setStorage(storage);
  });

  it('reports a present file as valid', async () => {
    expect(await verifyIntegrity(fileId)).toBe('valid');
  });
});
