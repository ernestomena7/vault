---
description: "Task list for Vault — Standardized Dropbox Upload & Approval Pipeline"
---

# Tasks: Vault — Standardized Dropbox Upload & Approval Pipeline

**Input**: Design documents from `/specs/001-dropbox-upload-approval/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Included, but **not** blanket TDD. The project constitution (Principle V) makes exactly
three suites mandatory — approval-transition rules, route authorization, and the storage port
contract. Those are non-negotiable tasks. Other tests are included only where the risk warrants it.

**Organization**: Grouped by user story so each can be implemented, tested, and demonstrated on its
own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps to a user story in spec.md (US1–US5)
- File paths follow the structure in [plan.md](./plan.md)

## Path Conventions

Single Next.js project at the repository root: `src/`, `tests/`, `scripts/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization. `.env.local`, `.env.example`, and `.gitignore` already exist.

- [X] T001 Initialize Next.js 16 + TypeScript project at repo root: `package.json`, `tsconfig.json`, `next.config.ts` with `output: 'standalone'`, React 19, Node 22 engine constraint
- [X] T002 [P] Configure ESLint and Prettier in `eslint.config.mjs`, including an import-boundary rule forbidding `dropbox` SDK imports anywhere outside `src/lib/storage/dropbox/` (Constitution III)
- [X] T003 [P] Configure Vitest in `vitest.config.ts` with separate `unit`, `contract`, and `integration` projects, no network access in the default run
- [X] T004 [P] Generate the Tailwind theme from the design system in `tailwind.config.ts` and `src/styles/tokens.css`, sourced from `Vault Design System/tokens/` (Constitution VI)
- [X] T005 [P] Add npm scripts to `package.json`: `dev`, `build`, `start`, `db:migrate`, `db:seed`, `test`, `test:contract`, `typecheck`, `lint`
- [X] T006 Implement fail-fast typed environment parsing in `src/lib/config/env.ts` using Zod, covering every variable in `.env.example`; the app must refuse to boot on a missing value

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The database, the storage boundary, and the shared primitives every story needs.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 Define the full Drizzle schema in `src/lib/db/schema.ts`: `users`, `sessions`, `approval_statuses`, `quests`, `missions`, `stages`, `pending_uploads`, `files`, `file_transitions`, with the generated `name_normalized` columns, unique indexes, and FK `ON DELETE RESTRICT` per [data-model.md](./data-model.md)
- [X] T008 Configure drizzle-kit in `drizzle.config.ts` and generate the initial forward-only SQL migration into `src/lib/db/migrations/` (Constitution V — migrations are committed, never hand-applied)
- [X] T009 [P] Create the MySQL connection pool in `src/lib/db/client.ts` using `mysql2`
- [X] T010 [P] Define the storage port interface and error types (`NotFound`, `DestinationOccupied`, `StorageUnavailable`) in `src/lib/storage/port.ts` per [contracts/storage-port.md](./contracts/storage-port.md)
- [X] T011 [P] Implement the in-memory fake storage adapter in `src/lib/storage/fake/index.ts`
- [X] T012 Implement the Dropbox adapter in `src/lib/storage/dropbox/index.ts` — the sole importer of the Dropbox SDK — covering `ensureFolder`, `fileExists`, `getMetadata`, `beginUpload`, `moveFile`, `createTemporaryLink`, with autorename disabled on move
- [X] T013 Implement reduced-scope token minting in `src/lib/storage/dropbox/tokens.ts`: refresh the stored refresh token requesting **only** `files.content.write` for the browser-held credential ([research.md R-002](./research.md))
- [X] T014 Write the shared storage contract suite in `tests/contract/storage/port-contract.ts` with all 18 assertions from [contracts/storage-port.md](./contracts/storage-port.md), plus runners `tests/contract/storage/fake.test.ts` and `tests/contract/storage/dropbox.test.ts` so both implementations pass the same suite **(Constitution V — mandatory)**
- [X] T015 [P] Implement name and path construction in `src/lib/naming/index.ts`: standard name `[Quest] - [Mission] - [Stage].[ext]`, folder path assembly, and Dropbox segment validation
- [X] T016 [P] Define shared Zod request/response schemas in `src/lib/validation/` for every route in [contracts/api.md](./contracts/api.md)
- [X] T017 [P] Build the app shell in `src/app/layout.tsx` and base design-system components in `src/components/`, dark-theme-only, English-only strings (Constitution VI)
- [X] T018 Implement the error envelope and handler in `src/lib/http/errors.ts` mapping domain errors to the codes in [contracts/api.md](./contracts/api.md)
- [X] T019 Write the seed script in `scripts/seed.ts`: one Admin, plus the Quest/Mission/Stage tree duplicated under **each** Approval Status, so later stories can be exercised without hand-building counterparts

**Checkpoint**: Database, storage boundary, and shared primitives ready — user stories can begin.

---

## Phase 3: User Story 1 - Gated access with the right role (Priority: P1) 🎯 MVP

**Goal**: Nobody reaches any screen or data without signing in, and each role sees exactly what it
should.

**Independent Test**: Attempt every screen while signed out, as an Uploader, and as an Admin —
including direct URL navigation to admin-only routes — and confirm each outcome.

### Tests for User Story 1

- [X] T020 [P] [US1] Write the authorization matrix suite in `tests/integration/authorization.test.ts` asserting anonymous → 401 and Uploader → 403 on every mutating route **(Constitution V — mandatory)**

### Implementation for User Story 1

- [X] T021 [P] [US1] Implement scrypt password hashing and verification in `src/lib/auth/password.ts` using `node:crypto` only, no native modules ([research.md R-005](./research.md))
- [X] T022 [US1] Configure Auth.js v5 in `src/lib/auth/config.ts` with the Credentials provider and Drizzle-backed **database** sessions, refusing inactive accounts identically to wrong credentials
- [X] T023 [US1] Add the Auth.js route handler in `src/app/api/auth/[...nextauth]/route.ts`
- [X] T024 [P] [US1] Implement `requireUser` and `requireAdmin` server-side guards in `src/lib/auth/guards.ts` (FR-003)
- [X] T025 [US1] Add route protection in `src/proxy.ts` so every screen and API route outside sign-in requires a session
- [X] T026 [P] [US1] Build the sign-in screen in `src/app/(auth)/sign-in/page.tsx` with a message that never reveals whether an account exists
- [X] T027 [US1] Build the role-aware navigation shell in `src/app/(app)/layout.tsx` — Uploaders see no admin navigation at all
- [X] T028 [US1] Add the permission-refused screen and 403 handling in `src/app/(app)/forbidden/page.tsx`

**Checkpoint**: The app is closed to the public and role separation is enforced and demonstrable.

---

## Phase 4: User Story 2 - Upload a video under the enforced convention (Priority: P2)

**Goal**: An Uploader picks a file and four attributes; the file lands in Dropbox with the exact
enforced name at the exact computed path — without a byte passing through the application.

**Independent Test**: Upload a video with known selections and verify in Dropbox that the file exists
at the expected path with the exact standard name, with a matching record in Vault — and confirm in
the browser network tab that the bytes went to Dropbox, not to the app.

### Tests for User Story 2

- [X] T029 [P] [US2] Unit-test name and path construction in `tests/unit/naming.test.ts`, including extension preservation and forbidden-character rejection
- [X] T030 [P] [US2] Integration-test the authorize → confirm flow in `tests/integration/upload.test.ts` against the fake adapter: happy path, duplicate refusal, and confirm-without-transfer producing **no** file record

### Implementation for User Story 2

- [X] T031 [US2] Implement cascading taxonomy read queries in `src/lib/db/queries/taxonomy.ts` — children by parent id, active only
- [X] T032 [P] [US2] Add the taxonomy GET routes that feed the dependent menus in `src/app/api/taxonomy/{statuses,quests,missions,stages}/route.ts` (FR-011)
- [X] T033 [US2] Implement the authorize service in `src/lib/uploads/authorize.ts`: validate the chain, compute name and path, check for collisions in both the database and Dropbox, create folders, insert `pending_uploads`, start the Dropbox session, mint the reduced-scope token
- [X] T034 [US2] Add `POST /api/uploads/authorize` in `src/app/api/uploads/authorize/route.ts` — **metadata only, no file body ever** (Constitution I)
- [X] T035 [US2] Implement the confirm service in `src/lib/uploads/confirm.ts`: verify against Dropbox at the path the **server** recorded, never the client's claim, then insert the `files` row
- [X] T036 [US2] Add `POST /api/uploads/confirm` in `src/app/api/uploads/confirm/route.ts`
- [X] T037 [US2] Implement the browser chunked uploader in `src/lib/uploads/client-uploader.ts`: 8 MiB `upload_session` chunks straight to Dropbox, with progress and per-chunk retry ([research.md R-003](./research.md))
- [X] T038 [US2] Build the upload form in `src/app/(app)/upload/page.tsx` with the four dependent menus, clearing dependents when a parent changes, plus progress and the confirmation showing final name, folder, and status
- [X] T039 [P] [US2] Build the uploader's read-only list in `src/app/(app)/my-files/page.tsx`
- [X] T040 [US2] Add `GET /api/files` in `src/app/api/files/route.ts` with server-applied uploader scoping — the filter is never client-supplied
- [X] T041 [US2] Implement the duplicate-name refusal path end to end in `src/lib/uploads/authorize.ts`: unique index plus a live Dropbox check, returning `409 duplicate_name` naming the conflicting file (FR-016)

**Checkpoint**: Uploads are standardized and enforced; Principle I is demonstrable in the network tab.

---

## Phase 5: User Story 3 - Advance a file through the approval pipeline (Priority: P3)

**Goal**: An Admin moves a file one step forward or any number back; missing counterpart folders are
created and the file is relocated under the same name, with an immutable audit entry.

**Independent Test**: Take an uploaded file (from US2 or the seed), delete its counterpart folder
under the next status in Dropbox, advance the file, and verify the folder was recreated, the file
moved with an unchanged name, and the history recorded actor and both statuses.

### Tests for User Story 3

- [X] T042 [P] [US3] Unit-test transition legality in `tests/unit/workflow.test.ts` across a workflow long enough to separate "next" from "any earlier": every legal move allowed, every illegal move refused **(Constitution V — mandatory)**
- [X] T043 [P] [US3] Integration-test transitions in `tests/integration/transition.test.ts`: counterpart auto-creation, occupied destination, concurrent change, and a failed move leaving the status unchanged with a `failed` audit row

### Implementation for User Story 3

- [X] T044 [P] [US3] Implement transition legality in `src/lib/workflow/transitions.ts`, deriving the allowed set from `approval_statuses.position` — never stored (FR-034)
- [X] T045 [US3] Implement counterpart resolution and auto-creation in `src/lib/workflow/counterparts.ts`, matching on `name_normalized` and creating missing taxonomy rows plus Dropbox folders (FR-008, FR-036)
- [X] T046 [US3] Implement the transition service in `src/lib/workflow/execute.ts` as a single transaction in the exact order from [data-model.md](./data-model.md): lock the row, check legality, resolve counterparts, create folders, check occupancy, move, **then** update and audit
- [X] T047 [US3] Add `POST /api/files/[id]/transition` in `src/app/api/files/[id]/transition/route.ts` requiring `expectedCurrentStatusId` and returning `409 stale_status` on a concurrent change (FR-041)
- [X] T048 [US3] Build the Admin approval queue in `src/app/(app)/files/page.tsx` with status filtering and per-file `allowedTransitions`
- [X] T049 [US3] Build the file detail and history view in `src/app/(app)/files/[id]/page.tsx` showing the append-only transition trail
- [X] T050 [P] [US3] Add `GET /api/files/[id]/link` in `src/app/api/files/[id]/link/route.ts` returning a time-limited link, never a permanent public URL (FR-043)
- [X] T051 [US3] Surface broken records in `src/lib/files/integrity.ts` and the file views: an object missing at its recorded path shows as `broken`, never as valid (FR-042)

**Checkpoint**: The physical pipeline works, is audited, and fails safely.

---

## Phase 6: User Story 4 - Manage the taxonomy (Priority: P4)

**Goal**: An Admin builds and reorders the categorization tree without developer involvement.

**Independent Test**: Create a Quest under one status, confirm it appears in the upload form only for
that status, reorder two statuses, and confirm the permitted transitions change accordingly.

### Tests for User Story 4

- [X] T052 [P] [US4] Integration-test taxonomy CRUD in `tests/integration/taxonomy.test.ts`: sibling name collision, in-use deletion refusal, and reorder leaving positions contiguous and unique

### Implementation for User Story 4

- [X] T053 [US4] Add Approval Status CRUD and the transactional reorder in `src/app/api/taxonomy/statuses/route.ts` and `src/app/api/taxonomy/statuses/reorder/route.ts` (FR-024)
- [X] T054 [P] [US4] Add Quest CRUD in `src/app/api/taxonomy/quests/route.ts` and `.../quests/[id]/route.ts`, parented to an Approval Status
- [X] T055 [P] [US4] Add Mission CRUD in `src/app/api/taxonomy/missions/route.ts` and `.../missions/[id]/route.ts`, parented to a Quest
- [X] T056 [P] [US4] Add Stage CRUD in `src/app/api/taxonomy/stages/route.ts` and `.../stages/[id]/route.ts`, parented to a Mission, name only
- [X] T057 [US4] Build the Approval Status screen with up/down ordering in `src/app/(app)/taxonomy/statuses/page.tsx`
- [X] T058 [P] [US4] Build the Quest, Mission, and Stage screens in `src/app/(app)/taxonomy/{quests,missions,stages}/page.tsx` with parent-chain navigation (FR-028)
- [X] T059 [US4] Implement in-use refusal, the deactivation alternative, and child-impact messaging in `src/lib/taxonomy/lifecycle.ts` (FR-029, FR-030)

**Checkpoint**: The taxonomy is self-service; no developer is needed to add a Quest.

---

## Phase 7: User Story 5 - Administer user accounts (Priority: P5)

**Goal**: An Admin manages accounts and roles, and the system can never be left without an Admin.

**Independent Test**: Create an Uploader, sign in as them to confirm their access, promote them to
Admin, and confirm the access changes on their next request without a redeploy.

### Tests for User Story 5

- [X] T060 [P] [US5] Integration-test user management in `tests/integration/users.test.ts`: role change taking effect on the next request, deactivated sign-in refusal, and the last-admin guard

### Implementation for User Story 5

- [X] T061 [US5] Add user CRUD in `src/app/api/users/route.ts` and `src/app/api/users/[id]/route.ts`
- [X] T062 [US5] Implement the last-admin guard in `src/lib/auth/admin-guard.ts` as a transaction counting remaining active Admins `FOR UPDATE` before committing a delete, deactivate, or demote (FR-005)
- [X] T063 [P] [US5] Build the user administration screen in `src/app/(app)/users/page.tsx`

**Checkpoint**: All five stories are independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T064 [P] Run the design system adherence check using `Vault Design System/_adherence.oxlintrc.json` and fix violations — no hardcoded colors, spacing, or shadows (Constitution VI)
- [X] T065 [P] Audit every user-facing string for English-only compliance across `src/app/` and `src/components/` (FR-044)
- [X] T066 Add the constitution compliance test in `tests/integration/constitution.test.ts`: no route accepts a binary or multipart body, no response leaks a refresh token or database credential, and no Dropbox SDK import exists outside the adapter
- [X] T067 [P] Write `README.md` with local setup and the Hostinger deployment procedure from [quickstart.md](./quickstart.md)
- [~] T068 Run the full V1–V6 validation sequence from [quickstart.md](./quickstart.md) against a local instance
  - **V1 (access) — PASSED** against a running instance: every screen redirects to sign-in when
    anonymous, and every API route returns a `401` envelope. This run found and fixed a real
    defect: the proxy was redirecting API routes instead of letting them answer `401`.
  - **V2–V6 — BLOCKED** on `DROPBOX_REFRESH_TOKEN`, which needs the Dropbox app's scopes
    submitted in the App Console first. Their logic is covered by the automated suites
    (upload, transition, taxonomy, users), but the real Dropbox round-trip is unverified.
- [ ] T069 Deploy to Hostinger per [quickstart.md](./quickstart.md) and re-run V2, confirming in the network tab that file bytes reach Dropbox and never the app server
  - **NOT DONE** — requires the owner's Hostinger account. The build is deployment-ready
    (`output: 'standalone'`, all configuration in environment variables).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — **blocks every user story**
- **User Stories (Phases 3–7)**: all depend on Foundational
- **Polish (Phase 8)**: depends on the stories you intend to ship

### User Story Dependencies

Stated honestly rather than aspirationally:

- **US1 (P1)**: no dependencies beyond Foundational. Genuinely standalone.
- **US2 (P2)**: needs US1's session and guards to know who is uploading, and needs taxonomy rows — supplied by the seed (T019) until US4 exists.
- **US3 (P3)**: needs at least one file record. Produced by US2, or by the seed. Testable independently of US2's *interface* once a file exists.
- **US4 (P4)**: independent of US2 and US3. Replaces the seed as the source of taxonomy.
- **US5 (P5)**: independent of US2–US4. Replaces the seed as the source of accounts.

### Within Each User Story

- The mandatory test suites (T014, T020, T042) are written first and must fail before implementation
- Schema and libraries before services; services before routes; routes before screens

### Parallel Opportunities

- Setup: T002, T003, T004, T005 in parallel after T001
- Foundational: T009, T010, T011, T015, T016, T017 in parallel after T007/T008. T012 and T013 must follow T010
- Once Foundational completes, **US4 and US5 can be built in parallel with US1–US3** by separate developers — they touch different routes and screens
- Within US2: T032 and T039 are parallel-safe; T033–T036 are sequential (shared services)
- Within US4: T054, T055, T056 are parallel (different route files), as are T058's screens

---

## Parallel Example: Foundational Phase

```bash
# After T007 (schema) and T008 (migration) land, launch together:
Task: "Create the MySQL connection pool in src/lib/db/client.ts"
Task: "Define the storage port interface in src/lib/storage/port.ts"
Task: "Implement name and path construction in src/lib/naming/index.ts"
Task: "Define shared Zod schemas in src/lib/validation/"
Task: "Build the app shell in src/app/layout.tsx and base components in src/components/"
```

## Parallel Example: User Story 4

```bash
# Different route files, no shared state:
Task: "Add Quest CRUD in src/app/api/taxonomy/quests/route.ts"
Task: "Add Mission CRUD in src/app/api/taxonomy/missions/route.ts"
Task: "Add Stage CRUD in src/app/api/taxonomy/stages/route.ts"
```

---

## Implementation Strategy

### MVP scope

**Phases 1–4 (T001–T041): Setup + Foundational + US1 + US2.**

US1 alone is a locked door with nothing behind it — technically a working increment, but not
something to show anyone. The first genuinely demonstrable product is a signed-in Uploader placing a
correctly named file in the right Dropbox folder. That is 41 tasks, and it proves the riskiest part
of the architecture (browser-direct upload with no bytes through the app) before anything else is
built on top of it.

### Incremental delivery

1. Setup + Foundational → the storage contract passes against both implementations
2. **+ US1** → the app is closed to the public
3. **+ US2** → **MVP**: standardized uploads work. Stop and validate against quickstart V1–V3
4. **+ US3** → the approval pipeline moves files. Validate V4–V5
5. **+ US4** → taxonomy becomes self-service; retire the seed for taxonomy
6. **+ US5** → account management; retire the seed for users
7. Polish → validate V6, then deploy

### Parallel team strategy

After Foundational: one developer takes US1 → US2 → US3 (the critical path, sequential by nature),
while a second takes US4 and US5 in parallel — they share no files with the upload path.

---

## Deviations from the plan

Both are recorded here because the constitution requires a deviation to be written down with its
reason and the rejected alternative.

1. **No Tailwind (T004).** The plan called for a Tailwind theme generated from the design system
   tokens. The design system turned out to ship 24 working React components already driven by its
   CSS custom properties, so Tailwind would have been a second styling system layered over the
   first — exactly what Principle VI forbids. `npm run ds:sync` copies the components and tokens
   into `src/` instead. Rejected alternative: mapping every token into a Tailwind theme, which
   duplicates the token set and lets the two drift.

2. **JWT session cookie instead of database sessions (T022).** Auth.js does not support database
   sessions with the Credentials provider — it requires the JWT strategy. Rather than hand-roll a
   session layer (which research.md R-005 rejected), the cookie carries only the user id and every
   authorization decision re-reads the user row from the database. The property the plan wanted —
   a role change or deactivation taking effect on the next request — holds, and is asserted in
   `tests/integration/authorization.test.ts`. The now-unused `sessions` table was removed from the
   schema before the first migration was applied.

## Notes

- The three constitution-mandated suites are **T014** (storage port contract), **T020** (route
  authorization), and **T042** (transition rules). None of them is optional, and T014 must pass
  against both the fake and the real adapter.
- **T034 is the task to watch**: if `/api/uploads/authorize` ever grows a file body, Constitution
  Principle I has been violated. T066 asserts this automatically.
- Blocked on external setup: T012, T013, and T069 need `DROPBOX_REFRESH_TOKEN` in `.env.local`, which
  requires the scopes submitted in the Dropbox App Console first.
- Commit after each task or logical group. Stop at any checkpoint to validate a story on its own.
