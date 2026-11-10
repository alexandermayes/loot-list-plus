---
phase: 03-discovery-schema-and-need-pipeline
plan: 08
subsystem: api
tags: [reserve-runs, soft-reserve, need-rows, public-join, awards, vitest, discovery]
status: complete

requires:
  - phase: 03-discovery-schema-and-need-pipeline
    provides: plan 03-02 deployed schema and database types (loot_items.kind)
provides:
  - GET /api/reserve-runs/items and GET /api/reserve-runs/[id] list kind 'item' rows only (D-14)
  - the public join route lists items and validates submitted ids against kind 'item' only; a need row id answers the existing 'One or more items are not valid for this raid' 400
  - POST /api/reserve-runs/[id]/awards checks the award item against kind 'item'; a need row id answers the existing mismatch 400 and nothing is written
affects: [03-16, phase-04]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A reserve-run loot_items read adds .eq('kind', 'item') so a need id simply does not match and the existing invalid-item error paths answer; no new error text"
    - "Route test fakes apply the recorded eq filters, and fixture item rows carry kind 'item' (like the column default), so a missing kind filter lets the need row through and fails the test"

key-files:
  created:
    - app/api/reserve-runs/items/__tests__/route.test.ts
  modified:
    - app/api/reserve-runs/items/route.ts
    - app/api/reserve-runs/[id]/route.ts
    - app/api/reserve-runs/[id]/__tests__/route.test.ts
    - app/api/reserve-runs/join/[token]/route.ts
    - app/api/reserve-runs/join/[token]/__tests__/route.test.ts
    - app/api/reserve-runs/[id]/awards/route.ts
    - app/api/reserve-runs/[id]/awards/__tests__/route.test.ts

key-decisions:
  - "The awards route test fake gained a tierNeedIds fixture that only a read without kind = 'item' can see, because that fake never applied filters; the join test fixture item row gained kind: 'item'"

patterns-established:
  - "Soft-reserve reads are item-only at the query, never by post-filtering"

requirements-completed: [DISC-06]

coverage:
  - id: D1
    description: "GET /api/reserve-runs/items lists item rows only and records the kind filter; 400 without raid_tier_id and 500 on a read error are unchanged"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "app/api/reserve-runs/items/__tests__/route.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "GET /api/reserve-runs/[id] returns item rows only in run.items"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "app/api/reserve-runs/[id]/__tests__/route.test.ts#lists item rows only, never a need row (D-14)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The public join GET lists item rows only and the join POST refuses a submitted need row id with the invalid-items 400, writing no reserve row"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "app/api/reserve-runs/join/[token]/__tests__/route.test.ts#lists item rows only, never a need row (D-14)"
        status: pass
      - kind: unit
        ref: "app/api/reserve-runs/join/[token]/__tests__/route.test.ts#refuses a need row id with the invalid-items 400 and writes no reserve row (D-14)"
        status: pass
    human_judgment: false
  - id: D4
    description: "POST /api/reserve-runs/[id]/awards refuses a need row id with the existing mismatch 400 and writes no award"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "app/api/reserve-runs/[id]/awards/__tests__/route.test.ts#rejects a need row id with the same 400 and writes nothing (D-14)"
        status: pass
    human_judgment: false

duration: 10 min
completed: 2026-10-21
---

# Phase 3 Plan 08: Soft-Reserve Reads Stay Item-Only Summary

**Every reserve-run read of loot_items (public item list, run detail, public join list and submit check, awards check) now filters kind 'item', so a need row can never be offered, reserved or awarded and Known tiers answer exactly as before.**

## Performance

- **Duration:** 10 min
- **Tasks:** 2
- **Files modified:** 8 (7 modified, 1 created)

## Accomplishments

- Tracer: `GET /api/reserve-runs/items` and `GET /api/reserve-runs/[id]` read `.eq('kind', 'item')` with a D-14 comment. New test file for the public list covers the need-row exclusion, the unchanged 400 and the unchanged 500. The run detail test gained a need-row case. Tracer verify re-run after commit (auto mode check not needed to expand: it passed before the commit).
- Join route: both loot_items reads (the public list and the submit validation) filter kind 'item'. A submit holding a valid item id and a need row id fails the distinct-id length check and returns the existing 'One or more items are not valid for this raid' 400, with no reserve row written.
- Awards route: the item check filters kind 'item', so a need row id returns null and the existing 'This award doesn't match this reserve run' 400 answers, with no award inserted.
- The whole `app/api/reserve-runs` suite passes (9 files, 118 tests), typecheck exits 0, lint exits 0 with warnings only (all pre-existing).

## Task Commits

1. **Task 1: tracer, soft-reserve item list never offers a need row** - `6ff4d995` (feat)
2. **Task 2: public join route and run awards never accept a need row** - `d6c5b0aa` (feat)

Both tasks were written test first; the new need-row cases were run red (1 of 3 items cases, 1 of 38 detail cases, 3 of 36 join and awards cases) before the filters went in. One commit per task, so there are no separate test and feat commits.

**Plan metadata:** docs commit follows this summary.

## Files Created/Modified

- `app/api/reserve-runs/items/route.ts` - kind 'item' filter on the public list read
- `app/api/reserve-runs/items/__tests__/route.test.ts` - new: need-row exclusion, 400, 500
- `app/api/reserve-runs/[id]/route.ts` - kind 'item' filter on the run's item read
- `app/api/reserve-runs/[id]/__tests__/route.test.ts` - need-row case for run.items
- `app/api/reserve-runs/join/[token]/route.ts` - kind 'item' on the list read and the submit validation read
- `app/api/reserve-runs/join/[token]/__tests__/route.test.ts` - fixture item row carries kind 'item'; need-row GET and POST cases
- `app/api/reserve-runs/[id]/awards/route.ts` - kind 'item' on the award item check
- `app/api/reserve-runs/[id]/awards/__tests__/route.test.ts` - tierNeedIds fixture and the need-row award case

## Decisions Made

- No new error text: a need id fails the existing membership checks, which keeps Known-tier responses and errors byte-identical.
- The awards test fake never applied filters, so it gained a `tierNeedIds` set that only a read without the `kind = 'item'` filter can find; that makes the new case a real regression guard rather than a tautology.

## Deviations from Plan

None - plan executed exactly as written. The join test fixture's item row was given `kind: 'item'` (fixture data mirroring the column default) so the existing cases pass with the new filter; no existing test body changed.

## Issues Encountered

None.

## Threat Flags

None. T-03-08-01 (need rows on the public join and item routes) and T-03-08-02 (need id submitted as a reservation or award) are mitigated by the kind filters and covered by tests.

## Known Stubs

None.

## Next Phase Readiness

Plan 03-16 blocks reserve runs on Discovery tiers, lists Known tiers only in the reserve tier list and keeps the admin sheet import item-only. Shipping note: these changes belong to PR 3 of the phase (need readers); the owner opens it after the PR 1 deploy and PR 2 merge.

## Self-Check: PASSED

- `.eq('kind', 'item')` counts: items route 1, [id] route 1, join route 2, awards route 1 (matches acceptance criteria).
- Commits `6ff4d995` and `d6c5b0aa` exist.
- `npx vitest run app/api/reserve-runs` (118 tests), `npm run typecheck`, `npm run lint` (0 errors) pass.
