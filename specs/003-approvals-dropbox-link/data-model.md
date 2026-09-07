# Phase 1 Data Model: Open a File's Dropbox Location from the Approvals Queue

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## No new entity, no schema change

This feature introduces no stored concept and requires no migration. It reads two fields the File
Record (feature 001) already exposes to the Approvals queue's row shape (`FileRow` in
`src/components/files-table.tsx`):

| Field | Already present since | Used here for |
|---|---|---|
| `id` | 001 | Identifies which file's link to request when the control is activated |
| `integrityState: 'valid' \| 'broken'` | 001 (FR-042) | Decides, at render time and with no extra request, whether the control renders enabled or disabled-with-reason (FR-006) |

`dropboxFolderPath` and `standardName` are read server-side, inside the existing
`GET /api/files/:id/link` handler, exactly as they are today — the client never needs them, since it
only ever sends the file's `id` and receives back a ready-to-open `url`.

## Transient client state (not persisted, not modeled as an entity)

The one new piece of state this feature adds lives entirely in the browser, for the lifetime of one
click, in the new `DropboxLinkButton` component ([research.md R-005](./research.md)):

| State | Shape | Cleared when |
|---|---|---|
| `busy` | `boolean` | The request settles (success or failure) — satisfies FR-008 |
| `error` | `string \| null` | The control is activated again — satisfies User Story 2 scenario 3 |

Nothing here is written to the database, sent in any request body, or shared between rows.

## Response shape consumed (unchanged from feature 001)

```ts
// GET /api/files/:id/link — 200 response, already returned by feature 001's handler
interface LinkResponse {
  url: string;
  expiresAt: string; // ISO 8601
}
```

`expiresAt` is not used by this feature — the tab is opened once, immediately, and the link's later
expiry is 001's concern, not this one's.
