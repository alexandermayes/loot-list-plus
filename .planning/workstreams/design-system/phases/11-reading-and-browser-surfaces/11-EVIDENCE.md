# Phase 11: Reading and Browser Surfaces - Evidence Record

Closes the phase with evidence rather than assertion. Every number below is the verbatim output
of a named, committed command run this session; nothing here was typed by hand from memory.

## Success Criterion 1: reusable prose container, 65-75ch measure

> "A single reusable prose container class exists, and long-form text on research, compare, blog and the pricing FAQ measures 65 to 75 characters at 1440, down from the audited 87 to 112ch, with no per-page max-width literals left on those pages"

**The measure rule, verbatim** (`app/globals.css`, inside `@layer components`):

```css
/* TYPE-04: readable measure for long-form prose blocks. Width only -- no font-size, no color. */
.prose-measure {
  max-width: 70ch;
}
```

70ch is the exact midpoint of the 65-75ch target range (D-02).

**Absence proof** — no per-page wrapper width literal remains on the eleven wrapper call sites:

```
$ grep -rn "max-w-3xl mx-auto\|max-w-4xl mx-auto" app/blog app/research app/compare app/pricing
app/blog/page.tsx:136:        <div className="max-w-3xl mx-auto">
app/pricing/page.tsx:62:      <div className="max-w-4xl mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-20">
```

Both remaining hits are the two out-of-scope, always-intended-to-survive wrappers: `app/blog/page.tsx:136` is the blog *index/listing* page (a card-grid centering wrapper, never a prose block), and `app/pricing/page.tsx:62` is pricing's own page-level wrapper (the FAQ *answer* line inside it carries the measure class instead — see below). Every one of the eleven in-scope wrapper sites (nine blog posts, research, compare) that 11-01/11-02 migrated is gone from this grep's output.

**Presence proof** — the pricing FAQ answer line carries the measure class (D-03):

```
$ grep -n "prose-measure" app/pricing/page.tsx
152:                <p className="font-poppins text-15 text-[#bababa] leading-relaxed prose-measure">{a}</p>
```

No centering was added to this line (it is already flush-left under its question, per D-03), and its pre-existing `text-[#bababa]` grey hex literal (7 occurrences on this page, confirmed unchanged by `grep -c "text-\[#bababa\]" app/pricing/page.tsx` → `7`) is untouched — that literal is not one of Phase 10's five named WoW/brand hex values and is carried forward to Phase 12 ENF-02 (see Carry-forwards below).

**Named before/after image pair** showing the narrowed column at 1440 (light theme, the tracer blog post):

- Before: `.planning/workstreams/design-system/baselines/2026-09-21-pre-phase-11/blog-post-light-1440.png`
- After: `.planning/workstreams/design-system/baselines/2026-09-21-post-phase-11/blog-post-light-1440.png`

The rendered column visibly narrows and re-centers between the two images (confirmed by direct DOM measurement below).

**Measured rendered width:** 11-01-SUMMARY.md's live Puppeteer DOM measurement found the wrapper narrows from **768px** (`max-w-3xl`) to **703.36px** (`.prose-measure`) at 1440px, and 11-02-SUMMARY.md independently re-confirmed the identical **703.36px** on `/compare` (whose wrapper started at the wider 896px `max-w-4xl`). This is narrower than the plan's own "490-620px" estimate because `ch` resolves against each element's own inherited font-size, and this codebase's target pages inherit the browser-default 16px Poppins body text, **not** the app's 13px `text-base` design token (confirmed live: `@tailwindcss/typography` is not installed, and no custom `.prose` rule exists in `app/globals.css`, so the `prose prose-invert prose-lg` classes on every target page generate no CSS and never have — the only typography actually applied is the `[&_p]:...`/`[&_h2]:...` arbitrary-variant chain, which sets colour and margin, never font-size). `70 × 16px × ~0.5 (average glyph-to-em ratio for `ch`) ≈ 703px` is consistent with the measured value; the number is not a naive `70 × 13px` calculation.

## Success Criterion 2: selection, caret, content-area scrollbars themed in both themes

> "`::selection`, `caret-color` and content-area scrollbars are themed from the palette in both light and dark, not only the sidebar scrollbar (globals.css:338-360)"

**All three rules, verbatim** (`app/globals.css`, `@layer base`):

```css
/* Universal scrollbar theming (SURF-01): every scrollable region in the
   app -- main content, modals, dropdowns, horizontally-scrolling tables --
   not only the sidebar. Values reused verbatim from the sidebar's own
   prior scrollbar treatment, plus a height alongside width so
   horizontally-scrolling regions are covered too. Inert on elements that
   do not overflow-scroll. */
* {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--border)) transparent;
}

*::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 3px;
}

*::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--border-strong));
}

html {
  scrollbar-gutter: stable;
  caret-color: hsl(var(--accent));
}

/* Text selection wash, themed from the accent token (SURF-01). No explicit
   foreground override: selected text keeps its own inherited colour. */
::selection {
  background-color: hsl(var(--accent) / 0.3);
}
```

Both `--accent` and `--border`/`--border-strong` already carry distinct light/dark values (shipped Phase 07), so every one of these five rules themes correctly in both themes with zero per-theme duplication.

**Guard output:**

```
$ npx vitest run __tests__/browser-surface-theming.test.ts
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

**Live visual confirmation** (Puppeteer against the running dev server, both themes, script never committed — `git status --porcelain scripts/visual/` returned empty afterward):

- `::selection`: selecting the intro paragraph on the tracer blog post rendered a warm accent-orange wash with the paragraph's own light-grey text fully legible over it, in **both** light and dark themes (the two captured images are visually near-identical, consistent with `--accent`'s similar hue at both `30 100% 45%` light and `30 100% 50%` dark).
- `caret-color`: focusing and typing into the dev-only `/dev-login` email input rendered a solid accent-orange caret in **both** themes (captured across six attempts per theme to catch the blink-on phase; caught on the first attempt both times).
- Universal scrollbar rule: **not visually confirmed** this session. Two independent Puppeteer screenshot attempts of `/compare`'s `overflow-x-auto` table at 390px (confirmed overflowing: `scrollWidth: 670` vs `clientWidth: 340`) rendered no visible scrollbar affordance in headless Chromium, despite the rule being present and correctly emitted (11-03's own rendered-CSS compile already proved this). This reads as a known headless-screenshot limitation for custom scrollbar rendering, not a functional gap — recorded honestly rather than fabricated as confirmed. Routed to end-of-phase UAT: **`.planning/WINDOWS.md` entry 28**.

**Sidebar-rule disposition:** deleted. 11-01's blocking gate, Section 2, recorded: *"Delete the five now-redundant `.sidebar-scrollable` rules once 11-03 lands the universal scrollbar rule; leave the `sidebar-scrollable` className on its element as an inert marker."* 11-03 implemented this; `grep -c '\.sidebar-scrollable' app/globals.css` on the current tree:

```
$ grep -c '\.sidebar-scrollable' app/globals.css
0
```

## Success Criterion 3: tabular numerals and the dead rule

> "Scores, attendance percentages, ranks and prices render with tabular numerals through a class the app actually applies, and the dead `[data-score]` rule (globals.css:298-303) is removed or wired to real elements"

**Before and after selector lists, verbatim** (`app/globals.css`):

```css
/* Before (11-04) */
td, th,
[data-score],
.tabular-nums {
  font-variant-numeric: tabular-nums;
}

/* After */
td, th,
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

D-08 (locked): delete outright rather than wire to real elements — a live grep at 11-04 plan time confirmed zero functional `[data-score]` consumers under `app/` or `components/`.

**Repo-wide grep — the only remaining hit is the doc-page prose:**

```
$ grep -rn "data-score" app components
app/(app)/design-system/_client.tsx:1801:                  <p>Applied globally to <code className="text-accent">td</code>, <code className="text-accent">th</code>, and <code className="text-accent">[data-score]</code>.</p>
```

**Guard output:**

```
$ npx vitest run __tests__/data-score-absence.test.ts
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

**Carried forward:** the stale doc-page sentence above is recorded verbatim in **`.planning/WINDOWS.md` entry 23**, routed to **Phase 12 ENF-03**, whose own success criterion 3 already covers "shows no primitive that this milestone deleted" for this exact page. Not fixed here per the workstream's route-do-not-fix convention.

The existing `.tabular-nums` hand-applied usage (20 files including `globals.css`'s own definition site, 19 excluding it — see Measured Deltas below) is untouched by the deletion and remains the app's actual numeral-alignment mechanism.

## Success Criterion 4: screenshots plus lint, typecheck, test, build

> "Screenshots in both themes of one public reading page and one score-dense app page show the intended measure and no numeric column jitter, and lint, typecheck and test pass"

### Full sixteen-pair fold comparison

Captured `post-phase-11` (label, matrix-matched to `pre-phase-11`, script byte-unchanged — see Task 1's commit `6819ef60`). All sixteen public-page before/after pairs (blog-post, research, compare, pricing × 1440/390 × light/dark), each given an explicit verdict:

| Page | Viewport | Theme | Verdict |
|---|---|---|---|
| blog-post | 1440 | light | **Crossed** — H2 "Where DKP Falls Apart" moves from fully-above-fold to straddling it; its body paragraph moves from partially-visible (first line straddling) to fully below the fold |
| blog-post | 1440 | dark | **Crossed** — identical layout shift (confirmed theme-invariant: light/dark images are pixel-dimension-identical, `1440×6569` both before and after) |
| blog-post | 390 | light | Nothing crossed — byte-identical to before (md5 match, zero height delta) |
| blog-post | 390 | dark | Nothing crossed — byte-identical to before |
| research | 1440 | light | **Crossed** — the "18.0 / median items per approved list" stat card moves from fully-above-fold to straddling it (caption line and rounded bottom edge now below 900px) |
| research | 1440 | dark | **Crossed** — identical layout shift (theme-invariant, `1440×6265` both before and after) |
| research | 390 | light | Nothing crossed — byte-identical |
| research | 390 | dark | Nothing crossed — byte-identical |
| compare | 1440 | light | **Crossed** — "Built-in attendance tracking" table row moves from fully-above-fold to straddling it; "Attendance feeds the loot score" row moves from fully-above-fold to fully below the fold |
| compare | 1440 | dark | **Crossed** — identical layout shift (theme-invariant, `1440×5426` both before and after; this is the phase's largest single reflow, +533px total document height, from the 896px→70ch narrowing) |
| compare | 390 | light | Nothing crossed — byte-identical; the table's own `overflow-x-auto` horizontal-scroll affordance at 390 is unchanged by this phase (11-02-SUMMARY.md's prior finding) |
| compare | 390 | dark | Nothing crossed — byte-identical |
| pricing | 1440 | light | Nothing crossed — the hero/pricing-card region is pixel-identical to before (confirmed by direct crop comparison); the only reflow (+24px total) is confined to the FAQ answers, entirely below the fold in both states, exactly matching D-03's "least likely to move above the fold" prediction |
| pricing | 1440 | dark | Nothing crossed — same |
| pricing | 390 | light | Nothing crossed — byte-identical |
| pricing | 390 | dark | Nothing crossed — byte-identical |

Every crossing is named individually (page, viewport, theme, element, before-state, after-state) and routed forward — never summarised as a count, never absorbed as intended. The tracer H1 line-gain 11-01 measured first (703.36px wrapper, H1 1→2 lines at 1440, no change at 390) is the root cause of the blog-post crossing above, cited here rather than re-derived. Each of the three crossings is recorded in `.planning/WINDOWS.md`:

- **Entry 25** — blog-post (`app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx`)
- **Entry 26** — research (`app/research/wow-classic-loot-systems-2026/page.tsx`)
- **Entry 27** — compare (`app/compare/page.tsx`)

All three routed to the sprint workstream's conversion-cohort measurement owner, per the route-do-not-fix convention Phase 09's D-05 established.

### Image-pair hash buckets

Every same-named pair across `pre-phase-11` and `post-phase-11` was hashed (md5) and bucketed:

```
home-light-1440.png:      SAME (02e03f63...)
home-light-390.png:       SAME (5ecde107...)
home-dark-1440.png:       SAME (b59abe05...)
home-dark-390.png:        SAME (509309eb...)
blog-post-light-1440.png: DIFF (eeaa8d9a... -> 103a418d...)
blog-post-light-390.png:  SAME (903c9178...)
blog-post-dark-1440.png:  DIFF (2e875ea3... -> 79a6d979...)
blog-post-dark-390.png:   SAME (438344ac...)
research-light-1440.png:  DIFF (32ffc662... -> 156bf764...)
research-light-390.png:   SAME (dd903d2d...)
research-dark-1440.png:   DIFF (3ddb1ea5... -> df569316...)
research-dark-390.png:    SAME (1e347fea...)
compare-light-1440.png:   DIFF (470d4f6b... -> ff1619bc...)
compare-light-390.png:    SAME (a1c13e93...)
compare-dark-1440.png:    DIFF (129d7028... -> 4197fdb0...)
compare-dark-390.png:     SAME (91063eae...)
pricing-light-1440.png:   DIFF (bb0f5a02... -> 93f10b93...)
pricing-light-390.png:    SAME (a60e98da...)
pricing-dark-1440.png:    DIFF (bb0f5a02... -> 93f10b93...)
pricing-dark-390.png:     SAME (a60e98da...)
```

- **Byte-identical:** 12 pairs (all four Home images; all eight 390px public-page pairs)
- **Differing-and-explained:** 8 pairs (all eight 1440px public-page pairs — each explained by the `.prose-measure` narrowing above, with the three named fold crossings as their most significant consequence)
- **Differing-and-unexplained:** 0 pairs

**Aside, not a before/after finding:** `pricing-light-1440.png` and `pricing-dark-1440.png` share an identical hash within *each* capture (both before and after) — i.e. the pricing page's hero/pricing-card region renders pixel-identically regardless of theme at 1440px. This predates this phase (confirmed identical in the `pre-phase-11` capture too) and is outside this plan's scope to investigate or fix; noted here only so it is not mistaken for a capture artifact of this phase's own work.

### Score-dense app page (master-sheet)

**Skipped, again.** `GET /api/dev/test-users` returned `404` this session (re-checked live against a freshly restarted local dev server), so the after-capture fell back to public-pages-only, symmetric with the before-capture. `master-sheet` and the other five authenticated routes were never captured in either baseline. **This half of criterion 4 is NOT met by this plan** and is routed to end-of-phase UAT, exactly as 11-01's own gate anticipated (Section 5) and as WINDOWS.md entries 10, 15, 20 and 22 already established the same posture for. Recorded as **`.planning/WINDOWS.md` entry 24** (this plan's own instance of the fallback, distinct from entry 22's before-capture instance, following the entry-15/entry-20 precedent from Phase 10).

### Lint, typecheck, test, build — verbatim

```
$ npm run lint
...
✖ 397 problems (0 errors, 397 warnings)
```
0 errors. 397 warnings — unchanged from every prior phase's own baseline (`utils/feature-flags.ts`, `utils/server-roles.ts`, `utils/supabase/__tests__/paginate.test.ts`), none newly introduced.

```
$ npm run typecheck
> tsc --noEmit
(exit 0)
```
Exit 0. (One transient false alarm this session: a stale `.next/dev/types/*.d.ts` file, corrupted by a race between a live `next dev` process and this `tsc` invocation, produced spurious parse errors. Diagnosed as a Turbopack dev-server artifact — not project source — by inspecting the malformed generated file directly; resolved by stopping the dev server and clearing `.next/`, after which `tsc --noEmit` ran clean. Not a code issue; not a deviation from any task's `<action>`.)

```
$ npm test
...
 Test Files  76 passed (76)
      Tests  1231 passed (1231)
```
Default-concurrency run: 76/76 files, 1231/1231 tests, all passing. No worker-pool exhaustion was observed on this run, so the `--maxWorkers=2` re-run this plan's own `<action>` names as a fallback was not needed to reach a conclusive result. (Re-run at `--maxWorkers=2` anyway, for symmetry with prior phases' own citation style: also 76/76 files, 1231/1231 tests.)

```
$ npm run build
...
(exit 0)
```
Exit 0. All ten blog-post routes (`/blog/dkp-is-dead-what-classic-guilds-use-in-2026` through `/blog/why-attendance-tracking-matters-more-than-loot-rules`) plus `/blog`, `/research/wow-classic-loot-systems-2026`, `/compare`, `/pricing` all prerender as static content (`○`). Included even though the ROADMAP criterion does not name it: RESEARCH.md Pitfall 4 re-verified this session that the build (broken repo-wide before commit `50a91c9e`, per `.planning/WINDOWS.md` entry 19) stays fixed, retiring the Phase 10 substitute-proof workaround rather than carrying it forward silently.

## Full Guard-Family Pass Count

This phase's three new guards plus every guard shipped by Phases 07 through 10, in one run:

```
$ npx vitest run __tests__/background-inset-absence.test.ts __tests__/quality-brand-color-literals.test.ts __tests__/quality-brand-token-parity.test.ts __tests__/purple-gradient-guard.test.ts __tests__/faction-color-literals.test.ts __tests__/token-palette-literals.test.ts __tests__/hand-rolled-cards.test.ts __tests__/arbitrary-text-sizes.test.ts __tests__/type-scale-floor.test.ts __tests__/prose-measure.test.ts __tests__/browser-surface-theming.test.ts __tests__/data-score-absence.test.ts

 Test Files  12 passed (12)
      Tests  52 passed (52)
```

Covers Phase 07's `token-palette-literals`/`type-scale-floor`, Phase 09's `hand-rolled-cards`/`arbitrary-text-sizes`, Phase 10's `background-inset-absence`/`quality-brand-color-literals`/`quality-brand-token-parity`/`purple-gradient-guard`/`faction-color-literals`, and this phase's `prose-measure`/`browser-surface-theming`/`data-score-absence` — 12 files, 52 tests, all green. This phase's edits regressed none of them.

## Carry-Forwards

Every finding this phase measured but did not fix, each with a name and a destination.

1. **The stale design-system doc-page prose** (`app/(app)/design-system/_client.tsx:1801`, "Applied globally to `td`, `th`, and `[data-score]`.") — **`.planning/WINDOWS.md` entry 23**, routed to **Phase 12 ENF-03**.
2. **The pricing FAQ's `text-[#bababa]` grey hex literal** (`app/pricing/page.tsx`, 7 occurrences, unrelated to this phase's own edit to that same line) — not one of Phase 10's five named WoW/brand hex values; routed to **Phase 12 ENF-02**'s exception list to decide whether it is an oversight or an intentional one-off, per `11-CONTEXT.md`'s Deferred Ideas.
3. **Three named above-the-fold crossings** (blog-post, research, compare, all at 1440px, both themes) — **`.planning/WINDOWS.md` entries 25, 26, 27**, routed to the **sprint workstream's conversion-cohort measurement owner**.
4. **No jittering numeric column or wrong-looking scrollbar found in passing** during this plan's own review of the capture (per D-09's scope discipline — this phase does not audit for missing `.tabular-nums` coverage). One adjacent finding **was** made and is carried forward: the universal scrollbar rule's visual affordance could not be confirmed in headless Puppeteer capture (see Criterion 2 above) — **`.planning/WINDOWS.md` entry 28**, routed to **end-of-phase UAT**.
5. **The authenticated-capture fallback**, this plan's own instance — **`.planning/WINDOWS.md` entry 24**, routed to **end-of-phase UAT**, same posture as entries 10, 15, 20 and 22 across every prior phase in this workstream.
6. **The pricing-page light/dark 1440px hash-identity aside** (noted above, under "Image-pair hash buckets") — pre-existing, not investigated further, no destination assigned (informational only).

## Measured Deltas (restated, not reconciled away)

Every plan-time measured discrepancy from this phase's four prior plans, restated as a delta rather than silently absorbed into one number:

| Discrepancy | Plan-time / discussion estimate | Measured number | Where reconciled |
|---|---|---|---|
| Blog post count | 10 blog posts (ROADMAP, `11-CONTEXT.md`) | **9** individual post files + `app/blog/page.tsx` (the index/listing page, out of scope) — 11 wrapper sites + 1 inline FAQ site = 12 TYPE-04 call sites total, not 13 | Named at 11-01-SUMMARY.md discrepancy 1; `11-UI-SPEC.md` had already caught this independently |
| `.tabular-nums` file count | 19 files (`11-CONTEXT.md`, `11-RESEARCH.md`, `11-UI-SPEC.md`) | **20 files** including `app/globals.css`'s own definition site, **19** excluding it (re-measured this session: `grep -rln "tabular-nums" app components \| wc -l` → 20; excluding `globals.css` → 19) | Named at 11-01-SUMMARY.md discrepancy 4 and 11-04-SUMMARY.md's own re-measurement; nothing in this phase depends on the exact count either way |
| TYPE-04 absence-guard scope | `11-PATTERNS.md`'s initial sketch included `app/pricing/page.tsx` in the absence-scan list | **Corrected to eleven wrapper files**, excluding both `app/blog/page.tsx` (out-of-scope index page) and `app/pricing/page.tsx` (carries a legitimate out-of-scope page-level wrapper at line 62; only its FAQ line at 152 is in scope, and that gets a *presence* assertion instead) | Named and corrected at 11-01-SUMMARY.md discrepancy 2; implemented exactly as corrected by 11-02's `__tests__/prose-measure.test.ts` |
| Tailwind `@layer` tree-shaking behaviour | Not anticipated in any planning document | **Class-selector rules inside `@layer components`/`@layer base` are tree-shaken by Tailwind's content scan** unless a scanned file uses the class name literally (confirmed live for `.nav-item-active`, `.card-gradient`, `.sidebar-scrollable`, and `.prose-measure` itself via a real before/after Tailwind CLI compile) — this is why 11-01's tracer task defined `.prose-measure` and wired its first call site in the same commit, rather than landing the class definition alone | Discovered and documented at 11-01-SUMMARY.md discrepancy 3; re-confirmed independently by 11-04-SUMMARY.md when its own `<verify>` script's narrow `--content` scope failed to surface `.prose-measure` for an unrelated reason |

## G-11-1: numerals actually render tabular (11-06-PLAN.md)

> ROADMAP criterion 4's numeral half: "Screenshots ... show ... no numeric column jitter" -- answered here
> with a rendered glyph-advance measurement, not a screenshot, because a screenshot cannot detect digit-advance
> jitter at the sub-pixel level this defect operates at. `app/globals.css` declared
> `font-variant-numeric: tabular-nums` on `.tabular-nums` before this milestone, computed correctly on every one
> of 86 call sites across 19 files, and changed nothing, because Poppins ships no `tnum` feature. 11-UAT.md
> measured 42-49% per-digit width variance at all four shipped weights and 13.49px of jitter between `11.1` and
> `88.8` at weight 600 -- the exact "score jumps sideways as digits change" defect a loot-priority table cannot
> ship with. This plan closes it: the numerals class now resolves to Figtree, a self-hosted tnum-capable face
> from the same `next/font/google` pipeline Poppins already uses, while Poppins remains the face of every prose
and UI string in the app.

### The acceptance instrument, red before anything was fixed (Task 1, commit `b34d6188`, fixed `6446a17b`)

```
# numeral-probe acceptance run: g11-1-before

Timestamp: 2026-09-22T05:45:20.107Z

## Controls
- Poppins (forced): uniform=false spread=14.344px
- system-ui (forced): uniform=true spread=0px

## http://localhost:3100/pricing
Font size used: 12px | declared: Poppins | rasterised: Poppins | native elements: 0

| Weight | Uniform | Spread (px) | Decimal jitter (px) | Declared | Rasterised |
|---|---|---|---|---|---|
| 400 | false | 15.109 | 11.203 | Poppins | Poppins |
| 500 | false | 14.25 | 10.375 | Poppins | Poppins |
| 600 | false | 14.344 | 10.125 | Poppins | Poppins |
| 700 | false | 14.438 | 9.797 | Poppins | Poppins |

Exit code: 1
```

Exit `1` (product not rendering tabular numerals, not a void run), all four weights non-uniform, weight-600
decimal jitter **10.125px** -- reproducing the UAT's hand-measured 13.49px finding as the same phenomenon (the
probe's injected span and the UAT's real call site differ slightly in surrounding context, not in kind: both
show Poppins ignoring the feature by roughly an order of magnitude more jitter than the 0.05px tolerance).
Both controls held: Poppins (forced) measured non-uniform (14.344px spread), system-ui (forced) measured
uniform (0px spread) -- the probe is proven to distinguish the two states before it is trusted to accept a fix.
Rasterised family read via CDP `CSS.getPlatformFontsForNode` matched the declared family (`Poppins`) at every
weight, confirming the red result is real and not a measurement artifact.

### Screening table (Task 2, feeding the decision checkpoint)

```
# numeral-probe screening run: g11-1-screen

Timestamp: 2026-09-22T05:45:27.283Z
Measured against: http://localhost:3100/pricing

| Rank | Family | Uniform at all 4 weights (feature on) | Missing weights | x-height ratio to Poppins | cap-height ratio to Poppins |
|---|---|---|---|---|---|
| 1 | Inter | true | none | 0.996 | 1.044 |
| 2 | IBM Plex Sans | true | none | 0.942 | 1.001 |
| 3 | IBM Plex Mono | true | none | 0.942 | 1.001 |
| 4 | Figtree | true | none | 0.912 | 1.005 |
| 5 | Source Sans 3 | true | none | 0.887 | 0.942 |
```

All five candidates measured uniform digit advance at all four weights with the `tabular-nums` feature on, and
all five would have failed without it (feature-off spreads ranged 10.8-11.8px for the proportional candidates,
0px for the two already-monospace-by-construction ones) -- confirming each pass is a real feature dependency,
not an accident of the family's default metrics.

### The decision (Task 2, checkpoint answered 2026-09-21)

**Family shipped: Figtree.** Not the rank-1 candidate by ratio match (Inter, 0.996/1.044) -- the user chose
texture coherence over closest apparent-size match, reading the rendered side-by-side at the checkpoint rather
than the ratios alone: Figtree is geometric, the same family of shapes as Poppins, and read as the closest
sibling face of the five. Measured x-height ratio to Poppins 0.912, cap-height ratio 1.005 (near-identical).
Uniform at all four weights with the feature on; non-uniform with it off, confirming it is genuinely
feature-gated rather than tabular by construction. This is a human judgement made on the rendered comparison at
the checkpoint, per the plan's own backstop `must_have`, not inferred from the ratio table.

All three sub-decisions were approved as written, no amendments: the unlayered CSS placement (a layered rule
loses to a same-element Tailwind family utility, which is how the declaration this repairs went inert), the
fallback chain degrading to `system-ui` rather than Poppins (Poppins ignores the feature; falling back to it
would silently reproduce the defect), and the three named non-fixes (below).

### The wiring, and the acceptance instrument green after it (Task 3, commit `0f9ebcc1`)

`app/layout.tsx` declares Figtree through `next/font/google` in the same shape as the Poppins declaration
(`--font-tabular`, weights 400/500/600/700, latin subset, swap display), mounted on `<body>` alongside the
other two font variables. `app/globals.css` gives `.tabular-nums` a `font-family: var(--font-tabular),
ui-sans-serif, system-ui, sans-serif` rule in the unlayered tail of the file, below the
`ICON/LOGO ADAPTIVE THEMING (outside layers for higher specificity)` marker. The pre-existing
`td, th, .tabular-nums { font-variant-numeric: tabular-nums; }` rule inside `@layer base` is untouched.

```
# numeral-probe acceptance run: g11-1-after

Timestamp: 2026-09-22T05:58:49.336Z

## Controls
- Poppins (forced): uniform=false spread=14.344px
- system-ui (forced): uniform=true spread=0px

## http://localhost:3100/pricing
Font size used: 12px | declared: Figtree | rasterised: Figtree | native elements: 0

| Weight | Uniform | Spread (px) | Decimal jitter (px) | Declared | Rasterised |
|---|---|---|---|---|---|
| 400 | true | 0 | 0 | Figtree | Figtree |
| 500 | true | 0 | 0 | Figtree | Figtree |
| 600 | true | 0 | 0 | Figtree | Figtree |
| 700 | true | 0 | 0 | Figtree | Figtree |

## http://localhost:3100/research/wow-classic-loot-systems-2026
Font size used: 12px | declared: Figtree | rasterised: Figtree | native elements: 0

| Weight | Uniform | Spread (px) | Decimal jitter (px) | Declared | Rasterised |
|---|---|---|---|---|---|
| 400 | true | 0 | 0 | Figtree | Figtree |
| 500 | true | 0 | 0 | Figtree | Figtree |
| 600 | true | 0 | 0 | Figtree | Figtree |
| 700 | true | 0 | 0 | Figtree | Figtree |

Exit code: 0
```

Exit `0` on both public surfaces. Every measured per-weight advance spread dropped from a **14.25-15.109px**
range (before) to **0px** (after) at every one of the four weights, on both surfaces. Decimal jitter (`11.1`
vs `88.8`) dropped from **9.797-11.203px** (before, varying by weight) to **0px** (after) at every weight.
Rasterised family (read via CDP, not computed style) equalled declared family (`Figtree` = `Figtree`) on every
measured weight and surface -- ruling out a fallback pass, the single most dangerous failure mode this plan's
threat model names (T-11-15). No console error and no failed request named a font (`consoleErrors: []`,
`failedRequests: []`), confirming the face loaded under `next.config.ts`'s `font-src 'self' data:` policy.
Both controls held on this run too: Poppins (forced) non-uniform, system-ui (forced) uniform.

### Guard non-vacuity proof (Task 3, `__tests__/numeral-font.test.ts`)

Proven red in all three of its structural failure modes before committing, each mutation reverted with
`git checkout --` before the next was made, `git status --porcelain` confirmed clean of the three touched
files (`app/layout.tsx`, `app/globals.css`, `app/(app)/master-sheet/components/BossSection.tsx`) before the
guard was committed.

**Assertion 2 red** -- `figtree.variable` removed from the `<body>` className:

```
 ❯ __tests__/numeral-font.test.ts (6 tests | 1 failed) 137ms
     × mounts --font-tabular on the same className string that carries the other font variables 6ms

AssertionError: expected figtree.variable on the same className string as the other font variables -- a
variable declared but never mounted is undefined at the class and the family falls back silently: expected
false to be true

      Tests  1 failed | 5 passed (6)
```

**Assertion 4 red** -- family rule temporarily relocated inside `@layer base`, above the unlayered marker:

```
 ❯ __tests__/numeral-font.test.ts (6 tests | 1 failed) 50ms
     × places the family rule outside every cascade layer, below the unlayered section marker 2ms

AssertionError: expected the .tabular-nums font-family rule to sit below the unlayered section marker -- a
layered declaration loses to any same-element Tailwind family utility, which is how the declaration this
repairs became silently inert: expected -1 to be greater than 410

      Tests  1 failed | 5 passed (6)
```

**Assertion 5 red** -- `font-sans` added beside `.tabular-nums` at `BossSection.tsx:118`:

```
 ❯ __tests__/numeral-font.test.ts (6 tests | 1 failed) 110ms
     × finds no call site where the numerals class collides with a Tailwind font-family utility 104ms

AssertionError: /Users/alexander.mayes/Code/personal/loot-list-plus/app/(app)/master-sheet/components/
BossSection.tsx:118: <span className="text-12 font-bold text-foreground tabular-nums font-sans">
{explanation.total.toFixed(decimalPlaces)}</span>: expected [ { ...(3) } ] to have a length of +0 but got 1

      Tests  1 failed | 5 passed (6)
```

All three assertions named the file (and, for assertion 5, the exact line) they were guarding. Restored,
re-run green: `Test Files 1 passed (1)`, `Tests 6 passed (6)`.

### What this measurement covered, and what it did not

**Covered:** the two public surfaces (`/pricing`, `/research/wow-classic-loot-systems-2026`) at all four
shipped weights, via a rendered glyph-advance measurement in real Chrome -- not a computed style, not a source
text scan, not a green test suite. This is the substitution the plan's own prohibition names as the exact
mistake that let G-11-1 ship in the first place, and it is structurally ruled out here.

**Not covered, named and routed (three decided non-fixes, per D-09, confirmed at the Task 2 checkpoint):**

1. **The `td, th` half of the shared rule** keeps only its `font-variant-numeric` declaration and gains no
   family -- a table cell without the `.tabular-nums` class is unaffected. Not fixed: a second face on every
   table cell would change text cells too. **`.planning/WINDOWS.md` entry 32.**
2. **The public stat callout** at `app/research/wow-classic-loot-systems-2026/page.tsx:461` carries no
   `.tabular-nums` class and was not given one, per D-09. **`.planning/WINDOWS.md` entry 33.**
3. **The authenticated score-dense surfaces** -- master-sheet (BossSection score and score-breakdown columns),
   attendance, overview, the score-comparison modal -- could not be verified in this environment: `GET
   /api/dev/test-users` returns 404 (`loadtest/test-users.json` absent) and `npm run test:users:create` writes
   real users into a hosted Supabase project, so it must not be run. Routed to end-of-phase UAT.
   **`.planning/WINDOWS.md` entry 34.**

**A fourth, unplanned finding surfaced by this plan's own acceptance criteria, also routed rather than
fixed:** the negative-grep acceptance criterion for external font hosts
(`grep -rn "fonts.googleapis.com\|fonts.gstatic.com" app components next.config.ts | wc -l` is `0`) fails
against the live tree -- not because of anything this plan touched, but because
`app/reserve/join/[token]/opengraph-image.tsx` (pre-existing, git-log-confirmed to predate this plan) fetches
two Poppins TTF files directly from `fonts.gstatic.com` at request time for a server-side `next/og`
`ImageResponse` render. That is a Satori server render, not a browser document load, so it is not governed by
`next.config.ts`'s `font-src` CSP directive this criterion protects. Scoped re-verification confirms zero
external-font-host references in the files this plan actually touched (`app/layout.tsx`, `app/globals.css`).
Not fixed here: out of scope for G-11-1, not in this plan's `files_modified`. **`.planning/WINDOWS.md` entry
35.**

### ROADMAP criterion 4, numeral half -- answered

> "...no numeric column jitter..."

Answered on the public surfaces with a rendered measurement, not a screenshot: jitter dropped from
9.797-11.203px (weight-dependent, before) to 0px (every weight, after) on both `/pricing` and
`/research/wow-classic-loot-systems-2026`. The authenticated score-dense half of this criterion (master-sheet)
is **not** met by this plan and is routed to end-of-phase UAT per entry 34 above, consistent with every prior
plan's own posture on the authenticated-capture gap (`.planning/WINDOWS.md` entries 10, 15, 20, 22, 24).

---
*Phase: 11-reading-and-browser-surfaces*
*Recorded: 2026-09-21*
