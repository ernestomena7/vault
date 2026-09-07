# API Contracts: Open a File's Dropbox Location from the Approvals Queue

**Feature**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md)

## HTTP contract — unchanged, now covered by tests

This feature adds no route and changes no request or response shape. It consumes the endpoint feature
001 already built and documented in
[001's contracts/api.md](../../001-dropbox-upload-approval/contracts/api.md) (line 171):

### `GET /api/files/:id/link`

**Access**: Uploader (own files only, via `restrictToUploaderId`), Admin (any file). Unchanged — this
feature introduces no new authorization decision (FR-009).

**Success — 200**:

```json
{ "url": "https://www.dropbox.com/...", "expiresAt": "2026-09-03T18:30:00.000Z" }
```

`url` is a time-limited Dropbox link (FR-005/FR-043) — never a permanent public URL, never a storage
credential.

**Failure responses** (all follow the project's standard `{ error: { code, message } }` envelope via
`toApiError`):

| Status | `code` | `message` | When |
|---|---|---|---|
| 401 | `unauthenticated` | "Sign in to continue." | No session |
| 404 | `not_found` | "That file could not be found." | Unknown id, or an Uploader requesting another user's file |
| 502 | `storage_unavailable` | "Dropbox could not be reached. Nothing was changed, so you can try again." | `createTemporaryLink` fails against Dropbox |

**What this feature adds**: integration-test coverage of this exact matrix
(`tests/integration/link-route.test.ts`, [research.md R-001](../research.md)) — the contract itself is
untouched.

## Client interaction contract (new — this is what feature 003 actually builds)

This is the contract this feature is responsible for, expressed as the sequence a `DropboxLinkButton`
must follow. There is no new network endpoint here — this documents client behavior around the
existing one.

```text
1. User clicks the control for file {id}.
2. Synchronously, before anything else: open a blank tab (window.open('', '_blank')).
   → If the button is already busy for this file, do nothing (FR-008).
3. Set busy = true; clear any prior error for this row.
4. GET /api/files/{id}/link
5a. On 200: set the blank tab's location to `url`. busy = false.
5b. On any error response: close the blank tab. busy = false.
    Show `error.message` from the response body against this row (FR-007).
```

Preconditions for step 1 to even be reachable:

- The control renders **disabled**, with a tooltip reason ("This file is missing from Dropbox"),
  when the row's `integrityState === 'broken'` — no request is ever made for such a row (FR-006).
- The control's own click handler calls `event.stopPropagation()` before step 2, so the Approvals
  table's row-level `onRowClick` (which opens `/files/:id`) does not also fire (FR-003,
  [research.md R-003](../research.md)).

## Design system contract addition

`Icon` gains one new registered name, `external-link`, used by the control. This is additive to the
existing loose-`string`-typed `name` prop — no type signature changes
([research.md R-004](../research.md)).
