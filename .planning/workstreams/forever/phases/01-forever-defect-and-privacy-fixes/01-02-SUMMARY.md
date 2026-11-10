---
phase: 01-forever-defect-and-privacy-fixes
plan: 02
subsystem: api
tags: [nextjs, supabase, typescript, pagination, companion, blp, vitest]

requires:
  - phase: none
    provides: first phase of the forever workstream
provides:
  - "GET /api/addon/guild-data returns real blp[characterId][lootItemId] from blp_tracking and priorities[lootItemId] from guild_item_priorities (guild_id plus raid_tier_id filters)"
  - "createTypedServiceRoleClient(): SupabaseClient<Database>, so a nonexistent table or filter column fails typecheck (@ts-expect-error guard test)"
  - "selectAllPagesOrThrow exported from utils/supabase/paginate.ts: error-checked paged reads"
  - "guild-data pages blp_tracking, guild_item_priorities, loot_items, loot_submissions and attendance_records past the 1000-row cap, each ordered by a unique column list"
  - "Every guild-data read, loot_history included, answers 500 { error: 'Internal server error' } plus trackApiError on failure (owner decision 7)"
  - "Companion test proving a route 500 reaches ApiClient.getGuildData() as a thrown error"
affects: [01-04 bot routes (switch to selectAllPagesOrThrow), 01-05 typed-client scan test, 01-07 export-string, phase-01 shipping split (PR 3)]

actuals:
  tokens: 11069
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Typed service-role factory that delegates to the untyped one, so existing test mocks of createServiceRoleClient keep working"
    - "readOrThrow / readRowsOrThrow wrap every PostgREST result so any error throws into the route catch (500 plus trackApiError)"
    - "Paged reads order by a unique column or a column list ending in one"
    - "Route test fake cuts every read at max_rows (1000) like the server and throws on tables outside its allow-list"

key-files:
  created:
    - utils/supabase/typed-service-role.ts
    - utils/supabase/__tests__/typed-service-role.test.ts
    - companion/src/main/__tests__/api-client.test.ts
  modified:
    - utils/supabase/paginate.ts
    - utils/supabase/__tests__/paginate.test.ts
    - app/api/addon/guild-data/route.ts
    - app/api/addon/guild-data/__tests__/route.test.ts

key-decisions:
  - "Owner decision 7 (2026-10-13): a failed loot_history read behind fetchReceivedCounts answers 500 like every other guild-data read; the throw lives in the route and lib/addon/member-ranked-items.ts is unchanged"
  - "Page loot_items in guild-data as well (open question 7 adopted): MoP catalogs pass 1700 items per guild"
  - "loot_submissions read oldest first (created_at then id) so buildMemberRankedItems' keep-the-last rule means the newest approved submission wins; the read had no ORDER BY before"
  - "raid_tiers, raid_events, character_guild_memberships and raid_team_members stay single reads, bounded by query shape or one guild's registered characters (plan assumption, recorded below)"
  - "Narrowing only at typed-client points (no ?? false or ?? 0 substitutions): null character_id submissions filtered, null raid_event_id guard, Json casts"

patterns-established:
  - "createTypedServiceRoleClient is the factory for addon and bot routes; the untyped createServiceRoleClient stays for the rest of the app (accepted debt, plan 01-05 guards addon and bot routes)"
  - "selectAllPagesOrThrow sits beside paginatedSelect, whose callers still ignore page errors (accepted debt)"

requirements-completed: [FIX-02, FIX-06]

coverage:
  - id: D1
    description: "guild-data sends real BLP and item priorities read from blp_tracking and guild_item_priorities, filtered by the request guild (and raid tiers for priorities)"
    requirement: "FIX-02"
    verification:
      - kind: unit
        ref: "app/api/addon/guild-data/__tests__/route.test.ts#B1 and B2"
        status: pass
    human_judgment: false
  - id: D2
    description: "Any guild-data database error, the loot_history read included, answers 500 with a generic body and one trackApiError call"
    requirement: "FIX-02"
    verification:
      - kind: unit
        ref: "app/api/addon/guild-data/__tests__/route.test.ts#X1 (all 13 tables), X2 (second page), G4"
        status: pass
    human_judgment: false
  - id: D3
    description: "A route 500 reaches the companion as a thrown error from ApiClient.getGuildData()"
    requirement: "FIX-02"
    verification:
      - kind: unit
        ref: "companion/src/main/__tests__/api-client.test.ts#C1"
        status: pass
    human_judgment: false
  - id: D4
    description: "Large guilds are never cut at 1000 rows: BLP, priorities, items, submissions and attendance are paged and ordered by a unique column list"
    requirement: "FIX-02"
    verification:
      - kind: unit
        ref: "utils/supabase/__tests__/paginate.test.ts (selectAllPagesOrThrow) and route.test.ts#P1 to P6"
        status: pass
    human_judgment: false
  - id: D5
    description: "Empty and expansion-less guilds (no settings, BLP, priorities, events or active expansion) still answer 200 with empty values"
    requirement: "FIX-02"
    verification:
      - kind: unit
        ref: "app/api/addon/guild-data/__tests__/route.test.ts#E1 to E5"
        status: pass
    human_judgment: false
  - id: D6
    description: "A nonexistent table or filter column on the typed service-role client fails typecheck, and the guild-data test fake throws on unknown tables"
    requirement: "FIX-06"
    verification:
      - kind: unit
        ref: "utils/supabase/__tests__/typed-service-role.test.ts (three @ts-expect-error lines, TS2578 non-vacuity check) and route.test.ts#B4"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (ignoring .next/) reports 0 errors"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-10-13
status: complete
---

# Phase 01 Plan 02: Companion guild-data real BLP and priorities, paged and honest Summary

**The companion's guild-data route now reads blp_tracking and guild_item_priorities through a typed Supabase client, pages every large read past the 1000-row cap, and answers 500 (not an empty or partial list) on any database error, loot_history included.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-10-13T21:00:09Z
- **Completed:** 2026-10-13T21:20:07Z
- **Tasks:** 2 (Task 1 tracer, Task 2)
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments

- An officer's companion now gets each raider's real bad-luck protection counts and the guild's item priorities; before this, both lists were always empty because the route read tables that do not exist.
- A database failure now reaches the companion as a sync error: the route answers 500 on any failed read (owner decision 7 covers the loot_history read behind the received-item skip), and a companion test proves `getGuildData()` rejects with the route's message.
- Large guilds are no longer silently cut at the server's 1000-row cap: blp_tracking, guild_item_priorities, loot_items, loot_submissions and attendance_records are paged, each ordered by a unique column or a column list ending in one.
- A misspelled table can no longer reach officers: `createTypedServiceRoleClient()` makes a nonexistent table or filter column a typecheck error, and the guild-data test fake throws on tables outside its allow-list.

## Task Commits

1. **Task 1: Tracer: the companion gets real BLP and priorities from guild-data through the typed client** - `f6bea151` (fix)
2. **Task 2: Large and empty guilds get complete, honest guild-data, and a database error reaches the companion** - `221c9178` (fix)

**Plan metadata:** recorded by the docs commit that carries this file (docs: complete plan)

The tracer gate after Task 1 was approved by the user, who also gave standing approval for any further tracer gate in this phase.

## Exported signatures (consumed by plans 01-04, 01-05, 01-07)

```ts
// utils/supabase/typed-service-role.ts
export type TypedServiceClient = SupabaseClient<Database>
export function createTypedServiceRoleClient(): TypedServiceClient   // delegates to createServiceRoleClient

// utils/supabase/paginate.ts
export async function selectAllPagesOrThrow<T>(
  label: string,
  fetchPage: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<T[]>   // throws `Failed to read ${label}: ${message}`; a page of exactly pageSize requests one more page
```

## TS2578 non-vacuity check (Task 1)

With `TypedServiceClient` temporarily set to plain `SupabaseClient`, `tsc` reported TS2578 (unused `@ts-expect-error`) at `typed-service-role.test.ts` lines 14, 16 and 18. It was reverted; the committed type is `SupabaseClient<Database>` and `tsc` reports 0 errors.

## Bounded single reads (not paged, by plan assumption)

These reads stay single queries; each still answers 500 on error:

- `raid_tiers`: one expansion's tiers, a handful of rows.
- `raid_events`: `.limit(rolling_attendance_weeks * 7)`, 28 by default; only a setting of 143 weeks or more could reach 1000.
- `character_guild_memberships`: the active memberships of one guild; would need more than 1000 registered characters to truncate.
- `raid_team_members`: unique on guild_id and character_id; same bound.

## Files Created/Modified

- `utils/supabase/typed-service-role.ts` - typed factory delegating to the untyped service-role client
- `utils/supabase/__tests__/typed-service-role.test.ts` - delegation test plus three `@ts-expect-error` compile-time guards
- `utils/supabase/paginate.ts` - added `selectAllPagesOrThrow`; `paginatedSelect` untouched
- `utils/supabase/__tests__/paginate.test.ts` - seven tests for the new helper (exact page, pageSize + 1, empty, second-page error, default size 1000 and 1001)
- `app/api/addon/guild-data/route.ts` - real tables, typed client, error-checked and paged reads, null-expansion and empty-tier skips
- `app/api/addon/guild-data/__tests__/route.test.ts` - rewritten fake (allow-list, recorded orders, max_rows cut, maybeSingle, fail option) and tests B1-B4, P1-P6, E1-E5, X1-X2, G4
- `companion/src/main/__tests__/api-client.test.ts` - three tests: 500 rejects with the route message, no-JSON failure, 200 resolves with BLP

## Decisions Made

See `key-decisions` above. In short: owner decision 7 (500 on a failed loot_history read) is implemented in the route, `loot_items` is paged (open question 7), and submissions are read oldest first so the newest wins deterministically.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's P3 fixture contradicted the plan's own bounded-membership assumption**
- **Found during:** Task 2 (guild-data paging tests)
- **Issue:** The behavior list asks for 1001 approved submissions from 1001 active raiders. The memberships read is a single query by plan decision, so a 1001-raider fixture is cut at 1000 memberships by the max_rows-aware fake, and the 1001st raider never appears in `members`.
- **Fix:** The test uses 1000 active raiders and 1001 submissions (raider sc0 holds an older phase 1 and a newer phase 4 submission, the newer being the 1001st). It still proves the submissions read is paged (ranges `(0,999)` and `(1000,1999)`) and that the 1001st submission is used (last wins). The memberships read stays a single query, as the plan's assumption states.
- **Files modified:** `app/api/addon/guild-data/__tests__/route.test.ts`
- **Verification:** P3 passes; it fails if the submissions read is unpaged.
- **Committed in:** `221c9178`

**Test-infrastructure addition (not a deviation from behavior):** the fake now cuts every read at 1000 rows, like the server, so a route that forgets to page a large table fails its test instead of passing against an uncapped fake.

---

**Total deviations:** 1 auto-fixed (1 test fixture bug)
**Impact on plan:** No scope change. Note for the owner: a guild with more than 1000 active memberships would still have its members list cut at 1000. The plan recorded this as an accepted bound; paging that read is a small follow-up if the owner wants it closed.

## Issues Encountered

- A scratch copy of `typed-service-role.ts` from the Task 1 non-vacuity check sits in the scratchpad directory; the committed file is correct.
- `utils/supabase/__tests__/paginate.test.ts` carries two pre-existing eslint warnings (unused `_end` and `end` arguments in the older `paginatedSelect` tests); not touched.

## Verification Results

- `npx vitest run utils/supabase app/api/addon lib/addon companion/src/main/__tests__`: 14 files, 255 tests pass.
- `npx tsc --noEmit` ignoring `.next/`: 0 errors.
- `npx eslint app/api/addon/guild-data utils/supabase companion/src/main/__tests__/api-client.test.ts`: 0 errors (2 pre-existing warnings).
- `git diff --stat -- companion/src app/api/bot domain/scoring app/api/addon/export-string` shows only the new companion test; no bot, scoring or export-string change.
- Acceptance greps: `export async function selectAllPagesOrThrow` count 1; `selectAllPagesOrThrow(` in the route count 5.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path or schema change; the guild_id filter on blp_tracking and guild_item_priorities (T-02-02) is asserted by B1 and B2, and the 500 body is generic (T-02-03).

## Next Phase Readiness

- Plan 01-07 (export-string) can consume `createTypedServiceRoleClient` and `selectAllPagesOrThrow`.
- Plan 01-04 should switch `app/api/bot/priority/route.ts` to the exported `selectAllPagesOrThrow`; plan 01-05 adds the scan test that all addon and bot routes use the typed client.
- Shipping: PR 3 (a `fix/...` branch) carries plans 01-02 and 01-07; PR 3 must merge before PR 4.

## Self-Check: PASSED

Created files exist on disk (typed-service-role.ts and its test, api-client.test.ts), `paginate.ts` and `route.ts` are present, both task commits (`f6bea151`, `221c9178`) are found in git, and the plan's test, typecheck and lint verification passed as listed above.

---
*Phase: 01-forever-defect-and-privacy-fixes*
*Completed: 2026-10-13*
