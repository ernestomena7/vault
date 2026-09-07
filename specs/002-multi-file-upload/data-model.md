# Data Model: Multi-File Upload

**Date**: 2026-09-02 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

This feature adds **no table**. It adds two columns to `files`, and changes how one existing value is
computed. Everything else in [feature 001's data model](../001-dropbox-upload-approval/data-model.md)
stands unchanged.

## Changes to `files`

| Column | Type | Notes |
|---|---|---|
| `distinguishing_text` | VARCHAR(80) NULL | As typed by the uploader, trimmed. NULL when none was given — which is what keeps every file uploaded under 001 valid and correctly named (FR-002) |
| `incomplete_set` | BOOLEAN NOT NULL DEFAULT FALSE | TRUE when this file landed as part of a batch that did not fully succeed (FR-027) |

Both are additive with safe defaults, so the migration needs no backfill and existing rows stay
correct untouched.

**Deliberately absent: a batch reference.** FR-033 keeps the grouping out of the database. The cost —
a marked file cannot name its missing siblings — is recorded in the plan's Complexity Tracking rather
than hidden here.

## Changes to `pending_uploads`

| Column | Type | Notes |
|---|---|---|
| `distinguishing_text` | VARCHAR(80) NULL | Carried through authorization so confirm records what was actually authorized, never what the client re-sends |

The `standard_name` column already holds the assembled name, so it needs no change — it simply now
sometimes has four parts.

## The uniqueness rule needs no change

The existing index stays exactly as it is:

```text
UNIQUE (approval_status_id, quest_id, mission_id, standard_name)
```

Because the distinguishing text is part of the assembled `standard_name`, two files differing only by
that text produce different names and no longer collide — which is the entire point of the feature —
with no index change and no migration risk on a table that already holds records.

## Naming

```text
with text:     [Quest] - [Mission] - [Stage] - [Distinguishing text].[ext]
without text:  [Quest] - [Mission] - [Stage].[ext]
```

The separator is unchanged: a space, a hyphen, a space. The text is trimmed before assembly, and the
whole name is still computed server-side and never supplied by the client (FR-003).

### Length rules

The binding limit is the **full path**, not the file name ([research.md R-004](./research.md)):
Dropbox paths must stay under 260 characters, and this deployment's root already consumes about 90.

| Rule | Limit | Why |
|---|---|---|
| Quest, Mission, Stage name | 120 chars | Unchanged from 001 |
| Distinguishing text | **80 chars** | Long enough for "take 2 wide angle", short enough that four parts cannot approach the name limit |
| Assembled file name | **200 chars** (was 120) | 120 is too tight for four parts and would refuse legitimate names; 200 sits comfortably under Dropbox's 255 |
| **Full path** | **255 chars** | New. Dropbox enforces under 260; five characters of margin. Checked when the destination is computed, so an over-long path is refused during authorization and never after a transfer |

### Conflict key

Two files conflict when, in the same destination folder, these are all equal:

```text
quest, mission, stage, LOWER(TRIM(distinguishing_text)), extension
```

Normalization matters: without it "Take 2", "take 2" and " take 2 " each pass the check and then
collide at Dropbox, or produce near-identical files (FR-005). The **original** text is what appears
in the file name; normalization exists only for comparison, and reuses the same `normalizeName`
already used for taxonomy so there is one definition of "the same name" in the codebase.

Note that the same stage and text with **different extensions** do not conflict — the names differ,
and FR-010 permits it.

## Batch validation order

The whole batch is validated before any grant is issued, because FR-016 requires an all-or-nothing
refusal before anything transfers:

1. Batch size is within the cap (1–20).
2. The shared taxonomy chain resolves and is active — **one** check for the batch.
3. Every file's type is accepted.
4. Every file's stage belongs to the shared Mission.
5. Every distinguishing text is a legal name part.
6. Each assembled name and full path is within its length limit.
7. **No two files in the batch** produce the same name.
8. **No name already exists** — checked against `files` in one query, and against Dropbox with
   parallel probes.

Only after all eight does the server create the destination folder, open the upload sessions, mint
the token, and write the `pending_uploads` rows. A failure at any step leaves nothing behind.

## The incomplete mark

```text
FALSE ──> TRUE     a batch finished with at least one failure; the files that landed are marked
TRUE  ──> FALSE    the set was later completed, or someone dismissed the mark
```

Set and cleared through one operation naming explicit file ids. The server cannot verify the client's
claim that a batch failed — it only ever sees successful confirmations — so this is client-driven by
necessity. The consequence of a dishonest client is a wrong badge, not a wrong file, which is why
that is acceptable here (plan Complexity Tracking).

Only the uploader who owns a file, or an Admin, may set or clear its mark.

## Validation summary

| Rule | Source | Enforced by |
|---|---|---|
| 1–20 files per batch | FR-036 | Zod on the authorize body |
| Shared status/quest/mission applies to all | FR-008 | One chain resolution per batch |
| Stage per file, belonging to the shared Mission | FR-009, FR-034 | Per-file check against the resolved Mission |
| Several files may share a Stage | FR-010 | No constraint — the name is what must differ |
| Distinguishing text optional | FR-002 | Nullable column, optional schema field |
| Text is a legal name part | FR-004 | `assertValidSegment` |
| Case and whitespace normalized for conflicts | FR-005 | `normalizeName` at comparison time |
| Name computed server-side only | FR-003 | Assembled in `lib/naming`, stored in `pending_uploads` |
| No two files in a batch collide | FR-016 | Pre-flight comparison across the batch |
| No name already taken | FR-017 | One database query + parallel Dropbox probes |
| Path within limits | R-004 | Length check when the destination is computed |
| Landed files kept on partial failure | FR-026 | Nothing deletes from storage, ever |
| Incomplete set is marked | FR-027 | `files.incomplete_set` |
| Batch grouping not stored | FR-033 | No batch column, no batch table |
