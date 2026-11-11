---
phase: 04-discovery-lists-and-score-split
plan: 08
subsystem: api
tags: [submit-route, need-budget, eligibility, copy-caps, vitest]

requires:
  - phase: 04-discovery-lists-and-score-split
    provides: "04-02 deploy record (the database half of the D-22 hold is dropped), 04-03 checkNeedBudget, isNeedEligible and the refusal sentences"
provides:
  - "domain/loot/need-list-rules.ts: checkNeedList(rows, character) returning the budget result and the ineligible rows"
  - "POST /api/loot-submissions/submit refuses over-budget (NEED_BUDGET_EXCEEDED) and ineligible (NEED_NOT_ELIGIBLE) need lists with 422 before any write"
  - "One copy-cap line per need key, however many Discovery tiers it is fanned out over"
  - "The D-22 hold module and its test deleted"
affects: [04-09, 04-11, 04-19, 04-20]

actuals:
  tokens: 6500
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "The submit route and the picker share one set of pure rules and the same refusal words"
    - "Need rows read through the same GH #357 checked rows as the bracket rules"

key-files:
  created:
    - domain/loot/need-list-rules.ts
    - domain/loot/__tests__/need-list-rules.test.ts
  modified:
    - app/api/loot-submissions/submit/route.ts
    - app/api/loot-submissions/submit/__tests__/route.test.ts
    - lib/loot/__tests__/need-reader-inventory.test.ts
  deleted:
    - domain/loot/need-ranking-hold.ts
    - domain/loot/__tests__/need-ranking-hold.test.ts

key-decisions:
  - "The hold removal and the budget check shipped in one commit (D-08), so no commit can promote a need list without the budget and eligibility checks in front of it"
  - "Eligibility refusal uses its own code NEED_NOT_ELIGIBLE with 422, not the prio-violation shape (400), so the picker can tell the two refusals apart"
  - "The budget refusal runs before the eligibility refusal, so a list that fails both reports the budget first"
  - "Budget and eligibility read the GH #357 checked rows, so a need in a turned-off tier never blocks a raider who cannot see it"
  - "Need copy violations are collapsed by bracket, rule and detail; item violations are produced by the same call over item rows only, so they are unchanged"

patterns-established:
  - "Need fixtures in route tests are built from NEED_DEFINITIONS (findNeedDefinition, needRowColumns), one row per tier with slot = tier + 1, so a repriced or renamed need cannot leave the fixtures stale"

requirements-completed: []  # DISC-03, DISC-04, DISC-05 stay open: sibling plans declare them and have no SUMMARY yet (ready-ids returned 0 of 3)

coverage:
  - id: D1
    description: "A 15-row list (five need keys at ranks 50 to 46 across three tiers, 10 points, eligible) is promoted to pending through the unchanged status update"
    requirement: DISC-05
    verification:
      - kind: unit
        ref: "app/api/loot-submissions/submit/__tests__/route.test.ts#need lists (D-08, DISC-05)"
        status: pass
    human_judgment: false
  - id: D2
    description: "An over-budget need list answers 422 NEED_BUDGET_EXCEEDED with used, limit and the shared sentence; five keys stacked at one rank are each counted; nothing is written"
    requirement: DISC-03
    verification:
      - kind: unit
        ref: "app/api/loot-submissions/submit/__tests__/route.test.ts#need refusals (D-07, D-10)"
        status: pass
      - kind: unit
        ref: "domain/loot/__tests__/need-list-rules.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "A need outside eligibleNeedsFor for the character's class and spec, or a character with no class, answers 422 NEED_NOT_ELIGIBLE naming the rows, before any write"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "app/api/loot-submissions/submit/__tests__/route.test.ts#need refusals (D-07, D-10)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Need rows in a tier with is_guild_active false are skipped by the budget and eligibility checks (GH #357); a missing tier flag still counts"
    verification:
      - kind: unit
        ref: "app/api/loot-submissions/submit/__tests__/route.test.ts#need refusals (D-07, D-10)"
        status: pass
    human_judgment: false
  - id: D5
    description: "A need key ranked twice answers one copy-limit line, item-list violations are unchanged, officer prio never flags a need, and an award lock on a need row's (rank, slot) holds"
    verification:
      - kind: unit
        ref: "app/api/loot-submissions/submit/__tests__/route.test.ts#need rows beside caps, prio and locks"
        status: pass
    human_judgment: false
  - id: D6
    description: "The over-budget and not-eligible sentences raiders see on a refused submit read right and match the Big Yikes voice"
    verification: []
    human_judgment: true
    rationale: "DISC-03 ('sees a points budget as one sentence') could not be classified by the edge probe; the server half is pinned by tests, the wording is DRAFT copy the owner signs off in 04-19"

duration: 12min
completed: 2026-11-11
status: complete
---

# Phase 4 Plan 08: Submit Route Need Budget and Eligibility Summary

**The D-22 hold is lifted and every submit now runs the 10-point budget and class and spec eligibility checks first (422 NEED_BUDGET_EXCEEDED and NEED_NOT_ELIGIBLE, nothing written), with need copy caps collapsed to one line per need**

## Performance

- **Duration:** 12 min
- **Completed:** 2026-11-11T06:15Z
- **Tasks:** 3 (one tracer, two auto)
- **Files:** 2 created, 3 modified, 2 deleted

## Accomplishments

- `checkNeedList` (pure): `checkNeedBudget` over the rows (one cost per distinct `(rank, need_key)` pick) plus `isNeedEligible` per row; a row with no `need_key` is ineligible rather than free.
- Submit route: the hold import and check are gone; the characters read now embeds `class:wow_classes(name)` and `spec:class_specs(name)` (object or one-element array); `need_key` rides on the existing `loot_items` embed. After the copy-limit 422 block and before `fetchListPrioItems`, the checked need rows run through `checkNeedList` and answer 422 with `needOverBudgetSentence`, `NEED_BUDGET_CODE`, `used`, `limit`, or `NEED_NOT_ELIGIBLE_ERROR`, `NEED_NOT_ELIGIBLE_CODE`, `ineligible`.
- Tracer verified end to end: a 15-row, 10-point Mage list promotes to pending (200), with the hold gone from code. Re-ran the tracer verify command and acceptance criteria after the commit; all passed, so expansion proceeded without a checkpoint.
- Need copy violations are collapsed by `bracket|rule|detail`; item rows still go through `validateItemCopyLimits` alone, listed first. Need rows and item rows never share a copy group (need rows have no `wowhead_id`), so the split changes only how need lines are reported.
- Lock check and prio check code are unchanged; the tests prove an award lock holds a need row's `(rank, slot)` (same need passes, a different need answers 422 `locked_ranks`) and that prio never flags a need row (D-03).
- 857 tests pass across `app/api/loot-submissions`, `domain/loot` and the reader inventory; `npm run typecheck` clean; `npm run lint` 0 errors (375 pre-existing warnings, none from these files).

## Task Commits

1. **Task 1: Tracer, 15-row need list submits with the hold gone and the budget in front** - `7fa7e378` (feat)
2. **Task 2: Every refusal, nothing written** - `af17056d` (test)
3. **Task 3: Copy caps once per need, prio never on needs, award locks on need rows** - `52d9a457` (feat; tests written first and seen failing, route change in the same commit per the plan's per-task commit rule)

**Plan metadata:** committed with this SUMMARY (docs).

## Files Created/Modified

- `domain/loot/need-list-rules.ts` and `__tests__/need-list-rules.test.ts` - the pure budget and eligibility check (7 tests)
- `app/api/loot-submissions/submit/route.ts` - hold removed, two refusals added, need copy dedupe, flow comment updated
- `app/api/loot-submissions/submit/__tests__/route.test.ts` - recording fake returns class and spec embeds (default Mage, Mage); need fixtures built from `NEED_DEFINITIONS`; the two hold describes replaced
- `lib/loot/__tests__/need-reader-inventory.test.ts` - the submit route's entry now cites plan 04-08, a current note and its test (the route keeps its guard marker through `isNeedRow`)
- Deleted: `domain/loot/need-ranking-hold.ts` and `domain/loot/__tests__/need-ranking-hold.test.ts`

## Decisions Made

See `key-decisions` above. The two planner decisions in the plan (own code `NEED_NOT_ELIGIBLE` at 422; checks read the GH #357 rows) were implemented as written.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Reader inventory entry kept current**
- **Found during:** Task 1
- **Issue:** The plan's `files_modified` omits `lib/loot/__tests__/need-reader-inventory.test.ts`, but the project rule says a changed reader keeps its inventory entry current in the commit that changes it. The entry still described the removed D-22 hold.
- **Fix:** Updated the entry's plan, note and added the route test citation.
- **Files modified:** `lib/loot/__tests__/need-reader-inventory.test.ts`
- **Commit:** `7fa7e378`

**2. [Variance] Pure test cases landed in Task 1**
- The plan lists the Task 2 pure cases (stacked keys, ineligible, no class) in `need-list-rules.test.ts` under Task 2; they were written with the pure module in Task 1 and the file is unchanged in Task 2. Task 2's commit holds the route tests only.

Otherwise the plan was executed as written.

## Authentication Gates

None.

## Issues Encountered

- Two of my own new test assertions were wrong on the first run (a fixture sanity check that read a missing `raid_tier`, and one that miscounted rows); both were replaced with a control case (the same turned-off-tier list with the tier left on is refused). No production code changed for them.
- The need's display name is `Chest, Cloth, Spell damage` (from `NEED_DEFINITIONS`), so the copy-limit tests read the name from the definition rather than hard-coding it.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register. T-04-08-01, -02 and -04 are mitigated (422 before any write, budget and eligibility ahead of the status update, hold removal and budget in one commit); T-04-08-03 is unchanged (the ownership and membership checks run first).

## Next Phase Readiness

- The picker and its refusal screens (04-11, 04-20) can read `code` `NEED_BUDGET_EXCEEDED` (with `used`, `limit`) and `NEED_NOT_ELIGIBLE` (with `ineligible`) from this route; both carry the same sentences the picker shows.
- Owner item for 04-19: the two refusal sentences are DRAFT copy, and DISC-03's "one sentence" half is a copy judgment.
- Shipping: PR 3 (Discovery lists). It may open only after 04-02 records the deploy, which it does.

## Self-Check: PASSED

Created files exist (`domain/loot/need-list-rules.ts`, its test, this SUMMARY), the two deleted files are gone, and commits 7fa7e378, af17056d and 52d9a457 are on `work/forever-phase-04`.
