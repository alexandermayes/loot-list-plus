---
phase: 03-discovery-schema-and-need-pipeline
plan: 19
subsystem: api
tags: [need-rows, loot-history, bulk-award, blp, discord, discovery, vitest]
status: complete

requires:
  - phase: 03-discovery-schema-and-need-pipeline
    provides: "03-02 Discovery migration deployed and types regenerated; 03-04 need-aware domain helpers; 03-15 PGlite proof of need BLP accrual"
provides:
  - "Bulk award route test: a need row at a raid event with BLP on inserts loot_item_id = the need row, no awarded_item_id key, and schedules recomputeBlpForItems with [needId]"
  - "History-row builder tests: buildBulkAwardRow, buildAddonAwardRow and buildRemoveItemHistoryRow keep a need id and carry no awarded_item_id key"
  - "Discord tests: a need award renders as bold text with no Wowhead link in the loot announcement, and as the plain name with no link in the post-raid summary line"
affects: [03-12 reader inventory, 05 Drop Desk award path]

tech-stack:
  added: []
  patterns:
    - "Need-row fixture (kind 'need', need_key trinket.healing, Needs boss) in each test file; the literal kind: 'need' is what the 03-12 inventory checks"
    - "Append-only additions; fixtures that carry extra need columns are assigned through a typed variable so the fake's ItemRow type is not widened"

key-files:
  created: []
  modified:
    - app/api/loot-history/bulk/__tests__/route.test.ts
    - lib/loot/__tests__/loot-history-rows.test.ts
    - lib/__tests__/discord-loot-announcements.test.ts
    - lib/__tests__/discord-raid-summary.test.ts

key-decisions:
  - "No reader needed a fix: the bulk route, history-row builders and both Discord helpers handle a need row by id or render a null wowhead id as plain text, as research E3 and E5 predicted"
  - "The post-raid summary asserts the plain name, not bold: the summary has never bolded item names, and an existing case pins the plain form for a null wowhead id"

patterns-established:
  - "Need awards are fixtures past the D-22 hold; 03-15 proves the BLP SQL and this plan proves the route hands it the need id"

requirements-completed: [DISC-07, DISC-06]

duration: 10 min
completed: 2026-10-21
actuals:
  tokens: 4500
  tasks: 2
  commits: 2
---

# Phase 3 Plan 19: Need Awards Reach History, BLP and Discord Summary

**Fixture tests prove a need award (past the D-22 hold) is recorded on the need row with no awarded_item_id, hands the need id to the unchanged BLP recompute, survives every history-row builder, and posts to Discord without a broken Wowhead link; no source file needed a change.**

## Performance

- **Duration:** about 10 min
- **Tasks:** 2 of 2
- **Files:** 4 test files extended, 0 source files changed

## Accomplishments

- Bulk POST: a need row at a raid event with `blp_enabled` returns 200, inserts `loot_item_id` = the need id with the server-resolved `raid_tier_id`, has no `awarded_item_id` key, and calls `recomputeBlpForItems(client, guildId, [needId])`.
- `buildBulkAwardRow`, `buildAddonAwardRow` and `buildRemoveItemHistoryRow` given a need scope return `loot_item_id` = the need id and no `awarded_item_id` key.
- Loot announcement: a need with a null `wowhead_id` posts as `**Trinket, Healing** → **Thrall**` with no `wowhead.com` and no markdown link.
- Post-raid summary: a need line is `Trinket, Healing → Thrall` with no `wowhead.com` and no link.

## Task Commits

1. **Task 1 (tracer): bulk route and history-row builders keep the need id and BLP recompute gets it** - `2c31903f` (test)
2. **Task 2: a need award posts to Discord as plain text with no wowhead link** - `003ac1a9` (test)

## Tracer gate

Auto mode was not active and `human_verify_mode` is `end-of-phase`, so the tracer's human-verify stop is deferred to phase end. The tracer `<verify>` (`npx vitest run app/api/loot-history/bulk lib/loot/__tests__/loot-history-rows.test.ts && npm run typecheck`) passed before task 2 started.

## Reader fixes for 03-12

none. No file in the conditional source list changed (`app/api/loot-history/bulk/route.ts`, `lib/loot/loot-history-rows.ts`, `lib/discord-loot-announcements.ts`, `lib/discord-raid-summary.ts`), so both commit messages carry `Reader-fix-for-03-12: none`. 03-12 can list all four readers as ok, citing these test files (each carries the `kind: 'need'` literal):

- `app/api/loot-history/bulk/route.ts`: ok, `app/api/loot-history/bulk/__tests__/route.test.ts`
- `lib/loot/loot-history-rows.ts`: ok, `lib/loot/__tests__/loot-history-rows.test.ts`
- `lib/discord-loot-announcements.ts`: ok, `lib/__tests__/discord-loot-announcements.test.ts`
- `lib/discord-raid-summary.ts`: ok, `lib/__tests__/discord-raid-summary.test.ts`

## Verification

- `npx vitest run app/api/loot-history lib/loot/__tests__/loot-history-rows.test.ts lib/__tests__/discord-loot-announcements.test.ts lib/__tests__/discord-raid-summary.test.ts` : 4 files, 114 tests pass
- `npm run typecheck` : exit 0
- `npm run lint` : 0 errors (375 pre-existing warnings, none in these files)
- Acceptance greps: `recomputeBlpForItems` appears 36 times and `kind: 'need'` once in the bulk route test; `awarded_item_id` appears 7 times in the rows test
- `git diff --numstat` on the bulk route test and rows test shows 38 and 47 added lines and 0 deleted
- Reader-fix record check: no conditional source file differs from the merge base, so the loop passes trivially for both tasks

## Deviations from Plan

None to code. One wording note on the plan itself: the Task 2 behavior and the must-have say the post-raid summary line contains the "bold name". `formatRaidSummaryLootLine` has always rendered a null wowhead id as the plain name (no bold), and an existing case pins `Mystery Blade → Thrall`. The need case therefore asserts the plain name with no link, which satisfies the intent (no broken Wowhead link) without changing item output. Only the loot announcement renders bold. If the owner wants bold need names in the summary, that is a separate copy decision for the Phase 4 review.

One type-only edit to an existing line: the `items` element type in `makeFakeSupabase` options in `discord-loot-announcements.test.ts` gained an optional `kind?: string` so a need fixture can carry `kind: 'need'`. No test case changed.

## Decisions Made

See key-decisions above.

## Issues Encountered

None. A combined vitest, typecheck and lint command exceeded the shell timeout once and was rerun in parts; all passed.

## Known Stubs

None.

## Threat Flags

None. T-03-19-01 (cross-guild need award) rests on the unchanged `resolveGuildLootItemIds` and the 03-15 and 03-18 proofs; T-03-19-02 (award missing from history or BLP) is mitigated by the insert and recompute assertions and the builder cases; T-03-19-03 (a failing reader papered over) did not occur since no case failed.

## Next Phase Readiness

03-12 (reader inventory) can cite an existing need test for each of these four readers. PR 3 (need readers) opens only after the PR 1 deploy and PR 2 merge recorded in 03-02.

## Self-Check: PASSED

- All four test files exist and carry `kind: 'need'`; commits `2c31903f` and `003ac1a9` exist
