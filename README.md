# Vault

The standard upload tool for Dropbox. Vault enforces one naming convention and one folder
hierarchy for video files, and moves each file through an approval workflow that physically
relocates it between Dropbox folders.

Files are named:

```text
[Quest] - [Mission] - [Stage].[ext]
[Quest] - [Mission] - [Stage] - [Distinguishing text].[ext]
```

The distinguishing text is optional, and exists so several files can share a Quest, Mission and
Stage — three takes of one scene, say — and still be told apart. A file without one keeps the
three-part name exactly.

Several files can be uploaded at once: the Approval Status, Quest and Mission are chosen once and
shared, while the Stage and the distinguishing text are set per file.

**Files never pass through this application.** The browser transfers them straight to Dropbox;
the server authorizes the transfer, decides the name and destination, and records what happened.
That is a governing rule, not an optimization — see
[the constitution](.specify/memory/constitution.md), Principle I.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 |
| Database | MySQL 8 via Drizzle ORM, forward-only SQL migrations |
| Storage | Dropbox, behind a single port at `src/lib/storage/port.ts` |
| Auth | Auth.js v5, credentials provider, scrypt from `node:crypto` |
| UI | The Vault Design System — tokens and components, dark theme only |
| Tests | Vitest; the default run needs no network |

## Getting started

```bash
npm install
docker compose up -d          # MySQL 8 on port 3307
cp .env.example .env.local    # then fill it in — see below
npm run db:migrate
npm run db:seed               # prints an admin password once
npm run dev                   # http://localhost:3000
```

### Environment

Every variable is required and validated at first use; the app refuses to run with one missing.

The Dropbox values need an app registered at
[dropbox.com/developers](https://www.dropbox.com/developers/apps):

1. **Choose the access type carefully — it cannot be changed later.** A different choice means
   deleting the app and registering a new one.
   - **App folder** confines the app, and the short-lived upload token the browser holds, to
     `/Apps/<app>/`. Safest, and correct when Vault owns its own folder.
   - **Full Dropbox** is required when the status folders live anywhere else — for instance inside
     a shared team folder. The upload token then has write scope over the whole account, which is a
     real widening of what a leaked token could reach. This deployment uses it deliberately.
2. On *Permissions*, enable `files.content.write`, `files.content.read`, `files.metadata.read`
   and `sharing.write`, then press **Submit**. Scopes do not apply until submitted.
3. Obtain a refresh token once — the procedure is in
   [quickstart.md](specs/001-dropbox-upload-approval/quickstart.md).

Folder paths are stored **relative to `DROPBOX_ROOT_PATH`**: `/01 Assets`, never the root repeated.
Leave the root empty for an App-folder app, since Dropbox already scopes those paths.

**On a Dropbox Business account**, set `DROPBOX_PATH_ROOT_NAMESPACE_ID` to the `root_namespace_id`
reported by `who_am_i`. Without it the API works in the member's *personal* namespace, where a team
folder does not exist and every path returns "not found" — a failure that looks exactly like a
missing folder.

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (`output: 'standalone'`) |
| `npm test` | Full suite, offline |
| `npm run test:contract` | Storage port contract, both implementations |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint, including the storage-boundary rule |
| `npm run db:generate` | Generate a migration from a schema change |
| `npm run db:migrate` | Apply committed migrations |
| `npm run db:seed` | Seed an admin and a taxonomy tree |
| `npm run ds:sync` | Re-sync the design system into `src/` |

## How it is put together

```text
src/
├── app/            Routes and screens
├── components/
│   ├── ds/         Synced from the design system — never edited here
│   └── ...         App components built from ds
└── lib/
    ├── auth/       Sessions, password hashing, role guards
    ├── db/         Schema, migrations, queries
    ├── storage/    port.ts + dropbox/ + fake/
    ├── uploads/    Authorize, confirm, browser transfer
    ├── workflow/   Transition rules, counterparts, execution
    ├── naming/     Standard name and path construction
    └── taxonomy/   Taxonomy CRUD and lifecycle
```

Four rules keep the architecture honest, and each is enforced by a test:

- **No route accepts a file body.** `tests/integration/constitution.test.ts` fails the build if one
  ever grows a `formData()` call.
- **The Dropbox SDK is imported only by `lib/storage/dropbox/`.** An ESLint rule and the same test
  enforce it. This is what makes a future move to GCP a deployment change rather than a rewrite.
- **Authorization reads the database on every request**, so a role change or a deactivation takes
  effect immediately rather than at token expiry.
- **UI uses design-system tokens only.** No hardcoded colours.

## Editing the design system

`Vault Design System/` is the source of truth. Change a component or a token there, then run
`npm run ds:sync`. Files under `src/components/ds/` and `src/styles/tokens/` are generated — edits
made to them are lost on the next sync.

## Deploying to Hostinger

The Business plan runs this as a managed Node.js app.

1. hPanel → *Websites → Add website → Node.js Web App*, Node 22, deployed from the Git repository.
2. Set every environment variable in hPanel. Never upload `.env.local`.
3. Create the MySQL database on the same account and point `DATABASE_URL` at it.
4. Run `npm run db:migrate`, then `npm run db:seed` once.
5. Sign in as the seeded admin, change the password, and run scenario **V2** from
   [quickstart.md](specs/001-dropbox-upload-approval/quickstart.md) with the browser network tab
   open. The large requests must go to `content.dropboxapi.com` and not to the app's own origin.

Step 5 is the check worth repeating after any change to the upload path. It is the difference
between the constitution being enforced and merely being written down.

## Specification

Each feature is specified end to end — spec, plan, the research behind the architecture, the data
model, the contracts, and the task breakdown:

- [001-dropbox-upload-approval](specs/001-dropbox-upload-approval/) — upload, naming, the approval
  pipeline, taxonomy and users.
- [002-multi-file-upload](specs/002-multi-file-upload/) — several files in one submission, per-file
  stages, and the distinguishing text that made the naming rule four parts.
