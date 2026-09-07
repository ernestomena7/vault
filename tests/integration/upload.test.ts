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
import { ApiError } from '@/lib/http/errors';

/**
 * The upload flow end to end, against the fake adapter.
 *
 * The assertions that matter most are the negative ones: a duplicate must be
 * refused, and a confirm without a real transfer must record nothing. Those are
 * what make SC-001 and SC-006 true rather than hopeful.
 */

let storage: FakeStorage;
let uploaderId: number;
let ids: { statusId: number; questId: number; missionId: number; stageId: number };

/** One file, described the way a batch of one is. */
const FILE = (overrides: Record<string, unknown> = {}) => ({
  clientRef: 'a',
  stageId: ids.stageId,
  originalName: 'raw_clip_v7.MP4',
  sizeBytes: 2048,
  mimeType: 'video/mp4',
  ...overrides,
});

const SELECTION = (files = [FILE()]) => ({
  approvalStatusId: ids.statusId,
  questId: ids.questId,
  missionId: ids.missionId,
  files,
});

/** Authorizes a batch of one and flattens it, for the single-file assertions. */
async function authorizeOne(fileOverrides: Record<string, unknown> = {}) {
  const batch = await authorizeUpload(uploaderId, SELECTION([FILE(fileOverrides)]));
  return {
    ...batch.files[0]!,
    folderPath: batch.folderPath,
    uploadToken: batch.uploadToken,
    chunkSizeBytes: batch.chunkSizeBytes,
  };
}

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: `upload-${Date.now()}@vault.test`,
      name: 'Upload Tester',
      passwordHash: await hashPassword('correct horse battery staple'),
      role: 'uploader',
    })
    .$returningId();
  uploaderId = user!.id;

  const suffix = Date.now();
  const [status] = await db
    .insert(approvalStatuses)
    .values({
      name: `Pending ${suffix}`,
      dropboxPath: `/T${suffix} Pending`,
      position: 900 + (suffix % 90),
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

  // Each case starts with no files recorded for this fixture.
  await db.delete(fileTransitions).where(eq(fileTransitions.actorId, uploaderId));
  await db.delete(files).where(eq(files.uploadedBy, uploaderId));
  await db.delete(pendingUploads).where(eq(pendingUploads.userId, uploaderId));
});

afterAll(() => {
  setStorage(undefined);
});

describe('upload authorization', () => {
  it('computes the standard name and destination server-side', async () => {
    const grant = await authorizeOne();

    // The client sent none of this. It sent an original file name and four ids.
    expect(grant.standardName).toBe('Onboarding - Welcome - Rough cut.mp4');
    expect(grant.folderPath).toMatch(/\/Onboarding\/Welcome$/);
    expect(grant.uploadId).toHaveLength(26);
  });

  it('creates the destination folder when it is absent', async () => {
    const grant = await authorizeOne();
    expect((await storage.resolveFolder(grant.folderPath)).exists).toBe(true);
  });

  it('records exactly what it authorized', async () => {
    const grant = await authorizeOne();

    const rows = await db
      .select()
      .from(pendingUploads)
      .where(eq(pendingUploads.id, grant.uploadId));

    expect(rows[0]).toMatchObject({
      userId: uploaderId,
      standardName: 'Onboarding - Welcome - Rough cut.mp4',
      state: 'authorized',
      declaredSizeBytes: 2048,
    });
  });

  it('refuses a file type that is not video', async () => {
    const error = (await authorizeOne({
      originalName: 'notes.pdf',
      mimeType: 'application/pdf',
    }).catch((e: unknown) => e)) as InstanceType<typeof ApiError>;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('unsupported_file_type');
  });

  it('refuses a taxonomy chain whose parts belong to different branches', async () => {
    const [otherStatus] = await db
      .insert(approvalStatuses)
      .values({
        name: `Other ${Date.now()}`,
        dropboxPath: `/Other${Date.now()}`,
        position: 800 + (Date.now() % 90),
      })
      .$returningId();

    const error = (await authorizeUpload(uploaderId, {
      ...SELECTION(),
      approvalStatusId: otherStatus!.id,
    }).catch((e: unknown) => e)) as InstanceType<typeof ApiError>;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('invalid_taxonomy_chain');
  });

  it('refuses a second upload of the same name, and writes nothing (FR-016)', async () => {
    const first = await authorizeOne();
    await confirmUpload(uploaderId, { uploadId: first.uploadId, clientOutcome: 'succeeded' });

    const error = (await authorizeOne().catch(
      (e: unknown) => e,
    )) as InstanceType<typeof ApiError>;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('duplicate_name');

    // The original is untouched — never overwritten, never renamed around.
    const stored = storage.listPaths().filter((p) => p.endsWith('Rough cut.mp4'));
    expect(stored).toHaveLength(1);
  });
});

describe('upload confirmation', () => {
  it('records the file only after verifying it with the provider', async () => {
    const grant = await authorizeOne();
    const file = await confirmUpload(uploaderId, {
      uploadId: grant.uploadId,
      clientOutcome: 'succeeded',
    });

    expect(file.standardName).toBe('Onboarding - Welcome - Rough cut.mp4');
    expect(file.sizeBytes).toBe(2048);
    expect(file.integrityState).toBe('valid');
    expect(file.extension).toBe('mp4');
  });

  it('writes an initial transition so the audit trail is complete', async () => {
    const grant = await authorizeOne();
    const file = await confirmUpload(uploaderId, {
      uploadId: grant.uploadId,
      clientOutcome: 'succeeded',
    });

    const history = await db
      .select()
      .from(fileTransitions)
      .where(eq(fileTransitions.fileId, file.id));

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      fromStatusId: null,
      toStatusId: ids.statusId,
      outcome: 'succeeded',
    });
  });

  it('records nothing when the file never reached the provider (FR-020)', async () => {
    const grant = await authorizeOne();

    // Simulate a transfer that never happened: remove what the fake placed.
    const emptied = createFakeStorage();
    setStorage(emptied);

    const error = (await confirmUpload(uploaderId, {
      uploadId: grant.uploadId,
      clientOutcome: 'succeeded',
    }).catch((e: unknown) => e)) as InstanceType<typeof ApiError>;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('verification_failed');

    const recorded = await db.select().from(files).where(eq(files.uploadedBy, uploaderId));
    expect(recorded).toHaveLength(0);

    setStorage(storage);
  });

  it('refuses to record when the size does not match what was authorized', async () => {
    const grant = await authorizeOne();

    // A different file landed at the path than the one authorized.
    const tampered = createFakeStorage();
    tampered.seedFile(grant.folderPath, grant.standardName, 999_999);
    setStorage(tampered);

    const error = (await confirmUpload(uploaderId, {
      uploadId: grant.uploadId,
      clientOutcome: 'succeeded',
    }).catch((e: unknown) => e)) as InstanceType<typeof ApiError>;

    expect(error.code).toBe('verification_failed');
    expect(await db.select().from(files).where(eq(files.uploadedBy, uploaderId))).toHaveLength(0);

    setStorage(storage);
  });

  it('refuses an upload handle belonging to another user', async () => {
    const grant = await authorizeOne();
    const error = (await confirmUpload(uploaderId + 99_999, {
      uploadId: grant.uploadId,
      clientOutcome: 'succeeded',
    }).catch((e: unknown) => e)) as InstanceType<typeof ApiError>;

    expect(error.code).toBe('unknown_upload');
  });

  it('refuses a second confirmation of the same upload', async () => {
    const grant = await authorizeOne();
    await confirmUpload(uploaderId, { uploadId: grant.uploadId, clientOutcome: 'succeeded' });

    const error = (await confirmUpload(uploaderId, {
      uploadId: grant.uploadId,
      clientOutcome: 'succeeded',
    }).catch((e: unknown) => e)) as InstanceType<typeof ApiError>;

    expect(error.code).toBe('already_confirmed');
  });

  it('closes out the pending row when the browser reports a failure', async () => {
    const grant = await authorizeOne();
    await confirmUpload(uploaderId, {
      uploadId: grant.uploadId,
      clientOutcome: 'failed',
    }).catch(() => undefined);

    const rows = await db
      .select()
      .from(pendingUploads)
      .where(eq(pendingUploads.id, grant.uploadId));

    expect(rows[0]?.state).toBe('failed');
  });
});
