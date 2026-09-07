import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

/**
 * Vault database schema.
 *
 * No table stores file content (Constitution I, FR-018). Dropbox holds the
 * bytes; these tables hold facts about them.
 *
 * See specs/001-dropbox-upload-approval/data-model.md
 */

const id = () => bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey();
const fk = (name: string) => bigint(name, { mode: 'number', unsigned: true });

const timestamps = {
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => new Date()),
};

/** Lower-cased, trimmed name used to match taxonomy across Approval Statuses (FR-008). */
const nameNormalized = varchar('name_normalized', { length: 120 })
  .notNull()
  .generatedAlwaysAs(sql`(LOWER(TRIM(name)))`, { mode: 'stored' });

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const users = mysqlTable(
  'users',
  {
    id: id(),
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    /** scrypt, format: N$r$p$salt$hash. No native module (research.md R-005). */
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: mysqlEnum('role', ['admin', 'uploader']).notNull().default('uploader'),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('users_email_unique').on(t.email)],
);

// ---------------------------------------------------------------------------
// Taxonomy — a strict tree, duplicated under every Approval Status
// ---------------------------------------------------------------------------

export const approvalStatuses = mysqlTable(
  'approval_statuses',
  {
    id: id(),
    name: varchar('name', { length: 120 }).notNull(),
    /** Root folder, e.g. "/01 Pending". Governs routing — the URL never does. */
    dropboxPath: varchar('dropbox_path', { length: 700 }).notNull(),
    /** Human convenience link only. */
    dropboxUrl: varchar('dropbox_url', { length: 1000 }),
    /** Contiguous from 1. Defines the workflow order and thus legal transitions. */
    position: int('position', { unsigned: true }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('approval_statuses_name_unique').on(t.name),
    uniqueIndex('approval_statuses_position_unique').on(t.position),
  ],
);

export const quests = mysqlTable(
  'quests',
  {
    id: id(),
    approvalStatusId: fk('approval_status_id')
      .notNull()
      .references(() => approvalStatuses.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 120 }).notNull(),
    nameNormalized,
    dropboxPath: varchar('dropbox_path', { length: 700 }).notNull(),
    dropboxUrl: varchar('dropbox_url', { length: 1000 }),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('quests_parent_name_unique').on(t.approvalStatusId, t.nameNormalized),
    index('quests_parent_idx').on(t.approvalStatusId),
  ],
);

export const missions = mysqlTable(
  'missions',
  {
    id: id(),
    questId: fk('quest_id')
      .notNull()
      .references(() => quests.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 120 }).notNull(),
    nameNormalized,
    dropboxPath: varchar('dropbox_path', { length: 700 }).notNull(),
    dropboxUrl: varchar('dropbox_url', { length: 1000 }),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('missions_parent_name_unique').on(t.questId, t.nameNormalized),
    index('missions_parent_idx').on(t.questId),
  ],
);

/** Stage has no folder — it contributes to the file name only (FR-027). */
export const stages = mysqlTable(
  'stages',
  {
    id: id(),
    missionId: fk('mission_id')
      .notNull()
      .references(() => missions.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 120 }).notNull(),
    nameNormalized,
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('stages_parent_name_unique').on(t.missionId, t.nameNormalized),
    index('stages_parent_idx').on(t.missionId),
  ],
);

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

/**
 * What the server authorized, for an upload it will never witness.
 *
 * The browser sends the bytes to Dropbox directly, so confirm must verify
 * against the server's own recorded intent rather than the client's claim.
 * Without this table the enforced naming convention would be advisory.
 */
export const pendingUploads = mysqlTable(
  'pending_uploads',
  {
    /** ULID, handed to the client as the upload handle. */
    id: varchar('id', { length: 26 }).primaryKey(),
    userId: fk('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    approvalStatusId: fk('approval_status_id')
      .notNull()
      .references(() => approvalStatuses.id, { onDelete: 'restrict' }),
    questId: fk('quest_id')
      .notNull()
      .references(() => quests.id, { onDelete: 'restrict' }),
    missionId: fk('mission_id')
      .notNull()
      .references(() => missions.id, { onDelete: 'restrict' }),
    stageId: fk('stage_id')
      .notNull()
      .references(() => stages.id, { onDelete: 'restrict' }),
    /** Computed server-side. The client cannot influence it. */
    standardName: varchar('standard_name', { length: 400 }).notNull(),
    dropboxFolderPath: varchar('dropbox_folder_path', { length: 700 }).notNull(),
    originalName: varchar('original_name', { length: 400 }).notNull(),
    /**
     * As typed by the uploader, trimmed. Carried through authorization so
     * confirm verifies against what the SERVER authorized rather than what the
     * client re-sends.
     */
    distinguishingText: varchar('distinguishing_text', { length: 80 }),
    /** As reported by the client; verified against Dropbox at confirm. */
    declaredSizeBytes: bigint('declared_size_bytes', { mode: 'number', unsigned: true }).notNull(),
    mimeType: varchar('mime_type', { length: 150 }).notNull(),
    dropboxSessionId: varchar('dropbox_session_id', { length: 255 }),
    state: mysqlEnum('state', ['authorized', 'completed', 'failed', 'expired'])
      .notNull()
      .default('authorized'),
    expiresAt: datetime('expires_at', { mode: 'date', fsp: 3 }).notNull(),
    ...timestamps,
  },
  (t) => [
    index('pending_uploads_user_idx').on(t.userId),
    index('pending_uploads_state_expires_idx').on(t.state, t.expiresAt),
  ],
);

export const files = mysqlTable(
  'files',
  {
    id: id(),
    /** [Quest] - [Mission] - [Stage].[ext] — FR-012. */
    standardName: varchar('standard_name', { length: 400 }).notNull(),
    originalName: varchar('original_name', { length: 400 }).notNull(),
    /**
     * The fourth name part, when one was given. NULL for a three-part name —
     * which is what every file uploaded before this feature has, and why they
     * all stay valid (FR-002).
     */
    distinguishingText: varchar('distinguishing_text', { length: 80 }),
    /**
     * TRUE when this file landed as part of a batch that did not fully succeed
     * (FR-027). Deliberately NOT accompanied by a batch identifier: the
     * grouping is not stored (FR-033), so a marked file can say that its set
     * was unfinished but not which siblings were missing.
     */
    incompleteSet: boolean('incomplete_set').notNull().default(false),
    extension: varchar('extension', { length: 20 }).notNull(),
    mimeType: varchar('mime_type', { length: 150 }).notNull(),
    /** As verified with Dropbox, never as declared by the client. */
    sizeBytes: bigint('size_bytes', { mode: 'number', unsigned: true }).notNull(),

    approvalStatusId: fk('approval_status_id')
      .notNull()
      .references(() => approvalStatuses.id, { onDelete: 'restrict' }),
    /** Repointed to the counterpart entries on every transition (FR-036). */
    questId: fk('quest_id')
      .notNull()
      .references(() => quests.id, { onDelete: 'restrict' }),
    missionId: fk('mission_id')
      .notNull()
      .references(() => missions.id, { onDelete: 'restrict' }),
    stageId: fk('stage_id')
      .notNull()
      .references(() => stages.id, { onDelete: 'restrict' }),

    dropboxFolderPath: varchar('dropbox_folder_path', { length: 700 }).notNull(),
    /** Dropbox's stable id — survives moves. */
    dropboxFileId: varchar('dropbox_file_id', { length: 255 }).notNull(),
    dropboxUrl: varchar('dropbox_url', { length: 1000 }),

    uploadedBy: fk('uploaded_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    uploadedAt: datetime('uploaded_at', { mode: 'date', fsp: 3 }).notNull(),
    /** 'broken' when the object is missing at its recorded path (FR-042). */
    integrityState: mysqlEnum('integrity_state', ['valid', 'broken']).notNull().default('valid'),
    ...timestamps,
  },
  (t) => [
    /**
     * FR-016 enforced in the database. Because the name is derived from Quest,
     * Mission and Stage, this is "one file per taxonomy combination per status,
     * per extension". Files placed in Dropbox outside Vault can still occupy a
     * name, so the upload path also queries Dropbox.
     */
    uniqueIndex('files_destination_name_unique').on(
      t.approvalStatusId,
      t.questId,
      t.missionId,
      t.standardName,
    ),
    index('files_queue_idx').on(t.approvalStatusId, t.uploadedAt),
    index('files_uploader_idx').on(t.uploadedBy, t.uploadedAt),
    index('files_dropbox_file_idx').on(t.dropboxFileId),
  ],
);

/**
 * Append-only audit of every status change (Constitution II, FR-040).
 * No application code updates or deletes rows here.
 */
export const fileTransitions = mysqlTable(
  'file_transitions',
  {
    id: id(),
    fileId: fk('file_id')
      .notNull()
      .references(() => files.id, { onDelete: 'restrict' }),
    /** NULL for the initial placement at upload. */
    fromStatusId: fk('from_status_id').references(() => approvalStatuses.id, {
      onDelete: 'restrict',
    }),
    toStatusId: fk('to_status_id')
      .notNull()
      .references(() => approvalStatuses.id, { onDelete: 'restrict' }),
    actorId: fk('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    outcome: mysqlEnum('outcome', ['succeeded', 'failed']).notNull(),
    detail: varchar('detail', { length: 500 }),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('file_transitions_file_idx').on(t.fileId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ApprovalStatus = typeof approvalStatuses.$inferSelect;
export type Quest = typeof quests.$inferSelect;
export type Mission = typeof missions.$inferSelect;
export type Stage = typeof stages.$inferSelect;
export type PendingUpload = typeof pendingUploads.$inferSelect;
export type FileRecord = typeof files.$inferSelect;
export type FileTransition = typeof fileTransitions.$inferSelect;
export type Role = User['role'];
