# Feature Specification: Open a File's Dropbox Location from the Approvals Queue

**Feature Branch**: `003-approvals-dropbox-link` *(spec directory; repository is not git-initialized)*

**Created**: 2026-09-03

**Status**: Draft

**Input**: User description: "in the approvals tab, add a column with a link to go to the file in dropbox"

**Relationship to previous work**: This is almost entirely a **user interface** feature. Feature 001
already built and authorized the capability it needs — a time-limited link to a file's Dropbox
location (FR-043 of [feature 001](../001-dropbox-upload-approval/spec.md)) — but that capability has
never been connected to any screen. No new way of revealing a storage location is introduced here;
this exposes one that already exists and is already scoped correctly (an Admin may request a link
for any file in the queue, because the Approvals queue is Admin-only already).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open a file's Dropbox location while reviewing the queue (Priority: P1)

An Admin is working through the Approvals queue, deciding what to do with each file. For a given row,
they want to look at the actual video in Dropbox — to check it plays, to see it's the right cut —
without losing their place in the queue or the filter they had applied.

**Why this priority**: This is the entire feature. Without it, an Admin who wants to see the actual
file has to leave Vault, open Dropbox separately, and hunt through folders to find the right one —
exactly the friction the standard naming and folder structure exists to remove.

**Independent Test**: Can be fully tested by opening the Approvals queue as an Admin, activating the
control for one file, and confirming a new tab opens showing that exact file in Dropbox while the
Approvals queue remains open and unchanged behind it.

**Acceptance Scenarios**:

1. **Given** an Admin viewing the Approvals queue, **When** they look at a row for a file that is
   present in Dropbox, **Then** they see a control that opens that file's Dropbox location.
2. **Given** an Admin activates that control, **When** the link is ready, **Then** it opens in a new
   tab and the Approvals queue, including any status filter applied, is unchanged and still visible.
3. **Given** the Approvals queue's rows already open a file's detail page when clicked, **When** an
   Admin activates the Dropbox control specifically, **Then** only the Dropbox tab opens — the detail
   page is not also opened.
4. **Given** an Admin activates the control for a file, **When** they immediately activate it again
   before the first attempt has finished, **Then** this does not open two tabs or send two conflicting
   requests; the control shows it is working until the first attempt resolves.

---

### User Story 2 - Understand when a file's location cannot be opened (Priority: P2)

Some files in the queue are marked as missing from Dropbox (feature 001's broken-record state), or
Dropbox is briefly unreachable. An Admin needs to see, without guessing, when a file's location cannot
be opened and roughly why — rather than clicking a control that silently does nothing or fails with no
explanation.

**Why this priority**: A queue an Admin cannot trust is worse than no shortcut at all. This is
separable from User Story 1 — the happy path can ship and be demonstrated without this handling, but
it is what keeps the feature honest once real files start going missing or Dropbox has a bad moment.

**Independent Test**: Can be fully tested by marking a file broken (as feature 001 already can, when a
stored object is missing) and confirming the queue shows that file's control as unusable, with an
explanation, rather than an ordinary link that fails after being clicked.

**Acceptance Scenarios**:

1. **Given** a file already marked as missing from Dropbox, **When** the Admin looks at its row,
   **Then** the control is shown as unavailable, with a plain-language reason, and cannot be activated.
2. **Given** a file that appears fine in the queue, **When** the Admin activates its control and
   Dropbox cannot be reached at that moment, **Then** a plain-language failure message is shown and
   the Admin can try again — the rest of the queue is unaffected.
3. **Given** a link attempt failed, **When** the Admin tries the same control again, **Then** a fresh
   attempt is made rather than reusing whatever failed the first time.

### Edge Cases

- **A file marked broken** (its stored object cannot currently be found) — its control must not
  offer a link that is known in advance to fail (User Story 2).
- **Dropbox briefly unreachable** at the exact moment a link is requested, for an otherwise healthy
  file.
- **Two rapid activations of the same control** before the first request completes.
- **A file that moved to a different Approval Status** between when the queue was loaded and when the
  Admin activates its control — since the link is requested fresh at the moment of activation rather
  than prepared in advance, it resolves against the file's current location, not a stale one.
- **A very long queue** (up to the existing page size) — opening file locations must not become slower
  or heavier simply because more files are listed, since nothing is requested until asked for.
- **An Admin who has never used the control** on a given page load — nothing about the queue's own
  loading time may depend on this feature at all.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST show, for each file listed in the Approvals queue, a control that opens
  that file's location in Dropbox.
- **FR-002**: Activating the control MUST open the location in a new tab, so the Admin's place in the
  Approvals queue — including any applied filter — is preserved.
- **FR-003**: Activating the control MUST NOT also trigger the queue row's existing behavior of
  opening that file's detail page within Vault.
- **FR-004**: System MUST request the underlying link only at the moment the control is activated, not
  in advance for every file merely because the queue is displayed.
- **FR-005**: The link System provides MUST remain the same kind already required by feature 001 —
  time-limited, never a permanent public URL, and never a storage credential.
  *(Constitution Principle IV; carries FR-043 forward unchanged)*
- **FR-006**: System MUST show the control as unavailable, with a plain-language reason, for a file
  currently marked as missing from Dropbox, rather than offering a link predictably doomed to fail.
- **FR-007**: System MUST show a plain-language message when a link cannot be obtained for a reason
  discovered only at the moment of the attempt (for example, Dropbox being unreachable), and MUST
  leave the rest of the queue unaffected by that single failure.
- **FR-008**: System MUST prevent a second link request for the same file from being started while an
  earlier request for it is still in progress.
- **FR-009**: System MUST NOT change who is allowed to request a file's location. Today that means an
  Admin may request one for any file in the queue, because the Approvals queue is already Admin-only.
- **FR-010**: System MUST NOT reveal the file's Dropbox folder path, or any other storage detail,
  beyond what the temporary link itself shows once followed.

### Key Entities

This feature introduces no new stored concept. It reads the existing File Record's current location
and integrity state (feature 001) and requests a link through the existing time-limited link
capability (FR-043). Nothing new is persisted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An Admin can reach a file's exact location in Dropbox from the Approvals queue in a
  single action, without manually navigating Dropbox's folder structure to find it.
- **SC-002**: Opening a file's Dropbox location never navigates the Admin away from the Approvals
  queue or discards their applied filter.
- **SC-003**: A file that cannot currently be opened in Dropbox is visibly distinguishable in the
  queue before the Admin attempts to open it — never discovered only after a failed click.
- **SC-004**: Viewing the Approvals queue, at any length, generates zero calls for a file's Dropbox
  location beyond the files whose control is actually activated.
- **SC-005**: 100% of failed attempts to open a file's location produce a plain-language explanation;
  none fail silently or leave the Admin uncertain what happened.

## Assumptions

- **The link opens in a new tab.** Reusing the current tab would navigate the Admin away from the
  queue they are actively working through, which is the exact loss of place this feature exists to
  prevent.
- **The link is requested on demand, not pre-fetched for the whole queue.** Requesting one for every
  listed file merely because the queue rendered would scale the cost of viewing the queue with its
  length, and would request links for files nobody ends up opening.
- **A file already marked broken (feature 001) shows the control disabled rather than clickable.**
  The queue already carries that state for every row; using it to prevent a doomed click costs nothing
  extra and is strictly kinder than letting the Admin discover it by failing.
- **This does not extend to the Uploader's own "My files" list.** That was not requested, and it is a
  smaller, separate surface with its own considerations about what an Uploader should be shown.
- **No new authorization decision is introduced.** The existing link capability already restricts an
  Uploader to their own files and permits an Admin any file; because the Approvals queue is
  Admin-only, this feature does not change who can reach what.
- **The existing link capability's authorization is enforced in code but is not yet asserted by the
  project's mandatory route-authorization test suite** (Constitution Principle V requires every route
  to be covered). Closing that gap is part of finishing this feature, not a pre-existing debt to defer
  again.

## Out of Scope

- Adding the same control to the Uploader's "My files" list.
- Previewing, playing, or downloading the file's contents from within Vault — Vault has no custody of
  the file to preview (Constitution Principle I).
- Changing the temporary link's expiry or how it is produced; that is inherited unchanged from
  feature 001.
- Generating links for several selected files at once.
- Any change to who may request a file's location; the existing scoping is correct and untouched.
