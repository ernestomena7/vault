import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq, like } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { approvalStatuses, files, missions, quests, stages, users } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { createFakeStorage, type FakeStorage } from '@/lib/storage/fake';
import { setStorage } from '@/lib/storage';

/**
 * GET /api/files/:id/link — a SHOULD under Constitution Principle V, not a MUST
 * (the route mutates nothing in Vault's own database), taken on because it is
 * the one route whose entire job is handing out a link to file content
 * (spec.md Assumptions; research.md R-001).
 *
 * This is the first test in the project that calls a route module's exported
 * handler directly rather than the service function underneath it, because the
 * thing under test here — ownership scoping plus the storage-error mapping —
 * lives in the route itself (src/app/api/files/[id]/link/route.ts), not in a
 * separate service module.
 */

const currentSession = vi.hoisted(() => ({ value: null as { user?: { id: string } } | null }));

vi.mock('@/lib/auth/config', () => ({
  auth: async () => currentSession.value,
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const { GET } = await import('@/app/api/files/[id]/link/route');

function signInAs(id: number | null) {
  currentSession.value = id === null ? null : { user: { id: String(id) } };
}

interface LinkOk {
  url: string;
  expiresAt: string;
}
interface LinkErr {
  error: { code: string; message: string };
}

async function requestLink(id: number | string): Promise<{ status: number; body: LinkOk | LinkErr }> {
  const response = await GET(new Request(`http://localhost/api/files/${id}/link`), {
    params: Promise.resolve({ id: String(id) }),
  });
  return { status: response.status, body: (await response.json()) as LinkOk | LinkErr };
}

const STATUS_PREFIX = 'T LinkRoute Status';

let storage: FakeStorage;
let ownerId: number;
let otherUploaderId: number;
let adminId: number;
let fileId: number;
let filePath: { folder: string; name: string };

/** Leaves a clean slate even after a crashed previous run — same shape as transition.test.ts. */
async function clearPreviousRuns() {
  const leftovers = await db
    .select({ id: approvalStatuses.id })
    .from(approvalStatuses)
    .where(like(approvalStatuses.name, `${STATUS_PREFIX} %`));

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
          await db.delete(files).where(eq(files.stageId, stage.id));
        }
        await db.delete(stages).where(eq(stages.missionId, mission.id));
      }
      await db.delete(missions).where(eq(missions.questId, quest.id));
    }
    await db.delete(quests).where(eq(quests.approvalStatusId, status.id));
    await db.delete(approvalStatuses).where(eq(approvalStatuses.id, status.id));
  }
}

beforeAll(async () => {
  await clearPreviousRuns();

  const stamp = Date.now();
  [ownerId, otherUploaderId, adminId] = await Promise.all([
    (async () => {
      const [row] = await db
        .insert(users)
        .values({
          email: `link-owner-${stamp}@vault.test`,
          name: 'Link Owner',
          passwordHash: await hashPassword('correct horse battery staple'),
          role: 'uploader',
        })
        .$returningId();
      return row!.id;
    })(),
    (async () => {
      const [row] = await db
        .insert(users)
        .values({
          email: `link-other-${stamp}@vault.test`,
          name: 'Link Other Uploader',
          passwordHash: await hashPassword('correct horse battery staple'),
          role: 'uploader',
        })
        .$returningId();
      return row!.id;
    })(),
    (async () => {
      const [row] = await db
        .insert(users)
        .values({
          email: `link-admin-${stamp}@vault.test`,
          name: 'Link Admin',
          passwordHash: await hashPassword('correct horse battery staple'),
          role: 'admin',
        })
        .$returningId();
      return row!.id;
    })(),
  ]);

  const [status] = await db
    .insert(approvalStatuses)
    .values({
      name: `${STATUS_PREFIX} ${stamp}`,
      dropboxPath: `/${STATUS_PREFIX} ${stamp}`,
      position: 100_000 + (stamp % 500_000),
    })
    .$returningId();
  const [quest] = await db
    .insert(quests)
    .values({ approvalStatusId: status!.id, name: 'Quest', dropboxPath: '/Quest' })
    .$returningId();
  const [mission] = await db
    .insert(missions)
    .values({ questId: quest!.id, name: 'Mission', dropboxPath: '/Mission' })
    .$returningId();
  const [stage] = await db
    .insert(stages)
    .values({ missionId: mission!.id, name: 'Stage' })
    .$returningId();

  filePath = { folder: `/${STATUS_PREFIX} ${stamp}/Quest/Mission`, name: 'Quest - Mission - Stage.mp4' };

  const [file] = await db
    .insert(files)
    .values({
      standardName: filePath.name,
      originalName: 'raw.mp4',
      extension: 'mp4',
      mimeType: 'video/mp4',
      sizeBytes: 2048,
      approvalStatusId: status!.id,
      questId: quest!.id,
      missionId: mission!.id,
      stageId: stage!.id,
      dropboxFolderPath: filePath.folder,
      dropboxFileId: 'fake-id-link-route',
      uploadedBy: ownerId,
      uploadedAt: new Date(),
    })
    .$returningId();
  fileId = file!.id;
});

afterAll(async () => {
  await clearPreviousRuns();
  setStorage(undefined);
});

beforeEach(() => {
  storage = createFakeStorage();
  storage.seedFile(filePath.folder, filePath.name, 2048);
  setStorage(storage);
});

describe('GET /api/files/:id/link', () => {
  it('refuses an anonymous caller with 401', async () => {
    signInAs(null);
    const { status, body } = await requestLink(fileId);
    expect(status).toBe(401);
    expect((body as LinkErr).error.code).toBe('unauthenticated');
  });

  it("returns a time-limited link for the file's own uploader", async () => {
    signInAs(ownerId);
    const { status, body } = await requestLink(fileId);
    expect(status).toBe(200);
    const ok = body as LinkOk;
    expect(ok.url).toContain(filePath.name);
    expect(new Date(ok.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('returns not_found when a different uploader requests someone else\'s file', async () => {
    signInAs(otherUploaderId);
    const { status, body } = await requestLink(fileId);
    expect(status).toBe(404);
    expect((body as LinkErr).error.code).toBe('not_found');
  });

  it('returns a time-limited link for an Admin requesting any file', async () => {
    signInAs(adminId);
    const { status } = await requestLink(fileId);
    expect(status).toBe(200);
  });

  it('returns not_found for an id that does not exist', async () => {
    signInAs(adminId);
    const { status, body } = await requestLink(fileId + 999_999);
    expect(status).toBe(404);
    expect((body as LinkErr).error.code).toBe('not_found');
  });

  it('returns storage_unavailable when Dropbox cannot be reached', async () => {
    signInAs(adminId);
    storage.failNext(1);
    const { status, body } = await requestLink(fileId);
    expect(status).toBe(502);
    expect((body as LinkErr).error.code).toBe('storage_unavailable');
  });

  it("returns not_found when the file record exists but Dropbox no longer has the object", async () => {
    // A DB row whose file the fake was never told to seed models a broken record.
    signInAs(adminId);
    storage = createFakeStorage(); // deliberately not seeded for this one test
    setStorage(storage);
    const { status, body } = await requestLink(fileId);
    expect(status).toBe(404);
    expect((body as LinkErr).error.code).toBe('not_found');
  });
});
