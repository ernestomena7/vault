import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/guards';
import { withErrorHandling } from '@/lib/http/errors';
import { authorizeUpload } from '@/lib/uploads/authorize';
import { authorizeUploadSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * POST /api/uploads/authorize
 *
 * Takes a shared taxonomy and an array of 1-20 file descriptions, and returns
 * one grant per file under a single credential.
 *
 * Metadata only. This route MUST NEVER accept a file body — however many files
 * a batch describes, none of their bytes come here. If it ever grows one,
 * Constitution Principle I has been violated and the whole hosting story breaks
 * with it. tests/integration/constitution.test.ts asserts this.
 *
 * A batch is authorized as a whole or refused as a whole: any conflict refuses
 * everything, before a single byte moves (FR-016).
 */
export const POST = withErrorHandling(async (request: Request) => {
  const user = await requireUser();
  const input = authorizeUploadSchema.parse(await request.json());
  const batch = await authorizeUpload(user.id, input);

  return NextResponse.json(
    {
      folderPath: batch.folderPath,
      uploadToken: batch.uploadToken,
      tokenExpiresAt: batch.tokenExpiresAt.toISOString(),
      chunkSizeBytes: batch.chunkSizeBytes,
      ...(batch.pathRoot ? { pathRoot: batch.pathRoot } : {}),
      files: batch.files.map((file) => ({
        clientRef: file.clientRef,
        uploadId: file.uploadId,
        standardName: file.standardName,
        dropboxSessionId: file.dropboxSessionId,
        commitPath: file.commitPath,
      })),
    },
    { status: 201 },
  );
});
