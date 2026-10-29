---
phase: 03-discovery-schema-and-need-pipeline
plan: 09
subsystem: api
tags: [loot-submissions, submit-route, need-rows, d-22-hold, bracket-validation, vitest, discovery]
status: complete

requires:
  - phase: 03-discovery-schema-and-need-pipeline
    provides: plan 03-02 deployed schema and database types (loot_items.kind, enforce_need_ranking_hold trigger from 03-01)
  - phase: 03-discovery-schema-and-need-pipeline
    provides: plan 03-04 isNeedRow, need-aware validateItemCopyLimits and maxCopiesForItem
provides:
  - domain/loot/need-ranking-hold.ts with NEED_RANKING_HELD, NEED_RANKING_HOLD_ERROR and the pure isHeldNeedRanking predicate (D-22)
  - POST /api/loot-submissions/submit answers 422 { error: NEED_RANKING_HOLD_ERROR } for any list holding a need row, before any write and before the GH #357 inactive-tier filter
  - the submit route's need branch for Phase 4: need rows leave the validateBracketRules input and kind reaches validateItemCopyLimits so need copy caps apply
affects: [03-17, 03-19, phase-04]

actuals:
  tokens: 12000
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "The D-22 hold is one pure predicate plus one route call, so Phase 4 removes one call, one module and one trigger"
    - "A route test opens a module-mocked hold in a describe (mockReturnValue(false)) and restores the real predicate in afterEach through vi.importActual"

key-files:
  created:
    - domain/loot/need-ranking-hold.ts
    - domain/loot/__tests__/need-ranking-hold.test.ts
  modified:
    - app/api/loot-submissions/submit/route.ts
    - app/api/loot-submissions/submit/__tests__/route.test.ts

key-decisions:
  - "The hold reads every loaded row before the GH #357 filter, because a need in a turned-off tier is still a ranked need"
  - "Need rows are filtered out of the bracket input rather than given a cost mirror, so a Big plus Standard need list never trips allocation_limit (D-06, Pitfall 2)"

patterns-established:
  - "Phase 4 lifts the hold with exactly: delete the isHeldNeedRanking check in the submit route, delete need-ranking-hold.ts and its test, and ship a migration dropping trigger enforce_need_ranking_hold on loot_submission_items and function enforce_need_ranking_hold(); the need branch stays"

requirements-completed: [DISC-06]

coverage:
  - id: D1
    description: "isHeldNeedRanking is true only for a kind 'need' row while NEED_RANKING_HELD is true; item, no kind, null and undefined are false; the hold copy has no em or en dash"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/need-ranking-hold.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Submit answers 422 with the hold error and writes no loot_submissions update when any live row is a need, including a need in a turned-off tier; item lists submit exactly as before; kind is read through the existing items select"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "app/api/loot-submissions/submit/__tests__/route.test.ts#ranking needs is held (D-22)"
        status: pass
    human_judgment: false
  - id: D3
    description: "With the hold lifted, a Big need and a Standard need in one bracket submit with no 422 while the same costs on item rows answer allocation_limit; a third Ring need and a second Main hand weapon need answer item_copy_limit; two Ring needs submit"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "app/api/loot-submissions/submit/__tests__/route.test.ts#with the hold lifted (Phase 4 state)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The proposed hold copy 'Needs cannot be ranked yet.' is user-facing text"
    requirement: DISC-06
    verification: []
    human_judgment: true
    rationale: "Copy is proposed and awaits the owner's Oct 26 sign-off; only an API caller can see it while the picker hides needs"

duration: 3 min
completed: 2026-10-21
---

# Phase 3 Plan 09: Submit Route D-22 Hold and Need Branch Summary

**POST /api/loot-submissions/submit now refuses any list that ranks a need (422, nothing written) through one pure predicate, and already skips need rows in the bracket rules and caps their copies, so Phase 4 only deletes the hold.**

## Performance

- **Duration:** 3 min
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- Tracer: `domain/loot/need-ranking-hold.ts` exports `NEED_RANKING_HELD` (true), `NEED_RANKING_HOLD_ERROR` ('Needs cannot be ranked yet.', proposed copy) and `isHeldNeedRanking`. The submit route reads `kind` in its embedded loot_item select and returns 422 `{ error: NEED_RANKING_HOLD_ERROR }` when any loaded row is a need, before the GH #357 filter and before any write, so status, submitted_at and resubmission_count stay put. Tracer verify (the two test targets plus typecheck) passed after the commit.
- Need branch: the validateBracketRules input drops need rows (their 10-point budget is Phase 4's check, DISC-03) and `kind` is passed into validateItemCopyLimits, so Ring and Trinket needs cap at 2 and every other need at 1.
- Route tests open the hold per describe with a module mock and restore the real predicate afterwards; the Task 1 hold cases still pass in the same file.
- Verification: `npx vitest run app/api/loot-submissions/submit domain/loot` passes (22 files, 321 tests); typecheck exits 0; lint exits 0 errors (375 pre-existing warnings, none in these files).

## Task Commits

1. **Task 1 RED: failing tests for the hold** - `c6b73fc5` (test)
2. **Task 1 GREEN (tracer): refuse to submit a list that ranks a need** - `34008e4c` (feat)
3. **Task 2: need rows out of bracket rules, need copy caps** - `a24d64ca` (feat)

Task 2's tests were written in the RED commit (2 of the 4 hold-lifted cases failed against the Task 1 route); they were held as `describe.skip` in the Task 1 commit so the tracer verify passed, and unskipped with the Task 2 change.

**Plan metadata:** docs commit follows this summary.

## Files Created/Modified

- `domain/loot/need-ranking-hold.ts` - the D-22 predicate, error copy and Phase 4 removal notes
- `domain/loot/__tests__/need-ranking-hold.test.ts` - predicate and copy cases
- `app/api/loot-submissions/submit/route.ts` - kind in the select, hold check, need rows out of the bracket input, kind into the copy-limit input
- `app/api/loot-submissions/submit/__tests__/route.test.ts` - hold and hold-lifted cases, module mock for the predicate

## Decisions Made

- The hold sits right after itemRows is built and ahead of the GH #357 filter, so a need row in a turned-off tier is still refused.
- Need rows are excluded from the bracket input instead of mirroring a classification, because need costs (3, 2, 1) would otherwise sum against the bracket limit and reject valid need lists.

## Deviations from Plan

### Notes

- The existing test file import line gained `afterEach` (`git diff origin/main --numstat` shows 1 line removed, that import line). No existing test or assertion was edited. The acceptance criterion's intent (no existing test removed) holds.

**Total deviations:** 0 auto-fixed. **Impact:** none.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. The route reads `kind` from the database select, never from the request (T-03-09-01); the hold answers 422 before any write (T-03-09-02); the one predicate, one call and one trigger are named in this summary and the module header for Phase 4 (T-03-09-03).

## User Setup Required

None. Owner sign-off still needed on the proposed hold copy before it ships (Oct 26).

## Next Phase Readiness

Ready for 03-10. Lifecycle tests past the hold are 03-17 and 03-19, as planned. PR 3 (need readers) opens only after PR 1 deploy and PR 2 merge.

## Self-Check: PASSED

- domain/loot/need-ranking-hold.ts and its test exist; route.ts and route.test.ts changed
- Commits c6b73fc5, 34008e4c and a24d64ca exist
- Acceptance greps: isHeldNeedRanking export 1, route call 1, D-22 in route 1, isNeedRow( in route 1, "with the hold lifted (Phase 4 state)" 1
