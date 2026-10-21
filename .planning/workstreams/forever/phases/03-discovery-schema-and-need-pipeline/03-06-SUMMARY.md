---
phase: 03-discovery-schema-and-need-pipeline
plan: 06
subsystem: api
tags: [addon, companion, gargul, discord-bot, need-rows, vitest, discovery]
status: complete

requires:
  - phase: 03-discovery-schema-and-need-pipeline
    provides: plan 03-02 database types (loot_items.kind), 03-04 isNeedRow, 03-05 createNeedSkipScope and noteNeedSkipped
provides:
  - guild-data reads loot_items with kind = 'item' and drops need-keyed blp rows through a loot_items (kind) embed
  - buildMemberRankedItems with an explicit need branch and an optional NeedSkipScope third parameter
  - export-string flattens only item rows from the embedded tier items and drops need-keyed blp rows
  - formatRankingsForGargul skips kind 'need' through a named branch
  - bot /priority filters kind = 'item' on all three loot_items reads
affects: [03-07, 03-10, 03-12, phase-05, phase-06]

actuals:
  tokens: 9600
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "External consumers keyed by wowhead_id filter kind = 'item' in the query where the read is a flat loot_items read, and in the JS flatten where the rows arrive embedded under their tiers"
    - "A blp_tracking read embeds loot_items (kind) through the single FK and drops need rows with one noteNeedSkipped call per request"

key-files:
  created: []
  modified:
    - app/api/addon/guild-data/route.ts
    - app/api/addon/guild-data/__tests__/route.test.ts
    - lib/addon/member-ranked-items.ts
    - lib/addon/__tests__/member-ranked-items.test.ts
    - app/api/addon/export-string/route.ts
    - app/api/addon/export-string/__tests__/route.test.ts
    - domain/loot/gargul-dft.ts
    - domain/loot/__tests__/gargul-dft.test.ts
    - app/api/bot/priority/route.ts
    - app/api/bot/priority/__tests__/route.test.ts

key-decisions:
  - "The need branch in buildMemberRankedItems sits before the null-wowhead check and runs only for live rows (removed_at is checked first), so a removed need ranking is not counted as a skipped need"
  - "noteNeedSkipped logs the running count at the first skip; a request that skips a need ranking and need BLP rows warns once with skipped: 1 and the scope holds the final count"
  - "GargulDftItemRankings.item.wowhead_id widened to number | null so a need row (null id) type-checks; the existing non-positive id guard already handled null"
  - "The export-string debug head count of loot_items in the first tier still counts every row; it only feeds a console.log, so it was left alone"
  - "formatRankingsForGargul, fetchReceivedCounts and the payload builders keep their output shape: the kind field never reaches a payload because both routes map items to explicit keys"

patterns-established:
  - "Fake clients in route tests default a fixture row's kind to 'item' (like the column default) and resolve a blp_tracking loot_items embed from the loot_items fixture"

requirements-completed: [DISC-06]

coverage:
  - id: D1
    description: "GET /api/addon/guild-data reads loot_items with kind = 'item' only, so items[] never holds a null wowhead_id row"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "app/api/addon/guild-data/__tests__/route.test.ts#N1 loot_items is read with kind = item, and a need row never appears in items"
        status: pass
    human_judgment: false
  - id: D2
    description: "A ranked need and need-keyed blp never appear in guild-data or export-string members[].items and blp; the request warns once with the reader name"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "app/api/addon/guild-data/__tests__/route.test.ts#N2 and N3; app/api/addon/export-string/__tests__/route.test.ts#N2 and N3; lib/addon/__tests__/member-ranked-items.test.ts#skips a need entry through the kind branch"
        status: pass
    human_judgment: false
  - id: D3
    description: "A guild with no ranked need rows gets the same guild-data and export-string payloads, keys included, as the item-only fixture"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "guild-data N4 and export-string N4, plus every pre-existing case unchanged"
        status: pass
    human_judgment: false
  - id: D4
    description: "export-string flattens only item rows, so stats and the import string count items only"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "app/api/addon/export-string/__tests__/route.test.ts#N1 the flattened items, the import string and stats count the item only"
        status: pass
    human_judgment: false
  - id: D5
    description: "formatRankingsForGargul skips need rows through a named branch and the item block is byte-identical"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/gargul-dft.test.ts#skips need rows"
        status: pass
    human_judgment: false
  - id: D6
    description: "Bot /priority filters kind = 'item' on the visible search, the hidden search and the sibling-row read, so 'chest' never answers with a need"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "app/api/bot/priority/__tests__/route.test.ts#D-14 and DISC-06: the bot never answers with a need row"
        status: pass
    human_judgment: false
  - id: D7
    description: "Every changed read still throws on a read error and answers 500"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "guild-data N5 and the X1 per-table cases; export-string N5 and the X cases; bot D-04 cases"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-10-21
---

# Phase 03 Plan 06: External consumers stay item-only Summary

**Kind filters and explicit need branches keep the companion guild-data payload, the in-game import string, the Gargul block and the bot's /priority free of need rows, with a once-per-request warning when a need ranking or need BLP row is skipped.**

## Performance

- **Duration:** 6 min (14:15 to 14:21 local, 2026-10-21)
- **Tasks:** 3 (one tracer, two auto, all TDD-flagged)
- **Files modified:** 10 (5 source, 5 test)

## Accomplishments

- guild-data: `.eq('kind', 'item')` on the paged loot_items read, so the companion's `String(wowhead_id)` item table can never collide every need on `'null'` (T-03-06-01).
- `buildMemberRankedItems` gets a visible need branch and an optional `NeedSkipScope`; both routes pass one scope per request (`addon-guild-data`, `addon-export-string`).
- BLP in both routes is read with a `loot_items (kind)` embed and drops need-keyed rows, whatever expansion they belong to.
- export-string drops need rows while flattening the embedded tier items, keeping every tier in the result; stats and the string count items only.
- `formatRankingsForGargul` skips `kind: 'need'` before the wowhead check; the item block is byte-identical (29 added test lines, 0 removed).
- bot /priority filters `kind = 'item'` on all three loot_items reads (grep count 3).
- 417 tests pass across `app/api/addon`, `app/api/bot`, `lib/addon` and gargul-dft; `typed-client-usage.test.ts` still passes (routes stay on the typed client).

## Task Commits

1. **Task 1 (tracer): guild-data item-only** - `cbc72475` (feat)
2. **Task 2: import string and Gargul block item-only** - `4ef50521` (feat)
3. **Task 3: bot /priority item-only** - `e14ae849` (feat)

## Tracer gate

Task 1 was the tracer. Auto mode is off, but the config sets `workflow.human_verify_mode: end-of-phase`, so the interactive human-verify stop is deferred to the phase end. The tracer's automated verify (`npx vitest run app/api/addon/guild-data lib/addon/__tests__/member-ranked-items.test.ts utils/supabase/__tests__/typed-client-usage.test.ts` plus typecheck) passed before Tasks 2 and 3 started, and the full addon, bot and gargul set passed again at the end.

## Deviations from Plan

None - plan executed as written. Two notes that are not deviations:

- The plan's behaviour line for the need-skip warning says the request "logs one need-skip warning". `noteNeedSkipped` (03-05) logs the running count at the first positive skip, so the logged `skipped` is the count at that moment; the tests assert that value (1 for a ranked need seen first, 2 for two BLP rows noted in one call).
- TDD: each task's tests and implementation landed in one commit per task, as the plan's per-task commit structure asks, not as separate RED and GREEN commits.

## Size and effort

The plan sat at the 10-file threshold with a 95,000-token, low-confidence estimate and was left unsplit by owner decision (D-26). Actual: 10 files touched (5 source, 5 test), 474 lines added and 17 removed, about 9,600 tokens on the chars/4 scale over the realized diff, 3 tasks, 3 commits, 6 minutes. No task ran long. The estimate was high by roughly an order of magnitude because the routes already carried the typed client, paging and read-error handling from Phase 1, so each change was a filter, an embed field and a branch; the size risk did not materialize.

## Known Stubs

None.

## Threat Flags

None. No new endpoints, auth paths or schema surface; the changes only narrow what existing routes return. T-03-06-04 (log injection) holds: the warning's first argument is the fixed string from `lib/loot/need-skip.ts` and the reader name is a typed constant.

## Issues Encountered

None.

## Self-Check: PASSED

- All 10 modified files exist and are committed; commits `cbc72475`, `4ef50521`, `e14ae849` are on `gsd/v2.0-forever-loot`.
- Acceptance greps: `.eq('kind', 'item')` appears in guild-data (1) and bot priority (3); `createNeedSkipScope('addon-guild-data')` (1) and `createNeedSkipScope('addon-export-string')` (1); `isNeedRow(` in member-ranked-items (1); `skips need rows` in gargul-dft.test.ts (1); numstat deletions for gargul-dft.test.ts against origin/main: 0.
- Plan verification: `npx vitest run app/api/addon app/api/bot lib/addon domain/loot/__tests__/gargul-dft.test.ts` exits 0 (16 files, 417 tests); `npm run typecheck` exits 0; `npm run lint` exits 0 (0 errors, existing warnings only).
