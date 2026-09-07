# Phase 0 Research: Multi-File Upload with Per-File Stages and Distinguishing Text

**Date**: 2026-09-02
**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Unlike feature 001, this is not a greenfield design — the application exists and works. Every
decision below is about changing running code, so each one names what it touches.

The finding that most changes the shape of the work is **R-004**: the naming convention gains a
fourth part at exactly the point where the existing length validation is already too tight, and the
real constraint turns out to be the full path, not the file name.

---

## R-001: One batch-capable endpoint, not a second upload path

**Decision**: Change `POST /api/uploads/authorize` to take an **array** of 1–20 files and return an
array of grants. There is no separate "batch" endpoint and no separate batch form.

**Rationale**: FR-006 and FR-037 require one naming rule and identical behaviour for a batch of one.
Two endpoints would mean two places where the naming rule, the conflict check and the taxonomy
validation live, and they would drift — that is exactly the failure mode this product exists to
prevent. A single file becomes an array of one, which is also what makes FR-037 true by construction
rather than by careful maintenance.

The conflict check forces this anyway: FR-016 requires the **whole batch** to be refused before
anything transfers, which is only possible if the server sees every file in one request. Authorizing
files one at a time would let three succeed before the fourth revealed a collision.

**Touches**: `src/app/api/uploads/authorize/route.ts`, `src/lib/uploads/authorize.ts`,
`src/lib/validation/index.ts`.

**Alternatives considered**: a parallel `/api/uploads/authorize-batch` (rejected — duplicates every
rule); client-side conflict checking before calling the server (rejected — the client cannot see
other users' files or Dropbox, so it would be advisory at best and misleading at worst).

---

## R-002: Pre-flight conflict checking without changing the storage port

**Decision**: Check the batch's names against the database in **one query** (`IN` over the assembled
names within the destination folder), and against Dropbox with **parallel `fileExists` calls**, one
per file. The storage port is unchanged.

**Rationale**: SC-005 gives the whole refusal a 5-second budget. With a cap of 20 files, 20 parallel
metadata probes complete well inside it; sequential probes at roughly 150 ms each would consume 3
seconds of the 5 on their own.

Adding a `listFolder` method to the port would need one Dropbox call instead of twenty — but it would
also extend the port contract, which means extending the 18-assertion shared suite and the fake
alongside it (Constitution V). That is real work to save a few hundred milliseconds on an operation
capped at 20 items. Not worth it now; revisit if the cap ever rises.

**Touches**: `src/lib/uploads/authorize.ts` only.

**Alternatives considered**: adding `listFolder` to the port (rejected above); trusting the database
alone (rejected — a file placed in Dropbox by hand would be silently overwritten, breaking SC-004).

---

## R-003: One browser upload token per batch, not per file

**Decision**: Mint a single reduced-scope token for the whole batch, and reuse it across every file's
upload session.

**Rationale**: The current code mints one token per upload, and for a batch that would mean up to 20
token exchanges for no gain. All twenty tokens would be identical in scope, issued to the same
browser, within the same minute — minting them separately buys nothing and costs 20 round trips
before the first byte moves.

The mitigation that matters is unchanged: the token still carries `files.content.write` and nothing
else, and it still lives only as long as Dropbox's fixed lifetime ([001 research R-002](../001-dropbox-upload-approval/research.md)).

**Touches**: `src/lib/storage/dropbox/index.ts` (`beginUpload` gains a batch-aware caller), or more
precisely a new port operation that begins several sessions under one grant.

**Alternatives considered**: one token per file (rejected — 20× the token exchanges, identical
exposure); one long-lived token cached server-side and handed out repeatedly (rejected — extends the
window a leaked token is useful for, across users).

---

## R-004: Name and path length — the constraint that actually binds *(decisive)*

**Findings**:

| Limit | Value |
|---|---|
| Individual Dropbox file or folder name | 255 characters |
| **Full Dropbox path** | **must be under 260 characters** |

The path limit is the binding one, and it is far tighter than it looks once this deployment's real
root is counted:

```text
/Mission Quest Academy/App Vault Folder      39
/03 Ready for editing                        21
/<Quest>/<Mission>                          ~30
                                            ---
consumed before the file name               ~90
leaving for the file name                  ~170
```

**Two problems this exposes, one of them pre-existing:**

1. **The assembled-name check is already too tight for four parts.** `assertValidSegment` caps a
   segment at 120 characters and is then applied to the *assembled* name. Three parts of 35
   characters plus separators already reaches 111; a fourth part pushes past 120 and the upload would
   be refused with a message about a name being too long, which the uploader cannot act on.

2. **Nothing validates the full path at all.** This is a latent defect in feature 001, not something
   this feature introduces: a deep Quest/Mission under a long root can already exceed 260 characters
   and would fail at Dropbox rather than at validation, after the transfer.

**Decision**:

- Raise the assembled **file name** cap to 200 characters, comfortably under Dropbox's 255 while
  leaving room for the path around it.
- Keep the per-part cap at 120 for Quest, Mission and Stage, and cap the **distinguishing text at 80**
  — long enough for "take 2 wide angle", short enough that four parts cannot approach the name limit.
- Add a **full-path check against 255** (a five-character margin under Dropbox's 260) at the point the
  destination is computed, so an over-long path is refused during authorization with a message naming
  what to shorten — never after a transfer.

**Touches**: `src/lib/naming/index.ts`, `src/lib/validation/index.ts`, and
`tests/unit/naming.test.ts`.

**Alternatives considered**: truncating a long distinguishing text automatically (rejected — silently
altering the name breaks the guarantee that the name is exactly what was chosen); leaving the path
unchecked (rejected — it is a real failure mode already, and it fails at the worst possible moment).

---

## R-005: Where the incomplete-set mark lives, and what it costs

**Decision**: Two additions to the `files` table — the distinguishing text as supplied, and a boolean
mark for belonging to a set that did not finish. **No batch identifier is stored**, per FR-033.

Clearing the mark (FR-029) is driven by the client, which still holds the file ids from the batch it
just ran: on a successful retry, or on dismissal, it names those ids and the server clears them.

**The cost, stated plainly.** Without a stored grouping, a file marked incomplete says only *"the set
this came from did not finish"* — it cannot say which files were missing, and after a page reload
nobody can tell which marked files belonged together. A single nullable `batch_ref` column would fix
that at almost no cost, and it is not an entity or a table. It was excluded because FR-033 says the
grouping must not be stored, which follows directly from the decision to keep batches transient.

This is worth revisiting if the mark proves unhelpful in use. It is recorded in the plan's Complexity
Tracking as an accepted limitation rather than buried here.

**Trust boundary**: the server cannot verify the client's claim that a batch had failures — it only
sees successful confirmations. A dishonest client could suppress the mark or apply it spuriously. The
consequence is a wrong badge in a list, not a wrong file or a wrong permission, so client-driven
marking is acceptable here where it would not be for anything the constitution protects.

**Touches**: `src/lib/db/schema.ts`, a new migration, `src/lib/db/queries/files.ts`.

---

## R-006: Sequential transfer, and what "retry" actually means

**Decision**: The browser transfers files **one at a time in listed order**, tracking per-file state
in the form. Retry re-runs the authorize → transfer → confirm sequence for the failed files only,
as a fresh batch.

**Rationale**: FR-021. Parallel transfers of multi-gigabyte files compete for one uplink, make
progress reporting incoherent, and multiply the load on a shared-hosting deployment for no wall-clock
gain when the bottleneck is the user's upstream bandwidth.

Retry being a *fresh* authorization matters: a failed file has no record (FR-032) and its pending
authorization is closed out, so retrying is a first attempt, not a repair. That keeps one code path
instead of a resume path with its own failure modes.

**Touches**: `src/lib/uploads/client-uploader.ts`, `src/app/(app)/upload/upload-form.tsx`.

**Alternatives considered**: resuming an interrupted Dropbox upload session (rejected — sessions
expire, and the spec puts resumption out of scope); limited parallelism, two or three at a time
(rejected for the MVP; revisit only if measurement shows the uplink is idle).

---

## R-007: Migration

**Decision**: One new forward-only migration adding two nullable/defaulted columns to `files`.
Existing rows are valid untouched: no distinguishing text, not marked.

**Rationale**: Constitution V. Both columns are additive with safe defaults, so the migration is
non-destructive and needs no backfill. Files uploaded before this feature keep their three-part names
and stay correct — FR-002's optionality is what makes that true, and it is why optional was the right
default.

**The destination uniqueness rule needs no change.** The existing index covers
`(approval_status_id, quest_id, mission_id, standard_name)`, and the distinguishing text is part of
the assembled `standard_name`. Two files differing only by that text produce different names and no
longer collide — which is the whole point — with no index change at all.

**Touches**: `src/lib/db/schema.ts`, `src/lib/db/migrations/0001_*.sql`.

---

## R-008: Normalizing the distinguishing text

**Decision**: Trim, then compare case-insensitively when checking for conflicts — the same rule
already used for taxonomy names (`normalizeName`). The **original** text as typed is what appears in
the file name; normalization is only for comparison.

**Rationale**: FR-005. Without it, "Take 2", "take 2" and " take 2 " pass the conflict check and then
either collide at Dropbox or produce near-identical files — precisely the disorder this product
exists to prevent. Reusing `normalizeName` keeps one definition of "the same name" across the
codebase rather than two that can drift.

**Touches**: `src/lib/naming/index.ts`, `src/lib/uploads/authorize.ts`.

---

## Open items for implementation

1. **Confirm the real path budget** against this deployment's longest plausible Quest/Mission names
   once real taxonomy exists. The 255-character check will catch violations, but a limit that fires
   often in normal use is a limit worth revisiting.
2. **Measure the pre-flight check** with a full batch of 20 against real Dropbox latency, to confirm
   SC-005's 5-second budget holds.
3. **Watch whether the incomplete mark is actually useful** without a batch reference (R-005). If it
   is not, adding one column resolves it.

## Sources

- [Naming Dropbox files and folders — Dropbox Help](https://help.dropbox.com/organize/file-names)
- [Long path names — Dropbox Community](https://community.dropbox.com/en/discussion/452513/i-use-long-path-file-names-greater-than-260-characters-is-there-a-reason-to-reduce-them)
- [Dropbox upload limitations](https://help.dropbox.com/sync/upload-limitations)
- [Feature 001 research](../001-dropbox-upload-approval/research.md)
