---
description: "Task list for Open a File's Dropbox Location from the Approvals Queue"
---

# Tasks: Open a File's Dropbox Location from the Approvals Queue

**Input**: Design documents from `/specs/003-approvals-dropbox-link/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md)

**Tests**: Included for the one gap the plan identified — `GET /api/files/:id/link` has zero
integration coverage today. This is a SHOULD under Constitution Principle V (the route is read-only,
outside the mandatory mutating-route set), taken on because it is the one route whose job is handing
out file links ([research.md R-001](./research.md)). No new naming, transition, or storage-port-contract
suite is touched, because none of those change.

**Almost the entire feature is new, additive UI.** The backend endpoint already exists, is already
correct, and is not modified. Nearly every task below creates a new file or adds a column to an
existing table; only one existing file (`files-table.tsx`) is edited, and the design system gets one
new icon registry entry.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps to a user story in spec.md (US1, US2)
- File paths are the real ones in the existing tree

---

## Phase 1: Setup

**Purpose**: Know the starting point. No new dependency is needed for this feature.

- [X] T001 Establish a green baseline before touching anything: run `npm run typecheck`, `npm run lint`
  and `npm test`, and record the passing test count so a later failure is attributable to this work
  (baseline: typecheck clean, lint clean, 236 passed / 1 skipped across 12 test files)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The one shared building block both stories render with — the icon the control uses does
not exist yet in the design system.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Add an `external-link` glyph to the `ICONS` map in
  `Vault Design System/components/foundations/Icon.jsx` (standard Lucide box-with-escaping-arrow path
  data, matching the existing glyphs' `viewBox="0 0 24 24"`/stroke conventions) — per
  [research.md R-004](./research.md), fixed in the design system source, not worked around locally
  (Constitution VI)
- [X] T003 Run `npm run ds:sync` and confirm `external-link` is now available from `@/components/ds`'s
  `Icon` (depends on T002)

**Checkpoint**: The icon exists — story work can begin.

---

## Phase 3: User Story 1 - Open a file's Dropbox location while reviewing the queue (Priority: P1) 🎯 MVP

**Goal**: A control on each Approvals row that opens that file's exact Dropbox location in a new tab,
without losing the queue, without also opening the file's detail page, and without double-firing on a
fast double-click.

**Independent Test**: Open `/files` as an Admin, click the control on a valid file's row, and confirm a
new tab opens to that file's Dropbox location while the Approvals queue — filter included — stays open
and unchanged behind it; then click elsewhere on the same row and confirm the detail page opens instead
(proving the two behaviors are independent, per [quickstart.md](./quickstart.md) Scenario 1).

### Implementation for User Story 1

- [X] T004 [US1] Create `src/components/dropbox-link-button.tsx`: a client component taking `fileId:
  number` and `integrityState: 'valid' | 'broken'`. On click: call `event.stopPropagation()` first
  (FR-003, [research.md R-003](./research.md)); synchronously `window.open('', '_blank')` **before**
  any `await` (FR-002, [research.md R-002](./research.md)); guard re-entry with a local `busy` boolean
  so a second click while a request is in flight does nothing (FR-008); `fetch
  /api/files/${fileId}/link`; on success set the opened tab's `location.href` to the response's `url`;
  render as `IconButton` with `icon="external-link"`
- [X] T005 [US1] Add a column to `src/components/files-table.tsx`'s `columns` array rendering
  `<DropboxLinkButton fileId={row.id} integrityState={row.integrityState} />` for each row (FR-001) —
  the cell sits inside the same `<tr>` that already carries `onRowClick`, which is exactly why T004's
  `stopPropagation()` matters (depends on T004). Gated behind a new `showDropboxLink` prop (mirroring
  the existing `showUploader`/`linkToDetail` pattern), passed only from `src/app/(app)/files/page.tsx`
  (the Approvals queue) — **caught during implementation**: a first pass added the column
  unconditionally, which would have leaked it into the Uploader's "My files" list
  (`src/app/(app)/my-files/page.tsx`), explicitly Out of Scope per spec.md
- [ ] T006 [US1] Manually verify [quickstart.md](./quickstart.md) Scenarios 1, 2 and 5: happy-path open,
  double-activation produces only one tab, and loading the queue at any length fires zero requests to
  `/api/files/:id/link` until a control is actually clicked (FR-004, SC-004). **Not run** — no browser
  tool is available in this environment; needs a human check in an actual browser, since this is
  exactly the kind of thing (real tab-opening, real popup-blocker behavior) a headless run can't verify

**Checkpoint**: User Story 1 is fully functional and independently testable — a valid file's Dropbox
location can be opened from the Approvals queue with no side effects on the row-click or the queue.

---

## Phase 4: User Story 2 - Understand when a file's location cannot be opened (Priority: P2)

**Goal**: A file already known to be missing from Dropbox shows its control as disabled with a reason
instead of offering a link doomed to fail; a link that fails for any other reason at request time shows
a plain-language message and can be retried.

**Independent Test**: Mark a file broken (feature 001's existing broken-file state) and confirm its
control renders disabled with a hover reason and cannot be activated; separately, force a Dropbox
failure for a healthy file and confirm a plain-language error appears against that row and a retry
succeeds once the failure clears, per [quickstart.md](./quickstart.md) Scenarios 3 and 4.

### Tests for User Story 2

- [X] T007 [P] [US2] Create `tests/integration/link-route.test.ts` covering
  `GET /api/files/:id/link` against the fake storage adapter: success (`{url, expiresAt}`), `not_found`
  for an unknown id, `not_found` when an Uploader requests another user's file, unrestricted access for
  an Admin, and `storage_unavailable` when the adapter throws — closing the coverage gap noted in
  spec.md's Assumptions and [research.md R-001](./research.md). 7 assertions, all passing; also covers
  the "record exists but Dropbox no longer has the object" case as a bonus, since it's the same route

### Implementation for User Story 2

- [X] T008 [US2] Extend `src/components/dropbox-link-button.tsx`: when `integrityState === 'broken'`,
  render the `IconButton` disabled and wrapped in `Tooltip label="This file is missing from Dropbox"`
  (FR-006) — no request is ever made for such a row. *(Built together with T004 — the broken/valid
  branch was written in the same pass since it's the same small component, not a separate edit.)*
- [X] T009 [US2] Extend `src/components/dropbox-link-button.tsx`: on a failed fetch, close the
  already-opened blank tab, read `error.message` from the JSON error body, and show it against that row
  (FR-007) — clear it the next time the control is activated so a fresh attempt is never blocked by a
  stale failure (User Story 2 scenario 3, depends on T004). *(Same note as T008 — done in T004's pass.)*
- [ ] T010 [US2] Manually verify [quickstart.md](./quickstart.md) Scenario 3 (disabled + tooltip for a
  broken file) and Scenario 4 (plain-language failure, then successful retry). **Not run** — same
  reason as T006

**Checkpoint**: Both user stories work independently and together — the queue is honest about which
files' locations can and cannot currently be opened.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Confirm the whole feature end-to-end and leave the tree clean.

- [X] T011 Run `npm run typecheck`, `npm run lint` and `npm test`; confirm the new
  `link-route.test.ts` suite passes and nothing from Phase 1's baseline regressed. Result: typecheck
  clean, lint clean, 243 passed / 1 skipped across 13 files (was 236/1/12 — the +7 are exactly
  `link-route.test.ts`)
- [ ] T012 Run through all five [quickstart.md](./quickstart.md) scenarios once more end-to-end in a
  real browser (not just the automated suite) — the popup-blocker hazard (R-002) is a browser-behavior
  concern that a headless test runner will not surface. **Not run** — no browser tool available in
  this environment; this is the one task in the whole feature that genuinely needs a human, since the
  entire point of R-002 is a real-browser popup-blocker heuristic, not something Vitest exercises

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS both user stories (the control has
  no icon to render until T002–T003 are done)
- **User Story 1 (Phase 3)**: Depends on Foundational — no dependency on User Story 2
- **User Story 2 (Phase 4)**: Depends on Foundational. T008–T009 edit the same file User Story 1
  created (T004), so in practice US2 follows US1, though T007 (the route test) has no such dependency
  and could run any time after Foundational
- **Polish (Phase 5)**: Depends on both user stories being complete

### Within Each User Story

- US1: T004 (component) before T005 (wiring it into the table) before T006 (manual verification)
- US2: T007 (route test) is independent of T008/T009; T008 and T009 both edit
  `dropbox-link-button.tsx` and should be done sequentially, not in parallel; T010 last

### Parallel Opportunities

- T007 (new test file) can run in parallel with T008/T009 (both edit `dropbox-link-button.tsx`) since
  they touch different files
- Nothing in Phase 2 is parallel — T003 depends on T002 finishing first (sync reads what was just
  added)

---

## Parallel Example: Phase 4 (User Story 2)

```bash
# T007 touches a new test file; T008 touches the existing component — safe to run together:
Task: "Create tests/integration/link-route.test.ts covering success/not_found/storage_unavailable/ownership"
Task: "Extend src/components/dropbox-link-button.tsx with the disabled+tooltip broken-file state"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (icon addition — blocks everything else)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart Scenarios 1, 2, 5 — an Admin can already open any valid file's
   Dropbox location with no side effects. This alone is a legitimate, demoable increment.

### Incremental Delivery

1. Setup + Foundational → icon ready
2. User Story 1 → validate → this is already usable end-to-end for the common case
3. User Story 2 → validate → the queue is now honest about broken files and transient failures too
4. Polish → full regression pass, real-browser popup-blocker check

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to a specific user story for traceability
- No entities, no migration, no new route — everything here is additive at the UI edge plus one
  design-system glyph and one new test file, per [plan.md](./plan.md)'s Project Structure
- Commit after each task or logical group
- Stop at either checkpoint to validate a story independently
