---
description: "Task list for Multi-File Upload with Per-File Stages and Distinguishing Text"
---

# Tasks: Multi-File Upload with Per-File Stages and Distinguishing Text

**Input**: Design documents from `/specs/002-multi-file-upload/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md)

**Tests**: Included where the constitution requires them and where the risk warrants it — not blanket
TDD. Principle V makes three suites mandatory; this feature changes two of them (naming and route
authorization) and leaves the third (the storage port contract) untouched, because the port does not
change.

**This is a change to running code.** Feature 001 is implemented and in use. Almost every task below
edits an existing file, and the one rule everything depends on — the file naming convention — is
among the things being changed. Tasks are ordered so the shared foundations move first and each story
stays demonstrable on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps to a user story in spec.md (US1–US4)
- File paths are the real ones in the existing tree

---

## Phase 1: Setup

**Purpose**: Know the starting point. No new dependencies are needed for this feature.

- [X] T001 Establish a green baseline before touching anything: run `npm run typecheck`, `npm run lint` and `npm test`, and record the passing test count so a later failure is attributable to this work rather than inherited
- [X] T002 [P] Add the new limits as named constants in `src/lib/naming/index.ts` — assembled name 200, full path 255, distinguishing text 80 — and `MAX_BATCH_FILES = 20` in `src/lib/validation/index.ts`, each with a comment naming the Dropbox limit it derives from ([research.md R-004](./research.md))

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The schema, the length rules and the batch shapes that every story below builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Add `distinguishingText` (VARCHAR 80, nullable) and `incompleteSet` (boolean, default false) to the `files` table, and `distinguishingText` to `pendingUploads`, in `src/lib/db/schema.ts` per [data-model.md](./data-model.md)
- [X] T004 Generate the forward-only migration with `npm run db:generate` into `src/lib/db/migrations/`, and confirm it is purely additive with safe defaults — no backfill, no index change
- [X] T005 Apply it with `npm run db:migrate` and verify existing file rows are untouched and still resolve correctly, since files uploaded under 001 keep their three-part names (FR-002)
- [X] T006 [P] Raise the assembled-name cap from 120 to 200 in `src/lib/naming/index.ts`, keeping the per-part cap at 120 — the current cap is too tight for four parts and would refuse legitimate names
- [X] T007 [P] Add full-path length validation (255 characters) in `src/lib/naming/index.ts`, called where the destination is computed, with a message naming which part to shorten. **This fixes a latent defect inherited from feature 001**, where no path length was checked at all and an over-long path failed at Dropbox after the transfer
- [X] T008 Extend `tests/unit/naming.test.ts` for the new limits: a four-part name within bounds, an assembled name over 200, and a full path over 255 refused before any storage call
- [X] T009 Define the batch request and response schemas in `src/lib/validation/index.ts`: shared taxonomy plus a `files` array of 1–20, each with `clientRef`, `stageId`, optional `distinguishingText`, `originalName`, `sizeBytes`, `mimeType`, per [contracts/api.md](./contracts/api.md)
- [X] T010 [P] Expose `distinguishingText` and `incompleteSet` from the file queries in `src/lib/db/queries/files.ts`

**Checkpoint**: Schema, length rules and batch shapes ready — stories can begin.

---

## Phase 3: User Story 1 - Upload a set of related files in one pass (Priority: P1) 🎯 MVP

**Goal**: One set of Status/Quest/Mission selections, many files, a Stage each, one submit.

**Independent Test**: Select one status, quest and mission, add three files with three different
stages, submit once, and verify three correctly named files land in the same Dropbox folder — with
the browser network tab confirming the bytes went to Dropbox and not to the app.

### Tests for User Story 1

- [X] T011 [P] [US1] Extend `tests/integration/upload.test.ts` with batch cases against the fake adapter: a three-file batch authorizes and confirms, one chain resolution serves all three, and each file gets its own record and initial-placement audit entry

### Implementation for User Story 1

- [X] T012 [US1] Add a batch-capable `beginUploads` to the storage port in `src/lib/storage/port.ts` that opens several sessions under **one** grant, returning per-file session and commit path ([research.md R-003](./research.md))
- [X] T013 [US1] Implement it in `src/lib/storage/dropbox/index.ts`, minting a single reduced-scope token for the whole batch rather than one per file
- [X] T014 [P] [US1] Implement it in `src/lib/storage/fake/index.ts` and extend `tests/contract/storage/port-contract.ts` with assertions for the new operation, so the fake cannot drift from the adapter (Constitution V)
- [X] T015 [US1] Rewrite `authorizeUpload` as `authorizeBatch` in `src/lib/uploads/authorize.ts`: accept the array, resolve the shared chain **once**, compute each name and path, and write one `pending_uploads` row per file
- [X] T016 [US1] Change `POST /api/uploads/authorize` in `src/app/api/uploads/authorize/route.ts` to take the array and return one grant per file keyed by `clientRef` — **metadata only, still no file body ever** (Constitution I)
- [X] T017 [US1] Implement sequential batch orchestration in `src/lib/uploads/client-uploader.ts`: transfer one file at a time in listed order, confirm each as it lands, and carry per-file state
- [X] T018 [US1] Rework `src/app/(app)/upload/upload-form.tsx` into a shared-selection header plus a file list, with the status/quest/mission menus appearing once
- [X] T019 [P] [US1] Build the per-file row in `src/components/batch-file-row.tsx` from design-system components — original name, size, stage selector, remove control (Constitution VI)
- [X] T020 [US1] Add per-file progress and queue state in `src/app/(app)/upload/upload-form.tsx`: which file is transferring, its percentage, and which are done, waiting or failed (FR-022)
- [X] T021 [US1] Clear every per-file stage assignment in `src/app/(app)/upload/upload-form.tsx` when the shared status, quest or mission changes, since stages belong to a specific Mission (FR-013)

**Checkpoint**: A batch of files with distinct stages uploads in one pass.

---

## Phase 4: User Story 2 - Distinguish files that share the same stage (Priority: P1)

**Goal**: Several files can share a Quest, Mission **and** Stage, told apart by a text the uploader
types. This is the change to the naming convention itself.

**Independent Test**: Add two files with identical status, quest, mission and stage, give each a
different distinguishing text, and verify both land side by side with names differing only in that
text.

### Tests for User Story 2

- [X] T022 [P] [US2] Extend `tests/unit/naming.test.ts` for the four-part name: with text, without text (three parts, unchanged from 001), trimming, and case-insensitive equality of conflict keys so " Take 1 " and "take 1" are the same thing

### Implementation for User Story 2

- [X] T023 [US2] Extend `buildStandardName` in `src/lib/naming/index.ts` to take an optional distinguishing text and produce `[Quest] - [Mission] - [Stage] - [Text].[ext]`, falling back to the exact three-part name when it is absent (FR-001, FR-002)
- [X] T024 [P] [US2] Add a `conflictKey` helper in `src/lib/naming/index.ts` that normalizes the text with the existing `normalizeName`, so there is one definition of "the same name" in the codebase ([research.md R-008](./research.md))
- [X] T025 [US2] Validate the distinguishing text as a name part in `src/lib/validation/index.ts` — legal characters, 80-character cap, trimmed
- [X] T026 [US2] Carry the text through authorization into `pending_uploads` in `src/lib/uploads/authorize.ts`, so confirm verifies against what the **server** authorized rather than what the client re-sends
- [X] T027 [US2] Record it on the file in `src/lib/uploads/confirm.ts`
- [X] T028 [US2] Add the distinguishing-text field to `src/components/batch-file-row.tsx` with a **live preview of the resulting file name**, so the naming rule is visible rather than discovered after upload
- [X] T029 [US2] Show validation feedback on the text as it is typed in `src/components/batch-file-row.tsx`, naming the offending characters rather than failing at submit (User Story 2, scenario 5)

**Checkpoint**: Files sharing a stage upload together, distinguishable by name alone.

---

## Phase 5: User Story 3 - Be told about a conflict before anything is transferred (Priority: P2)

**Goal**: A batch that would collide is refused up front, in seconds, with nothing transferred.

**Independent Test**: Assemble a 20-file batch containing a name already in the folder, submit, and
verify it is refused in under 5 seconds with nothing written — no file, no folder, no pending row.

### Tests for User Story 3

- [X] T030 [P] [US3] Extend `tests/integration/upload.test.ts` with conflict cases: two files producing the same name, a name already in the database, a name already in storage, and the case that must **pass** — same stage and text but different extensions

### Implementation for User Story 3

- [X] T031 [US3] Detect cross-batch collisions in `src/lib/uploads/authorize.ts` by comparing conflict keys across the whole batch before any storage call (FR-016)
- [X] T032 [US3] Check existing names in one database query over the destination folder, and in parallel probes against storage, in `src/lib/uploads/authorize.ts` — parallel because 20 sequential probes would consume most of the 5-second budget ([research.md R-002](./research.md))
- [X] T033 [US3] Make the refusal atomic in `src/lib/uploads/authorize.ts`: on any failed check, create no folder, open no session, mint no token and write no pending row
- [X] T034 [US3] Return `409 duplicate_name` with the conflicting `clientRef`s and a message saying that a distinguishing text resolves it, in `src/app/api/uploads/authorize/route.ts`
- [X] T035 [US3] Surface conflicts inline against the offending rows in `src/app/(app)/upload/upload-form.tsx`, rather than as one message at the top of the form

**Checkpoint**: No batch can start transferring into a collision.

---

## Phase 6: User Story 4 - Recover from a partial failure (Priority: P3)

**Goal**: What landed stays and is marked; what failed leaves no trace and can be retried alone.

**Independent Test**: Start a three-file batch, force the second to fail, and verify the other two
are recorded and marked as an unfinished set, the failed one has no record at all, and a retry
re-sends only that file.

### Tests for User Story 4

- [X] T036 [P] [US4] Extend `tests/integration/upload.test.ts`: a partial failure keeps the landed files, marks them, leaves no record for the failure, and a successful retry clears the mark
- [X] T037 [P] [US4] Add `POST /api/uploads/finalize` to the matrix in `tests/integration/authorization.test.ts`, including an Uploader naming a file they do not own

### Implementation for User Story 4

- [X] T038 [US4] Implement marking and clearing in `src/lib/uploads/finalize.ts`, scoped so an Uploader may only touch their own files and an Admin any file
- [X] T039 [US4] Add `POST /api/uploads/finalize` in `src/app/api/uploads/finalize/route.ts` taking file ids and a completeness flag, per [contracts/api.md](./contracts/api.md)
- [X] T040 [US4] Report per-file outcome — succeeded, failed, not attempted — with a plain-language reason for each failure, in `src/lib/uploads/client-uploader.ts` and the form
- [X] T041 [US4] Implement retry of failed files only in `src/app/(app)/upload/upload-form.tsx`, as a fresh authorization rather than a resume, since a failed file has no record to repair (FR-032)
- [X] T042 [US4] Show the incomplete-set mark wherever a file is listed in `src/components/files-table.tsx`, for the owning Uploader and for Admins
- [X] T043 [US4] Add the dismiss action to `src/app/(app)/my-files/page.tsx` and the Admin file views, clearing the mark without changing the files (FR-029)

**Checkpoint**: A half-finished batch is legible afterwards and cheap to complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T044 Verify `tests/integration/constitution.test.ts` still passes unchanged — the authorize route now carries an array but still no file body, which is exactly what that suite asserts
- [X] T045 [P] Update the naming rule in `README.md`, which currently documents the three-part convention and is now wrong
- [X] T046 [P] Run the design-system adherence check over `src/components/batch-file-row.tsx` and `src/app/(app)/upload/upload-form.tsx` using `Vault Design System/_adherence.oxlintrc.json` — no hardcoded colours, spacing from tokens, components from the kit (Constitution VI)
- [X] T047 [P] Audit every new user-facing string in `src/app/(app)/upload/` and `src/components/batch-file-row.tsx` for English-only compliance (Constitution VI)
- [~] T048 Run the full V1–V6 validation sequence from [quickstart.md](./quickstart.md) against a local instance, including the network-tab check that file bytes never reach the app
  - **Server-side parts PASSED** against the running app: `/api/uploads/finalize` refuses an
    anonymous caller with `401`, `/api/uploads/authorize` now requires the `files` array and
    refuses the old single-file shape, and `/upload` renders.
  - **V1-V4 and V6 BLOCKED** on `DROPBOX_REFRESH_TOKEN`, still empty. Their logic is covered by the
    automated suites against the fake adapter, but no real transfer — and therefore no network-tab
    check — has been performed.
- [ ] T049 Measure a 20-file pre-flight against real Dropbox latency and confirm the 5-second budget in SC-005 holds; if it does not, revisit the single-`listFolder` option rejected in [research.md R-002](./research.md)
  - **NOT DONE** — needs a working Dropbox connection. The parallel-probe design is in place; only
    the measurement is outstanding.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — **blocks every story**
- **User Stories (Phases 3–6)**: all depend on Foundational
- **Polish (Phase 7)**: depends on the stories you intend to ship

### User Story Dependencies

Stated honestly rather than aspirationally:

- **US1 (P1)**: needs only Foundational. It works with three-part names and is the genuine MVP.
- **US2 (P1)**: shares P1 with US1 but is **not** independent of it in practice — the distinguishing
  text is a field on each row of the file list that US1 builds. The naming change itself (T023, T024)
  is independent and could land first; the interface for it cannot.
- **US3 (P2)**: needs US1's batch authorization to have something to check across. Its value rises
  sharply once US2 exists, because sharing a stage is what makes collisions likely.
- **US4 (P3)**: needs US1. Independent of US2 and US3.

### Within Each Story

- Tests before the implementation they cover
- Naming and validation before the services that call them
- Services before routes; routes before screens

### Parallel Opportunities

- Foundational: T006, T007 and T010 in parallel after T003–T005; T008 follows T006/T007
- Within US1: T014 and T019 are parallel-safe; T015 through T018 are sequential (shared files)
- Within US2: T024 is parallel with T023; the form tasks are sequential
- Across stories: once Foundational lands, **US4 can be built in parallel with US2 and US3** by a
  second developer — it touches `finalize.ts`, `files-table.tsx` and `my-files`, none of which the
  others edit
- Polish: T045, T046 and T047 in parallel

---

## Parallel Example: Foundational Phase

```bash
# After the migration (T003-T005) lands, launch together:
Task: "Raise the assembled-name cap to 200 in src/lib/naming/index.ts"
Task: "Add full-path length validation in src/lib/naming/index.ts"   # same file — coordinate
Task: "Expose the new columns in src/lib/db/queries/files.ts"
```

*(T006 and T007 touch the same file; treat them as one unit of work if the same person takes both.)*

## Parallel Example: Two Developers After Foundational

```bash
# Developer A — the critical path
US1 (T011-T021) -> US2 (T022-T029) -> US3 (T030-T035)

# Developer B — independent, no shared files
US4 (T036-T043)
```

---

## Implementation Strategy

### MVP scope

**Phases 1–4 (T001–T029): Setup + Foundational + US1 + US2.**

US1 alone is a working batch upload, but it is limited to one file per stage — which is not how the
work arrives, and is the reason this feature was asked for. The first genuinely useful increment is
US1 **and** US2 together: many files, sharing a stage where they need to, told apart by a text the
uploader types. That is 29 tasks.

US3 can follow closely, because without it a collision is discovered after a multi-gigabyte transfer
rather than before it — tolerable for a day, not for a month.

### Incremental delivery

1. Setup + Foundational → the schema and the length rules are correct, including the path-length
   defect inherited from 001
2. **+ US1** → a batch uploads with distinct stages. Validate quickstart V1
3. **+ US2** → **MVP**: files can share a stage. Validate V2 and V5
4. **+ US3** → collisions refused before transferring. Validate V3 and V6
5. **+ US4** → partial failures are legible and cheap to finish. Validate V4
6. Polish → README, design system, English-only, then the full sequence

### Risk order

The riskiest change is not the batching — it is **T023**, which alters the naming rule that feature
001 guarantees and that files already in Dropbox were created under. It is deliberately paired with
T022, written first, and it is why the text is optional: every existing name stays valid, and every
existing habit keeps working.

---

## Deviations and additions during implementation

1. **`Select` gained a `size` prop, in the design system.** The batch row puts a Select and an Input
   on one line, and only Input had a size scale — an inconsistency in the design system rather than
   a gap in this feature. Extended there and re-synced, per Constitution VI, instead of styling
   around it locally.

2. **A naming failure now names the file it came from.** `InvalidPathError` carries only the
   offending text, which in a twenty-file batch leaves the uploader hunting for the row. The
   authorize service now catches it and re-throws an `ApiError` carrying the `clientRef`. Found by a
   test that expected a code the service was not producing.

3. **`conflictKey` uses `|` as its separator.** A pipe is in the forbidden character set for names,
   so it can never appear inside a part — the key is unambiguous by construction rather than by
   hoping parts stay tidy.

4. **The README's Dropbox setup was wrong and is corrected.** It still instructed App-folder access,
   which stopped being true when the status folders were placed inside a shared team folder. It now
   states both options with their consequences, and documents `DROPBOX_PATH_ROOT_NAMESPACE_ID`,
   whose absence on a Business account makes every path look like a missing folder.

5. **New tests live in `tests/integration/batch-upload.test.ts`** rather than being appended to
   001's `upload.test.ts`, which keeps each feature's assertions readable on their own. 001's
   fixture was migrated to the batch shape and all of its assertions still pass unchanged.

## Notes

- **T016 is the task to watch.** If `/api/uploads/authorize` ever grows a file body — even for a
  batch — Constitution Principle I has been violated. T044 asserts it automatically.
- **T007 fixes a bug that predates this feature.** Nothing today validates the Dropbox path length,
  so an over-long path fails after the transfer rather than before it. Worth calling out in review so
  it is not mistaken for scope creep.
- **T014 is not optional.** The storage port gains an operation, so the shared contract suite must
  gain assertions for it, or the fake is free to drift from the real adapter (Constitution V).
- Commit after each task or logical group. Stop at any checkpoint to validate a story on its own.
