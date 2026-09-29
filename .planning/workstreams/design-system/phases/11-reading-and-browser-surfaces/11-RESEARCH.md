# Phase 11: Reading and Browser Surfaces - Research

**Researched:** 2026-09-21
**Domain:** CSS-only design-token application (measure constraint, browser pseudo-state theming, dead-rule cleanup) in a Next.js 16 / Tailwind 3 app with an established design-system guard-test convention
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Hard constraints inherited from the roadmap and from every prior phase in this workstream: no user-facing copy changes; nothing edited in the codebase without the user's explicit confirmation at the plan's blocking checkpoint; CI green on every commit; screenshot comparison before the first edit and after the last. This phase's own roadmap risk note adds one more: narrowing the prose measure re-flows public marketing pages that the sprint workstream is actively measuring against a cohort baseline; any change that pushes a proof element below the fold on a public page must be flagged at the checkpoint by name, never silently absorbed as an intended-change.

**Prose container mechanism (TYPE-04)**
- D-01: The new reusable class controls the reading measure only — it does not consolidate the existing `prose prose-invert prose-lg [&_h2]:...` typography block. That block stays exactly as it is, verbatim, on every page it appears on today.
- D-02: The measure is expressed as a CSS `ch`-unit width (targeting ~70ch, the midpoint of the 65-75ch range), not a fixed rem/px value.
- D-03: The Pricing FAQ gets the same shared measure class as blog/research/compare, applied to the FAQ answers alongside their existing distinct typography (`font-poppins text-15 text-[#bababa]`), without touching FAQ's own look-and-feel or its unrelated `text-[#bababa]` literal.

**Selection & caret color (SURF-01)**
- D-04: `::selection` uses a translucent accent wash as the background (e.g. `hsl(var(--accent) / 0.3)`), with the selected text's own color mostly preserved rather than inverted. Applies in both light and dark via the existing `--accent` token pair.
- D-05: `caret-color` matches `--accent` (`hsl(var(--accent))`), consistent with the single-accent-color language this workstream established in Phase 10 (COLOR-07's purple-to-accent migration).

**Content-area scrollbars (SURF-01)**
- D-06: The themed scrollbar styling applies globally — every scrollable region in the app (main content, modals, dropdowns, horizontally-scrolling tables) inherits it, not only the page-level vertical scroll.
- D-07: The global scrollbar style reuses the sidebar's exact existing treatment (`--border` for the thumb, transparent track, hover state) rather than a separate, more subtle style tuned for wide content areas.

**Tabular numerals and the dead `[data-score]` rule (SURF-02)**
- D-08: `[data-score]` is deleted from `app/globals.css` outright, not wired up to real elements. The existing hand-applied `.tabular-nums` usage across 19 files remains the app's actual mechanism for numeric-column alignment.
- D-09: This phase does not audit the app for numeric displays that currently lack `.tabular-nums` entirely. If the planner or a screenshot check happens to notice an obviously-jittering numeric column while doing the in-scope work, name it and defer it rather than fixing it inline.

### Claude's Discretion

- The exact CSS selector mechanics for making the scrollbar styling apply globally (a wildcard selector, a `body`/`html`-level rule, or a `@layer base` rule) — whichever matches this file's existing authoring convention best. *(Resolved by `11-UI-SPEC.md`: universal `*` selector inside the existing `@layer base` block.)*
- The exact class name for the new measure-only prose class — planner's choice, should read clearly next to the existing `prose`/`prose-invert`/`prose-lg` classes it sits alongside. *(Resolved by `11-UI-SPEC.md`: `.prose-measure`.)*
- Whether the measure class is a plain CSS class in `app/globals.css` under `@layer components` or a Tailwind `theme.extend` utility. *(Resolved by `11-UI-SPEC.md`: `@layer components`, alongside `.nav-item-active`/`.card-gradient`.)*
- The exact alpha value for the `::selection` accent wash (D-04 names ~0.3 as an example, not a locked number). *(Resolved by `11-UI-SPEC.md`: locked at 0.3.)*
- Whether `::selection`'s foreground/text color needs an explicit override or can rely on the element's own inherited color. *(Resolved by `11-UI-SPEC.md`: no explicit override; fallback documented if illegible at the screenshot gate.)*

### Deferred Ideas (OUT OF SCOPE)

- A full app-wide audit of numeric displays for missing `.tabular-nums` coverage (D-09) — if a gap surfaces during execution, name it and route it forward rather than expanding scope here.
- Wiring `data-score` onto real elements as a semantic hook (the rejected branch of D-08) — not pursued this phase; the dead rule is deleted outright instead.
- Consolidating the full duplicated prose-typography block (the rejected branch of D-01) beyond just the measure — a future phase could revisit if the duplication itself becomes a maintenance problem.
- `app/pricing/page.tsx`'s FAQ answers' `text-[#bababa]` hex literal — not one of Phase 10's five named WoW/brand colors, so out of that phase's scope too. Not fixed here; flagged for Phase 12 (ENF-02's exception list) to decide whether this is an oversight or an intentional one-off.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| TYPE-04 | Long-form prose on public pages (research, compare, blog, pricing FAQ) has a measure of 65 to 75 characters, expressed as a reusable prose container class, not per-page widths. | UI-SPEC's `.prose-measure` (`70ch`, `@layer components`) is fully specified; this research adds the explicit-file-list guard-scope pitfall (Pattern 3 / Pitfall 2) needed to implement the "no per-page max-width literals left" half of the criterion correctly, and confirms all 12 call-site line numbers live. |
| SURF-01 | Text selection, caret colour and content-area scrollbars are themed from the palette in `globals.css` for both themes, not only the sidebar scrollbar. | UI-SPEC fully specifies the three rule bodies; this research supplies the presence-guard test pattern (Pattern 2) needed to verify them, since every existing guard in the repo only asserts absence. |
| SURF-02 | Numeric data (scores, attendance percentages, ranks, prices) renders with tabular numerals through a class or utility the app actually applies; the dead `[data-score]` rule is removed or wired to real elements. | UI-SPEC specifies the deletion; this research identifies `app/(app)/master-sheet` as the concrete score-dense app page for the screenshot criterion (via live `.tabular-nums` grep) and supplies the absence+sibling-survival guard pattern (mirroring `background-inset-absence.test.ts`). |
</phase_requirements>

## Summary

This phase has almost no open technical question left to research: `11-UI-SPEC.md` already pins the exact class name (`.prose-measure`), the exact CSS value (`70ch`), the exact `::selection`/`caret-color`/scrollbar rule bodies, and the exact 12 call-site diffs, every one of them live-verified with file+line citations during UI-spec generation. This research's job is the layer above that — how to sequence, test, and verify the diff safely, using this codebase's own established conventions rather than inventing new ones.

Three things this research adds beyond the UI-SPEC: (1) confirmation that every UI-SPEC line-number citation still matches the live file (re-verified this session, byte-for-byte), so the planner can treat the UI-SPEC's diffs as pre-flight-checked; (2) identification of `app/(app)/master-sheet/` as the concrete "score-dense app page" the ROADMAP names only generically — `ItemCandidateModal.tsx` is the single densest concentration of `.tabular-nums` (14 sites, a full ranking table with score/rank/GP columns) and `BossSection.tsx`/`RaidModeView.tsx` render the same mechanism on the page itself with no extra interaction, and the page is already wired into the project's `scripts/visual/baseline.mjs` screenshot tool with zero new code; and (3) confirmation that the project's screenshot tool does **not** currently capture any of the four public page types this phase must screenshot (blog, research, compare, pricing) — extending its `PAGES` array is a required, not optional, planning task, following the exact precedent Phase 10 already set when it added `master-sheet`/`raid-tracking`/`profile` to the same array.

**Primary recommendation:** Implement the UI-SPEC's diffs exactly as written (no re-litigation), sequence the work as CSS-first (globals.css additions/deletion) then call-site swaps then guard tests, extend `scripts/visual/baseline.mjs`'s `PAGES` array with the four public page types before the first screenshot, and use `app/(app)/master-sheet` (already in that array) as the score-dense app-page screenshot target.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Prose measure constraint (TYPE-04) | Browser / Client | CDN / Static | Pure CSS (`max-width` in a class); the class lives in `app/globals.css`, a static asset served/cached like any other build output, and the only "execution" of it is the browser's layout engine applying the rule. No server logic, no API call, nothing dynamic. |
| Text selection & caret theming (SURF-01a) | Browser / Client | CDN / Static | `::selection` and `caret-color` are native browser pseudo-state APIs; CSS-only, same static-asset delivery as above. |
| Content-area scrollbar theming (SURF-01b) | Browser / Client | CDN / Static | `scrollbar-width`/`scrollbar-color`/`::-webkit-scrollbar*` are browser-rendering-engine APIs; no JS, no server involvement. |
| Tabular-numeral cleanup (SURF-02) | Browser / Client | CDN / Static | Deleting a dead CSS selector; `font-variant-numeric` is a pure rendering-engine property. |

**Why this map matters for planning:** every capability in this phase resolves to the same two tiers. There is no API route, no Server Component data-fetching change, no context/state change anywhere in this phase's scope — which means the plan's task list should contain zero "wire up the backend" or "update the API response shape" tasks. Any task that reaches beyond `app/globals.css` and a `className` string on the 12 named call sites is out of this phase's architectural footprint and should be flagged, not absorbed.

## Standard Stack

No new library, framework, or package is introduced by this phase. It edits one existing CSS file (`app/globals.css`) and 12 existing page files' `className` strings. The project's existing stack (Next.js 16.2.12, Tailwind 3.4.19, Vitest 4.1.0, Puppeteer 24.43.1 as a devDependency) is sufficient and already installed — confirmed live: `grep -n '"puppeteer"' package.json` returns `"puppeteer": "24.43.1"` [VERIFIED: package.json:89], and `scripts/visual/baseline.mjs` already imports and uses it successfully across Phases 07–10 (evidenced in `.planning/workstreams/design-system/STATE.md`'s per-phase decision log).

**Installation:** none required.

## Package Legitimacy Audit

**Not applicable.** This phase introduces zero new external packages, so the Package Legitimacy Gate protocol does not apply. `npm view puppeteer version` was run only to confirm the installed devDependency is current-enough for this phase's screenshot needs (25.11.0 is the latest published version; the project pins 24.43.1, already working across four prior phases — no upgrade needed or in scope) [VERIFIED: npm registry].

## Architecture Patterns

### System Architecture Diagram

```
Build time                          Request/render time
───────────                         ────────────────────
app/globals.css                     Browser requests page (blog post /
  ├─ @layer base                       research / compare / pricing /
  │   ├─ html { caret-color }          any app route)
  │   ├─ * { scrollbar-* }                    │
  │   ├─ *::-webkit-scrollbar*               ▼
  │   ├─ td, th, .tabular-nums   ──►   Next.js server-renders page.tsx
  │   │   (no [data-score])            (className strings already point
  │   └─ ::selection                    at .prose-measure / .tabular-nums
  ├─ @layer components                  / native scrollbars, baked into
  │   └─ .prose-measure { 70ch }        the HTML+CSS at render time)
  └─ (built into the app's CSS               │
      bundle by Tailwind's build)             ▼
                                       Browser applies globals.css to
                                       the rendered DOM: selection,
                                       caret, scrollbar and measure
                                       are pseudo-state/layout rules
                                       the rendering engine owns —
                                       no client JS runs any of this.
```

A reader tracing "why does the FAQ answer wrap at 70ch" follows: `app/pricing/page.tsx:152`'s `className` includes `prose-measure` → `app/globals.css`'s `@layer components` defines `.prose-measure { max-width: 70ch }` → the browser's layout engine constrains the `<p>`'s box width → text wraps at the character measure. No other component or request is in this path.

### Recommended Task Sequencing

The UI-SPEC's own "Above-the-fold risk" section (lines 223–230) already mandates a full-page screenshot gate before and after. Sequence the plan around that gate, not around file-count batching:

```
1. Pre-work:    extend scripts/visual/baseline.mjs's PAGES array with the
                four public page types this phase touches (none are
                captured today — see Common Pitfalls).
2. Baseline:    run visual:baseline BEFORE any edit (full page, both
                themes, both viewports, all 4 public pages + master-sheet).
3. CSS-first:   land app/globals.css changes in one commit --
                .prose-measure (@layer components), ::selection,
                caret-color extension, universal scrollbar rule
                (@layer base), and the [data-score] deletion.
                Zero visible change yet (no call site references
                .prose-measure until step 4) except ::selection/
                caret/scrollbar, which are visible immediately.
4. Call sites:  swap the 12 named className sites (11 wrapper-div
                swaps + 1 inline FAQ <p>) in one batch commit,
                per the UI-SPEC's exact before/after table.
5. Guards:      add/extend guard tests (see Validation Architecture).
6. Post-work:   run visual:baseline AFTER all edits; diff against
                baseline; name any above-the-fold shift explicitly
                at the checkpoint per the UI-SPEC's required protocol.
```

Splitting CSS-only changes (step 3) from call-site changes (step 4) into separate commits matches this project's own stated constraint ("Mass migrations land in batches; no red intermediate commits" — STATE.md Standing Constraint 3) and lets the screenshot diff isolate which change caused which visual delta (a scrollbar-color shift from step 3 vs. a measure-driven re-flow from step 4).

### Pattern 1: Guard test as absence proof (SURF-02 / the `[data-score]` deletion)
**What:** A dedicated Vitest file that scans `app/globals.css` for a pattern and asserts zero matches, with an explicit fail-loud-on-missing-file test alongside it.
**When to use:** Any time this workstream deletes a dead token/selector and needs to prove it stays gone.
**Example (near-exact structural copy target — `__tests__/background-inset-absence.test.ts`, verified live this session):**
```typescript
// Source: __tests__/background-inset-absence.test.ts:53-76 (COLOR-03's absence guard)
const CUSTOM_PROPERTY_PATTERN = /--background-inset\b/

describe('background-inset absence guard (COLOR-03)', () => {
  it('finds no --background-inset custom-property declaration in app/globals.css', () => {
    const globalsCssPath = path.resolve(process.cwd(), 'app/globals.css')
    const matches = matchesIn([globalsCssPath], CUSTOM_PROPERTY_PATTERN)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })
})
```
For SURF-02, the equivalent pattern is `/\[data-score\]/` scanned against `app/globals.css`, with a second assertion in the same file confirming `td, th,` and `.tabular-nums` still match (the "siblings survive" idiom `background-inset-absence.test.ts:78-101` uses for the Tailwind-config-key case) — proving the deletion removed only the dead selector, not the whole rule block.

### Pattern 2: Guard test as presence proof (new pattern this phase needs — no exact precedent, but a direct extension of existing tooling)
**What:** The existing `matchesIn`/`sourceFiles` helpers (`__tests__/design-tokens/source-files.ts`) are only ever used for absence assertions (`toHaveLength(0)`) in this repo today. SURF-01's `::selection`, `caret-color`, and universal-scrollbar rules need the opposite assertion — that they exist.
**When to use:** Any guard proving a new CSS rule was added, not removed.
**Example:**
```typescript
import { matchesIn } from './design-tokens/source-files'
import path from 'node:path'

const globalsCssPath = path.resolve(process.cwd(), 'app/globals.css')

describe('browser surface theming (SURF-01)', () => {
  it('themes ::selection from --accent', () => {
    const matches = matchesIn([globalsCssPath], /::selection/)
    expect(matches.length, 'expected a ::selection rule in app/globals.css').toBeGreaterThan(0)
  })
  // repeat for /caret-color:\s*hsl\(var\(--accent\)\)/ and the universal
  // scrollbar-color/::-webkit-scrollbar selectors
})
```
This reuses the exact same low-level primitives (`sourceFiles`/`matchesIn`) every other guard in the repo already imports — no new scanning mechanism, only an inverted assertion direction.

### Pattern 3: Explicit file-list scope, not a directory scan (TYPE-04's call-site guard — critical correctness pitfall)
**What:** A guard proving "no per-page max-width literal left on those pages" (the ROADMAP's literal wording) must scan an **explicit list of the 12 named files**, not `sourceFiles(['app/blog', 'app/research', 'app/compare'])`.
**Why:** `app/blog/page.tsx` (the blog **index/listing** page, not a post) also contains `className="max-w-3xl mx-auto"` at line 136 — confirmed live this session via `grep -rn "max-w-3xl mx-auto\|max-w-4xl mx-auto" app/blog app/research app/compare` [VERIFIED: app/blog/page.tsx:136]. That page is explicitly out of this phase's scope per the UI-SPEC's own named discrepancy note (it "carries no prose block or wrapper max-w-* div" in the sense that matters — it's a card-grid listing page, not long-form prose). A directory-wide absence guard would force an unwanted edit to it or produce a false failure the plan never intended to fix.
**How to avoid:** Copy `__tests__/token-palette-literals.test.ts`'s explicit-`SCANNED_PATHS`-array idiom (cited in `10-PATTERNS.md`'s Group F), listing exactly the 11 wrapper-div files + `app/pricing/page.tsx`, never `app/blog` as a directory root.

### Anti-Patterns to Avoid
- **Re-litigating the UI-SPEC's locked calls:** the class name, the `70ch` value, the `0.3` alpha, the `@layer components` placement, and the "delete outright, don't wire up" decision for `[data-score]` are all locked, not discretionary — treat them as inputs, not open design questions (per this document's own framing note).
- **Consolidating the untouched prose-typography block:** D-01 is explicit that the existing `prose prose-invert prose-lg [&_h2]:...` chain "stays exactly as it is, verbatim" — even though the Typography section of the UI-SPEC discloses those three Tailwind Typography tokens (`prose`, `prose-invert`, `prose-lg`) generate zero CSS today (`@tailwindcss/typography` isn't installed). Fixing that dead-weight-class finding is explicitly out of this phase's scope; do not fold it into this phase's diff.
- **Treating `npm run build` as unusable:** a prior, unrelated repo-wide build break (`c.createContext is not a function` on `/blog/*` static generation) required a substitute proof in Phase 10 — see Common Pitfalls below. That break is now fixed (confirmed live this session: `npm run build` exits with all 9 blog posts, `/blog`, `/research/...`, `/compare`, and `/pricing` all prerendering as static routes). Do not carry the substitute-proof workaround into this phase's plan; `npm run build` is a valid, working verification step again.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scanning source files for a regex pattern | A new file-walker / grep wrapper | `sourceFiles`/`matchesIn` from `__tests__/design-tokens/source-files.ts` | Already handles binary-extension skipping, `node_modules`/`.next`/`.git` exclusion, and a fail-loud-on-missing-path guard; every existing guard test in this repo imports it rather than reimplementing a walk. |
| Capturing before/after screenshots at two viewports, two themes | A new Puppeteer script from scratch | Extend `scripts/visual/baseline.mjs`'s `PAGES` array | The script already handles theme-forcing via `localStorage`, animation-disabling, transient-CDP-error retry, dev-server readiness checks, and manifest recording. Phase 10 already extended this exact array (adding `master-sheet`, `raid-tracking`, `profile`) rather than writing a second script — follow that precedent, don't fork it. |
| Proving a CSS rule exists / doesn't exist | A DOM-rendering test (jsdom + computed styles) | The same `matchesIn` text-scan idiom used for every other token/selector guard in this repo | `app/globals.css` is a static text file; every existing guard in this workstream (contrast, palette-literal, background-inset-absence) scans it as text via regex rather than instantiating a browser/DOM to read computed styles. Matching that convention keeps the new guards fast (no jsdom render) and consistent with the other 9 guard files. |

**Key insight:** this phase's entire verification surface — both the "did the CSS change land" question and the "did it land only where intended" question — is already served by tooling this workstream built in Phases 07–10. There is no part of this phase that benefits from new scanning/testing infrastructure; the only new code should be CSS in `globals.css`, 12 `className` edits, 2–3 new guard-test files reusing existing helpers, and 4 new `PAGES` entries in the existing screenshot script.

## Common Pitfalls

### Pitfall 1: The public reading pages are not in the screenshot tool's capture matrix today
**What goes wrong:** The plan assumes `npm run visual:baseline` already covers blog/research/compare/pricing because the project "has a screenshot tool," and the required before/after full-page comparison silently only captures the app pages already in scope (home, overview, guild-settings, loot-management, master-sheet, raid-tracking, profile).
**Why it happens:** `scripts/visual/baseline.mjs`'s `PAGES` array (lines 110–118) was built for Phase 07 and extended by Phase 10 for *app* pages only — no phase before this one has needed a public reading page in the matrix.
**How to avoid:** Add explicit `PAGES` entries before the first screenshot: one representative blog post (e.g. `/blog/dkp-is-dead-what-classic-guilds-use-in-2026`), `/research/wow-classic-loot-systems-2026`, `/compare`, and `/pricing` — all `auth: false`, no `afterGoto` needed (none of the four require interaction to reach their prose content). `master-sheet` (`auth: true`) is already present and needs no change to serve as the score-dense app page.
**Warning signs:** If the plan's checkpoint screenshot step references "the existing baseline output" without a diff showing new files for these four routes, the required above-the-fold check has not actually run against the pages the ROADMAP risk note is worried about.

### Pitfall 2: A directory-wide absence guard for TYPE-04 will also flag (or silently need to special-case) the blog index page
**What goes wrong:** see Architecture Patterns, Pattern 3 above. Restated here because it is the single most likely "worked in dev, failed the guard" surprise: `app/blog/page.tsx:136` matches the same `max-w-3xl mx-auto` string as the 9 real posts.
**Why it happens:** the blog index/listing page happens to use the same Tailwind literal for an unrelated reason (centering its card grid), not because it shares the prose-measure problem.
**How to avoid:** scope the guard to the explicit 12-file list from the UI-SPEC's diff table, never a directory scan of `app/blog`.
**Warning signs:** a guard test failing on a file that was never in the UI-SPEC's diff table.

### Pitfall 3: `ch` resolves against 16px, not the app's 13px `text-base` token — don't "fix" this
**What goes wrong:** A screenshot review notices the prose column looks wider or narrower than a naive "70 × 13px character width" mental model predicts, and someone "corrects" it by hardcoding a pixel value or changing the target page's base font size.
**Why it happens:** the UI-SPEC's own Typography section discloses (live-verified) that the four target pages apply no explicit font-size utility to their prose paragraphs — text renders at the browser default 16px (inherited Poppins), not the app's 13px `text-base`. This is a pre-existing condition, not something TYPE-04 introduces or should correct.
**How to avoid:** trust `ch` to self-correct to whichever font-size is actually in force (D-02's own rationale for choosing a relative unit over a fixed value) and verify the *rendered* measure visually against the 65–75ch target, not against an assumed 13px baseline.
**Warning signs:** someone proposing a `font-size` change on the prose paragraphs as part of this phase — that is TYPE-01/TYPE-03 territory (already shipped) and out of this phase's scope.

### Pitfall 4: A previously-broken `npm run build` is fixed now, but check freshness before trusting it as a gate
**What goes wrong:** treating the Phase 10 substitute-proof workaround (tailwindcss CLI compile-and-grep instead of `npm run build`) as still necessary, and skipping the real build check this phase's own success criterion 4 requires ("lint, typecheck and test pass" — note the criterion doesn't even name build, but the plan should still not assume build is broken).
**Why it happens:** `.planning/WINDOWS.md` entry 19 documents the break as a real, `blog`-page-specific issue that existed through all of Phase 10.
**How to avoid:** the fix already shipped (commit `50a91c9e`, "fix(debug): declare Card and ItemLink as client components to unbreak the build" — visible in this repo's recent git log) and was independently re-verified this session: `npm run build` exits cleanly with all 9 blog posts, `/blog`, `/research/wow-classic-loot-systems-2026`, `/compare`, and `/pricing` all prerendering as static routes [VERIFIED: live `npm run build` output, this session]. Treat `npm run build` as a normal, working verification step for this phase; do not reach for a substitute proof.
**Warning signs:** none expected — flagged here only because the prior phase's own documentation might lead a planner to assume the break is still live.

### Pitfall 5: The in-app design-system doc page's prose about `[data-score]` goes stale, and that's not this phase's problem to fix
**What goes wrong:** noticing `app/(app)/design-system/_client.tsx:1801`'s copy — `"Applied globally to td, th, and [data-score]."` — still describes the rule this phase deletes, and either (a) leaving it unflagged, silently shipping stale documentation, or (b) scope-creeping this phase to fix it.
**Why it happens:** the doc page is prose describing the mechanism, not a functional consumer of the selector — grep confirms it has zero functional `[data-score]` DOM attribute usage, only this one sentence of descriptive text.
**How to avoid:** name it explicitly as a carry-forward finding to Phase 12 (ENF-03 already covers "documents... and no longer shows removed primitives" for exactly this doc page) — same "name and route forward, don't fix inline" convention this workstream used for the `text-[#bababa]` FAQ literal (11-CONTEXT.md's Deferred Ideas) and Phase 09's D-05 above-the-fold precedent.
**Warning signs:** a plan task that edits `app/(app)/design-system/_client.tsx` — that file is outside this phase's two named source-of-truth locations (globals.css + the 12 page files) per the UI-SPEC's own Design System section.

## Code Examples

All load-bearing code (the `.prose-measure` definition, the `::selection`/`caret-color`/scrollbar rules, and the exact 12 call-site before/after diffs) is already fully specified in `11-UI-SPEC.md`'s "Prose Measure & Browser Surface Contract" section (lines 173–231) — re-verified live this session against the actual files (see Verification note below). This research does not duplicate that table; the planner should copy it directly from the UI-SPEC.

### Verification performed this session (all UI-SPEC citations confirmed exact)
```bash
# Source: this session's live grep against app/globals.css
$ grep -n "sidebar-scrollable\|data-score\|tabular-nums\|@layer components\|nav-item-active\|card-gradient\|scrollbar-gutter" app/globals.css
318:    scrollbar-gutter: stable;
328:  [data-score],
329:  .tabular-nums {
330:    font-variant-numeric: tabular-nums;
367:  .sidebar-scrollable::-webkit-scrollbar {
...
596:@layer components {
598:  .nav-item-active {
605:  .card-gradient {
```
Every line number in the UI-SPEC's diff table (317–319 `html`, 328–330 the `[data-score]` block, 367–390 `.sidebar-scrollable`, 596–610 `@layer components`) matches exactly [VERIFIED: app/globals.css, this session].

```bash
# Source: this session's live grep confirming the 12-site scope and the
# named blog-index-page discrepancy (Pattern 3 / Pitfall 2 above)
$ grep -rn "max-w-3xl mx-auto\|max-w-4xl mx-auto" app/blog app/research app/compare app/pricing
app/blog/page.tsx:136:        <div className="max-w-3xl mx-auto">        # OUT OF SCOPE (index page)
app/blog/how-to-onboard-new-raiders-without-killing-morale/page.tsx:122  # IN SCOPE
app/blog/the-officer-burnout-problem-and-how-to-fix-it/page.tsx:122      # IN SCOPE
app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx:118 # IN SCOPE
... (9 posts total, IN SCOPE)
app/research/wow-classic-loot-systems-2026/page.tsx:410                 # IN SCOPE
app/pricing/page.tsx:62:      <div className="max-w-4xl mx-auto ...">  # OUT OF SCOPE (page wrapper, not the FAQ <p>)
app/compare/page.tsx:127                                                # IN SCOPE
```

### Score-dense app-page screenshot target — found via `.tabular-nums` grep
```bash
# Source: this session's live grep, app/(app)/master-sheet/
$ grep -rln "tabular-nums" "app/(app)/master-sheet"
app/(app)/master-sheet/components/BossSection.tsx      # 4 sites — per-boss score breakdown
app/(app)/master-sheet/components/RaidModeView.tsx      # 2 sites — raid-mode score rail
app/(app)/master-sheet/components/ItemCandidateModal.tsx # 14 sites — full ranking table (rank, loot_score, GP columns)
```
`ItemCandidateModal.tsx` is the densest (a `<table>` of ranked candidates with `rank`, `loot_score`, and multiple GP/attendance columns, all `tabular-nums`), but it requires opening a modal (click an item candidate on `master-sheet`) — the same interaction-gating pattern `scripts/visual/baseline.mjs` already handles for `loot-management`'s `openLootSettingsModal` `afterGoto` hook. `BossSection.tsx`/`RaidModeView.tsx` render the same tabular-nums mechanism on the page itself, with zero new interaction code, and `master-sheet` is already in `PAGES` (line 115) with `auth: true` and no `afterGoto`. **Recommendation: use the plain `master-sheet` page capture already in the script as the score-dense app-page screenshot** — it satisfies the criterion (scores/ranks render with tabular numerals, verified against both themes) without any script change. If the planner wants the deepest possible density for the screenshot, add an `afterGoto` hook mirroring `openLootSettingsModal`'s pattern to open `ItemCandidateModal`, but this is optional, not required to meet the success criterion.

## State of the Art

Not applicable — this is a small, internally-scoped CSS phase with no external ecosystem dependency to track. The relevant "state of the art" is entirely this workstream's own established conventions (guard-test scaffolding, screenshot-script extension pattern), all current and already in active use through Phase 10.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `master-sheet`'s plain page capture (no modal interaction) is sufficient to satisfy success criterion 4's "one score-dense app page" — i.e. the reviewer/user accepts `BossSection`/`RaidModeView`'s tabular-nums as "score-dense" without requiring `ItemCandidateModal`'s denser ranking table. | Code Examples, "Score-dense app-page screenshot target" | Low — if rejected at the checkpoint, the fallback (add an `afterGoto` hook opening `ItemCandidateModal`, mirroring the existing `openLootSettingsModal` pattern) is a small, well-precedented addition, not a redesign. |
| A2 | The `[data-score]` doc-page prose staleness (Pitfall 5) is correctly routed to Phase 12 (ENF-03) rather than needing a same-phase fix. | Common Pitfalls, Pitfall 5 | Low — ENF-03's own wording ("no longer shows removed primitives") already covers this; if the planner disagrees, it's a one-line copy edit, not a structural change. |

**If this table is empty:** N/A — two low-risk assumptions logged above, both with cheap, precedented fallbacks.

## Open Questions

None blocking. The UI-SPEC has already resolved every mechanism-level open question (class name, alpha value, layer placement, scrollbar selector strategy). The two items in the Assumptions Log above are the only remaining judgment calls, and both have low-risk, well-precedented fallbacks if the checkpoint reviewer wants the other branch.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Puppeteer | `scripts/visual/baseline.mjs` (required before/after screenshot gate) | ✓ | 24.43.1 (devDependency, latest published is 25.11.0 — no upgrade needed; already used successfully across Phases 07–10) | — |
| Local Next.js dev server (`npm run dev`, port 3100) | Screenshot capture (script refuses any non-localhost origin) | ✓ (script enforces this; not independently re-started this session to avoid disrupting any running session) | — | — |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the dev server's shell | Authenticated page captures (`master-sheet`, etc.) — public pages (blog/research/compare/pricing) do not need this | Not verified this session (per OI-6/D-16 precedent from Phase 07 — the agent never reads/writes these values) | — | If absent, the script's own `assertServerReady` check fails loud with an actionable message; authenticated captures fall back to "skipped" (recorded in `manifest.json`), same as prior phases' D-16 fallback. Public-page captures (this phase's primary new need) are unaffected either way. |
| Vitest 4.1.0 | Guard tests, `npm test` | ✓ | 4.1.0 (package.json) | — |
| `npm run build` | Optional full production-build verification (previously blocked, now fixed) | ✓ | — (confirmed working live this session, see Pitfall 4) | — |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:** authenticated-capture Supabase env vars (existing D-16 skip-and-record fallback; does not block this phase's core public-page screenshot work).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` (jsdom environment, globals enabled, `@/` alias, `./vitest.setup.ts` setup file) |
| Quick run command | `npx vitest run __tests__/<new-guard-file>.test.ts` |
| Full suite command | `npm test` (= `vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TYPE-04 | `.prose-measure` class exists in `app/globals.css` with `max-width: 70ch` | unit (text-scan guard) | `npx vitest run __tests__/prose-measure.test.ts` | ❌ Wave 0 |
| TYPE-04 | No `max-w-3xl mx-auto` / `max-w-4xl mx-auto` literal remains on the 12 named call sites (explicit file list, not a directory scan — see Pitfall 2) | unit (absence guard) | `npx vitest run __tests__/prose-measure.test.ts` | ❌ Wave 0 (can live in the same file as the presence check above) |
| SURF-01 | `::selection` themed from `--accent` | unit (presence guard) | `npx vitest run __tests__/browser-surface-theming.test.ts` | ❌ Wave 0 |
| SURF-01 | `caret-color` set to `hsl(var(--accent))` on `html` | unit (presence guard) | same file | ❌ Wave 0 |
| SURF-01 | Universal scrollbar rule (`scrollbar-color`, `::-webkit-scrollbar*`) present, themed from `--border`/`--border-strong` | unit (presence guard) | same file | ❌ Wave 0 |
| SURF-02 | `[data-score]` selector removed from `app/globals.css`, `td, th, .tabular-nums` siblings survive | unit (absence + sibling-survival guard) | `npx vitest run __tests__/data-score-absence.test.ts` | ❌ Wave 0 |
| SURF-02 (implicit, D-09 scope limit) | Existing 19-file `.tabular-nums` hand-applied usage is unaffected (no regression) | manual/visual | Screenshot gate (see below) — no dedicated automated test, per D-09's explicit scope limit | n/a |
| ROADMAP success criterion 4 | Screenshots in both themes of one public reading page + `master-sheet` show intended measure, no numeric-column jitter | manual/visual | `npm run visual:baseline -- --label phase-11-before` / `--label phase-11-after` (after extending `PAGES`) | ❌ Wave 0 (script exists; `PAGES` array needs 4 new entries — see Pitfall 1) |
| ROADMAP success criterion 4 | `lint`, `typecheck`, `test` pass | automated | `npm run lint && npm run typecheck && npm test` | ✅ (all three commands exist and pass today) |

### Sampling Rate
- **Per task commit:** `npx vitest run <new-guard-file>.test.ts` (fast, <1s per file, text-scan only)
- **Per wave merge:** `npm test` (full suite, ~1200+ tests; last known-green count per `.planning/WINDOWS.md`: 1219)
- **Phase gate:** `npm run lint && npm run typecheck && npm test && npm run build` green, plus the full-page before/after screenshot diff named per the UI-SPEC's above-the-fold protocol, before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `__tests__/prose-measure.test.ts` — covers TYPE-04 (presence of `.prose-measure` + `max-width: 70ch`; absence of the old `max-w-3xl mx-auto`/`max-w-4xl mx-auto` literals across the explicit 12-file list)
- [ ] `__tests__/browser-surface-theming.test.ts` — covers SURF-01 (`::selection`, `caret-color`, universal scrollbar presence, all referencing `--accent`/`--border`/`--border-strong`)
- [ ] `__tests__/data-score-absence.test.ts` — covers SURF-02 (mirrors `background-inset-absence.test.ts`'s structure almost exactly: absence of `[data-score]`, survival of `td, th,`/`.tabular-nums` siblings)
- [ ] `scripts/visual/baseline.mjs`'s `PAGES` array — needs 4 new entries (one blog post, research, compare, pricing, all `auth: false`, no `afterGoto`) before the required screenshot gate can capture the pages this phase's own risk note is about
- [ ] No framework install needed — Vitest, Puppeteer, and the guard-test scaffolding (`__tests__/design-tokens/source-files.ts`) all already exist and are already in active use

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | This phase touches no auth flow, no session, no credential handling. |
| V3 Session Management | No | Not touched. |
| V4 Access Control | No | Not touched — no new route, no new permission check. |
| V5 Input Validation | No | This phase introduces no new user input surface — it edits static CSS and static `className` strings on server-rendered pages. Content of the FAQ answers, blog posts, etc. is existing, already-rendered copy (React auto-escapes JSX text content; no new interpolation is introduced). |
| V6 Cryptography | No | Not touched. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| CSS injection via untrusted `hsl(var(--x) / alpha)` interpolation | Tampering | Not applicable here — every value in this phase's diff (`--accent`, `--border`, `--border-strong`, `70ch`, `0.3`) is a static, hardcoded literal in `app/globals.css`, not derived from any user input or database value. No dynamic string interpolation is introduced. |
| Selector-scope creep (a universal `*` selector unintentionally overriding an unrelated component's scrollbar/selection styling in a way that breaks a security-relevant affordance, e.g. hiding a focus indicator) | Tampering (of intended UI semantics, not data) | The UI-SPEC's universal scrollbar rule (`*` inside `@layer base`) only sets `scrollbar-width`/`scrollbar-color`/`::-webkit-scrollbar*`, none of which interact with `focus-visible` (PRIM-03, already shipped and unaffected — different pseudo-class, different property set). No overlap with the existing focus-ring guard tests. |

**Overall assessment:** this phase has essentially no security surface. It is a CSS-and-classname-only change with no new input, no new auth path, and no dynamic value interpolation. `security_enforcement: true` in `.planning/config.json` is satisfied by this section's explicit "not applicable" findings — there is nothing to threat-model beyond what's stated here.

## Sources

### Primary (HIGH confidence)
- `11-UI-SPEC.md` (this phase's own design contract, already checker-verified against live code) — the authoritative CSS mechanism, exact values, and exact call-site diffs.
- Live `grep`/`sed` reads of `app/globals.css`, `app/pricing/page.tsx`, `app/blog/*/page.tsx`, `app/research/wow-classic-loot-systems-2026/page.tsx`, `app/compare/page.tsx` this session — every UI-SPEC line-number citation re-confirmed exact.
- Live `npm run build` execution this session — confirmed the previously-documented build break is fixed and all target public pages prerender.
- `__tests__/background-inset-absence.test.ts`, `__tests__/token-contrast.test.ts`, `10-PATTERNS.md` — direct precedent for this phase's guard-test shape.
- `scripts/visual/baseline.mjs` (read in full this session) — the screenshot tool's actual `PAGES` array, viewport/theme matrix, and extension precedent.

### Secondary (MEDIUM confidence)
- `.planning/WINDOWS.md` entry 19 and its resolution — cross-referenced against the live `npm run build` re-run rather than trusted as-is.

### Tertiary (LOW confidence)
- None — this phase's scope was small enough that every claim could be directly verified against the live repository this session.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; existing stack confirmed sufficient by direct inspection.
- Architecture: HIGH — CSS-only change, zero ambiguity in tier ownership, UI-SPEC already locked every mechanism.
- Pitfalls: HIGH — every pitfall in this document was found via live grep/build execution this session, not inferred.

**Research date:** 2026-09-21
**Valid until:** 30 days (stable, internal-convention-driven scope; the only external-facing risk — the build-break fix — was independently re-verified live, not merely cited)
