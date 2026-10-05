---
phase: quick-261003-she
plan: 01
subsystem: api
tags: [nextjs, supabase, rls-bypass, service-role, attendance, raid-tracking]

requires:
  - phase: quick-261003-m45
    provides: the 261003-m45 OD-1 A membership rule (any membership, active or not) that this route's POST check mirrors at the application layer
provides:
  - POST, PATCH and DELETE /api/attendance/bulk now check every raid event, attendance row and character they touch against the guild the officer was verified for, before writing with the service role
  - PATCH recomputes attendance status from each row's merged flags, not just the sent ones, closing a status-overwrite bug found during planning
  - POST /api/raid-events removed (unused, same gap as the bulk route)
  - raid-tracking import now reports a failed attendance or signup save with one error toast
affects: [raid-tracking, attendance, loot-scoring, discord-bot-notifications]

actuals:
  tokens: 24313
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Guard module modelled on lib/loot/guild-award-refs.ts: parse-then-check-then-route, so an invalid or foreign id is refused before any downstream read or write runs"
    - "Recording fake Supabase client in the route test, shared across POST/PATCH/DELETE describe blocks, extended per task rather than rewritten"

key-files:
  created:
    - lib/attendance/guild-attendance-refs.ts
    - app/api/attendance/bulk/__tests__/route.test.ts
    - app/(app)/raid-tracking/components/attendance-save.ts
    - app/(app)/raid-tracking/components/__tests__/attendance-save.test.ts
  modified:
    - app/api/attendance/bulk/route.ts
    - app/(app)/raid-tracking/_client.tsx
  removed:
    - app/api/raid-events/route.ts

key-decisions:
  - "OD-1 resolved by the user as option A: a raid_event_id or row id outside the officer's guild refuses the whole request with 400 and COPY C-1; a row id that matches no row at all is ignored, as before"
  - "OD-2 resolved by the user as option A: POST /api/raid-events is removed rather than pinned to the guild, since nothing calls it (replaced by /api/raid-events/ensure in commit 3b930894)"
  - "Orchestrator amendment A1 (user-approved scope addition): PATCH now computes status from each row's current flags merged with the sent update, instead of from the sent flags alone, so a signup-only update can no longer knock an already-attended row back to signed_up"

patterns-established:
  - "App-only security-gap PRs for this route family stay independent of any companion migration PR touching the same tables, and say so in the PR body"

requirements-completed: [SHE-R1, SHE-R2, SHE-R3, SHE-R4, DELIVERY-R1]

coverage:
  - id: D1
    description: "POST /api/attendance/bulk writes only into raid events of the verified guild and only characters with a membership row (active or not) in that guild; malformed records, actions and conflict targets are refused before any write"
    requirement: SHE-R1
    verification:
      - kind: unit
        ref: "app/api/attendance/bulk/__tests__/route.test.ts, describe('POST /api/attendance/bulk') (24 tests: P-1 to P-8)"
        status: pass
    human_judgment: false
  - id: D2
    description: "PATCH and DELETE change or remove only attendance rows of the verified guild's raid events; a foreign raid event or row id refuses the whole request; an id matching no row is ignored; PATCH recomputes status from merged flags"
    requirement: SHE-R2
    verification:
      - kind: unit
        ref: "app/api/attendance/bulk/__tests__/route.test.ts, describe('PATCH /api/attendance/bulk') and describe('DELETE /api/attendance/bulk') (36 tests: Q-1 to Q-6, D-1 to D-5, plus the two A1 merged-status cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Sibling routes scanned; POST /api/raid-events (same gap, no caller) removed; the remaining gaps listed as follow-ups"
    requirement: SHE-R3
    verification:
      - kind: other
        ref: "This SUMMARY's Investigation Findings and Follow-Ups sections; app/api/raid-events/route.ts deleted in commit 53f82056"
        status: pass
    human_judgment: false
  - id: D4
    description: "The raid-tracking import checks every attendance/signup save and the reads a save depends on; a failed one shows one error toast with the server's reason or a fallback"
    requirement: SHE-R4
    verification:
      - kind: unit
        ref: "app/(app)/raid-tracking/components/__tests__/attendance-save.test.ts (10 tests)"
        status: pass
      - kind: integration
        ref: "app/(app)/raid-tracking/_client.tsx wiring, exercised indirectly by the full raid-tracking test suite (13 files, 239 tests) with no new failure"
        status: pass
    human_judgment: true
    rationale: "The import flow itself (paste-and-save against a live Supabase backend, forced-failure toast) is only exercised by the plan's human-check step after deploy; unit tests cover the helper and the route in isolation."
  - id: D5
    description: "New route and helper tests pass; full regression has no new failing test file; tsc and eslint pass; neutral wording; local-only commits; PR body draft"
    requirement: DELIVERY-R1
    verification:
      - kind: unit
        ref: "npx vitest run (186 files / 3321 tests, EXIT=0); new-fails.sh against baseline-she-vitest.txt (0 new FAIL, 0 FLAKY)"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (EXIT=0); npx eslint --max-warnings 0 on every new/changed file; eslint on _client.tsx (9 warnings, same as baseline)"
        status: pass
    human_judgment: false

duration: ~70min
completed: 2026-10-03
status: complete
---

# Quick Task 261003-she: Bulk Attendance Writes Stay Inside The Officer's Guild Summary

**POST, PATCH and DELETE /api/attendance/bulk now check every raid event, attendance row and character they touch against the guild the officer was verified for before writing with the service role; the raid-tracking import now tells the officer when a save failed.**

## Performance

- **Duration:** ~70 min
- **Tasks:** 3
- **Files modified:** 7 (3 created, 3 modified, 1 removed)

## Commits

App-only PR, no migration, independent of the 261003-m45 migration PR (either can merge first). Branch `fix/attendance-bulk-guild-scope` off `origin/main` at `1a0e6473`. All local only; nothing pushed, no PR opened.

1. **`c6b97f6e`** `fix(attendance): bulk attendance saves stay inside the officer's guild`
   New guard module `lib/attendance/guild-attendance-refs.ts` and the rewritten POST handler, with its first route tests.
2. **`7764de9f`** `fix(attendance): attendance edits and removals stay inside the officer's guild`
   PATCH and DELETE rewritten per D-03/D-04 and the OD-1 resolution, plus the A1 merged-status fix; PATCH and DELETE route tests added.
3. **`53f82056`** `chore(api): remove the raid events create route that no page calls`
   Deletes `app/api/raid-events/route.ts` per OD-2 option A (the `ensure` and `bonus` routes are untouched).
4. **`203aa9d3`** `fix(raid-tracking): the attendance import reports saves that failed`
   New `attendance-save.ts` helper and tests; `executeImport` in `_client.tsx` wired to check every save.
5. **`5e28c6d1`** `style(attendance): remove em dashes from route comments`
   Fixup commit: reworded four code comments in `route.ts` to clear the plan's no-em-dash text gate; no behavior change.

## OD-1 and OD-2 Resolutions (as applied)

- **OD-1 (resolved by the user, 2026-10-03): option A.** A raid_event_id or row id outside the officer's guild refuses the whole request with 400 and COPY C-1 (`invalid_raid_event_ids` or `invalid_ids` in the body); nothing is written. A row id that matches no row at all (removed by another officer or tab) is ignored, as it already was, returning 200 with no write, audit or BLP recompute.
- **OD-2 (resolved by the user, 2026-10-03): option A.** `POST /api/raid-events` verified only the body `guild_id` and inserted events carrying their own `guild_id`, `raid_tier_id` and `raid_team_id` unchecked. It has had no caller since commit `3b930894` (2026-03-11), which replaced it with `/api/raid-events/ensure`. Removed rather than pinned; the `ensure` and `bonus` routes, which build their rows server-side, are unchanged.
- **Orchestrator amendment A1 (user-approved scope addition).** PATCH previously computed the dual-write `status` column from only the flags a request sent, so a signup-only update (`{ signed_up: true }`) could knock an already-`attended` row back down to `signed_up` (the addon's export queries read this column). PATCH now reads each targeted row's current flags, merges the sent update on top, and computes status from the merged result using the same priority order `resolveStatus` already uses elsewhere. Covered by two new test cases: an already-attended row keeps status `attended` when only `signed_up` changes, and clearing `attended` moves the row to the status its remaining flags imply.

## COPY (as shipped, signed off 2026-10-03)

- **C-1** (400, a raid event or row named outside the guild): "This attendance belongs to a raid that isn't in this guild. Refresh the page, then try again."
- **C-2** (400, POST only, a character never in the guild): "One or more raiders were never members of this guild. Refresh the page, then try again."
- **C-3** (400, malformed request; reused verbatim from 261003-0ru): "This page is out of date. Refresh it, then try again."
- **C-4** (start of the raid-tracking import's failure toast): "Some attendance from this import wasn't saved."
- **C-5** (end of that toast when the server gave no error text): "Refresh the page, then import again."
- Removed: the immediate "Failed to save attendance. Try again." toast after a failed linked upsert; its failure now reaches the single C-4 toast like every other save.

## Request Rules Per Method (as shipped)

### POST /api/attendance/bulk
- `action` must be exactly `'upsert'` or `'insert'`; `onConflict` must be absent or exactly `'raid_event_id,character_id'`; else 400 C-3.
- `records` (1 to 1000) accept only `raid_event_id`, `character_id`, `character_name`, `user_id` and the six status flags; `raid_event_id` must be a UUID; at least one of a non-null `character_id` or a non-empty `character_name` is required (mirrors the DB check constraint); else 400 C-3.
- Every record's `raid_event_id` is checked against the guild (400 C-1, `invalid_raid_event_ids`) and every non-null `character_id` against guild membership history, active or not (400 C-2, `invalid_character_ids`); both before `routeRecordsToTeamEvents` runs, since that function reads `raid_events` by id with no guild filter.
- A lookup error (not a missing row, an actual query failure) returns 500 "Internal server error" with nothing written.
- Response unchanged: `{ success: true, count }`.

### PATCH /api/attendance/bulk
- `updates` must be a non-empty object of only the six status flags, each a boolean; `filters` must name `raid_event_id`, `id` or `ids` (an empty or character-only filter is refused); else 400 C-3.
- `filters.raid_event_id`, when present, is checked against the guild (400 C-1). `filters.id`/`filters.ids`, when present, are resolved to their raid events and checked against the guild (400 C-1, `invalid_ids`); an id matching no row is ignored.
- Status is recomputed from each affected row's current flags merged with the sent update (amendment A1), not from the sent flags alone.
- A lookup error returns 500 with nothing written. Response unchanged: `{ success: true }`.

### DELETE /api/attendance/bulk
- Body must match the allowed shape (`raid_event_id`, `ids`, `character_id`, `character_id_is_null`, `character_names`); `ids`, when present, must be 1 to 1000 UUIDs; else 400 C-3. Neither `ids` nor `raid_event_id` keeps the existing 400 "raid_event_id or ids required".
- `raid_event_id`, when present, is checked against the guild even on the `ids` path (400 C-1), since an officer naming another guild's raid event should see an error rather than a silent no-op.
- `ids`, when present, are resolved to their raid events and checked against the guild (400 C-1, `invalid_ids`); deletes run in chunks of 100, scoped to the resolved raid events; an id matching no row is ignored (200, nothing deleted).
- A lookup or delete error returns 500. Response unchanged: `{ success: true }`.

### POST /api/raid-events
- Removed (OD-2 option A). Event creation goes through `/api/raid-events/ensure` and `/api/raid-events/bonus`, both of which build their rows server-side and were not changed by this task.

## Investigation Findings (carried from the plan, verified in code at `1a0e6473`)

1. Before this task, the three handlers of `app/api/attendance/bulk/route.ts` ran with the service role after a `manage_attendance` permission check for `body.guild_id` only; none of them checked that the raid events, attendance rows or characters they wrote belonged to that guild.
2. PATCH could also change any column (including `raid_event_id` and `character_id`) and, with an empty or character-only filter, rows of every guild.
3. POST passed record fields and the client's `onConflict` through unchecked.
4. The raid-tracking import (`executeImport`) made eight `/api/attendance/bulk` calls and checked the response of only one.
5. `POST /api/raid-events` had the identical gap and, per `git grep` at `1a0e6473`, no caller anywhere in the app, bot, companion or scripts (replaced by `/api/raid-events/ensure` in commit `3b930894`, 2026-03-11).
6. `raid_events` has no `updated_at` column, so PATCH's optimistic-lock read and "touch" update have always been silent no-ops; left in place with a guild filter added, not turned into a failing step (follow-up FU-3).
7. `261003-m45` (a separate migration PR) adds a database trigger enforcing the same any-membership rule this task's POST check applies at the application layer first, so the officer sees a clear 400 instead of a trigger error; the two PRs can merge in either order.
8. Sibling routes checked: `/api/attendance/auto-link` already scopes its reads/writes to one guild; `/api/raid-events/ensure` and `/bonus` write into the verified guild but take tier/team references unchecked (a narrower, reference-only gap, follow-up FU-1); `/api/raid-teams/[id]/assign-events`, `/api/wcl/link-report`, `/api/discord/post-raid-summary` and `/api/addon/attendance` were already guild-scoped.

## Test Counts Per File

| File | Tests |
|------|-------|
| `app/api/attendance/bulk/__tests__/route.test.ts` | 60 (24 POST, 21 PATCH, 15 DELETE) |
| `app/(app)/raid-tracking/components/__tests__/attendance-save.test.ts` | 10 |

## Baseline vs Final (vitest, tsc, eslint)

| Check | Baseline (`1a0e6473`) | Final (after all 5 commits) | Result |
|-------|------------------------|-------------------------------|--------|
| `npx vitest run` | 184 files / 3251 tests, EXIT=0 | 186 files / 3321 tests, EXIT=0 | `new-fails.sh` exit 0, no new FAIL line, no FLAKY line; +2 files / +70 tests, both new |
| `npx tsc --noEmit` | EXIT=0 | EXIT=0 | clean throughout |
| `npx eslint --max-warnings 0` (every new/changed file except `_client.tsx`) | n/a | EXIT=0 | clean |
| `npx eslint` on `app/(app)/raid-tracking/_client.tsx` | 9 warnings, EXIT=0 (all pre-existing) | 9 warnings, EXIT=0 | unchanged, no new warning |

## PR Body Draft

`/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/pr-body-she.md`

## Handoff Notes

None. The plan's `SP/she-handoff.txt` escape hatch (for a context-length stop between tasks) was not needed; all three tasks and the full verification ran in one session.

## Follow-Ups (neutral wording, each stated as the rule to adopt)

- **FU-1:** `POST /api/raid-events/bonus` and `/api/raid-events/ensure` should take the tier only from an expansion of the request's own guild, and `bonus` should accept only a `raid_team_id` of that guild.
- **FU-2:** `PATCH /api/attendance/bulk` is no longer a follow-up; the status recompute described in amendment A1 above is implemented and tested in this task.
- **FU-3:** `raid_events` has no `updated_at` column, so the PATCH optimistic check and the touch update should either be removed or the column should be added.
- **FU-4:** A linked attendance row's `user_id` should be the character's owner; the route currently accepts any user id sent.
- **FU-5:** "Clear raid data" in the import modal should not show its success toast or clear the grid when a delete failed.
- **FU-6:** Remove the unused `importSignups` and `importLoot` functions in `app/(app)/raid-tracking/_client.tsx`.
- **FU-7:** `/api/attendance/auto-link` and `routeRecordsToTeamEvents` should stop on a read error instead of continuing.
- **FU-8** (carried from 261003-m45's FU-3): a `raid_team_members` row's `raid_team_id` should belong to the row's guild.
- **FU-9** (carried from 261003-m45's FU-4): the older CSV import page's (`app/(app)/raid-tracking/import/_client.tsx`) attendance upsert names a conflict target with no matching constraint.

## Deviations from Plan

### Auto-fixed Issues

**1. [Text gate] Four em dashes in route.ts code comments**
- **Found during:** Task 3, Step 3 (the plan's no-em-dash text gate over added lines)
- **Issue:** Four comments written during Tasks 1 and 2 used an em dash for a parenthetical aside.
- **Fix:** Reworded each to a period or colon; no behavior change.
- **Files modified:** `app/api/attendance/bulk/route.ts`
- **Commit:** `5e28c6d1` (separate fixup commit, as the plan's Step 3(1) directs)

**2. [Rule 1 - staging mistake, caught before verification] Task 2's first commit briefly bundled the OD-2 file deletion**
- **Found during:** Task 2, immediately after the PATCH/DELETE commit
- **Issue:** `git rm app/api/raid-events/route.ts` had already staged that deletion; running `git commit` without a pathspec after `git add`-ing only the two intended files committed the full index, including the unrelated deletion, producing a 3-file commit instead of the planned 2+1 split.
- **Fix:** `git reset --soft HEAD~1`, then `git reset HEAD -- app/api/raid-events/route.ts` to unstage just that path, then two separate commits as the plan specifies.
- **Files modified:** none beyond the intended commit split; working tree content was never wrong, only the commit boundary.
- **Verification:** `git show --stat` on each resulting commit; Task 2's automated verify (3 commits, 3 trailers) passed after the fix.

---

**Total deviations:** 2 (1 text-gate fixup, 1 self-caught commit-boundary correction). Neither changed shipped behavior.
**Impact on plan:** None on scope; both were mechanical corrections before any task's verification gate was checked.

## Known Stubs

None. Every write path this task touches is wired to a real guild check and a real test; no placeholder data or deferred UI.

## Threat Flags

None beyond the plan's own threat register (T-she-01 through T-she-11 in the PLAN.md), all mitigated as designed and covered by the behavior-matched test cases (P-, Q-, D- and R-series) in `route.test.ts`.

## Issues Encountered

None beyond the two deviations above.

## Self-Check

- `lib/attendance/guild-attendance-refs.ts`: FOUND
- `app/api/attendance/bulk/__tests__/route.test.ts`: FOUND
- `app/(app)/raid-tracking/components/attendance-save.ts`: FOUND
- `app/(app)/raid-tracking/components/__tests__/attendance-save.test.ts`: FOUND
- `app/api/attendance/bulk/route.ts` (modified): FOUND
- `app/(app)/raid-tracking/_client.tsx` (modified): FOUND
- `app/api/raid-events/route.ts`: confirmed removed (`git show --stat 53f82056`)
- Commit `c6b97f6e`: FOUND in `git log --oneline 1a0e6473..HEAD`
- Commit `7764de9f`: FOUND
- Commit `53f82056`: FOUND
- Commit `203aa9d3`: FOUND
- Commit `5e28c6d1`: FOUND
- `/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/pr-body-she.md`: FOUND, non-empty, no em dash

## Self-Check: PASSED

## Next Phase Readiness

The two independent PRs for this feature pair (this app-only PR and the 261003-m45 migration PR) can merge in either order. No further work is required to close SHE-R1 through SHE-R4 and DELIVERY-R1; remaining gaps are recorded as follow-ups above, none blocking.

---
*Quick task: 261003-she*
*Completed: 2026-10-03*
