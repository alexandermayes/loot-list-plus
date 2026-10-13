---
phase: 01-forever-defect-and-privacy-fixes
plan: 07
subsystem: api
tags: [nextjs, supabase, typescript, pagination, addon, blp, vitest]

requires:
  - phase: 01-forever-defect-and-privacy-fixes
    provides: "plan 01-02: createTypedServiceRoleClient, selectAllPagesOrThrow, the guild-data pattern"
provides:
  - "GET /api/addon/export-string carries real blp[characterId][lootItemId] from blp_tracking and priorities[lootItemId] from guild_item_priorities in the decoded import string"
  - "export-string runs on createTypedServiceRoleClient, so a nonexistent table fails typecheck"
  - "Every export-string read (guilds, guild_settings, expansions, get_guild_expansions, raid_tiers, loot_submissions, blp_tracking, guild_item_priorities, raid_events, attendance_records, raid_team_members, loot_history) answers 500 plus trackApiError on failure"
  - "blp_tracking, guild_item_priorities, loot_submissions and attendance_records paged past the 1000-row cap, each ordered by a unique column list"
affects: [01-05 typed-client scan test (this route is now on the typed client), phase-01 shipping split (PR 3 with plan 01-02)]

actuals:
  tokens: 12566
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "readOrThrow / readRowsOrThrow wrap every PostgREST result in the route (copy of guild-data's local helpers)"
    - "Paged reads order by a unique column or a column list ending in one"
    - "Route test fake cuts every read at max_rows (1000), throws on tables outside its allow-list, and records orders and ranges"

key-files:
  created: []
  modified:
    - app/api/addon/export-string/route.ts
    - app/api/addon/export-string/__tests__/route.test.ts

key-decisions:
  - "Owner decision 8 (2026-10-13): a failed loot_history read behind fetchReceivedCounts answers 500 (route throws, trackApiError, no exportString); lib/addon/member-ranked-items.ts is unchanged, so its null-return doc comment still describes the library contract, not the route"
  - "Submissions are read oldest first (created_at then id) so the newest approved submission wins buildMemberRankedItems' keep-the-last rule; the read had no ORDER BY before"
  - "Typed-client narrowing only, no value-changing defaults: nullable local interface fields widened, null character_id submissions and null raid_event_id records filtered by guards, Json columns passed through as Json"
  - "readOrThrow and readRowsOrThrow are local copies in the route (plan scope is two files); lifting them to a shared helper is a small follow-up"

patterns-established:
  - "Second addon route on the guild-data pattern: typed client, error-checked reads, paged large reads, allow-list fake"

requirements-completed: [FIX-02, FIX-06]

coverage:
  - id: D1
    description: "The decoded import string carries real BLP (times_passed from blp_tracking, filtered by the request guild) and priorities (from guild_item_priorities, filtered by guild and raid tiers, default bonuses when null)"
    requirement: "FIX-02"
    verification:
      - kind: unit
        ref: "app/api/addon/export-string/__tests__/route.test.ts#B1, B2, B3, N5"
        status: pass
    human_judgment: false
  - id: D2
    description: "Any export-string database error, the loot_history read included, answers 500 with a generic body, one trackApiError call and no exportString"
    requirement: "FIX-02"
    verification:
      - kind: unit
        ref: "app/api/addon/export-string/__tests__/route.test.ts#X1 (12 tables), X2 (RPC), X3 (second page), X5, E4"
        status: pass
    human_judgment: false
  - id: D3
    description: "Large guilds are never cut at 1000 rows: BLP, priorities, submissions and attendance are paged and ordered by a unique column list"
    requirement: "FIX-02"
    verification:
      - kind: unit
        ref: "app/api/addon/export-string/__tests__/route.test.ts#P1 to P5"
        status: pass
    human_judgment: false
  - id: D4
    description: "Empty guilds still answer: no settings row 200, no guild row 404, no raid tiers 200 without a priorities read, no events 200 without an attendance read"
    requirement: "FIX-02"
    verification:
      - kind: unit
        ref: "app/api/addon/export-string/__tests__/route.test.ts#N1 to N5"
        status: pass
    human_judgment: false
  - id: D5
    description: "export-string is on the typed service-role client and its test fake rejects unknown tables; the LLP1:1 prefix, stats keys and payload keys are unchanged"
    requirement: "FIX-06"
    verification:
      - kind: unit
        ref: "app/api/addon/export-string/__tests__/route.test.ts#B4, B5"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (ignoring .next/) reports 0 errors"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-10-13
status: complete
---

# Phase 01 Plan 07: Export-string real BLP and priorities, paged and honest Summary

**The in-game import string now carries the guild's real bad-luck protection counts and item priorities (read from blp_tracking and guild_item_priorities through the typed client), pages every large read past the 1000-row cap, and answers 500 instead of an empty or cut string on any database error, loot_history included.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-10-13T21:33:00Z (approximate; start time was not captured at spawn)
- **Completed:** 2026-10-13T21:41:25Z
- **Tasks:** 2 (Task 1 tracer, Task 2), each as a RED test commit and a GREEN code commit
- **Files modified:** 2

## Accomplishments

- A raider who pastes the import string into the addon gets the guild's real BLP counts and item priorities; before this, both were always empty because the route read `bad_luck_protection` and `item_priorities`, which do not exist.
- A database failure now reaches the officer as an error, not a string that silently lacks data. This covers the loot_history read behind the received-item skip too (owner decision 8): members[].items never go out without the skip.
- Large guilds are no longer cut at the server's 1000-row cap: blp_tracking, guild_item_priorities, loot_submissions and attendance_records are paged, each ordered by a unique column list.
- A misspelled table can no longer ship: the route uses `createTypedServiceRoleClient()` and the test fake throws on tables outside its allow-list.

## Task Commits

Each task was committed as a RED test commit followed by a GREEN code commit:

1. **Task 1: Tracer: the import string carries real BLP and priorities through the typed client**
   - RED: `521b1928` (test)
   - GREEN: `8d93c136` (fix)
2. **Task 2: Every import-string read is error-checked and complete**
   - RED: `f0ce4cda` (test)
   - GREEN: `d3ed00a3` (fix)

**Plan metadata:** recorded by the docs commit that carries this file (docs: complete plan)

The tracer feedback gate after Task 1 was passed under the user's standing approval for this phase (no stop; the tracer's tests and typecheck were green at `8d93c136`, and Task 2 expanded on it).

## Case-table coverage (Task 2, X1)

One test per table, each failing only that table's read: guilds, guild_settings, expansions, raid_tiers (the joined items read), character_guild_memberships, loot_submissions, guild_item_priorities, blp_tracking, raid_events, attendance_records, raid_team_members, loot_history (owner decision 8). Each answers 500 `{ error: 'Internal server error' }`, calls trackApiError once and returns no exportString. Further cases: X2 the `get_guild_expansions` RPC fallback, X3 a failure on the second page of blp_tracking, X5 the body never carries the database message, E4 (rewritten from "still returns 200" to the 500 expectation) and the existing X4 (memberships). `loot_items` is not in the table: its only direct read is the debug-only head count, left as is by plan.

## Paged reads

| Read | Order | Notes |
|------|-------|-------|
| blp_tracking | id | eq guild_id |
| guild_item_priorities | id | eq guild_id, in raid_tier_id over the tier ids; skipped when there are no tiers |
| loot_submissions | created_at, id | eq guild_id, eq status 'approved'; oldest first so the newest wins |
| attendance_records | id | in raid_event_id; skipped when there are no events |

Bounded single reads (not paged, per plan 01-02's assumptions): `raid_tiers` with embedded `loot_items` (max_rows applies to top-level tiers, not embedded rows), `raid_events` (`.limit(rolling_attendance_weeks * 7)`), `character_guild_memberships` and `raid_team_members` (one guild's registered characters).

## Typed-client narrowing points

All narrowing only; no default substitutions that change a value.

- `expansion.current_phase`, `guild.active_expansion_id`, `role`, `membership_status`, `wowhead_id`, `boss_name`, `raid_tier_id`: local interface fields widened to `| null`; the payload emits the same values as before. `raid_name` uses `item.raid_tier_id ? raidNameMap[item.raid_tier_id] : undefined`, which still yields `'Unknown'` for a null tier, as before.
- `attendance_records.raid_event_id`: a guard (`!rec.raid_event_id`) with a comment that the `.in()` filter makes a null impossible; it only narrows the type.
- `loot_submissions.character_id`: a type-guard filter before `buildMemberRankedItems`, with a comment that a row without a character belongs to no member.
- Priority Json columns: `BuildPayloadArgs.priorities` carries `Json | null`, passed through unchanged; the `|| {}` and `|| { role: 5, class: 3, character: 2 }` defaults already existed.

## Payload shape confirmation

The decoded payload keys (`guildId, guildName, expansionId, phase, settings, items, members, priorities, blp, attendance`), the `stats` keys and the `LLP1:1:` prefix are asserted unchanged by test B5. The priorities map keeps the loot item id as key (`prioritiesMap[p.item_id]`).

## Decisions Made

See `key-decisions` above. In short: owner decision 8 (500 on a failed loot_history read) is implemented in the route, submissions are read oldest first, and the 500 body is generic while PostgREST messages stay in the server log.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's P3 fixture contradicted the plan's own bounded-membership assumption**
- **Found during:** Task 2 (submission paging test)
- **Issue:** The behavior list asks for 1001 approved submissions from 1001 active raiders. The memberships read is a single query by plan decision, so a 1001-raider fixture is cut at 1000 memberships by the max_rows-aware fake, and the 1001st raider never appears in `members[]`. Same conflict plan 01-02 recorded for guild-data.
- **Fix:** The test uses 1000 active raiders and 1001 submissions (raider sc0 holds an older phase 1 and a newer phase 4 submission, the newer being the 1001st). It still proves the submissions read is paged (ranges `(0,999)` and `(1000,1999)`) and that the 1001st submission is used (last wins); it fails if the read is unpaged.
- **Files modified:** `app/api/addon/export-string/__tests__/route.test.ts`
- **Committed in:** `f0ce4cda` (RED) and `d3ed00a3`

**2. [Rule 1 - Bug] Shared trackApiError mock count leaked into the existing X4 test**
- **Found during:** Task 2 (verification run)
- **Issue:** The rewritten E4 now calls trackApiError, and the GH #326 describe never cleared the mock, so X4's `toHaveBeenCalledTimes(1)` saw two calls.
- **Fix:** Added `vi.mocked(trackApiError).mockClear()` to that describe's `beforeEach`.
- **Files modified:** `app/api/addon/export-string/__tests__/route.test.ts`
- **Committed in:** `d3ed00a3`

---

**Total deviations:** 2 auto-fixed (2 test bugs)
**Impact on plan:** No route behavior change. Note for the owner: a guild with more than 1000 active memberships would still have its members list cut at 1000 in both addon routes. The plan recorded this as an accepted bound; paging that read is a small follow-up if the owner wants it closed.

## Issues Encountered

- The RED commits leave the suite failing at those two commits by design; each is followed immediately by its GREEN commit. Anyone bisecting should skip `521b1928` and `f0ce4cda`.
- `readOrThrow` and `readRowsOrThrow` are duplicated from guild-data's route because the plan scoped changes to two files. Lifting them into `utils/supabase/paginate.ts` is a cheap cleanup for a later plan.
- The comment in `lib/addon/member-ranked-items.ts` still says a failed read "goes out without the skip"; the lib is unchanged by plan, and both routes now turn that null into a 500.

## Verification Results

- `npx vitest run app/api/addon lib/addon utils/supabase companion/src/main/__tests__`: 14 files, 285 tests pass.
- `npx vitest run` (full suite): 217 files, 3938 tests pass.
- `npx tsc --noEmit` ignoring `.next/`: 0 errors.
- `npx eslint app/api/addon/export-string`: exit 0.
- `git diff --stat 1534f032 -- app/api/addon/guild-data companion/src lib/addon domain/scoring app/api/bot` prints nothing.
- Acceptance greps: `createTypedServiceRoleClient()` 1, `from('blp_tracking')` 1, `from('guild_item_priorities')` 1, `prioritiesMap[p.item_id]` 1, `selectAllPagesOrThrow(` 4, `maybeSingle()` 4, `Failed to read loot_history for the receive skip` 1.

## Authentication Gates

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path or schema change; the guild_id filter on blp_tracking and guild_item_priorities (T-07-02) is asserted by B1 and B2, the 500 body is generic (T-07-03, X5), and every read is error-checked (T-07-01, X1 to X3).

## Next Phase Readiness

- Plan 01-05's typed-client scan test can now require export-string (and guild-data and the bot routes) on `createTypedServiceRoleClient`.
- Shipping: PR 3 (a `fix/...` branch) carries plans 01-02 and 01-07; PR 3 must merge before PR 4. No migration.

## Self-Check: PASSED

`app/api/addon/export-string/route.ts` and its test exist on disk, all four task commits (`521b1928`, `8d93c136`, `f0ce4cda`, `d3ed00a3`) are found in git, and the plan's test, typecheck and lint verification passed as listed above.

---
*Phase: 01-forever-defect-and-privacy-fixes*
*Completed: 2026-10-13*
