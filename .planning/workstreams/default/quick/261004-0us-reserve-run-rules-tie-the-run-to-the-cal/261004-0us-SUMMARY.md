---
phase: quick-261004-0us
plan: 01
subsystem: database
tags: [postgres, rls, supabase, migrations, pglite]

requires:
  - phase: quick-261003-t28
    provides: enforce_reserve_award_refs trigger on reserve_awards (the BLP and reserve award rules migration), merges before this one
provides:
  - A migration dropping the reserve_runs and reserve_awards session write policies and all four reserve-table session read policies, so reserve_runs, reserve_awards, reserve_submissions and reserve_audit_log are read and written only by the server
  - A shape test pinning the migration's statement order, Rollback block and header layout
affects: [quick-261004-29l, quick-261004-0ut]

actuals:
  tokens: 4997
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Session write and read policies dropped (not tightened) when every app path already uses the service role; RLS stays enabled with no policy, which refuses every session"

key-files:
  created:
    - supabase/migrations/20261004010000_reserve_run_rules.sql
    - app/services/__tests__/reserve-run-rules-migration.test.ts
  modified: []

key-decisions:
  - "OD-1 resolved B (user, 2026-10-04): the four reserve SELECT policies are dropped in the same migration as the five write policies, so all four reserve tables become server-only, not just reserve_runs and reserve_awards."
  - "OD-2 resolved A (user, 2026-10-04): the run list and run routes' broader-than-intended reads (no membership check, raid_leader_token returned to non-managers) are fixed in a separate app quick task, 261004-29l, not here. This task stays migration-only."
  - "OD-3 resolved: a guild run's creator keeps management rights only while an active member of that guild; applied in 261004-29l, not in this task's files."
  - "PostgreSQL also requires the table's SELECT policy to pass for a row to be visible to an UPDATE, DELETE or a RETURNING clause, even when a broader UPDATE/DELETE-only policy clause (such as is_guild_officer's guild-creator branch) would independently allow the write. Discovered empirically while proving 0US-AWD-4: a guild's creator who owns no character (is_guild_officer true only via guilds.created_by) cannot UPDATE or DELETE another member's reserve row today, because reserve_runs_select requires either direct row ownership or an active character membership, which a guild creator with no character never has. This is unrelated to the migration (true both before and after) and does not change any requirement; the PGlite proof for 0US-AWD-4 uses a synthetic second officer reached through an active character membership, which does satisfy both policies, instead of the guild creator used for 0US-AWD-2's insert check."

requirements-completed: [0US-R1, 0US-R2, 0US-R3, 0US-R4, DELIVERY-R1]

coverage:
  - id: D1
    description: "reserve_runs and reserve_awards can no longer be inserted, updated or deleted by a user session (0US-R1, 0US-R2)"
    requirement: "0US-R1"
    verification:
      - kind: integration
        ref: "scratchpad PGlite harness (not committed), scenarios-0us.mjs 0US-RUN-1 to 0US-RUN-15, 0US-AWD-1 to 0US-AWD-5"
        status: pass
    human_judgment: false
  - id: D2
    description: "no user session can read any reserve_runs, reserve_awards, reserve_submissions or reserve_audit_log row (OD-1 B); every app read and write keeps working through the service role (0US-R3)"
    requirement: "0US-R3"
    verification:
      - kind: integration
        ref: "scratchpad PGlite harness (not committed), scenarios-0us.mjs 0US-READ-1, 0US-READ-2, 0US-SVC-1 to 0US-SVC-6, 0US-REF-1"
        status: pass
    human_judgment: false
  - id: D3
    description: "the migration file holds exactly the D-01 statements with an exact, tested Rollback; it re-applies cleanly and no other table's policy changes"
    requirement: "0US-R4"
    verification:
      - kind: unit
        ref: "app/services/__tests__/reserve-run-rules-migration.test.ts (all 7 cases)"
        status: pass
      - kind: integration
        ref: "scratchpad PGlite harness (not committed), scenarios-0us.mjs 0US-RB-1 to 0US-RB-4, 0US-CAT-POL, 0US-CAT-RLS, 0US-CAT-GRANT, 0US-CAT-IDEM"
        status: pass
    human_judgment: false
  - id: D4
    description: "production count queries and neutral follow-ups are available for the user to run before and after merge"
    requirement: "0US-R4"
    verification: []
    human_judgment: true
    rationale: "Running the Supabase SQL editor count queries and confirming the post-deploy policy state is a user action against production, not something this executor can verify."
  - id: D5
    description: "full regression, neutral wording and a clean one-commit, migration-only branch (DELIVERY-R1)"
    requirement: "DELIVERY-R1"
    verification:
      - kind: other
        ref: "npx vitest run (final, 187/187 files, 3298/3298 tests, EXIT=0); sh new-fails.sh baseline final (no new FAIL, exit 0); npx tsc --noEmit (EXIT=0); npx eslint --max-warnings 0 on the shape test (EXIT=0)"
        status: pass
    human_judgment: false

duration: 90min
completed: 2026-10-04
status: complete
---

# Phase quick-261004-0us: Reserve tables are read and written only by the server, Summary

**One migration drops the reserve_runs and reserve_awards session write policies and, per OD-1 B, all four reserve-table session read policies, so reserve_runs, reserve_awards, reserve_submissions and reserve_audit_log become server-only, proven in a scratchpad PGlite harness before and after, with a committed shape test pinning the file's exact shape.**

## Performance

- **Duration:** ~90 min
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Commit

- `a0eca365` `fix(db): reserve tables are read and written only by the server` (on branch `fix/reserve-run-rules`, 1 commit after `0da20f89`)

**Migration-only PR: merge with --admin after the PR carrying `20261003230000` (quick task 261003-t28). It deploys about 12 seconds after merge. No app PR is needed first.** Nothing was pushed by this executor; the branch has no upstream.

## OD-1, OD-2, OD-3 resolutions (as recorded by the user, 2026-10-04)

- **OD-1: B.** The four reserve SELECT policies (`reserve_runs_select`, `reserve_awards_select`, `reserve_submissions_select`, `reserve_audit_log_select`) are dropped in this same migration, alongside the five write policies. No app read changes, since every reserve read already goes through a server route on the service role, including the public join page, its link preview and guest sign-up.
- **OD-2: A.** The run list route (`GET /api/reserve-runs`, no membership check, returns `raid_leader_token` to any signed-in caller) and the run route (`GET /api/reserve-runs/[id]`, treats any signed-in caller as a manager of a run with no guild) are fixed in a separate, already-started app quick task, 261004-29l, shipped as its own app PR. This task stays migration-only.
- **OD-3:** A guild run's creator keeps management rights (lock, edit, award, delete, sign-up edits, the leader link) only while an active member of that guild; the raid leader link and officers with Manage reserves keep working regardless. Applied in 261004-29l, not in this task's files.

## Final statement list (9 statements, OD-1 B)

```
SET LOCAL lock_timeout = '5s';
DROP POLICY IF EXISTS "reserve_runs_insert" ON "public"."reserve_runs";
DROP POLICY IF EXISTS "reserve_runs_update" ON "public"."reserve_runs";
DROP POLICY IF EXISTS "reserve_runs_delete" ON "public"."reserve_runs";
DROP POLICY IF EXISTS "reserve_awards_insert" ON "public"."reserve_awards";
DROP POLICY IF EXISTS "reserve_awards_delete" ON "public"."reserve_awards";
DROP POLICY IF EXISTS "reserve_runs_select" ON "public"."reserve_runs";
DROP POLICY IF EXISTS "reserve_awards_select" ON "public"."reserve_awards";
DROP POLICY IF EXISTS "reserve_submissions_select" ON "public"."reserve_submissions";
DROP POLICY IF EXISTS "reserve_audit_log_select" ON "public"."reserve_audit_log";
```

RLS is never disabled: it stays enabled (not forced) on all four tables, which refuses every session once no policy remains. Table grants, every trigger, the token default functions and their grants, every other policy and function, `lib/database.types.ts` and every existing row are unchanged.

**Rollback:** the migration's header comment carries a forward migration, in the same order, that drops each restored policy first and then recreates it with the baseline's exact `CREATE POLICY` text (verbatim, including line breaks). Proven in PGlite to restore the previous policies and session read/write behavior exactly (0US-RB-1 to 0US-RB-4), and the file re-applies cleanly afterward (0US-CAT-IDEM). No data changes either way.

## Context findings (verified at `0da20f89`, 42 of 42 migrations applied)

1. **Rules today** (no migration after the baseline changed a reserve policy, trigger or grant): `reserve_runs_insert` required only `auth.uid() IS NOT NULL`; `reserve_runs_update`/`reserve_runs_delete` allowed the run's creator or an officer of its guild to change or remove any column; `reserve_awards_insert`/`reserve_awards_delete` allowed an officer of the run's guild with any `awarded_by`; the four SELECT policies let an active member of a run's guild (and the run's creator, even after leaving) read every row and column of that guild's reserve runs, sign-ups, awards and run history. RLS was enabled, not forced, on all four tables; `anon`, `authenticated` and `service_role` held every table privilege.
2. **Readers and writers:** every reserve reader and writer is a server route on the service role (the run list, create, duplicate, edit, lock/unlock/complete, delete, awards, sign-up, audit and join routes; `utils/reserve-access.ts`, `utils/feature-gate.ts`, `utils/reserve-audit.ts`; the public join page and its link preview). No page, browser code, bot, companion app, addon, script, view or database function used these tables with a user session. Foreign key actions (guild delete, raid team delete, character delete, run delete, sign-up delete) are referential and not subject to RLS.
3. **Probe facts** (synthetic seed): before the migration, a signed-in session could insert a run for any guild naming any creator, move a run between guilds, change its creator/raid tier/status/timestamps, delete any run it could see, and an officer of a run's guild could insert or delete awards naming any `awarded_by`. With the five write policies dropped in memory, every such session write was refused or affected zero rows, every app write shape on the service role (and the run-delete cascade) kept working, and the statements re-applied cleanly. With the four SELECT policies also dropped, every session read returned nothing and the service role still read every row.
4. **App observations beyond the database** (recorded for the OD-2/OD-3 follow-ups, not changed by this migration): the run list route answers any signed-in caller for any guild id and returns `raid_leader_token`; the run route treats any signed-in caller as a manager of a run with no guild and returns its token, and returns every submitted sign-up to members regardless of the run's visibility; the audit route lets any signed-in caller read the audit log of a run with no guild; creator rights ignore membership; the POST and duplicate route docstrings say "Officer-only" while any active member may create a run (intended, prior commit); POST stores `raid_team_id` and `expansion_id` from the body without checking they belong to the run's guild; the token defaults use `random()`.
5. **Tests:** no existing test named a reserve policy; every migration shape test is anchored to a fixed timestamp (`#309`); the function-grants ratchet test checks only new functions, and this migration adds none.

**New finding from this task's own proof work (not previously documented, unrelated to the migration):** PostgreSQL requires a row to also pass a table's SELECT policy to be visible to an UPDATE, DELETE, or a RETURNING clause on that table, even when a broader UPDATE/DELETE-only policy clause would independently allow the write. A guild's creator who owns no character (officer status coming only from `guilds.created_by`, not an active membership) can insert a row today (the WITH CHECK clause alone decides INSERT), but cannot UPDATE or DELETE a row created by someone else, because the table's SELECT policy requires either direct row ownership or an active character membership, which a guild creator with no character never satisfies. This holds identically before and after the migration (both are "zero rows affected", for different reasons), so it changes no finding and no requirement; it only meant the PGlite proof for the delete half of the two-officer checks needed an officer reached through an active membership rather than through pure guild creation.

## PGlite proof (scratchpad only, never committed)

| Run | Migrations applied | PASS | FAIL | Exit |
|-----|---------------------|------|------|------|
| Red (no migration file) | 42 of 42 | 11 | 20 | 1 (expected) |
| After Task 1 (migration present) | 43 of 43 | 39 | 0 | 0 |
| Final | 43 of 43 | 39 | 0 | 0 |
| Combined (with `20261003230000`, quick task 261003-t28, read from branch `fix/blp-reserve-award-rules-migration`) | 44 of 44 | 39 | 0 | 0 |

The red run's FAIL set matched exactly the expected new-rule labels (`0US-RUN-1` to `0US-RUN-14`, `0US-AWD-1` to `0US-AWD-4`, `0US-CAT-0`, and `0US-READ-1` since OD-1 is B) and passed every control (`0US-FIX-1`, `0US-READ-2`, `0US-RUN-15`, `0US-AWD-5`, `0US-SVC-1` to `0US-SVC-6`, `0US-REF-1`), with no uncaught error and both baseline files (`policies-baseline.json`, `views-baseline.json`) written. Every later run reports zero FAIL lines, with the FIX, READ, RUN, AWD, SVC, REF, RB and CAT sections all run and passing, including the Rollback and re-apply checks.

## Regression results

- **vitest (shape test + `app/services`):** 20/20 test files, 297/297 tests pass.
- **vitest (baseline, before this branch's changes):** 186/186 test files, 3291/3291 tests, `EXIT=0`.
- **vitest (final, after this branch's changes):** 187/187 test files, 3298/3298 tests, `EXIT=0`.
- **`new-fails.sh` (baseline vs. final):** no new FAIL lines, errors unchanged (0 to 0), test file total rose 186 to 187 (the new shape test), exit 0. No FLAKY lines.
- **`npx tsc --noEmit`:** exit 0.
- **`npx eslint --max-warnings 0`** on the shape test: exit 0.
- **Text gate:** no em dash in the branch's added lines or its commit message.

## PR body draft

`/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/pr-body-0us.md`

## Production count queries

Run query 1 in the Supabase SQL editor **before merging** (read-only, informational; the migration itself reads and changes no row):

```sql
select count(*) as runs,
       count(*) filter (where r.guild_id is null) as runs_without_guild,
       count(*) filter (where r.guild_id is not null and not exists (
         select 1 from public.character_guild_memberships m join public.characters c on c.id = m.character_id
          where m.guild_id = r.guild_id and m.is_active and c.user_id = r.created_by)) as guild_runs_creator_not_active_member,
       count(*) filter (where r.guild_id is not null and not exists (
         select 1 from public.character_guild_memberships m join public.characters c on c.id = m.character_id
          where m.guild_id = r.guild_id and c.user_id = r.created_by)
         and not exists (select 1 from public.guilds g where g.id = r.guild_id and g.created_by = r.created_by)) as guild_runs_creator_never_member
  from public.reserve_runs r;
```

Run these two **after the deploy**: the first should return zero rows (no policy remains on any of the four reserve tables); the second should show `relrowsecurity = true` and `relforcerowsecurity = false` on all four tables.

```sql
select tablename, policyname, cmd
  from pg_policies
 where schemaname = 'public'
   and tablename in ('reserve_runs', 'reserve_awards', 'reserve_submissions', 'reserve_audit_log')
 order by 1, 2;

select relname, relrowsecurity, relforcerowsecurity
  from pg_class
 where oid in ('public.reserve_runs'::regclass, 'public.reserve_awards'::regclass,
               'public.reserve_submissions'::regclass, 'public.reserve_audit_log'::regclass)
 order by 1;
```

## Closes

This closes follow-up FU-2 of quick task 261003-t28 (and its FU-3, the reserve_awards session policies).

## Publication note

The docs PR carrying this PLAN and this SUMMARY should merge only after both the migration (this task) and the OD-2 app fix (261004-29l) are deployed, so the published planning record does not describe a state the production app has not yet reached.

## Follow-ups (neutral wording, each stated as the rule to adopt)

- **FU-1:** the run list route should require an active membership in the requested guild and never return `raid_leader_token`.
- **FU-2:** the run route should treat as managers only the creator, leader-link holders and officers with Manage reserves (as `verifyReserveRunAccess` does), return `raid_leader_token` only to them, and apply the hidden-until-lock rule to sign-ups for everyone else; the audit route should follow the same rule for runs with no guild.
- **FU-3:** creator rights on a run with a guild should follow the OD-3 resolution in `verifyReserveRunAccess`, the run route and the join route.
- **FU-4:** `POST /api/reserve-runs` should accept `raid_team_id` and `expansion_id` only when they belong to the run's guild, and its and the duplicate route's "Officer-only" docstrings should say any active member may create a run.
- **FU-5:** `generate_reserve_leader_token` and `generate_reserve_token` should draw from a cryptographic source (`gen_random_bytes` or `gen_random_uuid`), and their `anon` and `authenticated` EXECUTE grants, kept in `20260930000200` for session inserts, can be revoked once no session inserts runs.

(OD-1 was resolved as B, so FU-0 from the plan, which would have applied only under OD-1 A, does not apply.)

## Task Commits

1. **Task 1: Tracer, reserve runs and awards are written only by the server, end to end in the database** - `a0eca365` (fix)

No further commit was needed: tsc and eslint passed on the first run, so no gate-fixup commit was required.

## Files Created/Modified

- `supabase/migrations/20261004010000_reserve_run_rules.sql` - drops the 9 session policies listed above; neutral header with Problem, Fix, Readers and writers checked, Error contract, Production safety, Not changed, Deploy and Rollback sections.
- `app/services/__tests__/reserve-run-rules-migration.test.ts` - pins the migration's timestamp anchoring, exact statement order, that each dropped policy's baseline text is used verbatim in the Rollback block, the header layout and wording constraints.

## Decisions Made

See OD-1, OD-2, OD-3 resolutions above (all resolved by the user, 2026-10-04, and recorded in the plan before execution).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dropped `RETURNING id` from the 0US-RB-3 proof insert**
- **Found during:** Task 1, Step 2 (PGlite proof)
- **Issue:** The PGlite scratchpad scenario used `INSERT ... RETURNING id` to recover the new row's id for cleanup. Because PostgreSQL also requires the SELECT policy to pass for a RETURNING row, and the inserting session (R1) could not select the new guild B run it had just inserted (not its creator, no active membership in guild B), the whole statement failed with the RLS error even though the INSERT policy itself was satisfied.
- **Fix:** Removed `RETURNING id` from that insert; the superuser connection looks up and removes the row by its known, unique fixture title instead.
- **Files modified:** none in the repository (scratchpad-only scenario file, never committed)
- **Verification:** the PGlite run after the fix shows 0US-RB-3 passing with the rollback applied, alongside every other check.

**2. [Rule 1 - Bug] Used a synthetic second officer, not the guild creator, for the 0US-AWD-4 delete check**
- **Found during:** Task 1, Step 2 (PGlite proof)
- **Issue:** The plan's behavior block named GM_A (a guild creator who owns no character) as the actor for 0US-AWD-4's delete attempt. Empirically, a guild creator with no character cannot UPDATE or DELETE another member's row today (see the "New finding" above), so GM_A's delete attempt was already a no-op before the migration too, which would make 0US-AWD-4 unable to distinguish the pre-migration state (where it is expected to succeed) from the post-migration state (where it is expected to be blocked).
- **Fix:** Added a synthetic second guild A officer (a new auth.users/characters/character_guild_memberships row, active at officer position, never used anywhere else) to perform the 0US-AWD-4 delete instead. This officer satisfies both the award table's SELECT policy and its DELETE policy today, so the check correctly fails before the migration and passes after. GM_A still performs 0US-AWD-2's insert check, which is unaffected by this finding.
- **Files modified:** none in the repository (scratchpad-only scenario file, never committed)
- **Verification:** the red run's FAIL set includes 0US-AWD-4 exactly as required; the Task 1 and final runs show it passing with zero FAIL lines overall.

---

**Total deviations:** 2 auto-fixed (both Rule 1, both confined to the uncommitted scratchpad PGlite proof script; neither changes the migration file, the shape test, or any requirement).
**Impact on plan:** No scope creep. Both fixes were necessary to make the proof script accurately exercise real PostgreSQL row-security behavior; the migration's own correctness and the shape test are unaffected.

## Issues Encountered

None beyond the two deviations above (both investigated and resolved during the PGlite proof work, not left open).

## User Setup Required

None - no external service configuration required. The production count queries above are for the user to run against Supabase before merging and after the deploy; they are not blocking this summary.

## Next Phase Readiness

- The migration and its shape test are committed on `fix/reserve-run-rules` (1 commit after `0da20f89`), ready to open as a migration-only PR once `20261003230000` (quick task 261003-t28) has merged.
- 261004-29l (the OD-2 app fix) and 261004-0ut (guild deletion with reserve runs) are separate, already-tracked quick tasks; this task does not block or depend on code changes in either, only on the recorded understanding that 261004-0ut removes reserve runs only with the service role or inside a SECURITY DEFINER function, never with a user session.
- No blockers for merging this PR after the 20261003230000 PR.

---
*Phase: quick-261004-0us*
*Completed: 2026-10-04*

## Self-Check: PASSED

- FOUND: `supabase/migrations/20261004010000_reserve_run_rules.sql`
- FOUND: `app/services/__tests__/reserve-run-rules-migration.test.ts`
- FOUND: commit `a0eca365` in `git log --oneline --all` (branch `fix/reserve-run-rules`)
- FOUND: `/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/pr-body-0us.md`
