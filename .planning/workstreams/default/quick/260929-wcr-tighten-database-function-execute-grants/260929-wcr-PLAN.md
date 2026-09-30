---
phase: quick-260929-wcr
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/20260930000200_tighten_function_execute_grants.sql
  - app/services/__tests__/function-execute-grants-migration.test.ts
autonomous: true
requirements:
  - WCR-R1
  - WCR-R2
  - WCR-R3
  - WCR-R4
  - WCR-R5
  - WCR-R6
  - WCR-R7
  - DELIVERY-R1

estimate:
  # estimate-calibration: factor 1, applied false, 0 samples, confidence low,
  # so tokens equals raw_tokens.
  tokens: 230000
  raw_tokens: 230000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "D-02 (WCR-R1): after the migration, none of the 20 class a functions (inventory table) is executable by PUBLIC, anon or authenticated; each is executable by service_role. This includes the six that 20260722000001 meant to be service-role only (merge_phase_groups, reset_blp, increment_blp, increment_blp_bulk, seed_tbc_expansion, seed_tbc_expansion_for_guild) and is_invite_code_valid (moved from class f per D-11)."
    - "D-02 (WCR-R2): the four class b functions (save_submission_items, delete_guild, create_expansion_for_guild, redeem_invite_code) are executable by authenticated and service_role only; a signed-in session still reaches their in-function checks, and anon gets SQLSTATE 42501."
    - "D-04 (WCR-R3): the eight trigger functions (class c) are not executable by PUBLIC, anon or authenticated, and their triggers still fire for authenticated writes (create_guild_default_roles, enforce_max_roles and an updated_at trigger proven in PGlite)."
    - "D-06 (WCR-R4): the six RLS helpers (class d) and the two public-content read functions (class e) keep explicit EXECUTE for anon, authenticated and service_role with PUBLIC removed, so anon and authenticated SELECTs on character_guild_memberships and profiles still run their real policies without 42501."
    - "D-05: the two class f functions (generate_reserve_token, generate_reserve_leader_token) are not named in the migration and keep their current grants."
    - "D-01, D-03: the migration contains exactly 77 statements and nothing else: one REVOKE ALL ON FUNCTION per class a to e function (40), one GRANT EXECUTE ON FUNCTION for each class a, b, d and e function (32), four ALTER FUNCTION ... SET search_path TO 'public', 'pg_temp' (D-12) and one DROP POLICY IF EXISTS (D-11); every REVOKE includes PUBLIC; re-applying it changes nothing."
    - "D-11 (WCR-R6): after the migration guild_invite_codes has no client SELECT policy; anon, a non-officer authenticated session and an officer authenticated session each read 0 invite code rows without error, while the invite flow still works: the service role creates and looks up a code, redeem_invite_code as authenticated redeems it (OD-04), and anon gets 42501."
    - "D-12 (WCR-R7): can_view_master_sheet, get_guild_expansions, get_user_guild_ids and update_guild_info (the only SECURITY DEFINER public functions without a pinned search_path) have search_path pinned to public, pg_temp, and each returns the same results as before for representative inputs, including when the caller's search_path puts a scratch schema with same-named tables ahead of public."
    - "D-07 (WCR-R5): the shape test fails for any migration later than 20260930000200 that creates a public-schema function without revoking PUBLIC on it in the same file, and its checker is proven against inline failing and passing samples."
    - "D-10: the migration names none of the functions added by the parallel quick tasks 260929-qg0 and 260929-qzn and applies on origin/main 77afa063 on its own."
    - "D-08, D-09 (DELIVERY-R1): the PGlite proof has zero FAIL lines; the full vitest run, npx tsc --noEmit and eslint show no regression against the baselines; added lines and commit messages pass the em dash and vocabulary gates; commits are local on fix/function-execute-grants only."
  artifacts:
    - path: "supabase/migrations/20260930000200_tighten_function_execute_grants.sql"
      provides: "REVOKE ALL ON FUNCTION ... FROM PUBLIC (plus anon and authenticated where they should not call it) and explicit GRANT EXECUTE to the intended roles for 40 public-schema functions, grouped by class; DROP POLICY IF EXISTS for the guild_invite_codes client SELECT policy (D-11); search_path pinned on four SECURITY DEFINER functions (D-12); neutral header"
      contains: "REVOKE ALL ON FUNCTION \"public\".\"merge_phase_groups\""
    - path: "app/services/__tests__/function-execute-grants-migration.test.ts"
      provides: "Shape test: statement whitelist (function REVOKE and GRANT, the four ALTER FUNCTION ... SET search_path, the one DROP POLICY IF EXISTS), exact per-function role sets, signature cross-check against the defining migrations, and the future-migration PUBLIC ratchet"
      contains: "findUnrevokedPublicFunctions"
    - path: "/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/pglite-wcr/scenarios-wcr.mjs"
      provides: "Scratchpad-only PGlite proof (never committed); run outputs saved beside it"
  key_links:
    - from: "PostgREST POST /rest/v1/rpc/<name> with the anon key or a user JWT (roles anon, authenticated)"
      to: "EXECUTE check on public.<name>"
      via: "REVOKE ALL ON FUNCTION ... FROM PUBLIC in the new migration; a REVOKE from anon and authenticated alone leaves the PUBLIC entry in place"
      pattern: "FROM PUBLIC, \"anon\", \"authenticated\""
    - from: "RLS policies with no TO clause on character_guild_memberships, characters, profiles, guild_settings and 21 other tables"
      to: "class d helpers (is_guild_officer, is_guild_master, get_user_guild_ids, get_current_user_guild_ids, character_belongs_to_user, character_has_submission_to_user_guilds)"
      via: "explicit GRANT EXECUTE TO anon, authenticated, service_role; policy expressions are executed as the querying role"
      pattern: "GRANT EXECUTE ON FUNCTION \"public\".\"get_user_guild_ids\""
    - from: "service-role API routes (phase-groups, reset-season, guild-settings, guild-invites) and utils/blp/recompute.ts"
      to: "class a functions"
      via: "GRANT EXECUTE TO service_role (re-asserted, idempotent)"
      pattern: "TO \"service_role\""
    - from: "user-session callers (LootListContext, DELETE /api/guilds, POST /api/guilds/delete, expansionSeeder, POST /api/guild-invites/[code], ExpansionContext)"
      to: "class b and class e functions"
      via: "GRANT EXECUTE TO authenticated"
      pattern: "TO \"authenticated\", \"service_role\""
    - from: "invite routes (app/api/guild-invites/route.ts, app/api/guild-invites/[code]/route.ts, app/api/guilds/route.ts, app/api/user/delete-account/route.ts, app/api/admin/clear-all-guilds/route.ts), all through the service role; redeem_invite_code runs as the table owner"
      to: "public.guild_invite_codes"
      via: "service_role bypasses RLS and the owner is not subject to RLS (no FORCE ROW LEVEL SECURITY), so dropping the only SELECT policy leaves these paths unchanged while client roles read no rows"
      pattern: "DROP POLICY IF EXISTS \"Anyone can view active invite codes\" ON \"public\".\"guild_invite_codes\""
    - from: "callers of the four unpinned SECURITY DEFINER functions (policies on character_guild_memberships and profiles, ExpansionContext and the expansions route)"
      to: "unqualified table names in their bodies"
      via: "ALTER FUNCTION ... SET search_path TO 'public', 'pg_temp' fixes name resolution regardless of the caller's search_path"
      pattern: "SET search_path TO 'public', 'pg_temp'"
---

<objective>
Tighten EXECUTE grants on every public-schema database function so each one is callable only by the roles that legitimately call it.

Purpose: Postgres gives EXECUTE on every new function to PUBLIC, and anon and authenticated are members of PUBLIC, so REVOKE ... FROM anon, authenticated does not stop them. 20260722000001 revoked six SECURITY DEFINER functions from anon and authenticated only, intending them to be service-role only; they are still reachable through PUBLIC (confirmed in PGlite against the real migrations). Most baseline functions also keep the PUBLIC default next to explicit anon and authenticated grants. This change restores the intended service-role-only state and applies one rule per class of caller to all 42 live public functions. Two decisions the user added (2026-09-29) go in the same migration. D-11 drops the client SELECT policy on guild_invite_codes, since every app read of that table goes through the service role. D-12 pins search_path on the four SECURITY DEFINER functions that do not pin it yet.

Output: one migration (function grants, one DROP POLICY IF EXISTS, four ALTER FUNCTION ... SET search_path), its vitest shape test, and a scratchpad-only PGlite proof. Local commits in WT only; the orchestrator reviews, pushes and opens the PR.

Work location: WT = /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wtfx (branch fix/function-execute-grants from origin/main 77afa063, node_modules symlinked). Every repo path below is relative to WT. SP = /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad. Do not touch local main, wt-phase06, wtls or wtms.

Requirements (quick task):
- WCR-R1: service-role-only and uncalled functions (class a) are not executable by PUBLIC, anon or authenticated.
- WCR-R2: guarded user-session RPCs (class b) are executable by authenticated and service_role only.
- WCR-R3: trigger functions (class c) are not executable by PUBLIC, anon or authenticated, and their triggers still fire.
- WCR-R4: every legitimate caller keeps an explicit grant (classes d and e keep anon, authenticated, service_role); nothing relies on PUBLIC except the two unchanged class f functions.
- WCR-R5: a new public function cannot be added later without revoking PUBLIC (ratchet test; database defaults per OD-01).
- WCR-R6: client roles cannot read guild_invite_codes rows; the invite flow keeps working through the service role and redeem_invite_code (D-11).
- WCR-R7: every SECURITY DEFINER public function has a pinned search_path, with unchanged results (D-12).
- DELIVERY-R1: PGlite proof, shape test, full regression, neutral wording, local commits only.

## Decisions (locked unless an OD below changes them)

- D-01 (amended 2026-09-29): One migration, supabase/migrations/20260930000200_tighten_function_execute_grants.sql (timestamp after qg0's 20260930000000 and qzn's 20260930000100). It may contain exactly three kinds of statement: REVOKE ALL ON FUNCTION and GRANT EXECUTE ON FUNCTION on public-schema functions; the one DROP POLICY IF EXISTS from D-11; and the four ALTER FUNCTION ... SET search_path TO 'public', 'pg_temp' statements from D-12. Nothing else: no CREATE, other ALTER, other DROP, COMMENT, CREATE POLICY, table grant, default-privilege or data statement. Function bodies do not change. Statement style follows 20260722000001: schema-qualified quoted names, the parameter list copied from the function's defining CREATE header with DEFAULT clauses removed, roles written as PUBLIC, "anon", "authenticated", "service_role". Neutral header comment with sections Background, Rule per class, Invite codes (D-11), search_path (D-12), Not changed, Rollback, plus a one-line comment per group.
- D-02: Classification and target grants are exactly the inventory table below. Class a: REVOKE ALL FROM PUBLIC, "anon", "authenticated" then GRANT EXECUTE TO "service_role". Class b: REVOKE ALL FROM PUBLIC, "anon" then GRANT EXECUTE TO "authenticated", "service_role". Class c: REVOKE ALL FROM PUBLIC, "anon", "authenticated" and no GRANT. Classes d and e: REVOKE ALL FROM PUBLIC then GRANT EXECUTE TO "anon", "authenticated", "service_role".
- D-03: All 40 class a to e functions are restated, including the eight whose grants already match (recompute_blp_for_item, recompute_blp_for_event, recompute_blp_for_guild, reset_guild_season, create_expansion_for_guild, enforce_loot_history_guild_refs, is_guild_master, is_guild_officer). The file then records the intended grants for every function in one place and corrects any drift in production. REVOKE, GRANT, DROP POLICY IF EXISTS and ALTER FUNCTION ... SET are all idempotent. 77 statements in total: 40 REVOKE, 32 GRANT, 4 ALTER FUNCTION, 1 DROP POLICY.
- D-04: Trigger functions lose PUBLIC, anon and authenticated whether SECURITY DEFINER or INVOKER, following 20260929180000. Firing a trigger does not check EXECUTE (verified in PGlite: an authenticated INSERT fires a trigger whose function it cannot execute, while a direct call gets 42501). service_role keeps whatever grant it already has; no GRANT statement.
- D-05: The two class f functions, generate_reserve_token and generate_reserve_leader_token, are left alone. They are SECURITY INVOKER column defaults on reserve_runs, so whoever inserts a run must be able to execute them. Removing PUBLIC from them would not change anon, authenticated or service_role access. The third SECURITY INVOKER non-trigger function, is_invite_code_valid, moves to class a under D-11.
- D-06: RLS helpers (class d) keep explicit anon, authenticated and service_role grants. No policy in the migrations names a role, so every policy applies to every role, and anon and authenticated hold table privileges on public tables. A policy expression runs as the querying role, so if the querying role cannot execute a helper the query fails with 42501 instead of returning no rows. Only PUBLIC is removed.
- D-07: Future functions are guarded by a ratchet in the shape test, not by ALTER DEFAULT PRIVILEGES (see OD-01). findUnrevokedPublicFunctions(sql) returns every public function created in a SQL text without a REVOKE ... FROM a role list including PUBLIC on the same name in that text. It is unit-tested on inline samples and applied to every migration whose timestamp is greater than 20260930000200.
- D-08: Proof is PGlite in SP/pglite-wcr plus the vitest shape test plus the full regression. No SQL runs against a real database. The live check is the read-only catalog query below, which the user runs.
- D-09: Commit messages, SQL comments, test comments and the SUMMARY use neutral, factual wording, for example "revoke the PUBLIC default EXECUTE grant so these functions are service-role only, as 20260722000001 intended". The word list to avoid is enforced by the vocabulary gate in Task 3. Describe the rule, not how the gap could be used. No em dashes. Commit trailer "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Do not push. Do not open a PR. No planning files in WT. Do not read .env.local.
- D-10: Independence from the parallel tasks: the migration names only functions that exist on origin/main 77afa063 and none of qg0's or qzn's new functions (enforce_loot_submission_*, enforce_guild_*). Neither of those plans redefines or drops any function named here, touches guild_invite_codes or its policies, or changes the configuration of the four D-12 functions (checked in their PLAN files). The orchestrator runs the combined proof.
- D-11 (user decided 2026-09-29, include in this migration): DROP POLICY IF EXISTS "Anyone can view active invite codes" ON "public"."guild_invite_codes". It is the table's only policy (baseline line 3475, FOR SELECT USING (("is_active" = true)), no TO clause), and no later migration changes it. RLS stays enabled, so with no policy, anon and authenticated read and write no rows; they had no write policy before either. Every app read and write of the table goes through the service role: app/api/guild-invites/route.ts (about lines 40, 55, 135 and 196, serviceSupabase), app/api/guild-invites/[code]/route.ts (about line 29, serviceSupabase), app/api/guilds/route.ts (about line 203, serviceSupabase), app/api/user/delete-account/route.ts (about line 90, serviceClient) and app/api/admin/clear-all-guilds/route.ts (about line 83, whose supabase variable is createAdminClient() from utils/supabase/admin.js, built on SUPABASE_SERVICE_ROLE_KEY). No component, context, hook, bot, addon or companion code reads it. redeem_invite_code is SECURITY DEFINER owned by postgres, the table owner, and no migration sets FORCE ROW LEVEL SECURITY, so it keeps seeing the rows. is_invite_code_valid (SECURITY INVOKER) has no callers anywhere. With the policy gone it would return false for every client caller, so it moves to class a (service-role only) and keeps working for the service role. The executor re-verifies each call site and client (grep plus reading each file) before writing the statement, and flags any client read it finds instead of dropping the policy.
- D-12 (user decided 2026-09-29, include with proof): ALTER FUNCTION "public"."<name>"(<args>) SET search_path TO 'public', 'pg_temp' for can_view_master_sheet, get_guild_expansions, get_user_guild_ids and update_guild_info. PGlite confirms these are the only SECURITY DEFINER public functions whose proconfig has no search_path after all migrations (34 SECURITY DEFINER functions checked). Their bodies reference only public tables (raid_tiers, expansions, character_guild_memberships, characters, guild_roles, guilds), pg_catalog built-ins, and the schema-qualified auth.uid(). There are no unqualified extension functions (uuid_generate_v4, gen_random_bytes and so on) and no unqualified auth references, so nothing needs qualifying. The executor re-checks each body and flags, rather than pins, any function that would resolve differently. SECURITY DEFINER functions are never inlined by the planner, so the pin does not change how the policies that call get_user_guild_ids are planned.

## Open decisions (resolved 2026-09-29; the executor implements each recommendation)

| ID | Question | Recommendation | Resolution |
|----|----------|----------------|------------|
| OD-01 | Also change database default privileges so future functions do not start with PUBLIC EXECUTE? | Not in this migration. The IN SCHEMA public form cannot remove PUBLIC: Postgres adds per-schema default privileges to the global ones, and PUBLIC EXECUTE on functions is a global default (verified in PGlite: after ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC a new function still has PUBLIC). The global form (FOR ROLE postgres, no schema) does remove it, but it also applies to functions postgres creates in other schemas, including extension functions. The per-schema defaults would also still grant anon and authenticated on every new public function. The D-07 ratchet protects this repo without changing database defaults. If wanted later, do it in a separate migration after reviewing query 2 of the catalog check. If declined (user wants it now): stop and return to the orchestrator for a plan revision. | User decided 2026-09-29: accept the recommendation. |
| OD-02 | get_user_guild_ids takes a user id argument, but the character_guild_memberships and profiles SELECT policies call it. Lock it now? | Keep anon, authenticated and service_role in this change (class d, PUBLIC removed). Locking it would make anon and authenticated queries on those two tables fail. Follow-up, tracked separately: replace it with auth.uid()-bound helpers (get_current_user_guild_ids for the memberships policy, and a boolean guildmate helper for profiles), then drop it, the same way 20260804000001 handled the older helpers. If declined: needs policy changes, so stop and return for a plan revision. | User decided 2026-09-29: accept the recommendation. |
| OD-03 | get_guild_expansions is SECURITY DEFINER with no in-function check. It is called by user sessions (ExpansionContext in the root layout, ExpansionManager, the expansion page, GET /api/guilds/[id]/expansions) and by the service role (addon export-string). Revoke anon? | Keep anon, authenticated and service_role (class e), remove PUBLIC. The expansions SELECT policy "Expansions are viewable by everyone" is USING (true), so the function returns nothing a direct table read does not. Revoking anon gains nothing, and ExpansionProvider is mounted in the root layout. If declined: move it to class b (authenticated, service_role) in the migration, the EXPECTED table and the harness. | User decided 2026-09-29: accept the recommendation. |
| OD-04 | redeem_invite_code is SECURITY DEFINER and has no identity check; knowing the invite code is what gates it. It is called only from POST /api/guild-invites/[code], with the signed-in user's client, after getAuthenticatedUser. What should it keep? | Class b: keep authenticated and service_role, revoke PUBLIC and anon. The route already refuses signed-out callers, so nothing legitimate calls it as anon. Follow-up: the route already creates a service-role client, so moving this one call to it would let authenticated be revoked too. That is a route change, outside this grants-only migration. If declined in favour of service-role only now: stop and return for a plan revision (route change needed). | User decided 2026-09-29: accept the recommendation. |
</objective>

<execution_context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/CLAUDE.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/STATE.md

Read first (in WT):
- supabase/migrations/20260722000001_lock_down_definer_rpc_grants.sql (the intent to restore; statement style)
- supabase/migrations/20260804000001_standardize_guild_permission_helpers.sql lines 108-117 (PUBLIC plus anon revoke precedent for a guarded RPC)
- supabase/migrations/20260929180000_enforce_loot_history_guild_refs.sql line 200 (trigger function precedent)
- supabase/migrations/20260101000000_baseline_schema.sql lines 4352-4597 (function grants) and 4839-4842 (default privileges)
- app/services/__tests__/loot-history-guild-refs-migration.test.ts (shape test style: stripComments, dollar-quote-aware splitStatements, MIGRATION_FILE_OVERRIDE)
- SP/wcr-plan/probe/acl-now.mjs (planner's loader: loads every function, grant, drop and default-privilege statement from WT's migrations into PGlite and prints the current ACLs; copy its approach) and SP/pglite-313/scenarios-313.mjs (splitSql, pick, asUser, record helpers; reduced-table conventions)

## Investigation findings (verified in WT at 77afa063)

1. 42 live public functions: 40 in the baseline, minus 4 dropped by 20260804000001 (set_guild_active_expansion, is_officer_of_guild, user_is_in_guild, user_is_officer_in_guild), plus 6 added later (recompute_blp_for_item and recompute_blp_for_event in 20260609000001, recompute_blp_for_guild in 20260721000001, reset_guild_season in 20260721000002, search_help_articles in 20260704000001, enforce_loot_history_guild_refs in 20260929180000). No later migration drops and recreates a function; every redefinition is CREATE OR REPLACE with the same signature, so ACLs carried over.
2. Current grants were computed by loading every function, grant, revoke, drop and default-privilege statement from WT's migrations into PGlite in filename order (SP/wcr-plan/probe/acl-now.mjs, 258 statements, no errors). The "EXECUTE now" column below is that output. Functions created after the baseline also get anon, authenticated and service_role from the baseline's ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public (Supabase sets the same defaults in production), plus PUBLIC.
3. Callers: every .rpc( call in the repo was checked (app, utils, discord-bot, scripts, companion, addon). scripts/run-migration.ts calls an exec_sql RPC that no migration defines; the catalog query shows whether it exists in production. There are no views and no edge functions. config.toml auth hooks are commented out.
4. Policies: none of the policies in the migrations has a TO clause. The policy helper uses are: is_guild_officer (21 tables), get_current_user_guild_ids (characters, guild_settings, profiles), get_user_guild_ids (character_guild_memberships, profiles; the profiles policy passes another user's id), character_belongs_to_user (character_guild_memberships), character_has_submission_to_user_guilds (characters), is_guild_master (guild_settings). No class a function appears in any policy, column default or check constraint. The only column defaults calling public functions are the two class f token generators.
5. SECURITY DEFINER functions call other functions as their owner (postgres), so the nested calls (for example reset_guild_season calling recompute_blp_for_guild, delete_guild calling is_guild_master) are unaffected.
6. The qg0 and qzn plans add only new enforce_* trigger functions (with PUBLIC already revoked) and do not redefine or drop any function in this inventory.
7. guild_invite_codes (for D-11): its only policy is "Anyone can view active invite codes" (baseline 3475); RLS is enabled (baseline 4038); anon, authenticated and service_role hold ALL on the table (baseline 4685-4687); no migration sets FORCE ROW LEVEL SECURITY on any table. The app call sites and their clients are listed in D-11; is_invite_code_valid appears only in its baseline definition and grants and in lib/database.types.ts.
8. search_path (for D-12): loading every migration into PGlite and checking proconfig on all 34 SECURITY DEFINER public functions leaves exactly four without search_path: can_view_master_sheet, get_guild_expansions, get_user_guild_ids and update_guild_info. The redefinitions in 20260722000001, 20260727000001, 20260729000001 and 20260804000001 already pin it for delete_guild, save_submission_items, merge_phase_groups and create_expansion_for_guild.

## Inventory and classification (the migration implements the last column exactly)

Grants listed exclude the owner (postgres). P = PUBLIC, A = anon, U = authenticated, S = service_role. Sec: D = SECURITY DEFINER, I = INVOKER.

| # | Function (parameter list as written in the statements) | Sec | Callers today | In-function check | EXECUTE now | Class | EXECUTE after |
|---|---|---|---|---|---|---|---|
| 1 | merge_phase_groups("p_expansion_id" "uuid", "p_guild_id" "uuid", "p_phase_groups" "jsonb", "p_merged_groups" "jsonb") | D | service role, phase-groups route | none | P S | a | S |
| 2 | reset_blp("p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid") | D | none | none | P S | a | S |
| 3 | increment_blp("p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid") | D | none (superseded by recompute_*) | none | P S | a | S |
| 4 | increment_blp_bulk("p_guild_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid", "p_character_ids" "uuid"[]) | D | none | none | P S | a | S |
| 5 | seed_tbc_expansion("p_guild_id" "uuid") | I | none | runs under caller RLS | P S | a | S |
| 6 | seed_tbc_expansion_for_guild("p_guild_id" "uuid") | D | none | none | P S | a | S |
| 7 | can_view_master_sheet("p_raid_tier_id" "uuid", "p_user_id" "uuid") | D | none | none | P A U S | a | S |
| 8 | generate_invite_code() | D | service role, POST /api/guild-invites | none (no table access) | P A U S | a | S |
| 9 | get_character_guilds("p_character_id" "uuid") | D | none | none | P A U S | a | S |
| 10 | get_guild_current_expansion("p_guild_id" "uuid") | D | none | none | P A U S | a | S |
| 11 | get_guild_submissions("p_guild_id" "uuid", "p_raid_tier_id" "uuid") | D | none | none | P A U S | a | S |
| 12 | get_user_characters_in_guild("p_user_id" "uuid", "p_guild_id" "uuid") | D | none | none | P A U S | a | S |
| 13 | is_past_deadline("p_raid_tier_id" "uuid") | D | none | none | P A U S | a | S |
| 14 | update_guild_icon("p_guild_id" "uuid", "p_icon_url" "text") | D | none | owner check | P A U S | a | S |
| 15 | update_guild_info("p_guild_id" "uuid", "p_name" "text", "p_realm" "text", "p_faction" "text", "p_discord_server_id" "text") | D | none | owner check | P A U S | a | S |
| 16 | recompute_blp_for_item("p_guild_id" "uuid", "p_loot_item_id" "uuid") | D | service role, utils/blp/recompute.ts; other DEFINER functions | route authorizes | S | a | S |
| 17 | recompute_blp_for_event("p_guild_id" "uuid", "p_raid_event_id" "uuid") | D | service role, utils/blp/recompute.ts | route authorizes | S | a | S |
| 18 | recompute_blp_for_guild("p_guild_id" "uuid") | D | service role, guild-settings route; reset_guild_season | route authorizes | S | a | S |
| 19 | reset_guild_season("p_guild_id" "uuid", "p_clear_raids" boolean, "p_clear_loot" boolean, "p_clear_donations" boolean) | D | service role, reset-season route | route authorizes | S | a | S |
| 20 | save_submission_items("p_submission_id" "uuid", "p_items" "jsonb") | D | browser session, LootListContext | owner or is_guild_officer | P U S | b | U S |
| 21 | delete_guild("p_guild_id" "uuid") | D | user session, DELETE /api/guilds and POST /api/guilds/delete | is_guild_master | P U S | b | U S |
| 22 | create_expansion_for_guild("p_guild_id" "uuid", "p_name" "text") | D | user session, expansionSeeder (useServiceRole=false) | is_guild_officer | U S | b | U S |
| 23 | redeem_invite_code("code_input" "text") | D | user session, POST /api/guild-invites/[code] after sign-in | invite code only (OD-04) | P A U S | b | U S |
| 24 | check_max_roles_per_guild() | I | trigger enforce_max_roles on guild_roles | n/a | P A U S | c | S |
| 25 | create_default_guild_roles() | D | trigger create_guild_default_roles on guilds | n/a | P A U S | c | S |
| 26 | create_user_preferences() | D | no trigger in public; may be an auth.users trigger in production (firing needs no EXECUTE) | n/a | P A U S | c | S |
| 27 | reject_submissions_on_cgm_loss() | D | trigger on character_guild_memberships | n/a | P A U S | c | S |
| 28 | update_guild_item_priorities_updated_at() | I | trigger on guild_item_priorities | n/a | P A U S | c | S |
| 29 | update_guild_settings_updated_at() | I | trigger on guild_settings | n/a | P A U S | c | S |
| 30 | update_updated_at_column() | I | triggers on donation_records, reserve_runs, reserve_submissions, loot_history, user_preferences | n/a | P A U S | c | S |
| 31 | enforce_loot_history_guild_refs() | D | trigger on loot_history | n/a | S | c | S |
| 32 | character_belongs_to_user("p_character_id" "uuid") | D | policy on character_guild_memberships | auth.uid() | P A U S | d | A U S |
| 33 | character_has_submission_to_user_guilds("p_character_id" "uuid") | D | policy on characters | auth.uid() | P A U S | d | A U S |
| 34 | get_current_user_guild_ids() | D | policies on characters, guild_settings, profiles | auth.uid() | P A U S | d | A U S |
| 35 | get_user_guild_ids("p_user_id" "uuid") | D | policies on character_guild_memberships, profiles | argument (OD-02) | P A U S | d | A U S |
| 36 | is_guild_master("target_guild_id" "uuid") | D | policy on guild_settings; delete_guild | auth.uid() | A U S | d | A U S |
| 37 | is_guild_officer("target_guild_id" "uuid") | D | policies on 21 tables; several functions | auth.uid() | A U S | d | A U S |
| 38 | get_guild_expansions("p_guild_id" "uuid") | D | browser and user session; service role (export-string) | none; rows are world-readable (OD-03) | P A U S | e | A U S |
| 39 | search_help_articles("p_query" text, "p_limit" integer) | D | service role (discord-bot/help.js); granted to anon and authenticated by design in 20260704000001 | published rows only, same as its RLS | P A U S | e | A U S |
| 40 | generate_reserve_token() | I | column default reserve_runs.share_token | n/a | P A U S | f | unchanged |
| 41 | generate_reserve_leader_token() | I | column default reserve_runs.raid_leader_token | n/a | P A U S | f | unchanged |
| 42 | is_invite_code_valid("code_input" character varying) | I | none | caller RLS; returns false for clients once D-11 drops the only SELECT policy | P A U S | a (moved from f per D-11) | S |

Counts: class a 20 (16 change), b 4 (3 change), c 8 (7 change), d 6 (4 change), e 2 (2 change), f 2 (unchanged). 40 functions have grant statements, 32 of them with a changed effective ACL. After the migration, anon can execute 10 functions (classes d, e, f), authenticated 14 (b, d, e, f), service_role all 42. D-12 also pins search_path on rows 7, 15, 35 and 38, which are the only SECURITY DEFINER functions without it.

## Production catalog check (read-only, metadata only, no user data)

The user runs these in the Supabase SQL editor before the deploy (to catch drift or functions not in the migrations) and again after it; results should match the "EXECUTE after" column. The executor runs the same text in PGlite in Task 3 to prove it parses and returns the expected rows.

```sql
-- 1. Effective EXECUTE on every public-schema function
select p.oid::regprocedure::text as function,
       case when p.prosecdef then 'definer' else 'invoker' end as security,
       p.prorettype = 'trigger'::regtype as is_trigger,
       e.extname as extension,
       (select string_agg(case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end, ', ' order by a.grantee)
          from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
         where a.privilege_type = 'EXECUTE') as execute_granted_to,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role,
       coalesce(array_to_string(p.proconfig, ',') like '%search_path=%', false) as search_path_pinned
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  left join pg_depend d on d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e'
  left join pg_extension e on e.oid = d.refobjid
 where n.nspname = 'public'
 order by p.proname, p.oid;

-- 2. Default privileges for functions (informs OD-01)
select pg_get_userbyid(d.defaclrole) as for_role,
       coalesce(n.nspname, '(all schemas)') as in_schema,
       d.defaclacl::text as default_acl
  from pg_default_acl d
  left join pg_namespace n on n.oid = d.defaclnamespace
 where d.defaclobjtype = 'f'
 order by 1, 2;

-- 3. Policies in any schema that call a function losing anon or authenticated (expect no rows)
select schemaname, tablename, policyname, cmd, roles::text
  from pg_policies
 where coalesce(qual, '') || ' ' || coalesce(with_check, '') ~ '(merge_phase_groups|reset_blp|increment_blp|seed_tbc_expansion|can_view_master_sheet|generate_invite_code|get_character_guilds|get_guild_current_expansion|get_guild_submissions|get_user_characters_in_guild|is_past_deadline|update_guild_icon|update_guild_info|recompute_blp_for_|reset_guild_season|save_submission_items|delete_guild|create_expansion_for_guild|redeem_invite_code|is_invite_code_valid)'
 order by 1, 2, 3;

-- 4. Policies on guild_invite_codes (D-11: one row before the deploy, none after)
select policyname, cmd, roles::text, qual
  from pg_policies
 where schemaname = 'public' and tablename = 'guild_invite_codes'
 order by 1;
```

Expected after the deploy: query 1 returns 42 rows, with anon true on 10, authenticated true on 14, service_role true on all 42, and search_path_pinned true on every row whose security is definer. Query 3 returns no rows. Query 4 returns no rows.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Tracer, the six functions 20260722000001 meant to be service-role only, end to end (migration, PGlite proof, shape test)</name>
  <files>supabase/migrations/20260930000200_tighten_function_execute_grants.sql, app/services/__tests__/function-execute-grants-migration.test.ts, SP/pglite-wcr/scenarios-wcr.mjs (scratchpad only)</files>
  <precondition>WT is on branch fix/function-execute-grants at 77afa063 with a clean git status; SP/pglite-289/node_modules contains @electric-sql/pglite; SP/wcr-plan/probe/acl-now.mjs exists.</precondition>
  <read_first>supabase/migrations/20260722000001_lock_down_definer_rpc_grants.sql; app/services/__tests__/loot-history-guild-refs-migration.test.ts; SP/wcr-plan/probe/acl-now.mjs; SP/pglite-313/scenarios-313.mjs lines 1-140</read_first>
  <action>
Step 0, baselines (before any change): in WT run the full npx vitest run and save it to SP/baseline-wcr-vitest.txt, and npx tsc --noEmit to SP/baseline-wcr-tsc.txt. The qg0 baseline at the same commit was 132 files and 2478 tests passing with empty tsc output. If this run differs, record the failing tests as pre-existing in the SUMMARY; do not fix them.

Step 1, harness (per D-08): create SP/pglite-wcr and symlink SP/pglite-wcr/node_modules to SP/pglite-289/node_modules. Write SP/pglite-wcr/scenarios-wcr.mjs with PASS/FAIL record lines and process.exitCode = 1 on any FAIL. Setup, as in acl-now.mjs: roles anon, authenticated (NOLOGIN) and service_role (NOLOGIN BYPASSRLS); schema auth with the auth.uid() stub reading request.jwt.claim.sub; USAGE on public and auth for the three roles; check_function_bodies off. Then read every WT migration in filename order except 20260930000200, split it with splitSql, and execute only the statements matching acl-now.mjs's keep pattern (function create, owner, grant, revoke, drop, and default privileges for functions). Put a header comment in the script listing its deviations from production: stub auth.uid(), no tables unless a scenario adds reduced ones, check_function_bodies off. Pre-migration control: assert that the six functions (merge_phase_groups, reset_blp, increment_blp, increment_blp_bulk, seed_tbc_expansion, seed_tbc_expansion_for_guild) have a PUBLIC entry in aclexplode and that has_function_privilege is true for anon and authenticated. Then execute the new migration file as a whole and assert, for each of the six: the aclexplode grantee set without the owner is exactly service_role; has_function_privilege is false for 'public', anon and authenticated and true for service_role. Also assert that calling each one as anon and as authenticated (SET ROLE, typed NULL arguments built from proargtypes with format_type) fails with SQLSTATE 42501, and that as service_role the call gets past the EXECUTE check (any SQLSTATE other than 42501; a missing table is 42P01). Save stdout to SP/pglite-wcr/run-output-wcr-task1.txt.

Step 2, migration (per D-01, D-02, D-09): create supabase/migrations/20260930000200_tighten_function_execute_grants.sql. Header comment: Background (the PUBLIC default and PUBLIC membership explained in one or two plain sentences; 20260722000001 and 20260729000001 revoked these six from anon and authenticated only, so PUBLIC still grants them; most baseline functions also keep the PUBLIC default), Rule per class (a to e, one line each, with the D-06 reason for d), Not changed (the two class f functions and why), Rollback (granting EXECUTE back to PUBLIC, or to anon or authenticated, restores the previous access for a function). Task 3 adds the Invite codes and search_path sections and their rollback lines. Add a note that CREATE OR REPLACE keeps a function's ACL, while DROP and CREATE resets it to the PUBLIC default, so a later migration that recreates one of these functions must restate its grants. Then the first group, headed with a one-line comment such as "Service-role only, as 20260722000001 intended": for each of the six, one REVOKE ALL ON FUNCTION with the parameter list from the inventory table FROM PUBLIC, "anon", "authenticated", followed by GRANT EXECUTE ON FUNCTION ... TO "service_role". Leave a marked place after this group for the Task 2 groups.

Step 3, shape test (per D-01): create app/services/__tests__/function-execute-grants-migration.test.ts in the style of loot-history-guild-refs-migration.test.ts (MIGRATIONS_DIR, MIGRATION_TIMESTAMP '20260930000200', MIGRATION_FILE_OVERRIDE, stripComments, dollar-quote-aware splitStatements). Header comment: quick task 260929-wcr (D-01, D-02, D-07), neutral wording. Add an EXPECTED array of { name, args, cls } with the six class a entries, which Task 2 extends to 40, and class-derived role sets (revoke and grant per class, as in D-02). Parse each statement with two anchored regexes: REVOKE ALL ON FUNCTION "public"."name"(args) FROM roles, and GRANT EXECUTE ON FUNCTION "public"."name"(args) TO roles. Tests: the file exists; every statement matches one of the two forms; each EXPECTED function has exactly one REVOKE whose role set equals its class revoke set, and a GRANT whose role set equals its class grant set (none for class c); the set of functions named in the file equals the EXPECTED names; every REVOKE includes PUBLIC; the header (raw file) mentions 20260722000001. Task 3 widens the statement whitelist for D-11 and D-12; keep the two regexes and the statement classifier separate so that is a small change.

Run the harness and the test, then commit in WT (stage only the two repo files), for example "fix(db): revoke the PUBLIC EXECUTE default so six functions are service-role only", with the trailer. Do not push.
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/pglite-wcr && node scenarios-wcr.mjs > run-output-wcr-task1.txt 2>&1 && ! grep -q '^FAIL' run-output-wcr-task1.txt && grep -q '^PASS' run-output-wcr-task1.txt && cd ../wtfx && npx vitest run app/services/__tests__/function-execute-grants-migration.test.ts && git log -1 --format=%B | grep -q 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>'</automated>
  </verify>
  <done>Baselines are saved. The six functions are service-role only in PGlite: aclexplode shows only service_role besides the owner, anon and authenticated get 42501, and service_role passes the EXECUTE check. The pre-migration control shows the PUBLIC entry was the cause. The shape test passes for the six-function file. One local commit with the trailer; nothing pushed.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Expand to all 40 functions (classes a to e) with the full PGlite matrix, signature cross-check and the future-migration ratchet</name>
  <files>supabase/migrations/20260930000200_tighten_function_execute_grants.sql, app/services/__tests__/function-execute-grants-migration.test.ts, SP/pglite-wcr/scenarios-wcr.mjs (scratchpad only), SP/pg-parse-289/parse-wcr.mjs (scratchpad only)</files>
  <read_first>the inventory table in this plan; supabase/migrations/20260101000000_baseline_schema.sql CREATE POLICY statements for character_guild_memberships (around 3545 and 3903) and the triggers at 2990-3026; supabase/migrations/20260722000002_scope_cross_guild_read_policies.sql lines 55-75 (profiles policy); SP/pg-parse-289/parse.mjs (libpg-query usage)</read_first>
  <behavior>
    - Shape test (RED first): EXPECTED holds all 40 class a to e entries from the inventory, including is_invite_code_valid as class a (row 42, D-11). At the end of this task the file has exactly 72 statements (40 REVOKE, 32 GRANT); Task 3 raises this to 77. anon appears in a GRANT only for the 8 class d and e functions. Neither class f name appears.
    - Signature cross-check: for each EXPECTED entry, the parameter list in the migration equals the one in the latest CREATE [OR REPLACE] FUNCTION "public"."name"( header in a migration with an earlier timestamp. Normalize both sides by removing double quotes and DEFAULT clauses, collapsing whitespace and lowercasing. No later DROP FUNCTION removes the function.
    - Ratchet (D-07): findUnrevokedPublicFunctions returns ['f_x'] for an inline sample that creates "public"."f_x" with no REVOKE. It returns [] when the sample also has REVOKE ALL ON FUNCTION "public"."f_x"() FROM PUBLIC, "anon". It returns ['f_y'] when the only REVOKE for f_y omits PUBLIC. It handles lowercase SQL (as in 20260704000001). Applied to every migration file with a timestamp greater than 20260930000200, it returns [] for each.
    - PGlite matrix (all must PASS): inventory completeness (pg_proc public names equal the 42 in the table); before and after ACL snapshots per function equal the "EXECUTE now" and "EXECUTE after" columns; SET ROLE call outcomes per class; real policies still run for anon and authenticated; triggers still fire; re-apply is a no-op.
  </behavior>
  <action>
Tests first (RED): extend EXPECTED in the shape test to the 40 entries of the inventory table (class a rows 1-19 and 42, b 20-23, c 24-31, d 32-37, e 38-39), and add the statement-count, anon-grant, class-f-absence, signature cross-check and ratchet tests from the behavior list (per D-02, D-03, D-05, D-07). Export nothing. findUnrevokedPublicFunctions is a local function with a JSDoc comment explaining the rule and that it only applies to migrations after 20260930000200, so earlier files (including qg0's and qzn's) are not scanned. Run the test and see it fail on the six-function file.

GREEN, migration (per D-02, D-03, D-04, D-06, D-10): complete the file in this group order, with a one-line neutral comment per group. Rest of class a: rows 7-15; then row 42 (is_invite_code_valid) under a comment saying it is uncalled and becomes service-role only because D-11 removes the only client read policy on its table; then rows 16-19 under a comment saying they are restated unchanged. Class b rows 20-23: REVOKE FROM PUBLIC, "anon", then GRANT TO "authenticated", "service_role"; the comment names the in-function check each relies on. Class c rows 24-31: REVOKE FROM PUBLIC, "anon", "authenticated" only; the comment says firing a trigger does not need EXECUTE. Class d rows 32-37: REVOKE FROM PUBLIC, then GRANT TO "anon", "authenticated", "service_role"; the comment gives the D-06 reason in one sentence. Class e rows 38-39: same statements; the comment says they return only rows that RLS already shows to anon. Copy each parameter list from the inventory table (which matches the defining CREATE header), including search_help_articles("p_query" text, "p_limit" integer) and reset_guild_season with parameter names and no DEFAULT clauses. Do not name any enforce_loot_submission_* or enforce_guild_* function (D-10).

PGlite matrix (per D-08), extending scenarios-wcr.mjs:
(1) Before the migration, snapshot every public function's non-owner EXECUTE grantee set and assert it equals the "EXECUTE now" column.
(2) After the migration: assert the set of public function names in pg_proc is exactly the 42 in the table; the grantee sets equal "EXECUTE after"; and has_function_privilege for 'public', anon, authenticated and service_role agrees for all 42.
(3) Calls with typed NULL arguments: as anon, every class a, b and c function gives 42501. As authenticated, every class a and c function gives 42501, and every class b function gets past the EXECUTE check. As service_role, every class a and b function gets past it. As anon and authenticated, every class d and e function gets past it. If a class c direct call raises something other than 42501 before the privilege check, record the observed code and rely on has_function_privilege for that case; PGlite 17 was observed to give 42501.
(4) Create these before the pre-migration snapshot in (1), so Task 3 can record results from before the migration. Reduced tables, with the columns the helpers, policies and triggers read (list them in the script header as deviations, as scenarios-313.mjs does): guilds, characters, character_guild_memberships, guild_roles, profiles, user_preferences, loot_submissions and guild_invite_codes. Load the real baseline SELECT policies for character_guild_memberships and the real 20260722000002 profiles policy (picked by regex with the expected count asserted), with RLS enabled on those two tables, and the real CREATE TRIGGER statements create_guild_default_roles, enforce_max_roles and update_user_preferences_updated_at. Grant the table privileges the scenarios need to anon, authenticated and service_role, standing in for Supabase's defaults. Seed one guild whose creator is user G, an officer user O (character plus an active membership at the Officer role) and a member user M.
(5) Policies: as anon and as each authenticated user, SELECT from character_guild_memberships and profiles succeeds with no 42501. O sees the guild's memberships. is_guild_officer returns false for anon and M, and true for O.
(6) Guarded RPCs: as M, delete_guild on the guild raises P0001 and the guild still exists. save_submission_items on a random id raises P0001. create_expansion_for_guild raises P0001. redeem_invite_code('NOPE') returns a row with error_code NOT_FOUND. As anon, all four give 42501.
(7) Triggers: as authenticated G, inserting a guild creates its three default roles, then inserting guild_roles directly until the eleventh raises the 10-role message (P0001), which shows the INVOKER trigger fired for authenticated. Updating a user_preferences row as its owner changes updated_at. A direct call of update_updated_at_column() as authenticated gives 42501.
(8) Idempotency: execute the migration a second time with no error and the same ACL snapshot.
(9) OD-01 evidence, in a separate new PGlite instance: after ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, a new function still has PUBLIC. After the global form without IN SCHEMA, a new function does not, but still has the per-schema anon and authenticated grants. Evidence only; nothing is added to the repo.
Save the output to SP/pglite-wcr/run-output-wcr.txt.

Real-parser check: write SP/pg-parse-289/parse-wcr.mjs, which imports parse from libpg-query like parse.mjs does and parses the migration file from WT (it never runs SQL). It asserts 72 statements, each a GrantStmt with objtype OBJECT_FUNCTION: 40 with is_grant false and 32 with is_grant true whose privilege is EXECUTE. Task 3 extends it. Save its output to SP/pg-parse-289/parse-output-wcr.txt.

Run everything, then commit (stage only the two repo files), for example "fix(db): set explicit EXECUTE grants on every public function by caller", with the trailer. Do not push.
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/pglite-wcr && node scenarios-wcr.mjs > run-output-wcr.txt 2>&1 && ! grep -q '^FAIL' run-output-wcr.txt && test "$(grep -c '^PASS' run-output-wcr.txt)" -ge 100 && cd ../pg-parse-289 && node parse-wcr.mjs > parse-output-wcr.txt 2>&1 && cd ../wtfx && npx vitest run app/services/__tests__/function-execute-grants-migration.test.ts && git log -1 --format=%B | grep -q 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>'</automated>
  </verify>
  <done>The migration restates grants for all 40 class a to e functions in 72 statements. PGlite proves the before and after ACLs for all 42 functions, the 42501 and pass outcomes per role and class, that the real policies still run for anon and authenticated, that the three triggers still fire, and that re-applying is a no-op. It also records the OD-01 default-privilege evidence. libpg-query confirms the file is 72 function GRANT and REVOKE statements. The shape test, with the signature cross-check and the ratchet, passes. Second local commit with the trailer.</done>
</task>

<task type="auto">
  <name>Task 3: Invite code policy (D-11) and search_path pins (D-12) with proof, then catalog dry run, full regression, text gates and handover</name>
  <files>supabase/migrations/20260930000200_tighten_function_execute_grants.sql, app/services/__tests__/function-execute-grants-migration.test.ts, SP/pglite-wcr/scenarios-wcr.mjs (scratchpad only), SP/pg-parse-289/parse-wcr.mjs (scratchpad only), SP/pglite-wcr/catalog-wcr.mjs (scratchpad only), SP/final-wcr-vitest.txt, SP/final-wcr-tsc.txt, SP/final-wcr-eslint.txt</files>
  <read_first>D-11 and D-12 and investigation findings 7 and 8 in this plan; supabase/migrations/20260101000000_baseline_schema.sql lines 26-61, 357-390, 454-465 and 1160-1195 (the four D-12 bodies), 1645-1660 (guild_invite_codes table) and 3475 (its policy); the D-11 call-site files; the Production catalog check section of this plan; SP/baseline-wcr-vitest.txt; SP/baseline-wcr-tsc.txt</read_first>
  <action>
Re-verify first (per D-11, D-12). Grep WT again for every reference to guild_invite_codes and is_invite_code_valid, open each call site, and confirm that the client is the service role. For app/api/admin/clear-all-guilds/route.ts, confirm that createAdminClient in utils/supabase/admin.js uses the service role key. Confirm that no migration after the baseline creates, drops or alters a policy on guild_invite_codes, and that no migration sets FORCE ROW LEVEL SECURITY. Re-read the four D-12 bodies and confirm that every unqualified name resolves to a public table or a pg_catalog built-in. If any client read of guild_invite_codes turns up, or any body needs another schema, do not add that statement: record it in the SUMMARY as a flagged item and tell the orchestrator.

Tests first (RED): in the shape test, widen the statement whitelist to exactly the three kinds in D-01. Add a third anchored regex for ALTER FUNCTION "public"."name"(args) SET search_path TO 'public', 'pg_temp' and a fourth, exact form for DROP POLICY IF EXISTS "Anyone can view active invite codes" ON "public"."guild_invite_codes". Assert 77 statements in total: 40 REVOKE, 32 GRANT, 4 ALTER FUNCTION and 1 DROP POLICY. Assert that the ALTER FUNCTION names are exactly can_view_master_sheet, get_guild_expansions, get_user_guild_ids and update_guild_info, with argument lists that match the inventory rows and pass the same signature cross-check. Assert that the file contains no CREATE POLICY and no other ALTER or DROP. Run the test and see it fail.

GREEN, migration (per D-01, D-11, D-12, D-09): append two groups. First, the four ALTER FUNCTION ... SET search_path TO 'public', 'pg_temp' statements (parameter lists from the inventory rows 7, 15, 35 and 38), under a one-line comment saying these were the only SECURITY DEFINER functions without a fixed search_path and that their bodies reference only public tables. Second, the DROP POLICY IF EXISTS statement, under a one-line comment saying every read of guild_invite_codes goes through the service role, so client roles need no SELECT policy. Extend the header with an Invite codes section and a search_path section, each one or two neutral sentences. Extend Rollback: recreate the baseline policy verbatim (CREATE POLICY "Anyone can view active invite codes" ON "public"."guild_invite_codes" FOR SELECT USING (("is_active" = true))), and use ALTER FUNCTION ... RESET search_path for the four functions. Describe the rules only, as in D-09.

PGlite (per D-08), extending scenarios-wcr.mjs. Keep every Task 2 check passing; the reduced tables already exist before the migration is applied.
(10) Invite codes: give the reduced guild_invite_codes table the columns id, guild_id, code, is_active, expires_at, max_uses, current_uses and created_by. Enable RLS, load the real baseline policy statement picked by regex (expect exactly 1), and grant table privileges to the three roles as Supabase does. Seed one active code with max_uses 2 and one inactive code. Before the migration (control, counts only): anon reads 1 row. After the migration: pg_policies has no row for the table. anon, M (non-officer) and O (officer) each SELECT 0 rows with no error, and service_role reads both codes. Invite flow: as service_role, insert a new code, which stands in for POST /api/guild-invites, then look it up by code, which stands in for the GET /api/guild-invites/[code] lookup. As authenticated M, redeem_invite_code(code) returns error_code NULL with invite_current_uses incremented, and the stored current_uses matches. Redeeming again past max_uses returns MAX_USES_REACHED. The inactive code returns DEACTIVATED. As anon, redeem_invite_code gives 42501. is_invite_code_valid as service_role returns true for the active code and false for an unknown one; as anon and as authenticated it gives 42501. Note in the script header that PGlite's postgres is a superuser: in production, redeem_invite_code relies on the owner's RLS exemption, since no FORCE ROW LEVEL SECURITY is set.
(11) search_path: before the migration, record representative results. Give the reduced tables the columns these functions read (add expansions and raid_tiers if Task 2 did not). Record get_guild_expansions(guild) as O (two expansions, one current, one with a NULL timezone to exercise the default); get_user_guild_ids(O) and get_user_guild_ids(M) as O; and can_view_master_sheet(tier, O) and (tier, M) as service_role, once with master_sheet_visible false and once with it true. Record update_guild_info as service_role with request.jwt.claim.sub set to G: it writes and the row reads back with the new values; with sub set to M it raises the owner message. After the migration: proconfig for each of the four contains search_path=public, pg_temp. The same calls, by the same roles (all four keep EXECUTE for the role used), return deep-equal JSON. update_guild_info writes a second set of values and reads them back, and raises the same message for M. Then create schema scratch with empty tables named guilds and expansions (USAGE and SELECT granted to authenticated, so they would be visible to an unpinned function), SET search_path TO scratch, public as O, and confirm get_guild_expansions and get_user_guild_ids still return the recorded results. Reset the search_path afterwards.
(12) Idempotency: the second apply from Task 2 (8) still passes with the new statements.
Save the output to SP/pglite-wcr/run-output-wcr.txt.

Real-parser check: extend SP/pg-parse-289/parse-wcr.mjs to assert 77 statements: 72 GrantStmt as before; 4 AlterFunctionStmt, each with one VariableSetStmt named search_path whose values are public and pg_temp; and 1 DropStmt with removeType OBJECT_POLICY and missing_ok true. Save to SP/pg-parse-289/parse-output-wcr.txt.

Commit (stage only the two repo files), for example "fix(db): remove the client read policy on guild_invite_codes and pin search_path on four functions", with the trailer. Do not push.

Catalog dry run (per D-08): write SP/pglite-wcr/catalog-wcr.mjs, which reuses the scenarios-wcr.mjs loader (import or copy it), including the reduced guild_invite_codes table and its baseline policy. It applies all migrations including 20260930000200 and runs the four catalog queries from this plan verbatim. Assert that query 1 returns 42 rows whose anon, authenticated and service_role columns match the "EXECUTE after" column (10, 14 and 42 true) and whose search_path_pinned is true on every definer row. Assert that query 2 returns the baseline default-privilege rows, that query 3 returns no rows, and that query 4 returns 1 row before the new migration and none after it. Save the output to SP/pglite-wcr/catalog-output-wcr.txt. If a query needs a change to run, change it in the SUMMARY (the plan text is not edited) and say why.

Full regression (compare with Task 1 baselines): npx vitest run for the whole suite (every test that passed in baseline-wcr-vitest.txt still passes; the new test file passes), npx tsc --noEmit (no new errors versus baseline-wcr-tsc.txt), and npx eslint on app/services/__tests__/function-execute-grants-migration.test.ts. Save the outputs to SP/final-wcr-vitest.txt, SP/final-wcr-tsc.txt and SP/final-wcr-eslint.txt and compare them by hand with the baselines.

Text gates (per D-09) over the lines this branch adds (git diff origin/main...HEAD, added lines only) and the commit messages: no em dash character, and the vocabulary gate in verify. If a gate fails, reword and amend the latest commit or add a fixup commit (never rewrite pushed history; nothing is pushed). Confirm git status in WT is clean, that there are exactly three (or four, with a fixup) commits ahead of origin/main, all with the trailer, and that no planning file exists in WT.

SUMMARY: create /Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/260929-wcr-tighten-database-function-execute-grants/260929-wcr-SUMMARY.md in the main checkout, not in WT. Include: the commit hashes; the class counts and the final grants table; PGlite PASS counts and any recorded deviation; the libpg-query result; baseline versus final vitest and tsc counts; the catalog queries (as run) with the instruction to run them in production before and after the deploy; the OD resolutions as applied (all four accepted on 2026-09-29); the D-11 re-verification of every guild_invite_codes call site and client, plus the is_invite_code_valid move to class a; the D-12 before-and-after results; any flagged item from the re-verification; and the follow-ups in neutral wording without detail. The follow-ups are: auth.uid()-bound helpers replacing get_user_guild_ids (OD-02); moving the redeem_invite_code call to the service-role client and then revoking authenticated (OD-04); and dropping the uncalled update_guild_icon and update_guild_info.
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/pglite-wcr && node scenarios-wcr.mjs > run-output-wcr.txt 2>&1 && ! grep -q '^FAIL' run-output-wcr.txt && grep -q 'guild_invite_codes' run-output-wcr.txt && grep -q 'search_path' run-output-wcr.txt && node catalog-wcr.mjs > catalog-output-wcr.txt 2>&1 && ! grep -q '^FAIL' catalog-output-wcr.txt && cd ../pg-parse-289 && node parse-wcr.mjs > parse-output-wcr.txt 2>&1 && cd ../wtfx && npx vitest run app/services/__tests__/function-execute-grants-migration.test.ts && npx eslint app/services/__tests__/function-execute-grants-migration.test.ts > ../final-wcr-eslint.txt 2>&1 && npx vitest run > ../final-wcr-vitest.txt 2>&1 && npx tsc --noEmit > ../final-wcr-tsc.txt 2>&1 && ADDED=$(git diff origin/main...HEAD -U0 | grep '^+' | grep -v '^+++') && MSGS=$(git log origin/main..HEAD --format=%B) && EMDASH=$(printf '\342\200\224') && ! printf '%s\n%s\n' "$ADDED" "$MSGS" | grep -qF "$EMDASH" && ! printf '%s\n%s\n' "$ADDED" "$MSGS" | grep -Eiq 'vul[n]|xploi[t]|attac[k]|escala[t]|advisor[y]' && test -z "$(git status --porcelain)" && test -f /Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/260929-wcr-tighten-database-function-execute-grants/260929-wcr-SUMMARY.md</automated>
  </verify>
  <done>The migration has 77 statements, confirmed by the shape test and libpg-query. In PGlite: client roles read 0 invite code rows, the invite flow still works through the service role and redeem_invite_code, is_invite_code_valid is service-role only, and the four functions have search_path pinned with identical results before and after. The catalog queries run in PGlite and return the expected 42-row table (10, 14 and 42 true, every definer row pinned), the default-privilege rows, no rows for query 3, and no invite code policy after the migration. The full vitest run shows no regression against baseline-wcr-vitest.txt, and tsc and eslint are clean. Both text gates pass. WT is clean with three or four local commits carrying the trailer, nothing is pushed, there is no PR, and no planning files are in WT. The SUMMARY is written in the main checkout.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser (publishable anon key or user JWT) to PostgREST /rest/v1/rpc | Any public-schema function with EXECUTE for anon or authenticated, directly or through PUBLIC, can be called with caller-chosen arguments |
| API route (service_role) to database | Trusted code that authorizes before calling; needs explicit service_role grants |
| RLS policy evaluation | Policy expressions run as the querying role, so helpers need EXECUTE for every role that queries the table |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-wcr-01 | Tampering | class a SECURITY DEFINER write functions (merge_phase_groups, reset_blp, increment_blp, increment_blp_bulk, seed_tbc_expansion_for_guild, update_guild_icon, update_guild_info) executable through PUBLIC | high | mitigate | REVOKE FROM PUBLIC, anon, authenticated plus GRANT to service_role (D-02); PGlite 42501 cases and ACL snapshot |
| T-wcr-02 | Information disclosure | class a read functions that return rows outside the caller's RLS (get_guild_submissions, get_character_guilds, get_user_characters_in_guild, can_view_master_sheet) | medium | mitigate | same REVOKE (D-02); PGlite 42501 cases |
| T-wcr-03 | Denial of service | removing PUBLIC breaks a legitimate caller: RLS helper during anon queries, user-session RPC, service-role route, trigger or column default | high | mitigate | explicit grants per class (D-02, D-04, D-05, D-06); inventory completeness check; PGlite positive cases for policies, guarded RPCs and triggers; full vitest run; production catalog query before and after |
| T-wcr-04 | Tampering | a later migration adds a public function, or drops and recreates one, without revoking PUBLIC | medium | mitigate | D-07 ratchet in the shape test; OD-01 records the database-default option |
| T-wcr-05 | Information disclosure | get_user_guild_ids stays executable by anon and authenticated because RLS policies need it | low | transfer | OD-02 follow-up, tracked separately |
| T-wcr-06 | Tampering | redeem_invite_code stays executable by authenticated | low | accept | the route requires sign-in and the code is the gate; OD-04 follow-up moves the call to the service role |
| T-wcr-07 | Information disclosure | public repository text describing the pre-change state before deployment | medium | mitigate | D-09 wording and vocabulary gate; no push or PR by the executor; plan committed only after deployment |
| T-wcr-08 | Tampering | production ACLs differ from the migrations (dashboard grants, functions outside the migrations) | medium | mitigate | D-03 restates all 40; catalog query 1 run before the deploy shows extra functions and grantees |
| T-wcr-09 | Information disclosure | guild_invite_codes rows readable by client roles through its SELECT policy | high | mitigate | D-11 drops the only policy; PGlite shows 0 rows for anon, a non-officer and an officer, and catalog query 4 confirms it in production |
| T-wcr-10 | Tampering | SECURITY DEFINER functions without a fixed search_path resolve unqualified names through the caller's search_path | low | mitigate | D-12 pins search_path on the four; PGlite before-and-after results plus the scratch-schema check; catalog query 1 search_path_pinned column |
| T-wcr-11 | Denial of service | dropping the invite code policy or pinning search_path breaks the invite flow or changes results | high | mitigate | D-11 call-site re-verification; PGlite invite flow (service-role create and lookup, authenticated redeem, max uses, deactivated); deep-equal results for the four pinned functions |

No package installs: the proof reuses existing scratchpad node_modules (PGlite in pglite-289, libpg-query in pg-parse-289), so there is no supply-chain gate.
</threat_model>

<verification>
- PGlite: SP/pglite-wcr/run-output-wcr-task1.txt, run-output-wcr.txt and catalog-output-wcr.txt have zero FAIL lines and include the pre-migration control, the 42-function ACL snapshots, per-role call outcomes, policy, guarded-RPC and trigger cases, idempotent re-apply and the OD-01 evidence; SP/pg-parse-289/parse-output-wcr.txt shows 77 statements (72 function GRANT and REVOKE, 4 ALTER FUNCTION SET search_path, 1 DROP POLICY IF EXISTS); run-output-wcr.txt also covers the D-11 invite code and D-12 search_path cases.
- vitest: the shape test passes (statement whitelist of the three D-01 kinds, 77 statements, exact role sets, signature cross-check, ratchet); the full run shows no regression against SP/baseline-wcr-vitest.txt.
- npx tsc --noEmit and eslint on the changed test file: no new problems.
- Text gates: no em dash and no vocabulary-gate words in added lines or commit messages.
- Git: three or four local commits on fix/function-execute-grants in WT, trailer present, clean status, nothing pushed, no PR, no planning docs in WT.
</verification>

<success_criteria>
- Every public function's EXECUTE grants match the "EXECUTE after" column: 20 service-role only, 4 authenticated plus service_role, 8 trigger functions with no client or PUBLIC EXECUTE, 8 helpers and read functions with explicit anon, authenticated and service_role, 2 unchanged.
- guild_invite_codes has no client SELECT policy and client roles read no rows, while the invite flow works (D-11); every SECURITY DEFINER public function has a pinned search_path with unchanged results (D-12).
- No legitimate caller loses access: RLS policies, guarded RPCs, service-role routes, triggers and column defaults all proven in PGlite, and the full test suite passes.
- OD-01 to OD-04 are applied as accepted on 2026-09-29; follow-ups are listed in the SUMMARY in neutral wording.
</success_criteria>

<output>
Create /Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/260929-wcr-tighten-database-function-execute-grants/260929-wcr-SUMMARY.md when done (main checkout, not WT), with the contents listed in Task 3.
</output>
