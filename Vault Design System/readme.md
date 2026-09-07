
# Vault Design System

Vault ("SUTDB" — Standard Upload Tool for Dropbox) is a web app for teams that push video into Dropbox in a controlled way: upload to a specific folder, apply a naming convention, route the file through an approval flow, and let approved viewers stream it back temporarily without downloading the source file. This design system covers the dark, technical visual language for that product and the primitives needed to build it: every input type, a dashboard, tables, an admin screen, and a profile screen.

## Sources
- **Brief**: product description provided directly in chat (no attached codebase or Figma file).
- **Moodboard**: `uploads/Mission Quest.png` — a generic dark analytics-dashboard reference image, used only as a style cue (near-black surfaces, glass panel cards, indigo/blue gradient charts, soft glow accents). Its literal content (KPI cards, a world map, a sales chart) is not part of Vault's product and was not copied — only the surface treatment.
- No design system, component library, or repo was attached, so the component inventory below is an original, from-scratch standard set sized to what an upload/approval/streaming product needs (see "Intentional additions" under Components).

## Content fundamentals
**Voice**: friendly but not cute. Plain sentences, contractions, second person ("you"). Warmth comes from clarity, not jokes.
- Error: "Hmm, that upload didn't go through. Check your connection and try again."
- Empty state: "Nothing here yet. Upload your first video to get started."
- Approval: "Marta approved *onboarding_v3.mp4*. It's live for viewers now."

**Casing**: sentence case everywhere — buttons, nav labels, table headers, toasts. Never Title Case, never ALL CAPS except tiny metadata labels (e.g. status pills, section eyebrows) which use letter-spaced small caps-style uppercase at 12px.

**Pronouns**: "you" for the person using the app; name people by their real name or role in shared contexts ("Marta approved…", not "The approver approved…").

**Numbers & files**: file names, folder paths, durations and IDs are always set in the mono type (`JetBrains Mono`) so they read as data, not prose — e.g. a table row's filename column, a video's duration badge, a webhook URL.

**Emoji**: not used. This is a technical, approval-gated tool — status is communicated with color + a short word (Pending / Approved / Rejected), never an emoji.

## Visual foundations
**Palette**: one dark theme, no light mode. Backgrounds run from near-black (`--bg-app`, `#08080b`) up through two lighter surface steps for cards and raised panels. One accent — electric indigo (`--accent`, `#6e5bff`) — carries every primary action, focus ring, link, and progress indicator. Status color is the only other color allowed to lead: amber for pending, emerald for approved, red for rejected, sky blue for in-progress/info. No decorative gradients on surfaces; the only gradient use is a subtle two-stop accent wash behind empty states or the auth screen, never on buttons or cards.

**Type**: Plus Jakarta Sans for everything a person reads as prose or UI chrome (headings, labels, body). JetBrains Mono for anything that is data: filenames, paths, timestamps, IDs, durations, code-like values. See "Missing fonts" below.

**Spacing**: 4px base scale (4/8/12/16/20/24/32/40/48/64/80/96). Layouts are generously spaced — dense data (tables) tightens to the 8/12 steps, everything else uses 16–32.

**Backgrounds**: flat near-black, no photography, no illustration, no full-bleed imagery, no repeating textures. The only depth cues are elevation (a lighter surface color per level) and, sparingly, a soft indigo glow (`--glow-accent`) behind a primary CTA or an active upload's progress bar.

**Glass & blur**: reserved for floating chrome that sits over content — modals, dropdown menus, toasts, the command palette. These use `--bg-surface-glass` (a translucent dark fill) with `backdrop-filter: blur(20px)`. Static page surfaces (cards, tables, sidebars) are opaque — blur is a signal that something is temporary/overlaid, not a general texture.

**Borders & elevation**: 1px hairline borders (`--border-subtle`) delineate cards and table rows instead of drop shadows in most cases, because shadows barely read on a near-black background. Shadows (`--shadow-sm/md/lg`) are used only for things that truly float above the page: menus, modals, toasts.

**Radii**: kept tight and technical — 4px small controls, 8px inputs/buttons, 12px cards, 16px modals. Nothing pill-shaped except true pills (status badges, tags, the search field).

**Animation**: fast and quiet. 120–200ms ease-out fades and 4–8px slides for menus/toasts/modals. No bounce, no spring, no spin-in. A determinate progress bar animates width linearly; an indeterminate one uses a slow looping gradient sweep, not a spinner, wherever a horizontal bar fits.

**Hover / press**: hover lightens one step (surface → surface-raised, or accent → accent-hover); press darkens one step (accent → accent-active) and the element does not scale or shrink — feedback is color-only, matching the "quiet" motion approach.

**Focus**: every interactive element gets a visible 3px indigo focus ring (`--shadow-focus`) on `:focus-visible` — never removed, since this is a keyboard-heavy, table-and-form-heavy tool.

**Imagery**: no product photography or illustration exists in this brief. Video thumbnails in the UI kit are placeholder frames (flat color + play icon), clearly marked as placeholders, not generated art.

## Iconography
Icons are [Lucide](https://lucide.dev) (MIT/ISC-licensed, outline style, 2px stroke) rather than hand-drawn — no codebase or Figma icon set was attached to copy from, and Lucide's stroke weight matches the moodboard's technical feel. `components/foundations/Icon.jsx` renders each glyph as inline SVG path data (copied in, not loaded from a URL) so it recolors via `currentColor`/`color` and renders correctly under screenshot and PPTX-export tooling. No icon font, no emoji, no unicode glyphs used as icons anywhere in the kit.

## Missing font — flagged
"General Sans" (the initial font pick) is not distributed on Google Fonts and no font files were provided, so it's substituted with **Plus Jakarta Sans**, a geometric/humanist grotesque with a similar shape language, loaded via Google Fonts. If you have General Sans's actual font files, send them over and I'll swap them in — everything references the token `--font-sans`, so it's a one-file change.

## Components
No component library or Figma file was attached, so this is a from-scratch standard set sized to Vault's upload/approval/streaming flows. Grouped by directory under `components/`:
- **foundations/** — `Icon`
- **forms/** — `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `FileDropzone`
- **feedback/** — `Badge`, `Tag`, `ProgressBar`, `StatusPill`, `Toast`
- **navigation/** — `Tabs`, `Breadcrumbs`, `Sidebar`
- **overlay/** — `Dialog`, `Tooltip`, `DropdownMenu`
- **data/** — `Table`, `Avatar`, `Card`

**Intentional additions** beyond a typical base kit, because Vault's brief calls for them specifically: `FileDropzone` (the core upload entry point), `StatusPill` (the approval-flow state — pending/approved/rejected/processing), `Breadcrumbs` and `Sidebar` in mono/icon style for folder-path navigation.

## UI kit
`ui_kits/vault-app/` — one interactive app shell (`index.html`) covering all six screens the brief asked for, navigable via the sidebar:
- **Dashboard** — stat cards + a recent-uploads table
- **Uploads** — drag-and-drop upload, naming-convention picker with a live filename preview, full uploads table
- **Approvals** — the approval queue with per-video approve/reject (reject opens a dialog for a reason)
- **Player** — the temporary streaming/consume view (placeholder frame, scrubber, expiry notice, download disabled)
- **Admin** — Users / Folders / Naming-rules tabs
- **Profile** — account details, notification switches, API token

## Guidelines cards (`guidelines/`)
Foundation specimens for the Design System tab: neutral scale, accent scale, semantic/status colors, display/heading/body/mono type, the 4px spacing scale, corner radii, elevation & glass, motion, the wordmark, and iconography.

## Index
- `styles.css`, `tokens/*.css` — the token source of truth
- `readme.md` — this file
- `SKILL.md` — portable skill file for Claude Code / other agents
- `thumbnail.html` — homepage tile
- `components/` — 24 primitives (see above), each with `.jsx` + `.d.ts` + `.prompt.md` + a card
- `guidelines/` — 13 foundation specimen cards
- `ui_kits/vault-app/` — the full click-through app
