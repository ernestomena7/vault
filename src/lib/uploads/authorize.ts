import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { files, pendingUploads } from '@/lib/db/schema';
import { resolveChain, type ResolvedChain } from '@/lib/db/queries/taxonomy';
import {
  assertPathWithinLimit,
  buildFolderPath,
  buildStandardName,
  conflictKey,
  extractExtension,
  joinPath,
} from '@/lib/naming';
import { getStorage } from '@/lib/storage';
import { InvalidPathError } from '@/lib/storage/port';
import { ApiError } from '@/lib/http/errors';
import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_VIDEO_TYPES,
  type AuthorizeUploadInput,
  type BatchFileInput,
} from '@/lib/validation';
import { ulid } from './ulid';

/**
 * Authorizing a batch of uploads the server will never witness.
 *
 * The browser sends every byte straight to Dropbox (Constitution I), so this is
 * where all the deciding happens: what each file will be called, where it will
 * go, and whether it is allowed to go there. The `pending_uploads` rows are the
 * server's memory of those decisions, and confirm checks reality against them
 * rather than against anything the client later says.
 *
 * The batch is validated as a whole and refused as a whole. Authorizing files
 * one at a time would let three land before the fourth revealed a collision —
 * after multi-gigabyte transfers, that is the difference between a usable
 * feature and an infuriating one (FR-016, SC-005).
 */

/** How long an authorization stays usable before it is swept. */
const AUTHORIZATION_TTL_MS = 6 * 60 * 60 * 1000;

export interface AuthorizedFile {
  clientRef: string;
  uploadId: string;
  standardName: string;
  dropboxSessionId: string;
  commitPath: string;
}

export interface AuthorizedBatch {
  folderPath: string;
  uploadToken: string;
  tokenExpiresAt: Date;
  chunkSizeBytes: number;
  pathRoot?: string;
  files: AuthorizedFile[];
}

function assertAcceptedType(file: BatchFileInput): void {
  const extension = extractExtension(file.originalName);
  const byMime = (ACCEPTED_VIDEO_TYPES as readonly string[]).includes(file.mimeType.toLowerCase());
  const byExtension = (ACCEPTED_EXTENSIONS as readonly string[]).includes(extension);

  // Either signal is enough: browsers report inconsistent MIME types for some
  // container formats, and refusing a legitimate .mov on that basis would be a
  // false negative the uploader cannot fix.
  if (!byMime && !byExtension) {
    throw new ApiError(
      'unsupported_file_type',
      `Vault accepts video files only (${ACCEPTED_EXTENSIONS.join(', ')}). "${file.originalName}" is not one.`,
      { clientRef: file.clientRef },
    );
  }
}

/** Every file's stage must hang off the ONE mission the batch shares. */
async function resolveChains(input: AuthorizeUploadInput): Promise<Map<string, ResolvedChain>> {
  const chains = new Map<string, ResolvedChain>();

  for (const file of input.files) {
    const chain = await resolveChain({
      approvalStatusId: input.approvalStatusId,
      questId: input.questId,
      missionId: input.missionId,
      stageId: file.stageId,
    });
    chains.set(file.clientRef, chain);
  }

  return chains;
}

interface PlannedFile {
  input: BatchFileInput;
  chain: ResolvedChain;
  standardName: string;
  commitPath: string;
}

export async function authorizeUpload(
  userId: number,
  input: AuthorizeUploadInput,
): Promise<AuthorizedBatch> {
  // 1. Types, before anything costly.
  for (const file of input.files) assertAcceptedType(file);

  // 2. The chain must be real, active and internally consistent (FR-011,
  //    FR-018). Resolved per stage, but always against the same shared
  //    status/quest/mission, so a client cannot mix branches.
  const chains = await resolveChains(input);
  const anyChain = chains.values().next().value!;

  const folderPath = buildFolderPath({
    statusPath: anyChain.status.dropboxPath,
    questPath: anyChain.quest.dropboxPath,
    missionPath: anyChain.mission.dropboxPath,
  });

  // 3. Names and paths, computed here. The client supplied a distinguishing
  //    text as a value; it never supplied a name (FR-003, FR-012).
  const planned: PlannedFile[] = input.files.map((file) => {
    const chain = chains.get(file.clientRef)!;

    try {
      const standardName = buildStandardName({
        quest: chain.quest.name,
        mission: chain.mission.name,
        stage: chain.stage.name,
        originalName: file.originalName,
        distinguishingText: file.distinguishingText,
      });

      const commitPath = joinPath(folderPath, standardName);
      // The limit that actually binds is the full path, checked here so an
      // over-long one is refused now rather than after the transfer.
      assertPathWithinLimit(commitPath, standardName);

      return { input: file, chain, standardName, commitPath };
    } catch (error) {
      // Say WHICH file. A naming error carries only the offending text, and in
      // a twenty-file batch that leaves the uploader hunting for the row.
      if (error instanceof InvalidPathError) {
        throw new ApiError(
          'invalid_folder_segment',
          `"${file.originalName}" cannot be named: ${error.message.replace(/^Invalid path segment "[^"]*": /, '')}`,
          { clientRef: file.clientRef, conflicts: [file.clientRef] },
        );
      }
      throw error;
    }
  });

  // 4. No two files in this batch may collide (FR-016).
  assertNoInternalCollision(planned);

  // 5. Nothing may already hold one of these names — checked in the database
  //    and in storage, because the two can disagree: the database knows Vault's
  //    files, storage knows the ones somebody dropped in by hand (FR-017).
  await assertNoExistingCollision(planned, anyChain, folderPath);

  // Every check has passed. Only now is anything created.
  const storage = await getStorage();
  await storage.ensureFolder(folderPath);

  const grant = await storage.beginUploads(
    planned.map((file) => ({
      folderPath,
      fileName: file.standardName,
      sizeBytes: file.input.sizeBytes,
    })),
  );

  const expiresAt = new Date(Date.now() + AUTHORIZATION_TTL_MS);

  const authorized: AuthorizedFile[] = planned.map((file, index) => ({
    clientRef: file.input.clientRef,
    uploadId: ulid(),
    standardName: file.standardName,
    dropboxSessionId: grant.sessions[index]!.sessionId,
    commitPath: grant.sessions[index]!.commitPath,
  }));

  await db.insert(pendingUploads).values(
    planned.map((file, index) => ({
      id: authorized[index]!.uploadId,
      userId,
      approvalStatusId: file.chain.status.id,
      questId: file.chain.quest.id,
      missionId: file.chain.mission.id,
      stageId: file.chain.stage.id,
      standardName: file.standardName,
      dropboxFolderPath: folderPath,
      originalName: file.input.originalName,
      distinguishingText: file.input.distinguishingText?.trim() || null,
      declaredSizeBytes: file.input.sizeBytes,
      mimeType: file.input.mimeType,
      dropboxSessionId: authorized[index]!.dropboxSessionId,
      state: 'authorized' as const,
      expiresAt,
    })),
  );

  return {
    folderPath,
    uploadToken: grant.token,
    tokenExpiresAt: grant.tokenExpiresAt,
    chunkSizeBytes: grant.chunkSizeBytes,
    ...(grant.pathRoot ? { pathRoot: grant.pathRoot } : {}),
    files: authorized,
  };
}

/**
 * Two files in one batch that would produce the same name.
 *
 * Because a batch shares its status, quest and mission, the stage and the
 * distinguishing text are the only things keeping names apart — which is why
 * this check exists and why its message points at the text.
 */
function assertNoInternalCollision(planned: PlannedFile[]): void {
  const seen = new Map<string, PlannedFile>();

  for (const file of planned) {
    const key = conflictKey({
      stageId: file.input.stageId,
      distinguishingText: file.input.distinguishingText,
      originalName: file.input.originalName,
    });

    const previous = seen.get(key);
    if (previous) {
      throw new ApiError(
        'duplicate_name',
        `Two files would both be named "${file.standardName}". Give them different distinguishing texts to tell them apart.`,
        {
          standardName: file.standardName,
          conflicts: [previous.input.clientRef, file.input.clientRef],
        },
      );
    }
    seen.set(key, file);
  }
}

/** A name already taken, in Vault's records or in storage itself. */
async function assertNoExistingCollision(
  planned: PlannedFile[],
  chain: ResolvedChain,
  folderPath: string,
): Promise<void> {
  const names = planned.map((file) => file.standardName);

  // One query for the whole batch rather than one per file.
  const recorded = await db
    .select({ id: files.id, standardName: files.standardName })
    .from(files)
    .where(
      and(
        eq(files.approvalStatusId, chain.status.id),
        eq(files.questId, chain.quest.id),
        eq(files.missionId, chain.mission.id),
        inArray(files.standardName, names),
      ),
    );

  const existing = recorded[0];
  if (existing) {
    const clash = planned.find((file) => file.standardName === existing.standardName);
    throw new ApiError(
      'duplicate_name',
      `A file named "${existing.standardName}" is already in that folder. Give this one a different distinguishing text, or remove the existing file first.`,
      {
        standardName: existing.standardName,
        conflictingFileId: existing.id,
        ...(clash ? { conflicts: [clash.input.clientRef] } : {}),
      },
    );
  }

  // Parallel, not sequential: twenty probes at provider latency would consume
  // most of the five-second budget on their own (research.md R-002).
  const storage = await getStorage();
  const probes = await Promise.all(
    planned.map(async (file) => ({
      file,
      probe: await storage.fileExists(folderPath, file.standardName),
    })),
  );

  const occupied = probes.find((entry) => entry.probe.exists);
  if (occupied) {
    throw new ApiError(
      'duplicate_name',
      `A file named "${occupied.file.standardName}" already exists in that Dropbox folder. Nothing was uploaded.`,
      {
        standardName: occupied.file.standardName,
        folderPath,
        conflicts: [occupied.file.input.clientRef],
      },
    );
  }
}
