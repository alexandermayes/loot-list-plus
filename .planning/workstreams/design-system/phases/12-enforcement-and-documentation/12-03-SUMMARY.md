---
phase: 12-enforcement-and-documentation
plan: 03
subsystem: design-system
tags: [design-tokens, markdown-parsing, vitest, contrast, tailwind]

requires:
  - phase: 12-enforcement-and-documentation
    provides: "Plan 02's frontmatter-layer DESIGN.md, rgbToHex, design-md.ts parser, and the frontmatter parity guard"
provides:
  - "DESIGN.md's complete body: all eight canonical sections (Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts), each guard tested against source"
  - "The complete 45-token colour table for both themes, the 29-step type table, the 11-key radius table, and a 29-row guarded contrast record"
  - "parseTokenAlphas in contrast.ts, sharing parseTokens's block-extraction helper"
  - "sectionBody and parseTable in design-md.ts, for parsing DESIGN.md's body sections and tables"
  - "The body-layer parity guard: both themes, alpha, typography, shapes, the contrast record, section order, token/class fabrication, the em-dash prohibition, and the boxShadow/transitionDuration tables"
affects: [12-04, 12-05, 12-06, 12-07]

actuals:
  tokens: 9782
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Body-layer guard as a second, independent parity layer on top of 12-02's frontmatter-layer guard: DESIGN.md's body carries the complete 45-token/29-step/11-radius coverage for both themes, each recomputed from source at test time"
    - "sectionBody/parseTable as a minimal, dependency-free markdown-subset reader, mirroring design-md.ts's existing no-npm-dependency YAML-subset parser philosophy"
    - "Contrast figures live in one guarded table (the Contrast record); prose refers to rows by name, never restates a number"

key-files:
  created: []
  modified:
    - DESIGN.md
    - __tests__/design-tokens/contrast.ts
    - __tests__/design-tokens/design-md.ts
    - __tests__/design-tokens/design-md-parity.test.ts

key-decisions:
  - "Card's base radius is documented as rounded-xl at 16px, not the 12px 09-EVIDENCE.md's prose claims -- this plan's own carry-forward table names 09-EVIDENCE.md's rounded-xl/rounded-lg pixel values as measured against Tailwind's own defaults, not this project's tailwind.config.js (which sets lg to 12px and xl to 16px). Every radius in DESIGN.md was taken from the live, guarded Shapes table, never from that prose."
  - "The Colors table's Alpha column is asserted separately from its Light/Dark hex cells (parseTokenAlphas), because parseTokens's own regex silently drops a token's alpha suffix -- documenting only the hex would have made --accent-subtle look identical to --accent in both themes and would have passed the guard while misinforming every reader."
  - "--radius (12px) and Card's base radius (rounded-xl, 16px) are two different steps that moved apart when Card migrated off rounded-lg in Phase 09; DESIGN.md states this explicitly rather than implying they still track each other."
  - "The section-order guard's swapped-heading perturbation broke table lookups for every downstream section (a collection-time throw, not a single assertion diff) -- accepted as the red observation for that perturbation, since it demonstrates the guard fails loudly on structural drift, which is the property being proven."

patterns-established:
  - "Two-layer DESIGN.md guard: a frontmatter layer (12-02, light theme only, spec-shaped) and a body layer (12-03, both themes, complete coverage), each independently observed red before being accepted green."

requirements-completed: [ENF-01]

coverage:
  - id: D1
    description: "DESIGN.md carries the eight canonical section headings exactly and in order: Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts"
    requirement: "ENF-01"
    verification:
      - kind: unit
        ref: "__tests__/design-tokens/design-md-parity.test.ts#DESIGN.md structural guard (ENF-01, 12-03 Task 2) > the file's ## headings are exactly the eight canonical headings, in order"
        status: pass
    human_judgment: false
  - id: D2
    description: "The Colors table lists all 45 colour custom properties once each, with light and dark hex equal to the :root and .dark conversions and the declared alpha for --accent-subtle (0.15 light, 0.2 dark)"
    requirement: "ENF-01"
    verification:
      - kind: unit
        ref: "__tests__/design-tokens/design-md-parity.test.ts#DESIGN.md body-layer guard (ENF-01, 12-03 Task 1) > the Colors table has exactly 45 data rows... and every Colors row Light/Dark hex equals rgbToHex(hslToRgb())..."
        status: pass
    human_judgment: false
  - id: D3
    description: "The Typography table lists all 29 fontSize keys equal to their tuples, and names Poppins, Friz Quadrata and Figtree, each asserted against app/layout.tsx's next/font bindings, including the .tabular-nums var(--font-tabular) wrinkle"
    requirement: "ENF-01"
    verification:
      - kind: unit
        ref: "__tests__/design-tokens/design-md-parity.test.ts#DESIGN.md body-layer guard (ENF-01, 12-03 Task 1) > the Typography table has exactly 29 rows... and Typography names Poppins, Friz Quadrata and Figtree..."
        status: pass
    human_judgment: false
  - id: D4
    description: "The Shapes table lists all 11 borderRadius keys with their values and records --radius as 12px, equal to both app/globals.css and the lg radius"
    requirement: "ENF-01"
    verification:
      - kind: unit
        ref: "__tests__/design-tokens/design-md-parity.test.ts#DESIGN.md body-layer guard (ENF-01, 12-03 Task 1) > the Shapes table has exactly 11 rows matching borderRadius both directions, and --radius equals the lg value"
        status: pass
    human_judgment: false
  - id: D5
    description: "Every ratio in the Colors section's contrast record equals contrast.ts's ratio() recomputed from the current tokens to three decimals"
    requirement: "ENF-01"
    verification:
      - kind: unit
        ref: "__tests__/design-tokens/design-md-parity.test.ts#DESIGN.md body-layer guard (ENF-01, 12-03 Task 1) > the Contrast record has 29 rows, each Ratio equal to ratio()..."
        status: pass
    human_judgment: false
  - id: D6
    description: "Every custom-property name and every text- or rounded- class DESIGN.md mentions exists in the source files (no fabricated or deleted token)"
    requirement: "ENF-01"
    verification:
      - kind: unit
        ref: "__tests__/design-tokens/design-md-parity.test.ts#DESIGN.md structural guard (ENF-01, 12-03 Task 2) > every named custom property, text- size class and rounded- class exists in source..."
        status: pass
    human_judgment: false
  - id: D7
    description: "Elevation & Depth tables the three boxShadow tokens and Components' Motion subsection tables the three transitionDuration tokens, each equal to tailwind.config.js"
    requirement: "ENF-01"
    verification:
      - kind: unit
        ref: "__tests__/design-tokens/design-md-parity.test.ts#DESIGN.md structural guard (ENF-01, 12-03 Task 2) > the boxShadow table... / the Motion table..."
        status: pass
    human_judgment: false
  - id: D8
    description: "The body-layer guard was observed red first by perturbing one .dark token, one fontSize tuple, and one section-heading order, each failure recorded verbatim below, before being accepted green"
    requirement: "ENF-01"
    verification:
      - kind: unit
        ref: "manual perturb-run-restore cycle, verbatim failures recorded below; git diff --stat confirmed empty after each restore"
        status: pass
    human_judgment: false
  - id: D9
    description: "DESIGN.md contains no em dash"
    requirement: "ENF-01"
    verification:
      - kind: unit
        ref: "__tests__/design-tokens/design-md-parity.test.ts#DESIGN.md structural guard (ENF-01, 12-03 Task 2) > contains no em dash character (U+2014)"
        status: pass
    human_judgment: false
  - id: D10
    description: "The prose in Layout, Elevation & Depth, Components and Do's and Don'ts describes shipped behaviour accurately (Card variants, focus ring, Modal, status fills, skeleton coupling, purple decision, sanctioned exceptions)"
    verification: []
    human_judgment: true
    rationale: "The guard covers every table and every named token, class and ratio in the file; whether the surrounding prose sentences accurately describe shipped UI behaviour (not just source values) is a reading judgment the plan itself designates as a UAT backstop, not something a unit test can certify."

duration: 45min
completed: 2026-09-22
status: complete
---

# Phase 12 Plan 03: DESIGN.md Body (Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts) and the Body-Layer Guard

**DESIGN.md now carries all eight canonical sections with the complete 45-token colour table for both themes, the 29-step type table, the 11-key radius table and a 29-row guarded contrast record, checked against `app/globals.css`, `tailwind.config.js` and `app/layout.tsx` by a body-layer guard observed red on three separate perturbations before being accepted green.**

## Performance

- **Duration:** 45 min
- **Completed:** 2026-09-22
- **Tasks:** 2 of 2 complete
- **Files modified:** 4 (DESIGN.md, `contrast.ts`, `design-md.ts`, `design-md-parity.test.ts`)

## Accomplishments

- Added `parseTokenAlphas` to `contrast.ts`, sharing `parseTokens`'s brace-matching block extraction through a new internal `extractBlock` helper; `parseTokens` itself stayed byte-identical (its own 31-test suite, `token-contrast.test.ts`, is unchanged and still green).
- Added `sectionBody` and `parseTable` to `design-md.ts`, a dependency-free reader for DESIGN.md's markdown body sections and GFM tables, matching the file's existing no-npm-dependency philosophy.
- Wrote DESIGN.md's `## Colors` section: a 45-row table (all colour custom properties, both themes, alpha column) and a `### Contrast record` subsection (29 rows) covering every carried-forward figure named in this plan's own carry-forward table.
- Wrote `## Typography` (29 rows, all `fontSize` keys) and `## Shapes` (11 rows, all `borderRadius` keys), each naming the Poppins/Friz Quadrata/Figtree font bindings and the `--radius` vs `rounded-lg`/`rounded-xl` relationship.
- Wrote the four remaining sections -- `## Layout`, `## Elevation & Depth`, `## Components`, `## Do's and Don'ts` -- completing the canonical eight-section order.
- Extended the parity guard in two passes: a body-layer guard (both themes, alpha, typography, shapes, the contrast record) in Task 1, then a structural guard (section order, token/class fabrication, em-dash prohibition, boxShadow/transitionDuration tables) in Task 2.
- Observed the guard red on three separate perturbations (a `.dark` `--border` drift, a `text-15` size drift, and a swapped section-heading order), each restored via `git checkout --` before the corresponding commit, verbatim output recorded below.
- Corrected a stale figure from `09-EVIDENCE.md`'s prose: Card's base radius is `rounded-xl` at **16px** (not the 12px that document's prose states, which measured against Tailwind's own defaults rather than this project's `tailwind.config.js`), taken from the live, guarded Shapes table instead.

## Task Commits

1. **Task 1: Colors, Typography and Shapes body tables for both themes, the guarded contrast record, and the body-layer guard observed red first** - `117e0c93` (feat)
2. **Task 2: Layout, Elevation and Depth, Components, Do's and Don'ts with the routed carry-forwards, plus section-order, fabrication and em-dash assertions** - `bb0ab772` (feat)

## Files Created/Modified

- `DESIGN.md` - Complete body: all eight canonical sections, 45-token colour table (both themes), 29-step type table, 11-key radius table, 29-row contrast record
- `__tests__/design-tokens/contrast.ts` - Added `parseTokenAlphas`, sharing `parseTokens`'s block extraction via a new `extractBlock` helper
- `__tests__/design-tokens/design-md.ts` - Added `sectionBody` and `parseTable`
- `__tests__/design-tokens/design-md-parity.test.ts` - Added the body-layer guard (Task 1, 6 tests) and the structural guard (Task 2, 5 tests); 22 tests total in this file, 53 combined with `token-contrast.test.ts`

## Verbatim Red Observations

### Red observation 1 (Task 1): `.dark`'s `--border` lightness perturbed by one point (`18%` to `19%`)

```
FAIL __tests__/design-tokens/design-md-parity.test.ts > DESIGN.md body-layer guard (ENF-01, 12-03 Task 1) > every Colors row Light/Dark hex equals rgbToHex(hslToRgb()) of :root/.dark, and Alpha matches parseTokenAlphas exactly
AssertionError: Colors table drifted from app/globals.css:
--border: Dark documented="#2e2e2e" computed="#303030": expected [ Array(1) ] to have a length of +0 but got 1

FAIL __tests__/design-tokens/design-md-parity.test.ts > DESIGN.md body-layer guard (ENF-01, 12-03 Task 1) > the Contrast record has 29 rows, each Ratio equal to ratio() recomputed from the current tokens to three decimals
AssertionError: Contrast record drifted from source:
border (dark): documented="1.213" computed="1.258": expected [ Array(1) ] to have a length of +0 but got 1
```

Restored with `git checkout -- app/globals.css`; `git diff --stat -- app/globals.css` was empty afterward.

### Red observation 2 (Task 1): the `15` fontSize tuple's size perturbed (`15px` to `17px`)

```
FAIL __tests__/design-tokens/design-md-parity.test.ts > DESIGN.md frontmatter parity guard (ENF-01) > typography.scale keys equal the 19 numeric-only fontSize keys, each value equal to its pixel size
AssertionError: typography.scale value(s) drifted from fontSize:
15: documented="15px" source="17px": expected [ Array(1) ] to have a length of +0 but got 1

FAIL __tests__/design-tokens/design-md-parity.test.ts > DESIGN.md body-layer guard (ENF-01, 12-03 Task 1) > the Typography table has exactly 29 rows, its class set equals text- plus every fontSize key, and each size/line-height equals its tuple
AssertionError: Typography table drifted from fontSize:
text-15: size documented="15px" source="17px": expected [ Array(1) ] to have a length of +0 but got 1
```

Both the pre-existing frontmatter-layer guard (12-02) and the new body-layer guard caught the same drift independently. Restored with `git checkout -- tailwind.config.js`; `git diff --stat -- tailwind.config.js` was empty afterward.

### Red observation 3 (Task 2): the `## Layout` and `## Shapes` headings swapped

```
FAIL __tests__/design-tokens/design-md-parity.test.ts [ __tests__/design-tokens/design-md-parity.test.ts ]
Error: parseTable: no table found with first header cell "Class"
 ❯ parseTable __tests__/design-tokens/design-md.ts:107:11
 ❯ __tests__/design-tokens/design-md-parity.test.ts:313:21

Test Files  1 failed (1)
     Tests  no tests
```

Swapping the two headings broke every downstream section boundary the body-layer guard's module-scope `sectionBody`/`parseTable` calls depend on, so the entire suite failed to collect rather than producing a single assertion diff -- a stronger, fail-loud signal than the isolated heading-order test alone would have given, and accepted as the red observation for this perturbation since it demonstrates the guard cannot silently tolerate the document's structure drifting. Restored by copying back the pre-perturbation file (`cp /tmp/DESIGN.md.bak DESIGN.md`); `git diff --stat -- DESIGN.md` afterward showed only this plan's own additions (110 insertions, matching the state before the perturbation and after).

## Carry-Forward Checklist

Each row of this plan's carry-forward table, and where it now lives in DESIGN.md:

| Fact | DESIGN.md location |
|---|---|
| Dark `--border` vs elevated 1.062 before, 1.213 after; dark page vs elevated 1.086 before, 1.223 after | `## Elevation & Depth` (before values, cited as history) and the Contrast record's `border`/`page` dark rows (after values, guarded) |
| OI-3: dark `--destructive`, `--error`, `--horde` vs elevated 4.910 before, 4.360 after | Contrast record's `destructive`/`error`/`horde` rows and `## Components`' status paragraph |
| Light `--warning` 1.983, `--success` 2.298, `--standby` 3.003 as fills, not text | Contrast record's `warning`/`success`/`standby` light rows and `## Components`' status paragraph |
| OI-2: light `--accent-text` 4.613 on card, 4.344 on page, 4.066 on sidebar | Contrast record's `accent text`/`accent text vs page`/`accent text vs sidebar` rows and `## Do's and Don'ts`' final rule |
| Light `--ring` 2.913 vs page, 2.726 vs modal surface, 3.093 vs card; dark clears all three | Contrast record's six `focus ring` rows and `## Components`' focus-ring paragraph |
| Eight display steps, Card base radius, the `nested` contract | `## Typography` table (`text-28` through `text-80`) and `## Components`' Card paragraph |
| `.prose-measure` at 70ch; `::selection`/caret/scrollbars | `## Layout` (prose-measure) and `## Elevation & Depth` (SURF-01 paragraph) |
| Figtree on `.tabular-nums` only; `td`/`th` get alignment but not the face (WINDOWS 32) | `## Typography`'s font-binding paragraph |
| Skeleton counts coupled to their layouts | `## Components`' skeleton paragraph |

## Decisions Made

See `key-decisions` in the frontmatter. The most consequential: Card's base radius is documented as `rounded-xl` at **16px**, correcting `09-EVIDENCE.md`'s prose (which stated 12px, measured against Tailwind's own unmodified defaults rather than this project's `tailwind.config.js`, where `lg` is 12px and `xl` is 16px). This plan's own carry-forward table flagged this discrepancy explicitly and instructed taking every radius from the live, guarded Shapes table -- followed exactly, and independently re-verified live against `tailwind.config.js` before writing.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' `<action>` and `<acceptance_criteria>` were followed in full; no auto-fix, blocker, or architectural deviation arose.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ENF-01's "matches the shipped tokens exactly" now holds for the complete document: frontmatter (12-02) and body (12-03), both themes, every table, checked against `app/globals.css`, `tailwind.config.js` and `app/layout.tsx` on every future commit.
- Every fact earlier phases (07, 08, 09, 11) routed to Phase 12's DESIGN.md by name is recorded and, where numeric, guarded by the Contrast record.
- No file outside `DESIGN.md` and `__tests__/design-tokens/` was touched; `app/globals.css`, `tailwind.config.js`, `app/layout.tsx`, `package.json` and `package-lock.json` are all unmodified (verified by `git diff --stat` against each, all empty).
- 12-04 (the docs page) and 12-05 (the exception census, which carries a second blocking gate) can now proceed within this wave; 12-04's live examples can point readers to this document with no remaining sections missing.

## Self-Check: PASSED

- `DESIGN.md` has all eight canonical `## ` headings in order (Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts) -- FOUND (`grep -n "^## " DESIGN.md`)
- Colors table 45 data rows, Contrast record 29 rows, Typography table 29 rows, Shapes table 11 rows -- FOUND (counted programmatically, matches must_haves exactly)
- `grep -c "first:border-t-0" DESIGN.md` = 1, `grep -c "9940ec" DESIGN.md` = 1, `grep -c "70ch" DESIGN.md` = 1 -- FOUND
- No em dash (`—`) anywhere in DESIGN.md -- FOUND (0 occurrences)
- Commit `117e0c93` (Task 1) -- FOUND in `git log --oneline`
- Commit `bb0ab772` (Task 2) -- FOUND in `git log --oneline`
- `npx vitest run __tests__/design-tokens/design-md-parity.test.ts` -- 22/22 tests pass
- `npx vitest run __tests__/token-contrast.test.ts` -- 31/31 tests pass (the `parseTokens` refactor changed no behaviour)
- `npm test -- --maxWorkers=2` (full suite) -- 82 files, 1367 tests, all pass (1356 before this plan, +11 new)
- `npm run lint` -- 0 errors (397 pre-existing warnings, unchanged count from 12-02)
- `npm run typecheck` -- exits 0
- `git diff --stat -- app/globals.css tailwind.config.js app/layout.tsx package.json package-lock.json` -- empty (no source, config or dependency changed)
- `git diff "$(git log --format=%H --grep='(12-03)' | tail -1)~1" -- app/globals.css tailwind.config.js app/layout.tsx` -- empty (anchored to the parent of this plan's first commit, per the plan's own acceptance criterion)

---
*Phase: 12-enforcement-and-documentation*
*Plan: 03*
*Completed: 2026-09-22*
