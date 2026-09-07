# Implementation Plan: Open a File's Dropbox Location from the Approvals Queue

**Branch**: `003-approvals-dropbox-link` *(spec directory; repository is not git-initialized)* | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-approvals-dropbox-link/spec.md`

## Summary

An Admin working the Approvals queue gets a per-row control that opens that file's exact Dropbox
location in a new tab, without losing the queue or its filter, and without accidentally also
triggering the row's existing "open detail page" click.

This is almost entirely a **UI feature**. Feature 001 already built, authorized and documented the
capability it needs — `GET /api/files/:id/link`, a time-limited link (FR-043) — but nothing in the
app has ever called it. No backend change is required. The real work is: wiring one existing endpoint
to one new client control correctly, which turns out to have two genuine hazards hiding in "correctly"
([research.md](./research.md)):

- **A popup-blocker trap (R-002, decisive)**: the link can't be a plain `<a href>` (the route returns
  JSON, not a redirect), so opening it requires an `await` before the tab opens — and several browsers
  block `window.open` once it's no longer synchronously tied to the click. Fixed by opening a blank tab
  synchronously at click time and navigating it once the fetch resolves.
- **Event bubbling into the row's own click handler (R-003)**: the Approvals table's `<tr>` already
  opens the file detail page on click; the new control must call `stopPropagation()` or one click does
  both things at once.

One small design-system gap surfaces along the way: there is no "external-link" icon registered today
(R-004) — added to the source, then synced, not invented locally.

## Technical Context

**Language/Version**: TypeScript 5 on Node.js 22 LTS — unchanged.

**Primary Dependencies**: Next.js 16 (App Router), React 19, the Vault Design System's `Table`,
`IconButton`, `Tooltip` and `Icon` components. No new dependency.

**Storage**: No change. No new column, no migration. Reads the existing `files.integrityState` the
Approvals queue already loads.

**Testing**: Vitest. Adds one new integration suite for the previously-uncovered
`GET /api/files/:id/link` route ([research.md R-001](./research.md)) — a SHOULD under Constitution
Principle V, since the route is read-only and outside the MUST-covered mutating-route set, but worth
doing given it is the one route whose job is handing out file links.

**Target Platform**: Hostinger Business managed Node app; portable to GCP. Unchanged — no server
surface added.

**Project Type**: Modification of an existing single Next.js project.

**Performance Goals**: A link request resolves and opens within the time an Admin would tolerate for
any single click (well under 1s server-side per SC-001's "single action" framing); viewing the queue,
at any length, must generate zero link requests on its own (SC-004).

**Constraints**: No file bytes traverse the app (unchanged — this feature never touches file bytes at
all, only a URL to Dropbox's own hosting of them). The link remains time-limited, never permanent,
never a credential (FR-005, carries FR-043 forward). English-only, dark-theme-only UI from the design
system (Constitution VI).

**Scale/Scope**: One new column in one existing table, one new small client component, one new icon
registry entry, one new test file. No entities, no migrations, no new routes.

## Constitution Check

*GATE: evaluated before Phase 0 and re-evaluated after Phase 1 design.*

| Principle | Gate | Pre-Phase 0 | Post-Phase 1 |
|---|---|---|---|
| **I. Dropbox is the file system of record** | No file bytes in the DB, on app disk, or through an app route | PASS — this feature only ever hands the browser a URL Dropbox itself resolves; the app never touches file bytes | **PASS** — unchanged; confirmed by [contracts/api.md](./contracts/api.md), no request or response carries file content |
| **II. Approval workflow integrity** | Explicit state, server-validated transitions, append-only audit | PASS — no workflow state is read, written, or influenced by this feature | **PASS** — unchanged; `integrityState` is read, never written, by this feature |
| **III. Portable hosting boundary** | Plain Node server; providers behind module boundaries | PASS | **PASS** — no new provider surface; the existing storage-port method (`createTemporaryLink`) is reused unchanged, not called from anywhere new outside the port |
| **IV. Server-held secrets, least privilege** | No credentials in the browser beyond a short-lived scoped token; server-side authz | PASS — the response already contains only a time-limited link, never a credential | **PASS** — [data-model.md](./data-model.md) confirms nothing new crosses the client/server boundary beyond the existing `{url, expiresAt}` shape |
| **V. Schema and contract discipline** | Versioned migrations; typed, validated boundaries; the three mandatory suites | PASS — no schema change | **PASS** — no migration; the route's existing authorization is now also asserted by an integration test, closing a real gap on risk grounds rather than constitutional mandate ([research.md R-001](./research.md)) |
| **VI. Design system fidelity** | Design-system tokens and components only; dark-only; English-only | PASS | **PASS** — built from `Table`, `IconButton`, `Tooltip`, and one new registered `Icon` glyph added to the design system source first, then synced (`npm run ds:sync`), per the established extension pattern |

**Gate result: PASS.** No principle is bent; nothing in Complexity Tracking is required for this
feature (see below — this section is included only to state that explicitly, not because a deviation
exists).

## Project Structure

### Documentation (this feature)

```text
specs/003-approvals-dropbox-link/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── api.md            # Existing endpoint's contract, referenced not redefined + new client contract
├── checklists/
│   └── requirements.md
└── tasks.md              # Created by /speckit-tasks
```

### Source Code — changes to the existing tree

```text
Vault Design System/
└── components/foundations/
    └── Icon.jsx                          CHANGED  adds `external-link` to the ICONS map

src/
├── components/
│   ├── files-table.tsx                   CHANGED  adds one column rendering the new control
│   └── dropbox-link-button.tsx           NEW      per-row control: busy state, tab-then-navigate,
│                                                   disabled+tooltip when integrityState is 'broken'
└── styles/tokens/                        (re-synced via `npm run ds:sync`, no manual edits)

tests/
└── integration/
    └── link-route.test.ts                NEW      success, not_found, storage_unavailable,
                                                     ownership scoping for GET /api/files/:id/link
```

No change to: `src/app/api/files/[id]/link/route.ts` (already correct and complete, per
[research.md](./research.md)'s reading of it), `src/lib/storage/*`, `src/lib/db/schema.ts`, or any
migration.

**Structure Decision**: No structural change. This lands as one new leaf component consumed by one
existing table, plus one design-system icon addition and one new test file. Nothing about the
project's module boundaries, routing, or storage layering changes — the feature is additive at the
UI edge, which is exactly what its "almost entirely a UI feature" framing in the spec predicts.

## Complexity Tracking

*No entries.* No principle required bending and no structural deviation was needed — this table is
included empty, deliberately, rather than omitted, so the plan's completeness is explicit rather than
assumed.
