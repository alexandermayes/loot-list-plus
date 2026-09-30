---
phase: quick-260929-wcr
plan: 01
status: complete
subsystem: database
tags: [supabase, migrations, grants, rls, search_path]
requires:
  - origin/main 77afa063
provides:
  - supabase/migrations/20260930000200_tighten_function_execute_grants.sql
  - app/services/__tests__/function-execute-grants-migration.test.ts
affects:
  - EXECUTE grants on 40 public-schema functions
  - guild_invite_codes SELECT policy (dropped)
  - search_path on can_view_master_sheet, get_guild_expansions, get_user_guild_ids, update_guild_info
tech-stack:
  added: []
  patterns:
    - "REVOKE ALL ... FROM PUBLIC plus the roles that should not call a function, then GRANT EXECUTE to the roles that should"
    - "Shape-test ratchet: later migrations that create a public function must revoke PUBLIC on it"
key-files:
  created:
    - supabase/migrations/20260930000200_tighten_function_execute_grants.sql
    - app/services/__tests__/function-execute-grants-migration.test.ts
  modified: []
decisions:
  - "OD-01 to OD-04 applied as accepted on 2026-09-29 (no default-privilege change; get_user_guild_ids and get_guild_expansions keep anon, authenticated, service_role; redeem_invite_code keeps authenticated and service_role)"
  - "D-11 applied: the client SELECT policy on guild_invite_codes is dropped; is_invite_code_valid becomes service-role only"
  - "D-12 applied: search_path pinned to public, pg_temp on the four remaining SECURITY DEFINER functions"
metrics:
  duration: "about 20 minutes"
  completed: 2026-09-30
actuals:
  tokens: 22900   # chars/4 over the two repo files (34,729 chars) plus the three scratchpad proof scripts (56,726 chars); repo files alone about 8,700
  tasks: 3
  commits: 4
---

# Quick task 260929-wcr: Tighten database function EXECUTE grants Summary

One migration of 77 statements that sets explicit EXECUTE grants for 40 public functions by caller class (PUBLIC revoked on each), drops the client SELECT policy on guild_invite_codes and pins search_path on four SECURITY DEFINER functions. A vitest shape test locks it and ratchets later migrations. PGlite and libpg-query proofs show 0 FAIL lines.

## Commits (local only, branch fix/function-execute-grants in wtfx, not pushed, no PR)

| # | Hash | Message |
|---|------|---------|
| 1 | f9bd866a | fix(db): revoke the PUBLIC EXECUTE default so six functions are service-role only |
| 2 | 40932bae | fix(db): set explicit EXECUTE grants on every public function by caller |
| 3 | 4c7a0992 | fix(db): remove the client read policy on guild_invite_codes and pin search_path on four functions |
| 4 | c63dccf4 | test(db): type the parsed statements in the function grants shape test |

All four carry the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The branch diff against origin/main is two added files (603 lines), git status is clean, and there are no planning files in the worktree diff.

## Migration

`supabase/migrations/20260930000200_tighten_function_execute_grants.sql`: 77 statements, namely 40 `REVOKE ALL ON FUNCTION`, 32 `GRANT EXECUTE ON FUNCTION`, 4 `ALTER FUNCTION ... SET search_path TO 'public', 'pg_temp'` and 1 `DROP POLICY IF EXISTS "Anyone can view active invite codes" ON "public"."guild_invite_codes"`. Every REVOKE includes PUBLIC. The header sections are Background, Rule per class, Invite codes, search_path, Not changed and Rollback, plus a one-line comment per group. It names none of the functions from qg0 or qzn.

### Final grants by class

| Class | Count | Functions | EXECUTE after (besides owner) |
|-------|-------|-----------|-------------------------------|
| a | 20 | merge_phase_groups, reset_blp, increment_blp, increment_blp_bulk, seed_tbc_expansion, seed_tbc_expansion_for_guild, can_view_master_sheet, generate_invite_code, get_character_guilds, get_guild_current_expansion, get_guild_submissions, get_user_characters_in_guild, is_past_deadline, update_guild_icon, update_guild_info, is_invite_code_valid, recompute_blp_for_item, recompute_blp_for_event, recompute_blp_for_guild, reset_guild_season | service_role |
| b | 4 | save_submission_items, delete_guild, create_expansion_for_guild, redeem_invite_code | authenticated, service_role |
| c | 8 | check_max_roles_per_guild, create_default_guild_roles, create_user_preferences, reject_submissions_on_cgm_loss, update_guild_item_priorities_updated_at, update_guild_settings_updated_at, update_updated_at_column, enforce_loot_history_guild_refs | service_role (no GRANT statement; existing grant kept) |
| d | 6 | character_belongs_to_user, character_has_submission_to_user_guilds, get_current_user_guild_ids, get_user_guild_ids, is_guild_master, is_guild_officer | anon, authenticated, service_role |
| e | 2 | get_guild_expansions, search_help_articles | anon, authenticated, service_role |
| f | 2 | generate_reserve_token, generate_reserve_leader_token | unchanged (PUBLIC, anon, authenticated, service_role) |

After the migration: anon can execute 10 functions, authenticated 14, service_role 42.

## Verification

### Baseline vs final (wtfx)

| Check | Baseline (77afa063, before any change) | Final (c63dccf4) |
|-------|------------------------------------------|------------------|
| Full vitest | 132 files, 2478 tests passed | 133 files, 2494 tests passed (+1 file, +16 tests, all in the new shape test) |
| npx tsc --noEmit | clean (exit 0) | clean (exit 0) |
| eslint on the new test file | n/a | clean (exit 0) |

The known intermittent 5s timeout in `__tests__/quality-brand-token-parity.test.ts` did not appear in either run. Output files: SP/baseline-wcr-vitest.txt, SP/baseline-wcr-tsc.txt, SP/final-wcr-vitest.txt, SP/final-wcr-tsc.txt, SP/final-wcr-eslint.txt, where SP = /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad.

### PGlite proof (0 FAIL in every run)

| Script | Output | PASS | FAIL |
|--------|--------|------|------|
| SP/pglite-wcr/scenarios-wcr.mjs (Task 1 version kept as scenarios-wcr-task1.mjs) | SP/pglite-wcr/run-output-wcr-task1.txt | 44 | 0 |
| SP/pglite-wcr/scenarios-wcr.mjs (final) | SP/pglite-wcr/run-output-wcr.txt | 332 | 0 |
| SP/pglite-wcr/catalog-wcr.mjs | SP/pglite-wcr/catalog-output-wcr.txt | 52 | 0 |

What run-output-wcr.txt covers:
1. The loader applied 258 statements from the earlier migrations with no errors. Before the migration, all 42 function ACLs equal the "EXECUTE now" column. The control shows the six functions from 20260722000001 were reachable by anon and authenticated only through PUBLIC.
2. After the migration, pg_proc has exactly the 42 inventory names, every grantee set equals "EXECUTE after", and has_function_privilege agrees for public, anon, authenticated and service_role (10, 14 and 42 true).
3. The call matrix uses typed NULL arguments, each in a rolled-back transaction. anon gets 42501 on every class a, b and c function. authenticated gets 42501 on every class a and c function. Class b calls as authenticated, class a and b calls as service_role, and class d, e and f calls as every role all get past the EXECUTE check. PGlite 17 gave 42501 for the direct trigger-function calls, so no fallback was needed.
4. Real policies (the two baseline SELECT policies on character_guild_memberships and the 20260722000002 profiles policy) return the same rows before and after for anon, G, O and M, with no 42501. O sees 2 memberships and 2 profiles. is_guild_officer(g1) is false for anon and M and true for O and G.
5. Guarded RPCs as M: delete_guild raises P0001 and the guild still exists. save_submission_items and create_expansion_for_guild raise P0001. redeem_invite_code('NOPE') returns NOT_FOUND. All four give anon 42501.
6. Triggers as authenticated: a new guild gets its 3 default roles, the eleventh role raises "Guild cannot have more than 10 roles" (P0001), and a user_preferences update changes updated_at. A direct call of update_updated_at_column() gives 42501.
7. Invite codes (D-11). Before the migration, anon read 1 row. After it: no policy on guild_invite_codes, RLS enabled and not forced, and anon, M (non-officer) and O (officer) each read 0 rows with no error, while service_role reads both codes. In the invite flow, service_role inserts and looks up a new code; authenticated M redeems it twice (error_code NULL, invite_current_uses and the stored current_uses both 1, then 2); a third redemption returns MAX_USES_REACHED and the inactive code returns DEACTIVATED. anon gets 42501 on redeem_invite_code. is_invite_code_valid returns true or false as service_role and gives 42501 to anon and authenticated.
8. search_path (D-12). Before the migration, the SECURITY DEFINER functions without search_path were exactly the four. Afterwards each proconfig is `search_path=public, pg_temp` and none are left unpinned. The recorded results deep-equal before and after: get_guild_expansions(g1) as O returns 2 rows (one current; the NULL timezone comes back as America/New_York), get_user_guild_ids(O) and (M) as O each return g1, and can_view_master_sheet as service_role gives O=true and M=false on the hidden tier and both true on the visible tier. update_guild_info with sub G wrote and read back both value sets, and with sub M raised the same owner message both times. Control before the pin: with a scratch schema ahead of public, get_guild_expansions and get_user_guild_ids returned 0 rows, meaning they resolved names through the caller's search_path. After the pin they return the recorded results.
9. A second apply succeeds with an identical ACL snapshot, unchanged pins and still no invite code policy.
10. OD-01 evidence, in a separate instance: after the IN SCHEMA public form a new function still has PUBLIC. After the global form it has no PUBLIC but keeps the per-schema anon and authenticated grants.

### Real parser (libpg-query 17)

SP/pg-parse-289/parse-wcr.mjs produced SP/pg-parse-289/parse-output-wcr.txt with 89 PASS and 0 FAIL. It parsed 77 statements: 40 GrantStmt with is_grant false and no privilege list (REVOKE ALL); 32 GrantStmt with is_grant true and privilege execute; 4 AlterFunctionStmt, each a single `set search_path` to public, pg_temp, on exactly the four functions; and 1 DropStmt with OBJECT_POLICY and missing_ok true on public.guild_invite_codes "Anyone can view active invite codes". There were no other statement kinds, the role sets per function match the class rules, and no function outside the 40 is named. The script sets exitCode 1 and prints FAIL lines on any failed check or parse error.

### Shape test

app/services/__tests__/function-execute-grants-migration.test.ts has 16 tests covering:
- the statement whitelist: two anchored regexes (REVOKE and GRANT), the fixed ALTER search_path form and the exact DROP POLICY text;
- the counts 77, 40, 32, 4 and 1;
- the exact role set per function and class;
- anon granted only on the 8 class d and e functions;
- class f and the qg0 and qzn functions not named;
- a signature cross-check of each parameter list against the latest defining CREATE header, with no later DROP;
- the ALTER list and its argument lists;
- no CREATE, other ALTER or other DROP;
- the header sections and rollback text;
- the findUnrevokedPublicFunctions ratchet, proven on inline samples (flagged, revoked, REVOKE without PUBLIC, lowercase SQL, other schema, commented-out REVOKE) and applied to every migration later than 20260930000200.

### Text gates

The added lines in `git diff origin/main...HEAD` and all four commit messages contain no em dash and no word from the vocabulary gate.

## D-11 re-verification (guild_invite_codes)

A grep of the whole worktree (app, utils, lib, discord-bot, companion, addon, scripts, supabase) found these call sites. Each file was opened and each uses the service role:
- app/api/guild-invites/route.ts lines 40-41 (generate_invite_code RPC), 54-55 (insert), 134-135 (list) and 195-196 (delete): all `serviceSupabase = createServiceRoleClient()` (line 17, 111 or 179).
- app/api/guild-invites/[code]/route.ts line 28-29 (lookup): `serviceSupabase = createServiceRoleClient()` (line 25). The redeem_invite_code RPC at line 123 uses the signed-in user's client after getAuthenticatedUser (OD-04, class b).
- app/api/guilds/route.ts line 202-203 (insert): serviceSupabase from createServiceRoleClient() (line 116).
- app/api/user/delete-account/route.ts line 89-90 (delete): serviceClient from createServiceRoleClient() (line 31).
- app/api/admin/clear-all-guilds/route.ts line 82-83 (delete): `supabase = createAdminClient()` (line 37). utils/supabase/admin.js builds that client from SUPABASE_SERVICE_ROLE_KEY. utils/supabase/service-role.ts also uses SUPABASE_SERVICE_ROLE_KEY.
- lib/database.types.ts and lib/db.ts hold type definitions only. No component, context, hook, bot, addon or companion code reads the table.
- No migration after the baseline creates, drops or alters a policy on guild_invite_codes, and no migration sets FORCE ROW LEVEL SECURITY.
- is_invite_code_valid appears only in its baseline definition and grants and in lib/database.types.ts, so it moves to class a.

Flagged items: none. No client read was found, so the policy drop went in as planned.

## D-12 re-verification

The four bodies (baseline lines 26-58, 357-387, 454-462 and 1160-1189; no later migration redefines them) reference only public tables (raid_tiers, expansions, character_guild_memberships, characters, guild_roles, guilds), pg_catalog built-ins (COALESCE, comparison operators) and the schema-qualified auth.uid(). There are no unqualified extension functions or auth references. Flagged items: none.

## Production catalog check

The four queries ran verbatim in PGlite (catalog-wcr.mjs) with no changes needed. Before the migration: query 1 returned 42 rows (anon true on 36, authenticated on 37, service_role on 42) with the four functions unpinned; query 3 returned no rows; query 4 returned 1 row. After the migration: query 1 returned 42 rows with anon true on 10, authenticated on 14 and service_role on 42, search_path_pinned true on every definer row, and no extension functions. Query 2 returned the one baseline row, `postgres | public | {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`. Queries 3 and 4 returned no rows. In PGlite, query 3 sees only the policies the harness loads (character_guild_memberships, profiles, guild_invite_codes), so the production run is the real check.

Instruction for the user: run the four queries from the plan's "Production catalog check" section in the Supabase SQL editor before the deploy (to spot drift, extra functions or dashboard grants) and again after it. They are metadata only and read no user data. Expected after the deploy: query 1 has 42 rows (10, 14 and 42 true; every definer row pinned) and queries 3 and 4 have no rows. If qg0 and qzn deploy too, query 1 has 47 rows, because their five new enforce_* trigger functions revoke PUBLIC, anon and authenticated, so anon stays at 10 and authenticated at 14 while service_role rises to 47.

## Open decisions as applied (all four accepted 2026-09-29)

- OD-01: no default-privilege change in this migration. The ratchet test covers later migrations, and the PGlite evidence is recorded above.
- OD-02: get_user_guild_ids stays class d (anon, authenticated, service_role; PUBLIC removed).
- OD-03: get_guild_expansions stays class e (anon, authenticated, service_role; PUBLIC removed).
- OD-04: redeem_invite_code is class b (authenticated, service_role; PUBLIC and anon removed).

## Follow-ups (tracked separately)

- Replace get_user_guild_ids in the character_guild_memberships and profiles policies with auth.uid()-bound helpers, then drop it (OD-02).
- Move the redeem_invite_code call in POST /api/guild-invites/[code] to the service-role client, then revoke authenticated on it (OD-04).
- Drop the uncalled update_guild_icon and update_guild_info.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Type errors in the shape test**
- **Found during:** Task 3 full regression (npx tsc --noEmit)
- **Issue:** `Extract<ParsedStatement, { kind: 'revoke' }>` resolved to `never`, because REVOKE and GRANT shared one union member whose kind is `'revoke' | 'grant'`. That left 4 TS2339 errors and 1 TS18048 in the test file (vitest and eslint still passed).
- **Fix:** separate RoleStatement and AlterStatement types, filters narrowed with type guards, and optional chaining on the event lookup. tsc is clean.
- **Files modified:** app/services/__tests__/function-execute-grants-migration.test.ts
- **Commit:** c63dccf4 (the fourth commit the plan allows)

### Harness choices (scratchpad only, documented in the script headers)

- Tables use the baseline CREATE TABLE statements verbatim (all columns, with uuid_generate_v4 replaced by gen_random_uuid), plus their baseline PRIMARY KEY and UNIQUE constraints and GRANT ALL ON TABLE. This replaces hand-reduced tables and gives a superset of the columns the plan asked for.
- The scratch schema also holds empty copies of characters and character_guild_memberships, not only guilds and expansions, so the get_user_guild_ids check is meaningful. A pre-migration scratch-schema control was added.
- The call matrix also checks class f for all roles and classes d and e for service_role, beyond the plan's minimum.

## Known Stubs

None.

## Threat Flags

None. The migration changes grants, one policy and function configuration only, all inside the plan's threat model (T-wcr-01 to T-wcr-11).

## Self-Check: PASSED

- FOUND: supabase/migrations/20260930000200_tighten_function_execute_grants.sql (in wtfx)
- FOUND: app/services/__tests__/function-execute-grants-migration.test.ts (in wtfx)
- FOUND: commits f9bd866a, 40932bae, 4c7a0992, c63dccf4 on fix/function-execute-grants
- FOUND: SP/pglite-wcr/run-output-wcr-task1.txt, run-output-wcr.txt, catalog-output-wcr.txt; SP/pg-parse-289/parse-output-wcr.txt; SP/baseline-wcr-*.txt; SP/final-wcr-*.txt

## Delivery (orchestrator, 2026-09-30)

- Shipped together with 260929-qg0, 260929-qzn, 260929-wcr and a guarded exec_sql grant migration (20260930000300) in PR #328, squash-merged as 86e1d6ff after every CI check passed.
- The combined branch was rebuilt as clean commits with a tree identical to the proven head. Full suite on it: 141 files, 2554 tests passing. PGlite with all migrations applied: loot-list 177/177, membership 178/178, joint flows 144/144, function grants 372/372, exec_sql 15/15.
- Deploy Migrations applied all four migrations in production on 2026-09-30 at 17:42 UTC. The Vercel production deploy succeeded.
- Live read-only anon probes after deploy: get_guild_expansions returns 200 (still public); get_guild_current_expansion and is_past_deadline return 42501 permission denied (now service-role only).
- Still open: a manual smoke test of the app flows, and the read-only catalog queries in the Supabase SQL editor.
