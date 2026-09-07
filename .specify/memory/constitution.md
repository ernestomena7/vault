<!--
SYNC IMPACT REPORT
Version change: 1.1.0 → 1.2.0
Rationale: MINOR. Two rules were materially strengthened rather than added or removed:
Principle I now forbids file bytes from reaching the application at all (previously they
merely could not be retained past a request), and Principle VI now mandates an English-only
interface. No principle was removed, and no previously compliant work exists to invalidate,
so this is not a MAJOR change.

Modified principles:
  - I. Dropbox Is the File System of Record (NON-NEGOTIABLE): tightened. File content MUST
    NOT be proxied, buffered, streamed, or written to disk by the application; the browser
    transfers directly to Dropbox and the server only authorizes and records.
  - VI. Design System Fidelity: expanded with an English-only interface rule covering all
    user-facing strings, with no locale switcher or translation layer.
  - Unchanged: II. Approval Workflow Integrity, III. Portable Hosting Boundary,
    IV. Server-Held Secrets and Least-Privilege Access, V. Schema and Contract Discipline

Added sections: none

Removed sections: none

Amended sections:
  - Technology and Deployment Constraints: the Hostinger bullet's direct-transfer rule was
    raised from SHOULD to MUST and now defers to Principle I.

Prior history:
  - 1.1.0 — Added Principle VI (Design System Fidelity), promoting design-system adherence
    from a technology bullet to a binding principle.
  - 1.0.0 — Initial ratification from the unfilled scaffold; established Principles I-V,
    Technology and Deployment Constraints, Development Workflow and Quality Gates.

Deferred items:
  - TODO(GUIDANCE_FILE): No CLAUDE.md / agent guidance file exists at the repo root yet.
    Create one and link it from Governance when day-to-day development guidance is written down.
-->

# Vault Constitution

Vault (the Standard Upload Tool for Dropbox) is a web application for uploading files to
Dropbox under a controlled naming convention and routing each file through an approval
workflow before it is treated as available.

## Core Principles

### I. Dropbox Is the File System of Record (NON-NEGOTIABLE)

Dropbox stores file content; MySQL stores facts about files. **File bytes MUST NOT reach the
application at all.** The browser transfers the file directly to Dropbox; the server's only
roles are to authorize that transfer, compute the destination and standard name, and record
the outcome. Concretely, file content MUST NOT be persisted in the database (no BLOB, no
base64 column), MUST NOT be written to the application server's disk or temp storage, and
MUST NOT be proxied, buffered, or streamed through an application route.

The database record for a file MUST contain its metadata (name, size, MIME type, uploader,
timestamps), its Dropbox location (path and/or file ID plus the stored URL), and its
approval state — and nothing that duplicates the file's contents.

Because the two stores can diverge, every write MUST establish which store wins: a database
row whose Dropbox object is missing is a broken record and MUST surface as an error state,
never as a silently valid file. Deletion, move, and rename MUST update both stores or fail
loudly.

*Rationale: keeping bytes in Dropbox and only references in MySQL is what makes the app
cheap to host, portable across hosting providers, and safe to redeploy. Routing large video
through the app server would also collide directly with shared-hosting body-size and timeout
limits, so the direct transfer is a correctness requirement, not an optimization.*

### II. Approval Workflow Integrity

Every uploaded file MUST carry an explicit approval state from the moment its record is
created. State transitions MUST be validated server-side against an explicit allowed-
transition set; a client request MUST NOT be able to set an arbitrary state. There is no
implicit approval: a file is available to consumers only when a recorded transition made it
so, performed by an identified actor at a recorded time.

Every transition MUST be auditable — who acted, what the prior and new states were, and
when. Audit records are append-only and MUST NOT be edited or deleted by application code.

*Rationale: the approval trail is the product's reason to exist; a state that can be set
without a recorded, authorized transition makes the whole workflow unenforceable.*

### III. Portable Hosting Boundary

The MVP deploys to Hostinger Business hosting; a later move to GCP MUST NOT require
rewriting application logic. Therefore: the application MUST run as a standard Node.js
Next.js server and MUST NOT depend on provider-specific runtimes, build outputs, or managed
services available on only one host. Storage access (Dropbox), database access (MySQL),
configuration, and any future queue or background-job mechanism MUST each sit behind an
internal module boundary that application code calls; provider SDKs MUST NOT be imported
directly from route handlers, pages, or components.

All environment-specific values (credentials, base URLs, folder roots, limits) MUST come
from environment variables, with no host-specific values hardcoded in source.

*Rationale: the migration to GCP is a stated future intent, and the cost of that migration
is decided now by where provider details are allowed to leak.*

### IV. Server-Held Secrets and Least-Privilege Access

Dropbox credentials/tokens and MySQL credentials MUST exist only on the server and MUST
NEVER be shipped to, or reconstructible by, the browser. Client code MUST NOT hold a
long-lived Dropbox token. Where the browser transfers file bytes to Dropbox directly, it
MUST do so with a short-lived, narrowly scoped credential or upload session issued per
request by the server after authorization.

Every route that reads or mutates file records MUST authorize the caller before acting;
authorization MUST be enforced server-side and MUST NOT rely on the UI hiding a control.
Links to stored files handed to viewers MUST be time-limited rather than permanent public
URLs.

*Rationale: a leaked Dropbox token exposes the entire connected account, not one file.*

### V. Schema and Contract Discipline

Database changes MUST ship as versioned, forward-applied migration files committed to the
repository; schema MUST NOT be modified by hand against a live database. Types crossing a
boundary — HTTP request/response bodies, database rows, Dropbox adapter inputs and outputs —
MUST be explicitly typed and validated at the boundary rather than trusted.

Automated tests are REQUIRED for: allowed and rejected approval-state transitions,
authorization on every file-mutating route, and the Dropbox adapter contract (exercised
against a test double, so the suite runs without network access). Features outside those
areas SHOULD be tested in proportion to their risk.

*Rationale: the workflow rules and the storage boundary are where a silent regression turns
into an unapprovable or unrecoverable file, so those get mandatory coverage.*

### VI. Design System Fidelity

The Vault Design System in `Vault Design System/` is the single authority for the
application's visual and verbal interface. Every user-facing surface — production screens,
prototypes, mocks, and marketing artifacts — MUST be built from it. Specifically:

- Color, spacing, radii, elevation, and motion MUST come from the design system's tokens.
  Hardcoded hex values, ad-hoc spacing, and one-off shadows are prohibited; if a needed
  value does not exist, the token set is extended in the design system first.
- Components MUST be taken from the design system's kit. A new component is added to the
  design system, not built privately inside a feature.
- Typography MUST follow the documented pairing: Plus Jakarta Sans for prose and UI chrome,
  JetBrains Mono for data (filenames, paths, IDs, timestamps, durations).
- The product is dark-theme only. A light theme MUST NOT be introduced without amending
  this constitution.
- Content follows the design system's rules: sentence case everywhere, no emoji, status
  communicated by color plus a short word (Pending / Approved / Rejected).
- **The interface is English-only.** Every user-facing string — labels, buttons, menus,
  validation and error messages, empty states, emails, and dates and numbers as displayed —
  MUST be written in English. No second language, no locale switcher, and no translation
  layer is introduced without amending this constitution. Strings MUST NOT be hardcoded in
  a way that would make a future translation impossible, but no translation work is done now.
- Parallel or competing styling systems MUST NOT be introduced. Any third-party UI library
  adopted MUST be themed to the design system's tokens before use.

Where a design need is genuinely unmet, the resolution is to amend the design system and
then consume it — never to diverge locally.

*Rationale: the design system already encodes this product's voice and technical, approval-
gated feel; letting features style themselves fragments the interface faster than any
later cleanup can repair.*

## Technology and Deployment Constraints

- **Framework**: Next.js (App Router) with TypeScript. Server-side logic lives in route
  handlers and server modules; secrets never cross into client components.
- **Database**: MySQL, holding file metadata, Dropbox references, approval state, audit
  records, and user/role data. Accessed only through the data-access module boundary.
- **File storage**: Dropbox via its official API, accessed only through the storage adapter
  defined in Principle III.
- **Hosting (MVP)**: Hostinger Business plan, running the app as a Node.js process. Design
  decisions MUST respect shared-hosting realities: constrained request body sizes, request
  timeouts, and no assumption of durable background workers. Per Principle I, file transfers
  MUST go browser → Dropbox directly and MUST NOT be proxied through the app server; the
  server issues the upload authorization and records the result.
- **Hosting (future)**: GCP. No work may introduce a dependency that makes that move require
  application rewrites (see Principle III).
- **UI**: the Vault Design System in `Vault Design System/` governs every user-facing
  surface, per Principle VI. Its tokens (`tokens/`), components (`components/`, `ui_kits/`),
  and guidelines (`guidelines/`) are the source of truth; styling MUST NOT be reinvented per
  feature.
- **Configuration**: environment-variable driven; no credential, absolute path, or host URL
  committed to the repository.

## Development Workflow and Quality Gates

- Work follows the Spec Kit flow: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` →
  `/speckit-implement`. Plans MUST state how the change satisfies or is exempted from each
  Core Principle.
- A change is mergeable only when: it builds, typechecks, and lints clean; the required
  tests in Principle V pass; any schema change ships with its migration; no secret,
  credential, or host-specific value appears in the diff; and any UI in the change uses
  design-system tokens and components with no hardcoded style values (Principle VI).
- Any deviation from a principle MUST be recorded in the feature's plan with the reason and
  the simpler alternative that was rejected. Undocumented deviations are defects.
- Deployment to Hostinger MUST be reproducible from the repository plus environment
  variables alone — no manual file edits on the server.

## Governance

This constitution supersedes other practices and conventions in this project. Where a
principle and a convenience conflict, the principle wins until it is formally amended.

**Amendment procedure**: an amendment is proposed as an edit to this file stating what
changes, why, and what existing work must be migrated to comply. It takes effect when the
project owner approves it and the version and dates below are updated in the same change.

**Versioning policy** (semantic):

- **MAJOR**: a principle is removed or redefined in a way that invalidates compliant work.
- **MINOR**: a principle or governing section is added, or existing guidance is materially
  expanded.
- **PATCH**: clarifications, wording, and non-semantic corrections.

**Compliance review**: every plan and every review verifies compliance with these
principles. Complexity that a principle discourages MUST be justified in writing or removed.
Runtime development guidance for AI agents lives in TODO(GUIDANCE_FILE): create a root
`CLAUDE.md` and link it here once day-to-day conventions are written down.

**Version**: 1.2.0 | **Ratified**: 2026-09-02 | **Last Amended**: 2026-09-02
