---
phase: 03-discovery-schema-and-need-pipeline
plan: 14
subsystem: api
tags: [nextjs, supabase, raid-tiers, list-mode, discovery, need-rows, vitest, forever]

requires:
  - phase: 03-discovery-schema-and-need-pipeline
    provides: "canSwitchToKnown, canSwitchToDiscovery, reason strings (03-03); seedNeedRows (03-13); guard triggers on raid_tiers (03-01, 03-15); reader inventory (03-12)"
provides:
  - "PATCH /api/raid-tiers accepts list_mode: Forever-only Discovery switch that seeds 145 need rows, guarded switch back to Known, audit row per change"
  - "Tier-to-guild ownership check on every PATCH field (research Pitfall 4)"
  - "GET /api/raid-tiers returns list_mode on every tier"
  - "First tests for app/api/raid-tiers/route.ts (31 tests)"
affects: [phase-04-picker, 03-17-need-lifecycle]

actuals:
  tokens: 15500
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Switch first, seed second, compensate on failure: the database accepts need rows only in a Discovery tier, so the route flips list_mode (filtered by id and current mode), seeds, and on a failed seed switches back with a mode-filtered update"
    - "Every decision (D-17, D-03 counts) is made before the first write, so a refused request writes nothing"
    - "Recording fake with stateful tiers that mirrors enforce_loot_item_need_rules (a need row in a non-Discovery tier is refused) and returns copies, like a real client"

key-files:
  created:
    - app/api/raid-tiers/__tests__/route.test.ts
  modified:
    - app/api/raid-tiers/route.ts
    - lib/loot/__tests__/need-reader-inventory.test.ts

key-decisions:
  - "Validation (empty updates, invalid list_mode) runs before the tier read, so malformed requests cost no queries; ownership runs before any decision or write"
  - "A list_mode equal to the current mode is dropped from the update; any other field in the same request is still applied, and with nothing left the route answers 200 with the unchanged tier and writes nothing"
  - "The mode switch runs before the other-field update; the audit row is written after the mode switch (and seed) succeed. A failure of the later field update answers 500 with the tier already switched and seeded, a consistent state the client can retry"
  - "A mode-filtered update that matches no row (concurrent change) answers 409 'Raid tier changed, please try again' instead of seeding against an unknown mode"
  - "Count reads fail closed: an error or a null count answers 500, never a guess"

patterns-established:
  - "Compensating update uses the same filter style as the forward one (id plus the mode it expects), so it can never overwrite a mode someone else set"

requirements-completed: [DISC-01]

duration: 14min
completed: 2026-10-21
status: complete
---

# Phase 3 Plan 14: List-Mode PATCH Summary

**PATCH /api/raid-tiers now switches a Forever tier to Discovery and seeds its 145 need rows, refuses Discovery for legacy tiers (400) and the switch back to Known once a need is ranked or awarded (409), and no officer can write another guild's tier through any field**

## Performance

- **Duration:** about 14 min
- **Tasks:** 2
- **Files:** 3 (1 created, 2 modified)

## Accomplishments

- `app/api/raid-tiers/route.ts` PATCH: allowlist gains `list_mode`; invalid values (null, '', 'Known', 'item') answer 400 "list_mode must be 'known' or 'discovery'"; the tier and its expansion are read first and a missing tier, missing expansion or other-guild expansion answers 404 'Raid tier not found' for every field (T-03-14-01); a read error answers 500 'Failed to load raid tier'.
- Switch to Discovery: `canSwitchToDiscovery` on the stored expansion name (400 with `DISCOVERY_FOREVER_ONLY_REASON`), then an update to `{ list_mode: 'discovery' }` filtered by id and list_mode 'known', then `seedNeedRows(serviceSupabase, [tier_id])`, then one `logAudit` row (old and new list_mode). A failed seed switches the tier back with `{ list_mode: 'known' }` filtered by id and list_mode 'discovery', writes no audit row and answers 500 'Failed to set up Discovery needs for this raid'; a failed compensation logs with a fixed first argument and still answers 500 (the owner's `sync:forever` seeds the missing keys).
- Switch to Known: reads the tier's need row ids (paged, ordered by id), counts `loot_submission_items` (removed or not) and `loot_history` rows on them with head-count queries, applies `canSwitchToKnown` and answers 409 with `KNOWN_SWITCH_BLOCKED_REASON` when blocked; never deletes need rows. A tier with no need rows skips the count queries.
- GET returns `list_mode` on every tier.
- `app/api/raid-tiers/__tests__/route.test.ts`: 31 tests including the boundary cases titled `[DISC-01 adjacency]` and `[DISC-01 empty]`, a 401, a 403, a GET select check, and a source scan that the expansion page `_client.tsx` mentions no list mode (D-02).
- `app/api/raid-tiers/route.ts` is in `NEED_READERS` as `branch` (plan 03-14), in sorted position.

## Task Commits

Both tasks landed in one commit (see Deviations):

1. **Tasks 1 and 2: list_mode PATCH, ownership check, D-03 and D-17 guards, GET list_mode, tests, inventory entry** - `a88322e4` (feat)

## Deviations from Plan

**1. [Plan ordering] Tasks 1 and 2 committed together**
- **Found during:** Task 1
- **Issue:** The PATCH is one function, and shipping a Known switch without its D-03 count check (or the Discovery switch without the ownership check) in an intermediate commit would leave an unguarded state. The inventory entry also has to land in the commit that makes the route a reader of the loot tables (03-12 rule), and that is the first commit.
- **Fix:** Wrote the complete route and its tests together, then verified the tests have teeth with three one-line mutations of the route (ownership check removed, 409 branch disabled, compensating update loses its mode filter); each made tests fail, and the route was restored byte for byte. The tracer gate (re-run of the Task 1 verify) passed before commit.
- **Commit:** a88322e4

**2. [Rule 1 - Bug in own test] Fake returned live state objects**
- The first run of the recording fake handed the route the same object it later mutated, so the audit `oldData` read 'known' after a switch. The fake now returns copies, like a real client. No route change.

**3. [Rule 2 - Missing critical] Two fail-closed extras in the route**
- A mode-filtered update that matches no row answers 409 rather than proceeding to seed; a non-object `updates` (string, array) answers 400 'No valid fields to update' rather than throwing into a 500; a null `expansion_id` on a tier answers 404. All three are inside the same commit.

**Total deviations:** 3. **Impact:** none on scope; every acceptance check passes.

## Authentication Gates

None. Nothing connected to Supabase; `npm run sync:forever` was not run. The route is proven with a recording fake only.

## Issues Encountered

None beyond deviation 2.

## Known Stubs

None. The reason strings are proposed copy for the owner's Oct 26 review; no screen shows them in Phase 3, and they contain no em dash.

## Threat Flags

None. No new endpoint or schema; the threat register T-03-14-01 to T-03-14-09 is covered: ownership 404 tests (01), 403 test (02), 400 Classic test (03), 409 tests and 500 on failed count reads (04), list_mode validation tests (05), audit assertion (06), compensating switch tests (09). T-03-14-07 (direct PostgREST) is the database trigger's job, proven in 03-15.

## Phase 4 handoff

The toggle stays held (D-02). Phase 4 adds the list-mode control in `app/(app)/expansions/[expansionId]/_client.tsx` beside `handleToggleGuildActive` and `handleToggleMasterSheetVisibility` (about lines 371-420), gated by `hasPermission('manage_settings')` (about line 234), calling this PATCH with `{ list_mode }`. Holds this phase leaves in place, to lift in Phase 4:

- `includeNeeds` default off in `fetchFilteredLootItems` (03-07): pass `{ includeNeeds: true }` for Discovery tiers.
- `keepRankedNeedRows` on the master sheet (03-10): stop calling it for Discovery tiers.
- The D-22 hold: delete the submit route's `isHeldNeedRanking` check with `domain/loot/need-ranking-hold.ts` and its test (03-09), and ship a migration dropping trigger `enforce_need_ranking_hold` on `loot_submission_items` and function `enforce_need_ranking_hold()` (03-01).
- Only if the owner wants legacy Discovery (lifts D-17): edit `canSwitchToDiscovery` (03-03) and replace `enforce_raid_tier_list_mode_rules` in the same migration (03-01).

## Size and effort

Estimate 75k tokens, low confidence. Actual: 3 files, 1 commit, about 640 lines added (route ~200, test ~440), roughly 15.5k tokens of realized diff (chars/4), about 14 minutes. The size risk did not materialise: the test fake is the bulk and the route logic is a short decision sequence over 03-03 and 03-13 helpers.

## Verification

- `npx vitest run app/api/raid-tiers lib/loot/__tests__/need-reader-inventory.test.ts --maxWorkers=2`: 61 passed.
- `npx vitest run app/api lib/loot app/services --maxWorkers=2`: 1864 passed, 1 skipped.
- `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring`: 364 passed.
- `npm run typecheck`: clean. `npm run lint`: 0 errors (375 pre-existing warnings, none new; `npx eslint` on the changed files is clean).
- Acceptance greps: `canSwitchToDiscovery(` 1, `canSwitchToKnown(` 1, `seedNeedRows(` 1, `Raid tier not found` 3 in the route, `DISC-01 adjacency` 2 in the test, route entry in the inventory 1, `_client.tsx` diff against origin/main 0 lines.
- Full `npm test` is run by the orchestrator at wave end.

## Next Phase Readiness

Wave 7 is done after this plan. Shipping: PR 4 (Discovery seeding and list mode) with 03-13, opened only after PR 3 has merged and deployed. Nothing was pushed.

## Self-Check: PASSED

- FOUND: app/api/raid-tiers/route.ts
- FOUND: app/api/raid-tiers/__tests__/route.test.ts
- FOUND commit: a88322e4

---
*Phase: 03-discovery-schema-and-need-pipeline*
*Completed: 2026-10-21*
