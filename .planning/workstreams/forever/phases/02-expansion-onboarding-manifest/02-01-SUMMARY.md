---
phase: 02-expansion-onboarding-manifest
plan: 01
subsystem: testing
tags: [vitest, golden-file, toMatchFileSnapshot, expansion-seeder, supabase-mock]

requires:
  - phase: 01
    provides: "expansionSeeder.ts and the five legacy expansion catalogs as they stand on origin/main"
provides:
  - "Five committed golden row files (classic, tbc, wrath, cata, mop) pinning every row the legacy seeder writes, in call order"
  - "Module-local deterministic Supabase recorder and canonical line serializer for the seeder"
  - "CI-enforced contract that plans 02-03 and 02-04 must pass unchanged"
affects: [02-03, 02-04, 02-05, expansion-seeder]

actuals:
  tokens: 150000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Golden-row snapshot via toMatchFileSnapshot with recursively sorted JSON keys, one row per line, row order as contract"
    - "Deterministic recording fake (counter and name ids) kept local to the test, not shared with expansionSeeder.test.ts"

key-files:
  created:
    - app/services/__tests__/expansionSeeder-golden.test.ts
    - app/services/__tests__/__golden__/classic.rows.txt
    - app/services/__tests__/__golden__/tbc.rows.txt
    - app/services/__tests__/__golden__/wrath.rows.txt
    - app/services/__tests__/__golden__/cata.rows.txt
    - app/services/__tests__/__golden__/mop.rows.txt
  modified: []

key-decisions:
  - "Recorder tags each call with afterInsert so the returning select() after raid_tiers insert is not mistaken for a read of existing raid_tiers"
  - "Golden files captured once with vitest -u against the seeder byte-identical to origin/main (precondition checked before each capture); never regenerated afterwards"

patterns-established:
  - "Golden failures are never fixed with -u: a mismatch in a later plan means that plan changed legacy rows"

requirements-completed: [EXPN-03]

coverage:
  - id: D1
    description: "Each of the five legacy expansions has a committed golden file of every seeder row, captured from the unmodified seeder"
    requirement: "EXPN-03"
    verification:
      - kind: unit
        ref: "app/services/__tests__/expansionSeeder-golden.test.ts#legacy expansion seeding is frozen to golden rows"
        status: pass
    human_judgment: false
  - id: D2
    description: "Row counts equal the measured catalog counts (items 838/734/1359/979/1775, tiers 7/9/8/5/5), wowhead_id is a string, no sort_order on raid_tiers"
    requirement: "EXPN-03"
    verification:
      - kind: command
        ref: "grep -c '^insert loot_items ' and '^insert raid_tiers ' on each golden file; node wowhead_id and sort_order checks"
        status: pass
    human_judgment: false
  - id: D3
    description: "Seeding a legacy expansion issues no raid_tiers read and no update, delete or upsert on raid_tiers, loot_items or loot_item_classes"
    requirement: "EXPN-03"
    verification:
      - kind: unit
        ref: "app/services/__tests__/expansionSeeder-golden.test.ts (recorder invariants in each golden case)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Capture is deterministic and CI mode writes nothing"
    verification:
      - kind: unit
        ref: "app/services/__tests__/expansionSeeder-golden.test.ts#records identical lines for two fresh recorders"
        status: pass
      - kind: command
        ref: "CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts; git status --porcelain app/services/__tests__/__golden__ is empty"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-10-14
status: complete
---

# Phase 02 Plan 01: Legacy Seeder Golden Rows Summary

**Five committed golden files freeze every row the seeder writes for Classic, TBC, Wrath, Cataclysm and MoP, driven by a deterministic recording Supabase fake and checked by CI without ever writing.**

## Performance

- **Duration:** about 8 min
- **Started:** 2026-10-14T14:42:00Z (approximate)
- **Completed:** 2026-10-14T14:50:00Z (approximate)
- **Tasks:** 2
- **Files modified:** 6 (all created)

## Accomplishments

- `createSeederRecorder()` drives the real `seedExpansionForGuild(recorder, 'g1', name, true, true)` end to end with counter and name based ids (`exp-1`, `tier-n`, `item-n`, `class-<name>`).
- `canonicalLines()` emits one line per written row (`<method> <table> <sorted-key JSON>`), keeping row order as part of the contract.
- Tracer (Task 1) froze Classic, then Task 2 widened to all five and added a determinism guard (two fresh recorders give identical text).
- Golden files were captured with `-u` exactly once each, with `expansionSeeder.ts` and every data file it imports identical to origin/main (precondition command exited 0 before each capture).

### Golden file line counts (for later plans to compare)

| File | Total lines | raid_tiers | loot_items | loot_item_classes |
|------|-------------|-----------|-----------|-------------------|
| classic.rows.txt | 1001 | 7 | 838 | 154 |
| tbc.rows.txt | 907 | 9 | 734 | 162 |
| wrath.rows.txt | 1669 | 8 | 1359 | 300 |
| cata.rows.txt | 1266 | 5 | 979 | 280 |
| mop.rows.txt | 2134 | 5 | 1775 | 352 |

Total lines = 1 expansions insert + 1 guilds update + the three row kinds above.

## Task Commits

1. **Task 1: Tracer, Classic seed frozen through a deterministic recorder** - `a10edf33` (test)
2. **Task 2: Other four legacy expansions frozen, capture proven stable** - `4e6cbd6b` (test)

**Plan metadata:** committed separately (docs: complete plan)

## Files Created/Modified

- `app/services/__tests__/expansionSeeder-golden.test.ts` - recorder, serializer, five golden cases and the determinism guard
- `app/services/__tests__/__golden__/{classic,tbc,wrath,cata,mop}.rows.txt` - the frozen rows

## Decisions Made

- The recorder marks each recorded call `afterInsert`. The seeder's `.insert().select().single()` on `raid_tiers` records a select on that table, so the "no raid_tiers select" invariant is applied only to selects that are not a returning select after an insert (reads of existing rows).
- Tracer gate: `workflow.human_verify_mode` is `end-of-phase` and auto mode is off, so no mid-flight human checkpoint was raised; the tracer `<verify>` command was re-run end to end after the commit and passed before Task 2 started.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None in scope. Out-of-scope, pre-existing and left alone: `npm run typecheck` reports errors only under the untracked `loot-list-plus-wt-355/` directory and the generated `.next/dev/types/validator.ts`; `npm run lint` reports 62 errors repo-wide, none in the new test file (file linted clean on its own).

## Known Stubs

None.

## Threat Flags

None. The test introduces no network, auth or schema surface.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 02-02. Plans 02-03 and 02-04 must run this suite with `CI=true` and must not use `-u`; a mismatch means the plan changed legacy rows.
- Shipping note from the plan: this is PR 1 of the phase (test-only) and must merge before the first PR that edits `app/services/expansionSeeder.ts` (plan 02-03). It has not been pushed or opened as a PR.
- Flagged assumption carried from the plan (unresolved by design): "byte-identical" is measured at the seeder's call boundary; database defaults, triggers and RLS are outside what the files pin.

## Self-Check: PASSED

- All six created files exist on disk; commits `a10edf33` and `4e6cbd6b` found in git log.
- `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts` passes (6 tests) and leaves `git status --porcelain app/services/__tests__/__golden__` empty.
- `git diff --quiet origin/main -- app/services/expansionSeeder.ts` exits 0.
- `npx vitest run app/services` passes (48 files, 669 tests).

---
*Phase: 02-expansion-onboarding-manifest*
*Completed: 2026-10-14*
