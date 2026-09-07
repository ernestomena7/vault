# Quickstart: Open a File's Dropbox Location from the Approvals Queue

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Prerequisites

- Dev server running (`npm run dev`) and signed in as an Admin.
- At least one file already in the Approvals queue (`/files`) with `integrityState = 'valid'`.
- At least one file with `integrityState = 'broken'` — mark one via feature 001's existing broken-file
  path (a file whose Dropbox object no longer exists), or set it directly in the dev database.

## Scenario 1 — Happy path (User Story 1)

1. Open `/files` as an Admin. Apply a status filter.
2. Find a row for a valid file. It shows a Dropbox-link control (new column).
3. Click the control.
4. **Expect**: a new tab opens showing that exact file's location in Dropbox. The Approvals queue tab
   is untouched — still open, filter still applied.
5. Click **anywhere else in the same row** (not the control).
6. **Expect**: the file's detail page opens in Vault (existing `onRowClick` behavior) — proving the
   two behaviors are independent and the control's click did not also trigger this in step 3.

## Scenario 2 — Double-activation is safe (User Story 1, FR-008)

1. Click the control for a valid file, then immediately click it again before the tab has opened.
2. **Expect**: only one tab opens (or the control visibly shows "working" and the second click has no
   additional effect) — never two tabs, never two requests.

## Scenario 3 — Broken file shows disabled with a reason (User Story 2, FR-006)

1. Find (or create) a row where `integrityState === 'broken'`.
2. **Expect**: the control renders disabled. Hovering it shows a plain-language reason (e.g. "This
   file is missing from Dropbox"). Clicking it does nothing.

## Scenario 4 — Dropbox unreachable at request time (User Story 2, FR-007)

1. Temporarily break the Dropbox credential (or stop network access to Dropbox) without restarting the
   app.
2. Click the control for a valid file.
3. **Expect**: a plain-language failure message appears against that row (not a silent no-op, not a
   raw error code). The rest of the queue remains usable.
4. Restore the credential/network. Click the same control again.
5. **Expect**: a fresh attempt is made and succeeds — nothing from the failed attempt is reused or
   cached (User Story 2 scenario 3).

## Scenario 5 — No cost for viewing a long queue (SC-004)

1. Open `/files` with the network tab open in devtools.
2. **Expect**: zero requests to `/api/files/:id/link` fire just from loading or scrolling the queue —
   only when a control is actually clicked, regardless of how many rows are shown.

## Automated coverage this feature adds

- `tests/integration/link-route.test.ts` (new): success, `not_found`, `storage_unavailable`,
  ownership scoping for `GET /api/files/:id/link` — a SHOULD per Constitution Principle V
  ([research.md R-001](./research.md)), not a pre-existing gap left untouched.
- A client-level test (or manual verification per Scenario 1 step 5–6) that the control's click does
  not bubble into the row's `onRowClick`.
