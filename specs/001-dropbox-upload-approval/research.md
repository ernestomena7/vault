# Phase 0 Research: Vault — Standardized Dropbox Upload & Approval Pipeline

**Date**: 2026-09-02
**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

This document resolves every unknown in the plan's Technical Context. The decisive finding is
**R-002**: Dropbox cannot hand a browser a token-free upload link for files over 150 MB, which
directly constrains how the constitution's "file bytes never reach the application" rule is met.

---

## R-001: Can Hostinger Business actually run a Next.js server?

**Decision**: Yes. Deploy as a managed Node.js web app on the Hostinger Business plan, running
**Node.js 22 LTS**, using Next.js `output: 'standalone'`.

**Findings**:

- Node.js web apps are supported from the **Business web hosting plan upward** (up to five apps per
  plan), created in hPanel via *Websites → Add website → Node.js Web App*.
- Supported runtimes: Node **18.x, 20.x, 22.x, 24.x**. Next.js is explicitly listed among the
  supported frameworks.
- Deployment is from a GitHub repository or by file upload; the environment is managed, so no
  server configuration is required.
- MySQL databases are included on the Business plan, so the database and the app sit on the same
  hosting account.

**Why this matters**: the constitution's Principle III requires a plain Node.js Next.js server with
no provider-specific runtime. A managed Node app satisfies this, and the same repository will run on
GCP Cloud Run later with no application changes — only the deployment mechanism differs.

**Alternatives considered**:

- *Static export (`output: 'export'`)* — rejected outright. Vault must hold Dropbox and database
  credentials server-side (Principles I and IV); a static site has no server to hold them.
- *PHP-based shared hosting with a rewritten stack* — rejected; contradicts the constitution's
  chosen stack and would have to be discarded at the GCP migration.
- *Hostinger VPS* — unnecessary for the MVP and more operational burden. Worth revisiting only if
  the managed app's limits (see R-003) prove too tight.

**Residual risk**: Hostinger's managed Node tier does not publish hard numbers for request body size
or request timeout. The architecture in R-002 makes this mostly moot — no file bytes pass through the
app — but it must be confirmed on the real plan before launch. Tracked as an open item.

---

## R-002: How does a browser upload to Dropbox without the app touching the bytes? *(decisive)*

**Constraint**: Constitution Principle I forbids file content from reaching the application at all —
no proxying, buffering, streaming, or temp files. Principle IV forbids shipping a long-lived Dropbox
token to the browser but explicitly permits *"a short-lived, narrowly scoped credential or upload
session issued per request by the server after authorization."*

**Findings**:

| Mechanism | Token in browser? | Max size | Verdict |
|---|---|---|---|
| `/2/files/get_temporary_upload_link` | **No** — one-time pre-signed URL | **150 MB official**, hard 413 at 300 MB | Safest, but too small |
| `/2/files/upload` | Yes | 150 MB | Same cap, no benefit |
| `/2/files/upload_session/{start,append_v2,finish}` | **Yes** — `Authorization` header required on every call | 350 GB | Only option for large video |
| Proxy bytes through the Next.js server | No | — | **Forbidden** by Principle I |

Dropbox staff confirm there is no pre-signed-link path for files over 150 MB: *"Dropbox does not
offer a way to programmatically upload larger files by link."* The spec assumes files of hundreds of
megabytes to a few gigabytes, so the token-free link covers the **exception**, not the common case.

**Decision**: **Upload sessions driven by the browser, using a per-upload, minimally scoped,
short-lived Dropbox access token minted by the server.** A single code path handles every file size.

The flow:

1. Browser asks the server to authorize an upload, sending only *metadata* — the four taxonomy
   selections, the original file name, size, and type. No bytes.
2. Server authenticates and authorizes the user, validates the taxonomy chain, computes the standard
   name and destination path, checks for a name collision (FR-016), and writes a **pending upload**
   row recording exactly what it authorized.
3. Server mints a Dropbox access token by refreshing its stored refresh token **with a reduced
   `scope` parameter of `files.content.write` only** — Dropbox's OAuth token endpoint accepts a
   subset of the granted scopes at refresh time, so the browser's token cannot read, list, share, or
   delete anything.
4. Browser uploads the file to Dropbox in chunks via the upload-session endpoints, committing to the
   exact path the server dictated, and reports completion.
5. **Server verifies independently** — it calls Dropbox for the metadata at the expected path and
   confirms the file exists with the expected size before creating the file record. The client is
   never trusted to report the outcome.

**Why this over the alternatives**:

- *Hybrid: pre-signed link under 150 MB, session above* — rejected. It doubles the upload code path
  and its tests to make the **rarer** case marginally safer, while the common case still mints a
  token. Complexity without a proportional reduction in exposure.
- *Proxy through the server* — forbidden by Principle I, and independently unworkable against shared
  hosting body-size and timeout limits.
- *Give the browser the app's refresh token or a full-scope access token* — a direct Principle IV
  violation.
- *Dropbox file requests* — no control over the file name (the whole point of the product) and no
  programmatic browser upload endpoint.

**Residual risk, accepted and mitigated**: the browser holds a `files.content.write` token for its
lifetime (Dropbox fixes short-lived tokens at roughly four hours; the TTL is not shortenable). Within
that window a determined authenticated Uploader could write files into the Dropbox app folder outside
Vault's naming rules. Mitigations: the Dropbox app is registered with **App folder** access so the
token cannot reach anything else in the account; the scope is write-only, so nothing can be read,
listed, or deleted; the token is minted per upload rather than per session; and any file present in
Dropbox without a matching Vault record surfaces through the same integrity check that FR-042 already
requires. The residual exposure is a user writing extra files to a folder they are already permitted
to write to — it is not an escalation.

---

## R-003: Upload session mechanics

**Decision**: Chunked upload with **8 MiB chunks**, sequential, with resume-on-failure of the current
chunk only.

**Rationale**: Dropbox upload sessions accept up to 150 MB per append call; smaller chunks give
usable progress reporting and cheap retries. 8 MiB is a common balance — large enough that a 2 GB file
is ~250 calls, small enough that a failed chunk costs little to retry. The session id lets an
interrupted upload resume rather than restart, which matters for the file sizes in scope.

**Alternatives considered**: a single `upload_session/append_v2` of the whole file — no progress, no
resume, and fails the spec's "show progress and tolerate slow transfers" assumption. Very small
chunks (256 KB) — needless request volume and rate-limit pressure.

---

## R-004: Database access and migrations

**Decision**: **Drizzle ORM** with the `mysql2` driver, and **drizzle-kit** generating SQL migration
files committed to the repository.

**Rationale**: Constitution Principle V requires versioned, forward-applied migration files in the
repo and explicit types at boundaries. Drizzle generates plain `.sql` migrations from a typed schema
and applies them forward — exactly the required shape. It is a thin, dependency-light layer with no
native binaries or code-generation step, which matters on managed shared hosting where a heavyweight
install and platform-specific binaries are a deployment risk.

**Alternatives considered**:

- *Prisma* — excellent DX, but ships a platform-specific query-engine binary and a generate step,
  adding both size and a class of deployment failure that managed hosting makes awkward to debug.
- *Kysely* — a good query builder, but migrations are hand-rolled, giving up the guarantee
  Principle V wants.
- *Raw `mysql2` queries* — no typed boundary, contrary to Principle V.

---

## R-005: Authentication and password storage

**Decision**: **Auth.js (NextAuth v5)** with the Credentials provider and **database-backed sessions**.
Passwords hashed with **scrypt from Node's built-in `node:crypto`**.

**Rationale**: Session-based email/password sign-in is what the spec assumes, and database sessions
let an Admin's role change or an account deactivation take effect on the user's next request
(FR-002, spec US5 scenario 2) — a stateless JWT would keep a stale role until expiry.

`node:crypto`'s scrypt is deliberate: bcrypt and argon2 are **native modules**, and native compilation
is the most common deployment failure on managed shared hosting. scrypt is a memory-hard KDF built
into Node, needs no compilation, and removes an entire category of deployment risk. This is a hosting
constraint driving a security-implementation choice, and it is a sound one.

**Alternatives considered**: Lucia (deprecated upstream in 2025); a hand-rolled session layer
(needless re-implementation of solved security-sensitive code); JWT sessions (stale roles, as above).

---

## R-006: Enforcing the transition rule

**Decision**: Transition legality is computed **server-side** from `approval_statuses.position`:
a file may move to `position + 1`, or to any position **less than** its current one. The permitted
set is derived, never stored, so reordering statuses immediately changes what is legal.

**Concurrency**: each status change runs in a transaction that re-reads the file row `FOR UPDATE` and
verifies the current status still matches what the client saw (FR-041). The loser is told the file has
already moved rather than silently overwriting.

**Ordering**: `position` is an integer kept contiguous. Reordering rewrites the affected rows inside
one transaction, so no two statuses ever share a position (FR-024).

**Alternatives considered**: a stored transition table (needless — the rule is a function of order,
and a table would drift from `position` on every reorder); optimistic version columns on the file
(equivalent, but the status check is more direct and reads better in the audit trail).

---

## R-007: Cross-status taxonomy matching

**Decision**: Each of `quests`, `missions`, and `stages` stores a generated `name_normalized` column
— trimmed and lower-cased — with a unique index on `(parent_id, name_normalized)`. Counterpart lookup
across statuses is an indexed equality match on that column (FR-008).

**Rationale**: the user chose a taxonomy tree duplicated under every Approval Status, so every
transition must find or create the counterpart Quest and Mission under the target status. Doing this
by name means the match must be deterministic and indexed; normalizing at write time makes it both,
and the unique index simultaneously prevents two near-identical siblings from being created.

**Auto-creation on transition** (FR-036): missing counterparts are created inside the same transaction
as the move — the taxonomy row with the same name, a folder path derived beneath the target status's
path, and the Dropbox folder itself. Dropbox folder creation is idempotent in effect: an existing
folder is treated as success, not as an error.

**Alternatives considered**: refusing the transition until an Admin creates the counterpart by hand —
rejected because it contradicts REQ-4.3, which requires the structure to be created automatically.
Fuzzy matching beyond case and whitespace — rejected as unpredictable; a genuinely different spelling
should produce a visibly separate branch rather than a silent, wrong merge.

---

## R-008: Testing

**Decision**: **Vitest** for unit and integration tests; the Dropbox port exercised through an
**in-memory fake** so the suite runs with no network access, as Principle V requires. Integration
tests run against a local MySQL with migrations applied to a scratch schema.

The three mandatory suites from Principle V:

1. **Transition rules** — every legal move succeeds, every illegal move is refused, for a workflow
   long enough to distinguish "next" from "any earlier".
2. **Route authorization** — each mutating route asserted for anonymous, Uploader, and Admin callers.
3. **Dropbox port contract** — the same test suite run against the fake, so the fake cannot drift
   from the real adapter's contract.

**Alternatives considered**: Jest (heavier, more configuration with ESM and TypeScript); mocking the
Dropbox SDK directly (couples tests to a third-party surface rather than to our own port, and would
not catch our adapter misusing the SDK).

---

## Open items for implementation

These do not block design, but must be settled before launch:

1. **Confirm Hostinger's managed Node limits** on the real Business plan — request timeout, memory,
   and whether the process is kept warm. Only the authorize/confirm requests are affected, all of
   which are small and fast, but the numbers should be known rather than assumed.
2. **Dropbox app access type: `App folder`** — decided 2026-09-02. R-002's primary mitigation depends
   on it. The access type **cannot be changed after the app is created**; switching requires deleting
   the app and registering a new one, so this must be right before any files exist. The existing
   Approval Status folder tree will be **moved into the app folder** (`/Apps/Vault/`) rather than the
   app being given Full Dropbox access.

   Consequence for the data model: for an App-folder app, every Dropbox API path is already relative
   to the app folder root. So `approval_statuses.dropbox_path` values are stored as `/01 Pending`,
   not `/Apps/Vault/01 Pending`, and `DROPBOX_ROOT_PATH` stays empty. Moving the tree will change or
   break any existing Dropbox share links to those folders — `dropbox_url` values must be re-captured
   after the move.
3. **Verify the reduced-scope refresh works** as documented against the real Dropbox app registration
   before building on it; if a reduced-scope token cannot be minted, the browser token would carry
   every granted scope and the mitigation in R-002 weakens materially.

## Sources

- [Node.js hosting options at Hostinger](https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/)
- [How to add a Node.js web app in Hostinger](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)
- [Hostinger 2026 product updates](https://www.hostinger.com/blog/product-updates-2026)
- [New Dropbox file upload link API](https://dropbox.tech/developers/new-file-upload-link-api)
- [API V2 temporary upload link max file size (Dropbox staff answer)](https://www.dropboxforum.com/discussions/101000014/api-v2-temporary-upload-link-max-file-size/733424/replies/733562)
- [Large uploads via /get_temporary_upload_link are terminated with 413](https://community.dropbox.com/en/discussion/333377/large-uploads-via-get-temporary-upload-link-are-terminated-with-413-request-entity-too-large)
- [Dropbox OAuth Guide](https://developers.dropbox.com/oauth-guide)
- [Using OAuth 2.0 with offline access](https://dropbox.tech/developers/using-oauth-2-0-with-offline-access)
- [Next.js 16](https://nextjs.org/blog/next-16)
