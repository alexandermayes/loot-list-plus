---
phase: 04-discovery-lists-and-score-split
plan: 04
subsystem: domain
tags: [pure-functions, vitest, need-defaults, class-spec, gate-test]

requires:
  - phase: 04-discovery-lists-and-score-split
    provides: "04-03: budgetForPicks and NEED_BUDGET_POINTS, eligibleNeedsFor, the 23-pair class-specs fixture"
provides:
  - "domain/loot/need-defaults.ts: NEED_DEFAULTS (18 frozen five-key lists), SPECS_WITHOUT_DEFAULT (5 specs), defaultNeedsFor, matchesSpecDefault"
  - "The D-09 gate test: five distinct current keys, within 10 points, eligible for the spec, every seeded pair covered once"
affects: [04-02, 04-11, 04-20, 04-19]

actuals:
  tokens: 4000
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Lookup tables keyed by a joined string in a Map, never an object indexed by input"
    - "A gap in coverage is a visible list (SPECS_WITHOUT_DEFAULT) that a test reconciles against the seeded fixture"

key-files:
  created:
    - domain/loot/need-defaults.ts
    - domain/loot/__tests__/need-defaults.test.ts
  modified: []

key-decisions:
  - "Entries are written as object literals passed through a freezing helper, so each entry and its needs tuple are frozen and the plan's literal-count acceptance check holds"
  - "matchesSpecDefault compares by position and length, so a reordered list, a list with an empty position and a list of the wrong length are all edits"
  - "The lists were transcribed exactly as the plan gave them; none failed eligibility, so no conflict is raised for the 04-02 review"

patterns-established:
  - "Owner-reviewed data file plus a gate test that fails the build for any entry the server would refuse"

requirements-completed: []  # DISC-04 stays open: sibling plans declare it and have no SUMMARY yet (ready-ids returned 0 of 1)

coverage:
  - id: D1
    description: "18 frozen default lists, one per Forever spec row, each five distinct current keys, within the 10-point budget and eligible for its class and spec"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/need-defaults.test.ts#NEED_DEFAULTS gate (D-09, D-31)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every seeded (class, spec) pair has a default or is in SPECS_WITHOUT_DEFAULT, never both; the five Death Knight and Monk specs are the listed gaps"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/need-defaults.test.ts#covers every seeded (class, spec) pair exactly once"
        status: pass
    human_judgment: false
  - id: D3
    description: "matchesSpecDefault is true only for the five default keys in default order; defaultNeedsFor returns null for gaps, null or unknown names and prototype names, and the same frozen array every call"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/need-defaults.test.ts#matchesSpecDefault (D-11, DISC-04 adjacency)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The 18 lists are the right starting needs for each spec, in particular Enhancement Shaman (two-hand Strength, pending the Forever Windfury rework) and Feral Druid (cat, agility)"
    verification: []
    human_judgment: true
    rationale: "D-09 is an owner decision made at the 04-02 stop; the gate proves the lists are usable and within budget, not that they are the lists the owner wants"

duration: 4min
completed: 2026-11-10
status: complete
---

# Phase 4 Plan 04: Spec Default Lists Summary

**Eighteen frozen five-key Discovery default lists (one per Forever spec row) with a build-failing gate for keys, 10-point budget and spec eligibility, plus matchesSpecDefault for the picker's "Looks right" versus "Save my 5" choice**

## Performance

- **Duration:** 4 min
- **Started:** 2026-11-10T20:43Z
- **Completed:** 2026-11-10T20:47Z
- **Tasks:** 2 (the tracer and one auto task, both TDD)
- **Files modified:** 2 (both created)

## Accomplishments

- `NEED_DEFAULTS` holds the 18 lists exactly as the plan transcribed them, position 1 first, each entry and its tuple frozen. Shadow Priest costs 10 with a ring in place of the wand (D-31, F7).
- `SPECS_WITHOUT_DEFAULT` lists the five Death Knight and Monk specs, and the gate reconciles both lists against the 23-pair fixture so a spec in neither (or both) fails the build.
- `defaultNeedsFor` reads a Map keyed by a joined string, so `'__proto__'`, `'constructor'` and `'toString'` answer null; it returns the same frozen array each call.
- `matchesSpecDefault` is true only when all five positions equal the default keys in order.
- The tracer was re-run end to end before Task 2 (77 tests, acceptance greps, typecheck and eslint) and passed, so expansion went ahead without a checkpoint.

## Task Commits

1. **Task 1 (tracer) RED:** `d2c906d6` test(04-04): add failing gate test for the spec default lists
2. **Task 1 (tracer) GREEN:** `1542c58d` feat(04-04): add the 18 frozen spec default lists and their gate
3. **Task 2 RED:** `140651b4` test(04-04): add failing test for matchesSpecDefault and the empty edges
4. **Task 2 GREEN:** `1d2975bb` feat(04-04): add matchesSpecDefault for the Looks right button

## Verification

- `npx vitest run domain/loot/__tests__/need-defaults.test.ts`: 88 passed
- `npx vitest run domain/loot`: 30 files, 590 passed
- `npm run typecheck`: clean
- `npm run lint`: 0 errors; 375 warnings, the same count before and after this plan (none in the new files)
- Acceptance greps: 23 `className: '` literals, `SPECS_WITHOUT_DEFAULT` 3 times, `eligibleNeedsFor(` and `NEED_BUDGET_POINTS` present in the test, `export function matchesSpecDefault` once, `Object.isFrozen` 3 times, no em or en dashes in either file

## Deviations from Plan

None. The plan executed as written. One implementation detail: the first draft used a `defaultFor('Class', 'Spec', [...])` helper, which produced only 5 `className: '` matches against the plan's acceptance check of 23. It was rewritten to object literals through a freezing helper before the first commit, so no commit carries the earlier form.

## For the 04-02 owner review

- All 18 lists passed the eligibility matrix from 04-03 as written, so there is no conflict to report and no eligibility rule was loosened.
- Called out for the D-09 sign-off: Enhancement Shaman (two-hand Strength, pending the Forever Windfury rework) and Feral Druid (cat, agility). Both carry a comment in the file.
- Shipping note: this file belongs to PR 2 and must not merge before 04-02-SUMMARY.md records 'D-09 spec defaults confirmed'.

## Known Stubs

None.

## Threat Flags

None. The only boundary is character class and spec names into `defaultNeedsFor`, covered by T-04-04-01 (Map lookup, prototype names tested).

## Self-Check: PASSED

- FOUND: domain/loot/need-defaults.ts
- FOUND: domain/loot/__tests__/need-defaults.test.ts
- FOUND commits: d2c906d6, 1542c58d, 140651b4, 1d2975bb
