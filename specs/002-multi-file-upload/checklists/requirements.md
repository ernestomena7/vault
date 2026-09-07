# Specification Quality Checklist: Multi-File Upload with Per-File Stages and Distinguishing Text

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-02
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

### Iteration 1 — 2026-09-02

Three [NEEDS CLARIFICATION] markers raised: partial-failure semantics, batch persistence, and
whether Uploaders may create Stages. Questions put to the user.

### Iteration 2 — 2026-09-02 (all items passing)

**Resolved by user decision:**

1. **Partial failure → keep what landed, and mark it** (Q1 = C). Nothing is ever deleted from
   storage to undo a batch (FR-026). Files from an unfinished set carry a visible mark until the set
   completes or someone dismisses it (FR-027 to FR-029).
2. **The batch is not stored** (Q2 = A). No batch entity; retry lives in the open form only
   (FR-031, FR-033).
3. **Only Admins create Stages** (Q3 = A). Taxonomy stays Admin-only; an Uploader missing a Stage is
   told plainly to ask an Admin (FR-035).

**A contradiction between answers 1 and 2, and how it was reconciled.** Q1's "marked until you retry
or dismiss" implies something persists; Q2 says the batch does not. Resolved by putting the mark on
each **file** rather than on a batch: no new entity (honouring Q2), and the mark survives a page
reload (honouring Q1). What does not survive a reload is the retry list itself — the failed files
must be added again by hand. Recorded in Assumptions and asserted by User Story 4, scenario 6.

**Mid-specification change from the user — the naming convention itself.** Files may now share a
Quest, Mission **and** Stage, distinguished by a user-written text:
`[Quest] - [Mission] - [Stage] - [Distinguishing text].[ext]`. This is not confined to this feature —
it **amends feature 001's FR-012 and SC-001**, which are already implemented. Handled as follows:

- The text is **optional** (FR-002). A file without one keeps 001's exact name, so nothing already
  uploaded becomes inconsistent and no existing habit breaks. Recorded as an assumption; making it
  mandatory would be a much larger change and was not what was asked.
- One naming rule for every upload path, single or batched (FR-006), so the two screens cannot drift.
- Case and surrounding whitespace are normalized before conflict checking (FR-005), so "Take 2",
  "take 2" and " take 2 " cannot be used to push a duplicate through.
- User Story 2 exists solely to cover this, since it is a distinct journey from batching.

**Downstream impact to raise at planning time**: feature 001's naming function, its upload form, and
the `files` table all change. The destination uniqueness rule still holds unchanged, because the
distinguishing text is part of the assembled name that rule already covers.

**Resolved by informed default (no marker spent):**

- One upload screen for one file or many; a batch of one behaves as today.
- A live preview of the resulting name as the Uploader types.
- Sequential transfers, in listed order.
- Maximum 20 files per batch.
- Same Stage and text with different extensions is permitted; the names differ.
- No change to visibility rules, the approval workflow, or the interface language.

**Status**: 15 of 15 items passing. Spec is ready for `/speckit-plan`.
