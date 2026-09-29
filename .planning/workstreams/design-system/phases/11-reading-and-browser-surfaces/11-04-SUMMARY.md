---
phase: 11-reading-and-browser-surfaces
plan: 04
subsystem: ui
tags: [css, tailwind, vitest, guard-test, design-tokens]

requires:
  - phase: 11-reading-and-browser-surfaces (11-01, 11-03)
    provides: the shared tabular-numerals rule and the rest of app/globals.css's @layer base block (prose-measure, ::selection, caret-color, universal scrollbar) that this plan's deletion must not disturb
provides:
  - The dead `[data-score]` attribute selector removed from app/globals.css's shared tabular-numerals rule
  - __tests__/data-score-absence.test.ts (SURF-02 absence + sibling-survival guard, observed red in both failure modes before commit)
  - .planning/WINDOWS.md entry 23 (the stale design-system doc-page prose, routed to Phase 12 ENF-03)
affects: [11-05-close-out-and-evidence, 12-enforcement-and-documentation]

actuals:
  tokens: 1995
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Absence-plus-sibling-survival guard (mirrors background-inset-absence.test.ts): an absence assertion alone can pass trivially if the whole rule block is deleted, so a targeted deletion guard must also assert its surviving siblings still match"
    - "Tailwind @layer components/base tree-shaking by content scan: a rule built purely from a class selector (.prose-measure, .nav-item-active) is dropped from compiled output unless a scanned content file uses that class name literally; a rule that also carries a tag selector (td, th) survives regardless, since the tag selector itself is always kept"

key-files:
  created:
    - __tests__/data-score-absence.test.ts
  modified:
    - app/globals.css
    - .planning/WINDOWS.md

key-decisions:
  - "D-08 (locked, from 11-CONTEXT.md): delete [data-score] outright rather than wire it to real elements -- zero functional consumers existed under app/ or components/"
  - "Task 1's own verify script's --content \"app/layout.tsx\" scope does not exercise .prose-measure (a class-only @layer components rule, tree-shaken like .nav-item-active/.card-gradient/.sidebar-scrollable when no scanned file uses the class name); ::selection and caret-color are non-class selectors and are never tree-shaken this way. Re-ran the rendered-CSS proof with content broadened to include a real .prose-measure call site (the 11-01 tracer blog post) to prove the full triple -- prose-measure/::selection/caret-color -- survives; the acceptance-criteria bullets (which do not require this triple check, only the tabular-nums rule) all passed under the plan's literal script as written"

patterns-established:
  - "Guard tests for a targeted CSS-selector deletion assert both the deletion (toHaveLength(0)) and named sibling survival (toBeGreaterThan(0) x2), never a bare absence check"

requirements-completed: []

coverage:
  - id: D1
    description: "The dead [data-score] attribute selector removed from app/globals.css's shared tabular-numerals rule; the table-cell pair and .tabular-nums class survive byte-identical, still declaring font-variant-numeric: tabular-nums"
    requirement: "SURF-02"
    verification:
      - kind: unit
        ref: "npx vitest run --maxWorkers=2 (1231/1231 passing, no regression)"
        status: pass
      - kind: other
        ref: "Rendered-CSS proof: tailwindcss CLI compile of app/globals.css (content broadened to include a real .prose-measure call site) confirms zero [data-score] in source and generated output, the tabular-nums rule intact over td/th/.tabular-nums, and prose-measure/::selection/caret-color all still present"
        status: pass
    human_judgment: false
  - id: D2
    description: "__tests__/data-score-absence.test.ts stands up the SURF-02 guard (absence + two sibling-survival assertions + fail-loud-on-missing-path), observed red in both of its failure modes before committing"
    requirement: "SURF-02"
    verification:
      - kind: unit
        ref: "__tests__/data-score-absence.test.ts (4/4 tests passing); fail-first proof recorded verbatim below"
        status: pass
    human_judgment: false
  - id: D3
    description: ".planning/WINDOWS.md entry 23 records the stale app/(app)/design-system/_client.tsx:1801 prose, quoted verbatim, and routes it to Phase 12 ENF-03; that page itself is unedited"
    requirement: "SURF-02"
    verification:
      - kind: other
        ref: "grep -c 'data-score' \"app/(app)/design-system/_client.tsx\" unchanged at 1; .planning/WINDOWS.md entry 23 present and names ENF-03"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-09-21
status: complete
---

# Phase 11 Plan 04: Dead [data-score] Selector Deletion and SURF-02 Guard Summary

**Deleted the confirmed-dead `[data-score]` attribute selector from `app/globals.css`'s shared tabular-numerals rule in a single one-line diff, proved both surviving siblings and every earlier plan's rule intact via a rendered-CSS compile, and stood up an absence-plus-sibling-survival Vitest guard observed red in both of its failure modes before committing.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-21T23:13Z (continuing from 11-03's completion)
- **Completed:** 2026-09-21T23:24:36Z
- **Tasks:** 2 (both `type="auto"`, no checkpoints)
- **Files modified:** 3 (`app/globals.css`, `__tests__/data-score-absence.test.ts` created, `.planning/WINDOWS.md`)

## Accomplishments

- `app/globals.css`'s shared tabular-numerals rule narrowed from a three-item to a two-item selector list: `td, th, [data-score], .tabular-nums` -> `td, th, .tabular-nums`, single declaration (`font-variant-numeric: tabular-nums`) untouched
- `__tests__/data-score-absence.test.ts` created: absence assertion for `[data-score]`, two sibling-survival assertions (the `td, th,` pair and the `.tabular-nums` class), and the fail-loud-on-missing-path defensive test, all reusing the shared `sourceFiles`/`matchesIn` scan helpers
- Both of the guard's failure modes observed red before it shipped (see Fail-First Proofs below)
- `.planning/WINDOWS.md` entry 23 records the now-stale design-system doc-page sentence and routes it to Phase 12 ENF-03, without editing that page

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete the dead attribute selector from the shared tabular-numerals rule** - `c6d84102` (feat)
2. **Task 2: Stand up the SURF-02 absence-plus-survival guard and record the doc-page carry-forward** - `3340b550` (test)

**Plan metadata:** (this SUMMARY's own commit)

## Files Created/Modified

- `app/globals.css` - Removed the `[data-score],` line from the shared tabular-numerals rule; the table-cell pair and `.tabular-nums` class survive byte-identical
- `__tests__/data-score-absence.test.ts` - New SURF-02 guard: absence of `[data-score]`, survival of both siblings, fail-loud-on-missing-path
- `.planning/WINDOWS.md` - New entry 23 (kind `deviation`, phase 11) naming the stale design-system doc-page prose and routing it to Phase 12 ENF-03

## Before and After Selector List (verbatim)

**Before:**
```css
  /* Tabular numbers for scores, rankings, attendance, and other dynamic values */
  td, th,
  [data-score],
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
```

**After:**
```css
  /* Tabular numbers for scores, rankings, attendance, and other dynamic values */
  td, th,
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
```

Diff: exactly one removed line, confirmed by `git diff HEAD~1 -- app/globals.css | grep -E '^[+-]' | grep -vE '^[+-]{3}' | wc -l` = `1`.

## Fail-First Proofs (Task 2, recorded verbatim)

**Red mode 1 — reintroducing the deleted selector fails the absence assertion, naming the file and line:**
```
FAIL __tests__/data-score-absence.test.ts > data-score absence guard (SURF-02) > finds no [data-score] selector in app/globals.css
AssertionError: /Users/alexander.mayes/Code/personal/loot-list-plus/app/globals.css:364: [data-score],: expected [ { …(3) } ] to have a length of +0 but got 1
```

**Red mode 2 — deleting the whole rule block fails both survival assertions:**
```
FAIL __tests__/data-score-absence.test.ts > data-score absence guard (SURF-02) > the td, th, sibling selector survives the deletion
AssertionError: expected the td, th, selector pair to survive in app/globals.css: expected 0 to be greater than 0

FAIL __tests__/data-score-absence.test.ts > data-score absence guard (SURF-02) > the .tabular-nums sibling selector survives the deletion
AssertionError: expected the .tabular-nums class selector to survive in app/globals.css: expected 0 to be greater than 0
```

After each red-mode probe, `app/globals.css` was restored and reconfirmed byte-identical to the committed state via `git diff --stat app/globals.css` (empty output) before the guard was re-run green and the commit made.

## WINDOWS.md Entry Assigned

**Entry 23** (kind `deviation`, phase `11`, file `app/(app)/design-system/_client.tsx`, line `1801`, status `open`): quotes the stale sentence `"Applied globally to td, th, and [data-score]."` verbatim and routes it to Phase 12 ENF-03, whose own success criterion 3 already covers "shows no primitive that this milestone deleted" for this exact page. `grep -c 'data-score' "app/(app)/design-system/_client.tsx"` remained `1` throughout this plan, confirming the page was recorded, not edited.

## Measured 20-vs-19 Numerals-File Delta (restated, not reconciled)

11-01-SUMMARY.md recorded ".tabular-nums is hand-applied across 20 files, not 19" as stated by CONTEXT.md/RESEARCH.md/UI-SPEC. Live re-measurement this session (`grep -rln "tabular-nums" app components`) returns exactly 19 files excluding `app/globals.css` itself (the rule's definition site) and 20 files including it. Nothing in this plan depends on the count either way -- the deletion's own acceptance criteria assert the rule's *selectors* survive, not a specific file tally. Stated as a measured delta, not investigated further.

## Jittering Numeric Column Check (D-09 scope discipline)

No jittering or misaligned numeric column was noticed while reading `app/globals.css` or running the guard's fail-first proofs. Per D-09, this phase does not audit the app for numeric displays missing `.tabular-nums` coverage; had one surfaced, it would be named and routed forward here rather than fixed inline. None to report.

## Decisions Made

- Followed D-08 exactly: `[data-score]` deleted outright, never wired to a real element. No new DOM attribute, no new call site.
- Task 1's own `<verify><automated>` node script checks that `prose-measure`, `::selection`, and `caret-color` all appear in a Tailwind CLI compile scoped to `--content "app/layout.tsx"` alone. Live-running that exact script showed `::selection`/`caret-color` present (both are plain selectors, never tree-shaken) but `prose-measure` absent -- not because the deletion disturbed it, but because `.prose-measure` is a class-only `@layer components` rule and `app/layout.tsx` never uses that class name literally (11-01-SUMMARY.md's own Finding 3 already documented this exact tree-shaking mechanism for `.nav-item-active`/`.card-gradient`/`.sidebar-scrollable`). Re-ran the identical proof with `--content` broadened to also include the 11-01 tracer blog post (a real `.prose-measure` call site): all three survived, plus the tabular-nums rule minus `[data-score]`. This does not change any acceptance-criteria outcome -- the acceptance criteria list only requires the tabular-nums rendered-CSS proof, which passed unconditionally under both content scopes -- but it is recorded here since the plan's own verify script, as literally written, cannot pass its `prose-measure` check regardless of correctness. See Deviations below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in the plan's own verify tooling] Task 1's `<verify><automated>` `--content "app/layout.tsx"` scope cannot ever surface `.prose-measure` in the compiled output**
- **Found during:** Task 1, running the plan's literal `<verify><automated>` command
- **Issue:** The node script inside Task 1's verify command asserts `prose-measure`, `::selection`, and `caret-color` are all present in a Tailwind CLI compile scoped to `--content "app/layout.tsx"`. `.prose-measure` is a class-only rule inside `@layer components`; Tailwind's content-scan tree-shaking (documented live in 11-01-SUMMARY.md's Finding 3 for `.nav-item-active`/`.card-gradient`/`.sidebar-scrollable`) drops any such rule from the compiled output unless a scanned content file uses the class name literally. `app/layout.tsx` never does. `::selection`/`caret-color` are plain selectors (not gated by a class token) and always survive regardless of content scope, so the script's assumption that all three behave the same way under the same content scope does not hold.
- **Fix:** Ran the identical check with `--content` widened to include a real `.prose-measure` call site (the 11-01 tracer blog post, which already carries `className="prose-measure mx-auto"`). All three survived, alongside the tabular-nums rule with `[data-score]` removed. No source file was changed by this -- it is a verification-only adjustment, confirming the plan's actual intent (11-01/11-03's additions are undisturbed) rather than the plan's literal command text.
- **Files modified:** None (verification-only; no plan or source file was edited as part of this fix)
- **Verification:** `node -e "..."` script (same assertions as the plan's, run against the broadened-content compile) printed `ok`; separately, every acceptance-criteria bullet for Task 1 (which does not require the prose-measure/`::selection`/caret-color triple check, only the tabular-nums rendered-CSS proof) passed unconditionally under the plan's literal `--content "app/layout.tsx"` scope
- **Committed in:** Not a code change; documented here per Rule 1's auto-fix-and-track requirement since it affected how Task 1's `<verify>` step was actually run

---

**Total deviations:** 1 auto-fixed (1 bug in the plan's own verify script). **Impact:** None on shipped code -- `app/globals.css`'s diff is exactly the one intended line, confirmed by the diff-count acceptance criterion independent of this finding. The deviation only concerns how one verification command was interpreted, not what was built.

## Issues Encountered

None beyond the verify-script finding documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SURF-02's implementation is complete and guarded, but the requirement itself is **not yet marked complete** in REQUIREMENTS.md -- 11-05 also declares `SURF-02` in its frontmatter and has not yet produced a SUMMARY.md (shared-ID gate; `requirements.ready-ids` returned `blocked: ["SURF-02"]`, `ready: []` for this plan). 11-05 will complete the mark once its own SUMMARY lands.
- `app/globals.css` is now in its final state for this phase: `.prose-measure` (11-01), `::selection`/`caret-color`/universal scrollbar (11-03), and the narrowed tabular-numerals rule (this plan) all present and mutually undisturbed, confirmed by rendered-CSS compile.
- `.planning/WINDOWS.md` entry 23 is ready for whoever plans Phase 12 to pick up under ENF-03.
- Ready for 11-05: the matching after-capture, the named above-the-fold comparison, and the phase's four success criteria answered with evidence.

## Self-Check: PASSED

- `app/globals.css` contains no `[data-score]`: FOUND (grep -c returns 0)
- `app/globals.css` still declares `font-variant-numeric: tabular-nums` over `td, th,` and `.tabular-nums`: FOUND
- `__tests__/data-score-absence.test.ts` exists and all 4 tests pass: FOUND
- `.planning/WINDOWS.md` contains entry 23 naming `app/(app)/design-system/_client.tsx` and routing to `ENF-03`: FOUND
- `app/(app)/design-system/_client.tsx` still contains `data-score` (unedited): FOUND (count unchanged at 1)
- Commit `c6d84102` (Task 1): FOUND in `git log --oneline --all`
- Commit `3340b550` (Task 2): FOUND in `git log --oneline --all`
- `git diff --name-only HEAD~1` (Task 2's commit) lists exactly `.planning/WINDOWS.md` and `__tests__/data-score-absence.test.ts`: CONFIRMED
- Full suite: `npx vitest run --maxWorkers=2` -- 76 files / 1231 tests, all passing: CONFIRMED
- `npm run typecheck` exit 0, `npm run lint` 0 errors (397 pre-existing warnings, unchanged): CONFIRMED

---
*Phase: 11-reading-and-browser-surfaces*
*Completed: 2026-09-21*
