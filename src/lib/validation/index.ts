import { z } from 'zod';
import { MAX_DISTINGUISHING_TEXT_LENGTH } from '@/lib/naming';

/**
 * Boundary schemas. Every route validates its input here before anything else
 * runs (Constitution V) — a request body is never trusted as typed.
 *
 * See specs/001-dropbox-upload-approval/contracts/api.md
 */

export const idSchema = z.coerce.number().int().positive();

/**
 * Accepted upload types. Vault takes video only (FR-021); anything else is
 * refused with the accepted list in the message.
 */
export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
  'video/mpeg',
  'video/x-ms-wmv',
] as const;

export const ACCEPTED_EXTENSIONS = [
  'mp4',
  'mov',
  'avi',
  'mkv',
  'webm',
  'mpeg',
  'mpg',
  'wmv',
] as const;

/** A display name for a taxonomy entry. Segment legality is checked separately. */
const displayName = z
  .string()
  .trim()
  .min(1, 'A name is required')
  .max(120, 'A name cannot exceed 120 characters');

const folderPath = z
  .string()
  .trim()
  .min(1, 'A Dropbox folder path is required')
  .max(700, 'A folder path cannot exceed 700 characters');

const folderUrl = z.union([z.url('Enter a valid Dropbox URL'), z.literal('')]).optional();

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const credentialsSchema = z.object({
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Enter your password'),
});

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/**
 * Maximum files in one batch.
 *
 * Enough for a realistic set of related videos; small enough that mistakenly
 * selecting a whole folder is caught rather than started.
 */
export const MAX_BATCH_FILES = 20;

/**
 * The fourth name part. Optional — a file without one keeps feature 001's exact
 * three-part name (FR-002). Capped well below the assembled-name limit so four
 * parts cannot approach it.
 */
export const distinguishingTextSchema = z
  .string()
  .trim()
  .max(
    MAX_DISTINGUISHING_TEXT_LENGTH,
    `Keep it under ${MAX_DISTINGUISHING_TEXT_LENGTH} characters`,
  )
  .optional();

/** One file's description within a batch. Metadata only — never content. */
export const batchFileSchema = z.object({
  /**
   * Opaque, chosen by the client so it can match a grant back to the file it
   * holds in memory. The server stores it nowhere and derives nothing from it.
   */
  clientRef: z.string().trim().min(1).max(64),
  stageId: idSchema,
  distinguishingText: distinguishingTextSchema,
  originalName: z
    .string()
    .trim()
    .min(1, 'The file name is required')
    .max(400, 'The file name is too long'),
  sizeBytes: z
    .number()
    .int()
    .positive('The file appears to be empty')
    .max(350 * 1024 * 1024 * 1024, 'That file exceeds the maximum Dropbox accepts'),
  mimeType: z.string().trim().min(1, 'The file type is required').max(150),
});

/**
 * Note what this schema does NOT accept: file content. Upload authorization
 * carries metadata only, however many files it describes, and the bytes go
 * browser → Dropbox (Constitution I).
 *
 * The taxonomy is given ONCE and applies to every file; the stage and the
 * distinguishing text are per file (FR-008, FR-009).
 */
export const authorizeUploadSchema = z.object({
  approvalStatusId: idSchema,
  questId: idSchema,
  missionId: idSchema,
  files: z
    .array(batchFileSchema)
    .min(1, 'Add at least one file')
    .max(MAX_BATCH_FILES, `A batch can hold at most ${MAX_BATCH_FILES} files`),
});

export const confirmUploadSchema = z.object({
  uploadId: z.string().trim().length(26, 'That upload reference is not valid'),
  clientOutcome: z.enum(['succeeded', 'failed']),
});

// ---------------------------------------------------------------------------
// Files and transitions
// ---------------------------------------------------------------------------

/**
 * Applies or clears the incomplete-set mark after a batch finishes.
 *
 * The server cannot verify that a batch failed — it never witnesses a transfer
 * (Constitution I) — so it takes the client's word. The worst a dishonest
 * client achieves is a wrong badge in a list, not a wrong file.
 */
export const finalizeBatchSchema = z.object({
  fileIds: z.array(idSchema).min(1).max(MAX_BATCH_FILES),
  complete: z.boolean(),
});

export const fileListQuerySchema = z.object({
  status: idSchema.optional(),
  questId: idSchema.optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const transitionSchema = z.object({
  toApprovalStatusId: idSchema,
  /** Mandatory: this is how a concurrent change is detected (FR-041). */
  expectedCurrentStatusId: idSchema,
});

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

export const approvalStatusCreateSchema = z.object({
  name: displayName,
  dropboxPath: folderPath,
  dropboxUrl: folderUrl,
});

export const approvalStatusUpdateSchema = approvalStatusCreateSchema
  .partial()
  .extend({ isActive: z.boolean().optional() });

export const reorderSchema = z.object({
  orderedIds: z.array(idSchema).min(1, 'Provide the statuses in their new order'),
});

export const questCreateSchema = z.object({
  approvalStatusId: idSchema,
  name: displayName,
  dropboxPath: folderPath,
  dropboxUrl: folderUrl,
});

export const questUpdateSchema = questCreateSchema
  .omit({ approvalStatusId: true })
  .partial()
  .extend({ isActive: z.boolean().optional() });

export const missionCreateSchema = z.object({
  questId: idSchema,
  name: displayName,
  dropboxPath: folderPath,
  dropboxUrl: folderUrl,
});

export const missionUpdateSchema = missionCreateSchema
  .omit({ questId: true })
  .partial()
  .extend({ isActive: z.boolean().optional() });

/** Stage has a name only — it contributes to the file name, not to a folder. */
export const stageCreateSchema = z.object({
  missionId: idSchema,
  name: displayName,
});

export const stageUpdateSchema = z
  .object({ name: displayName.optional(), isActive: z.boolean().optional() })
  .refine((value) => value.name !== undefined || value.isActive !== undefined, {
    message: 'Provide something to change',
  });

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const roleSchema = z.enum(['admin', 'uploader']);

export const userCreateSchema = z.object({
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  name: displayName,
  role: roleSchema,
  password: z
    .string()
    .min(12, 'Use at least 12 characters')
    .max(200, 'That password is too long'),
});

export const userUpdateSchema = z
  .object({
    name: displayName.optional(),
    role: roleSchema.optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(12, 'Use at least 12 characters').max(200).optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: 'Provide something to change',
  });

export type AuthorizeUploadInput = z.infer<typeof authorizeUploadSchema>;
export type BatchFileInput = z.infer<typeof batchFileSchema>;
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
export type TransitionInput = z.infer<typeof transitionSchema>;
export type FileListQuery = z.infer<typeof fileListQuerySchema>;
