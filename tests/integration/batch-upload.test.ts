import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  approvalStatuses,
  fileTransitions,
  files,
  missions,
  pendingUploads,
  quests,
  stages,
  users,
} from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { createFakeStorage, type FakeStorage } from '@/lib/storage/fake';
import { setStorage } from '@/lib/storage';
import { authorizeUpload } from '@/lib/uploads/authorize';
import { confirmUpload } from '@/lib/uploads/confirm';
import { finalizeBatch } from '@/lib/uploads/finalize';
import { ApiError } from '@/lib/http/errors';
import type { ActingUser } from '@/lib/auth/guards';

/**
 * Multi-file batches (feature 002).
 *
 * The assertions that carry the feature are the refusals. A batch shares its
 * status, quest and mission, so the stage and the distinguishing text are the
 * only things keeping names apart — and a collision discovered after a
 * multi-gigabyte transfer is the failure this whole design exists to avoid.
 */

let storage: FakeStorage;
let uploaderId: number;
let ids: { statusId: number; questId: number; missionId: number; stageId: number };

const FILE = (overrides: Record<string, unknown> = {}) => ({
  clientRef: 'a',
  stageId: ids.stageId,
  originalName: 'raw_clip.MP4',
  sizeBytes: 2048,
  mimeType: 'video/mp4',
  ...overrides,
});

const BATCH = (files: Array<ReturnType<typeof FILE>>) => ({
  approvalStatusId: ids.statusId,
  questId: ids.questId,
  missionId: ids.missionId,
  files,
});

const actor = (id: number, role: 'admin' | 'uploader' = 'uploader'): ActingUser => ({
  id,
  role,
  email: 'batch@vault.test',
  name: 'Batch Tester',
  isActive: true,
});

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: `batch-${Date.now()}@vault.test`,
      name: 'Batch Tester',
      passwordHash: await hashPassword('correct horse battery staple'),
      role: 'uploader',
    })
    .$returningId();
  uploaderId = user!.id;

  const suffix = Date.now();
  const [status] = await db
    .insert(approvalStatuses)
    .values({
      name: `Batch ${suffix}`,
      dropboxPath: `/B${suffix}`,
      position: 500_000 + (suffix % 90_000),
    })
    .$returningId();

  const [quest] = await db
    .insert(quests)
    .values({ approvalStatusId: status!.id, name: 'Onboarding', dropboxPath: '/Onboarding' })
    .$returningId();

  const [mission] = await db
    .insert(missions)
    .values({ questId: quest!.id, name: 'Welcome', dropboxPath: '/Welcome' })
    .$returningId();

  const [stage] = await db
    .insert(stages)
    .values({ missionId: mission!.id, name: 'Rough cut' })
    .$returningId();

  ids = {
    statusId: status!.id,
    questId: quest!.id,
    missionId: mission!.id,
    stageId: stage!.id,
  };
});

beforeEach(async () => {
  storage = createFakeStorage();
  setStorage(storage);

  await db.delete(fileTransitions).where(eq(fileTransitions.actorId, uploaderId));
  await db.delete(files).where(eq(files.uploadedBy, uploaderId));
  await db.delete(pendingUploads).where(eq(pendingUploads.userId, uploaderId));
});

afterAll(() => {
  setStorage(undefined);
});

describe('one taxonomy, many files (US1)', () => {
  it('shares the taxonomy across every file and names each one for itself', async () => {
    const batch = await authorizeUpload(
      uploaderId,
      BATCH([
        FILE({ clientRef: 'a', distinguishingText: 'take 1' }),
        FILE({ clientRef: 'b', distinguishingText: 'take 2' }),
        FILE({ clientRef: 'c', distinguishingText: 'take 3' }),
      ]),
    );

    expect(batch.files).toHaveLength(3);
    // One folder for the whole batch, because the taxonomy is shared.
    expect(batch.folderPath).toMatch(/Onboarding\/Welcome$/);
    expect(batch.files.map((file) => file.standardName)).toEqual([
      'Onboarding - Welcome - Rough cut - take 1.mp4',
      'Onboarding - Welcome - Rough cut - take 2.mp4',
      'Onboarding - Welcome - Rough cut - take 3.mp4',
    ]);
  });

  it('issues one credential for the whole batch, with a session per file', async () => {
    const batch = await authorizeUpload(
      uploaderId,
      BATCH([
        FILE({ clientRef: 'a', distinguishingText: 'one' }),
        FILE({ clientRef: 'b', distinguishingText: 'two' }),
      ]),
    );

    expect(batch.uploadToken).toBeTruthy();
    expect(new Set(batch.files.map((file) => file.dropboxSessionId)).size).toBe(2);
  });

  it('writes one pending row per file, each with what it authorized', async () => {
    await authorizeUpload(
      uploaderId,
      BATCH([
        FILE({ clientRef: 'a', distinguishingText: 'one' }),
        FILE({ clientRef: 'b', distinguishingText: 'two' }),
      ]),
    );

    const pending = await db
      .select()
      .from(pendingUploads)
      .where(eq(pendingUploads.userId, uploaderId));

    expect(pending).toHaveLength(2);
    expect(pending.map((row) => row.distinguishingText).sort()).toEqual(['one', 'two']);
  });

  it('behaves exactly like a single upload for a batch of one (FR-037)', async () => {
    const batch = await authorizeUpload(uploaderId, BATCH([FILE()]));

    expect(batch.files).toHaveLength(1);
    // No distinguishing text: the three-part name feature 001 produced.
    expect(batch.files[0]!.standardName).toBe('Onboarding - Welcome - Rough cut.mp4');
  });
});

describe('the distinguishing text (US2)', () => {
  it('lets several files share a stage when their texts differ (FR-010)', async () => {
    const batch = await authorizeUpload(
      uploaderId,
      BATCH([
        FILE({ clientRef: 'a', distinguishingText: 'wide' }),
        FILE({ clientRef: 'b', distinguishingText: 'close' }),
      ]),
    );

    expect(batch.files[0]!.standardName).not.toBe(batch.files[1]!.standardName);
  });

  it('records the text as authorized, on the file', async () => {
    const batch = await authorizeUpload(
      uploaderId,
      BATCH([FILE({ clientRef: 'a', distinguishingText: 'take 7' })]),
    );

    const file = await confirmUpload(uploaderId, {
      uploadId: batch.files[0]!.uploadId,
      clientOutcome: 'succeeded',
    });

    expect(file.distinguishingText).toBe('take 7');
    expect(file.standardName).toBe('Onboarding - Welcome - Rough cut - take 7.mp4');
    expect(file.incompleteSet).toBe(false);
  });

  it('trims the text before it becomes part of the name', async () => {
    const batch = await authorizeUpload(
      uploaderId,
      BATCH([FILE({ clientRef: 'a', distinguishingText: '   spaced   ' })]),
    );

    expect(batch.files[0]!.standardName).toBe('Onboarding - Welcome - Rough cut - spaced.mp4');
  });

  it('refuses a text that cannot form a legal name part', async () => {
    const error = (await authorizeUpload(
      uploaderId,
      BATCH([FILE({ clientRef: 'a', distinguishingText: 'take/1' })]),
    ).catch((error_: unknown) => error_)) as InstanceType<typeof ApiError>;

    expect(error.code).toBe('invalid_folder_segment');
  });
});

describe('conflicts refused before anything transfers (US3)', () => {
  it('refuses the whole batch when two files would share a name (FR-016)', async () => {
    const error = (await authorizeUpload(
      uploaderId,
      BATCH([
        FILE({ clientRef: 'a', distinguishingText: 'take 1' }),
        FILE({ clientRef: 'b', distinguishingText: 'take 1' }),
      ]),
    ).catch((error_: unknown) => error_)) as InstanceType<typeof ApiError>;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('duplicate_name');
    expect(error.details?.conflicts).toEqual(['a', 'b']);
    // The message must point at the fix, not only at the problem.
    expect(error.message).toContain('distinguishing texts');
  });

  it('treats texts differing only by case or spacing as the same (FR-005)', async () => {
    // Without normalization both pass here and collide at the provider instead.
    const error = (await authorizeUpload(
      uploaderId,
      BATCH([
        FILE({ clientRef: 'a', distinguishingText: 'Take 1' }),
        FILE({ clientRef: 'b', distinguishingText: '  take 1  ' }),
      ]),
    ).catch((error_: unknown) => error_)) as InstanceType<typeof ApiError>;

    expect(error.code).toBe('duplicate_name');
  });

  it('permits the same stage and text with different extensions', async () => {
    const batch = await authorizeUpload(
      uploaderId,
      BATCH([
        FILE({ clientRef: 'a', distinguishingText: 'take 1', originalName: 'a.mp4' }),
        FILE({ clientRef: 'b', distinguishingText: 'take 1', originalName: 'b.mov' }),
      ]),
    );

    expect(batch.files.map((file) => file.standardName)).toEqual([
      'Onboarding - Welcome - Rough cut - take 1.mp4',
      'Onboarding - Welcome - Rough cut - take 1.mov',
    ]);
  });

  it('refuses a name already taken in storage', async () => {
    const first = await authorizeUpload(
      uploaderId,
      BATCH([FILE({ clientRef: 'a', distinguishingText: 'existing' })]),
    );
    await confirmUpload(uploaderId, {
      uploadId: first.files[0]!.uploadId,
      clientOutcome: 'succeeded',
    });

    const error = (await authorizeUpload(
      uploaderId,
      BATCH([
        FILE({ clientRef: 'x', distinguishingText: 'fresh' }),
        FILE({ clientRef: 'y', distinguishingText: 'existing' }),
      ]),
    ).catch((error_: unknown) => error_)) as InstanceType<typeof ApiError>;

    expect(error.code).toBe('duplicate_name');
  });

  it('creates absolutely nothing when a batch is refused', async () => {
    const before = storage.listPaths().length;

    await authorizeUpload(
      uploaderId,
      BATCH([
        FILE({ clientRef: 'a', distinguishingText: 'same' }),
        FILE({ clientRef: 'b', distinguishingText: 'same' }),
      ]),
    ).catch(() => undefined);

    // No sessions opened, no pending rows written, nothing placed.
    expect(storage.listPaths()).toHaveLength(before);
    const pending = await db
      .select()
      .from(pendingUploads)
      .where(eq(pendingUploads.userId, uploaderId));
    expect(pending).toHaveLength(0);
  });

  it('refuses the batch when one file has an unaccepted type, naming it', async () => {
    const error = (await authorizeUpload(
      uploaderId,
      BATCH([
        FILE({ clientRef: 'a', distinguishingText: 'ok' }),
        FILE({ clientRef: 'b', originalName: 'notes.pdf', mimeType: 'application/pdf' }),
      ]),
    ).catch((error_: unknown) => error_)) as InstanceType<typeof ApiError>;

    expect(error.code).toBe('unsupported_file_type');
    expect(error.details?.clientRef).toBe('b');
  });
});

describe('partial failure (US4)', () => {
  async function uploadOne(text: string) {
    const batch = await authorizeUpload(
      uploaderId,
      BATCH([FILE({ clientRef: 'a', distinguishingText: text })]),
    );
    return confirmUpload(uploaderId, {
      uploadId: batch.files[0]!.uploadId,
      clientOutcome: 'succeeded',
    });
  }

  it('marks the files that landed when a sibling failed (FR-027)', async () => {
    const file = await uploadOne('landed');
    const placedBefore = storage.listPaths().length;

    const result = await finalizeBatch(actor(uploaderId), {
      fileIds: [file.id],
      complete: false,
    });

    expect(result).toMatchObject({ updated: 1, incompleteSet: true });

    const rows = await db.select().from(files).where(eq(files.id, file.id));
    expect(rows[0]!.incompleteSet).toBe(true);
    // Nothing was deleted to undo the batch (FR-026).
    expect(storage.listPaths()).toHaveLength(placedBefore);
  });

  it('clears the mark when the set completes or is dismissed (FR-029)', async () => {
    const file = await uploadOne('cleared');

    await finalizeBatch(actor(uploaderId), { fileIds: [file.id], complete: false });
    await finalizeBatch(actor(uploaderId), { fileIds: [file.id], complete: true });

    const rows = await db.select().from(files).where(eq(files.id, file.id));
    expect(rows[0]!.incompleteSet).toBe(false);
  });

  it('refuses an uploader naming a file they do not own', async () => {
    const file = await uploadOne('mine');

    const error = (await finalizeBatch(actor(uploaderId + 99_999), {
      fileIds: [file.id],
      complete: false,
    }).catch((error_: unknown) => error_)) as InstanceType<typeof ApiError>;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('forbidden');
  });

  it('lets an admin mark any file', async () => {
    const file = await uploadOne('admin marked');

    await expect(
      finalizeBatch(actor(uploaderId + 99_999, 'admin'), {
        fileIds: [file.id],
        complete: false,
      }),
    ).resolves.toMatchObject({ incompleteSet: true });
  });

  it('refuses a file id that does not exist', async () => {
    const error = (await finalizeBatch(actor(uploaderId), {
      fileIds: [999_999_999],
      complete: false,
    }).catch((error_: unknown) => error_)) as InstanceType<typeof ApiError>;

    expect(error.code).toBe('not_found');
  });
});
