---
phase: 03-discovery-schema-and-need-pipeline
plan: 12
subsystem: testing
tags: [vitest, source-scan, reader-inventory, sql-functions, boss-sentinel, need-rows]

requires:
  - phase: 03-discovery-schema-and-need-pipeline
    provides: "need-aware readers (03-05 to 03-11, 03-16), need tests cited by 'ok' entries (03-17 to 03-19), Discovery migration functions and PGlite proofs (03-01, 03-15), NEED_BOSS_NAME (03-03)"
provides:
  - "need-reader-inventory.test.ts: both-direction scan of every reader of loot_items, loot_submission_items and loot_history in code, scripts, SQL scripts, companion, discord-bot and SQL functions, with a checked need disposition each"
  - "needs-boss-sentinel.test.ts: the 'Needs' boss_name sentinel run through every boss helper, plus the boss_name file inventory"
affects: [03-13-need-row-seeder, 03-14-list-mode-patch, phase-04-picker, phase-05-drop-desk]

actuals:
  tokens: 17400
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Scan test with floors, both-direction inventory check and synthetic self-checks (typed-client-usage pattern)"
    - "Disposition markers checked against source; 'ok' must cite a test holding a need fixture; 'agnostic' must name no item column"
    - "Latest-definition SQL function scan over supabase/migrations (CREATE replaces, DROP removes, any dollar tag)"

key-files:
  created:
    - lib/loot/__tests__/need-reader-inventory.test.ts
    - lib/loot/__tests__/needs-boss-sentinel.test.ts
  modified: []

key-decisions:
  - "enforce_loot_item_need_rules is listed as a SQL 'branch' entry citing the PGlite test, because its body names loot_items in error text (the plan allowed it only if the scan found it; it did)"
  - "findBadVia requires every via file to be an 'exclude' entry, not just one of them, so a consumer cannot list a decoy exclude route beside an unfiltered one"
  - "findMissingMarkers also carries the 'agnostic' negative check, so one function reports both missing markers and item-column names"
  - "'ok' fixtures: the PGlite test needs the string 'need', every other cited test needs the literal kind: 'need' (chosen by a -pglite. path check)"

patterns-established:
  - "A new reader, payload consumer, SQL function or boss_name file fails CI until listed with a disposition"
  - "A redefined SQL function fails the definedIn check, which forces a re-review of its disposition"

requirements-completed: [DISC-06]

duration: 12min
completed: 2026-10-21
status: complete
---

# Phase 3 Plan 12: Reader Inventory and Needs Boss Sentinel Summary

**Source-scan tests that fail CI on any unlisted reader of the three loot tables (119 files, 16 SQL functions, 4 payload consumers) and prove the 'Needs' boss sentinel safe across every boss_name helper and all 50 boss_name files**

## Performance

- **Duration:** 12 min
- **Started:** 2026-10-21T22:46:01Z
- **Completed:** 2026-10-21T22:58:29Z
- **Tasks:** 3
- **Files modified:** 2 (both created)

## Accomplishments

- `need-reader-inventory.test.ts` scans app, lib, domain, utils, companion and discord-bot (55 readers, including the six RPC callers the table pattern misses), scripts (48 code files plus 12 SQL scripts) and the companion and bot payload consumers (4 files). `NEED_READERS` holds 119 entries; a missing or stale entry fails the build.
- Every disposition is checked in the source: exclude, guard, key, branch and label markers; 'agnostic' sources name no wowhead_id, wowheadId, boss_name, item_slot or allocation_cost; every 'ok' entry cites a test that exists and holds a need fixture; every 'consumer' entry's via names only NEED_READERS 'exclude' routes.
- `SQL_FUNCTION_READERS` lists the 16 functions whose latest migration definition names a table (save_submission_items, reset_guild_season, delete_guild, get_guild_submissions, the three recompute_blp functions and the Discovery triggers), with the migration holding each latest definition. 'agnostic' bodies are item-column free; 'ok', 'guard' and 'branch' entries cite the PGlite test and guard and branch bodies name `'need'`.
- Nine synthetic self-checks prove the scan has teeth (unlisted reader, missing marker, embed patterns, bad citations, agnostic source naming wowhead_id, created-then-dropped and re-created SQL functions, bad via, a temp companion tree that skips out, release, node_modules, .d.ts and .test.mjs).
- `needs-boss-sentinel.test.ts` proves `NEED_BOSS_NAME` sorts at 999 above every group label, survives `normalizeBossName`, returns null from `getBossImage`, `getBossPortrait` and `getBossQuote`, and appears in neither `CATALOG_GROUP_LABELS` nor `RAID_INSTANCE_NAMES`. `BOSS_NAME_READERS` lists all 50 boss_name files; order, lookup and items-only markers are checked in the source (items-only via an own filter or the `via` file).

## Task Commits

1. **Task 1: Tracer, reader files in code, scripts, companion and bot are inventoried** - `67d85be6` (test)
2. **Task 2: Markers, 'ok' citations, 'agnostic' sources, SQL function inventory, self-checks** - `a448cc7d` (test)
3. **Task 3: Needs boss sentinel and boss_name reader inventory** - `68d88145` (test)

**Plan metadata:** the docs commit following this summary.

## Reader dispositions as executed

The executed state matches the plan's tables with no difference. 03-17, 03-18 and 03-19 each record `## Reader fixes for 03-12: none`, and the five `Reader-fix-for-03-12` lines in git history all read `none`. The scan found exactly the 55 code readers, 48 script readers, 12 SQL scripts and 4 payload consumers the plan predicted, and exactly the 50 boss_name files its table lists (no new file from a wave-4 plan). 03-07 left the bootstrap route unchanged, so it stays 'ok' citing the 03-18 test.

SQL: the scan returned 16 functions. The plan's 12, plus enforce_loot_item_need_pin_refs, enforce_raid_tier_list_mode_rules and enforce_need_ranking_hold (03-01), plus enforce_loot_item_need_rules, whose body names loot_items in its error text. The D-27 delete lock (enforce_loot_item_need_delete_lock) did not appear, so its body names none of the tables as the 03-01 contract test requires.

## Files Created/Modified

- `lib/loot/__tests__/need-reader-inventory.test.ts` - reader inventory, disposition checks, SQL function scan and self-checks
- `lib/loot/__tests__/needs-boss-sentinel.test.ts` - sentinel through the boss helpers and the boss_name file inventory

## Decisions Made

- Listed enforce_loot_item_need_rules as 'branch' citing the PGlite test (its D-12 and D-17 cases), since the scan returns it.
- `findBadVia` demands every via file be an 'exclude' entry (stricter than "at least one"), which the four real consumers satisfy.
- Exported the scan helpers and constants from the test files so a reviewer reads one contract per file; the two files do not import each other, so the exclude marker is duplicated in the sentinel test with a comment saying to edit both together.

## Deviations from Plan

None - plan executed exactly as written. No disposition changed, no marker failed against real sources, and no entry needed re-labelling to make the scan pass.

## Issues Encountered

None. A first draft put enforce_loot_item_need_rules before enforce_loot_item_need_pin_refs and tripped the sort check; reordered.

## Known Stubs

None.

## Threat Flags

None. The plan only adds test files; no new endpoint, auth path or schema surface.

## Verification

- `npx vitest run lib/loot/__tests__/need-reader-inventory.test.ts lib/loot/__tests__/needs-boss-sentinel.test.ts lib/loot/__tests__/guild-scoped-lookup-catalog.test.ts`: 63 tests pass.
- `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring` plus the two new tests: 405 tests pass.
- `npm run typecheck`: clean. `npm run lint`: 0 errors (375 pre-existing warnings, none in the new files; `npx eslint` on both files is clean).
- Acceptance greps: MIN_READER_FILES = 45 (1), MIN_SCRIPT_READER_FILES = 40 (1), MIN_CONSUMER_FILES = 3 (1), `file: '` in the inventory test 119, in the sentinel test 52, `'Needs'` in data/raid-catalog-names.ts 0, discord-bot/ 3, companion/src/main/ 2, LootListContext 2.
- Full `npm test` is run by the orchestrator at wave end; no source file outside the two new tests changed.

## Next Phase Readiness

03-13 and 03-14 must add their new reader files (the need-row seeder, the list-mode PATCH) to NEED_READERS, and any new boss_name file to BOSS_NAME_READERS, in the commits that create them. Shipping: last plan of PR 3 (need readers); the owner handles PR grouping at ship time and nothing was pushed.

## Self-Check: PASSED

- FOUND: lib/loot/__tests__/need-reader-inventory.test.ts
- FOUND: lib/loot/__tests__/needs-boss-sentinel.test.ts
- FOUND commits: 67d85be6, a448cc7d, 68d88145

---
*Phase: 03-discovery-schema-and-need-pipeline*
*Completed: 2026-10-21*
