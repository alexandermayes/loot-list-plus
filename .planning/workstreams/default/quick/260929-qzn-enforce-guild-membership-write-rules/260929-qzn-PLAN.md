---
phase: quick-260929-qzn
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/20260930000100_enforce_guild_membership_write_rules.sql
  - app/services/__tests__/guild-membership-write-rules-migration.test.ts
  - app/api/characters/[id]/guilds/route.ts
  - app/api/characters/[id]/guilds/__tests__/route.test.ts
  - app/api/guild-roles/route.ts
  - app/api/guild-roles/__tests__/route.test.ts
autonomous: true
requirements:
  - QZN-R1
  - QZN-R2
  - QZN-R3
  - QZN-R4
  - QZN-R5
  - QZN-R6
  - DELIVERY-R1

estimate:
  # estimate-calibration: factor 1, applied false, 0 samples, confidence low,
  # so tokens equals raw_tokens.
  tokens: 200000
  raw_tokens: 200000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "D-02 (QZN-R1): an anon or authenticated session cannot INSERT a character_guild_memberships row (including the insert phase of an upsert), and its UPDATE of an own row is accepted only when every column other than is_active is unchanged and is_active is unchanged or set to false; anything else gets SQLSTATE 42501 with the RLS message and no DETAIL."
    - "D-02 (QZN-R2): service_role, postgres, migrations and writes made by another trigger (pg_trigger_depth() > 1) are never checked, so the invite and Discord joins, guild creation, role changes, kicks, trial changes, the auto-promote cron, ownership transfer, the Battle.net import upsert, character removal and account deletion keep working."
    - "D-02 (QZN-R2): leaving a guild through /api/guilds/leave (user session UPDATE of is_active to false) still works, and reject_submissions_on_cgm_loss still moves that raider's pending and approved lists in the guild to rejected."
    - "D-04 (QZN-R3): an anon or authenticated session can only INSERT guild_roles rows with position below 50 and is_default not true, and can only UPDATE a guild_roles row by changing position between values below 50; the default roles created by create_default_guild_roles during a user-session guild INSERT are not blocked."
    - "D-05 (QZN-R4, OD-2): an anon or authenticated session cannot change guilds.created_by, and (if OD-2 is included) cannot insert a guild with subscription_tier other than 'free' or change subscription_tier."
    - "QZN-R6: a member whose own role, guild, character or active-state write is refused is still not an officer afterwards: is_guild_officer and is_guild_master stay false and the officer-only guilds UPDATE affects 0 rows, while the pre-migration control shows the same statements succeeding."
    - "D-07 (QZN-R5): PUT /api/guild-roles propagates a rename to memberships from the role's stored name, never from the request body's old_name, and only when the stored name actually changes."
    - "D-08 (QZN-R5): POST /api/characters/[id]/guilds reactivates an inactive membership with the same role its insert branch assigns (Guild Master for the guild creator, otherwise the guild's default role), not the row's previous role."
    - "D-10 (DELIVERY-R1): commit messages, code comments, SQL comments and the SUMMARY use neutral, factual wording and pass the vocabulary gate in Task 3; nothing is pushed and no PR is opened."
  artifacts:
    - path: "supabase/migrations/20260930000100_enforce_guild_membership_write_rules.sql"
      provides: "Three SECURITY DEFINER trigger functions and BEFORE triggers on character_guild_memberships, guild_roles and guilds, EXECUTE revoked from PUBLIC, anon, authenticated; DROP POLICY IF EXISTS for the membership INSERT policy (and the DELETE policy if OD-3 is included)"
      contains: "enforce_guild_membership_write_rules"
    - path: "app/services/__tests__/guild-membership-write-rules-migration.test.ts"
      provides: "Dollar-quote-aware shape test (timestamp after 20260930000000, statement list, trigger events, read-only bodies, role and depth guard, error code, no grant or policy creation)"
      contains: "enforce_guild_role_write_rules"
    - path: "app/api/characters/[id]/guilds/route.ts"
      provides: "Reactivation sets role the same way the insert branch does"
    - path: "app/api/guild-roles/route.ts"
      provides: "Rename propagation keyed on the stored role name"
    - path: "/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/pglite-qzn/scenarios-qzn.mjs"
      provides: "Scratchpad-only PGlite behaviour proof (never committed); outputs saved beside it"
  key_links:
    - from: "PostgREST INSERT, upsert and UPDATE on public.character_guild_memberships (role anon or authenticated)"
      to: "public.enforce_guild_membership_write_rules()"
      via: "BEFORE INSERT OR UPDATE FOR EACH ROW; BEFORE INSERT also fires on the insert phase of ON CONFLICT DO UPDATE; current_setting('role', true) keeps the session role inside SECURITY DEFINER functions"
      pattern: "CREATE OR REPLACE TRIGGER \"enforce_guild_membership_write_rules\""
    - from: "/api/guilds/leave (user session UPDATE is_active false)"
      to: "public.reject_submissions_on_cgm_loss() (AFTER UPDATE OR DELETE)"
      via: "the BEFORE trigger accepts an is_active-only change to false, so the AFTER trigger still fires and rejects the raider's pending and approved lists"
      pattern: "to_jsonb\\(NEW\\) - 'is_active'"
    - from: "user-session INSERT on public.guilds (POST /api/guilds)"
      to: "public.create_default_guild_roles() then public.enforce_guild_role_write_rules()"
      via: "nested INSERT of the three default roles runs at pg_trigger_depth() = 2 and is exempt"
      pattern: "pg_trigger_depth\\(\\) > 1"
    - from: "is_guild_officer, is_guild_master, verifyPermission and the officer RLS policies"
      to: "character_guild_memberships.role and is_active joined to guild_roles.position, and guilds.created_by"
      via: "these are the columns the three triggers keep user sessions from changing"
      pattern: "gr.position >= 50"
---

<objective>
Enforce guild membership write rules in the database for character_guild_memberships, and keep user sessions from changing the guild_roles positions and guilds.created_by values that the officer checks read. Also make two service-role routes that write membership roles follow the position hierarchy already used by PUT /api/guild-members.

Purpose: is_guild_officer, is_guild_master, verifyPermission and the officer RLS policies all decide officer rights from character_guild_memberships.role and is_active (joined to guild_roles.position) and from guilds.created_by. Every flow that creates a membership or changes its role, guild or active state runs on the server with the service role, except leaving a guild. After this change the database holds user sessions to exactly that: a session can leave (set is_active to false on its own rows), and nothing else on memberships; it can only manage guild roles below officer level; and it cannot change who owns a guild.

Output: one migration plus its shape test, two small route changes with new route tests, and a scratchpad-only PGlite proof. Local commits only in WT; the orchestrator reviews, pushes and opens the PR together with 260929-qg0.

Work location: WT = /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wtms (branch fix/membership-write-rules, from origin/main 77afa063, node_modules symlinked). Every repo path below is relative to WT. Do not touch local main, the wt-phase06 worktree or the wtls worktree.

## Decisions (locked unless an OD below changes them)

- D-01: One migration, supabase/migrations/20260930000100_enforce_guild_membership_write_rules.sql, following the #313 precedent (supabase/migrations/20260929180000_enforce_loot_history_guild_refs.sql): plpgsql trigger functions, SECURITY DEFINER, SET search_path TO 'public', 'pg_temp', schema-qualified names, REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated, client detection by current_setting('role', true) IN ('anon', 'authenticated'), messages passed with RAISE USING MESSAGE (never as a format string), header comment with Problem, Fix, Why a trigger, Error contract and Rollback sections. 20260930000100 is later than the parallel task's 20260930000000 (260929-qg0, wtls) and unused; both ship in one PR. The existing migration shape tests anchor to fixed timestamps (the #309 fix), so none of them breaks.
- D-02 (memberships, QZN-R1, QZN-R2): public.enforce_guild_membership_write_rules(), BEFORE INSERT OR UPDATE ON public.character_guild_memberships FOR EACH ROW (no column list, no DELETE). It returns NEW at once when the role setting is not anon or authenticated, or when pg_trigger_depth() > 1 (a write made by another trigger function, which only ships in reviewed migrations; none writes this table today). For client callers: every INSERT fails (a BEFORE INSERT trigger also fires on the insert phase of an upsert, even when the row then conflicts and updates); an UPDATE fails unless (to_jsonb(NEW) - 'is_active') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'is_active') and (NEW.is_active IS NOT DISTINCT FROM OLD.is_active or NEW.is_active = false). The whole-row comparison means a column added later is protected by default. There is no officer exemption: no officer roster action writes this table from a user session (investigation finding 1); officers use /api/guild-members, /api/guild-members/trial-status and /api/guilds/transfer-ownership, which use the service role. DELETE is left to the policy (OD-3), because delete_guild is a SECURITY DEFINER function called with the user's session (role setting 'authenticated', depth 0) and a DELETE rule in the trigger would stop guild deletion.
- D-03 (memberships policy): the migration drops "Users can insert own character memberships" (baseline ~3813), since no user-session flow inserts memberships; the trigger already refuses such inserts, so this only adds a second layer. The UPDATE policy stays (the leave route needs it) and the SELECT policies stay (legacy rows stay readable). Rollback recreates the policy verbatim.
- D-04 (guild roles, QZN-R3): public.enforce_guild_role_write_rules(), BEFORE INSERT OR UPDATE ON public.guild_roles FOR EACH ROW, same caller and depth guard as D-02. The depth exemption is required: POST /api/guilds inserts the guild with the user's session, and the AFTER INSERT trigger create_default_guild_roles inserts the Guild Master (100), Officer (50) and Member (0) rows at depth 2. For client callers: an INSERT fails unless NEW.position < 50 and NEW.is_default IS NOT TRUE; an UPDATE fails unless (to_jsonb(NEW) - 'position') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'position') and (NEW.position IS NOT DISTINCT FROM OLD.position, or both OLD.position and NEW.position are below 50). 50 is the officer threshold used by is_guild_officer (gr.position >= 50) and ROLE_POSITIONS.OFFICER. This matches RoleManager exactly (new roles below every custom role under 50; position swaps only among roles other than 50 and 100; renames and permission edits go through PUT /api/guild-roles, which uses the service role). DELETE is unchanged (the policy already requires is_default = false and an officer). A legacy custom role at a position of 50 or more (none can be created by the current UI) can then only be moved by the service role; the executor notes this in the SUMMARY.
- D-05 (guild owner, QZN-R4): public.enforce_guild_owner_write_rules() on public.guilds, same guard. For client callers an UPDATE fails when NEW.created_by IS DISTINCT FROM OLD.created_by. If OD-2 is included, an INSERT also fails unless NEW.subscription_tier = 'free' (column defaults are applied before BEFORE triggers run, so POST /api/guilds, which never sends the column, passes), and an UPDATE also fails when subscription_tier changes. Trigger event: BEFORE INSERT OR UPDATE OF "created_by", "subscription_tier" if OD-2 is included, otherwise BEFORE UPDATE OF "created_by". Only /api/guilds/transfer-ownership (service role) changes created_by, and only lib/billing/sync.ts (Stripe webhook) changes subscription_tier. Other officer-editable guild columns (name, realm, discord_server_id, is_active, active_expansion_id, icon_url, game) are not touched by this change.
- D-06 (error contract): every client failure in all three functions raises MESSAGE 'new row violates row-level security policy for table "<table>"' (character_guild_memberships, guild_roles or guilds), ERRCODE insufficient_privilege, no DETAIL. The rules read only NEW, OLD and the role setting, never table data, so there is no officer lookup, no failure-path query and nothing to reveal. Non-client callers are never checked, so there is no check_violation branch.
- D-07 (PUT /api/guild-roles, QZN-R5): before its update, the route reads the role's stored name (guild_roles select name, eq id role_id, eq guild_id, maybeSingle, service role). A lookup error returns status 500 with body { success: false } and no write, so RoleManager shows its existing fallback message ("Couldn't save role") and no new text is added. Propagation to character_guild_memberships runs only when the stored row exists and its name differs from name.trim(), and filters on the stored name (keeping the existing eq guild_id and eq is_active true). The request body's old_name is no longer read; RoleManager keeps sending it and needs no change. With this rule a rename moves exactly the holders of that role to its new name, so it never changes anyone's position.
- D-08 (POST /api/characters/[id]/guilds, QZN-R5): the reactivation branch updates is_active to true and role to the value the route already computes for its insert branch (Guild Master when guilds.created_by is the caller, otherwise getDefaultRoleName(guild_id)). This matches /api/guild-invites/[code] and /api/discord-guilds/join, which also reset the role when a membership is reactivated. Response shape unchanged. Who may add a character to a guild at all is OD-1, not part of this plan.
- D-09 (transition-only, legacy rows): the migration changes no data and validates no existing row. Legacy memberships whose role names no guild_roles row, whose is_active is NULL, or whose guild has custom roles at 50 or more stay readable and stay writable by the service role.
- D-10 (confidentiality): the repository is public and this plan is committed only after the fix is deployed. Commit messages, code comments, SQL comments, test names, PGlite labels and the SUMMARY describe the rules in neutral, factual terms, for example "membership rows are written by the server; a user session can only leave a guild". No security-incident vocabulary: Task 3 runs a vocabulary gate whose regex fragments define the banned words. No step-by-step description of how the rules could be bypassed before this change, and no description of the pre-change behaviour beyond "the policies checked only character ownership".
- D-11 (delivery): commit in WT on fix/membership-write-rules, each commit ending with the trailer "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Do NOT push. Do NOT open a PR. Do not commit planning docs in WT. No SQL against a real database. Do not read .env.local. Do not load or edit anything in wtls; the orchestrator runs the combined proof with 260929-qg0 on the joined branch. The SUMMARY is written to the main checkout task directory (see output).

## Open decisions (the orchestrator records the user's answer in Resolution before execution)

| ID | Question | Recommendation | Resolution |
|----|----------|----------------|------------|
| OD-1 | POST /api/characters/[id]/guilds and POST /api/battlenet/characters/import (both service role) add the caller's character to whatever guild_id the request names, with the guild's default role. The legitimate callers are CreateCharacterModal (after an invite or Discord join made with no character, when the only server-side trace is user_active_characters.active_guild_id, which the user's session can also write), CharacterSelector (adding an alt to the active guild) and the import dialog. Deciding who may add a character to a guild needs a server-side record of a pending invite or Discord join, which does not exist today. Handle here or separately? | Separately, as its own quick task right after this one, tracked without public detail until deployed: a short-lived, service-role-only pending-join record written by the invite and Discord no-character branches, and both routes allowing only the guild creator, an existing active member (alts), or a caller with a valid pending-join record. It touches the invite, Discord, character creation and import flows and would add a fourth task, so including it here means a split. This plan still ships D-08, so neither route can restore a previous role. || User decided 2026-09-29: separate follow-up quick task started right after this PR ships. Not in this plan's tasks. |
| OD-2 | Also keep user sessions from choosing guilds.subscription_tier (INSERT must be 'free', UPDATE unchanged) in the D-05 trigger? The guilds INSERT policy checks only created_by and the UPDATE policy lets officers write every column, so a session can set the tier that gates Premium features. | Include. It is one column in the same trigger, no client flow writes it, and the Stripe webhook sync uses the service role (executor verifies first, see Task 2). If declined: the D-05 trigger is BEFORE UPDATE OF "created_by" only, the subscription scenarios are dropped, and the SUMMARY lists it as a follow-up. || User decided 2026-09-29: include. |
| OD-3 | Also drop "Users can delete own character memberships"? No client flow deletes memberships (leaving is an UPDATE); a user deleting their own row only ends their own membership (the cgm-loss trigger still fires), and delete_guild, account deletion and FK cascades do not use that policy. | Include (drop it): the brief keeps a user-session DELETE only if a flow needs it, and none does. PGlite proves delete_guild-style SECURITY DEFINER deletes and FK cascades from a user session still work. If declined: the policy stays and the own-row DELETE scenario is a legitimate flow instead of a blocked one. || User decided 2026-09-29: include. |

## COPY (needs user sign-off; no em dashes)

No new user-facing text. D-07's lookup-error response has no error text, so RoleManager shows its existing fallback "Couldn't save role". D-08 keeps the response shape. The 42501 message for refused user-session writes is PostgREST text that no legitimate flow reaches, so it needs no sign-off.
</objective>

<execution_context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/STATE.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/CLAUDE.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/260929-qg0-enforce-loot-list-status-rules/260929-qg0-PLAN.md

Source files (WT-relative):
- supabase/migrations/20260929180000_enforce_loot_history_guild_refs.sql (pattern to follow)
- app/services/__tests__/loot-history-guild-refs-migration.test.ts (shape-test pattern: stripComments, splitStatements, blankStrings, functionParts; its COMMENT strings must not contain two hyphens)
- supabase/migrations/20260101000000_baseline_schema.sql: character_belongs_to_user 64; check_max_roles_per_guild 103; create_default_guild_roles 125; delete_guild 195 (replaced by 20260722000001 with an is_guild_master guard); get_user_guild_ids 454; is_guild_master 561; is_guild_officer 591; reject_submissions_on_cgm_loss 856; character_guild_memberships table 1474, unique_character_guild 2513, FKs 3130-3136, indexes 2638-2662; guild_roles table 1679, unique_role_per_guild 2528, FK 3205; guilds table ~1797; triggers 2990, 2994, 3006; guilds policies 3483, 3588, 3731; guild_roles policies 3549, 3615, 3635, 3723; cgm policies 3545, 3791, 3813, 3856, 3903; RLS enable 4001; grants 4649-4651
- supabase/migrations/20260926120000_add_guild_game_version.sql (guilds.game NOT NULL DEFAULT 'classic')
- app/api/characters/[id]/guilds/route.ts (POST 84-230: role computed ~128-134, reactivation ~154-178, insert ~185-205)
- app/api/guild-roles/route.ts (PUT, 55 lines)
- app/(app)/guild-settings/components/RoleManager.tsx (insert 93-109, PUT call 133-150, position swap 200-230)
- utils/server-roles.ts (verifyOfficerPermissions, verifyRoleChangePermissions)
- app/api/guilds/__tests__/route.test.ts (route-test pattern: node environment header, vi.mock of server and service-role modules, recording fake client)
- Scratchpad harness model: /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/pglite-313/scenarios-313.mjs (splitSql, pick, asUser, asAnon, asService, expectOk, expectErr; its WT constant points at wt313, which no longer exists)

## Investigation findings (verified in WT at 77afa063)

1. Every write to character_guild_memberships (wide-window scan of every .from('character_guild_memberships') chain in app, lib, utils, domain, components, discord-bot and companion, plus every SQL function):

| Path | Client | Write | Notes |
|------|--------|-------|-------|
| POST /api/guilds (creator's first membership) | service role | INSERT role 'Guild Master', is_active true | Guild row itself is inserted with the user's session; default roles come from the nested create_default_guild_roles trigger. With no configured character, the Guild Master membership is added later through POST /api/characters/[id]/guilds. |
| POST /api/guild-invites/[code] | service role | INSERT default role, trial fields; reactivation UPDATE is_active true, role default, joined_at, joined_via, trial fields | redeem_invite_code RPC (user session) writes only guild_invite_codes. |
| POST /api/discord-guilds/join | service role | same INSERT and reactivation shapes, joined_via 'discord_verify' | Verifies Discord server membership first. |
| POST /api/characters/[id]/guilds | service role | INSERT role (Guild Master for the creator, else default) and client-supplied joined_via; reactivation UPDATE is_active true only (keeps the previous role) | Checks only character ownership. D-08 and OD-1. Callers: CreateCharacterModal, CharacterSelector. |
| DELETE /api/characters/[id]/guilds | service role | UPDATE is_active false | Blocks removing a creator's last character. |
| POST /api/battlenet/characters/import | service role | upsert (onConflict character_id,guild_id) default role, is_active true, for a newly created character | guildId from the request. OD-1. |
| PUT /api/guild-members | service role | UPDATE role (and demotes other Guild Masters to Officer) | verifyPermission manage_members plus verifyRoleChangePermissions (only the creator promotes to Guild Master; nobody promotes to or changes a role at or above their own position). |
| DELETE /api/guild-members | service role | UPDATE is_active false | Hierarchy-checked. |
| PUT /api/guild-members/trial-status, GET /api/cron/auto-promote-trials | service role | UPDATE membership_status, trial_started_at, promoted_at | |
| POST /api/guilds/transfer-ownership | service role | guilds.created_by, then UPDATE role Guild Master and Officer | Creator only. |
| PUT /api/guild-roles | service role | guild_roles name and permissions, then UPDATE role = new name WHERE role = old_name from the request body | verifyOfficerPermissions only. D-07. |
| POST /api/guilds/leave | user session | UPDATE is_active false on the caller's active rows, by id | The only user-session write. Must keep working (D-02). |
| POST /api/user/delete-account | service role | DELETE memberships | |
| DELETE /api/characters/[id] | service role | DELETE character (FK cascade deletes memberships) | |
| delete_guild RPC (POST /api/guilds/delete, DELETE /api/guilds) | user session calling SECURITY DEFINER (is_guild_master guard, 20260722000001) | DELETE memberships of the guild | Role setting stays 'authenticated', depth 0; this is why no DELETE rule is added (D-02). |
| app/api/admin/clear-all-guilds | admin client | DELETE | |
| scripts/*.ts, scripts/*.js | service role (dev) | INSERT, UPDATE, upsert, DELETE | Not affected. |
| Client components and contexts (AttendanceContent, LootSettingsContent, MasterSheetContent, ProfileContent, SetupGuide, DashboardContent, raid-tracking import, GuildContext, LootListContext, lib/cache/user-bundle, utils/feature-gate, utils/analytics/funnel, lib/addon/companion-auth, audit-log) | user session or service role | SELECT only | No client-side writes anywhere. |
| discord-bot, companion, addon | n/a | none | No references to the table. |

2. No legitimate flow needs a user session to INSERT a membership, change role, guild_id or character_id, or set is_active to true. The flows that do those things already run on the server; two of them (POST /api/characters/[id]/guilds reactivation and PUT /api/guild-roles propagation) do not follow the position hierarchy the rest of the roster code uses, so D-07 and D-08 fix them. Whether a caller may add a character to a guild at all is OD-1.

3. Leaving is a user-session UPDATE of is_active to false (kept, D-02). No client flow DELETEs memberships (OD-3). reject_submissions_on_cgm_loss is SECURITY DEFINER and fires AFTER UPDATE OR DELETE; it keeps working because the leave UPDATE is accepted.

4. Officer checks that read cgm.role and is_active: is_guild_officer (position >= 50) and is_guild_master (position >= 100), both also true for guilds.created_by; the guilds UPDATE policy "Officers can update guild settings" (inline cgm join, position >= 50); every policy that calls is_guild_officer (guild_roles INSERT, UPDATE, DELETE; loot_history; loot_submissions officer branches and more); delete_guild (is_guild_master); and on the server verifyOfficerPermissions, verifyPermission and getUserGuildRole (utils/server-roles.ts), which also fall back to the default role positions for the names 'Officer' and 'Guild Master' when a guild's guild_roles rows lack them. The proof uses is_guild_officer, is_guild_master and the guilds UPDATE policy as the officer-gated actions.

5. guild_roles and guilds: guild_roles INSERT, UPDATE and DELETE policies require is_guild_officer(guild_id) with no position limit, so an officer's session can create or move a role to any position, including 100 (D-04). guilds: INSERT requires only created_by = auth.uid(); UPDATE allows an officer to change every column, including created_by (D-05) and subscription_tier (OD-2). Both fixes are small and the flows allow them, so they are included. Not covered and not membership columns: guilds.game and the other officer settings.

6. Migration shape tests (app/services/__tests__/*-migration.test.ts, app/api/addon/auth/__tests__/pkce-flow.test.ts) anchor to fixed timestamps; none scans for "the newest file". 20260930000100 is unused in WT and later than qg0's 20260930000000.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Tracer: a member's session can leave a guild but cannot change its own membership's role, guild, character or active state, proven end to end in PGlite with the real policies, helpers and cgm-loss trigger</name>
  <files>supabase/migrations/20260930000100_enforce_guild_membership_write_rules.sql</files>
  <precondition>The OD table has a Resolution for OD-1, OD-2 and OD-3; if not, stop and return a checkpoint asking the orchestrator for them.</precondition>
  <read_first>supabase/migrations/20260929180000_enforce_loot_history_guild_refs.sql; supabase/migrations/20260101000000_baseline_schema.sql lines 561-620, 856-910, 1474-1490, 3786-3905; app/api/guilds/leave/route.ts lines 60-90; the scratchpad pglite-313/scenarios-313.mjs lines 1-200</read_first>
  <action>
Step 0, baselines before any change (in WT): run npx vitest run and npx tsc --noEmit and save the outputs to the scratchpad as baseline-qzn-vitest.txt and baseline-qzn-tsc.txt. Record pass and fail counts; Task 3 compares against them. Expected at 77afa063 (the qg0 baseline on the same commit): 0 failed tests (132 files, 2478 tests) and no tsc output. Task 3's verify requires the full suite and tsc to exit 0, so if this baseline shows any failing test or tsc error, stop and return a checkpoint with the failing names instead of continuing.

Step 1, migration (per D-01, D-02, D-03, D-06, D-09, and OD-3): create supabase/migrations/20260930000100_enforce_guild_membership_write_rules.sql with the header comment (Problem, Fix, Why a trigger, Error contract, Rollback; neutral wording per D-10: state that the membership policies check only character ownership, that officer rights are read from role, is_active and guilds.created_by, and that the app writes memberships through the server except for leaving) and these statements in order: (1) CREATE OR REPLACE FUNCTION public.enforce_guild_membership_write_rules() RETURNS trigger, plpgsql, SECURITY DEFINER, SET search_path TO 'public', 'pg_temp', body per D-02 (guard first: return NEW when current_setting('role', true) is not anon or authenticated, or pg_trigger_depth() > 1; then INSERT fails; then the UPDATE whole-row comparison minus is_active and the is_active rule; RETURN NEW); (2) COMMENT ON FUNCTION; (3) REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated; (4) CREATE OR REPLACE TRIGGER enforce_guild_membership_write_rules BEFORE INSERT OR UPDATE ON public.character_guild_memberships FOR EACH ROW EXECUTE FUNCTION public.enforce_guild_membership_write_rules(); (5) COMMENT ON TRIGGER; (6) DROP POLICY IF EXISTS "Users can insert own character memberships" ON "public"."character_guild_memberships"; (7, only if OD-3 is included) DROP POLICY IF EXISTS "Users can delete own character memberships" ON the same table. Failures raise per D-06. COMMENT strings must not contain two consecutive hyphens (the shape test strips line comments). Leave a clearly marked place after these statements for the Task 2 functions. The Rollback section lists DROP TRIGGER, DROP FUNCTION and the verbatim CREATE POLICY statement(s) from baseline lines 3813-3815 (and 3791-3793 if OD-3 is included); Task 2 extends it. State that existing rows are not validated or changed and that the file is safe to re-run.

Step 2, PGlite tracer harness: mkdir the scratchpad dir pglite-qzn, symlink its node_modules to ../pglite-289/node_modules, and write scenarios-qzn.mjs modelled on pglite-313/scenarios-313.mjs with WT set to the wtms path and MIGRATION to the new file. Extract real statements from the baseline at run time with pick() (throwing when a pick count is off): is_guild_officer and is_guild_master with their REVOKE and GRANT statements, character_belongs_to_user, get_user_guild_ids, reject_submissions_on_cgm_loss, create_default_guild_roles, check_max_roles_per_guild; the CREATE TABLE statements for guilds, guild_roles, character_guild_memberships and loot_submissions; the pkey and unique constraints of the first three, the cgm and guild_roles FKs, the cgm indexes; the triggers create_guild_default_roles, enforce_max_roles and trg_reject_submissions_on_cgm_loss; every CREATE POLICY on guilds, guild_roles and character_guild_memberships; ENABLE ROW LEVEL SECURITY and GRANT ALL for those three tables; then the ALTER TABLE ADD COLUMN game statement from 20260926120000 (only that statement; its UPDATE needs expansions). Stand-ins (documented deviations in the file header, as in #313): auth schema with users and auth.uid() reading request.jwt.claim.sub; roles anon, authenticated and service_role BYPASSRLS; gen_random_uuid() for extensions.uuid_generate_v4(); characters reduced to (id, user_id, name) with RLS off and SELECT granted to all three roles; loot_submissions from its real CREATE TABLE with no FKs and RLS off (it is only read to observe the auto-reject); guilds.created_by FK to the auth.users stand-in. Seed through the service role: users GM (creator), OFF (officer), MEM (member), OUT (inactive former officer: role 'Officer', is_active false), each with a character in guild G1, plus a second guild G2 and a spare character for MEM; one pending and one approved loot_submissions row for MEM in G1. Label scenarios neutrally (D-10) and exit non-zero when any FAIL is recorded or any step throws (set process.exitCode = 1 in the FAIL path and let an uncaught error end the run with a non-zero code; never swallow a setup error).

Tracer scenarios: (a) control before the migration, inside BEGIN and ROLLBACK: MEM's session UPDATE of its own role to 'Officer' succeeds, then is_guild_officer(G1) is true and MEM's session UPDATE of G1's name affects 1 row (recorded as the pre-change behaviour); (b) apply the real migration file; (c) MEM's session leave shape (UPDATE is_active false WHERE id IN its active rows) passes and both of MEM's lists in G1 are then 'rejected' with the system note; (d) after rejoining MEM through the service role (reactivation shape of the invite route), MEM's session UPDATE of role to 'Officer' fails 42501, is_guild_officer(G1) as MEM is false, and MEM's session UPDATE of G1's name affects 0 rows; (e) MEM's session UPDATE of guild_id to G2 and of character_id to its spare character each fail 42501; (f) OUT's session UPDATE of is_active to true fails 42501 and is_guild_officer(G1) as OUT stays false; (g) MEM's session INSERT of its spare character into G2 with role 'Officer' fails 42501, and so does an INSERT ... ON CONFLICT (character_id, guild_id) DO UPDATE SET role = EXCLUDED.role on its existing G1 row; (h) OFF's session UPDATE of its own role to 'Guild Master' fails 42501 and is_guild_master(G1) as OFF stays false; (i) the service role's invite-join INSERT and a PUT /api/guild-members-style role UPDATE both pass. Save output as run-output-qzn-task1.txt in that dir.

Commit (D-10, D-11): stage only the migration; message for example "fix(guilds): membership rows are written by the server; a user session can only leave a guild" with the trailer.
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/pglite-qzn && node scenarios-qzn.mjs > run-output-qzn-task1.txt 2>&1 && ! grep -q '^FAIL' run-output-qzn-task1.txt && grep -q '^PASS' run-output-qzn-task1.txt</automated>
  </verify>
  <done>The migration file exists with the membership function, trigger, comments, REVOKE and the policy drop(s); the PGlite tracer run exits 0 with zero FAIL lines and shows the pre-migration control, the accepted leave with its auto-reject, and 42501 for each refused own-row write, insert and upsert, with is_guild_officer, is_guild_master and the guilds UPDATE staying officer-only; baseline-qzn-vitest.txt and baseline-qzn-tsc.txt exist; one local commit on fix/membership-write-rules.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Complete the database rules (guild roles below officer level, guild owner and tier), lock the migration shape, and prove the full legitimate-flow and blocked-case matrix in PGlite</name>
  <files>supabase/migrations/20260930000100_enforce_guild_membership_write_rules.sql, app/services/__tests__/guild-membership-write-rules-migration.test.ts</files>
  <read_first>app/services/__tests__/loot-history-guild-refs-migration.test.ts; the Task 1 migration; the scratchpad pglite-qzn/scenarios-qzn.mjs; app/(app)/guild-settings/components/RoleManager.tsx lines 90-230; lib/billing/sync.ts and app/api/webhooks/stripe/route.ts (only the client each uses)</read_first>
  <behavior>
    - Shape test: file exists; timestamp greater than 20260930000000 and unique in the directory; exact statement list and order (16 statements, or 17 with OD-3); exactly six dollar-quote tokens (three bodies); each function plpgsql, SECURITY DEFINER, search_path public, pg_temp; REVOKE ALL from PUBLIC, anon, authenticated for each.
    - Shape test: trigger events are exactly BEFORE INSERT OR UPDATE ON public.character_guild_memberships (no OF list, no DELETE), BEFORE INSERT OR UPDATE ON public.guild_roles (no OF list, no DELETE), and BEFORE INSERT OR UPDATE OF created_by, subscription_tier ON public.guilds (or BEFORE UPDATE OF created_by if OD-2 is declined); all FOR EACH ROW.
    - Shape test: each body is read-only after blanking string literals (no INSERT, UPDATE, DELETE, TRUNCATE, ALTER, GRANT, CREATE or DROP); each contains current_setting('role', true) with 'anon' and 'authenticated', pg_trigger_depth() > 1 exactly once, ERRCODE insufficient_privilege, and no check_violation, DETAIL or is_guild_officer; the membership body compares to_jsonb(NEW) and to_jsonb(OLD) minus 'is_active'; the guild_roles body compares them minus 'position' and uses 50; OLD appears only after a TG_OP test.
    - Shape test: outside the bodies there is no CREATE POLICY, no GRANT and no data change; the only DROP statements are DROP POLICY IF EXISTS "Users can insert own character memberships" (and "Users can delete own character memberships" if OD-3 is included).
  </behavior>
  <action>
Executor verifies first: confirm that lib/billing/sync.ts is reached only with the service-role client (Stripe webhook) and that no user-session code writes guilds.created_by, guilds.subscription_tier or guild_roles outside RoleManager (grep .from('guilds') and .from('guild_roles') chains for insert, update, upsert). If a user-session writer exists, stop and return a checkpoint naming it.

Write the shape test first (RED against the Task 1 file), then extend the migration until it passes (GREEN).

Migration additions (per D-04, D-05, D-06, OD-2): after the Task 1 statements add public.enforce_guild_role_write_rules() (same attributes and guard as D-02; INSERT and UPDATE rules of D-04), its COMMENT, REVOKE, CREATE OR REPLACE TRIGGER enforce_guild_role_write_rules BEFORE INSERT OR UPDATE ON public.guild_roles FOR EACH ROW, and COMMENT ON TRIGGER; then public.enforce_guild_owner_write_rules() (D-05 rules, with the subscription_tier parts only if OD-2 is included), its COMMENT, REVOKE, the trigger enforce_guild_owner_write_rules with the D-05 event list, and COMMENT ON TRIGGER. Extend the header (Fix, Why a trigger: a policy WITH CHECK cannot compare NEW with OLD, and the default roles are written by a nested trigger in the user's session) and the Rollback section (drop all three triggers and functions, recreate the dropped policies verbatim).

PGlite matrix: extend scenarios-qzn.mjs (keep the Task 1 scenarios). Legitimate flows that must pass after the migration: guild creation by the user's session (guilds INSERT with created_by self and no subscription_tier, which yields the three default roles through the nested trigger), then the service-role creator membership INSERT as Guild Master; invite join INSERT and reactivation UPDATE (service role, trial fields); Discord join INSERT and reactivation; POST /api/characters/[id]/guilds shapes (service role INSERT, and reactivation UPDATE of is_active and role per D-08); Battle.net import upsert (service role, INSERT ... ON CONFLICT (character_id, guild_id) DO UPDATE SET role, is_active, joined_via), both fresh and conflicting; PUT /api/guild-members role UPDATE including the Guild Master demotion shape; trial-status and auto-promote UPDATEs; kick (service role is_active false, lists auto-rejected); character removal (service role is_active false); PUT /api/guild-roles shapes (service role guild_roles name and permissions UPDATE, then membership role UPDATE filtered on the stored name); ownership transfer (service role created_by, then role UPDATEs); Stripe sync (service role subscription_tier UPDATE); leave by the user's session, including a re-send of is_active false on an already inactive own row; RoleManager shapes by OFF's session (INSERT a custom role at position -1 with is_default false, swap the positions of two roles below 50, DELETE a custom role); OFF's session UPDATE of G1's name and discord_server_id; account deletion (service role DELETE of memberships); service-role DELETE of a guild cascading to memberships and roles; a user session DELETE of its own character cascading to its memberships (lists auto-rejected); a delete_guild-style check: a SECURITY DEFINER function created in the harness that DELETEs a guild's memberships, called from GM's session, succeeds (stands in for delete_guild, whose full dependency list is not loaded); a service-role UPDATE of a legacy row (role naming no guild_roles row, is_active NULL). Own-row DELETE by MEM's session: blocked (0 rows) if OD-3 is included, otherwise a passing flow with the auto-reject.

Blocked cases, each for anon, MEM's session and OFF's session where it applies, with expected SQLSTATE: membership INSERT into G2 with role 'Officer' (42501); upsert onto an existing row (42501); own-row UPDATE of role, guild_id, character_id, is_active to true, membership_status, trial_started_at, promoted_at, joined_at and joined_via, one at a time (42501); a leave combined with a role change in one UPDATE (42501); anon UPDATE and UPDATE of another user's row (0 rows, RLS filters before the trigger); guild_roles by OFF's session: INSERT at position 50 and at 100, INSERT with is_default true, UPDATE of a role from 0 to 50, UPDATE of the Officer role's position, UPDATE of name, permissions, is_default or guild_id (all 42501); guild_roles INSERT by MEM's session (42501, same message as RLS); guilds by OFF's session: UPDATE created_by to itself (42501), and if OD-2 is included UPDATE subscription_tier to 'pro' (42501) and a user-session guild INSERT with subscription_tier 'pro' (42501). After the blocked cases, confirm is_guild_officer and is_guild_master as MEM and OUT are false, is_guild_master as OFF is false, and MEM's guilds UPDATE affects 0 rows.

Finish with idempotence (apply the migration a second time and rerun a sample) and rollback (run the Rollback statements from the header in a transaction, confirm the Task 1 control behaviour returns, then ROLLBACK). Record timings for 200 service-role membership UPDATEs and 200 leave-shape UPDATEs before and after the migration (informational). Save output as run-output-qzn.txt.

Parse check: create the scratchpad dir pglite-qzn/parse with node_modules symlinked to ../../pg-parse-289/node_modules and a parse-qzn.mjs that runs libpg-query parse on every statement of the migration file (after stripping comments as the shape test does); save its output as parse-output-qzn.txt. parse-qzn.mjs prints one "OK <n>" line per parsed statement and, for any statement that fails to parse, an "ERROR <n>: <message>" line, and exits 1 if any statement failed or the file yields no statements (process.exitCode = 1, and an uncaught error also exits non-zero).

Scope: if Task 2 runs long, the executor may split it into two commits: first the migration additions and the shape test, then, after the PGlite matrix and parse check have run, any migration fix they force (the harness itself stays in the scratchpad and is never committed). All three tasks must still be finished; the split only changes the commit count, which Task 3 then reports as it is.

Commit (D-10, D-11): stage the migration and the shape test; message for example "fix(guilds): keep guild roles at or above officer level and guild ownership server-managed" with the trailer.
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wtms && npx vitest run app/services/__tests__/guild-membership-write-rules-migration.test.ts && cd ../pglite-qzn && node scenarios-qzn.mjs > run-output-qzn.txt 2>&1 && ! grep -q '^FAIL' run-output-qzn.txt && grep -q '^PASS' run-output-qzn.txt && cd parse && node parse-qzn.mjs > ../parse-output-qzn.txt 2>&1 && ! grep -q 'ERROR' ../parse-output-qzn.txt && grep -q '^OK ' ../parse-output-qzn.txt</automated>
  </verify>
  <done>The shape test passes; every PGlite scenario above passes, including the pre-migration control, idempotent re-apply and rollback; every statement parses with libpg-query and parse-qzn.mjs exits 0 with no ERROR line; a second local commit exists (or two, if the scope split was used); the "executor verifies first" result and any deviation are recorded for the SUMMARY.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Server routes keep the position hierarchy (rename propagation from the stored role name, reactivation with the insert branch's role), then the full regression, lint and text gates</name>
  <files>app/api/guild-roles/route.ts, app/api/guild-roles/__tests__/route.test.ts, app/api/characters/[id]/guilds/route.ts, app/api/characters/[id]/guilds/__tests__/route.test.ts</files>
  <read_first>app/api/guild-roles/route.ts; app/api/characters/[id]/guilds/route.ts lines 84-230; app/api/guilds/__tests__/route.test.ts lines 1-120; app/(app)/guild-settings/components/RoleManager.tsx lines 130-160</read_first>
  <behavior>
    - guild-roles PUT: stored name 'Raider', body name 'Core', body old_name 'Member' returns 200, updates guild_roles, and records one membership UPDATE with role 'Core' filtered on role 'Raider' (never 'Member'), guild_id and is_active true.
    - guild-roles PUT: body name equal to the stored name with a different body old_name records no membership UPDATE; a stored row not found records no membership UPDATE and keeps today's 200; a lookup error returns 500 with body { success: false } and records no guild_roles or membership write; a caller without officer permissions still gets 403 'Not authorized' with no writes.
    - characters POST: an inactive membership of a non-creator is reactivated with is_active true and role equal to getDefaultRoleName (mocked 'Member'); a creator's is reactivated with role 'Guild Master'; no existing membership still inserts with the same role as before; an active membership still returns 409; a character the caller does not own still returns 404 with no service-role write.
  </behavior>
  <action>
Tests first (RED), then the route changes (GREEN).

app/api/guild-roles/route.ts (per D-07): stop reading old_name from the body. Before the guild_roles update, read the stored name with the service-role client (select name, eq id role_id, eq guild_id, maybeSingle). On a lookup error, log with a constant first argument (CodeQL) and return status 500 with body { success: false }. Keep the update as it is. Propagate only when the stored row exists and its name differs from name.trim(), filtering on the stored name plus the existing guild_id and is_active true filters; keep the propagation best-effort. Update the route's doc comment to say the rename follows the role's stored name. Grep for other callers of /api/guild-roles and confirm RoleManager is the only one.

app/api/characters/[id]/guilds/route.ts (per D-08): in the POST reactivation branch, update is_active true and role with the role value already computed above for the insert branch. Add a short neutral comment that reactivation assigns the same role a new membership gets, as the invite and Discord join routes do. No other change; OD-1 is not implemented here.

Tests: create app/api/guild-roles/__tests__/route.test.ts and app/api/characters/[id]/guilds/__tests__/route.test.ts with the node environment header, vi.mock of @/utils/supabase/server (createClient, getAuthenticatedUser) and @/utils/supabase/service-role, plus @/utils/server-roles (verifyOfficerPermissions) for guild-roles and @/domain/guild/default-role (getDefaultRoleName) for the characters route, and a recording fake client (table, operation, payload and eq filters per call) modelled on app/api/guilds/__tests__/route.test.ts.

Full verification (every step gates on its exit code, chained with &&, as in verify): npx eslint --max-warnings 0 on every file this plan changed (both route directories lint clean with zero warnings at 77afa063); npx vitest run for the whole suite, which must exit 0 (the Task 1 baseline has 0 failures, so any failure is new); npx tsc --noEmit, which must exit 0 (the baseline is clean); then the two text gates over the lines this branch adds and its commit messages: no em dash character, and the D-10 vocabulary gate (comments are in scope). The gates read added lines only (git diff origin/main...HEAD, lines starting with "+" other than "+++"), because some existing comments in these files already contain em dashes. The diff is guarded: git rev-parse --verify origin/main must succeed, git diff writes to final-qzn-diff.txt with its exit code checked, and both the added lines and the commit messages must be non-empty, so a failed diff or an empty branch cannot pass the text gates. Save the outputs to the scratchpad as final-qzn-eslint.txt, final-qzn-vitest.txt, final-qzn-tsc.txt and final-qzn-diff.txt, and record the final pass count against baseline-qzn-vitest.txt for the SUMMARY. Also confirm git status in WT shows no planning files and that nothing was pushed (the branch has no upstream or is ahead of it).

Commit (D-10, D-11): stage the four task files; message for example "fix(guilds): role renames follow the stored role name and rejoining a guild assigns the default role" with the trailer. Do not push. Do not open a PR.
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wtms && npx vitest run app/api/guild-roles "app/api/characters/[id]/guilds" app/services/__tests__/guild-membership-write-rules-migration.test.ts && npx eslint --max-warnings 0 app/api/guild-roles "app/api/characters/[id]/guilds" app/services/__tests__/guild-membership-write-rules-migration.test.ts > ../final-qzn-eslint.txt 2>&1 && npx vitest run > ../final-qzn-vitest.txt 2>&1 && npx tsc --noEmit > ../final-qzn-tsc.txt 2>&1 && git rev-parse --verify origin/main > /dev/null && git diff origin/main...HEAD -U0 > ../final-qzn-diff.txt && ADDED=$(grep '^+' ../final-qzn-diff.txt | grep -v '^+++') && [ -n "$ADDED" ] && MSGS=$(git log origin/main..HEAD --format=%B) && [ -n "$MSGS" ] && EMDASH=$(printf '\342\200\224') && ! printf '%s\n%s\n' "$ADDED" "$MSGS" | grep -qF "$EMDASH" && ! printf '%s\n%s\n' "$ADDED" "$MSGS" | grep -Eiq 'vuln|xploit|attac[k]|escalat[i]|self.?promo|advisor[y]'</automated>
  </verify>
  <done>PUT /api/guild-roles propagates renames from the stored name only, and POST /api/characters/[id]/guilds reactivates with the insert branch's role; their new tests pass; the full vitest run and tsc both exit 0 and eslint exits 0 with no warnings on the changed files; the guarded text gates pass on a non-empty diff; at least three local commits on fix/membership-write-rules (four if Task 2 used the scope split), nothing pushed, no PR, no planning files in WT.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser session to PostgREST (anon, authenticated) | Untrusted row values for character_guild_memberships, guild_roles and guilds |
| API route to database (service_role, BYPASSRLS) | Trusted code, but only as correct as each route's own checks |
| membership, role and owner columns to officer checks | is_guild_officer, is_guild_master, verifyPermission and the officer policies read cgm.role, cgm.is_active, guild_roles.position and guilds.created_by |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-qzn-01 | Elevation of privilege | own membership role, guild_id, character_id or is_active written by a user session | critical | mitigate | enforce_guild_membership_write_rules (D-02), INSERT policy dropped (D-03); Task 1 and Task 2 PGlite blocked cases with the before and after officer check |
| T-qzn-02 | Elevation of privilege | guild_roles positions at or above 50 created or changed by an officer's session | high | mitigate | enforce_guild_role_write_rules (D-04); PGlite role cases |
| T-qzn-03 | Elevation of privilege | guilds.created_by changed by an officer's session | high | mitigate | enforce_guild_owner_write_rules (D-05); PGlite owner case |
| T-qzn-04 | Tampering | guilds.subscription_tier chosen by a user session | medium | mitigate | D-05 subscription rules if OD-2 is included; otherwise a SUMMARY follow-up |
| T-qzn-05 | Elevation of privilege | PUT /api/guild-roles propagating a rename from a request-supplied old name | high | mitigate | D-07 stored-name propagation; route tests |
| T-qzn-06 | Elevation of privilege | POST /api/characters/[id]/guilds reactivation keeping a previous role | high | mitigate | D-08 role reset; route tests |
| T-qzn-07 | Elevation of privilege | characters and import routes accepting any guild_id | medium | transfer | OD-1: separate quick task, recorded in the SUMMARY without detail |
| T-qzn-08 | Denial of service | new rules break leaving, guild creation (nested default roles), joins, kicks, role changes, guild deletion or cascades | high | mitigate | caller and depth guard, no DELETE rule, and the Task 2 legitimate-flow matrix |
| T-qzn-09 | Information disclosure | trigger errors revealing rule details | low | mitigate | D-06: fixed RLS message, no DETAIL, rules read only NEW and OLD |
| T-qzn-10 | Information disclosure | public repository text describing the pre-change behaviour before deployment | medium | mitigate | D-10 wording and the vocabulary gate; no push or PR by the executor; plan committed only after deployment |
</threat_model>

<verification>
- PGlite: both harness runs exit 0, and run-output-qzn-task1.txt and run-output-qzn.txt in the scratchpad pglite-qzn dir have zero FAIL lines and include the pre-migration control, the before and after officer check, idempotent re-apply and rollback; parse-qzn.mjs exits 0 and parse-output-qzn.txt has an OK line per statement and no ERROR line.
- vitest: the new shape test and both new route tests pass; the full run exits 0 (baseline: 0 failures).
- npx tsc --noEmit exits 0; eslint --max-warnings 0 on changed files exits 0.
- Text gates: on a guarded, non-empty diff, no em dash and no D-10 vocabulary in added lines or commit messages.
- Git: at least three local commits on fix/membership-write-rules in WT (four if Task 2 was split), trailer present, nothing pushed, no PR, no planning docs in WT.
</verification>

<success_criteria>
- A user session can leave a guild and nothing else on memberships; guild roles it writes stay below officer level; guild ownership (and the subscription tier, per OD-2) is server-managed; the service role, the nested default-role insert and every flow in the Task 2 matrix still work.
- Role renames and reactivations through the service-role routes can no longer change anyone's position beyond what the roster hierarchy allows.
- OD-1 to OD-3 resolutions are reflected exactly; OD-1 is recorded as a follow-up if not included, never implemented in part.
</success_criteria>

<output>
Create /Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/260929-qzn-enforce-guild-membership-write-rules/260929-qzn-SUMMARY.md when done (in the main checkout, not in WT). Include: every commit hash, the final rule list, the PGlite pass counts and timings, the baseline versus final vitest and tsc counts, the "executor verifies first" result, any deviation (including a Task 2 split), the legacy custom-role note from D-04, and the OD-1 follow-up (and OD-2 or OD-3 if declined) in neutral wording (D-10).

Also include a "Joined-branch proof note" for the orchestrator's combined run with 260929-qg0. OD-3 drops "Users can delete own character memberships", so on the joined branch a raider's own-session DELETE of a membership row removes 0 rows and leaves that raider's loot lists unchanged; qg0's matrix scenario that expects that DELETE to auto-reject lists must instead expect 0 rows deleted and unchanged lists. Leaving through the user-session UPDATE of is_active to false still auto-rejects the raider's pending and approved lists, and the service-role DELETE paths (account deletion, character deletion cascade) still fire the auto-reject, so those qg0 expectations are unchanged.
</output>
