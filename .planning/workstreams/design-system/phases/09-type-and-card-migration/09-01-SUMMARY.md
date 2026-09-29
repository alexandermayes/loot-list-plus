---
phase: 09-type-and-card-migration
plan: 01
subsystem: ui
tags: [tailwind, typescript-compiler-api, codemod, design-tokens, vitest]

requires:
  - phase: 07-token-foundation
    provides: the pixel-named fontSize alias convention (text-11 through text-42) this plan's display aliases extend, and the sourceFiles/matchesIn guard-test primitives
provides:
  - Eight new Tailwind fontSize display aliases (28, 40, 44, 48, 56, 64, 72, 80) at exact pixel values with D-04 line-heights
  - scripts/codemods/text-sizes.mjs + text-size-map.json: a committed, idempotent, --dry-run-capable codemod mapping every arbitrary text-[Npx] literal onto its scale step
  - scripts/codemods/hand-rolled-cards.mjs + hand-rolled-card-pattern.json: a committed, idempotent, --dry-run-capable AST codemod rewriting hand-rolled card divs onto <Card>
affects: [09-02-batch-plan-checkpoint, 09-03-type-sweep, 09-05-card-primitive, 09-07-nested-variant]

actuals:
  tokens: 7907
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Codemods as committed, idempotent, --dry-run-first Node scripts under scripts/codemods/, following the workstream's committed-script-not-hand-typed-numbers convention"
    - "AST rewrite via ts.createSourceFile + ts.nullTransformationContext + ts.createPrinter (parse-mutate-print), deliberately avoiding ts.transform() per its documented JSX-transform limitation"

key-files:
  created:
    - scripts/codemods/text-sizes.mjs
    - scripts/codemods/text-size-map.json
    - scripts/codemods/hand-rolled-cards.mjs
    - scripts/codemods/hand-rolled-card-pattern.json
  modified:
    - tailwind.config.js

key-decisions:
  - "The type sweep's combined 932-site figure (CONTEXT.md's live inventory) is the sum of two separate scoped dry-runs, not a single `app`-only run: 851 sites / 89 files under app/, 81 sites / 11 files under components/. The plan's acceptance-criteria wording implied a single `app --dry-run` command would print 932; the actual split is named here rather than silently forcing one number."
  - "The card codemod treats bg-card as a synonym of bg-background-elevated (Claude's Discretion, resolved as proposed in the plan): the detection regex's surface-token alternation includes both, and bg-card is also a stripped token on rewrite since Card's own base class already supplies it."
  - "The card codemod's live dry-run (225 rewrites / 68 files, 6 named SKIPPED cn(...)-built classNames, 25 RADIUS DELTA sites, 29 lines / 18 files EXCLUDED) is authoritative per the plan's own must_haves backstop, superseding CONTEXT.md's 227/228/232 line-based estimates and RESEARCH.md's 24/19 radius re-measurements. See Deviations for the full reconciliation."

requirements-completed: [TYPE-03, PRIM-01]

coverage:
  - id: D1
    description: "tailwind.config.js gains eight display fontSize aliases (28/40/44/48/56/64/72/80) at exact pixel values with D-04 line-heights, with no `17` or `22` key and no source file referencing them yet"
    requirement: TYPE-03
    verification:
      - kind: unit
        ref: "__tests__/type-scale-floor.test.ts (19 tests, all passing, including the alias-pair and >=11px floor checks that automatically iterate the new keys)"
        status: pass
      - kind: other
        ref: "node -e assertions in the plan's Task 1 acceptance criteria (exact px, exact line-height, no 17/22 key) -- all printed ok"
        status: pass
    human_judgment: false
  - id: D2
    description: "scripts/codemods/text-sizes.mjs + text-size-map.json: idempotent, --dry-run-capable codemod covering all 22 live pixel values, refusing out-of-scope paths, writing nothing under app/ or components/ during this plan"
    requirement: TYPE-03
    verification:
      - kind: other
        ref: "node scripts/codemods/text-sizes.mjs app --dry-run (851/89 files) + components --dry-run (81/11 files) = 932/100 files, matching CONTEXT.md's live inventory; byte-identical repeat run verified via diff; idempotency verified end to end against a scratch file; out-of-scope path (tailwind.config.js) exits non-zero"
        status: pass
    human_judgment: false
  - id: D3
    description: "scripts/codemods/hand-rolled-cards.mjs + hand-rolled-card-pattern.json: TypeScript-compiler-API codemod handling plain-string and template-literal classNames (LootListContent.tsx:509's ternary confirmed rewritten, not skipped), stripping only D-07 surface classes, keeping border-border-strong, adding/extending the Card import, reporting SKIPPED for ambiguous shapes, idempotent, writes nothing under app/ or components/ during this plan"
    requirement: PRIM-01
    verification:
      - kind: other
        ref: "node scripts/codemods/hand-rolled-cards.mjs app --dry-run (200/65 files) + components --dry-run (25/3 files) = 225/68 files rewritten, 6 SKIPPED, 25 RADIUS DELTA, 29/18 EXCLUDED; idempotency verified end to end against a scratch copy of a real file; out-of-scope path (package.json) exits non-zero; components/ui/card.tsx never named in either report"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-09-19
status: complete
---

# Phase 09 Plan 01: Codemod Instruments and Display Aliases Summary

**Built the two committed codemods (text-sizes.mjs, hand-rolled-cards.mjs) this phase's batch sweeps run on, plus the eight Tailwind display fontSize aliases they map onto -- zero files under app/ or components/ touched.**

## Performance

- **Duration:** 55 min
- **Started:** 2026-09-19T18:12:00Z (approx, per STATE.md session start)
- **Completed:** 2026-09-19T19:08:05Z
- **Tasks:** 3
- **Files modified:** 5 (1 modified, 4 created)

## Accomplishments
- Extended `tailwind.config.js` `theme.extend.fontSize` with eight display aliases (`28`, `40`, `44`, `48`, `56`, `64`, `72`, `80`), each an exact-pixel literal tuple in the Phase 07 authoring style, with D-04 line-heights (1.2 through 48px, 1.02 from 56px up) and no `17`/`22` key
- Built `scripts/codemods/text-sizes.mjs` and its committed `text-size-map.json` (22 rows): an idempotent, `--dry-run`-capable regex codemod that rewrites `text-[Npx]` onto its scale alias, hard-errors on any unmapped pixel value, and refuses any path outside `app/`/`components/`
- Built `scripts/codemods/hand-rolled-cards.mjs` and its committed `hand-rolled-card-pattern.json`: a TypeScript-compiler-API (parse-mutate-print, no `ts.transform()`) codemod that rewrites hand-rolled card `<div>`s onto `<Card>`, correctly handling both plain-string and template-literal `className`s (confirmed against `LootListContent.tsx:509`'s ternary), stripping only D-07 surface classes, keeping `border-border-strong`, and adding/extending the `@/components/ui/card` import
- Verified both codemods are idempotent (a second dry-run or write-mode pass over an already-rewritten path reports zero) and byte-identical across repeat dry-runs

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the eight display fontSize aliases to tailwind.config.js** - `1d3b1309` (feat)
2. **Task 2: Build scripts/codemods/text-sizes.mjs and its committed mapping table** - `45626f74` (feat)
3. **Task 3: Build scripts/codemods/hand-rolled-cards.mjs on the TypeScript compiler API** - `6f029c25` (feat)

**Plan metadata:** _(committed at plan close, see final commit)_

## Files Created/Modified
- `tailwind.config.js` - Eight new display fontSize aliases (28/40/44/48/56/64/72/80), additive only
- `scripts/codemods/text-size-map.json` - 22-row pixel-value-to-alias mapping table (D-01 through D-04), the single source of truth the codemod reads
- `scripts/codemods/text-sizes.mjs` - Regex + committed-table codemod for the type sweep; `--dry-run`, scoped path arg, fixed-order per-file/per-line report
- `scripts/codemods/hand-rolled-card-pattern.json` - Single source of truth for the D-08 predicate (surface tokens including the `bg-card` synonym, radius prefix, border-token pattern, `scanExclusions`, composed detection regex)
- `scripts/codemods/hand-rolled-cards.mjs` - TypeScript-compiler-API codemod for the card sweep; `--dry-run`, scoped path arg, per-element report with REWRITTEN/SKIPPED/RADIUS DELTA/EXCLUDED sections

## Decisions Made
- **Combined-scope totals, not app-only:** The plan's Task 2 acceptance criteria read as if `node scripts/codemods/text-sizes.mjs app --dry-run` alone would print `932`. Live measurement: `app` alone is 851 sites / 89 files, `components` alone is 81 sites / 11 files; the two together equal 932 / 100 files, matching CONTEXT.md's live inventory exactly. Documented rather than forced to a single number.
- **`bg-card` treated as a `bg-background-elevated` synonym** in both the detection regex and the token-stripping list, per the plan's Claude's-Discretion resolution -- confirmed correct against the two `LootListContent.tsx` template-literal sites (`:509`, `:596`) which use `bg-card` and are rewritten, not skipped.
- **Codemod's own dry-run is authoritative for the card sweep's counts**, per the plan's explicit must_haves backstop (the "authoritative list ... is whatever hand-rolled-cards.mjs --dry-run reports live, not the stale figures"). See Deviations for the full reconciliation against CONTEXT.md/RESEARCH.md's earlier estimates.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Multi-line `cn(...)`-built classNames were silently dropped instead of reported SKIPPED**
- **Found during:** Task 3, verifying the card codemod's dry-run total against a raw line-regex baseline
- **Issue:** The initial `evaluateElement()` implementation tested the "ambiguous className shape" fallback (function-call-built classNames like `cn(...)`) against only the single source line the JSX tag itself starts on. Six real sites (`components/ui/dropdown-menu.tsx:58,75`, `radio-group.tsx:28`, `segmented-control.tsx:33`, `empty-state.tsx:77`, `error-state.tsx:67`) have their `cn(...)` call's surface-matching string argument several lines below the tag's own opening line, so the single-line check never found the match and these sites were silently excluded from both REWRITTEN and SKIPPED -- violating the spec's "never rewritten, never silently dropped" requirement.
- **Fix:** Changed the ambiguous-shape check to test the full `className` attribute initializer's text (`classAttr.initializer.getText(sourceFile)`, which spans however many lines the expression covers) rather than just the tag's start line.
- **Files modified:** `scripts/codemods/hand-rolled-cards.mjs`
- **Verification:** Re-ran the dry-run against each of the six files individually; all six now report `SKIPPED (className built by a non-literal expression)` at the correct line. Re-ran the full `app`+`components` dry-run: total accounted-for sites (225 rewritten + 6 skipped + 1 correctly-excluded false positive, see below) now reconciles exactly against the 232-site raw-regex baseline.
- **Committed in:** `6f029c25` (part of Task 3's commit; found and fixed before committing)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for correctness -- without the fix, six genuine hand-rolled-card sites would have vanished from the evidence trail with no trace. No scope creep; fixed within Task 3 before its commit.

## Issues Encountered

**Reconciling the card codemod's live counts against three prior estimates (CONTEXT.md, RESEARCH.md, and the plan's own inline figures).** The plan's must_haves explicitly anticipate this and require the discrepancy to be *named*, not resolved by picking one of the four numbers. Recording the full reconciliation here for the 09-02 checkpoint:

| Measure | This plan's live dry-run | Prior figures | Reconciliation |
|---|---|---|---|
| Rewrite total | **225 sites / 68 files** | CONTEXT.md/RESEARCH.md: 227-232 sites / 73-74 files (raw line-substring scans) | A raw line-based regex scan (same detection predicate, applied to whole lines rather than AST-scoped `className` attributes) finds 232 matches. The gap to 225 is fully accounted for: **6** sites are `cn(...)`-built classNames the AST codemod correctly reports as `SKIPPED` (matched, but not safely rewritable without a human decision on how `cn()` composition should look post-migration) rather than force-rewritten; **1** site (`app/components/StyledSelect.tsx:14`) is a plain JS string variable (`const baseClasses = '...'`) that is never used as a literal `className` value at its JSX call site (the `<select>` at line 24 builds its class from three interpolated variables with no static text) -- the raw substring scan counts it because the three tokens co-occur in the file text, but it is not a genuine hand-rolled-card `className` site by any reasonable reading of D-08. 225 + 6 + 1 = 232.
| RADIUS DELTA | **25 sites** | CONTEXT.md D-06: 13; RESEARCH.md re-measurements: 24 (order-independent) / 19 (exact-order) | None of the four numbers match exactly. This plan's 25 counts `rounded-lg` occurrences only among the 225 *rewritten* sites (by construction, since the flag is computed from the same token analysis that produces the rewrite). Two of the six SKIPPED `cn(...)` sites (`dropdown-menu.tsx:58,75`, both drawing the same shared class string) also carry `rounded-lg` and are not counted here since they are not rewritten -- including them would raise the figure to 27. Per the plan's must_haves, this codemod's dry-run is the authority; the 09-02 checkpoint should present 25 (or 27 if the two skipped-but-would-carry sites are folded in) rather than any of CONTEXT's 13 or RESEARCH's 24/19.
| EXCLUDED (no border token) | **29 lines / 18 files** | CONTEXT.md D-08: "roughly 29 lines" | Matches exactly.

None of these deltas required a plan change or a checkpoint decision at this stage -- Task 3's acceptance criteria explicitly anticipate exactly this kind of discrepancy and defer the reconciliation decision to the 09-02 batch-plan checkpoint, which is the correct place to present these numbers to the user.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both codemods exist, are idempotent, dry-run cleanly over the full `app`/`components` scope, and produce fixed-order reports suitable for pasting into the 09-02 checkpoint and the eventual `09-EVIDENCE.md`.
- The eight display aliases are live in `tailwind.config.js` with zero rendered pixel change (no source file references them yet).
- 09-02 (batch-plan checkpoint) can now present: the type sweep's 932-site/100-file inventory (851 app + 81 components) and its 49 display-alias sites; the card sweep's 225-rewrite/68-file inventory, 6 named SKIPPED sites, the 25-site RADIUS DELTA (with the 13/24/19/25/27 discrepancy named per above), and the 29-line/18-file EXCLUDED inventory -- all computed by the committed scripts in this plan, not hand-typed.
- No blockers. Zero files under `app/` or `components/` were changed by this plan, satisfying the scope-discipline constraint ahead of 09-02's blocking gate.

## Self-Check: PASSED

All created files confirmed present on disk; all four task/summary commit hashes (`1d3b1309`, `45626f74`, `6f029c25`, `f59ac6e7`) confirmed present in `git log`.

---
*Phase: 09-type-and-card-migration*
*Completed: 2026-09-19*
