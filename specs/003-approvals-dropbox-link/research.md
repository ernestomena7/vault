# Phase 0 Research: Open a File's Dropbox Location from the Approvals Queue

**Date**: 2026-09-03
**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

This is almost entirely a UI feature consuming a capability feature 001 already built. Every decision
below is about how to surface that capability correctly, not about building new server logic.

The most consequential finding is **R-002**: without it, the feature would work on some clicks and
silently fail on others, in a way that would be maddening to debug because it depends on browser
popup-blocking heuristics rather than anything wrong with the code.

---

## R-001: One correction to the spec's own Assumptions

**Finding**: The spec states that Constitution Principle V "requires every route to be covered" by
the mandatory authorization suite. That overstates it. The constitution's actual wording is:

> Automated tests are REQUIRED for: allowed and rejected approval-state transitions, authorization on
> every file-**mutating** route, and the Dropbox adapter contract… Features outside those areas
> SHOULD be tested in proportion to their risk.

`GET /api/files/:id/link` mutates nothing in Vault's own database — it causes Dropbox to mint a link,
but Vault's state is unchanged. It is therefore not in the MUST list. It is, however, exactly the kind
of route the SHOULD applies to with real force: it is the one route whose whole job is to hand out a
link to file content, and it has zero integration-test coverage today despite already containing the
correct ownership logic (`restrictToUploaderId` for an Uploader, unrestricted for an Admin).

**Decision**: Cover it as a SHOULD, proportional to its risk, not because the constitution mandates it.
The distinction matters for how this is talked about later — this is diligence, not compliance.

**Touches**: `tests/integration/link-route.test.ts` (new), not the mandatory
`tests/integration/authorization.test.ts` matrix, whose own documentation scopes it to mutating
routes specifically.

---

## R-002: The popup-blocker trap *(decisive)*

**Finding**: The control cannot be a plain `<a href="/api/files/:id/link">`. That route returns JSON,
not a redirect — a static anchor would open a new tab showing raw `{"url":"...","expiresAt":"..."}`
text, not Dropbox. Opening the actual location requires: call the route, read `url` from the response,
then navigate a new tab to it. That means the flow needs an `await` before the tab can open.

That gap is the trap. Browsers permit `window.open` only when it runs as the direct result of a user
gesture (a click), and several — Safari consistently, Chrome under some conditions — stop treating a
handler as "direct" once it has resumed after an `await`. A naive implementation:

```text
onClick → await fetch(...) → window.open(url)   // BLOCKED in enough browsers to matter
```

would work in some browsers and silently do nothing in others, and the failure would look like "the
button doesn't work" with no error, no console message a typical admin would notice, and no pattern an
engineer could reproduce without knowing to check *which* browser.

**Decision**: Open a blank tab **synchronously**, inside the click handler, before any `await`:

```text
onClick → const tab = window.open('', '_blank')   // still inside the user gesture
        → await fetch(...)
        → tab.location.href = url                 // now safe; the tab already exists
```

On failure, the already-open blank tab is closed (`tab.close()`) rather than left as a dead empty tab,
and the failure message (FR-007) is shown in the queue itself, not inside that tab.

**Touches**: the client-side handler backing FR-001–FR-004 and FR-007–FR-008. No server change.

**Alternatives considered**: a same-tab intermediate redirect page (rejected — reintroduces exactly the
navigation-away problem FR-002 exists to prevent); accepting the occasional silent failure as a known
limitation (rejected — indistinguishable from the feature simply not working, for a browser-share large
enough to matter).

---

## R-003: Stopping the click from also opening the file's detail page

**Finding**: `Table.jsx`'s row itself carries the click handler (`onClick={() => onRowClick(row)}` on
the `<tr>`), which is what already opens `/files/:id` when an Admin clicks anywhere on a row. Any
interactive element placed inside a cell's rendered content sits inside that `<tr>`, so its click
bubbles up and triggers the row navigation in addition to whatever the element itself does — exactly
the conflict FR-003 and User Story 1 scenario 3 call out.

**Decision**: The control's own click handler calls `event.stopPropagation()` before doing anything
else. This is the standard, minimal fix for a nested interactive element inside a clickable row, and it
requires no change to `Table.jsx` itself — the row-click contract is otherwise exactly what the rest of
the Approvals queue already depends on.

**Touches**: the new column's cell renderer in `src/components/files-table.tsx`.

---

## R-004: The control's icon — a small, real design-system gap

**Finding**: The design system's `Icon` component has no "open externally" glyph. Its registered set
(`alert-circle`, `download`, `film`, `folder`, `play`, …) has nothing for "this opens somewhere else."
Reusing an unrelated glyph (`maximize`, say) would mislabel the action to anyone who has learned Lucide's
visual vocabulary elsewhere.

**Decision**: Add the standard Lucide `external-link` glyph (a box with an arrow escaping its corner) to
the design system's `Icon.jsx` registry, then re-sync — the same pattern already used for `Select`'s
`size` prop and `Button`'s native `type`. This is not a new component, just one more entry in an
existing map.

**Touches**: `Vault Design System/components/foundations/Icon.jsx`, then `npm run ds:sync`.

---

## R-005: Per-row loading and disabled state, without a new column of buttons doing double duty

**Finding**: FR-008 requires that a second activation of the same control cannot start a second request
while the first is in flight, and FR-006 requires the control to render as disabled — with a reason —
for a file already marked broken. Both are per-row, transient UI state that has no business being
persisted or lifted to the page level; `FilesTable` already renders from a plain list of rows with no
existing per-row interactive state.

**Decision**: The new cell is its own small client component (`DropboxLinkButton`), owning its own
`busy` state locally. It receives the row's `id`, `dropboxFolderPath`/`standardName` are not needed
client-side (the route resolves those server-side from the id) and `integrityState` to decide up front
whether to render enabled or disabled-with-tooltip. No prop drilling of a shared busy-map through
`FilesTable`.

**Touches**: new file `src/components/dropbox-link-button.tsx`; `src/components/files-table.tsx` adds
one column that renders it.

**Alternatives considered**: a single page-level "which row is busy" state in `FilesTable` (rejected —
adds a shared mutable map for a concern that is entirely local to one cell, for no benefit).

---

## R-006: What the response already provides, and what still needs a message

**Finding**: The route's existing error mapping already produces plain-language messages for both
failure modes FR-007 needs to cover:

| Cause | Existing status | Existing message |
|---|---|---|
| File missing from Dropbox (should not normally be reached — `integrityState` pre-empts it, R-005) | `404 not_found` | "That file could not be found in Dropbox." |
| Dropbox unreachable | `502 storage_unavailable` | "Dropbox could not be reached. Nothing was changed, so you can try again." |
| Not signed in | `401 unauthenticated` | "Sign in to continue." |

None of these need new wording. The client only needs to surface `error.message` from the response
body it already receives in the failure case.

**Touches**: nothing new — confirms FR-007 is satisfied by the existing envelope, not a reason to add
server-side messages.

## Sources

- [Constitution](../../.specify/memory/constitution.md), Principle V (mandatory vs. SHOULD test scope)
- [Feature 001 contracts](../001-dropbox-upload-approval/contracts/api.md), `GET /api/files/:id/link`
- `Vault Design System/components/data/Table.jsx` (row-click behavior)
- `Vault Design System/components/foundations/Icon.jsx` (registered glyph set)
