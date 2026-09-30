---
phase: quick-260929-qzn
plan: 01
subsystem: database, api
status: complete
tags: [supabase, rls, triggers, guild-membership, guild-roles, pglite]
requires:
  - baseline schema policies and helpers (is_guild_officer, is_guild_master, create_default_guild_roles, reject_submissions_on_cgm_loss)
provides:
  - enforce_guild_membership_write_rules (character_guild_memberships)
  - enforce_guild_role_write_rules (guild_roles)
  - enforce_guild_owner_write_rules (guilds)
  - PUT /api/guild-roles rename propagation from the stored role name
  - POST /api/characters/[id]/guilds reactivation with the insert branch role
affects:
  - 260929-qg0 joined-branch PGlite matrix (own-session membership DELETE expectation)
tech-stack:
  added: []
  patterns:
    - SECURITY DEFINER BEFORE trigger gated on current_setting('role', true) IN ('anon', 'authenticated') and pg_trigger_depth() > 1
    - whole-row NEW vs OLD comparison via to_jsonb(NEW) - '<column>'
key-files:
  created:
    - supabase/migrations/20260930000100_enforce_guild_membership_write_rules.sql
    - app/services/__tests__/guild-membership-write-rules-migration.test.ts
    - app/api/guild-roles/__tests__/route.test.ts
    - app/api/characters/[id]/guilds/__tests__/route.test.ts
  modified:
    - app/api/guild-roles/route.ts
    - app/api/characters/[id]/guilds/route.ts
decisions:
  - "OD-1 left out (separate follow-up quick task right after this PR ships); OD-2 included (subscription_tier); OD-3 included (membership DELETE policy dropped)"
  - "Refused user-session writes raise 42501 with the RLS message and no DETAIL; the rules read only NEW, OLD, TG_OP, trigger depth and the role setting"
  - "The PGlite matrix lives in a second scratchpad module (scenarios-qzn-full.mjs) imported by scenarios-qzn.mjs"
metrics:
  duration: 25min
  completed: 2026-09-29
  tasks: 3
  files: 6
estimate:
  tokens: 200000
  tasks: 3
actuals:
  tokens: 11400
  tasks: 3
  commits: 4
---

# Quick Task 260929-qzn: Guild Membership Write Rules Summary

Three SECURITY DEFINER BEFORE triggers hold user sessions to the flows the app actually uses: on character_guild_memberships a session can only leave a guild (set is_active to false on its own rows); on guild_roles it can only add or move roles below position 50; on guilds it cannot change created_by or subscription_tier. Two service-role routes now follow the position hierarchy: PUT /api/guild-roles propagates renames from the stored role name, and POST /api/characters/[id]/guilds reactivates with the same role its insert branch assigns.

## Commits (local only, branch fix/membership-write-rules in WT, nothing pushed, no PR)

| # | Hash | Message |
|---|------|---------|
| 1 | 24b56cef | fix(guilds): membership rows are written by the server; a user session can only leave a guild |
| 2 | a86ab311 | fix(guilds): keep guild roles at or above officer level and guild ownership server-managed |
| 3 | 0f94477d | test(guilds): satisfy strict index checks in the membership rules shape test |
| 4 | 75056d49 | fix(guilds): role renames follow the stored role name and rejoining a guild assigns the default role |

All four carry the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The branch has no upstream.

Final migration file: `supabase/migrations/20260930000100_enforce_guild_membership_write_rules.sql` (17 statements).

## Final rule list

Every rule applies only when `current_setting('role', true)` is `anon` or `authenticated` and `pg_trigger_depth()` is 1. service_role, postgres, migrations and writes made by another trigger function are never checked. A refused write raises SQLSTATE 42501 with `new row violates row-level security policy for table "<table>"` and no DETAIL.

1. character_guild_memberships (BEFORE INSERT OR UPDATE, per row, no column list, no DELETE):
   - every INSERT is refused, including the insert phase of an upsert;
   - an UPDATE is accepted only when `(to_jsonb(NEW) - 'is_active') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'is_active')` and is_active is unchanged or set to false.
   - Policies dropped: "Users can insert own character memberships" and "Users can delete own character memberships" (OD-3). The UPDATE and both SELECT policies stay.
2. guild_roles (BEFORE INSERT OR UPDATE, per row, no column list, no DELETE):
   - an INSERT is accepted only with position below 50 and is_default not true;
   - an UPDATE is accepted only when every column other than position is unchanged and position is unchanged or moves between two values below 50.
3. guilds (BEFORE INSERT OR UPDATE OF created_by, subscription_tier, per row):
   - an INSERT is accepted only with subscription_tier 'free' (the column default applies before the trigger, so POST /api/guilds passes);
   - an UPDATE is accepted only when created_by and subscription_tier are both unchanged.
4. PUT /api/guild-roles: reads the stored name (service role, `select name, eq id, eq guild_id, maybeSingle`); a lookup error returns 500 `{ success: false }` with no write (RoleManager then shows its existing fallback "Couldn't save role"); propagation runs only when the stored row exists and its name differs from `name.trim()`, filtered on the stored name, guild_id and is_active true. The body's old_name is no longer read. RoleManager is the only caller and needs no change.
5. POST /api/characters/[id]/guilds: the reactivation branch updates `{ is_active: true, role }`, where role is the value the insert branch already computes (Guild Master for the guild creator, otherwise getDefaultRoleName). Response shape unchanged.

Legacy note (D-04): a custom role at position 50 or above, which the current UI cannot create, can now be moved only by the service role. Legacy memberships (a role naming no guild_roles row, is_active NULL) stay readable and stay writable by the service role; a user session can still leave on such a row. The migration validates and changes no existing row.

## Executor verifies first (Task 2)

- `lib/billing/sync.ts` (`syncSubscriptionToGuild`) receives the client from `app/api/webhooks/stripe/route.ts`, which passes `createServiceRoleClient()` (line 162). It is the only writer of guilds.subscription_tier.
- guilds.created_by is written only by `app/api/guilds/transfer-ownership/route.ts` (service role). The user-session guilds INSERT in POST /api/guilds sends created_by = the caller and no subscription_tier.
- guild_roles writes: RoleManager (user session: INSERT at `minPosition - 1` with is_default false, position swaps, DELETE), PUT /api/guild-roles (service role), POST /api/guilds default roles (service role), create_default_guild_roles (nested trigger), dev scripts (service role).
- SQL functions that update guilds from a user session (active expansion, icon, basic info, delete_guild) touch none of created_by or subscription_tier. No SQL function writes guild_roles except create_default_guild_roles.
- Result: no user-session writer outside RoleManager exists, so no checkpoint was needed.

## Verification

| Check | Baseline (77afa063) | Final |
|-------|---------------------|-------|
| npx vitest run | 132 files, 2478 tests passed, 0 failed | 135 files, 2498 tests passed, 0 failed (+3 files, +20 tests: 10 shape, 5 guild-roles route, 5 characters route) |
| npx tsc --noEmit | exit 0, no output | exit 0, no output |
| npx eslint --max-warnings 0 (changed files) | n/a | exit 0, no output |
| Text gates (added lines and commit messages, guarded non-empty diff) | n/a | no em dash, vocabulary gate clean |

Output files (scratchpad = `/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad`):
- `baseline-qzn-vitest.txt`, `baseline-qzn-tsc.txt`
- `final-qzn-vitest.txt`, `final-qzn-tsc.txt`, `final-qzn-eslint.txt`, `final-qzn-diff.txt`

### PGlite proof (scratchpad only, never committed)

Harness: `pglite-qzn/scenarios-qzn.mjs` (tracer, controls, timings) plus `pglite-qzn/scenarios-qzn-full.mjs` (full matrix, imported). Real baseline statements are extracted at run time (63 statements: the four tables, their keys, FKs, cgm indexes, is_guild_officer, is_guild_master, character_belongs_to_user, get_user_guild_ids, reject_submissions_on_cgm_loss, create_default_guild_roles, check_max_roles_per_guild, their triggers, all 12 policies on the three tables, RLS enable, grants) plus the guilds.game ADD COLUMN; stand-ins are documented in the file header.

| Run | Output | Result |
|-----|--------|--------|
| Task 1 tracer | `pglite-qzn/run-output-qzn-task1.txt` | 25 PASS, 0 FAIL, exit 0 |
| Task 2 full matrix | `pglite-qzn/run-output-qzn.txt` | 163 PASS, 0 FAIL, exit 0 |
| libpg-query parse | `pglite-qzn/parse-output-qzn.txt` (script `pglite-qzn/parse/parse-qzn.mjs`) | 17 of 17 statements OK plus the 8-statement Rollback block OK, 0 ERROR, exit 0 |

The full run covers: the pre-migration control (a member session sets its own role to Officer, is_guild_officer turns true and the guilds UPDATE affects 1 row; an officer session inserts a role at 100 and changes created_by and subscription_tier; all rolled back); leave with the auto-reject; every service-role flow in the plan (guild creation with nested default roles, creator membership, invite and Discord joins and reactivations, add-character insert and reactivation, Battle.net upsert fresh and conflicting, role change with Guild Master demotion, trial and auto-promote, kick with auto-reject, character removal, role rename with stored-name propagation, ownership transfer, Stripe sync, account deletion, guild DELETE cascade); user-session flows (leave, leave re-send, RoleManager insert at -1, swaps, delete, officer settings edits, own character DELETE cascading with auto-reject, a delete_guild stand-in called from the GM session, leave on a legacy is_active NULL row); every blocked case for anon, member and officer sessions; the officer checks afterwards (is_guild_officer and is_guild_master false for the member and the inactive former officer, is_guild_master false for the officer, member guilds UPDATE 0 rows); idempotent re-apply; and the header Rollback in a transaction restoring the control behaviour. L19 also confirms that inside a SECURITY DEFINER function the role setting stays `authenticated` while current_user is the owner.

Timings (informational, 200 statements each, PGlite in-process, noisy):

| Statement | Before | After |
|-----------|--------|-------|
| service-role membership UPDATE | 83.2 ms | 90.8 ms |
| leave-shape UPDATE (user session) | 434.2 ms | 212.5 ms |

## Joined-branch proof note (for the combined run with 260929-qg0)

OD-3 drops "Users can delete own character memberships", so on the joined branch a raider's own-session DELETE of a membership row removes 0 rows and leaves that raider's loot lists unchanged. The qg0 matrix scenario that expects that DELETE to auto-reject lists must instead expect 0 rows deleted and unchanged lists. Leaving through the user-session UPDATE of is_active to false still auto-rejects the raider's pending and approved lists, and the service-role DELETE paths (account deletion, character deletion cascade) still fire the auto-reject, so those qg0 expectations are unchanged. A user session DELETE of its own character also still cascades to its memberships and fires the auto-reject (L18). Note for the combined run: reject_submissions_on_cgm_loss updates loot_submissions from inside a trigger, so any qg0 trigger on loot_submissions sees pg_trigger_depth() = 2 there.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Strict index check in the shape test**
- **Found during:** Task 3 full verification
- **Issue:** `npx tsc --noEmit` reported TS2532 at `raises[0].replace(...)` in the Task 2 shape test: the `?? []` fallback makes the element type possibly undefined. Vitest had passed because its transform does not type-check.
- **Fix:** `(raises[0] ?? '').replace(...)`; the preceding `toHaveLength(1)` assertion still guards it.
- **Files modified:** app/services/__tests__/guild-membership-write-rules-migration.test.ts
- **Commit:** 0f94477d (separate small commit, so the project has four commits instead of three)

### Other notes

- The PGlite matrix is split into `scenarios-qzn-full.mjs`, imported by `scenarios-qzn.mjs` (the qg0 harness used the same split). Both stay in the scratchpad.
- Several harness-side mistakes were corrected during the run (parameter type casts, one legitimate flow run under the wrong user, two blocked cases that wrote a column's current value). None needed a migration change.
- The worktree branch `fix/membership-write-rules` sits outside the executor's agent-* branch allow-list; commits went there because the orchestrator named that branch. It is not a protected ref.
- STATE.md and ROADMAP.md were not touched (the orchestrator handles the docs commit for quick tasks).

## Follow-ups

- OD-1 (user decision 2026-09-29): a separate quick task, started right after this PR ships, decides which callers may add a character to a guild through POST /api/characters/[id]/guilds and POST /api/battlenet/characters/import. Track it without public detail until deployed.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: supabase/migrations/20260930000100_enforce_guild_membership_write_rules.sql
- FOUND: app/services/__tests__/guild-membership-write-rules-migration.test.ts
- FOUND: app/api/guild-roles/__tests__/route.test.ts
- FOUND: app/api/characters/[id]/guilds/__tests__/route.test.ts
- FOUND commits: 24b56cef, a86ab311, 0f94477d, 75056d49

## Delivery (orchestrator, 2026-09-30)

- Shipped together with 260929-qg0, 260929-qzn, 260929-wcr and a guarded exec_sql grant migration (20260930000300) in PR #328, squash-merged as 86e1d6ff after every CI check passed.
- The combined branch was rebuilt as clean commits with a tree identical to the proven head. Full suite on it: 141 files, 2554 tests passing. PGlite with all migrations applied: loot-list 177/177, membership 178/178, joint flows 144/144, function grants 372/372, exec_sql 15/15.
- Deploy Migrations applied all four migrations in production on 2026-09-30 at 17:42 UTC. The Vercel production deploy succeeded.
- Live read-only anon probes after deploy: get_guild_expansions returns 200 (still public); get_guild_current_expansion and is_past_deadline return 42501 permission denied (now service-role only).
- Still open: a manual smoke test of the app flows, and the read-only catalog queries in the Supabase SQL editor.
