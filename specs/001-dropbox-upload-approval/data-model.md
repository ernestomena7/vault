# Data Model: Vault

**Date**: 2026-09-02 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

MySQL 8, InnoDB, `utf8mb4_0900_ai_ci`. All identifiers `BIGINT UNSIGNED AUTO_INCREMENT` unless noted.
Timestamps are `DATETIME(3)` in UTC. **No table stores file content** (Constitution I, FR-018).

## Entity overview

```text
users ──────────────< files >────────── stages
                        │                  │
approval_statuses ──< quests ──< missions ─┘
       │                │           │
       └────────────────┴───────────┴──< files (status, quest, mission refs)

files ──< file_transitions >── users (actor)
users ──< pending_uploads
users ──< sessions
```

The taxonomy is a strict tree, duplicated under every Approval Status by explicit decision
(spec Assumptions): `approval_statuses → quests → missions → stages`.

---

## `users`

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `email` | VARCHAR(255) | **UNIQUE**, stored lower-cased |
| `name` | VARCHAR(120) | Display name |
| `password_hash` | VARBINARY(255) | scrypt: `N$r$p$salt$hash`, see [research.md R-005](./research.md) |
| `role` | ENUM('admin','uploader') | FR-002 |
| `is_active` | BOOLEAN | Default `TRUE`. Inactive cannot sign in; records stay attributed |
| `created_at`, `updated_at` | DATETIME(3) | |

**Rules**

- FR-005: the last active `admin` cannot be deactivated, deleted, or demoted. Enforced in a
  transaction that counts remaining active admins `FOR UPDATE` before committing the change.
- Deletion is refused where `files.uploaded_by` or `file_transitions.actor_id` reference the user;
  deactivate instead (spec Assumptions).

## `sessions`

Auth.js database sessions — chosen so a role change or deactivation takes effect on the next request
rather than at token expiry (US5 scenario 2).

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `session_token` | VARCHAR(255) | **UNIQUE** |
| `user_id` | BIGINT UNSIGNED FK → `users.id` | `ON DELETE CASCADE` |
| `expires_at` | DATETIME(3) | Indexed for sweep |

---

## `approval_statuses`

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `name` | VARCHAR(120) | **UNIQUE** |
| `dropbox_path` | VARCHAR(700) | Root folder, e.g. `/01 Pending`. Leading slash, no trailing slash |
| `dropbox_url` | VARCHAR(1000) | Human convenience link only — never used for routing |
| `position` | INT UNSIGNED | **UNIQUE**, contiguous from 1. Defines the workflow order |
| `is_active` | BOOLEAN | Inactive disappears from upload menus, keeps existing records |
| `created_at`, `updated_at` | DATETIME(3) | |

**Rules**

- FR-024: `position` stays contiguous and unique. Reordering rewrites affected rows in one
  transaction (defer the unique check or shift via a temporary offset).
- FR-013: `dropbox_path` governs routing; `dropbox_url` never does (spec Assumptions).
- FR-022: paths and names are validated against Dropbox's forbidden characters at write time, not at
  upload time.

## `quests`

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `approval_status_id` | BIGINT UNSIGNED FK → `approval_statuses.id` | `ON DELETE RESTRICT` |
| `name` | VARCHAR(120) | |
| `name_normalized` | VARCHAR(120) GENERATED ALWAYS AS (`LOWER(TRIM(name))`) STORED | FR-008 |
| `dropbox_path` | VARCHAR(700) | Folder segment beneath the status |
| `dropbox_url` | VARCHAR(1000) | |
| `is_active` | BOOLEAN | |

**Unique**: `(approval_status_id, name_normalized)` — prevents near-duplicate siblings and makes
counterpart lookup an indexed equality match.

## `missions`

Identical shape, parented to `quests`.

**Unique**: `(quest_id, name_normalized)`. FK `ON DELETE RESTRICT`.

## `stages`

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `mission_id` | BIGINT UNSIGNED FK → `missions.id` | `ON DELETE RESTRICT` |
| `name` | VARCHAR(120) | |
| `name_normalized` | generated, stored | |
| `is_active` | BOOLEAN | |

**Unique**: `(mission_id, name_normalized)`. Stage has **no folder** — it contributes to the file
name only (FR-027, spec Assumptions).

---

## `pending_uploads`

The server authorizes an upload it will never witness. This table is the record of what it
authorized, so the confirm step verifies against the server's own intent rather than the browser's
claim. See Complexity Tracking in [plan.md](./plan.md).

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(26) PK | ULID, handed to the client as the upload handle |
| `user_id` | BIGINT UNSIGNED FK → `users.id` | Who was authorized |
| `approval_status_id`, `quest_id`, `mission_id`, `stage_id` | FK | The validated chain |
| `standard_name` | VARCHAR(400) | Computed server-side; the client cannot influence it |
| `dropbox_folder_path` | VARCHAR(700) | Computed server-side |
| `original_name` | VARCHAR(400) | As reported, for the record only |
| `declared_size_bytes` | BIGINT UNSIGNED | As reported; verified against Dropbox at confirm |
| `mime_type` | VARCHAR(150) | |
| `dropbox_session_id` | VARCHAR(255) NULL | From `upload_session/start` |
| `state` | ENUM('authorized','completed','failed','expired') | |
| `expires_at` | DATETIME(3) | Authorization window; expired rows are swept |
| `created_at`, `updated_at` | DATETIME(3) | |

**Rules**

- Confirm accepts only a row in `authorized` state belonging to the calling user.
- The server calls Dropbox for metadata at `dropbox_folder_path/standard_name` and requires the file
  to exist with a matching size before creating the `files` row. A mismatch marks the row `failed`
  and creates nothing (FR-020).
- Rows are swept after expiry; a swept row never becomes a file.

## `files`

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `standard_name` | VARCHAR(400) | `[Quest] - [Mission] - [Stage].[ext]` (FR-012) |
| `original_name` | VARCHAR(400) | |
| `extension` | VARCHAR(20) | |
| `mime_type` | VARCHAR(150) | |
| `size_bytes` | BIGINT UNSIGNED | As verified with Dropbox, not as declared |
| `approval_status_id` | FK → `approval_statuses.id` | Current status |
| `quest_id`, `mission_id`, `stage_id` | FK | Current taxonomy refs — **repointed on transition** to the counterparts under the new status |
| `dropbox_folder_path` | VARCHAR(700) | Current folder |
| `dropbox_file_id` | VARCHAR(255) | Dropbox's stable id; survives moves |
| `dropbox_url` | VARCHAR(1000) NULL | Convenience link |
| `uploaded_by` | FK → `users.id` | `ON DELETE RESTRICT` |
| `uploaded_at` | DATETIME(3) | |
| `integrity_state` | ENUM('valid','broken') | `broken` when the object is missing at its recorded path (FR-042) |
| `created_at`, `updated_at` | DATETIME(3) | |

**Unique**: `(approval_status_id, quest_id, mission_id, standard_name)` — the database-level
enforcement of FR-016. Because the name is derived from Quest, Mission, and Stage, this is exactly
"one file per taxonomy combination per status, per extension".

**Indexes**: `(approval_status_id, uploaded_at)` for the admin queue; `(uploaded_by, uploaded_at)`
for the uploader's own list; `dropbox_file_id`.

**Note**: the unique index catches collisions between Vault-managed files. A file placed in Dropbox
*outside* Vault can still occupy the name, so the pre-upload check also queries Dropbox
(FR-016, FR-039).

## `file_transitions`

Append-only. No `UPDATE` or `DELETE` path exists in application code (Constitution II, FR-040).

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `file_id` | FK → `files.id` | `ON DELETE RESTRICT` |
| `from_status_id` | FK → `approval_statuses.id` NULL | NULL for the initial placement |
| `to_status_id` | FK → `approval_statuses.id` | |
| `actor_id` | FK → `users.id` | `ON DELETE RESTRICT` |
| `outcome` | ENUM('succeeded','failed') | Failed attempts are recorded too |
| `detail` | VARCHAR(500) NULL | Failure reason when `outcome = 'failed'` |
| `created_at` | DATETIME(3) | Indexed with `file_id` |

---

## State transitions

### File approval state

Legality is **derived** from `approval_statuses.position`, never stored (FR-034,
[research.md R-006](./research.md)):

```text
allowed(file) = { s : s.position == current.position + 1 }   # one step forward
              ∪ { s : s.position <  current.position }        # any step backward
```

Reordering statuses therefore changes what is legal immediately, with no data migration.

**Transition procedure** — one database transaction wrapping ordered storage calls:

1. `SELECT … FOR UPDATE` the file row; abort if its status no longer matches what the caller saw
   (FR-041).
2. Verify the target is in `allowed(file)`; otherwise refuse with the permitted set (FR-034/FR-035).
3. Resolve the counterpart Quest and Mission under the target status by `name_normalized`; create the
   missing taxonomy rows (FR-036).
4. Create the missing Dropbox folders; an already-existing folder counts as success.
5. Verify no different file occupies the destination name; refuse if one does (FR-039).
6. Move the file in Dropbox, keeping `standard_name` unchanged (FR-037).
7. **Only now** update `files.approval_status_id`, the taxonomy refs, and `dropbox_folder_path`, and
   insert the `file_transitions` row (FR-038).

A failure at steps 4–6 rolls the transaction back, leaves the file on its previous status, and
records a `failed` transition. Folders created before a failed move are left in place — harmless, and
removing them could delete a folder another file needs.

### Pending upload state

```text
authorized ──> completed   (Dropbox metadata verified; files row created)
           ──> failed      (verification failed, or the client reported failure)
           ──> expired     (window elapsed; swept)
```

## Validation rules summary

| Rule | Source | Enforced by |
|---|---|---|
| All four selections present, chain valid | FR-010, FR-011 | Zod at the route + FK checks |
| Standard name is server-computed and unowned by the client | FR-012 | `pending_uploads.standard_name` |
| Path built from stored `dropbox_path` values | FR-013 | `lib/naming` |
| Duplicate name refused | FR-016 | Unique index + pre-upload Dropbox check |
| Accepted file types only | FR-021 | Zod on the authorize payload |
| Taxonomy names valid as Dropbox segments | FR-022 | Validation at taxonomy write |
| In-use taxonomy cannot be deleted | FR-029 | FK `ON DELETE RESTRICT` + a pre-check giving a readable message |
| Positions contiguous and unique | FR-024 | Unique index + transactional reorder |
| Transition legality | FR-034 | `lib/workflow`, server-side only |
| Audit entries immutable | FR-040 | Insert-only access layer; no update/delete query exists |
