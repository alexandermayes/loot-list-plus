---
phase: 03-discovery-schema-and-need-pipeline
plan: 11
subsystem: ui
tags: [character-gear, loot-history, dashboard, raid-tracking, need-rows, vitest]
status: complete

requires:
  - phase: 03-discovery-schema-and-need-pipeline
    provides: "loot_items.kind (03-01, 03-02), isNeedRow, itemIdentityKey, wowheadIdForDisplay (03-04), createNeedSkipScope and noteNeedSkipped, ItemLink NeedLabel fallback (03-05)"
provides:
  - "GET /api/character-gear leaves need awards out of awarded_items with one need-skip warning per request"
  - "GET /api/loot-history returns wowhead_id null for a need award (wowheadIdForDisplay) and selects kind in the embedded and fallback reads"
  - "Dashboard received-item skip keyed by itemIdentityKey; recent awards map wowhead_id with wowheadIdForDisplay"
  - "Raid-tracking loot entries map item_wowhead_id with wowheadIdForDisplay; the name-matching loot_items read loads kind item only"
affects: [03-12-reader-inventory, 03-19-need-award-tests, phase-05-drop-desk]

actuals:
  tokens: 5100
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Award history surfaces map wowhead ids through wowheadIdForDisplay and let ItemLink render a NeedLabel for null"
    - "Readers that cannot represent a need award skip it through an explicit isNeedRow branch plus noteNeedSkipped"

key-files:
  created: []
  modified:
    - app/api/character-gear/route.ts
    - app/api/character-gear/__tests__/route.test.ts
    - app/api/loot-history/route.ts
    - app/(app)/overview/components/DashboardContent.tsx
    - app/(app)/raid-tracking/_client.tsx
    - app/(app)/raid-tracking/components/types.ts

key-decisions:
  - "character-gear counts and warns on need awards before the existing wowhead filter, so item rows with no wowhead id are still dropped by the old filter and are not reported as needs"
  - "The dashboard loot-priority list keeps item.wowhead_id as is (null for a need row) rather than routing through wowheadIdForDisplay, so item behaviour is byte-identical; only the type was widened"
  - "RaidLootEntry.item_wowhead_id widened to number | null in raid-tracking/components/types.ts (a one-line type change the plan did not list) because the screen's consumers already pass it to ItemLink, which accepts null"

requirements-completed: [DISC-06]

coverage:
  - id: D1
    description: "A need award is skipped from awarded gear with one warning per request; item awards are returned exactly as before"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "app/api/character-gear/__tests__/route.test.ts#need awards"
        status: pass
    human_judgment: false
  - id: D2
    description: "Loot history API returns wowhead_id null for a need award and selects kind in both reads"
    requirement: DISC-06
    verification:
      - kind: command
        ref: "grep -c 'wowheadIdForDisplay(' app/api/loot-history/route.ts"
        status: pass
      - kind: unit
        ref: "app/api/loot-history (68 existing tests still pass)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Dashboard skips a received need by identity key and shows need awards in recent awards as a null wowhead id; raid-tracking shows need awards the same way and name-matches against item rows only"
    requirement: DISC-06
    verification:
      - kind: command
        ref: "npm run typecheck, npm run lint, and the plan's node source assertion"
        status: pass
    human_judgment: true
    rationale: "No component test renders the dashboard or raid-tracking with a need award; the NeedLabel look is held for the Phase 4 copy review and is confirmed in the phase-end human verify"
---

# Phase 3 Plan 11: Award Display for Need Awards Summary

**Need awards are skipped visibly from awarded gear, come back from loot history with a null wowhead id, and render as NeedLabels on the dashboard and raid-tracking screens, with the dashboard's received-item skip keyed by identity.**

## Performance

- **Duration:** about 8 min
- **Tasks:** 2 of 2 (Task 1 tracer with RED/GREEN commits, Task 2 auto)
- **Files modified:** 6

## Accomplishments

- GET /api/character-gear selects `kind`, counts need awards through `isNeedRow`, and calls `noteNeedSkipped` once, so a need award never shows as a gear item and never vanishes without a log line (T-03-11-01). Count and the awarded list are unchanged for item-only history.
- GET /api/loot-history selects `kind` in the embedded read and in the fallback batch read, and maps `wowhead_id` with `wowheadIdForDisplay`, so a need award returns `null` and every other row keeps its id or the legacy 0 (T-03-11-02). The existing LootHistoryTab, PlayerLootModal and ItemCandidateModal pass the value straight to ItemLink, which renders a NeedLabel for null.
- DashboardContent swaps the number Set of received wowheads for a Set of identity strings. Items still skip on the wowhead id; a need skips only when that exact need row was awarded (D-19). Recent awards map through `wowheadIdForDisplay`.
- Raid-tracking maps `item_wowhead_id` through `wowheadIdForDisplay` and its name-matching `loot_items` read adds `.eq('kind', 'item')`, so a pasted loot line can never match a need row.

## Task Commits

1. **Task 1 RED: failing need-award tests for character-gear** - `d0d7069d` (test)
2. **Task 1 GREEN: character-gear and loot-history need branches** - `8f4c2ad7` (feat)
3. **Task 2: dashboard and raid-tracking need awards** - `523981e4` (feat)

## Verification

- `npx vitest run app/api/character-gear` passes (33 tests, 4 new). RED run failed 3 of the new tests before the change.
- `npx vitest run domain/loot/__tests__/item-identity.test.ts app/api/character-gear domain/loot app/api/loot-history` passes (23 files, 399 tests).
- `npx vitest run "app/(app)/raid-tracking" "app/(app)/overview"` passes (13 files, 204 tests).
- `npm run typecheck` exits 0; `npm run lint` reports 0 errors (375 pre-existing warnings).
- Acceptance greps: `createNeedSkipScope('character-gear')` 1, `wowheadIdForDisplay(` in loot-history 1, `itemIdentityKey(` in DashboardContent 2, `wowheadIdForDisplay(` in DashboardContent 1 and in raid-tracking 1, `.eq('kind', 'item')` in raid-tracking 1.
- Tracer gate: Task 1's verify (vitest plus typecheck) was re-run after Task 2 changes and stays green.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Widened RaidLootEntry.item_wowhead_id**
- **Found during:** Task 2
- **Issue:** `item_wowhead_id` was typed `number`, but `wowheadIdForDisplay` returns `number | null`; the map would not typecheck.
- **Fix:** One-line widening in `app/(app)/raid-tracking/components/types.ts`. Its consumers already hand the value to ItemLink, which accepts null (03-05).
- **Files modified:** app/(app)/raid-tracking/components/types.ts
- **Commit:** 523981e4

**Total deviations:** 1 auto-fixed (Rule 3). **Impact:** type-only, no behaviour change for items.

## Known Stubs

None.

## Deferred Issues

- **Raid-tracking edit re-import drops need awards.** Editing a raid event pre-fills the loot textarea with `[<wowhead id>];<character>` lines (`_client.tsx` ~280), then on save deletes all loot for the event through `/api/loot-history/bulk` and re-imports the lines. A need award has no wowhead line form, so it would pre-fill as `[null]`, fail import with "Invalid item ID", and stay deleted. This only matters once need awards exist (the Phase 5 Drop Desk writes them), and it needs a design choice (exclude need rows from the bulk delete, or keep them out of the pre-fill). Left for Phase 5 planning; not changed here because it is outside the plan's files-and-intent.

## Threat Flags

None. The change adds a select column and filters on existing routes; the existing character-gear scoping (`awardGuildIds`) and its tests are untouched (T-03-11-03).

## Next

Ready for 03-12 (reader inventory and boss sentinel tests).

## Self-Check: PASSED

- Commits `d0d7069d`, `8f4c2ad7`, `523981e4` present in `git log`.
- All six modified files exist and carry the described changes; no files were created besides this SUMMARY.
