# API Contract Changes: Multi-File Upload

**Date**: 2026-09-02 | **Plan**: [../plan.md](../plan.md)

This documents only what **changes**. Everything else in
[feature 001's API contract](../../001-dropbox-upload-approval/contracts/api.md) is unchanged —
same authentication, same error envelope, same codes, same roles.

**Still true, and worth restating**: no route accepts a file body. The authorize route now takes an
array of file *descriptions*; the bytes still go browser → Dropbox and never through the application
(Constitution I). The existing constitution test that forbids `formData()` on any route covers this
change without modification.

---

## `POST /api/uploads/authorize` — CHANGED

Now takes an array of 1–20 files and returns one grant per file. A single upload is an array of one,
which is what makes FR-037 true by construction rather than by discipline.

| | |
|---|---|
| Access | U, A — unchanged |
| Purpose | Validate the **whole batch**, refuse it outright on any conflict, then issue grants |

### Request

```json
{
  "approvalStatusId": 1,
  "questId": 4,
  "missionId": 9,
  "files": [
    {
      "clientRef": "a",
      "stageId": 22,
      "distinguishingText": "take 1",
      "originalName": "scene_a.mp4",
      "sizeBytes": 734003200,
      "mimeType": "video/mp4"
    },
    {
      "clientRef": "b",
      "stageId": 22,
      "distinguishingText": "take 2",
      "originalName": "scene_b.mp4",
      "sizeBytes": 812003200,
      "mimeType": "video/mp4"
    }
  ]
}
```

- `approvalStatusId`, `questId`, `missionId` are given **once** and apply to every file (FR-008).
- `stageId` is **per file**, and several files may share one (FR-010).
- `distinguishingText` is **optional** (FR-002). Omitted or empty means a three-part name, exactly as
  before this feature.
- `clientRef` is an opaque string the client chooses, so it can match each grant back to the file it
  holds in memory. The server stores it nowhere and derives nothing from it.

### Server performs

The order in [data-model.md](../data-model.md) — batch size, one chain resolution, per-file type,
stage parentage, text legality, name and path length, cross-batch collisions, existing-name checks
against both the database and Dropbox. **Only then** does it create folders, open sessions, mint one
token for the batch, and write the pending rows.

Nothing is created if any check fails. A refusal leaves no folders, no sessions and no pending rows.

### Response `201`

```json
{
  "uploadToken": "sl.B4x...",
  "tokenExpiresAt": "2026-09-02T22:22:00Z",
  "chunkSizeBytes": 8388608,
  "folderPath": "/03 Ready for editing/Onboarding/Welcome",
  "files": [
    {
      "clientRef": "a",
      "uploadId": "01JQ8Z...",
      "standardName": "Onboarding - Welcome - Rough cut - take 1.mp4",
      "dropboxSessionId": "AAAAAA...",
      "commitPath": "/Mission Quest Academy/App Vault Folder/03 Ready for editing/Onboarding/Welcome/Onboarding - Welcome - Rough cut - take 1.mp4"
    }
  ],
  "pathRoot": "{\".tag\":\"root\",\"root\":\"14939263907\"}"
}
```

One token, one folder and one chunk size for the batch; per-file session, name and commit path. The
token is minted once rather than per file — same scope, same lifetime, twenty fewer exchanges
([research.md R-003](../research.md)).

### Errors

| Code | Meaning |
|---|---|
| `409 duplicate_name` | Two files in the batch would produce the same name, or a name is already taken. `details.conflicts` lists the `clientRef`s and the name involved, and the message says that a distinguishing text resolves it |
| `422 invalid_taxonomy_chain` | The shared chain is not valid or not active |
| `422 unsupported_file_type` | At least one file's type is not accepted; `details.files` names them |
| `422 invalid_folder_segment` | A distinguishing text cannot form a legal name part |
| `422 name_too_long` | An assembled name or full path exceeds its limit; the message names which part to shorten |
| `422 batch_too_large` | More than 20 files |
| `502 storage_unavailable` | Dropbox could not be reached during the pre-flight check or folder creation |

**Every one of these refuses the entire batch.** Partial authorization is not a thing: a batch is
either wholly authorized or wholly refused, which is what FR-016 requires and what makes the
5-second budget in SC-005 meaningful.

---

## `POST /api/uploads/confirm` — UNCHANGED in shape

Still one call per file, still verifies with Dropbox against the path the *server* recorded before
creating any record. The response now carries `distinguishingText`.

The batch does not change this route at all: each file is confirmed on its own, and a file that fails
verification leaves no record (FR-032), so a retry is a first attempt rather than a repair.

---

## `POST /api/uploads/finalize` — NEW

Applies or clears the incomplete-set mark once a batch has finished.

| | |
|---|---|
| Access | U (own files only), A (any file) |
| Purpose | Mark the files that landed when a sibling failed, or clear the mark |

### Request

```json
{ "fileIds": [101, 102], "complete": false }
```

- `complete: false` — the batch had failures; mark these files (FR-027).
- `complete: true` — the set is now complete, or the mark is being dismissed; clear it (FR-029).

### Response `200`

```json
{ "updated": 2, "incompleteSet": true }
```

### Errors

| Code | Meaning |
|---|---|
| `403 forbidden` | An Uploader named a file they do not own |
| `404 not_found` | A file id does not exist |

**A note on trust.** The server cannot verify that a batch failed — it only ever sees successful
confirmations, because it never witnesses a transfer (Constitution I). This route therefore takes the
client's word. That is proportionate here: the worst a dishonest client achieves is a wrong badge in
a list, not a wrong file, a wrong name or a wrong permission.

---

## `GET /api/files` and `GET /api/files/:id` — CHANGED

Each item gains two fields:

```json
{ "distinguishingText": "take 1", "incompleteSet": false }
```

Scoping is unchanged: an Uploader sees only their own files, an Admin sees all, and the filter still
comes from the session rather than the query string.

---

## `GET /api/taxonomy/stages` — UNCHANGED

Still returns the Stages of one Mission, and Uploaders still cannot create one (FR-035). When the
Stage an uploader needs does not exist, the form says plainly that an Admin must add it — it does not
offer to create it.

---

## Cross-cutting assertions

The existing assertions in 001's contract all still hold. This feature adds:

1. `/api/uploads/authorize` accepts JSON only, never a file body — even with 20 files described in it.
2. A batch refusal creates nothing: no folder, no upload session, no pending row.
3. Only one credential is ever returned, and it is still the reduced-scope upload token.
4. `finalize` refuses an Uploader who names a file belonging to someone else.
5. Every user-facing message remains English (FR-044 of feature 001).
