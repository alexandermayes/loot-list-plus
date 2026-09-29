---
phase: 12-enforcement-and-documentation
plan: 04
subsystem: design-system
tags: [design-system, docs-page, vitest, absence-guard, contrast, tailwind]

requires:
  - phase: 12-enforcement-and-documentation
    provides: "12-01's answered phase gate (item 2.9's approved wording, item 2.10's leave-them default) and 12-02/12-03's DESIGN.md as the normative source the page now points to"
provides:
  - "The in-app design-system page (app/(app)/design-system/_client.tsx) documents what shipped this milestone: the revised type scale with text-15, the standby/faction/quality/brand colour swatches rendered from source, the Card nested variant, the focus ring's measured light-mode shortfall, and the Modal's six proven behaviours"
  - "The page names no primitive the milestone deleted, in any spelling (className, selector, code element, or prose)"
  - "__tests__/design-system-page-absence.test.ts: a 28-test guard (absence, sibling-survival, fail-loud missing-path, and region-scoped assertions for every UI-SPEC item), observed red on the real stale [data-score] line before being accepted green"
affects: [12-07]

actuals:
  tokens: 6719
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Region-scoped page assertions cut by content markers (subsection titles, section ids) rather than line numbers, so three tasks editing the same 2159-line file in sequence do not invalidate each other's tests"
    - "Contrast claims recomputed live from contrast.ts's ratio() rather than asserted as fixed strings, so a future --ring token change turns the guard red before the caption can go stale"

key-files:
  created:
    - __tests__/design-system-page-absence.test.ts
  modified:
    - app/(app)/design-system/_client.tsx

key-decisions:
  - "The Label Text subsection's single-label sentence conveys that the old uppercase label treatment and its dedicated class were removed in Phase 08, without spelling either deleted identifier's bare name. The plan's own hard-verified absence guard (must_haves truth: the deleted primitives appear nowhere on the page in any spelling, including prose) and a literal reproduction of the identifiers in gate 2.9's paraphrased description were in direct conflict; the machine-checked guard governed, since gate 2.9 is a summary of intent rather than verbatim final text and the guard is an explicit <verify> gate."
  - "The Cards-section caption naming the nested variant says 'The nested variant renders a divider...' instead of reproducing the literal string variant=\"nested\", because Task 3's own <verify> counts exactly three occurrences of that literal string in the Cards region; a fourth occurrence in the caption would have broken the count it was meant to describe. Same resolution pattern as the Label sentence: the exact, automated count governs over the plan's literal caption wording."
  - "Gate item 2.10's default branch (leave the other hand-typed numeric labels) was taken; every remaining hand-typed pixel label on the page is listed below for 12-07's WINDOWS entry, none were touched."
  - "Standby swatch uses text-standby-foreground, not text-standby, per the gate's explicit correction (text-standby renders invisible on bg-standby)."
  - "All five Accent & Status hex fields were removed rather than corrected or extended; none were rendered in JSX before removal (grep-confirmed), so removal is a clean no-op for rendered output."

patterns-established: []

requirements-completed: [ENF-03]

coverage:
  - id: D1
    description: "Both type-scale clusters render class/size-prop names only (no hand-typed pixel value); cluster A gains a text-15 row between text-lg and text-md, for eleven total rows; a single DESIGN.md pointer caption serves both clusters"
    requirement: "ENF-03"
    verification:
      - kind: unit
        ref: "__tests__/design-system-page-absence.test.ts#design-system page type-scale region (ENF-03, UI-SPEC item 1) > lists exactly eleven rows including text-15 / contains no hand-typed size property or pixel figure"
        status: pass
      - kind: unit
        ref: "__tests__/design-system-page-absence.test.ts#design-system page Text Sizes cluster (ENF-03, UI-SPEC item 1 cluster B) > has no parenthesised pixel figure in the Sizes preview"
        status: pass
    human_judgment: false
  - id: D2
    description: "A Reading Measure subsection renders a real ~100-word paragraph inside .prose-measure, with a caption stating the 70ch cap is a public-page mechanism not used inside the authenticated app"
    requirement: "ENF-03"
    verification:
      - kind: unit
        ref: "__tests__/design-system-page-absence.test.ts#design-system page colour and reading-measure additions ... > the page contains \"prose-measure\""
        status: pass
    human_judgment: true
    rationale: "Whether the paragraph's line visibly wraps at the 70ch cap at desktop width, and fills the available width below 70ch, is a rendered-layout claim a unit test asserting string presence cannot prove; the plan itself designates this a human-check item."
  - id: D3
    description: "Standby, Faction Colours, and Item Quality & Brand swatches render from source (text-standby-foreground, bg-alliance, bg-horde, QUALITY_COLORS.epic/uncommon, BRAND_COLORS.battlenet/discord/wcl), with the brand-discord/discord duplicate disclosed"
    requirement: "ENF-03"
    verification:
      - kind: unit
        ref: "__tests__/design-system-page-absence.test.ts#design-system page colour and reading-measure additions (ENF-03, UI-SPEC Color section, item 2)"
        status: pass
      - kind: unit
        ref: "__tests__/quality-brand-color-literals.test.ts, __tests__/token-palette-literals.test.ts, __tests__/purple-gradient-guard.test.ts"
        status: pass
    human_judgment: true
    rationale: "Label legibility on each fill (in particular the standby swatch's text-standby-foreground contrast) is a visual read the string-presence guard cannot certify; routed to the plan's human-check step."
  - id: D4
    description: "A parent Card contains exactly three variant=\"nested\" children (Guild, Raid schedule, Loot rules), demonstrating first:border-t-0 (no divider on the first child, dividers on the second and third)"
    requirement: "ENF-03"
    verification:
      - kind: unit
        ref: "__tests__/design-system-page-absence.test.ts#design-system page Cards nested example region (ENF-03, UI-SPEC item 3) > the Cards section contains exactly three variant=\"nested\" occurrences"
        status: pass
    human_judgment: true
    rationale: "The unit test proves the count and the underlying Card component's own test suite (components/ui/__tests__/card.test.tsx) proves the CSS mechanism; whether the divider visually renders as intended in this specific stacked arrangement at 1440/390 in both themes is the plan's own human-check item."
  - id: D5
    description: "The focus-ring caption names the --ring mechanism and states the light-mode contrast shortfall (page 2.913, modal 2.726 fall short of 3:1; card 3.093 and all three dark ratios clear it), both numbers recomputed live from the tokens"
    requirement: "ENF-03"
    verification:
      - kind: unit
        ref: "__tests__/design-system-page-absence.test.ts#design-system page focus-ring caption recomputed against tokens (ENF-03, UI-SPEC item 4)"
        status: pass
    human_judgment: false
  - id: D6
    description: "A Modal Behaviour callout lists all six behaviours the existing demo already proves, including the stacked-modal Escape tie-break (commit 027129cd)"
    requirement: "ENF-03"
    verification:
      - kind: unit
        ref: "__tests__/design-system-page-absence.test.ts#design-system page Modal callout region (ENF-03, UI-SPEC item 5) > the Modals section names aria-modal, ModalTitle, the tie-break commit and \"topmost\""
        status: pass
    human_judgment: true
    rationale: "The callout's six listed behaviours are proven by the pre-existing Modal component and are named accurately in the guard, but whether interacting with the demo (Tab trap, Escape, focus return) matches the callout's claims at 1440/390 is the plan's own human-check item."
  - id: D7
    description: "The Label Text subsection ties Label (form fields) to Text (section headings) and states that the former uppercase treatment and its dedicated class were removed in Phase 08, without naming either deleted identifier's bare spelling"
    requirement: "ENF-03"
    verification: []
    human_judgment: true
    rationale: "Prose accuracy (does the sentence correctly describe what changed) is a reading judgment; the file-wide absence guard proves the identifiers are not literally spelled anywhere, which is a different and narrower claim than 'this sentence reads correctly'."
  - id: D8
    description: "The stale Tabular Numbers sentence now names .tabular-nums instead of the deleted [data-score] selector, and a new sentence documents the Figtree numeral face with its td/th caveat; a DESIGN.md pointer line sits at the top of <main>"
    requirement: "ENF-03"
    verification:
      - kind: unit
        ref: "__tests__/design-system-page-absence.test.ts#design-system page absence guard (ENF-03, D-12) > finds no \"data-score\" anywhere in the page"
        status: pass
    human_judgment: false
  - id: D9
    description: "The deleted-primitive absence guard (LabelText, section-label, data-score, background-inset, sidebar-scrollable) was observed red on the real stale line before being accepted green, paired with sibling-survival and fail-loud missing-path assertions"
    requirement: "ENF-03"
    verification:
      - kind: unit
        ref: "manual red-then-green run, verbatim failure recorded below"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-09-22
status: complete
---

# Phase 12 Plan 04: Design-System Page Documents What Shipped Summary

**The in-app `/design-system` page now documents the type scale's `text-15` step, the standby/faction/quality/brand colour tokens, the Card `nested` variant, the focus ring's measured light-mode shortfall, and the Modal's six proven behaviours, entirely through live examples reading the app's own tokens, with a 28-test guard proving no deleted primitive survives in any spelling.**

## Performance

- **Duration:** 55 min
- **Started:** 2026-09-22T16:55:00Z
- **Completed:** 2026-09-22T17:21:20Z
- **Tasks:** 3 of 3 complete
- **Files modified:** 2 (`app/(app)/design-system/_client.tsx`, `__tests__/design-system-page-absence.test.ts`)

## Accomplishments

- Created `__tests__/design-system-page-absence.test.ts`, modeled on `data-score-absence.test.ts`'s absence-plus-sibling-survival shape, and observed it fail on the real stale `[data-score]` line (1801) before touching the page.
- Fixed the stale Tabular Numbers sentence to name `.tabular-nums`, added the Figtree numeral-face sentence with its `td`/`th` caveat, and added the `DESIGN.md` pointer line at the top of `<main>`.
- Rebuilt the Type Scale table (cluster A) to show only class names (no typed pixel value), added the `text-15` row between `text-lg` and `text-md` for eleven total rows, and added a single `DESIGN.md` pointer caption serving both this cluster and the Text component's Sizes preview (cluster B), which also lost its parenthesised pixel labels.
- Added the single-label sentence to the Label Text subsection, tying `Label` (form fields) to `Text` (section headings) without naming either deleted primitive's bare identifier (see Deviations).
- Added a Reading Measure subsection with a real, visibly-wrapping paragraph inside `.prose-measure` and its caption.
- Removed all five unrendered `hex` fields from the Accent & Status swatch array and appended a `standby` entry using `text-standby-foreground` (not `text-standby`, which is invisible on `bg-standby`).
- Added Faction Colours (`bg-alliance`, `bg-horde`) and Item Quality & Brand (`QUALITY_COLORS.epic`/`uncommon`, `BRAND_COLORS.battlenet`/`discord`/`wcl`) subsections, values rendered from the imported constants, with the `brand-discord`/`discord` duplicate disclosed.
- Added a Card `nested` example (three stacked children) and its caption, worded to avoid double-counting the guard's own `variant="nested"` occurrence assertion (see Deviations).
- Added a two-sentence focus-ring caption above Form Inputs, naming the `--ring` mechanism and the measured light-mode contrast shortfall, with both numbers (`2.913`, `2.726`) recomputed live by the guard from `contrast.ts`'s `ratio()`.
- Added a Modal Behaviour callout listing all six behaviours the existing demo already proves, including the stacked-modal Escape tie-break (`027129cd`).
- Extended the page guard across all three tasks to 28 tests: absence/survival/fail-loud (Task 1), type-scale region and colour/prose string checks (Task 2), and Cards/Modals region checks plus live-recomputed ring-ratio assertions (Task 3).

## Task Commits

1. **Task 1: Page guard observed red on the real stale line, then the tabular-numerals fix, the Figtree sentence and the DESIGN.md pointer** - `58426cb2` (test)
2. **Task 2: Type scale without typed pixels (both clusters, text-15), the single-label sentence, the reading-measure example, and the colour swatches rendered from source** - `1a0c56fa` (feat)
3. **Task 3: Card nested example, focus-ring caption with its contrast claims recomputed, and the Modal behaviour callout** - `4d03c227` (feat)

## Verbatim Red Observation (Task 1)

Recorded before any page edit, from the first run of `__tests__/design-system-page-absence.test.ts` against the unmodified page:

```
 ❯ __tests__/design-system-page-absence.test.ts (10 tests | 1 failed) 10ms
     × finds no "data-score" anywhere in the page (className, selector, code, or prose) 3ms

 FAIL __tests__/design-system-page-absence.test.ts > design-system page absence guard (ENF-03, D-12) > finds no "data-score" anywhere in the page (className, selector, code, or prose)
AssertionError: /Users/alexander.mayes/Code/personal/loot-list-plus/app/(app)/design-system/_client.tsx:1801: <p>Applied globally to <code className="text-accent">td</code>, <code className="text-accent">th</code>, and <code className="text-accent">[data-score]</code>.</p>: expected [ { …(3) } ] to have a length of +0 but got 1

 Test Files  1 failed (1)
      Tests  1 failed | 9 passed (10)
```

All 4 other absence assertions (`LabelText`, `section-label`, `background-inset`, `sidebar-scrollable`) and all 4 sibling-survival assertions passed on this same first run, matching D-12's measured 0-references-except-`data-score` baseline exactly. After the page fix, all 10 tests in this initial block passed; by the end of Task 3 the file holds 28 passing tests.

## Files Created/Modified

- `__tests__/design-system-page-absence.test.ts` - 28-test guard: 5 absence assertions, 4 sibling-survival assertions, 1 fail-loud missing-path assertion, type-scale region assertions (row count, no pixel value), Text Sizes cluster assertion, 8 colour/prose string-presence assertions, Cards nested-count assertion, Modals behaviour-string assertions, and 4 live-recomputed focus-ring contrast assertions
- `app/(app)/design-system/_client.tsx` - Tabular Numbers stale-fact fix, Figtree sentence, DESIGN.md pointer, Type Scale rebuild (both clusters, `text-15`), single-label sentence, Reading Measure subsection, standby/Faction/Item Quality & Brand swatches, Card `nested` example, focus-ring caption, Modal Behaviour callout

## Decisions Made

See `key-decisions` in the frontmatter. Summarized: two places where the plan's literal caption wording would have broken its own machine-verified guard (the Label sentence naming deleted primitives; the nested-card caption reproducing the exact `variant="nested"` string the guard counts) were resolved in favor of the automated `<verify>` gate, preserving the same intended meaning without the literal collision. Both are documented as deviations below since they diverge from the plan's literal quoted text while satisfying its verification requirements and success criteria.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Internal plan contradiction] Label Text sentence reworded to avoid naming deleted primitives literally**
- **Found during:** Task 2 (Label Text subsection)
- **Issue:** The plan's gate-answer description characterizes the approved Label sentence as "naming the two removed primitives" (i.e. `LabelText` and `.section-label`), but the same plan's hard-verified absence guard (a `<verify>` gate and a `must_haves` truth) requires those bare identifiers to appear nowhere on the page in any spelling, including prose. Typing the literal identifiers into an explanatory sentence would make the guard fail the moment it is added.
- **Fix:** Wrote the sentence to convey the same fact (the old uppercase label treatment and its dedicated class were removed in Phase 08) without using either identifier's literal bare spelling. The sentence still ties `Label` (form fields) to `Text` (section headings), closing the single-Label half of criterion 3.
- **Files modified:** `app/(app)/design-system/_client.tsx`
- **Verification:** `__tests__/design-system-page-absence.test.ts`'s absence assertions for `LabelText` and `section-label` both pass with the new sentence present.
- **Committed in:** `1a0c56fa` (Task 2 commit)

**2. [Rule 1 - Internal plan contradiction] Card nested-variant caption reworded to avoid double-counting the guard's own assertion**
- **Found during:** Task 3 (Cards section)
- **Issue:** The plan's quoted caption text reads `` `variant="nested"` renders a divider... ``, and the same task's own `<verify>` script counts exactly three occurrences of the literal string `variant="nested"` within the Cards region. Including the caption's own copy of that string would make the count four, failing the task's own automated gate.
- **Fix:** Reworded the caption to `` The `nested` variant renders a divider... `` — same meaning, no literal `variant="nested"` substring.
- **Files modified:** `app/(app)/design-system/_client.tsx`
- **Verification:** The region assertion counts exactly 3, as required.
- **Committed in:** `4d03c227` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - resolving an internal contradiction between the plan's literal quoted prose and its own machine-verified `<verify>` gates, in favor of the gate).
**Impact on plan:** Both fixes preserve the intended meaning and satisfy every stated success criterion and acceptance script; no scope creep, no architectural change.

## Human-Check Items (deferred to end-of-phase UAT)

Per `workflow.human_verify_mode = end-of-phase` (the project default), the `<verify><human-check>` items embedded in Tasks 2 and 3 are not interactive checkpoints and were not walked through a browser session during this executor run. They are listed here for the phase-level UAT consolidation:

- Task 2: at 1440 and 390 in both themes, confirm the type scale shows eleven rows with class names and no pixel labels; the reading-measure paragraph visibly wraps at 1440 and fills the width at 390; the standby, faction, quality and brand swatches render with legible labels, including the standby label's readability on its own fill.
- Task 3: at 1440 and 390 in both themes, confirm the nested stack shows no divider above its first child and a divider above the second and third, with no horizontal scroll at 390; the focus-ring caption reads cleanly beside Form Inputs; Tab through the controls shows the ring; open a modal, Tab stays inside, Escape closes it and focus returns to its button; the Modal callout does not displace the demo buttons.

## Remaining Hand-Typed Numeric Labels (gate item 2.10 default: left untouched)

Per the answered gate, every hand-typed numeric label outside UI-SPEC's seven items stays as-is. Current line numbers (post-edit) for 12-07's WINDOWS entry:

- `_client.tsx:530` - Label Text "Extra Small": `12px, not uppercase (was 10px uppercase pre-migration)` (explicitly left alone per the plan's own instruction - legitimate migration history, not a stale current-value claim)
- `_client.tsx:534` - Label Text "Small": `12px, not uppercase`
- `_client.tsx:559-565` - Spacing Scale array: `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`
- `_client.tsx:591` - Spacing "Page Layout" caption: `(32px)`
- `_client.tsx:602` - Spacing "Card Padding" caption: `(24px)`
- `_client.tsx:713-716` - Icon size labels: `16px`, `20px (default)`, `24px`, `32px`
- `_client.tsx:741-744` - Border Radius labels: `sm (4px)`, `md (8px)`, `lg (12px)`, `xl (16px)`
- `_client.tsx:1553-1555` - Inline Spinner sizes: `sm (14px)`, `default (16px)`, `lg (20px)`
- `_client.tsx:1573,1577,1581` - Loading Spinner (branded) sizes: `sm (24px)`, `default (48px)`, `lg (64px)`
- `_client.tsx:1783,1788,1792,1796` - Tooltip Sizing descriptions: `11-12px`, `14px`, `12-14px`, `14px`
- `_client.tsx:2023,2032` - Concentric Radius comparison labels: `outer 16px, padding 8px, inner 8px` / `outer 16px, padding 8px, inner 16px`
- `_client.tsx:2045-2047` - Concentric Radius guidance lines: `(16px)`, `(8px)`, `(8px)` inner / `(16px)`, `(12px)`, `(4px)` inner / `(16px)`, `(24px+)`

None of these were modified. They are correct today per the gate's own acceptance and are routed to 12-07's named WINDOWS entry, not fixed here.

## Issues Encountered

None beyond the two documented deviations above. The full test suite (`npm test --maxWorkers=2`) showed two different, unrelated `raid-tracking` component test timeouts across two separate runs (worker-pool flakiness under load, not a consistent failure); both files reproduced 100% green in isolation, confirming the flakiness is pre-existing and unrelated to this plan's two changed files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ENF-03's criterion 3 is fully documented on `app/(app)/design-system/_client.tsx`: revised type scale, colour and surface tokens, Card variants, the single Label convention, focus ring, and Modal behaviour, with no deleted primitive shown in any spelling.
- The page no longer restates token values it could render from source, closing the drift vector D-10 named.
- The remaining hand-typed numeric labels list above and the two human-check item lists are ready for 12-07 to fold into its WINDOWS entry and the phase-level UAT consolidation, respectively.
- 12-05 (ENF-02 classification gate) and onward are unblocked; this plan touched only its two declared files.

## Self-Check: PASSED

- `app/(app)/design-system/_client.tsx` - FOUND
- `__tests__/design-system-page-absence.test.ts` - FOUND
- Commit `58426cb2` (Task 1) - FOUND
- Commit `1a0c56fa` (Task 2) - FOUND
- Commit `4d03c227` (Task 3) - FOUND
- `npx vitest run __tests__/design-system-page-absence.test.ts` - 28/28 passed
- `git log --format= --name-only --grep='(12-04)' | sort -u` - lists exactly the two declared files, nothing else

---
*Phase: 12-enforcement-and-documentation*
*Completed: 2026-09-22*
