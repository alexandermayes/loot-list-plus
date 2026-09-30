---
phase: quick-260929-wcr
verified: 2026-09-30T07:30:00Z
status: human_needed
score: 11/11 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Run the four read-only catalog queries from the plan's 'Production catalog check' section in the Supabase SQL editor before the deploy, and again after it"
    expected: "Before: query 1 lists the same 42 public functions as the inventory (no extra functions such as exec_sql, no dashboard-added grants or policies); query 3 returns no rows; query 4 returns one row. After: query 1 has 42 rows (47 if qg0 and qzn deploy too) with anon true on 10, authenticated true on 14, service_role true on all, and search_path_pinned true on every definer row; queries 3 and 4 return no rows."
    why_human: "The code, the migrations and the PGlite proof can only show the state the repo defines. Drift in production (functions, grants or policies created outside migrations) can only be seen in the live catalog, and the plan (D-08) assigns this read-only check to the user."
---

# Quick task 260929-wcr: Tighten database function EXECUTE grants Verification Report

**Task goal:** Tighten EXECUTE grants on public-schema database functions (remove the PUBLIC default, and anon and authenticated where they should not call a function, with explicit grants for each function's real callers), drop the guild_invite_codes "Anyone can view active invite codes" SELECT policy, and pin search_path on the four SECURITY DEFINER functions that lack it, without breaking any app flow.
**Verified:** 2026-09-30
**Status:** human_needed (all code checks pass; one production catalog check remains for the user)
**Re-verification:** No, initial verification
**Code under review:** worktree `scratchpad/wtfx`, branch `fix/function-execute-grants`, 4 local commits over origin/main 77afa063 (f9bd866a, 40932bae, 4c7a0992, c63dccf4). No upstream is configured, so nothing is pushed.

## Independent caller enumeration (done by the verifier, not taken from the SUMMARY)

Every `.rpc(` call and every `rpc` / `rest/v1/rpc` string in app, utils, lib, domain, components, discord-bot, companion, addon, scripts and loadtest (tests excluded) was grepped, and the client in each file was read.

| Call site | Function | Client | Role at runtime | EXECUTE after 20260930000200 | OK |
|---|---|---|---|---|---|
| app/contexts/ExpansionContext.tsx:52 | get_guild_expansions | utils/supabase/client (browser) | anon or authenticated | anon, authenticated, service_role | yes |
| app/(app)/guild-settings/components/ExpansionManager.tsx:120 | get_guild_expansions | utils/supabase/client | authenticated | same | yes |
| app/(app)/expansions/[expansionId]/_client.tsx:282 | get_guild_expansions | utils/supabase/client | authenticated | same | yes |
| app/api/guilds/[id]/expansions/route.ts:55 | get_guild_expansions | server createClient (line 26) | authenticated | same | yes |
| app/api/addon/export-string/route.ts:79 | get_guild_expansions | createServiceRoleClient (line 30) | service_role | same | yes |
| app/contexts/LootListContext.tsx:805, 918 | save_submission_items | utils/supabase/client | authenticated | authenticated, service_role | yes |
| app/api/guilds/route.ts:410 | delete_guild | server createClient (line 395) after getAuthenticatedUser | authenticated | authenticated, service_role | yes |
| app/api/guilds/delete/route.ts:49 | delete_guild | server createClient (line 14) after getAuthenticatedUser | authenticated | authenticated, service_role | yes |
| app/api/guild-invites/[code]/route.ts:123 | redeem_invite_code | server createClient (line 110) after getAuthenticatedUser | authenticated | authenticated, service_role | yes |
| app/services/expansionSeeder.ts:391 | create_expansion_for_guild | caller's client, only when useServiceRole=false | none today: all three callers (guilds, change-expansion, [id]/expansions routes) pass the service-role client with useServiceRole=true | authenticated, service_role | yes |
| app/api/guild-invites/route.ts:41 | generate_invite_code | serviceSupabase (line 17) | service_role | service_role | yes |
| app/api/guilds/reset-season/route.ts:66 | reset_guild_season | createServiceRoleClient (line 45) | service_role | service_role | yes |
| app/api/guild-settings/route.ts:358 | recompute_blp_for_guild | serviceSupabase (line 293) | service_role | service_role | yes |
| app/api/guilds/[id]/expansions/[expansionId]/phase-groups/route.ts:92, 198 | merge_phase_groups | serviceSupabase (lines 91, 136) | service_role | service_role | yes |
| utils/blp/recompute.ts:23, 43 | recompute_blp_for_item, recompute_blp_for_event | parameter typed as the service-role client; all 10 callers (blp/update, addon import-string, loot-award, attendance, attendance/bulk via withPermission `service`, loot-history/bulk) pass createServiceRoleClient | service_role | service_role | yes |
| discord-bot/help.js:50 | search_help_articles | feedback.js getSupabase, built on SUPABASE_SERVICE_ROLE_KEY | service_role | anon, authenticated, service_role | yes |
| scripts/run-migration.ts:50-60 | exec_sql | n/a | n/a | not defined by any migration and not named here | n/a |

No user-session call reaches a function that becomes service-role only. The companion and addon code make no RPC calls; loadtest uses the anon key for auth only. No direct SQL outside the migrations names any restricted function (grep of all 28 class a and c names outside supabase/migrations finds only the call sites above, types in lib/database.types.ts and tests).

**RLS policy expressions (all 141 CREATE/ALTER POLICY statements across all migrations, none with a TO clause):** the functions they call are is_guild_officer (baseline, 20260804000001, 20260826000000), get_current_user_guild_ids (baseline, 20260722000002, 20260804000001), get_user_guild_ids (baseline, 20260722000002), is_guild_master, character_has_submission_to_user_guilds and character_belongs_to_user, all class d with explicit anon, authenticated and service_role grants after the migration. The other two names found (user_is_in_guild, user_is_officer_in_guild) belong to baseline policies whose functions 20260804000001 drops. No policy calls a class a, b or c function.

**Column defaults:** the only public functions used as defaults are generate_reserve_token and generate_reserve_leader_token (reserve_runs), which the migration does not name. No CHECK constraint, generated column or view calls a public function.

**Nested calls:** every class d, e and b function is SECURITY DEFINER, so nested calls run as the owner. The SECURITY INVOKER bodies (check_max_roles_per_guild, the three updated_at triggers, generate_reserve_*, seed_tbc_expansion, is_invite_code_valid) call no public function.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | WCR-R1: the 20 class a functions are not executable by PUBLIC, anon or authenticated; each is executable by service_role (includes the six from 20260722000001 and is_invite_code_valid) | VERIFIED | Migration lines for all 20 use `FROM PUBLIC, "anon", "authenticated"` then `TO "service_role"`. PGlite re-run: has_function_privilege public/anon/authenticated false, service_role true for each; direct calls as anon and authenticated give 42501 |
| 2 | WCR-R2: the four class b functions are executable by authenticated and service_role only; signed-in sessions reach in-function checks; anon gets 42501 | VERIFIED | `FROM PUBLIC, "anon"` then `TO "authenticated", "service_role"`. PGlite: delete_guild, save_submission_items, create_expansion_for_guild raise P0001 for a non-officer, redeem_invite_code returns NOT_FOUND; all four give anon 42501 |
| 3 | WCR-R3: the eight trigger functions are not executable by PUBLIC, anon or authenticated, and triggers still fire | VERIFIED | Eight REVOKEs, no GRANT. PGlite: authenticated guild insert creates 3 default roles, the eleventh role raises the INVOKER trigger's P0001, user_preferences update changes updated_at; direct call of update_updated_at_column gives 42501 |
| 4 | WCR-R4: class d and e keep explicit anon, authenticated, service_role with PUBLIC removed; policies on character_guild_memberships and profiles still run | VERIFIED | `FROM PUBLIC` then the three-role GRANT for all 8. PGlite: anon, G, O and M SELECTs on both tables return the same rows as before with no 42501. Independent policy scan above confirms no other helper is used |
| 5 | D-05: generate_reserve_token and generate_reserve_leader_token are not named | VERIFIED | Absent from the comment-stripped migration (shape test and grep); header mentions them only in the Not changed comment |
| 6 | D-01, D-03: exactly 77 statements (40 REVOKE, 32 GRANT, 4 ALTER, 1 DROP POLICY), every REVOKE includes PUBLIC, idempotent | VERIFIED | Shape test 16/16 pass; libpg-query re-run 89 PASS 0 FAIL (40 GrantStmt revoke, 32 grant execute, 4 AlterFunctionStmt, 1 DropStmt missing_ok); PGlite second apply gives an identical ACL snapshot |
| 7 | WCR-R6: guild_invite_codes has no client SELECT policy; anon, non-officer and officer read 0 rows without error; invite flow still works; anon gets 42501 on redeem | VERIFIED | DROP POLICY name matches baseline line 3475 exactly; no later migration touches that table's policies; no FORCE ROW LEVEL SECURITY anywhere. All seven readers/writers of the table use createServiceRoleClient or createAdminClient (SUPABASE_SERVICE_ROLE_KEY). PGlite: 0 rows for anon, M, O; service_role inserts and looks up; M redeems twice then MAX_USES_REACHED; inactive code DEACTIVATED |
| 8 | WCR-R7: search_path pinned to public, pg_temp on can_view_master_sheet, get_guild_expansions, get_user_guild_ids, update_guild_info with unchanged results, including with a scratch schema ahead of public | VERIFIED | Four ALTER statements with signatures matching the baseline headers (only definitions; no later redefinition). Bodies read: only public tables, pg_catalog built-ins and schema-qualified auth.uid(). PGlite: proconfig `search_path=public, pg_temp`, no definer function left unpinned, results deep-equal before and after, and the scratch-schema control flips from 0 rows to the recorded results |
| 9 | WCR-R5: the shape test fails for a later migration that creates a public function without revoking PUBLIC; proven on inline samples | VERIFIED | findUnrevokedPublicFunctions is tested on flagged, revoked, REVOKE-without-PUBLIC, lowercase unquoted, other-schema and commented-out cases, and applied to every file with timestamp > 20260930000200 (none exist yet, so that test is currently vacuous but wired) |
| 10 | D-10: names no function from qg0 or qzn and applies on 77afa063 alone | VERIFIED | No `enforce_loot_submission_` or `enforce_guild_` in the file; PGlite loads only origin/main migrations plus this one with 0 errors |
| 11 | DELIVERY-R1: PGlite 0 FAIL; full vitest, tsc and eslint show no regression; no em dashes or gate words; local commits only | VERIFIED | Re-run: scenarios 332 PASS 0 FAIL, catalog 52 PASS 0 FAIL, parser 89 PASS 0 FAIL; shape test 16/16; `npx tsc --noEmit` exit 0 with empty output; eslint exit 0. Saved full vitest run (started 00:14:43, after the final commit at 00:14:28): 133 files, 2494 tests pass vs baseline 132/2478. Added lines and commit messages: 0 em or en dashes, 0 vocabulary-gate hits; all four commits carry the trailer; no upstream configured; git status clean; diff is the two expected files |

**Score:** 11/11 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260930000200_tighten_function_execute_grants.sql` | 77 statements by class, DROP POLICY, four search_path pins, neutral header | VERIFIED | 167 lines; header sections Background, Rule per class, Invite codes, search_path, Not changed, Rollback; header claim that 20260722000001 and 20260729000001 revoked from anon and authenticated only is accurate (checked both files) |
| `app/services/__tests__/function-execute-grants-migration.test.ts` | Whitelist, per-function role sets, signature cross-check, ratchet | VERIFIED | 436 lines, 16 tests pass, contains findUnrevokedPublicFunctions; signature check compares each parameter list to the latest defining CREATE header and rejects a later DROP |
| PGlite proof (scratchpad only) | 0 FAIL | VERIFIED | Re-run by the verifier; loads real migration text; exits non-zero on any FAIL |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| Service-role routes and utils/blp/recompute.ts | class a functions | GRANT EXECUTE TO service_role | WIRED | Every class a call site uses a service-role client (table above) |
| User-session callers | class b and e functions | GRANT EXECUTE TO authenticated | WIRED | LootListContext, both delete_guild routes, invite redeem route, expansion readers |
| Invite routes (service role) and redeem_invite_code (owner) | guild_invite_codes | service_role bypasses RLS; owner not subject to RLS (not forced) | WIRED | Proven in PGlite; no client read found in code |
| Policies and callers of the four unpinned functions | public tables | ALTER FUNCTION ... SET search_path | WIRED | Proven with the scratch-schema control |

### Signature and overload check

PGlite reports exactly 42 pg_proc rows in public, one per inventory name, so there are no overloads. Each statement's parameter list matches the function's latest CREATE header (shape test), and every REVOKE, GRANT and ALTER resolved against the real definitions when PGlite applied the file (an unknown signature would raise an error).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | | No TBD, FIXME, XXX, TODO or placeholder text in either added file | | |

Info only: after the change, a signed-out browser call to save_submission_items gets a permission error (42501) where it previously got the in-function refusal. Both are errors, and the app only calls it with a session.

### Human Verification Required

#### 1. Production catalog check

**Test:** Run the four read-only catalog queries from the plan's "Production catalog check" section in the Supabase SQL editor before the deploy and again after it.
**Expected:** Before, query 1 shows the 42 inventory functions and nothing unexpected (no exec_sql, no extra grants or policies from outside migrations); query 3 returns no rows; query 4 returns one row. After, query 1 has 42 rows (47 with qg0 and qzn) with anon true on 10, authenticated on 14, service_role on all, and search_path pinned on every definer row; queries 3 and 4 return no rows.
**Why human:** Production drift outside the migrations can only be seen in the live catalog, and D-08 assigns this metadata-only check to the user.

### Gaps Summary

No gaps. The migration matches the plan's inventory exactly, every caller in the repo keeps EXECUTE on the function it calls, every policy helper and column-default function stays executable by the roles that need it, and the proofs re-run clean. The one remaining item is the user's production catalog check.

---

_Verified: 2026-09-30_
_Verifier: Claude (gsd-verifier)_
