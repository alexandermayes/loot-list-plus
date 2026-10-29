---
phase: 03-discovery-schema-and-need-pipeline
plan: 18
subsystem: api
tags: [need-rows, bootstrap, loot-submissions, prio-list, guild-scoped-lookup, addon-award, discovery, vitest]
status: complete

requires:
  - phase: 03-discovery-schema-and-need-pipeline
    provides: "03-02 Discovery migration deployed and types regenerated; 03-07 includeNeeds option on fetchFilteredLootItems (default false)"
provides:
  - "First test for GET /api/loot-list/bootstrap: the D-02 picker hold at the route (fetchFilteredLootItems called with exactly three arguments) and need ids in rankings and removedItems"
  - "First test for GET /api/loot-submissions: a need row id in rankings and removedItems like an item id; 401, 400, 403 answers"
  - "First test for GET /api/prio-list: a priority whose loot_item embed is a need row passes through unchanged; 401 and 403 answers"
  - "Need-row cases for findGuildLootItemsByWowheadIds (never returns a need row) and resolveGuildLootItemIds (resolves a guild need id, rejects another guild's)"
  - "Need-row cases for addonAwardKeys (a null wowhead id yields no key and no alternates)"
affects: [03-12 reader inventory, 03-19 need awards, 04 picker]

tech-stack:
  added: []
  patterns:
    - "Need-row fixture (kind 'need', need_key trinket.healing, Needs boss) carried in each route test; the literal kind: 'need' is what the 03-12 inventory checks"
    - "Chainable thenable query fake for route tests: every chain method returns the builder, terminal calls resolve from the fixture"
    - "Append-only additions to existing test files; fixtures cast a need row to the fake's ItemRow type instead of widening it, so no existing line is removed"

key-files:
  created:
    - app/api/loot-list/bootstrap/__tests__/route.test.ts
    - app/api/loot-submissions/__tests__/route.test.ts
    - app/api/prio-list/__tests__/route.test.ts
  modified:
    - lib/loot/__tests__/guild-scoped-lookup.test.ts
    - lib/loot/__tests__/addon-award-insert.test.ts

key-decisions:
  - "No reader needed a fix: all five readers handle a need row as predicted by research A1, A8, B10 and D6, so the plan is tests only"
  - "The D-02 hold test asserts the call has exactly three arguments (length 3), which proves includeNeeds cannot be passed at all rather than only that it is not true"

patterns-established:
  - "Route tests for service-role and session routes mock the supabase modules and answer each table from a fixture, keeping the real domain helpers"

requirements-completed: [DISC-06]

duration: 12 min
completed: 2026-10-21
actuals:
  tokens: 13000
  tasks: 3
  commits: 3
---

# Phase 3 Plan 18: Reader Tests for Need Rows Summary

**First tests for the bootstrap, loot-submissions and prio-list routes plus need cases for the wowhead lookups and addon award keys, proving each 'ok' reader handles a need row with no source change.**

## Performance

- **Duration:** about 12 min
- **Tasks:** 3 of 3
- **Files:** 3 test files created, 2 test files extended, 0 source files changed

## Accomplishments

- Bootstrap: `[D-02] picker stays items only` asserts `fetchFilteredLootItems` is called once with exactly three arguments (client, character, `[tier id]`). A saved need id at rank 50 slot 1 comes back in `rankings['50-1']` next to an item id at `49-1`, and a removed need row lands in `removedItems`. 401, 400, 403 and the empty no-tier payload are covered too.
- Loot-submissions GET: the need id is carried in `rankings` and `removedItems` exactly like an item id; 401, 400 and 403 are unchanged, and a missing submission still answers `{ submission: null, rankings: {} }`.
- Prio-list GET: a priority with one item embed and one need embed (`wowhead_id` null, `kind` 'need') answers 200 with both rows unchanged; 401 without a user and 403 to a non-member.
- `findGuildLootItemsByWowheadIds` returns only the item for `[19019]` and no need row for `[]` or unknown ids (the fake treats a null wowhead id as never matching, as Postgres does). `resolveGuildLootItemIds` resolves a guild need id with its tier and expansion like an item id and puts another guild's need id in `invalidIds` (D-15).
- `addonAwardKeys` with a need row's null wowhead id returns `{ key: null, alternateKeys: [] }`, with and without an `awardId`, so an addon award can never be keyed to a need.

## Task Commits

1. **Task 1 (tracer): bootstrap holds needs out of the picker and carries a need ranking by id** - `e7b588c9` (test)
2. **Task 2: loot-submissions GET and prio-list GET handle need rows** - `786682e7` (test)
3. **Task 3: wowhead lookups never return a need row; need ids resolve like item ids** - `3a3abc60` (test)

## Tracer gate

Auto mode was not active and `human_verify_mode` is `end-of-phase`, so the tracer's human-verify stop is deferred to phase end. The tracer `<verify>` (`npx vitest run app/api/loot-list/bootstrap && npm run typecheck`) passed before task 2 started.

## Reader fixes for 03-12

none. No file in the conditional source list changed (`app/api/loot-list/bootstrap/route.ts`, `app/api/loot-submissions/route.ts`, `app/api/prio-list/route.ts`, `lib/loot/guild-scoped-lookup.ts`, `lib/loot/addon-award-insert.ts`), so there is no `Reader-fix-for-03-12` line in any commit message. 03-12 can list all five readers as ok, citing these test files (each carries the `kind: 'need'` literal):

- `app/api/loot-list/bootstrap/route.ts`: ok, `app/api/loot-list/bootstrap/__tests__/route.test.ts`
- `app/api/loot-submissions/route.ts`: ok, `app/api/loot-submissions/__tests__/route.test.ts`
- `app/api/prio-list/route.ts`: ok, `app/api/prio-list/__tests__/route.test.ts`
- `lib/loot/guild-scoped-lookup.ts` (`findGuildLootItemsByWowheadIds`, `resolveGuildLootItemIds`): ok, `lib/loot/__tests__/guild-scoped-lookup.test.ts`
- `lib/loot/addon-award-insert.ts` (`addonAwardKeys`): ok, `lib/loot/__tests__/addon-award-insert.test.ts`

## Verification

- `npx vitest run app/api/loot-list/bootstrap app/api/loot-submissions/__tests__/route.test.ts app/api/prio-list lib/loot` : 12 files, 231 tests pass
- `npm run typecheck` : exit 0
- `npm run lint` : 0 errors (375 pre-existing warnings, none in these files)
- Acceptance greps: `kind: 'need'` present in all five test files (at least 1 each); `[D-02] picker stays items only` appears once; `includeNeeds` appears 0 times in the bootstrap route
- `git diff --numstat origin/main` on the two extended lookup tests shows 28 and 65 added lines and 0 deleted
- Reader-fix record check: no conditional source file differs from the merge base, so the loop passes trivially for all three tasks

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

See key-decisions above.

## Issues Encountered

None.

## Size and effort

The plan sat at the 10-file threshold on paper (five tests plus five conditional source files), but no source file changed, so the real footprint was three new test files and two extended ones (about 440 added lines). Context use was under the 60k-token, low-confidence estimate (about 13k tokens of written output by chars/4) and no task ran long. The size risk did not materialise because every reader worked by id or by wowhead id exactly as research predicted. The one friction point was the lookup test fake typing wowhead ids as `number`, solved with a cast in the new fixtures to keep the "no existing line removed" criterion.

## Known Stubs

None.

## Threat Flags

None. T-03-18-01 (needs reaching the picker through bootstrap) is mitigated by the three-argument assertion; T-03-18-02 (addon award keyed to a need) by the `addonAwardKeys` and wowhead lookup cases; T-03-18-03 (an 'ok' reader with no proof) by the new tests and the "none" record above.

## Next Phase Readiness

The remaining wave-4 plan is 03-12 (reader inventory), which can now cite an existing need test for each of these five readers. PR 3 (need readers) opens only after the PR 1 deploy and PR 2 merge recorded in 03-02.

## Self-Check: PASSED

- All five test files exist and carry `kind: 'need'`; commits `e7b588c9`, `786682e7` and `3a3abc60` exist
