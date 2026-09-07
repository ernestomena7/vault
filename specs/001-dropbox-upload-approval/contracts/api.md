# API Contract: Vault HTTP Routes

**Date**: 2026-09-02 | **Plan**: [../plan.md](../plan.md) | **Data model**: [../data-model.md](../data-model.md)

Every route is authenticated. Authorization is enforced server-side on each route regardless of what
the interface shows (FR-003). Request and response bodies are validated with Zod at the boundary
(Constitution V).

**No route accepts a file body.** This is the contract-level expression of Constitution Principle I —
if a route ever grows a multipart or binary body, the principle has been violated.

## Conventions

- Bodies are JSON. All responses carry `Content-Type: application/json`.
- Errors: `{ "error": { "code": "<machine_code>", "message": "<English, user-facing>" } }`.
- Standard codes: `401` unauthenticated, `403` wrong role, `404` absent or not visible to the caller,
  `409` conflict (name collision, concurrent change), `422` validation failure, `502` storage
  provider failure.
- Roles: **U** = Uploader, **A** = Admin. `A` implies access to everything `U` has.

---

## Authentication

### `POST /api/auth/callback/credentials` — sign in (Auth.js)

| | |
|---|---|
| Access | Public |
| Body | `{ email, password }` |
| Success | Sets the session cookie; redirects to the role's landing screen |
| Failure | `401` with a message that does not reveal whether the account exists (US1 scenario 4) |

Inactive accounts are refused identically to wrong credentials.

### `POST /api/auth/signout` — sign out

Access: U, A. Invalidates the `sessions` row.

---

## Upload

The two-step shape exists because the server authorizes a transfer it never sees. Between the two
calls, the **browser** talks to Dropbox directly.

### `POST /api/uploads/authorize`

| | |
|---|---|
| Access | U, A |
| Purpose | Validate the selection, compute name and destination, reserve them, and issue upload credentials |

**Request**

```json
{
  "approvalStatusId": 1,
  "questId": 4,
  "missionId": 9,
  "stageId": 22,
  "originalName": "final_cut_v3.mp4",
  "sizeBytes": 734003200,
  "mimeType": "video/mp4"
}
```

**Server performs, in order**

1. Authenticate; reject anonymous callers.
2. Validate the taxonomy chain: the Stage belongs to the Mission, to the Quest, to the Status, and
   all are active (FR-010, FR-011).
3. Reject unaccepted file types (FR-021).
4. Compute `standardName` = `[Quest] - [Mission] - [Stage].[ext]` and `folderPath` =
   `/[status.dropbox_path]/[quest.dropbox_path]/[mission.dropbox_path]` (FR-012, FR-013).
5. Refuse if that name already exists — in `files`, or in Dropbox itself (FR-016) → `409`.
6. Create the destination folders if absent (FR-014).
7. Insert a `pending_uploads` row and start a Dropbox upload session.
8. Mint a Dropbox access token **reduced to `files.content.write`** ([research.md R-002](../research.md)).

**Response `201`**

```json
{
  "uploadId": "01JQ8Z...",
  "standardName": "Onboarding - Welcome - Rough cut.mp4",
  "folderPath": "/01 Pending/Onboarding/Welcome",
  "dropboxSessionId": "AAAAAA...",
  "uploadToken": "sl.B4x...",
  "tokenExpiresAt": "2026-09-02T18:22:00Z",
  "chunkSizeBytes": 8388608
}
```

**Errors**: `409 duplicate_name` (with the conflicting file's name), `422 invalid_taxonomy_chain`,
`422 unsupported_file_type`, `502 storage_unavailable`.

### *(browser → Dropbox, not a Vault route)*

The browser calls `upload_session/append_v2` per chunk and `upload_session/finish` with the exact
`folderPath` and `standardName` it was given. Vault is not in this path and sees none of the bytes.

### `POST /api/uploads/confirm`

| | |
|---|---|
| Access | U, A — and only the user who was authorized |
| Purpose | Independently verify the result with Dropbox, then create the record |

**Request**: `{ "uploadId": "01JQ8Z...", "clientOutcome": "succeeded" | "failed" }`

The client's claim is **not** trusted. The server loads the `pending_uploads` row, calls Dropbox for
the metadata at the path *it* recorded, and requires the file to exist with the declared size. Only
then does it insert the `files` row.

**Response `201`**: the created file record (id, standardName, folderPath, approval status, uploadedAt).

**Errors**: `404 unknown_upload`, `409 already_confirmed`, `422 verification_failed` (nothing is
recorded; the pending row is marked `failed` — FR-020), `502 storage_unavailable`.

---

## Files and the approval pipeline

### `GET /api/files`

| | |
|---|---|
| Access | U (own files only), A (all files) |
| Query | `status`, `questId`, `q`, `page`, `pageSize` |

The Uploader scope is applied server-side — an Uploader passing another user's id gets their own
files, not a `403`, because the filter is not client-supplied (spec Assumptions).

Each item includes `allowedTransitions` for Admins: the next status forward plus every earlier one
(FR-035).

### `GET /api/files/:id`

Access: U (own), A (any). Returns the record plus its `file_transitions` history, newest first.

### `POST /api/files/:id/transition`

| | |
|---|---|
| Access | **A only** — an Uploader gets `403` (FR-033, US3 scenario 8) |

**Request**

```json
{ "toApprovalStatusId": 2, "expectedCurrentStatusId": 1 }
```

`expectedCurrentStatusId` is mandatory — it is how concurrent changes are detected (FR-041).

**Server performs**: the transaction described under *State transitions* in
[data-model.md](../data-model.md) — lock, check legality, resolve or create counterpart taxonomy,
create folders, check for an occupying file, move, then update and audit.

**Response `200`**: the updated file plus the new transition entry.

**Errors**:

| Code | Meaning |
|---|---|
| `409 stale_status` | Another Admin moved it first; the response carries the current status |
| `422 illegal_transition` | More than one step forward; the permitted set is returned |
| `409 destination_occupied` | A different file holds that name at the destination (FR-039) |
| `502 storage_unavailable` | Folder creation or the move failed; the file stays put and a `failed` transition is recorded (FR-038) |

### `GET /api/files/:id/link`

Access: U (own), A (any). Returns a **time-limited** Dropbox link (FR-043). Never a permanent public
URL, and never a credential.

---

## Taxonomy — Admin only

All routes below return `403` for Uploaders.

| Route | Method | Notes |
|---|---|---|
| `/api/taxonomy/statuses` | GET, POST | POST body: `name`, `dropboxPath`, `dropboxUrl` |
| `/api/taxonomy/statuses/:id` | PATCH, DELETE | DELETE → `409 in_use` when files reference it (FR-029) |
| `/api/taxonomy/statuses/reorder` | POST | Body: `{ "orderedIds": [3,1,2] }` — one transaction, positions rewritten contiguously (FR-024) |
| `/api/taxonomy/quests` | GET, POST | GET requires `approvalStatusId`; POST requires it as the parent |
| `/api/taxonomy/quests/:id` | PATCH, DELETE | |
| `/api/taxonomy/missions` | GET, POST | Scoped to `questId` |
| `/api/taxonomy/missions/:id` | PATCH, DELETE | |
| `/api/taxonomy/stages` | GET, POST | Scoped to `missionId`; name only (no folder) |
| `/api/taxonomy/stages/:id` | PATCH, DELETE | |

**Shared rules**

- `422 invalid_folder_segment` when a name or path cannot be a valid Dropbox segment (FR-022).
- `409 duplicate_name` when `name_normalized` collides among siblings.
- `409 in_use` on DELETE where records reference the entry; the response names the deactivation
  alternative (FR-029).
- DELETE and deactivate responses state the effect on child entries (FR-030).
- Edits never rename or relocate existing files (FR-031).

The GET routes are the dependent-menu source for the upload form: each level is queried by its parent
id, which is what makes FR-011's cascade a server-side fact rather than client filtering.

---

## Users — Admin only

| Route | Method | Notes |
|---|---|---|
| `/api/users` | GET, POST | POST: `email`, `name`, `role`, `password` |
| `/api/users/:id` | PATCH, DELETE | Role change takes effect on the user's next request (database sessions) |

**Errors**: `409 last_admin` when the change would leave no active Admin (FR-005);
`409 in_use` on DELETE where the user has files or transitions — deactivate instead.

---

## Cross-cutting assertions

These are contract-level facts that the integration suite asserts directly:

1. No route accepts `multipart/form-data` or a binary body (Constitution I).
2. Every mutating route returns `401` anonymous and `403` for the wrong role (FR-003).
3. No response body contains a Dropbox refresh token, the app secret, or database credentials
   (Constitution IV). The only credential ever returned is the reduced-scope upload token from
   `/api/uploads/authorize`.
4. Every user-facing `message` is English (FR-044).
