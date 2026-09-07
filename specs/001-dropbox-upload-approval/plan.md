# Implementation Plan: Vault — Standardized Dropbox Upload & Approval Pipeline

**Branch**: `001-dropbox-upload-approval` | **Date**: 2026-09-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-dropbox-upload-approval/spec.md`

## Summary

Vault is a role-gated Next.js web application that standardizes how video files enter Dropbox. An
Uploader picks a file and works down four dependent menus (Approval Status → Quest → Mission →
Stage); the server computes the enforced name `[Quest] - [Mission] - [Stage].[ext]` and the
destination path `/[Status]/[Quest]/[Mission]/`, then authorizes the browser to send the file
**directly to Dropbox**. Admins move files one step forward or any number of steps back along the
workflow order; each move creates any missing counterpart folders under the target status and
relocates the file, recording an append-only audit entry.

The architecture is shaped by one hard finding ([research.md R-002](./research.md)): Dropbox's
token-free pre-signed upload link is capped at 150 MB, well under the multi-hundred-megabyte videos
this product exists for. Since the constitution forbids file bytes from reaching the application at
all, the only remaining path is **browser-driven upload sessions using a per-upload,
write-only-scoped, short-lived Dropbox token** minted by the server — with the server independently
verifying the resulting file before it records anything. MySQL holds metadata, taxonomy, approval
state, and audit history; it never holds a byte of file content.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS

**Primary Dependencies**: Next.js 16 (App Router, `output: 'standalone'`), React 19, Auth.js
(NextAuth v5) with the Credentials provider, Drizzle ORM + drizzle-kit, `mysql2`, the official
Dropbox JavaScript SDK (server-side only), Zod for boundary validation, Tailwind CSS driven by the
Vault Design System tokens

**Storage**: MySQL 8 for metadata, taxonomy, sessions, and audit history. Dropbox for all file
content — no file bytes in the database, on disk, or in application memory

**Testing**: Vitest for unit and integration tests; the Dropbox port exercised through an in-memory
fake so the suite runs offline; integration tests against a local MySQL scratch schema

**Target Platform**: Hostinger Business plan, managed Node.js web app (Node 18/20/22/24 supported,
up to five apps). Portable to GCP Cloud Run without application changes

**Project Type**: Server-rendered web application — a single Next.js project, not a split
frontend/backend

**Performance Goals**: Upload authorization and status-change confirmation under 2 s at the 95th
percentile (both are small metadata requests). A status change including folder creation completes in
under 30 s (SC-004). File transfer speed is Dropbox's and the user's network's concern, not the
app's — the app is never in the data path

**Constraints**: File bytes MUST NOT traverse the application (Constitution I). No Dropbox credential
in the browser beyond a per-upload write-only short-lived token (Constitution IV). Shared hosting:
assume constrained request bodies, request timeouts, and no durable background workers. English-only
interface. Dark-theme-only UI from the Vault Design System

**Scale/Scope**: A single team — tens of users, thousands of files, a handful of Approval Statuses.
Roughly 12 screens across five user stories. Individual files from a few MB to a few GB

## Constitution Check

*GATE: evaluated before Phase 0 and re-evaluated after Phase 1 design.*

| Principle | Gate | Pre-Phase 0 | Post-Phase 1 |
|---|---|---|---|
| **I. Dropbox is the file system of record** | No file bytes in the DB, on app disk, or through an app route | PASS — design routes bytes browser → Dropbox only | **PASS** — no route accepts a file body; `pending_uploads` records intent, never content |
| **II. Approval workflow integrity** | Explicit state, server-validated transitions, append-only audit | PASS | **PASS** — `file_transitions` is insert-only; legality derived from `position` server-side; no client-supplied status is trusted |
| **III. Portable hosting boundary** | Plain Node server; providers behind module boundaries | PASS | **PASS** — `lib/storage/port.ts` is the only Dropbox contract; the SDK is imported solely by `lib/storage/dropbox/`. No route or component imports a provider SDK |
| **IV. Server-held secrets, least privilege** | No credentials in the browser; server-side authz on every route; time-limited links | PASS with a noted risk | **PASS with accepted residual risk** — see Complexity Tracking |
| **V. Schema and contract discipline** | Versioned migrations; typed, validated boundaries; the three mandatory test suites | PASS | **PASS** — drizzle-kit SQL migrations committed; Zod at every route boundary; transition, authorization, and Dropbox-port contract suites planned |
| **VI. Design system fidelity** | Design-system tokens and components only; dark-only; English-only | PASS | **PASS** — Tailwind theme generated from `Vault Design System/tokens`; no second styling system; no locale layer |

**Gate result: PASS.** One item carries an accepted residual risk rather than a clean pass; it is
documented in Complexity Tracking and in [research.md R-002](./research.md), and it is a consequence
of a Dropbox platform limit, not of a design shortcut.

## Project Structure

### Documentation (this feature)

```text
specs/001-dropbox-upload-approval/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── api.md           # HTTP route contracts
│   └── storage-port.md  # Dropbox port contract (adapter + fake both satisfy it)
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Created by /speckit-tasks, not by this command
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (auth)/sign-in/                  # Public sign-in screen
│   ├── (app)/
│   │   ├── upload/                      # Upload form — US2
│   │   ├── my-files/                    # Uploader's own files, read-only
│   │   ├── files/                       # Admin approval queue — US3
│   │   ├── taxonomy/
│   │   │   ├── statuses/                # US4: statuses + workflow ordering
│   │   │   ├── quests/
│   │   │   ├── missions/
│   │   │   └── stages/
│   │   └── users/                       # US5
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   ├── uploads/authorize/           # Issues path, name, session, scoped token
│   │   ├── uploads/confirm/             # Verifies with Dropbox, then records
│   │   ├── files/[id]/transition/       # Status change — folder create + move
│   │   ├── taxonomy/{statuses,quests,missions,stages}/
│   │   └── users/
│   └── layout.tsx
├── components/                          # Built from the Vault Design System kit
├── lib/
│   ├── auth/                            # Auth.js config, scrypt hashing, role guards
│   ├── db/
│   │   ├── schema.ts                    # Drizzle schema
│   │   ├── migrations/                  # Committed SQL, forward-applied
│   │   └── queries/
│   ├── storage/
│   │   ├── port.ts                      # The only storage contract the app knows
│   │   ├── dropbox/                     # Sole importer of the Dropbox SDK
│   │   └── fake/                        # In-memory implementation for tests
│   ├── workflow/                        # Transition legality, counterpart resolution
│   ├── naming/                          # Standard name + path construction
│   ├── validation/                      # Zod schemas shared by routes and forms
│   └── config/                          # Env parsing; fails fast on a missing var
└── styles/
    └── tokens.css                       # Generated from the design system tokens

tests/
├── unit/                                # naming, transition rules, normalization
├── contract/                            # storage port: fake and adapter, same suite
└── integration/                         # routes + DB: authorization, upload, transition
```

**Structure Decision**: A single Next.js project. Next.js is both the server and the client here, so
a `backend/` + `frontend/` split would add a network hop and a deployment unit for no benefit, and
Hostinger's managed Node hosting expects one app. The boundaries the constitution requires are
enforced *within* `src/lib/` — `storage/port.ts` is the only storage contract the rest of the app may
reference, and the Dropbox SDK is imported nowhere outside `lib/storage/dropbox/`. That single rule is
what makes the future GCP move a deployment change rather than a rewrite, and it is cheap to check in
review with a lint rule on import paths.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Browser holds a short-lived Dropbox token (`files.content.write` only, App-folder-scoped, minted per upload) — a partial tension with Principle IV's preference for no browser credential | Principle I forbids bytes reaching the app, and Dropbox's token-free pre-signed link is capped at 150 MB while the product's files run to gigabytes. Upload sessions are the only mechanism that covers the real file sizes, and every session call requires an `Authorization` header | Proxying bytes through the server is a direct Principle I violation and collides with shared-hosting limits. A hybrid (pre-signed link under 150 MB, session above) doubles the upload path and its tests to protect the *rare* case while the common case still mints a token. Principle IV explicitly permits "a short-lived, narrowly scoped credential… issued per request", which this is |
| `pending_uploads` table — an extra entity with no counterpart in the spec | The server authorizes an upload it will not witness. Without a record of what was authorized, the confirm step would have to trust the browser's claim about where the file went and what it was called, making the enforced naming convention advisory rather than enforced | Trusting the client's confirm payload defeats SC-001 (100% naming compliance). Deriving everything again at confirm time from a re-submitted form is the same table with worse integrity — it could not detect a client that changed its selections mid-upload |
| A generated `name_normalized` column on quests, missions, and stages | The user's chosen taxonomy model duplicates the tree under every Approval Status, so every transition must resolve a counterpart by name (FR-008/FR-036). The match must be deterministic and indexed | Matching on the raw name makes casing and stray whitespace produce silent duplicate branches. Normalizing at read time cannot use an index and would scan the table on every transition |
