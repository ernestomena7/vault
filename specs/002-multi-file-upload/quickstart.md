# Quickstart & Validation Guide: Multi-File Upload

**Date**: 2026-09-02 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

The application is already running from feature 001. This covers only what is needed to bring up and
verify **this** feature.

## Prerequisites

Everything from [feature 001's quickstart](../001-dropbox-upload-approval/quickstart.md), plus:

- **A Mission with at least two Stages**, so the per-file stage selector has something to choose
  between.
- **Three or four small video files** for the functional scenarios, and **one file over 150 MB** for
  the chunked path. They do not need to be different files — copies with different names are enough
  for everything except the size check.

## Setup

```bash
npm install                 # no new dependencies; safe to skip
npm run db:migrate          # applies the new columns on files
npm run dev
```

The migration is additive with safe defaults. Files uploaded before this feature keep their
three-part names and remain valid, which is exactly what FR-002's optionality buys.

## Validation scenarios

Each maps to a user story. V1 and V2 are the feature; V3 and V4 are what make it safe.

### V1 — One batch, different stages (US1)

1. Sign in as an Uploader, open **Upload**.
2. Choose an Approval Status, Quest and Mission — **once**.
3. Add three files together.
4. Give each a **different** Stage. Leave the distinguishing text empty.
5. Confirm each row previews the name it will get, and that the shared selections appear once, not
   three times.
6. Submit.

**Verify in Dropbox**: three files in the same folder, each named
`Quest - Mission - Stage.ext` with its own stage and its own extension.

**Verify the constitution still holds** — the check worth repeating on every change to this path:
open the browser network tab. The large requests go to `content.dropboxapi.com`; the app's own
requests are small JSON. If any large body goes to `localhost`, Principle I has been broken.

**Pass**: SC-001, SC-002, SC-009.

### V2 — Same stage, told apart by text (US2)

1. Add two files with the **same** Stage.
2. Give one the text `take 1` and the other `take 2`.
3. Watch the name preview update as you type.
4. Submit.

**Verify**: both land side by side, named
`Quest - Mission - Stage - take 1.ext` and `Quest - Mission - Stage - take 2.ext`.

Then, without uploading:

5. Give two files the same Stage **and** the same text. → refused up front, both named, with the
   message pointing at the distinguishing text.
6. Enter `take/2` as the text. → refused as you type, naming the offending character.
7. Enter ` take 1 ` for one file and `Take 1` for another. → refused as a duplicate. This is the case
   that matters most: without normalization both would pass here and collide at Dropbox instead.

**Pass**: SC-003.

### V3 — Conflicts refused before anything moves (US3)

1. Assemble a batch of 20 files, one of which duplicates a name already in the folder.
2. Submit and **time it**.

**Verify**: refused in under 5 seconds, the conflicting name shown, and — the point of the
scenario — **nothing transferred**. Check Dropbox: no new files, and no new folders if the
destination did not already exist.

**Pass**: SC-005.

### V4 — Partial failure keeps what landed (US4)

1. Start a batch of three files.
2. Force the second to fail — disconnecting the network mid-transfer is the realistic way; revoking
   the Dropbox token also works.
3. Let the batch finish.

**Verify**:

- The per-file outcome is shown: which succeeded, which failed, which never started.
- The files that landed **are recorded** and appear in **My files**, each carrying a visible mark
  that its set did not finish.
- The failed file has **no record at all** — not a broken one, none (FR-032).
- Nothing was deleted from Dropbox to undo the batch (FR-026).

4. Retry. → only the failed file is re-sent; the successful ones are not duplicated, and a clean
   retry clears the mark.
5. Reload the page and look at **My files**. → the marks are still there; the retry list is not. That
   is the deliberate consequence of keeping the batch transient, and V4 is where you see it.

**Pass**: SC-004, SC-006.

### V5 — A batch of one is still a single upload

Upload one file with no distinguishing text.

**Verify**: named `Quest - Mission - Stage.ext`, identical to before this feature existed. This is
FR-037, and it is the check that proves the two paths did not diverge.

### V6 — Length limits refuse early, not late

1. Create a Quest and Mission with long names, choose a deep status, and give a file an 80-character
   distinguishing text.
2. Submit.

**Verify**: if the full path would exceed the limit, the batch is refused **during authorization**
with a message naming what to shorten — not after a multi-gigabyte transfer, which is what would
happen without this check. This also covers the latent defect inherited from feature 001, where no
path length was validated at all ([research.md R-004](./research.md)).

## Automated tests

```bash
npm test                  # full suite, offline
npm run test:contract     # storage port — unchanged by this feature
npm run typecheck
npm run lint
```

What the suites gain:

| Suite | Added coverage |
|---|---|
| `tests/unit/naming.test.ts` | Four-part names, the optional text, trimming, case-insensitive conflict keys, name and path length limits |
| `tests/integration/upload.test.ts` | Batch authorization, cross-batch collisions, existing-name collisions, per-file confirm, marking on partial failure, retry |
| `tests/integration/authorization.test.ts` | The new `finalize` route, including an Uploader naming someone else's file |

The storage port contract is untouched, because the port does not change — the batch is orchestrated
above it ([research.md R-002](./research.md)).

## What to watch after release

Three things from research that only real use can answer:

1. **Does the 255-character path limit fire in normal work?** If it does, the taxonomy naming needs
   revisiting, not the limit.
2. **Does a 20-file pre-flight really finish inside 5 seconds** against real Dropbox latency?
3. **Is the incomplete mark actually useful** without a batch reference? A marked file cannot name
   its missing siblings. If that turns out to be unhelpful, one nullable column fixes it — see the
   plan's Complexity Tracking.
