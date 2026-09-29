---
phase: quick-260929-fz0
plan: 01
subsystem: api
tags: [supabase, next.js, loot-history, rls, vitest]

requires:
  - phase: quick-260928-g8x
    provides: "lib/loot/guild-scoped-lookup.ts (resolveGuildLootItemIds, formatInvalidLootItemIdsError) and lib/loot/loot-history-rows.ts typed builders (GH #294)"
provides:
  - "lib/loot/guild-award-refs.ts: normalizeRefId, findInvalidRaidEventIds, findInvalidCharacterIds, formatInvalidAwardRefsError (COPY C-1/C-2/C-3)"
  - "POST and PATCH /api/loot-history/bulk reject a raid_event_id or character_id not owned by the calling guild before any write"
  - "lib/loot/loot-history-rows.ts: buildRemoveItemHistoryRow (typed LootHistoryInsert with expansion_id)"
  - "app/api/loot-submissions/remove-item/route.ts: loadGuildLootItem guild-scoped helper, typed history insert, insert-error handling, history_recorded response field"
affects: [loot-history, master-sheet, raid-tracking, loot-submissions]

actuals:
  tokens: 17712
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Server-side guild-scope validation module (guild-award-refs.ts) mirroring guild-scoped-lookup.ts's chunked, deduped, UUID-precheck, throw-on-error query pattern for non-loot_items tables (raid_events, character_guild_memberships)"
    - "normalizeRefId collapses null/undefined/'' to null before validation and write, so client shape variance never reaches Postgres as a 22P02"

key-files:
  created:
    - lib/loot/guild-award-refs.ts
    - lib/loot/__tests__/guild-award-refs.test.ts
    - app/api/loot-submissions/remove-item/__tests__/route.test.ts
  modified:
    - app/api/loot-history/bulk/route.ts
    - app/api/loot-history/bulk/__tests__/route.test.ts
    - lib/loot/loot-history-rows.ts
    - lib/loot/__tests__/loot-history-rows.test.ts
    - app/api/loot-submissions/remove-item/route.ts

key-decisions:
  - "OD-2: character_id validity requires an ACTIVE character_guild_memberships row (is_active = true), not just any membership. A raider who left or was removed but still has an approved master-sheet list now gets rejected (C-2) if awarded via bulk. Follow-up #314 covers the master sheet listing them as a candidate at all."
  - "RLS gap filed as #313: 'Officers can insert/update loot history' policies check only is_guild_officer(guild_id), so a direct PostgREST call from an officer's own session could still write a foreign raid_event_id or character_id. Closing that needs a migration, excluded from this PR by the user's own constraint (no migrations)."
  - "An empty-string raid_event_id or character_id now normalizes to null instead of reaching Postgres and failing the row insert with 22P02. No client sends an empty string today, so this is a behavior-preserving safety net, not a functional change."
  - "PATCH with an id not in the guild still updates zero rows silently and returns success with an empty-before audit entry — reported, not fixed (out of scope per the plan)."

patterns-established:
  - "COPY C-1/C-2/C-3 selection lives in formatInvalidAwardRefsError, picking by which of the two invalid-id lists is non-empty, mirroring formatInvalidLootItemIdsError's never-interpolate-ids rule from GH #294."

requirements-completed:
  - GH-296-R1
  - GH-296-R2
  - GH-296-R3
  - GH-297-R1
  - GH-297-R2
  - AUDIT-R1
  - DELIVERY-R1

coverage:
  - id: D1
    description: "POST /api/loot-history/bulk rejects a raid_event_id or character_id not owned by the calling guild with a 400 in the #294 shape, writing nothing; null/absent stays allowed"
    requirement: GH-296-R1
    verification:
      - kind: unit
        ref: "app/api/loot-history/bulk/__tests__/route.test.ts#GH #296: raid event and raider guild scoping"
        status: pass
    human_judgment: false
  - id: D2
    description: "PATCH /api/loot-history/bulk (reassign) rejects a character_id not owned by the calling guild before the before-read, update or audit write"
    requirement: GH-296-R2
    verification:
      - kind: unit
        ref: "app/api/loot-history/bulk/__tests__/route.test.ts#PATCH /api/loot-history/bulk"
        status: pass
    human_judgment: false
  - id: D3
    description: "remove-item's already_obtained path inserts a typed LootHistoryInsert row via buildRemoveItemHistoryRow, with expansion_id taken from the item's own raid tier"
    requirement: GH-297-R1
    verification:
      - kind: unit
        ref: "app/api/loot-submissions/remove-item/__tests__/route.test.ts#GH #297: already_obtained for an item the guild owns inserts a typed row"
        status: pass
      - kind: unit
        ref: "lib/loot/__tests__/loot-history-rows.test.ts#buildRemoveItemHistoryRow"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every remove-item loot_items lookup (restore and removal) is scoped to the calling guild via loadGuildLootItem; an unowned item with already_obtained returns 400 before the soft delete"
    requirement: GH-297-R2
    verification:
      - kind: unit
        ref: "app/api/loot-submissions/remove-item/__tests__/route.test.ts#GH #297: a foreign item plus already_obtained returns 400"
        status: pass
      - kind: unit
        ref: "app/api/loot-submissions/remove-item/__tests__/route.test.ts#restore works as today, and every loot_items query carries a raid_tier_id filter"
        status: pass
    human_judgment: false
  - id: D5
    description: "Write-path audit of every loot_history insert/update/delete in the repo, confirmed fixed / not affected / reported"
    requirement: AUDIT-R1
    verification: []
    human_judgment: true
    rationale: "The audit is a manual grep-and-classify exercise, not something a test asserts; see the Write-Path Audit section below for the full classification, including one new finding beyond the planner's pre-verified list (scripts/link-loot-to-raids.ts)."
  - id: D6
    description: "Delivery: worktree wt296, branch fix/296-297-loot-history-writes, one draft PR against main with Fixes #296 and Fixes #297, no em dashes, ending with the Claude Code line, no migration"
    requirement: DELIVERY-R1
    verification:
      - kind: other
        ref: "gh pr view fix/296-297-loot-history-writes --json isDraft,baseRefName,body -> true,main,true,true,true"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-29
status: complete
---

# Quick Task 260929-fz0: Harden Remaining Loot History Write Paths Summary

**GH #296/#297 fixed in one draft PR: bulk award POST/PATCH now reject a raid_event_id or character_id the calling guild doesn't own, and remove-item's "already obtained" insert is typed with expansion_id and guild-scoped item lookups.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-29T13:14:00-07:00 (worktree baseline)
- **Completed:** 2026-09-29T13:31:00-07:00 (PR opened)
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- POST /api/loot-history/bulk validates every item's raid_event_id (must belong to the guild) and character_id (must have an active membership in the guild) before team routing or any insert, returning a 400 in the #294 shape with the signed-off C-1/C-2/C-3 copy when either fails
- PATCH /api/loot-history/bulk (reassign) applies the same character_id check before its before-read, update, or audit write
- app/api/loot-submissions/remove-item now builds its "already obtained" loot_history row with a typed builder (buildRemoveItemHistoryRow) carrying raid_tier_id and expansion_id from the item's own guild-scoped tier, scopes every loot_items lookup (restore and removal) to the guild, rejects an unowned item with already_obtained before the soft delete, and reports (rather than silently swallows) a history-insert failure via history_recorded + trackApiError
- Full write-path audit across app/lib/utils/scripts/discord-bot/companion and supabase/migrations, confirming the fix's scope and surfacing one operator script not in the planner's pre-verified list

## Task Commits

Each task was committed atomically on `fix/296-297-loot-history-writes` in the wt296 worktree:

1. **Task 1: End-to-end bulk POST guild scoping** - `5718700b` (fix)
2. **Task 2: PATCH bulk raider scoping + write-path audit** - `318009fc` (fix)
3. **Task 3: remove-item typed row + full verification + draft PR** - `0b7356e5` (fix)

No plan-metadata commit was made in the worktree (delivery is the PR itself); this SUMMARY and STATE/ROADMAP are intentionally left uncommitted on the planning branch per the orchestrator's explicit instruction for this task.

_Note: all three tasks were TDD-flavored (tests written alongside the module/route in the same commit); no separate RED/GREEN commits were used since this is a "auto"/"tracer" plan, not a `type: tdd` plan._

## Files Created/Modified

- `lib/loot/guild-award-refs.ts` - normalizeRefId, findInvalidRaidEventIds, findInvalidCharacterIds, formatInvalidAwardRefsError (new module)
- `lib/loot/__tests__/guild-award-refs.test.ts` - 19 unit tests covering every module bullet (new)
- `app/api/loot-history/bulk/route.ts` - POST normalizes + validates raid_event_id/character_id before routing/insert; PATCH validates character_id before update
- `app/api/loot-history/bulk/__tests__/route.test.ts` - extended fixture with raidEvents/memberships, update-payload capture, patchBefore; +23 new tests (POST scoping + full PATCH describe block)
- `lib/loot/loot-history-rows.ts` - added buildRemoveItemHistoryRow (typed LootHistoryInsert for GH #297)
- `lib/loot/__tests__/loot-history-rows.test.ts` - added buildRemoveItemHistoryRow tests (scope columns, notes fallback, no source/raid_event_id keys)
- `app/api/loot-submissions/remove-item/route.ts` - added loadGuildLootItem helper; typed, guild-scoped history insert; unowned-item 400; insert-error handling; history_recorded response field
- `app/api/loot-submissions/remove-item/__tests__/route.test.ts` - first test file for this route (new), 8 tests covering every behavior bullet

## Decisions Made

- OD-2: an ACTIVE membership (is_active = true) is required for a character_id to validate, matching the addon routes and /api/guild-members. A departed raider who still has an approved master-sheet list will now get rejected (C-2 copy) if an officer tries to award them via bulk. Filed as follow-up #314 for the master sheet listing itself.
- RLS gap filed as #313 (reported, not fixed in this PR by explicit scope constraint: no migrations).
- PD-02's empty-string-to-null normalization is a safety net, not a behavior change — no current client sends an empty string for either field.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written for the fix logic itself.

### Scope Note (not a deviation, a planner-flagged discovery)

**1. New write-path finding during Task 2's audit: `scripts/link-loot-to-raids.ts`**
- **Found during:** Task 2, Step C (write-path audit grep)
- **What it is:** A standalone operator script (own Supabase client from env vars, run via `npx tsx`) that backfills `raid_event_id` on old `loot_history` rows by matching `guild_id + awarded_date` against a self-built `guild_id:date -> raid_event_id` map derived from `raid_events` joined through `raid_tiers -> expansions`.
- **Why it's not a request-path risk:** It is not reachable from any HTTP route, takes no untrusted client input, and its own event map is already guild-scoped by construction (the map key includes `guild_id`). Same category as `scripts/backfill-team-event-routing.ts` and `scripts/seed-test-data-multiuser.ts`, which the plan's pre-verified list already classified as "operator scripts, not request paths."
- **Action taken:** Per the plan's explicit instruction ("If the grep finds a write path not in this list, stop and report it in the SUMMARY instead of widening scope"), this was NOT modified. It is recorded here and in the PR body's write-path audit section.

---

**Total deviations:** 0 code deviations; 1 audit-scope finding reported (not fixed, not a deviation rule trigger — no bug, no missing critical functionality, no blocking issue; a read-only classification exercise).
**Impact on plan:** None on the shipped fix. The finding is informational for anyone reviewing the write-path audit.

## Issues Encountered

None. Every test file passed on first run after being written; no fix-iteration was needed on any of the three tasks.

## Write-Path Audit (GH #296 Task 2, full detail)

Ran `git grep -n -A4 "from('loot_history')" -- app lib utils scripts discord-bot companion` (filtered to insert/update/upsert/delete) and `git grep -n -i "loot_history" -- supabase/migrations` (filtered to policy/insert/update lines) against the worktree HEAD.

**Fixed in this PR:**
- `app/api/loot-history/bulk/route.ts` POST — raid_event_id and character_id (Task 1)
- `app/api/loot-history/bulk/route.ts` PATCH — character_id (Task 2)
- `app/api/loot-submissions/remove-item/route.ts` — unscoped lookups, untyped insert, missing expansion_id, ignored insert error (Task 3)

**Checked and not affected:**
- `app/api/addon/loot-award/route.ts`, `app/api/addon/import-string/route.ts` — character_id resolved server-side from active memberships, no raid_event_id written, loot items guild-scoped since GH #294
- `app/api/loot-history/bulk/route.ts` DELETE — every read and delete filtered by `guild_id`
- `app/api/user/delete-account/route.ts` — deletes only the caller's own characters' history
- `scripts/backfill-team-event-routing.ts`, `scripts/seed-test-data-multiuser.ts` — operator scripts, not request paths
- `scripts/link-loot-to-raids.ts` — **new finding this session**, not in the planner's original classification list; operator script, same category as the two above (see Deviations section)
- `supabase/migrations/20260825000000_dedupe_raid_events.sql` — one-time data fix
- All client-side `loot_history` queries (MasterSheetContent, DashboardContent, raid-tracking `_client.tsx`) are reads

**Reported, not fixed (excluded from this PR by scope constraint):**
- `supabase/migrations/20260101000000_baseline_schema.sql` RLS policies "Officers can insert loot history" and "Officers can update loot history" check only `is_guild_officer(guild_id)`, so a direct PostgREST call from an officer's own session could still write a foreign `raid_event_id` or `character_id`. Filed as GH #313.
- PATCH with an `id` not in the guild updates zero rows but still returns success and writes an UPDATE audit entry with an empty before.
- The master sheet candidate list (`/api/master-sheet/visibility`) can surface raiders whose membership is inactive; this PR's OD-2 means awarding one via bulk now correctly returns C-2 instead of silently succeeding. Filed as GH #314 for the listing itself.

## PR

- **URL:** https://github.com/alexandermayes/loot-list-plus/pull/315
- **Status:** Draft, base `main`, head `fix/296-297-loot-history-writes`
- **Title:** fix: check award raid events and raiders belong to the guild, type the remove-item row (#296, #297)
- Verified via `gh pr view` JSON check: `isDraft=true, baseRefName=main, body contains "Fixes #296"=true, body contains "Fixes #297"=true, no em dash=true`

## Test / Typecheck / Lint Results

**Baseline (worktree, before any edits):** 123 test files, 2295 tests, all passing. `npx tsc --noEmit` clean.

**Final (worktree, after all 3 tasks):** 125 test files, 2341 tests, all passing (46 new tests, 0 regressions, 0 failures). `npx tsc --noEmit` clean.

**eslint** on the 8 touched files: 0 errors (1 pre-fix warning — an unused `body` var in a test — corrected before the Task 3 commit; re-run confirmed 0 warnings, 0 errors).

**Diff scope:** `git diff --name-only origin/main...HEAD` lists exactly the 8 files in the plan's `files_modified`, nothing under `supabase/`, no `package.json`/`package-lock.json` changes, no deletions.

## Known Stubs

None.

## Threat Flags

None beyond what the plan's own `<threat_model>` already registered (T-296-01 through T-296-09, T-297-01, T-297-02) — no new surface was introduced beyond what the plan scoped.

## User Setup Required

None — no external service configuration required. No migration in this PR.

## Next Phase Readiness

- PR #315 is open as a draft against `main`, unmerged, awaiting review. Per the delivery constraint, this executor did not merge it, use `--admin`, push to `main`, or run any SQL against a real database.
- Follow-ups filed during this session's audit: GH #313 (RLS insert/update policies too permissive for direct PostgREST writes), GH #314 (master sheet candidate list should exclude inactive-membership raiders).
- `scripts/link-loot-to-raids.ts` is a new write-path finding recorded for future audits; no action needed unless its guild-scoping assumption is ever revisited.

## Self-Check: PASSED

- `lib/loot/guild-award-refs.ts` — FOUND (created, committed in 5718700b)
- `lib/loot/__tests__/guild-award-refs.test.ts` — FOUND (created, committed in 5718700b)
- `app/api/loot-submissions/remove-item/__tests__/route.test.ts` — FOUND (created, committed in 0b7356e5)
- Commit `5718700b` — FOUND in `git log --oneline --all` (worktree)
- Commit `318009fc` — FOUND in `git log --oneline --all` (worktree)
- Commit `0b7356e5` — FOUND in `git log --oneline --all` (worktree)
- PR #315 — FOUND via `gh pr view`, draft, base main, both Fixes lines present, no em dash

---
*Quick task: 260929-fz0*
*Completed: 2026-09-29*
