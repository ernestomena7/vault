# Quickstart & Validation Guide: Vault

**Date**: 2026-09-02 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

How to run Vault locally and prove the feature works end to end. Implementation detail belongs in
`tasks.md`; this document is the run-and-verify guide.

## Prerequisites

- **Node.js 22 LTS** — matches the Hostinger target ([research.md R-001](./research.md))
- **MySQL 8** reachable locally
- A **Dropbox app registration** with:
  - Access type **App folder** — not Full Dropbox. This is the primary containment for the
    browser-held upload token ([research.md R-002](./research.md)). It **cannot be changed later**;
    a wrong choice means deleting the app and starting over
  - Scopes `files.content.write`, `files.content.read`, `files.metadata.read`, `sharing.write`,
    enabled on the *Permissions* tab and **submitted** — scopes are not applied until submitted, and
    the refresh token must be obtained *after* they are
  - A **refresh token** obtained once via the OAuth code flow with `token_access_type=offline`
  - The Approval Status folder tree living **inside the app folder** (`/Apps/Vault/`). Paths are
    stored relative to it: `/01 Pending`, never `/Apps/Vault/01 Pending`

## Environment

Copy `.env.example` to `.env.local` and fill it in. Every value is required; the app fails fast at
startup on a missing one (Constitution III — nothing host-specific is hardcoded).

```bash
DATABASE_URL="mysql://vault:secret@127.0.0.1:3306/vault"
AUTH_SECRET="<openssl rand -base64 32>"
AUTH_URL="http://localhost:3000"
DROPBOX_APP_KEY="..."
DROPBOX_APP_SECRET="..."
DROPBOX_REFRESH_TOKEN="..."
DROPBOX_ROOT_PATH=""          # empty for an App-folder app
UPLOAD_CHUNK_SIZE_BYTES=8388608
```

`.env.local` is git-ignored. No credential is ever committed.

## Setup

```bash
npm install
npm run db:migrate          # applies committed SQL migrations, forward-only
npm run db:seed             # one Admin + a sample taxonomy tree
npm run dev                 # http://localhost:3000
```

The seed prints the Admin's email and generated password once. Change it after first sign-in.

Because the taxonomy is duplicated per Approval Status, the seed creates the same Quest/Mission/Stage
tree under **each** status, which is what lets you exercise a transition without hand-building the
counterpart first.

## Validation scenarios

Each maps to a user story in [spec.md](./spec.md). Run them in order — later ones depend on data the
earlier ones create.

### V1 — Access is gated by role (US1)

1. Signed out, open `/upload`, `/files`, `/taxonomy/statuses`, `/users` → each redirects to sign-in
   and leaks no data.
2. Sign in as an Uploader. `/upload` and `/my-files` load; `/files`, `/taxonomy/*`, `/users` are
   refused with a permission message, **including by direct URL**.
3. `curl -X POST localhost:3000/api/files/1/transition` with the Uploader's cookie → `403`.
4. Sign in with a wrong password → refused, with no hint about whether the account exists.

**Pass**: every combination behaves as above. This is SC-003.

### V2 — Upload lands with the enforced name and path (US2)

1. As an Uploader, open `/upload`.
2. Pick a status → the Quest menu populates with that status's Quests only. Pick a Quest → Missions
   filter. Pick a Mission → Stages filter. **Change the status** → the three below clear (FR-011).
3. Submit with a selection missing → blocked, the missing field named.
4. Select a real video (ideally **over 150 MB**, to exercise the chunked session path that the
   product's real files require) and upload. Watch progress advance.
5. On success, confirm the screen shows the final name, folder, and status.

**Verify in Dropbox**: the file exists at `/[Status]/[Quest]/[Mission]/` named exactly
`Quest - Mission - Stage.ext`.

**Verify the constitution holds** — this is the check that matters most:

- Open the browser's network tab. The large request bodies go to `content.dropboxapi.com`, **not** to
  `localhost:3000`. Vault's own requests are small JSON.
- No Vault route received the file. `POST /api/uploads/authorize` and `/confirm` carry metadata only.

**Pass**: SC-001, and Constitution Principle I demonstrated rather than assumed.

### V3 — Duplicate names are refused (FR-016)

Repeat V2 with the identical four selections and the same extension.

**Pass**: refused with `409`, naming the conflicting file. Dropbox is unchanged, no `files` row is
created, and the original file is **not** overwritten. This is SC-006.

### V4 — The pipeline moves files and creates what it needs (US3)

1. As an Admin, open `/files` and find the file from V2.
2. Confirm the offered targets are the next status forward **plus every earlier one** — a two-step
   forward jump is not offered (FR-034/FR-035).
3. Delete the counterpart Quest folder under the *next* status in Dropbox, so the structure is
   genuinely missing.
4. Advance the file one step.

**Verify**: the folder was recreated, the file is gone from the old location and present at the new
one **under the same name**, and the file's history shows previous status, new status, actor, and
time (FR-040).

5. Move the file back **two or more** steps in one action → permitted.
6. Attempt an illegal two-step forward jump via the API → `422` with the permitted set returned.

**Pass**: SC-004, SC-005, SC-007.

### V5 — Concurrency and failure leave no mess

1. **Concurrent change**: issue two `POST /api/files/:id/transition` calls with the same
   `expectedCurrentStatusId`. One succeeds; the other gets `409 stale_status` (FR-041).
2. **Storage down**: point `DROPBOX_REFRESH_TOKEN` at an invalid value and attempt a transition →
   `502`, the file keeps its previous status, and a `failed` transition is recorded (FR-038).
3. **Failed upload**: authorize an upload, then confirm without transferring anything →
   `422 verification_failed`, and **no** `files` row is created (FR-020).

**Pass**: SC-011 — every failure is legible and leaves consistent state.

### V6 — Taxonomy and users (US4, US5)

1. Create a Quest under one status → it appears in the upload form for that status and **not** for
   others (FR-025, US4 scenario 3).
2. Reorder two statuses → the permitted transitions for existing files change accordingly, with no
   migration (FR-024).
3. Delete a taxonomy entry that files reference → `409 in_use`, with deactivation offered (FR-029).
4. Change a user's role → the new permissions apply on their **next request**, without restarting
   the app (US5 scenario 2).
5. Try to demote or delete the only Admin → refused (FR-005).

**Pass**: SC-009, SC-010.

## Automated tests

```bash
npm test                  # Vitest: unit + contract + integration
npm run test:contract     # storage port — fake and adapter, same suite
npm run typecheck
npm run lint              # includes the import-boundary rule
```

The three suites Constitution Principle V makes mandatory:

| Suite | Covers |
|---|---|
| `tests/unit/workflow` | Every legal and illegal transition across a workflow long enough to separate "next" from "any earlier" |
| `tests/integration/authorization` | Anonymous / Uploader / Admin against every mutating route |
| `tests/contract/storage` | The port contract, run against both implementations ([contracts/storage-port.md](./contracts/storage-port.md)) |

`npm test` runs with **no network access** — the Dropbox port is the fake. A suite that needs the
internet to pass has broken this rule.

## Deploying to Hostinger

1. Build with `output: 'standalone'` to keep the deployed bundle small.
2. hPanel → *Websites → Add website → Node.js Web App*, Node 22, deployed from the Git repository.
3. Set every environment variable in hPanel — never in a committed file.
4. Create the MySQL database on the same account and run `npm run db:migrate` against it.
5. Sign in as the seeded Admin, change the password, then run **V2** against production, checking the
   network tab once more: the bytes must go to Dropbox, not to the Hostinger app.

Step 5's check is the one to repeat after any change to the upload path. It is the difference between
the constitution being enforced and merely being written down.
