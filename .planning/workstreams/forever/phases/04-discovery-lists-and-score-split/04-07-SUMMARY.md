---
phase: 04-discovery-lists-and-score-split
plan: 07
subsystem: api
tags: [supabase, postgrest, pagination, proxy, redirect, vitest, master-sheet, prio-list]

requires:
  - phase: 03-discovery-schema-and-need-pipeline
    provides: "need rows in loot_items (kind), keepRankedNeedRows, fetchTierNeedRows, selectAllPagesOrThrow, the WR-02 and WR-03 review findings"
provides:
  - "POST /api/master-sheet/visibility reads items and rankings in chunks of at most 100 ids through selectAllPagesOrThrow; a rejected page answers 500 instead of an empty rankings list"
  - "The master sheet's ranked-need BLP GET sends at most 100 need ids per request (BLP_NEED_ID_CHUNK)"
  - "GET /api/prio-list selects kind and drops need-row priorities with isNeedRow; POST refuses a need-row item_id with 400 and NEED_ROW_FIXED_ERROR before any write"
  - "proxy.ts carries the query string in next, so the Set your 5 link keeps guild and picker through sign-in"
  - "A prio-list test whose fake honours the recorded select list, so it fails if the route stops selecting kind"
affects: [04-08, 04-11, 04-13, 04-18, 04-19]

actuals:
  tokens: 7750
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Id lists read through .in() go in chunks of 100 (VISIBILITY_ID_CHUNK), each chunk through selectAllPagesOrThrow, so a Forever phase's 435 need ids never overrun the URL and a failed page throws into the route catch"
    - "Test fakes project the recorded select list onto their fixtures, so a test fails when the route stops asking for a column it relies on"

key-files:
  created:
    - lib/__tests__/proxy-next.test.ts
  modified:
    - app/api/master-sheet/visibility/route.ts
    - app/api/master-sheet/visibility/__tests__/route.test.ts
    - app/(app)/master-sheet/components/MasterSheetContent.tsx
    - app/api/prio-list/route.ts
    - app/api/prio-list/__tests__/route.test.ts
    - proxy.ts

key-decisions:
  - "Chunked rankings keep a deterministic order (chunks in input order, rows by id within a chunk); the master sheet keys rankings by submission and item, so the order across chunks is not observable"
  - "The ranked-need BLP chunks run through Promise.all and merge into blpDataMap; the item-only BLP GET and the keepRankedNeedRows call are untouched (D-13)"
  - "POST /api/prio-list reads the loot_items row through the service client after the permission check and before the existence read, and a failed read answers 500 so the need check is never skipped"
  - "The proxy test drives the real proxy() with no auth cookies, which refreshSupabaseSession already treats as signed out before any network call, so nothing needed mocking"

patterns-established:
  - "Id-list reads: chunk at 100, page with selectAllPagesOrThrow, let the route catch answer 500"
  - "Sign-in redirect: next is pathname plus search, and isSafeNextPath stays the single guard on the return trip"

requirements-completed: [DISC-05, DISC-11]

coverage:
  - id: D1
    description: "Master sheet visibility reads items and rankings in chunks of at most 100 ids, and a failed page answers 500 with no rankings key"
    requirement: "DISC-05"
    verification:
      - kind: unit
        ref: "app/api/master-sheet/visibility/__tests__/route.test.ts#WR-02: id reads go in chunks of at most 100 and a failed page answers 500"
        status: pass
    human_judgment: false
  - id: D2
    description: "The ranked-need BLP GET on the master sheet sends at most 100 need ids per request, and only ranked needs still show (D-13)"
    requirement: "DISC-05"
    verification:
      - kind: other
        ref: "npm run typecheck; keepRankedNeedRows call unchanged (grep)"
        status: pass
    human_judgment: true
    rationale: "MasterSheetContent has no component test for the BLP chunking; it was verified by typecheck and by reading the loop. A real Forever master sheet with more than 100 ranked needs is the first true exercise."
  - id: D3
    description: "prio-list GET drops need-row priorities and POST refuses a need-row item_id before any write, with tests that fail if the route regresses"
    requirement: "DISC-11"
    verification:
      - kind: unit
        ref: "app/api/prio-list/__tests__/route.test.ts#GET and POST /api/prio-list"
        status: pass
    human_judgment: false
  - id: D4
    description: "A signed-out request for a path with a query is redirected to sign-in with next carrying path and query, accepted by isSafeNextPath"
    requirement: "DISC-11"
    verification:
      - kind: unit
        ref: "lib/__tests__/proxy-next.test.ts#proxy.ts: the sign-in redirect keeps the query string in next (D-24)"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-11-10
status: complete
---

# Phase 04 Plan 07: Visibility reads, prio-list need rows and the sign-in query Summary

**Chunked, error-checked master sheet reads (100 ids per .in(), failed page is a 500), need rows kept out of officer prio, and a sign-in redirect that keeps the Set your 5 link's query.**

## Performance

- **Duration:** about 9 min
- **Tasks:** 3 (1 tracer, 2 TDD)
- **Files modified:** 7 (1 created, 6 modified)
- **Commits:** 5 task commits

## Accomplishments

- **Visibility route (WR-02, D-26 amended).** `filterItemsToEarnedPhases` and the rankings read now loop over ids in chunks of `VISIBILITY_ID_CHUNK = 100`, each chunk through `selectAllPagesOrThrow`. The old rankings loop ignored `error` and treated a failed page as "no rankings"; a failed page now throws into the route's existing catch and answers 500. `paginatedSelect` is gone from the route.
- **Master sheet client.** The ranked-need BLP GET is sent in chunks of 100 ids and merged into `blpDataMap`. The item-only BLP GET and `keepRankedNeedRows` are unchanged, so a Discovery tier still shows only needs someone ranked (D-13). The stale comment that said need ids never reach a GET URL is corrected.
- **prio-list (WR-03, D-03, D-26 amended).** GET selects `kind` in the `loot_item` embed and drops need-row priorities with `isNeedRow`. POST reads the `loot_items` row first and answers 400 with `NEED_ROW_FIXED_ERROR` for a need row before any read or write of `guild_item_priorities`; a failed read answers 500. The test fake now projects the recorded select list onto its fixture, so removing `kind` from the route or the `isNeedRow` filter fails the test (the old test passed either way and pinned the opposite behaviour).
- **Proxy (D-24 amended).** `next` is now `pathname + request.nextUrl.search`. A signed-out `/loot-list?guild=<uuid>&picker=1` lands on sign-in with the full path and query in `next`, `isSafeNextPath` accepts it, `/overview` still carries `/overview`, and a query that looks like a redirect (`?next=//evil.example`) stays same-origin.

## Task Commits

1. **Task 1 (tracer): chunked visibility reads and 500 on a bad page** - `60899ed0` (fix)
2. **Task 2 RED: failing prio-list need row tests** - `dbb8ffbd` (test)
3. **Task 2 GREEN: prio-list drops and refuses need rows** - `66af3341` (feat)
4. **Task 3 RED: failing sign-in query test** - `da959131` (test)
5. **Task 3 GREEN: proxy keeps the query in next** - `1b4d54f7` (fix)

## Tracer gate

The tracer's `<verify>` (`npx vitest run app/api/master-sheet/visibility`) and every acceptance criterion passed at commit time. I also ran the new tests against the original route to confirm they fail there (5 of the new tests failed), then restored the new route. Expansion continued without a checkpoint, as the orchestrator directed.

## Verification

- `npx vitest run app/api/master-sheet/visibility app/api/prio-list lib/__tests__/proxy-next.test.ts lib/__tests__/post-auth-redirect.test.ts app/api/addon/auth/__tests__/rate-limit.test.ts lib/loot/__tests__/need-reader-inventory.test.ts`: 6 files, 82 tests, all pass
- `npx vitest run "app/(app)/master-sheet" lib/loot`: 16 files, 302 tests, all pass
- `npm run typecheck`: exit 0
- `npm run lint`: 0 errors; 375 warnings, the same count as before this plan (none introduced)
- Acceptance greps: `selectAllPagesOrThrow` 4 (needs 2), `VISIBILITY_ID_CHUNK = 100` 1, `paginatedSelect` 0, `keepRankedNeedRows(` 1, `toBe(500)` 4, `isNeedRow(` 2, `NEED_ROW_FIXED_ERROR` 2, `kind` 3 (needs 2), `request.nextUrl.search` 1
- Inventory: `need-reader-inventory.test.ts` stays green with no edit. The visibility and prio-list entries keep their current disposition (the prio-list entry still cites its own test; 04-19 changes its disposition).

## Deviations from Plan

None in behaviour. One wording difference: Task 3 said to mock the session refresh the way `rate-limit.test.ts` does, but that test mocks nothing. `refreshSupabaseSession` returns a null user for a request with no auth cookies before any network call, so `proxy-next.test.ts` drives the real `proxy()` unmocked. Same assertions, less fake.

**Total deviations:** 0 auto-fixed. **Impact:** none.

## Authentication Gates

None.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. The only new read is the `loot_items` lookup in prio-list POST, behind the existing officer check and inside the existing trust boundary. Threats T-04-07-01 to T-04-07-04 are mitigated and each has a test (chunk sizes, 500 on a failed page, need-row 400, same-origin `next`).

## Next Phase Readiness

Ready for the other wave 1 plans. Plans that rank needs (04-08, 04-11) can now rely on the master sheet reading up to 435 need ids per phase safely, and 04-13 and 04-18 can rely on the Set your 5 link surviving sign-in. Shipping note: this belongs in PR 2 (the first code PR); it reads no new column.

## Self-Check: PASSED

All seven files exist and all five task commits are in the log.
