# Feature Specification: Multi-File Upload with Per-File Stages and Distinguishing Text

**Feature Branch**: `002-multi-file-upload` *(spec directory; repository is not git-initialized)*

**Created**: 2026-09-02

**Status**: Draft

**Input**: User description: "Quiero agregar una funcionalidad de subida de múltiples archivos y asignarles a cada archivo a subir un stage distinto, pero que el Approval Status, Quest y Mission apliquen para todos." Followed by: multiple files may share the same Status, Quest, Mission **and** Stage, provided the uploader adds a distinguishing text, which becomes the real differentiator: `[Quest] - [Mission] - [Stage] - [Distinguishing text]`.

**Relationship to previous work**: This changes two things settled in
[feature 001](../001-dropbox-upload-approval/spec.md), which is already built:

1. It reverses 001's out-of-scope decision on *"bulk upload of multiple files in a single
   submission"*.
2. **It amends the naming convention itself** — 001's `[Quest] - [Mission] - [Stage].[ext]` gains an
   optional fourth part. That rule is the product's central guarantee, so the change is stated here
   explicitly rather than treated as an implementation detail.

Everything else 001 guarantees is unchanged: the path is still computed by the system, nothing is
ever overwritten, every file is verified before it is recorded, and no file byte passes through the
application.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload a set of related files in one pass (Priority: P1)

An Uploader has several videos that belong to the same Quest and Mission. Instead of repeating the
same selections once per file, they choose the Approval Status, Quest and Mission **once**, add all
the files together, and set each file's Stage and distinguishing text. One action sends them all.

**Why this priority**: This is the entire feature. Everything else exists to make this journey safe.

**Independent Test**: Can be fully tested by selecting one status, quest and mission, adding three
video files, giving each its own stage or distinguishing text, submitting once, and verifying that
three correctly named files appear in the same Dropbox folder.

**Acceptance Scenarios**:

1. **Given** an Uploader on the upload form, **When** they add several files at once, **Then** every
   file appears in a list with its own stage selector and its own distinguishing-text field, while
   the status, quest and mission selections remain single and shared.
2. **Given** three files with three different stages, **When** the upload completes, **Then** three
   files exist in the same folder, each named with its own stage and its own original extension.
3. **Given** a file in the list with no stage chosen, **When** the Uploader tries to submit,
   **Then** submission is refused and the files still missing a stage are identified individually.
4. **Given** the Uploader changes the shared Quest after files have been added, **When** the change
   is made, **Then** the mission selection and every per-file stage assignment are cleared, because
   the stages that were chosen belong to the previous branch.
5. **Given** files are being uploaded, **When** the Uploader watches the form, **Then** they see
   which file is transferring, its individual progress, and which files are finished, queued or
   failed.
6. **Given** an Uploader removes a file from the list before submitting, **When** they submit,
   **Then** only the remaining files are uploaded.

---

### User Story 2 - Distinguish files that share the same stage (Priority: P1)

Several files legitimately belong to the same Quest, Mission **and** Stage — three takes of the same
scene, four cutdowns of one edit. The Uploader types a short distinguishing text for each, and that
text becomes what tells the files apart in Dropbox.

**Why this priority**: Equal to User Story 1, because without it the batch is limited to one file per
stage, which is not how the work actually arrives. It is separately testable.

**Independent Test**: Can be fully tested by adding two files with identical status, quest, mission
and stage, giving each a different distinguishing text, and verifying both land side by side with
names that differ only in that text.

**Acceptance Scenarios**:

1. **Given** two files with the same Stage and different distinguishing texts, **When** the upload
   completes, **Then** both exist in the folder, named
   `[Quest] - [Mission] - [Stage] - [Distinguishing text].[ext]`.
2. **Given** a file with no distinguishing text, **When** it is uploaded, **Then** it is named
   `[Quest] - [Mission] - [Stage].[ext]`, exactly as before this feature existed.
3. **Given** two files that share Stage, extension **and** distinguishing text, **When** the Uploader
   submits, **Then** the batch is refused before anything transfers, and both files are named.
4. **Given** two files sharing a Stage where neither has a distinguishing text, **When** the Uploader
   submits, **Then** the batch is refused and the Uploader is told that a distinguishing text is what
   resolves it.
5. **Given** a distinguishing text containing characters that cannot appear in a file name, **When**
   the Uploader types it, **Then** it is refused at that moment with the offending characters named.
6. **Given** a distinguishing text with surrounding spaces, **When** the file is named, **Then** the
   text is trimmed, so " take 2 " and "take 2" are the same thing and cannot be used to sneak two
   files past the conflict check.

---

### User Story 3 - Be told about a conflict before anything is transferred (Priority: P2)

Before a single byte moves, the Uploader learns that two of their files would end up with the same
name, or that one of the names is already taken in Dropbox. They fix it and submit again, without
having waited through a long transfer to find out.

**Why this priority**: Files here run to gigabytes. Discovering a name conflict after twenty minutes
of transferring is the difference between a usable feature and an infuriating one.

**Independent Test**: Can be fully tested by assembling a batch with a duplicate resulting name and
confirming it is refused up front, naming the files involved, with nothing uploaded.

**Acceptance Scenarios**:

1. **Given** any two files in the batch that would produce the same name, **When** the Uploader
   submits, **Then** the batch is refused before any transfer begins and both files are named.
2. **Given** a file whose resulting name already exists in the destination folder, **When** the
   Uploader submits, **Then** the batch is refused up front and the conflicting name is shown.
3. **Given** two files with the same Stage and text but different extensions, **When** they submit,
   **Then** the upload proceeds, because the resulting names differ.
4. **Given** a file whose type is not accepted, **When** it is added to the list, **Then** it is
   rejected at that moment rather than at submission, with the accepted types named.

---

### User Story 4 - Recover from a partial failure without redoing the work (Priority: P3)

Something goes wrong halfway through — a dropped connection, rate-limiting, one file rejected. The
Uploader sees exactly which files landed and which did not, retries only the failures, and the files
that did land carry a visible mark saying the set they came from never finished.

**Why this priority**: Long multi-file transfers fail often enough that this is not an edge case. It
depends on User Story 1 but is independently demonstrable by forcing a failure.

**Independent Test**: Can be fully tested by starting a batch, forcing one file's transfer to fail,
and verifying the successful files are recorded and marked incomplete, the failed one is not
recorded, and retrying re-sends only the failure.

**Acceptance Scenarios**:

1. **Given** a batch where one file fails, **When** the batch finishes, **Then** the outcome per file
   is shown, and the files that succeeded are recorded and visible in the uploader's own list.
2. **Given** a batch that did not fully succeed, **When** the recorded files are viewed later,
   **Then** each carries a visible mark that the set it belonged to did not complete.
3. **Given** a batch with failures, **When** the Uploader retries in the same session, **Then** only
   the failed files are re-sent, the successful ones are not duplicated, and a fully successful
   retry clears the incomplete mark from the files.
4. **Given** a file that failed verification, **When** the batch finishes, **Then** no record exists
   for that file, so a retry is a clean first attempt rather than a repair.
5. **Given** an Uploader who no longer intends to complete a set, **When** they dismiss the mark,
   **Then** the mark is cleared and the files stay exactly as they are.
6. **Given** the Uploader reloads the page after a partial failure, **When** they return, **Then**
   the marked files are still marked, and the remaining files must be added afresh — the retry list
   itself does not survive the reload.

### Edge Cases

- **Two files producing the same name** — same stage, same extension, same distinguishing text (or
  both without one). Refused before transfer.
- **Two files, same stage and text, different extensions** — names differ. Permitted.
- **Distinguishing text differing only by case or surrounding spaces** — treated as the same text, so
  it cannot be used to slip a duplicate through.
- **Distinguishing text containing characters a file name cannot hold.**
- **A very long distinguishing text**, pushing the whole name past what storage accepts.
- **A name already occupied** in the destination folder, by a Vault file or by one somebody placed
  there by hand.
- **A shared selection changed after stages were assigned** — the assigned stages belong to the old
  branch and must not silently travel to the new one.
- **One file in the batch is not an accepted type.**
- **The batch exceeds the maximum number of files.**
- **Storage becomes unreachable partway through** the batch.
- **The same file added twice** to the list.
- **A batch of exactly one file** — must behave exactly like today's single upload.
- **Every file in the batch fails** — nothing is recorded and nothing is marked.
- **A stage deactivated by an Admin** between the batch being assembled and submitted.
- **A file already marked incomplete** is later moved through the approval workflow.

## Requirements *(mandatory)*

### Functional Requirements

#### Naming — amends feature 001

- **FR-001**: System MUST name every uploaded file
  `[Quest] - [Mission] - [Stage] - [Distinguishing text].[original extension]` when a distinguishing
  text is given, and `[Quest] - [Mission] - [Stage].[original extension]` when it is not.
- **FR-002**: The distinguishing text MUST be optional. A file uploaded without one is named exactly
  as feature 001 named it, so existing files and habits remain valid.
- **FR-003**: System MUST compute the whole name itself. The Uploader supplies the distinguishing
  text as a value; they never supply, edit or override the assembled file name.
- **FR-004**: System MUST validate the distinguishing text against the same rules as any other name
  part — no characters a storage path cannot hold, no leading or trailing whitespace once trimmed,
  and a length that keeps the assembled name within limits.
- **FR-005**: System MUST treat distinguishing texts that differ only by letter case or surrounding
  whitespace as the same text when checking for conflicts.
- **FR-006**: System MUST apply this naming rule to every upload, single or batched — there is one
  naming rule, not one per screen.

#### Assembling a batch

- **FR-007**: System MUST allow an Uploader to add more than one file to a single upload, by
  selecting several at once or by adding them one after another.
- **FR-008**: System MUST collect Approval Status, Quest and Mission **once** and apply the same
  three to every file in the batch.
- **FR-009**: System MUST collect a Stage **and** a distinguishing text **per file**.
- **FR-010**: System MUST allow several files in one batch to share the same Stage, provided their
  resulting names differ.
- **FR-011**: System MUST present each added file with its original name, its size, its stage
  selector, its distinguishing-text field, and a preview of the name it will be given.
- **FR-012**: System MUST allow a file to be removed from the batch before submission.
- **FR-013**: System MUST clear every per-file stage assignment whenever the shared Approval Status,
  Quest or Mission changes, because stages belong to a specific Mission.
- **FR-014**: System MUST refuse submission until every file has a stage, identifying each file still
  missing one.
- **FR-015**: System MUST reject a file whose type is not accepted at the moment it is added, not at
  submission.

#### Refusing conflicts before transferring

- **FR-016**: System MUST refuse the whole batch, before transferring anything, when two files in it
  would produce the same name, naming both files and stating that a distinguishing text is what
  resolves it.
- **FR-017**: System MUST refuse the whole batch, before transferring anything, when any file's
  resulting name already exists in the destination folder, naming the conflict.
- **FR-018**: System MUST validate the shared taxonomy chain once for the batch, and every per-file
  stage against the shared Mission.
- **FR-019**: System MUST place every file in the batch in the same folder, resolved from the shared
  Approval Status, Quest and Mission.

#### Transferring

- **FR-020**: System MUST NOT take custody of any file in the batch. Each file travels from the
  user's device to storage directly, exactly as a single upload does.
  *(Constitution Principle I — not relaxed for batches.)*
- **FR-021**: System MUST transfer the files in a batch one at a time rather than all at once.
- **FR-022**: System MUST show, during a batch, which file is transferring, that file's progress, and
  the state of every other file in the batch.
- **FR-023**: System MUST record each file individually — one record per file, indistinguishable from
  a file uploaded on its own apart from the incomplete-set mark described below.
- **FR-024**: System MUST verify each file with the storage provider before recording it, per file,
  as a single upload does.
- **FR-025**: System MUST allow an in-progress batch to be cancelled. Files already completed remain;
  files not yet started do not begin.

#### Partial outcomes

- **FR-026**: When some files in a batch succeed and others fail, System MUST keep the files that
  succeeded. It MUST NOT delete or roll back a file that has already landed in storage.
- **FR-027**: System MUST mark every file recorded from a batch that did not fully succeed, so the
  incompleteness is visible later and not only in the moment.
- **FR-028**: System MUST show the mark wherever the file is listed, to the Uploader who owns it and
  to Admins.
- **FR-029**: System MUST clear the mark from a file when the set it belongs to is subsequently
  completed, or when the Uploader or an Admin dismisses it.
- **FR-030**: System MUST report the outcome of every file in the batch — succeeded, failed, or not
  attempted — with a plain-language reason for each failure.
- **FR-031**: System MUST allow the Uploader to retry the failed files without re-sending the files
  that already succeeded, for as long as the form is open.
- **FR-032**: System MUST leave no record for a file that failed, so a retry is a fresh attempt.
- **FR-033**: The grouping of files into a batch MUST NOT be stored. Only the per-file mark of
  FR-027 persists; the batch itself exists only while the form is open.

#### Stages

- **FR-034**: System MUST offer, per file, only Stages belonging to the shared Mission.
- **FR-035**: System MUST NOT allow an Uploader to create a Stage. Taxonomy remains Admin-only, as
  today. When a needed Stage does not exist, the Uploader is told plainly that an Admin must add it.

#### Limits

- **FR-036**: System MUST enforce a maximum number of files per batch and state that limit before it
  is reached.
- **FR-037**: System MUST behave identically to the existing single-file upload when a batch contains
  exactly one file and no distinguishing text is given.

### Key Entities

- **File Record** — one per uploaded file. Gains two things: the **distinguishing text** as supplied,
  and a mark for **belonging to an incomplete set**. Everything else is unchanged.
- **Approval Status, Quest, Mission** — chosen once per batch and shared by every file in it.
- **Stage** — chosen per file, must belong to the shared Mission, and may repeat across files in the
  same batch.

No entity is introduced for the batch itself (FR-033).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An Uploader with five related files completes the whole submission with **one** set of
  status, quest and mission selections instead of five, reducing those selections from 15 to 3.
- **SC-002**: 100% of files uploaded in a batch carry the exact computed name and sit at the exact
  computed path, with zero deviations — the same guarantee as a single upload.
- **SC-003**: Several files sharing a Quest, Mission and Stage can be uploaded together and are
  distinguishable by name alone, without an Admin creating extra taxonomy.
- **SC-004**: Zero files are lost or overwritten by a batch: after any batch, every recorded file
  resolves to exactly one stored file, and no pre-existing file has been replaced.
- **SC-005**: A batch that would produce a name conflict is refused in under 5 seconds, before any
  file transfer begins.
- **SC-006**: After a partial failure, 100% of the files that landed are recorded and visibly marked
  as belonging to an unfinished set, and the Uploader can retry only the failures.
- **SC-007**: Time to submit five related files drops by at least 60% compared with five separate
  uploads, excluding transfer time.
- **SC-008**: 90% of Uploaders correctly assemble a multi-file batch on their first attempt, without
  assistance.
- **SC-009**: No file in any batch is transferred through the application; every transfer goes
  directly from the browser to storage, verifiable in the browser's network activity.

## Assumptions

- **The distinguishing text is optional, not required.** A file without one keeps feature 001's name
  exactly. Making it mandatory would rename every future single upload and break the habit of
  everyone already using the tool, for no gain — it is needed only when two files would otherwise
  collide.
- **The name preview is shown as the Uploader types**, so the naming rule is visible rather than
  learned by surprise after upload.
- **The mark for an incomplete set lives on each file, not on a batch.** This reconciles two
  decisions that pull apart: the mark must survive a page reload, while the batch itself is not
  stored. What does not survive a reload is the retry list — the files that failed must be added
  again by hand.
- **The batch form replaces the single-file form.** One upload screen handles one file or many; a
  batch of one behaves as today. Two screens would be two places for the naming rule to drift.
- **Stages and distinguishing texts are typed by hand.** No attempt is made to guess either from the
  file name; guessing wrong under a convention this strict is worse than asking.
- **Files transfer one at a time**, in the order listed. Parallel transfers of multi-gigabyte files
  compete for one connection, complicate progress reporting, and cannot be assumed safe on the
  hosting.
- **Maximum 20 files per batch.**
- **Every guarantee from feature 001 continues to apply per file**: computed path, refusal to
  overwrite, independent verification before recording, and the audit entry for initial placement.
- **Visibility is unchanged** — Uploaders see their own files, Admins see all.
- **The interface remains English-only** and continues to use the Vault Design System.

## Out of Scope

- Bulk **status changes** across many files at once.
- Uploading a folder and recreating its structure as taxonomy.
- Assigning a different Approval Status, Quest or Mission per file within one batch — those three
  being shared is the point of the feature.
- Resuming a batch after the browser is closed.
- Editing a file's Stage or distinguishing text after upload, which would mean renaming a stored
  file.
- Renaming files uploaded before this feature existed.
- Any change to how files move through the approval workflow once uploaded.
