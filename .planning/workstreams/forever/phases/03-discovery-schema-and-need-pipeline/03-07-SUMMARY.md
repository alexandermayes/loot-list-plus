---
phase: 03-discovery-schema-and-need-pipeline
plan: 07
subsystem: api
tags: [loot-items, bis-import, picker-hold, need-rows, officer-editors, vitest, discovery]
status: complete

requires:
  - phase: 03-discovery-schema-and-need-pipeline
    provides: plan 03-02 database types and deployed schema (loot_items.kind, need_key), 03-04 isNeedRow and NEED_ROW_FIXED_ERROR
provides:
  - fetchFilteredLootItems with a fourth FetchFilteredLootItemsOptions parameter; need rows are excluded unless includeNeeds is true (D-02)
  - need rows that pass through with includeNeeds skip the wowhead-keyed token, class-lock and proficiency checks
  - GET /api/bis-items reads kind 'item' only (D-14)
  - PATCH /api/loot-items and POST /api/loot-items/specs answer 400 NEED_ROW_FIXED_ERROR for a need row, after the guild ownership check, before any write (D-12, D-06, D-08)
  - LootSettingsContent and PriorityListTab load kind 'item' rows only
affects: [03-09, 03-18, phase-04]

actuals:
  tokens: 7200
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "The held switch is a default-off option on the shared query helper, so Phase 4 flips one argument per caller and no data changes"
    - "Item edit routes read kind with the ownership select and reject a need row after the guild check, so a need row of another guild still answers 404"
    - "Route test fakes default a fixture row's kind to 'item' (like the column default) so a missing kind filter lets the need row through and fails the test"

key-files:
  created:
    - app/api/bis-items/__tests__/route.test.ts
    - app/api/loot-items/__tests__/route.test.ts
    - app/api/loot-items/specs/__tests__/route.test.ts
  modified:
    - lib/loot-items-query.ts
    - lib/__tests__/loot-items-query.test.ts
    - app/api/bis-items/route.ts
    - app/api/loot-items/route.ts
    - app/api/loot-items/specs/route.ts
    - app/(app)/loot-management/components/LootSettingsContent.tsx
    - app/(app)/loot-management/components/PriorityListTab.tsx

key-decisions:
  - "includeNeeds is a default-false option on fetchFilteredLootItems, not a flag; neither caller (bootstrap route, GET /api/loot-items) changed, so Phase 4 passes { includeNeeds: true } for list_mode 'discovery' tiers"
  - "LootItemRow.wowhead_id widened to number | null and the getItemTypeInfo call guarded with a null check; a need row returns before every wowhead-keyed check, so item behaviour is unchanged"
  - "The need-row 400 on PATCH and specs comes after the guild ownership check and before any write, so a need row of another guild answers 404 and the database guard (enforce_loot_item_need_rules, 03-01) stays the backstop"

patterns-established:
  - "Shared loot_items readers take their need handling from kind, never from a null wowhead_id"

requirements-completed: [DISC-06]

coverage:
  - id: D1
    description: "The raider's item picker (fetchFilteredLootItems) returns no need row by default and returns need rows only with includeNeeds; item rows are identical either way"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "lib/__tests__/loot-items-query.test.ts#fetchFilteredLootItems need rows (D-02, DISC-06)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A need row passed through with includeNeeds skips the wowhead-keyed checks (a Mage still gets a plate Chest need row)"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "lib/__tests__/loot-items-query.test.ts#skips the wowhead-keyed checks for a need row"
        status: pass
    human_judgment: false
  - id: D3
    description: "GET /api/bis-items reads kind 'item' only and never maps a need row under a null wowhead key"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "app/api/bis-items/__tests__/route.test.ts#reads only kind item rows and maps only items, never a null wowhead key (D-14)"
        status: pass
    human_judgment: false
  - id: D4
    description: "PATCH /api/loot-items answers 400 NEED_ROW_FIXED_ERROR for a need row and writes nothing; an item row still updates with the sanitized fields; 403 without manage_loot"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "app/api/loot-items/__tests__/route.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "POST /api/loot-items/specs answers 400 NEED_ROW_FIXED_ERROR for a need row on remove_all, remove and add, with no loot_item_classes write; an item row still inserts"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "app/api/loot-items/specs/__tests__/route.test.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "LootSettingsContent and PriorityListTab load kind 'item' rows only"
    requirement: DISC-06
    verification:
      - kind: command
        ref: "grep -c \".eq('kind', 'item')\" on both component files prints 1 each (client components have no unit tests)"
        status: pass
    human_judgment: false

duration: 25 min
completed: 2026-10-21
---

# Phase 3 Plan 07: Held Switch on Raider and Officer Item Surfaces Summary

**fetchFilteredLootItems excludes need rows unless includeNeeds is passed (the one option Phase 4 flips), BIS import reads items only, and the item edit routes plus both officer editors leave need rows alone.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-10-21T21:19Z (approx.)
- **Completed:** 2026-10-21T21:44Z
- **Tasks:** 3
- **Files modified:** 10 (7 modified, 3 created)

## Accomplishments

- Raider picker: `fetchFilteredLootItems(supabase, character, tierIds, options)` adds `.eq('kind', 'item')` unless `includeNeeds` is true (D-02). With the option on, a need row returns before the token, class-lock and proficiency checks, which key on wowhead_id. `kind` and `need_key` are now selected. Neither caller (bootstrap route, GET /api/loot-items) changed.
- BIS import: GET /api/bis-items reads `kind = 'item'` (D-14), so a need row can never map under a `null` wowhead key.
- Officer edit routes: PATCH /api/loot-items and POST /api/loot-items/specs read `kind` with the ownership select and return 400 `NEED_ROW_FIXED_ERROR` for a need row after the guild check and before any write (D-12, D-06, D-08).
- Officer editors: LootSettingsContent and PriorityListTab add `.eq('kind', 'item')` inside their paginatedSelect builders.
- Phase 4 handoff: pass `{ includeNeeds: true }` from the bootstrap route and GET /api/loot-items for tiers whose `list_mode` is 'discovery'. The D-22 server hold is lifted separately (03-09).

## Task Commits

1. **Task 1: tracer, picker hides need rows by default** - `7e04edc0` (feat)
2. **Task 2: BIS import excludes need rows, PATCH refuses one** - `e1c064b7` (feat)
3. **Task 3: specs edits refuse need rows, editors list items only** - `3e707314` (feat)

Each task was written test first and the new need-row cases were run red before the implementation went in (4 of 5 new picker tests, 1 of 2 BIS and 1 of 3 PATCH cases, 3 of 4 specs cases failed first). One commit per task, so there are no separate test and feat commits.

**Plan metadata:** docs commit follows this summary.

## Files Created/Modified

- `lib/loot-items-query.ts` - includeNeeds option, kind filter, need pass-through, null-safe type lookup
- `lib/__tests__/loot-items-query.test.ts` - mock `eq` treats a missing kind as 'item'; five need-row cases
- `app/api/bis-items/route.ts` and `__tests__/route.test.ts` - kind filter; new route test
- `app/api/loot-items/route.ts` and `__tests__/route.test.ts` - need-row 400 on PATCH; new route test
- `app/api/loot-items/specs/route.ts` and `__tests__/route.test.ts` - need-row 400 before any write; new route test
- `app/(app)/loot-management/components/LootSettingsContent.tsx`, `PriorityListTab.tsx` - kind filter

## Decisions Made

See key-decisions above. The need-row guards sit after the guild ownership check so cross-guild probing still answers 404.

## Deviations from Plan

None - plan executed exactly as written. One small typing change fell out of the plan's own instruction: widening `LootItemRow.wowhead_id` to `number | null` made `getItemTypeInfo(item.wowhead_id)` fail typecheck, so that call got a null guard. Item rows always have an id, so item behaviour is identical (all 153 existing and new picker tests pass unchanged).

**Total deviations:** 0 auto-fixed. **Impact:** none.

## Issues Encountered

- The full `npm test` run finished with 237 files and 4699 tests passed but reported 18 `[vitest-pool-runner]: Timeout waiting for worker to respond` errors, a worker-pool load symptom on this machine and not a failing test. The plan-scope runs (`loot-items-query`, `bis-items`, `loot-items`, `loot-list`) pass cleanly (174 tests). `npm run typecheck` exits 0; `npm run lint` has 0 errors (375 pre-existing warnings, none new that matter).
- The first sed attempt on macOS failed (BSD sed `-i`); redone with a Python edit. No file was affected.

## User Setup Required

None.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path or schema change; all changes tighten existing routes (T-03-07-01 to T-03-07-04 mitigated and tested).

## Size and effort

- **Size risk (D-28):** the plan sat at the 10-file threshold with an 80k-token, low-confidence estimate and stayed unsplit by owner decision. It touched exactly 10 files (7 modified, 3 created tests), 480 insertions, 11 deletions.
- **Actual effort:** about 7k tokens by the chars/4 scale over the realized diff (about 29k characters), well under the 80k estimate. No task ran long; the tracer took the longest because of the large existing test file. Context used stayed modest because the plan's `<interfaces>` block removed the need to re-discover the routes.

## Next Phase Readiness

- Ready for 03-08 and the other wave 4 plans. PR 3 (need readers) grouping, with the 03-02 deploy recorded, is for the owner at ship time; nothing was pushed.

## Self-Check: PASSED

- Created files exist: three route tests found on disk.
- Commits found: 7e04edc0, e1c064b7, 3e707314.
- Acceptance criteria re-run: `includeNeeds` count 4 (>= 2), `.eq('kind', 'item')` counts 1 in the query helper, 1 in bis-items, 1 in each component, `NEED_ROW_FIXED_ERROR` in loot-items (2) and specs (2); bootstrap route diff against origin/main is empty; typecheck exits 0; lint exits 0 errors.
- Plan-level verification: `npx vitest run lib/__tests__/loot-items-query.test.ts app/api/bis-items app/api/loot-items` exits 0.
