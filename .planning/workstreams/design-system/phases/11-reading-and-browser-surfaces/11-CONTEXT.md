# Phase 11: Reading and Browser Surfaces - Context

**Gathered:** 2026-09-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Long-form reading and the browser's own chrome obey the palette instead of the user agent defaults. This phase extracts the byte-identical prose-typography block currently duplicated across 13 files (10 blog posts, research, compare) into a single reusable measure-only class, applies that same class to the Pricing FAQ (which has no shared prose treatment today), themes `::selection`, `caret-color` and content-area scrollbars from the palette in both themes (today none of the three exist outside the sidebar's own scrollbar styling), and removes the confirmed-dead `[data-score]` CSS rule while leaving the existing hand-applied `.tabular-nums` usage (already present across 19 files) as the app's actual mechanism. Requirements: TYPE-04, SURF-01, SURF-02.

Live audit at discussion time (2026-09-21), grounding the discussion in the actual code rather than the roadmap's prose alone:
- Blog (10 posts), `app/research/wow-classic-loot-systems-2026/page.tsx`, and `app/compare/page.tsx` all repeat an identical inline block: `prose prose-invert prose-lg max-w-none [&_h2]:... [&_p]:... [&_a]:...` (a long arbitrary-variant Tailwind chain), wrapped in an outer `<div className="max-w-3xl mx-auto">` (blog/research) or `<div className="max-w-4xl mx-auto">` (compare). The two different outer widths (768px vs 896px) are what produces the audited 87-112ch range.
- `app/pricing/page.tsx`'s FAQ section does **not** use the shared prose block at all. FAQ answers are plain `<p className="font-poppins text-15 text-[#bababa] leading-relaxed">`, inheriting the page's outer `max-w-4xl` with no measure constraint of their own.
- `app/globals.css` has **zero** `::selection` or `caret-color` rules today (confirmed by direct grep, not assumed). Only `.sidebar-scrollable::-webkit-scrollbar` (lines ~367-390) is themed; every other scrollable region (main content, modals, dropdowns, tables) uses the browser default.
- `[data-score]` (globals.css:298-303, actually the shared rule block at ~325-330 alongside `td, th, .tabular-nums`) has **zero** real consumers anywhere in `app/` or `components/` — confirmed by grep; its only other appearance is as prose text on the design-system docs page. Tailwind's built-in `.tabular-nums` utility, by contrast, is already hand-applied across 19 files (attendance, raid-tracking, loot-management, master-sheet, admin/analytics, audit-log, and others).

</domain>

<decisions>
## Implementation Decisions

Hard constraints inherited from the roadmap and from every prior phase in this workstream: no user-facing copy changes; nothing edited in the codebase without the user's explicit confirmation at the plan's blocking checkpoint; CI green on every commit; screenshot comparison before the first edit and after the last. This phase's own roadmap risk note adds one more: narrowing the prose measure re-flows public marketing pages that the sprint workstream is actively measuring against a cohort baseline — any change that pushes a proof element below the fold on a public page must be flagged at the checkpoint by name, never silently absorbed as an intended-change.

### Prose container mechanism (TYPE-04)
- **D-01:** The new reusable class controls the reading *measure only* — it does not consolidate the existing `prose prose-invert prose-lg [&_h2]:...` typography block. That block stays exactly as it is, verbatim, on every page it appears on today. Matches TYPE-04's literal wording (a measure problem, not a typography-consolidation problem) and keeps this phase's diff to the smallest change that satisfies the success criterion. | **Reversibility:** reversible — a single new class and one wrapper-level className swap per page; the existing prose block is untouched and needs no re-migration if this is ever revisited.
- **D-02:** The measure is expressed as a CSS `ch`-unit width (targeting ~70ch, the midpoint of the 65-75ch range), not a fixed rem/px value. `ch`-units directly express "character measure" and stay correct if the base font-size ever changes; a fixed pixel value would silently drift from the target the next time type scale is touched.
- **D-03:** The Pricing FAQ gets the *same* shared measure class as blog/research/compare, applied to the FAQ answers alongside their existing distinct typography (`font-poppins text-15 text-[#bababa]`). This unifies the measure mechanism across exactly the four page types ROADMAP names, without touching FAQ's own look-and-feel or its unrelated `text-[#bababa]` literal (out of this phase's scope — a generic gray literal, not one of Phase 10's five named WoW/brand hex values).

### Selection & caret color (SURF-01)
- **D-04:** `::selection` uses a translucent accent wash as the background (e.g. `hsl(var(--accent) / 0.3)`), with the selected text's own color mostly preserved rather than inverted. On-brand without sacrificing readability. Applies in both light and dark via the existing `--accent` token pair.
- **D-05:** `caret-color` matches `--accent` (`hsl(var(--accent))`), consistent with the single-accent-color language this workstream established in Phase 10 (COLOR-07's purple-to-accent migration). Both themes use the same relative-token expression.

### Content-area scrollbars (SURF-01)
- **D-06:** The themed scrollbar styling applies globally — every scrollable region in the app (main content, modals, dropdowns, horizontally-scrolling tables) inherits it, not only the page-level vertical scroll. Single source of truth rather than a main-content-only carve-out that leaves other scrollable regions on the browser default.
- **D-07:** The global scrollbar style reuses the sidebar's exact existing treatment (`--border` for the thumb, transparent track, hover state) rather than a separate, more subtle style tuned for wide content areas. One scrollbar language app-wide; zero new tokens.

### Tabular numerals and the dead `[data-score]` rule (SURF-02)
- **D-08:** `[data-score]` is deleted from `app/globals.css` outright, not wired up to real elements. It has zero consumers today; the existing hand-applied `.tabular-nums` usage across 19 files remains the app's actual mechanism for numeric-column alignment. Matches ROADMAP success criterion 3's simpler "removed" branch over "wired to real elements."
- **D-09:** This phase does not audit the app for numeric displays that currently lack `.tabular-nums` entirely. Scope stays at the dead-code cleanup ROADMAP names; a completeness sweep of every score/attendance/rank/price display is explicitly out of scope, consistent with this phase's "lowest risk in the milestone" framing. If the planner or a screenshot check happens to notice an obviously-jittering numeric column while doing the in-scope work, name it and defer it rather than fixing it inline.

### Claude's Discretion
- The exact CSS selector mechanics for making the scrollbar styling apply globally (a wildcard selector, a `body`/`html`-level rule, or a `@layer base` rule) — whichever matches this file's existing authoring convention best.
- The exact class name for the new measure-only prose class (e.g. `.prose-measure`, `.reading-measure`) — planner's choice, should read clearly next to the existing `prose`/`prose-invert`/`prose-lg` classes it sits alongside.
- Whether the measure class is a plain CSS class in `app/globals.css` under `@layer components` or a Tailwind `theme.extend` utility — whichever fits this repo's existing pattern for single-purpose reusable classes (see Phase 07-10's own token/class additions for precedent).
- The exact alpha value for the `::selection` accent wash (D-04 names ~0.3 as an example, not a locked number) — tune for readability against both themes' text colors, confirmed at the checkpoint's screenshot step.
- Whether `::selection`'s foreground/text color needs an explicit override or can rely on the element's own inherited color — technical detail, resolved by whichever renders correctly against the accent-wash background in both themes.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/workstreams/design-system/ROADMAP.md` §"Phase 11: Reading and Browser Surfaces" — goal, success criteria, and the above-the-fold risk note this phase must not silently absorb
- `.planning/workstreams/design-system/REQUIREMENTS.md` §"Browser surfaces (SURF)" and the TYPE-04 line under Typography — exact requirement wording for TYPE-04, SURF-01, SURF-02

### Prior-phase precedent this phase follows
- `.planning/workstreams/design-system/phases/07-token-foundation/07-CONTEXT.md` — contrast-measurement precedent (D-family decisions on `--foreground-muted`/accent-text contrast) relevant to confirming the `::selection` accent wash and caret color read correctly in both themes
- `.planning/workstreams/design-system/phases/09-type-and-card-migration/09-CONTEXT.md` — D-05's precedent for routing screenshot-flagged concerns ("cramped, clipped or wrapped") by screen name rather than fixing inline, the same posture this phase's own risk note requires for any above-the-fold shift
- `.planning/workstreams/design-system/phases/10-colour-literal-migration/10-CONTEXT.md` — the single-accent-color language (D-01 through D-04) that D-05 (caret color) here extends to a new surface

### Code locations named during discussion (live-verified, not assumed)
- `app/globals.css` — the confirmed-empty `::selection`/`caret-color` region, the `.sidebar-scrollable` scrollbar block (~lines 367-390) to generalize, and the dead `[data-score]` rule inside the shared `td, th, [data-score], .tabular-nums` block (~lines 325-330)
- `app/blog/*/page.tsx` (10 files), `app/research/wow-classic-loot-systems-2026/page.tsx`, `app/compare/page.tsx` — the duplicated prose block and its two different outer max-widths (`max-w-3xl` vs `max-w-4xl`)
- `app/pricing/page.tsx` — the FAQ section (`FAQ.map`) with no shared prose treatment, distinct `font-poppins`/`text-15`/`text-[#bababa]` typography

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- The existing `prose prose-invert prose-lg max-w-none [&_h2]:...` block: proven, already-shipped typography styling that D-01 deliberately leaves untouched — the new measure class is additive, not a replacement.
- `--accent` token pair (light/dark), already established and consumed app-wide since Phase 10 — D-04/D-05 extend it to `::selection` and `caret-color` rather than introducing a new token.
- `.sidebar-scrollable`'s existing `::-webkit-scrollbar`/Firefox `scrollbar-color` rules (using `--border`) — D-07 generalizes this exact block rather than authoring a new visual language.

### Established Patterns
- This workstream's guard-test convention (`__tests__/*.test.ts` reusing `sourceFiles`/`matchesIn` from `__tests__/design-tokens/source-files.ts`) — likely applies to a guard preventing a new per-page max-width literal from reappearing on the four target pages, and to confirming the dead `[data-score]` rule stays gone (mirroring Phase 10's `background-inset-absence.test.ts` precedent for a deleted, previously-dead-in-part token).
- This workstream's disclosed-scope-limit convention in every guard's header comment — any new guard for this phase should follow the same pattern.

### Integration Points
- The four target pages (10 blog posts + research + compare + pricing) render through distinct `page.tsx` files with no shared layout component between them today — the measure class is a CSS-level fix, not a component-level one, consistent with D-01's "measure only" framing.
- `app/globals.css`'s `@layer base` block is where `::selection`, `caret-color` and the generalized scrollbar rule most likely belong, alongside the existing base-layer rules (`html`, `body`, the tabular-nums block).

</code_context>

<specifics>
## Specific Ideas

No specific visual references or "I want it like X" moments beyond what's captured in the decisions above — every choice was resolved by taking the recommended option, each grounded in a live code finding from the discussion.

</specifics>

<deferred>
## Deferred Ideas

- A full app-wide audit of numeric displays for missing `.tabular-nums` coverage (D-09) — explicitly out of this phase's scope; if a gap surfaces during execution, name it and route it forward rather than expanding scope here.
- Wiring `data-score` onto real elements as a semantic hook (the rejected branch of D-08) — not pursued this phase; the dead rule is deleted outright instead.
- Consolidating the full duplicated prose-typography block (the rejected branch of D-01) beyond just the measure — not pursued this phase; a future phase could revisit if the duplication itself becomes a maintenance problem.
- `app/pricing/page.tsx`'s FAQ answers use a raw `text-[#bababa]` hex literal, noticed while scouting this phase's code — not one of Phase 10's five named WoW/brand colors, so out of that phase's scope too. Not fixed here; flagged for whoever eventually documents sanctioned/unsanctioned literals (Phase 12, ENF-02's exception list) to decide whether this is an oversight or an intentional one-off.

None — discussion stayed within phase scope otherwise.

</deferred>

---

*Phase: 11-Reading and Browser Surfaces*
*Context gathered: 2026-09-21*
