# Implementation Plan: Multi-File Upload with Per-File Stages and Distinguishing Text

**Branch**: `002-multi-file-upload` | **Date**: 2026-09-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-multi-file-upload/spec.md`

## Summary

An Uploader picks Approval Status, Quest and Mission **once**, adds up to 20 files, and gives each
one a Stage and an optional distinguishing text. The server validates the whole batch, refuses it
outright if any two files would collide or if a name is already taken, then hands back one grant per
file. The browser transfers them one at a time, straight to Dropbox. Files that land are recorded;
if any sibling failed, the ones that landed are marked as belonging to an unfinished set.

This is **not** a greenfield build. Feature 001 is implemented and running, so the work is a set of
changes to existing modules — and one of them is the naming rule that everything else depends on.
Two findings shape the plan:

- **The naming convention changes** (`[Quest] - [Mission] - [Stage] - [Text]`), which touches the
  naming module, the upload form, the validation schemas and the `files` table.
- **The binding limit is the full path, not the file name** — Dropbox paths must stay under 260
  characters, and this deployment's root already consumes about 90 of them. The existing code caps
  the assembled name at 120 (too tight for four parts) and never checks the path at all, which is a
  latent defect in 001 that this feature must fix rather than inherit
  ([research.md R-004](./research.md)).

## Technical Context

**Language/Version**: TypeScript 5 on Node.js 22 LTS — unchanged

**Primary Dependencies**: Next.js 16 (App Router), React 19, Auth.js v5, Drizzle ORM + `mysql2`, the
Dropbox SDK behind the storage port, Zod, Vault Design System components — all unchanged. This
feature adds no dependency.

**Storage**: MySQL 8 gains two columns on `files`. Dropbox unchanged. No file bytes anywhere but
Dropbox.

**Testing**: Vitest. The three constitution-mandated suites are extended, not replaced: naming gains
four-part cases, the transition rules are untouched, and the storage port contract is unchanged
because the port itself does not change.

**Target Platform**: Hostinger Business managed Node app; portable to GCP. Unchanged.

**Project Type**: Modification of an existing single Next.js project.

**Performance Goals**: A 20-file batch is validated and either refused or authorized in under 5
seconds (SC-005). Transfer time is the network's, not the app's — the app is never in the data path.

**Constraints**: File bytes MUST NOT traverse the application, for batches exactly as for single
uploads. Assembled Dropbox paths MUST stay under 255 characters. Maximum 20 files per batch.
English-only interface, dark-theme-only UI from the design system.

**Scale/Scope**: Same team as 001 — tens of users, thousands of files. Roughly 6 modules changed, 2
added, 1 migration, 1 screen substantially reworked.

## Constitution Check

*GATE: evaluated before Phase 0 and re-evaluated after Phase 1 design.*

| Principle | Gate | Pre-Phase 0 | Post-Phase 1 |
|---|---|---|---|
| **I. Dropbox is the file system of record** | No file bytes in the DB, on app disk, or through an app route | PASS — batching changes how many transfers there are, not who performs them | **PASS** — the authorize route still accepts metadata only, now as an array; the existing constitution test that forbids `formData()` on any route covers it unchanged |
| **II. Approval workflow integrity** | Explicit state, server-validated transitions, append-only audit | PASS — untouched | **PASS** — each file still gets its initial-placement audit entry; nothing in the workflow changes |
| **III. Portable hosting boundary** | Plain Node server; providers behind module boundaries | PASS | **PASS** — the storage port is deliberately left unchanged (research R-002); no new provider surface |
| **IV. Server-held secrets, least privilege** | No credentials in the browser beyond a short-lived scoped token; server-side authz | PASS with the same accepted risk as 001 | **PASS** — one reduced-scope token per batch instead of per file, same scope and same lifetime, fewer exchanges (research R-003) |
| **V. Schema and contract discipline** | Versioned migrations; typed, validated boundaries; the three mandatory suites | PASS | **PASS** — one forward-only additive migration; Zod at the batch boundary; naming and authorization suites extended |
| **VI. Design system fidelity** | Design-system tokens and components only; dark-only; English-only | PASS | **PASS** — the file list is built from `Table`, `Select`, `Input` and `ProgressBar`; no new component and no new styling system |

**Gate result: PASS.** No principle is bent. Two items carry accepted limitations rather than clean
passes; both are in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-multi-file-upload/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # Changed and added HTTP contracts
├── checklists/
│   └── requirements.md
└── tasks.md             # Created by /speckit-tasks
```

### Source Code — changes to the existing tree

```text
src/
├── app/
│   ├── (app)/upload/
│   │   ├── page.tsx                      CHANGED  passes stages per mission
│   │   └── upload-form.tsx               REWORKED file list, per-file stage + text
│   └── api/uploads/
│       ├── authorize/route.ts            CHANGED  accepts an array of files
│       ├── confirm/route.ts              UNCHANGED
│       └── finalize/route.ts             NEW      sets or clears the incomplete mark
├── components/
│   ├── files-table.tsx                   CHANGED  shows the incomplete mark
│   └── batch-file-row.tsx                NEW      one row of the upload list
└── lib/
    ├── naming/index.ts                   CHANGED  four-part name, path length check
    ├── validation/index.ts               CHANGED  batch schema, distinguishing text
    ├── uploads/
    │   ├── authorize.ts                  CHANGED  batch authorization + pre-flight
    │   ├── confirm.ts                    CHANGED  records the distinguishing text
    │   ├── finalize.ts                   NEW      marking and clearing
    │   └── client-uploader.ts            CHANGED  sequential batch orchestration
    └── db/
        ├── schema.ts                     CHANGED  two columns on files
        ├── migrations/0001_*.sql         NEW
        └── queries/files.ts              CHANGED  exposes the mark

tests/
├── unit/naming.test.ts                   EXTENDED four-part names, path length
├── integration/upload.test.ts            EXTENDED batch cases, conflicts, marking
└── integration/authorization.test.ts     EXTENDED the new finalize route
```

**Structure Decision**: No structural change. The feature lands entirely inside the boundaries
feature 001 established — the naming rule stays in one module, storage stays behind the port, and the
upload flow keeps its authorize → transfer → confirm shape with an array where a single object used
to be. The one new module (`finalize.ts`) exists because marking is a distinct operation on already
recorded files, not part of confirming an upload.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| **Changing feature 001's naming rule**, which is its central guarantee and is already in production use | The user requires several files to share a Quest, Mission and Stage, and something must tell them apart. With the first three shared across a batch, the Stage was the only differentiator, so a batch was limited to one file per stage — which is not how the work arrives | Making the distinguishing text **mandatory** would rename every future single upload and invalidate the habit of everyone already using the tool. Optional (FR-002) keeps every existing name valid and every existing workflow working, and costs only a conditional in one function |
| **The incomplete-set mark carries no batch reference**, so a marked file cannot say which siblings were missing, and after a reload nobody can tell which marked files belonged together | FR-033, which follows directly from the user's decision that a batch is transient and introduces no stored entity | A single nullable `batch_ref` column would restore the grouping at almost no cost and is not an entity. It was excluded to honour the stated decision, not because it is expensive. Recorded as an accepted limitation and flagged for revisit if the mark proves unhelpful in use ([research.md R-005](./research.md)) |
| **The server trusts the client's report that a batch had failures** when applying the mark | The server sees only successful confirmations; it cannot know a transfer it never witnessed failed. Verifying would mean the server watching transfers, which Principle I forbids | Inferring failure from unconfirmed authorizations at expiry would mark files hours late, long after the uploader has moved on. The blast radius of a dishonest client here is a wrong badge in a list — not a wrong file, a wrong name, or a wrong permission — so client-driven marking is proportionate here where it would not be for anything the constitution protects |
| **Raising the assembled-name cap and adding a full-path check** — a change to validation that files uploaded under 001 were never subject to | Four parts do not fit under the existing 120-character cap, and nothing validates the 260-character path limit that Dropbox actually enforces. The second is a latent defect in 001 that would fail *after* a multi-gigabyte transfer | Leaving the cap alone would refuse legitimate four-part names with a message the uploader cannot act on. Leaving the path unchecked would keep a failure that surfaces at the worst possible moment. Both are cheap to fix here and expensive to fix later |
