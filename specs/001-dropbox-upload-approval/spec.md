# Feature Specification: Vault — Standardized Dropbox Upload & Approval Pipeline

**Feature Branch**: `001-dropbox-upload-approval` *(spec directory; repository is not git-initialized)*

**Created**: 2026-09-02

**Status**: Draft

**Input**: User description: Product Requirements Document (PRD) for Vault — a web application that standardizes uploading and managing video files in Dropbox, enforcing a folder hierarchy and file naming convention built from four attributes (Approval Status, Quest, Mission, Stage), with a role-gated approval pipeline that physically relocates files between Dropbox folders as their status changes, creating folder structures on demand.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gated access with the right role (Priority: P1)

A person opens Vault and is required to sign in. After signing in, they see only what their role
permits: an Uploader lands on the upload form and sees no administrative navigation at all, while an
Admin sees the upload form plus the taxonomy panels, the approval queue, and user management. Someone
who is not signed in cannot reach any screen or data.

**Why this priority**: The product's premise is controlled, attributable file handling. Without
enforced sign-in and role separation, every other feature is unsafe to run — an anonymous visitor
could write into the organization's Dropbox or advance approvals. It is also the smallest slice that
can be built, demonstrated, and verified on its own.

**Independent Test**: Can be fully tested by attempting to reach each screen while signed out, while
signed in as an Uploader, and while signed in as an Admin, and confirming the access outcome for each
combination — including direct navigation to an admin-only address as an Uploader.

**Acceptance Scenarios**:

1. **Given** a visitor who is not signed in, **When** they request any Vault screen, **Then** they are
   sent to the sign-in screen and no file, taxonomy, or user data is revealed.
2. **Given** a signed-in Uploader, **When** they navigate directly to an admin-only screen, **Then**
   access is refused and they are informed they lack permission.
3. **Given** a signed-in Admin, **When** they view the main navigation, **Then** the upload form,
   taxonomy management, approval queue, and user management are all reachable.
4. **Given** a user with invalid credentials, **When** they attempt to sign in, **Then** sign-in is
   refused without revealing whether the account exists.

---

### User Story 2 - Upload a video under the enforced convention (Priority: P2)

An Uploader chooses a video file, then works down four dependent menus: an Approval Status, then a
Quest belonging to that status, then a Mission belonging to that Quest, then a Stage belonging to that
Mission. Vault renames the file to the standard convention, works out the destination folder from the
selected Approval Status, Quest, and Mission, places the file there in Dropbox, and records the file's
metadata, its Dropbox location, and its starting approval status. The Uploader gets clear confirmation
of the final name and destination.

**Why this priority**: This is the core value of the product — it is what makes uploads consistent and
findable. It is the first slice that delivers something a real user would use daily.

**Independent Test**: Can be fully tested by signing in as an Uploader, uploading a video with a known
set of selections, and verifying in Dropbox that a file with the exact standard name exists at the
exact expected path, and that Vault shows a matching record.

**Acceptance Scenarios**:

1. **Given** an Uploader with a video file selected, **When** they have not chosen all four attributes,
   **Then** the upload cannot be submitted and the missing selections are identified.
2. **Given** an Uploader has chosen an Approval Status, **When** they open the Quest menu, **Then** it
   offers only Quests belonging to that status; likewise Mission is limited to the chosen Quest, and
   Stage to the chosen Mission.
3. **Given** an Uploader changes a selection higher in the chain, **When** the change is made, **Then**
   the dependent selections below it are cleared rather than left pointing at entries from the
   previous branch.
4. **Given** all four attributes are selected, **When** the upload completes, **Then** the file exists
   in Dropbox named `[Quest] - [Mission] - [Stage].[original extension]` inside the folder resolved
   from the selected Approval Status, Quest, and Mission.
5. **Given** a successful upload, **When** the Uploader views the confirmation, **Then** they see the
   final file name, the destination folder, and the file's current approval status.
6. **Given** the destination folder does not yet exist in Dropbox, **When** the upload runs, **Then**
   the required folders are created and the upload proceeds.
7. **Given** a file with the same standard name already exists in the destination folder, **When** the
   upload is attempted, **Then** it is refused with a message naming the conflicting file, and nothing
   is written or overwritten.
8. **Given** the storage service is unreachable, **When** an upload is attempted, **Then** the upload
   fails with a plain-language message, no partial record is left behind, and the user can retry.

---

### User Story 3 - Advance a file through the approval pipeline (Priority: P3)

An Admin opens a list of uploaded files showing each file's name, its Quest, Mission, Stage, uploader,
upload time, and current Approval Status. The Admin moves a file one step forward, or any number of
steps back, along the workflow order. Vault locates the equivalent Quest and Mission beneath the new
status, creating them and their Dropbox folders if they are not there yet, moves the file under the
same standard name, updates the record, and logs who made the change and when.

**Why this priority**: This is the product's differentiating behavior — the physical pipeline. It
depends on files existing (User Story 2) but is independently demonstrable against uploaded files.

**Independent Test**: Can be fully tested by taking an existing uploaded file, moving it forward one
status, and verifying in Dropbox that the file is gone from the old location, present under the new
status folder at the equivalent Quest/Mission sub-path with an unchanged name, and that Vault's record
and history reflect the change.

**Acceptance Scenarios**:

1. **Given** an Admin viewing the file list, **When** they open a file, **Then** they see its current
   status and exactly the statuses it may move to: the next one forward, and any earlier one.
2. **Given** a file at the third status, **When** an Admin attempts to move it two steps forward,
   **Then** the action is refused and the permitted targets are shown.
3. **Given** a file at the third status, **When** an Admin moves it back to the first status, **Then**
   the move is permitted in a single action.
4. **Given** the target status has no Quest or Mission matching the file's, **When** the change is
   confirmed, **Then** the equivalent entries and their Dropbox folders are created automatically and
   the file is moved into them.
5. **Given** a status change completes, **When** the Admin views the file's history, **Then** the
   previous status, the new status, the acting Admin, and the time are all recorded.
6. **Given** a status change where the file move fails, **When** the failure occurs, **Then** the
   file's recorded status is unchanged, the failure is reported, and the record is flagged so the
   mismatch is visible rather than silent.
7. **Given** a different file already occupies the destination name under the target status, **When**
   the move is attempted, **Then** it is refused and the conflict is reported; nothing is overwritten.
8. **Given** an Uploader, **When** they attempt a status change, **Then** the action is refused.

---

### User Story 4 - Manage the taxonomy (Priority: P4)

An Admin builds and maintains the categorization tree. Approval Statuses sit at the root, each with a
name, a Dropbox folder path, a Dropbox folder URL, and a position in the workflow order that can be
moved up or down. Each Quest is created inside one Approval Status; each Mission inside one Quest;
each Stage inside one Mission. Because the tree is scoped per status, the same Quest, Mission, and
Stage names exist separately under each Approval Status.

**Why this priority**: Without it, the categorization tree must be seeded by a developer. Valuable and
necessary for real operation, but the product can be demonstrated end-to-end before it exists.

**Independent Test**: Can be fully tested by creating a new Quest under one Approval Status, confirming
it appears in the upload form only when that status is selected, reordering two Approval Statuses, and
confirming the new order drives the pipeline's permitted transitions.

**Acceptance Scenarios**:

1. **Given** an Admin on the Approval Status panel, **When** they move a status up or down, **Then**
   the workflow order is persisted and drives both the displayed sequence and the permitted
   transitions.
2. **Given** an Admin creates a Quest, **When** they save it, **Then** they must have chosen the
   Approval Status it belongs to; the same applies to Mission within a Quest and Stage within a
   Mission.
3. **Given** a new Quest under one Approval Status, **When** an Uploader selects a *different* status
   on the upload form, **Then** that Quest is not offered.
4. **Given** a taxonomy entry that existing file records reference, **When** an Admin attempts to
   delete it, **Then** the deletion is refused with an explanation, and the Admin is offered
   deactivation instead so the entry stops appearing in upload menus without breaking history.
5. **Given** an Admin deletes or deactivates an entry that has children, **When** they confirm,
   **Then** the effect on its Missions and Stages is stated before the action completes.
6. **Given** an Admin submits a taxonomy entry with a folder path that is missing or malformed,
   **When** they save, **Then** the entry is rejected with a message identifying the problem.

---

### User Story 5 - Administer user accounts (Priority: P5)

An Admin creates accounts, assigns the Admin or Uploader role, edits accounts, and deactivates or
deletes accounts that should no longer have access.

**Why this priority**: Necessary for operating the tool with a real team, but the initial accounts can
be provisioned directly until it exists.

**Independent Test**: Can be fully tested by creating an Uploader account, signing in as that account
to confirm the role's access, then changing the account's role to Admin and confirming the access
changes accordingly.

**Acceptance Scenarios**:

1. **Given** an Admin on the user panel, **When** they create a user with a role, **Then** that user
   can sign in and sees exactly the access their role permits.
2. **Given** an existing user, **When** an Admin changes their role, **Then** the new permissions apply
   on the user's next request without requiring a redeployment.
3. **Given** an account is deactivated or deleted, **When** that person attempts to sign in, **Then**
   access is refused, while the file records they previously uploaded remain intact and still
   attributed to them.
4. **Given** the only remaining Admin account, **When** an Admin attempts to delete it or demote it,
   **Then** the action is refused so the system cannot be left without an administrator.

### Edge Cases

- **Duplicate standard names on upload**: two uploads selecting the same Quest, Mission, and Stage
  produce an identical file name in the same folder. The second upload is refused (FR-016).
- **Same name already present at the destination during a status change**: a file with the identical
  standard name already sits under the target status folder. The move must not overwrite it; the
  transition fails and reports the conflict.
- **Taxonomy drift between statuses**: because each Approval Status carries its own copy of the tree,
  the same concept may be named or spelled differently from one status to the next (`Marketing` vs.
  `marketing ` vs. `Mktg`). Name matching must be robust to case and surrounding whitespace, and
  anything it cannot match is created fresh under the target status — which is how a near-duplicate
  branch appears.
- **Renaming one copy only**: an Admin renames a Quest under one status but not its counterparts.
  Files already placed keep their recorded names; future transitions match against the new name and
  may create an additional branch.
- **Missing counterpart taxonomy** at the target status when a file transitions.
- **Storage service unavailable or rate-limited** during upload, folder creation, or move.
- **Partial transition**: the destination folders are created but the move then fails, leaving folders
  created and the file in its original location — the record must remain on the old status.
- **File altered outside Vault**: someone moves, renames, or deletes the file directly in Dropbox, so
  Vault's recorded location no longer resolves. The file must surface as a broken record rather than
  appear valid.
- **Taxonomy changed after upload**: a Quest, Mission, or Stage is renamed or its folder path is
  edited after files have already been placed using the old value. Existing files are not renamed or
  relocated retroactively; their recorded name and location remain the truth.
- **Concurrent status changes**: two Admins change the same file's status at the same time; only one
  transition may take effect.
- **Attribute values containing characters Dropbox forbids** in file or folder names.
- **Non-video or unrecognized file type** selected for upload.
- **Very large video files**, and uploads interrupted by a dropped connection mid-transfer.
- **Empty or partial taxonomy**: no Approval Statuses exist, or a status has no Quests, so the upload
  form cannot be completed under it.
- **File at the last status**: no forward target exists, so only backward moves are offered.
- **Single-status workflow**: only one Approval Status exists, so no transition target is available.
- **Reordering statuses under live files**: moving a status up or down changes which transitions are
  legal for files already sitting in the pipeline.

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & Authorization

- **FR-001**: System MUST require every user to sign in with credentials before any screen or data is
  reachable; no part of Vault may be available anonymously. *(REQ-1.1)*
- **FR-002**: System MUST support at least two roles — Admin and Uploader — with Uploader able to
  reach only the upload interface and their own upload records, and Admin able to reach everything.
  *(REQ-1.2)*
- **FR-003**: System MUST enforce role permissions on every action server-side, independently of what
  the interface displays, so a refused action cannot be performed by addressing it directly.
- **FR-004**: System MUST allow Admins to create, view, edit, and remove user accounts and assign each
  account a role. *(REQ-1.3)*
- **FR-005**: System MUST prevent the removal or demotion of the last remaining Admin account.

#### Taxonomy Structure

- **FR-006**: System MUST model the categorization tree as strictly nested: each Quest belongs to
  exactly one Approval Status, each Mission to exactly one Quest, and each Stage to exactly one
  Mission. A Quest, Mission, or Stage MUST NOT be shared across branches.
- **FR-007**: System MUST therefore hold a separate copy of the Quest / Mission / Stage tree under
  each Approval Status, so that the same real-world Quest exists as a distinct entry per status.
- **FR-008**: System MUST determine the counterpart of a Quest, Mission, or Stage under another
  Approval Status by matching its name, ignoring letter case and surrounding whitespace.

#### Upload

- **FR-009**: System MUST provide an upload form where a user selects a video file. *(REQ-2.1)*
- **FR-010**: System MUST require a selection for each of Approval Status, Quest, Mission, and Stage
  before an upload can be submitted, and MUST identify any missing selection. *(REQ-2.2)*
- **FR-011**: System MUST present the four menus as a dependent chain — Quest limited to the chosen
  Approval Status, Mission to the chosen Quest, Stage to the chosen Mission — and MUST clear the
  selections below any level the user changes.
- **FR-012**: System MUST rename every uploaded file to `[Quest] - [Mission] - [Stage].[original
  extension]`, preserving the original file's extension, before it reaches storage. The uploader MUST
  NOT be able to override the resulting name. *(REQ-2.3)*
- **FR-013**: System MUST resolve the destination folder as
  `/[Approval Status folder path]/[Quest folder path]/[Mission folder path]/` using the stored folder
  paths of the selected entries. *(REQ-2.4)*
- **FR-014**: System MUST create any missing folders in the resolved destination path before placing
  the file. *(REQ-2.5, REQ-4.3)*
- **FR-015**: System MUST place the renamed file in the resolved destination folder in Dropbox.
  *(REQ-2.5)*
- **FR-016**: System MUST refuse an upload whose standard file name already exists in the destination
  folder, reporting the conflict and identifying the existing file. It MUST NOT overwrite the existing
  file and MUST NOT alter the name to sidestep the collision.
- **FR-017**: System MUST record for every uploaded file: its standard name, original file name, size,
  file type, the four selected attributes, the uploading user, the upload time, its storage location
  (folder path and link), and its current approval status.
- **FR-018**: System MUST NOT take custody of file content at any point. The file travels from the
  user's device to Dropbox directly; Vault MUST NOT receive, buffer, copy, or store the file's
  contents, and its database holds only the metadata and the reference to the stored file.
  There MUST be no local library, staging area, or attachment store: every file a user sees in Vault
  is a file that lives in Dropbox. *(Constitution Principle I)*
- **FR-019**: System MUST show the uploader, on success, the final file name, the destination folder,
  and the file's current approval status.
- **FR-020**: System MUST leave no file record behind when an upload fails, and MUST report the failure
  in plain language with the option to retry.
- **FR-021**: System MUST reject files whose type is outside the accepted set, identifying the accepted
  types in the message.
- **FR-022**: System MUST reject an attribute value that cannot be expressed in a valid storage file or
  folder name, at the point the taxonomy entry is created rather than at upload time.

#### Taxonomy Management

- **FR-023**: System MUST let Admins create, view, edit, and remove Approval Statuses with a name, a
  Dropbox folder URL, a Dropbox folder path, and a position in the workflow order. *(REQ-3.1)*
- **FR-024**: System MUST let Admins change an Approval Status's position in the workflow order by
  moving it up or down, and MUST keep positions contiguous and unambiguous afterwards. *(REQ-3.1)*
- **FR-025**: System MUST let Admins create, view, edit, and remove Quests with a name, a Dropbox
  folder URL, a Dropbox folder path, and the Approval Status they belong to. *(REQ-3.2)*
- **FR-026**: System MUST let Admins create, view, edit, and remove Missions with a name, a Dropbox
  folder URL, a Dropbox folder path, and the Quest they belong to. *(REQ-3.3)*
- **FR-027**: System MUST let Admins create, view, edit, and remove Stages with a name and the Mission
  they belong to. *(REQ-3.4)*
- **FR-028**: System MUST present the taxonomy panels so an Admin can see which Approval Status a
  Quest sits under, and browse down through Missions and Stages from there.
- **FR-029**: System MUST refuse deletion of any taxonomy entry referenced by an existing file record,
  and MUST instead offer deactivation, which removes the entry from upload menus while preserving
  existing records and history.
- **FR-030**: System MUST state the effect on child entries before deleting or deactivating a taxonomy
  entry that has children.
- **FR-031**: System MUST treat a taxonomy edit as forward-looking only — already-uploaded files are
  neither renamed nor relocated as a result.

#### Approval Pipeline

- **FR-032**: System MUST provide Admins a list of uploaded files showing at least the standard file
  name, Quest, Mission, Stage, uploader, upload time, and current Approval Status, with the ability to
  filter by status. *(REQ-4.1)*
- **FR-033**: System MUST allow Admins — and only Admins — to change a file's Approval Status.
  *(REQ-4.2)*
- **FR-034**: System MUST permit a file to move forward only to the immediately next position in the
  workflow order, and backward to any earlier position. Forward jumps of more than one position MUST
  be refused.
- **FR-035**: System MUST show, for each file, exactly which statuses it may currently move to.
- **FR-036**: On a status change, System MUST resolve the counterpart Quest and Mission under the
  target Approval Status by name (per FR-008), and MUST create the missing taxonomy entries and their
  Dropbox folders automatically — carrying the same names and deriving folder paths beneath the target
  status folder — so that a transition is never blocked by taxonomy that has not been duplicated yet.
  *(REQ-4.3)*
- **FR-037**: Once the destination is confirmed or created, System MUST move the stored file from its
  previous Approval Status folder to the new one, keeping the standard file name unchanged.
  *(REQ-4.4)*
- **FR-038**: System MUST update the file's recorded status, taxonomy references, and stored location
  only after the move succeeds; if the move fails, the record MUST remain on the previous status and
  the failure MUST be reported.
- **FR-039**: System MUST refuse a move that would overwrite a different file already occupying the
  destination name, and MUST report the conflict.
- **FR-040**: System MUST record every status change as an append-only history entry capturing the
  previous status, the new status, the acting Admin, and the time. History entries MUST NOT be
  editable or deletable. *(Constitution Principle II)*
- **FR-041**: System MUST ensure that when two Admins change the same file at the same time, only one
  transition takes effect and the other is told the file has already moved.
- **FR-042**: System MUST surface a file whose stored object can no longer be found at its recorded
  location as a broken record requiring attention, rather than presenting it as valid.

#### Access to Stored Files

- **FR-043**: System MUST NOT expose storage credentials to the browser, and any link it provides to a
  stored file MUST be limited in time rather than a permanent public URL.
  *(Constitution Principle IV)*

#### Interface Language

- **FR-044**: Every user-facing string — labels, menus, buttons, validation and error messages, empty
  states, confirmations, and displayed dates and numbers — MUST be in English. The application offers
  no second language and no language switcher. *(Constitution Principle VI)*

### Key Entities

- **User**: A person who can sign in. Attributes: identifier, display name, sign-in credential, role
  (Admin or Uploader), active/inactive, created time. Referenced by file records and history entries.
- **Approval Status**: A stage of the approval pipeline and the root folder that physically holds files
  in that stage. Attributes: name, Dropbox folder path, Dropbox folder URL, workflow position,
  active/inactive. Ordered relative to other statuses; parent of its own Quest tree.
- **Quest**: The first level of categorization beneath one Approval Status. Attributes: name, Dropbox
  folder path, Dropbox folder URL, parent Approval Status, active/inactive. The same real-world Quest
  appears once per Approval Status as separate entries linked by name.
- **Mission**: The second level, beneath one Quest. Attributes: name, Dropbox folder path, Dropbox
  folder URL, parent Quest, active/inactive.
- **Stage**: A label identifying the video within its Mission; contributes to the file name only and
  has no folder of its own. Attributes: name, parent Mission, active/inactive.
- **File Record**: The system's record of one uploaded video. Attributes: standard file name, original
  file name, size, file type, current Quest / Mission / Stage references, current Approval Status,
  current storage folder path and link, uploading user, upload time, last-changed time, integrity
  state (valid or broken). Holds no file content.
- **Status Transition**: One append-only history entry for a file's status change. Attributes: file,
  previous status, new status, acting user, time, outcome.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of files placed through Vault carry the exact standard name
  `[Quest] - [Mission] - [Stage].[extension]` and sit at the exact folder path derived from their
  attributes — verified by auditing every stored file against its record, with zero deviations.
- **SC-002**: An Uploader can complete an upload — from opening the form to confirmation — in under
  2 minutes for a typical file, excluding transfer time.
- **SC-003**: 100% of unauthenticated requests to any screen or data are refused, and 100% of
  Uploader attempts to reach Admin-only functions are refused.
- **SC-004**: An Admin can change one file's status and see it confirmed in under 30 seconds,
  including any folder or taxonomy creation the move requires.
- **SC-005**: Every status change in the system has a corresponding history entry naming the actor,
  both statuses, and the time — 100% coverage, with no file reaching a status by any other means.
- **SC-006**: Zero files are lost, overwritten, or orphaned by an upload or a status change: after any
  operation, every file record resolves to exactly one stored file.
- **SC-007**: 100% of status changes succeed without an Admin having to create taxonomy by hand
  beforehand, because missing counterparts are created automatically.
- **SC-008**: 90% of Uploaders complete their first upload correctly without assistance, measured on
  first attempts during onboarding.
- **SC-009**: Time spent per upload on manual naming and folder navigation drops to zero, replaced by
  four menu selections.
- **SC-010**: An Admin can add a new Quest, Mission, or Stage and have it available in the upload form
  immediately, with no developer involvement and no redeployment.
- **SC-011**: Every failure — unreachable storage, name conflict, disallowed transition, failed move —
  produces a plain-language message and leaves the system in a consistent state, with no partial
  records.

## Assumptions

- **Taxonomy is scoped per Approval Status** by explicit decision: Quest belongs to a status, Mission
  to a Quest, Stage to a Mission. The accepted trade-off is that the tree is duplicated under every
  status and can drift between copies. FR-036's automatic creation of missing counterparts on
  transition is what keeps that duplication from blocking the pipeline; the alternative — refusing the
  transition until an Admin creates the counterpart by hand — was rejected as it contradicts REQ-4.3.
- **Name matching across statuses** is case-insensitive and ignores surrounding whitespace. Two
  differently-spelled names are treated as different concepts and produce separate branches.
- **Seeded start**: initial Approval Statuses, Quests, Missions, Stages, and at least one Admin
  account are provisioned before the taxonomy and user-management screens exist, so the upload and
  approval stories can be delivered and demonstrated ahead of User Stories 4 and 5.
- **Path vs URL**: the stored Dropbox folder *path* is what the system uses to compute destinations
  and move files; the stored folder *URL* is a convenience link for humans to open the folder. Where
  the two disagree, the path governs.
- **Uploader visibility**: an Uploader can see a read-only list of the files they personally uploaded,
  with each file's current status. They cannot see other users' uploads and cannot change any status.
- **Newly uploaded files start at the Approval Status the uploader selected** — the form permits any
  active status as a starting point rather than forcing the first position in the workflow order.
- **Accepted files**: common video formats. Non-video files are rejected. Individual files are assumed
  to be large (hundreds of megabytes to a few gigabytes), so the upload experience must show progress
  and tolerate slow transfers.
- **Credentials**: standard email/username and password sign-in with sessions. Single sign-on,
  multi-factor authentication, and self-service password reset are not part of this feature.
- **One connected Dropbox account** serves the whole application; users do not connect their own
  Dropbox accounts.
- **Stage has no folder**: Stage affects the file name only, consistent with the PRD listing a name as
  its sole field.
- **Deactivation over deletion**: taxonomy entries and user accounts in use are deactivated rather
  than deleted, to keep historical records readable.
- **Interface**: the application follows the Vault Design System (dark theme, documented tokens and
  components) as required by the project constitution, and is written in English only — including for
  users who speak another language. Localization is not planned.
- **No custody of files**: Vault never holds the file itself. The transfer runs from the user's device
  straight to Dropbox; Vault authorizes it, decides the name and destination, and records what
  happened. Any behavior that would require reading the file's contents — playback, thumbnails,
  duration detection, transcoding — is therefore impossible by design, not merely out of scope.

## Out of Scope

- Playback or streaming of uploaded video inside Vault.
- Downloading source files through Vault, and any local copy, staging area, or file library
  inside the application.
- Editing, transcoding, or generating thumbnails or previews for uploaded video.
- Any language other than English, and any localization or language-switching mechanism.
- Bulk upload of multiple files in a single submission, and bulk status changes across many files.
- A tool for copying or synchronizing a taxonomy branch between Approval Statuses in bulk;
  counterparts are created one at a time as files transition (FR-036).
- Comments, review notes, or rejection reasons attached to a file.
- Email or chat notifications when a file changes status.
- Reconciling files that were placed in Dropbox outside of Vault.
- Self-service registration, password reset, single sign-on, and multi-factor authentication.
- Any storage provider other than Dropbox.
