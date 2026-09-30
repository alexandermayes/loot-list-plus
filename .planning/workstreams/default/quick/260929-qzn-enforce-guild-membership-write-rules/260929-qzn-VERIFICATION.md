---
phase: quick-260929-qzn-enforce-guild-membership-write-rules
verified: 2026-09-29T23:45:00Z
status: passed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Quick Task 260929-qzn: Guild Membership Write Rules Verification Report

**Task Goal:** Enforce guild membership write rules: user sessions cannot insert memberships or change role, guild, character or reactivate them (leaving stays allowed); custom roles from a user session stay below officer position; user sessions cannot change a guild's owner or subscription tier (new guilds start free); the unused membership insert and delete policies are dropped; the role-rename and rejoin routes follow the stored role and the default role.
**Verified:** 2026-09-29
**Status:** passed
**Re-verification:** No, initial verification

Code checked: worktree `scratchpad/wtms`, branch `fix/membership-write-rules`, 4 local commits over origin/main 77afa063 (24b56cef, a86ab311, 0f94477d, 75056d49). 6 files, 1005 insertions, 9 deletions.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | QZN-R1: anon or authenticated session cannot INSERT a membership (including the upsert insert phase); an own-row UPDATE is accepted only when every column other than is_active is unchanged and is_active is unchanged or false; refusals are 42501 with the RLS message and no DETAIL | VERIFIED | Migration lines 170-188: guard, then `TG_OP = 'UPDATE' AND (to_jsonb(NEW) - 'is_active') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'is_active') AND (NEW.is_active IS NOT DISTINCT FROM OLD.is_active OR NEW.is_active = false)`, else `RAISE EXCEPTION USING MESSAGE = <constant>, ERRCODE = 'insufficient_privilege'`. PGlite re-run: d2, e1, e2, f1, g1, g2, h1, B1-B6 (anon, member, officer; role, guild_id, character_id, membership_status, trial_started_at, promoted_at, joined_at, joined_via, is_active true, is_active NULL, leave plus role) all 42501 with the RLS message |
| 2 | QZN-R2: service_role, postgres, migrations and nested trigger writes are not checked, so every server flow keeps working | VERIFIED | Guard `coalesce(current_setting('role', true), '') NOT IN ('anon','authenticated') OR pg_trigger_depth() > 1` in all three bodies. PGlite L1-L20: guild creation with nested default roles, creator membership, invite and Discord joins and reactivations, add-character insert and reactivation, Battle.net upsert fresh and conflicting, role change with demotion, trial and auto-promote, kick, character removal, rename, ownership transfer, Stripe sync, account deletion, guild DELETE cascade |
| 3 | QZN-R2: leave through /api/guilds/leave still works and reject_submissions_on_cgm_loss still rejects the raider's lists | VERIFIED | app/api/guilds/leave/route.ts:73-76 sends only `{ is_active: false }` with the user session. No BEFORE UPDATE trigger on character_guild_memberships alters NEW, and the table has no generated columns, so the whole-row comparison holds. PGlite c1, c2, L13-L13d, L20b (legacy is_active NULL row) pass with lists moved to rejected |
| 4 | QZN-R3: user-session guild_roles INSERT only below 50 with is_default not true; UPDATE only moves position between values below 50; nested default roles not blocked | VERIFIED | Migration lines 212-232. RoleManager.tsx:101-109 inserts at `minPosition - 1`, is_default false; 214-223 swaps only positions among roles other than 50 and 100. PGlite L1c (defaults 100/50/0 from nested trigger at depth 2), L14-L14f pass; B9-B10c refused |
| 5 | QZN-R4, OD-2: user session cannot change guilds.created_by, cannot INSERT with a tier other than free, cannot change subscription_tier | VERIFIED | Migration lines 256-281, trigger `BEFORE INSERT OR UPDATE OF "created_by", "subscription_tier"`. POST /api/guilds (app/api/guilds/route.ts:91-103) sends no subscription_tier, so the default 'free' applies. Only writer of the tier is lib/billing/sync.ts via the Stripe webhook with the service role. PGlite L1, L15c pass; B11-B11f refused |
| 6 | QZN-R6: a refused member stays non-officer; pre-migration control shows the same statements succeeding | VERIFIED | PGlite a1-a8 (control succeeds, rolled back), then d3, d4, f2, h2, B12-B12g after the migration: is_guild_officer and is_guild_master false for member and inactive former officer, is_guild_master false for officer, member guilds UPDATE 0 rows. Helpers and policies on the three tables are unchanged since the baseline (checked all later migrations), so the harness uses the live definitions |
| 7 | QZN-R5 (D-07): PUT /api/guild-roles propagates from the stored name, never body old_name, only when it changes | VERIFIED | app/api/guild-roles/route.ts: old_name no longer destructured; stored name read with `.eq('id').eq('guild_id').maybeSingle()`; lookup error returns 500 `{ success: false }` before any write; propagation guarded by `storedRole && storedRole.name !== newName`, filters `role = storedRole.name`. Route test covers stored 'Raider' vs body 'Member', unchanged name, not found, lookup error, 403 |
| 8 | QZN-R5 (D-08): POST /api/characters/[id]/guilds reactivates with the insert branch role | VERIFIED | route.ts:157 `.update({ is_active: true, role })`, where `role` is Guild Master for the creator else getDefaultRoleName (lines 134-135). Route test covers non-creator (Member), creator (Guild Master), insert, 409, 404 |
| 9 | DELIVERY-R1 (D-10): neutral wording, vocabulary gate, no push, no PR | VERIFIED | Added lines (1005) and 4 commit messages: no em dash, plan vocabulary gate and a wider word list both clean. SUMMARY also clean. Branch has no upstream and no remote ref. All 4 commits carry the trailer. Worktree status clean, no planning files |

**Score:** 9/9 truths verified (0 present, behavior-unverified). Behaviour-dependent truths 1-6 are exercised by the PGlite harness, which was re-run for this verification; truths 7-8 by the new route tests, also re-run.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260930000100_enforce_guild_membership_write_rules.sql` | Three SECURITY DEFINER trigger functions and triggers, REVOKEs, two DROP POLICY IF EXISTS | VERIFIED | 17 statements; each function plpgsql, SECURITY DEFINER, search_path public, pg_temp; REVOKE ALL from PUBLIC, anon, authenticated; header has Problem, Fix, Why a trigger, Error contract, Rollback. libpg-query parse re-run: 17 of 17 OK plus 8 Rollback statements OK |
| `app/services/__tests__/guild-membership-write-rules-migration.test.ts` | Shape test | VERIFIED | Passes; covers timestamp, statement order, trigger events, read-only bodies, guard, error code, drops |
| `app/api/characters/[id]/guilds/route.ts` | Reactivation assigns insert branch role | VERIFIED | See truth 8 |
| `app/api/guild-roles/route.ts` | Rename from stored name | VERIFIED | See truth 7 |
| `scratchpad/pglite-qzn/scenarios-qzn.mjs` | Scratchpad PGlite proof | VERIFIED | Reads the real migration file and extracts 63 real baseline statements at run time; not committed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| PostgREST writes on character_guild_memberships | enforce_guild_membership_write_rules() | BEFORE INSERT OR UPDATE FOR EACH ROW | WIRED | Migration line 194; PGlite g2 and B2 confirm the upsert insert phase is refused |
| /api/guilds/leave | reject_submissions_on_cgm_loss() | accepted is_active false UPDATE, AFTER trigger fires | WIRED | PGlite c2, L13d |
| user-session guilds INSERT | create_default_guild_roles then enforce_guild_role_write_rules | nested INSERT at depth 2 exempt | WIRED | PGlite L1c, I7, I8 |
| officer checks | cgm.role, is_active, guild_roles.position, guilds.created_by | columns now protected | WIRED | PGlite B12 block |

### Critical review of the migration

- **Role detection.** `current_setting('role', true)` keeps the PostgREST session role inside SECURITY DEFINER functions (PGlite L19: `authenticated` inside, current_user the owner). The same approach is already live in 20260929180000. No migration or function sets the role setting (grep for `set_config('role'` and `SET ROLE` found nothing), and set_config is not exposed through PostgREST.
- **`pg_trigger_depth() > 1` exemption.** The only trigger function in the schema that writes any of the three tables is create_default_guild_roles, which inserts fixed names, colours and positions keyed to NEW.id of a guild the session just created with created_by set to itself (required by the guilds INSERT policy). No foreign key into these tables uses ON UPDATE CASCADE. The only SET NULL action (guilds.active_expansion_id) updates a column outside the guilds trigger column list. FK cascades into memberships and roles are DELETEs, which the triggers do not handle. So a user session cannot reach a depth-2 write to these tables with values it controls. SECURITY DEFINER RPCs run by a user session execute at depth 0, so their writes are checked at depth 1.
- **Whole-row comparison.** character_guild_memberships has no generated columns and no other BEFORE trigger, so NEW compared with OLD reflects only the caller's change. NULL is handled with IS NOT DISTINCT FROM; is_active NULL to false is accepted, false or true to NULL is refused (B5b).
- **guild_roles.** position is NOT NULL; the INSERT rule refuses is_default true and allows NULL or false. The only other guild_roles trigger (enforce_max_roles, BEFORE INSERT) sorts after this one and does not change NEW.
- **guilds.** subscription_tier is NOT NULL DEFAULT 'free' with a CHECK; the column list applies to UPDATE only, so every INSERT is checked. Existing SQL functions that update guilds (set_guild_active_expansion, update_guild_icon, update_guild_info) set no listed column.
- **delete_guild** (20260722000001) only DELETEs from memberships, roles and guilds and runs as the table owner, so dropping the DELETE policy does not affect it (PGlite stand-in L19b).
- **REVOKEs and idempotence.** EXECUTE revoked from PUBLIC, anon, authenticated for all three functions. Every statement is CREATE OR REPLACE, COMMENT, REVOKE or DROP POLICY IF EXISTS; PGlite I1-I8 re-apply cleanly; the header Rollback restores the previous behaviour (R1-R5).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| PGlite matrix | `node scenarios-qzn.mjs` in scratchpad/pglite-qzn | 163 PASS, 0 FAIL, exit 0 | PASS |
| SQL parse | `node parse-qzn.mjs` in pglite-qzn/parse | 17 statements OK, 8 Rollback OK, 0 ERROR, exit 0 | PASS |
| New test files | `npx vitest run app/api/guild-roles "app/api/characters/[id]/guilds" app/services/__tests__/guild-membership-write-rules-migration.test.ts` | 3 files, 20 tests passed | PASS |
| Type check | `npx tsc --noEmit` | exit 0, no output | PASS |
| Lint | `npx eslint --max-warnings 0` on changed files | exit 0 | PASS |
| Full suite (run once) | `npx vitest run` | 2497 of 2498 passed; the one failure was a 5 s timeout in `__tests__/quality-brand-token-parity.test.ts`, a file this branch does not touch; re-run alone it passes (3 of 3). The executor's saved final run shows 2498 of 2498 | PASS (unrelated timing) |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| QZN-R1 | Membership writes from user sessions limited to leaving | SATISFIED | Truth 1 |
| QZN-R2 | Server flows and leave keep working | SATISFIED | Truths 2, 3 |
| QZN-R3 | User-session guild roles stay below 50 | SATISFIED | Truth 4 |
| QZN-R4 | Owner and tier server-managed | SATISFIED | Truth 5 |
| QZN-R5 | Rename and rejoin routes follow stored and default role | SATISFIED | Truths 7, 8 |
| QZN-R6 | Refused writes leave officer checks false | SATISFIED | Truth 6 |
| DELIVERY-R1 | Wording and delivery constraints | SATISFIED | Truth 9 |

OD-1 (which callers may add a character to a guild) is out of scope by user decision and recorded as a follow-up in the SUMMARY, not partly implemented.

### Anti-Patterns Found

None. No TBD, FIXME, XXX, TODO or HACK markers in the six changed files.

### Notes (informational, not gaps)

1. The depth exemption relies on no future trigger function writing these three tables with values taken from a user-controlled row. The migration header states this; later migrations that add such a trigger should re-check it.
2. PUT /api/guild-roles still lets any officer rename any role, including roles at 50 and 100. Holders now move with the role, so no one's position changes. The stored-name read and the rename are separate statements, so two concurrent renames of the same role are best-effort, as propagation already was.
3. For the joined run with 260929-qg0: a raider's own-session DELETE of a membership row now removes 0 rows (DELETE policy dropped), and reject_submissions_on_cgm_loss writes loot_submissions at trigger depth 2. The SUMMARY records both.

### Human Verification Required

None.

### Gaps Summary

No gaps. The migration, its shape test, the two route changes and their tests exist, are wired and behave as the goal states. The PGlite matrix, parse check, route tests, tsc and lint were re-run for this verification.

---

_Verified: 2026-09-29_
_Verifier: Claude (gsd-verifier)_
