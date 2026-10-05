---
phase: quick-261003-kfj
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/20261003200000_equipped_item_rules_require_active_membership.sql
  - app/services/__tests__/equipped-item-rules-migration.test.ts
  - app/services/__tests__/active-guild-membership-policies-migration.test.ts
autonomous: true
requirements:
  - KFJ-R1
  - KFJ-R2
  - KFJ-R3
  - DELIVERY-R1

estimate:
  # estimate-calibration: factor 1, applied false, 0 samples, confidence low,
  # so tokens equals raw_tokens.
  tokens: 115000
  raw_tokens: 115000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "D-02 (KFJ-R1): after the migration, an active officer's session reads, updates, inserts and deletes equipped items only of characters that have an active membership in a guild where that session is an officer, or of its own characters: O_A no longer reaches CG's rows in guild A (PGlite KFJ-READ-1, KFJ-WRITE-1 to KFJ-WRITE-4), still reaches them once CG is an active member of a guild where the caller is an officer (KFJ-WRITE-10 for RB in guild B), and keeps every write on current members CA1 and CA2 (KFJ-WRITE-5)."
    - "D-02, D-05 (KFJ-R1): the owner policy is untouched, so GONE still reads and writes CG's equipped items (KFJ-READ-4, KFJ-WRITE-6); non-officers, the guild creator without a character and anon get exactly what they got before (KFJ-READ-5 to KFJ-READ-8, KFJ-WRITE-7); every app reader and writer is a service-role route that already requires an active membership, so no app, bot, companion or script change is needed."
    - "D-03 (KFJ-R2, only when OD-1 is A): with CG holding a loot list in guild A, active members R1 and R2 and officer O_A no longer read CG's equipped items (KFJ-READ-10); when OD-1 is B the member read policy is unchanged and KFJ-READ-10 is an informational line."
    - "D-01: the migration holds SET LOCAL lock_timeout '5s', then DROP POLICY IF EXISTS plus CREATE POLICY for the officer policy and, when OD-1 is A, for the member read policy, each CREATE equal to its baseline text with the cgm.is_active = true conjunct added as D-01 gives; nothing else; it re-applies cleanly (KFJ-CAT-3); its header Rollback restores the previous policies exactly, giving the red run's reads byte for byte (KFJ-RB-2, KFJ-RB-3), and the migration applies again after it (KFJ-RB-4); the shape test pins the statement list, the baseline-derived texts and the Rollback block."
    - "D-04: the j61 shape test's ordering check is anchored to 20261003120000 (the newest migration that existed when it was written), so it passes with the new later migration; it is the only change to that file."
    - "D-06 (KFJ-R3): the policy inventory, the reader and writer table, the other character-scoped tables checked and the neutral follow-ups are recorded in the SUMMARY."
    - "D-07 (DELIVERY-R1): the red PGlite run (before the migration file exists) shows FAIL for exactly the new-rule checks and PASS for every control; the final run has zero FAIL lines; the full vitest run has no new FAIL line against SP/baseline-kfj-vitest.txt; npx tsc --noEmit exits 0; eslint --max-warnings 0 exits 0 on both test files; no em dash in added lines, commit messages or SP/pr-body-kfj.md; exactly two local commits after af3af380 (the j61 test anchor alone, then the migration with its shape test), each with the trailer; nothing pushed; no planning files in WT."
  artifacts:
    - path: "supabase/migrations/20261003200000_equipped_item_rules_require_active_membership.sql"
      provides: "Recreates the character_equipped_items officer policy and (OD-1 A) the member read policy with an active-membership condition on the item's character's membership row; neutral header with Problem, Fix, Readers and writers checked, Production safety, Deploy, Not changed, Rollback"
      contains: "Officers can manage guild characters' equipped items"
    - path: "app/services/__tests__/equipped-item-rules-migration.test.ts"
      provides: "Shape test: anchored timestamp, exact statement list, CREATE texts derived from the baseline, owner policy never dropped, Rollback block equal to the baseline texts, no forbidden statement"
      contains: "20261003200000"
    - path: "app/services/__tests__/active-guild-membership-policies-migration.test.ts"
      provides: "j61 shape test with its ordering check anchored to 20261003120000 instead of a live directory scan"
      contains: "20261003120000"
    - path: "/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/pglite-kfj/scenarios-kfj.mjs"
      provides: "Scratchpad-only PGlite proof (never committed): READ, CAT-0, RB, CAT and WRITE sections; red and green outputs and views-baseline.json beside it"
    - path: "/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/pr-body-kfj.md"
      provides: "Neutral PR body draft for the migration-only PR"
  key_links:
    - from: "Every app reader and writer of character_equipped_items (app/api/character-gear/route.ts GET 92-96, POST 244-247 and 264-267, DELETE 329-332; app/api/battlenet/characters/sync-gear/route.ts 150-153 and 176-178; app/api/battlenet/characters/import/route.ts 412-414; app/api/characters/[id]/link-battlenet/route.ts 292-295 and 315-317)"
      to: "the service-role client (createServiceRoleClient), which bypasses the policies this migration changes"
      via: "each route checks ownership or an active membership itself before the query"
      pattern: "createServiceRoleClient"
    - from: "Officer policy subquery on character_guild_memberships cgm (row of the item's character)"
      to: "is_guild_officer(cgm.guild_id) on the same row, now also cgm.is_active = true"
      via: "one EXISTS over a single cgm row, so the active row and the officer's guild must be the same membership"
      pattern: "is_guild_officer"
    - from: "Header Rollback block (lines prefixed with two hyphens and three spaces after the '-- Rollback' heading)"
      to: "baseline CREATE POLICY texts (supabase/migrations/20260101000000_baseline_schema.sql 3691-3695 and, for OD-1 A, 3886-3891)"
      via: "shape test whitespace-equal comparison and PGlite KFJ-RB-2 to KFJ-RB-4"
      pattern: "-- Rollback"
---

<objective>
Make the character_equipped_items officer rule require the item's character to have an active membership in the officer's guild, in one migration-only PR, while every legitimate read and write keeps working.

Verified in code and in PGlite before planning (40 of 40 migrations applied at af3af380): the policy "Officers can manage guild characters' equipped items" (FOR ALL, baseline 3691-3695, not changed by any later migration) passes when some character_guild_memberships row of the item's character has is_guild_officer(cgm.guild_id) true for the caller. It does not look at cgm.is_active. Inside a policy the cgm subquery runs under the caller's RLS, and "Guild members can view guild memberships" (20261002120000) shows every membership row of the caller's active guilds, active or not, so an active officer of guild A reaches the equipped items of a character whose only guild A membership is inactive. The planner probe confirmed it: O_A reads CG's rows and updates, inserts and deletes them (also moves another row onto CG); with the conjunct added all of these are refused, and O_A keeps every write on CA1 and CA2. The member read policy "Users can view equipped items for guild characters" (FOR SELECT, baseline 3886-3891) has the same shape: it requires the caller's membership (my_cgm) to be active but not the item's character's (cgm). Its join also reads characters under the caller's RLS, so it reaches a departed character only while that characters row stays readable, which today is when the character has a loot list in the caller's guild (character_has_submission_to_user_guilds); the probe confirmed R1 and R2 then read CG's rows, and with the conjunct they do not (OD-1).

Purpose: officers and guildmates reach the equipped items of current members only, matching the app's gear routes, which already require an active membership for both sides. A character's owner keeps full access to its own equipped items, whatever its memberships.

Output: one migration and its shape test in one local commit (migration-only PR), preceded by one test-only commit that anchors the j61 shape test's ordering check (otherwise any later migration fails it), a scratchpad-only PGlite proof run red (before the file exists) and green (after), the full regression run, a neutral PR body draft and the SUMMARY.

Work location: WT = /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/wteq (branch fix/equipped-item-rules-active-members from origin/main af3af380, node_modules symlinked, clean, no upstream). Every repo path below is relative to WT. SP = /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad. PGlite: SP/pglite-all (read its README.md; never edit anything in SP/pglite-all; its "Behaviour notes" predate 20261003180000), scenario module SP/pglite-kfj/scenarios-kfj.mjs, run from SP with node pglite-all/run.mjs --wt WT pglite-kfj/scenarios-kfj.mjs. FAIL-line comparison: SP/new-fails.sh, run from WT. The planner probes in SP/pglite-kfj (probe-planner-inventory.mjs, probe-planner-tables.mjs, probe-planner-rules.mjs and their run-output-probe-*.txt) stay in place and are not run by the executor; probe-planner-rules.mjs is a useful fixture model. Do not touch the main checkout's source files or any other worktree. Never run git worktree prune. No SQL against a real database. Do not read .env files.

Requirements (quick task):
- KFJ-R1: the equipped items officer rule requires the item's character to have an active membership in the officer's guild; the owner, active officers for current members, and every app path (gear import, Battle.net import, gear sync, link, gear read) keep working (D-02, D-05).
- KFJ-R2: same-gap policies that are small are fixed in the same migration: per OD-1 the member read policy on the same table (D-03); other character-scoped tables were checked and none carries this target-membership pattern (D-06).
- KFJ-R3: the RLS inventory, the reader and writer check and the follow-ups are recorded (D-06).
- DELIVERY-R1: red and green PGlite proof, shape test, j61 test anchor, full regression, neutral wording, local commits only, PR body draft (D-04, D-07).

## Decisions (locked unless an OD below changes them)

- D-01 (migration): one file, supabase/migrations/20261003200000_equipped_item_rules_require_active_membership.sql (later than 20261003180000, the newest file on origin/main; no local or remote branch carries a later or unmerged migration, checked at af3af380). Statements, in this order (5 when OD-1 is A, 3 when OD-1 is B):
  (1) SET LOCAL lock_timeout = '5s';
  (2) DROP POLICY IF EXISTS "Officers can manage guild characters' equipped items" ON "public"."character_equipped_items";
  (3) CREATE POLICY "Officers can manage guild characters' equipped items" ON "public"."character_equipped_items" with the baseline statement's text (baseline 3691-3695) copied exactly, changed only by replacing both occurrences of ("cgm"."character_id" = "character_equipped_items"."character_id") AND "public"."is_guild_officer"("cgm"."guild_id") with ("cgm"."character_id" = "character_equipped_items"."character_id") AND ("cgm"."is_active" = true) AND "public"."is_guild_officer"("cgm"."guild_id") (one in USING, one in WITH CHECK). Same name, no FOR clause (so FOR ALL, as the baseline), no TO clause, not RESTRICTIVE.
  Only when OD-1 is A: (4) DROP POLICY IF EXISTS "Users can view equipped items for guild characters" ON "public"."character_equipped_items"; (5) CREATE POLICY "Users can view equipped items for guild characters" ON "public"."character_equipped_items" with the baseline text (3886-3891) copied exactly, changed only by replacing ("my_c"."user_id" = "auth"."uid"()) AND ("my_cgm"."is_active" = true) with ("my_c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true) AND ("my_cgm"."is_active" = true). Same name, FOR SELECT, no TO clause, not RESTRICTIVE.
  The policy name contains an apostrophe inside its double-quoted identifier; keep it exactly as the baseline writes it.
  Header comment, neutral (D-07), first line "-- Equipped item rules require an active guild membership.", then sections in this order, each a heading line followed by a line of hyphens: Problem (the officer policy, and with OD-1 A the member read policy, match a membership row of the item's character in the guild without requiring it to be active, unlike the characters read policy "Guild members can view guild characters" and the app's gear routes, which require the character's membership to be active); Fix (D-02, D-03 in short, plus: the owner policy is unchanged, so a character's owner keeps managing its own equipped items); Readers and writers checked (D-05 in short); Production safety (D-05); Deploy (D-05); Not changed (D-05); Rollback. The Rollback heading line is exactly "-- Rollback" followed by "-- --------". Under it: prose lines start with "-- " (two hyphens, one space); SQL lines start with "--   " (two hyphens, three spaces) and nothing else does; the block runs unbroken (every line starts with two hyphens) until the blank line before statement (1). The SQL is, for each policy the file changes, in the statement order above: DROP POLICY IF EXISTS "<name>" ON "public"."character_equipped_items"; then the baseline CREATE POLICY statement copied verbatim, keeping its line breaks and indentation after the "--   " prefix (2 statements when OD-1 is B, 4 when A). Prose under Rollback: a forward migration with these statements restores the previous policies exactly; no data changes either way. No semicolon, em dash or two consecutive hyphens anywhere except the comment markers themselves and the SQL statement ends.
- D-02 (officer rule: recreate with the conjunct, not drop): dropping the policy would also remove the RLS path an active officer has to a current member's equipped items, which the task keeps; adding the conjunct to the same cgm row means the one membership row must be both active and in a guild where the caller is an officer, so an active membership in another guild does not count (KFJ-WRITE-9) and an active membership in a guild where the caller is an officer does (KFJ-WRITE-10). is_guild_officer itself already requires the caller's own membership to be active (or the caller to be the guild creator) and is not changed. The guild creator without a character reaches no equipped items through this policy before or after (the cgm rows of that guild are not visible to that session); not changed here.
- D-03 (member read rule, per OD-1): if OD-1 is A, recreate "Users can view equipped items for guild characters" with the conjunct D-01 gives, so a guildmate reads the equipped items of a character only while that character's membership in the shared guild is active, the same rule GET /api/character-gear applies (route lines 51-89). If OD-1 is B, the file has only statements (1) to (3), the shape test asserts exactly that, KFJ-READ-10 is informational, and the SUMMARY lists the member read policy as follow-up FU-0.
- D-04 (j61 shape test anchor): app/services/__tests__/active-guild-membership-policies-migration.test.ts case "the file exists, sorts after every other migration, and has a unique timestamp" (lines 129-145) compares its timestamp with every other file in the directory, so any later migration fails it (the same defect #309 fixed elsewhere). Rewrite only that case in the anchored form of app/services/__tests__/guild-membership-write-rules-migration.test.ts lines 129-141: a comment saying it is anchored to the newest migration that existed when it was written (20261003120000, quick task 261003-fcg), not to a live directory scan, which would fail as soon as any later migration lands (#309); the case name "the file exists, sorts after every migration that preceded it, and has a unique timestamp"; expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20261003120000); the same-timestamp check kept. No other line of that file changes. It is its own test-only commit, before the migration commit, so every commit on the branch passes the suite.
- D-05 (readers, writers, safety, deploy, types): no app, bot, companion or script change. Every app reader and writer of the table is a service-role route (context table below) that already checks ownership or an active membership; no SECURITY DEFINER function, view, trigger or publication touches the table; deleting a character still removes its rows through the ON DELETE CASCADE foreign key (baseline 3125-3126), which RLS does not apply to. lib/database.types.ts has no policy names, so it does not change. Production safety: DROP POLICY and CREATE POLICY take an ACCESS EXCLUSIVE lock on character_equipped_items for the rest of the transaction; SET LOCAL lock_timeout gives up after 5 seconds instead of queueing behind a long query, and a timeout rolls the whole file back so the next deploy runs it again (scripts/deploy-migrations.sh sends each file as one Management API query, one implicit transaction). Every statement is idempotent (DROP POLICY IF EXISTS, then CREATE POLICY in the same transaction), no data changes, and no existing row can make it fail. Deploy: one migration-only PR (merged with --admin; it deploys about 12 seconds after merge); no app PR is needed first. Not changed: "Users can manage their own characters' equipped items", every other policy, trigger, function and grant, and lib/database.types.ts.
- D-06 (proof and record): SP/pglite-kfj/scenarios-kfj.mjs (scratchpad only, never committed), run red before the migration file exists and green after (Task 1); the shape test; the full vitest run against a clean baseline; tsc; eslint. The SUMMARY records the policy inventory, the reader and writer table and the other-table check from the context section, the probe facts, and the follow-ups in neutral wording.
- D-07 (wording and delivery): commit messages, SQL comments, test names, PGlite labels and the PR body describe the rule neutrally and specifically (for example "equipped item rules require an active guild membership"); nothing about how the previous rules could be used and no wording about who could read or change what before. No em dash anywhere added. Two commits in this order: (a) the j61 test anchor alone, subject "test(db): anchor the active guild membership migration ordering check"; (b) exactly the migration and its shape test (the migration commit of a migration-only PR). Each ends with the trailer line "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" exactly, whatever model executes. Do not push, do not open a PR, do not file a GitHub issue, no planning files in WT. The PR body draft goes to SP/pr-body-kfj.md. If context runs long after Task 1, stop there and return a checkpoint naming Task 2; a fresh executor reads this plan and git log af3af380..HEAD in WT, and never re-runs Step 0 when SP/baseline-kfj-vitest.txt already has its EXIT= line.

## Open decisions (the orchestrator records the user's answer in Resolution before execution)

| ID | Question | Recommendation | Resolution |
|----|----------|----------------|------------|
| OD-1 | The guildmate read policy on equipped items ("Users can view equipped items for guild characters") has the same shape as the officer rule: it requires the reader's membership to be active but not the membership of the character whose items are read. In practice it reaches a character that left only while that character still has a loot list in the guild. Fix it in this same migration? | Option A, as D-03: yes, add the same active-membership condition (2 more statements, no app change: the app reads equipped items only through GET /api/character-gear, which already requires both memberships to be active; a planner PGlite probe confirmed current members' items stay readable). The migration and PR then cover both equipped item rules. Option B: change only the officer rule now and leave the read rule to a separate follow-up quick task. | Option A (the guildmate read policy gets the same active-membership condition in this migration), user, 2026-10-03 |

## COPY

No user-facing text is added or changed: no route, page or toast changes. A database refusal that only direct API calls can reach keeps the standard RLS error text. The commit messages and the PR body are public but are not product copy; they follow D-07. Nothing needs copy sign-off.
</objective>

<execution_context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/CLAUDE.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/STATE.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/261003-j61-loot-list-read-rules-require-an-active-g/261003-j61-SUMMARY.md

Source files (WT-relative):
- supabase/migrations/20260101000000_baseline_schema.sql: character_equipped_items table 1455-1465; foreign key ON DELETE CASCADE 3125-3126; "Officers can manage guild characters' equipped items" 3691-3695; "Users can manage their own characters' equipped items" 3840-3844; "Users can view equipped items for guild characters" 3886-3891; ENABLE ROW LEVEL SECURITY 3998; grants 4643-4645
- supabase/migrations/20261003180000_policies_require_active_guild_membership.sql (the pattern to follow: header layout, lock_timeout, DROP POLICY IF EXISTS plus baseline-derived CREATE POLICY, Rollback with "--   " SQL lines)
- app/services/__tests__/active-guild-membership-policies-migration.test.ts (shape test model: stripComments, splitStatements, blankStrings, q, baselinePolicy, rollbackStatements; also the file D-04 edits, lines 129-145)
- app/services/__tests__/guild-membership-write-rules-migration.test.ts 129-141 (anchored ordering case to copy for D-04)
- scripts/deploy-migrations.sh 20-40 (one Management API query per file)
- SP/pglite-all/README.md (harness API: asUser, asAnon, asService, q, qReplica, exec, rowOf, count, mkList, expectOk, expectErr, expectEq, record, resolveUser; one statement per asUser call; seed keys); SP/pglite-j61/scenarios-j61.mjs (scenario structure, Rollback extraction, CAT-0 skip); SP/pglite-kfj/probe-planner-rules.mjs (equipped item fixtures, write shapes, cross-guild setup); SP/new-fails.sh

## Investigation findings (verified in WT at af3af380; planner probes in SP/pglite-kfj, 40 of 40 migrations applied)

1. Policies on character_equipped_items after every migration (no migration after the baseline mentions the table):

| Policy | Command | Rule | This task |
|--------|---------|------|-----------|
| Officers can manage guild characters' equipped items | ALL (USING and WITH CHECK) | a cgm row of the item's character, active or not, whose guild_id satisfies is_guild_officer for the caller (cgm rows visible to the caller: its active guilds' rows, active or not, and its own characters' rows) | recreate with ("cgm"."is_active" = true) in both clauses (D-02) |
| Users can manage their own characters' equipped items | ALL | the caller owns the item's character | kept |
| Users can view equipped items for guild characters | SELECT | the caller has an active membership (my_cgm) in a guild where the item's character has a cgm row, active or not; the characters join is read under the caller's RLS | OD-1 A: recreate with ("cgm"."is_active" = true) (D-03) |

Grants: anon, authenticated and service_role have every table privilege (baseline 4643-4645); RLS enabled, not forced; no trigger on the table.

2. Other character-scoped tables (every public table with a character_id column, plus characters; no per-character profession or spec table exists: spec_id is a column of characters, class_specs and loot_item_classes are catalog tables):

| Table | Rule shape | Verdict |
|-------|-----------|---------|
| characters | "Guild members can view guild characters" requires the target's cgm.is_active = true; "Guild members can view submitting characters" follows a loot list of the character in one of the caller's active guilds (character_has_submission_to_user_guilds), not the character's membership | not this gap; follow-up FU-2 |
| character_guild_memberships | "Guild members can view guild memberships" shows every row, active or not, of the caller's active guilds (roster); writes are server-side (20260930000100) | intended, not a gap |
| loot_history, character_aliases | reads need the caller's active membership; officer writes need is_guild_officer(row guild); triggers 20260929180000 and 20261002120000 require the referenced character's membership | covered |
| raid_team_members, blp_credits, blp_tracking, donation_records, attendance_records (via raid_events), reserve_awards, reserve_submissions | reads need the caller's active membership; officer writes need is_guild_officer(row guild); the referenced character's membership is not part of any rule | a different rule (reference check on officer writes), not this gap; follow-up FU-1 |
| loot_submissions | fixed in 20261003180000 | done |
| user_active_characters | the caller's own row | not applicable |

3. Probe facts (synthetic seed; CG owned by GONE, inactive in guild A; equipped item rows Head, Hands, Waist for CO, CA1, CA2, CG, CB, plus Legs for CA1):
- Today: O_A reads CO, CA1, CA2 and CG rows; R1 and R2 read CO, CA1, CA2, and also CG once CG has a loot list in guild A; GONE reads CG; RB reads CB; GM_A, GM_B and anon read nothing. O_A updates (3 rows), inserts and deletes CG rows and moves a CA1 row onto CG.
- With the D-01 statements (OD-1 A) applied in memory: O_A, R1 and R2 read CO, CA1, CA2 only (with and without CG's list); GONE, RB, GM_A, GM_B and anon unchanged; O_A's update, delete on CG affect 0 rows, insert and the move fail 42501; O_A still updates CA1 (4 rows), inserts and deletes on CA2; GONE still updates, inserts and deletes its own CG rows; R1 updating CA2 affects 0 rows and RB inserting for CA1 fails 42501 in both states; GM_A updating CA1 affects 0 rows in both states. With CG also an active member of guild B and CB's role set to Officer: RB updates CG rows (3) in both states, O_A affects 0 after. Re-applying the statements succeeds.

4. Readers and writers of character_equipped_items (git grep over every tracked file; all use createServiceRoleClient, which bypasses RLS):

| Path | Client | Operation | Access check before the query |
|------|--------|-----------|-------------------------------|
| app/api/character-gear/route.ts GET (read 92-96) | service role (38) | SELECT | owner, or the caller has an active membership in a guild where the character's membership is active (51-89) |
| app/api/character-gear/route.ts POST (delete 244-247, insert 264-267) | service role (177) | DELETE, INSERT | owner, or the caller has an active Officer or Guild Master role in a guild where the character's membership is active (190-229) |
| app/api/character-gear/route.ts DELETE (delete 329-332) | service role (311) | DELETE | owner only (324) |
| app/api/battlenet/characters/sync-gear/route.ts (delete 150-153, insert 176-178) | service role (84) | DELETE, INSERT | owner (87-92) |
| app/api/battlenet/characters/import/route.ts (insert 412-414) | service role (146) | INSERT | the caller's own imported character (312-313) |
| app/api/characters/[id]/link-battlenet/route.ts (delete 292-295, insert 315-317) | service role (130) | DELETE, INSERT | owner (133-138) |
| app/hooks/use-api.ts 482-497 (useCharacterGear) and app/contexts/LootListContext.tsx 384-386 | browser | reads through GET /api/character-gear | as above |
| characters delete (foreign key ON DELETE CASCADE, baseline 3125-3126) | referential action | DELETE | RLS does not apply |
| lib/database.types.ts 379, lib/db.ts 21, domain/loot/slot-normalization.ts 128, lib/battlenet.ts 257 | types, a pure function, a comment | none | not applicable |

No SECURITY DEFINER function, view, publication, Discord bot, companion, addon or script reads or writes the table.

5. Tests: no existing test names a character_equipped_items policy. The j61 shape test's ordering case scans the whole migrations directory and fails with any later migration (D-04); every other migration shape test is already anchored or checks uniqueness only; the function grants ratchet ignores migrations without functions.

## Production catalog check (read-only; schema metadata and an aggregate count only; the user runs it in the Supabase SQL editor, never the executor)

```sql
-- 1. Before merging and after the deploy: how many is_active terms each policy has
--    Before: officer 0, owner 0, member read 1 (the reader's own membership).
--    After: officer 2 (USING and WITH CHECK), owner 0, member read 2 with OD-1 A (1 with B).
select policyname, cmd,
       (length(coalesce(qual, '') || coalesce(with_check, ''))
        - length(replace(coalesce(qual, '') || coalesce(with_check, ''), 'is_active', ''))) / length('is_active') as is_active_terms
  from pg_policies
 where schemaname = 'public' and tablename = 'character_equipped_items'
 order by 1;

-- 2. Before merging: the current expressions, to compare with the header Rollback
select policyname, cmd, qual, with_check
  from pg_policies
 where schemaname = 'public' and tablename = 'character_equipped_items'
 order by 1;

-- 3. Optional, before merging: characters with equipped items and no active membership (count only)
select count(distinct cei.character_id) as characters_without_active_membership
  from public.character_equipped_items cei
 where not exists (select 1 from public.character_guild_memberships cgm
                    where cgm.character_id = cei.character_id and cgm.is_active);
```
</context>

<tasks>

<task type="tracer">
  <name>Task 1: Tracer, an officer's session reaches only current members' equipped items, end to end in the database (PGlite red, j61 test anchor, shape test, migration, PGlite green)</name>
  <files>app/services/__tests__/active-guild-membership-policies-migration.test.ts, app/services/__tests__/equipped-item-rules-migration.test.ts, supabase/migrations/20261003200000_equipped_item_rules_require_active_membership.sql</files>
  <precondition>OD-1 has a Resolution in this plan; WT is on fix/equipped-item-rules-active-members at af3af380 with an empty git status --porcelain; SP/pglite-all/run.mjs and SP/new-fails.sh exist.</precondition>
  <reversibility rating="reversible">No data changes; the header Rollback recreates the previous policies exactly (proven in PGlite KFJ-RB-2 to KFJ-RB-4).</reversibility>
  <read_first>SP/pglite-all/README.md; SP/pglite-j61/scenarios-j61.mjs; SP/pglite-kfj/probe-planner-rules.mjs; supabase/migrations/20261003180000_policies_require_active_guild_membership.sql; app/services/__tests__/active-guild-membership-policies-migration.test.ts; app/services/__tests__/guild-membership-write-rules-migration.test.ts lines 125-142; supabase/migrations/20260101000000_baseline_schema.sql lines 3689-3696, 3838-3845, 3884-3892</read_first>
  <behavior>
    - Red run (no migration file): FAIL KFJ-READ-1, KFJ-READ-9, KFJ-CAT-0, KFJ-WRITE-1, KFJ-WRITE-2, KFJ-WRITE-3, KFJ-WRITE-4, KFJ-WRITE-9 and, when OD-1 is A, KFJ-READ-10; PASS for KFJ-READ-2 to KFJ-READ-8, KFJ-READ-11, KFJ-WRITE-5 to KFJ-WRITE-8 and KFJ-WRITE-10; SP/pglite-kfj/views-baseline.json written.
    - Green run: every label passes, zero FAIL lines.
    - j61 shape test: passes before and after the new migration file exists.
    - New shape test: fails before the file exists; passes after, with the exact statement list for the OD-1 resolution, CREATE texts derived from the baseline, the owner policy never dropped, and a Rollback block equal to the baseline texts.
  </behavior>
  <action>
Step 0, baselines (skip if SP/baseline-kfj-vitest.txt already has an EXIT= line): in WT confirm git status --porcelain is empty and git rev-parse HEAD starts with af3af380. Run the full suite in the foreground with a 600000 ms timeout, writing to SP/baseline-kfj-vitest.txt a first line HEAD=(git rev-parse HEAD), then the npx vitest run output, then a last line EXIT=(the vitest exit code). Save npx tsc --noEmit output plus an EXIT= line to SP/baseline-kfj-tsc.txt; if tsc is not clean, stop and return a checkpoint naming the errors.

Step 1, PGlite scenario (per D-06), written before the migration: create SP/pglite-kfj/scenarios-kfj.mjs exporting async function runJoint(h). Header comment: scratchpad only, never committed, quick task 261003-kfj, uses the synthetic seed of SP/pglite-all, seed values synthetic. Imports only node:fs, node:path and node:url. Constants: OD1 set to the letter in the OD-1 Resolution; MIG = join(h.wt, 'supabase/migrations/20261003200000_equipped_item_rules_require_active_membership.sql'); BASE_VIEWS = join(the scenario's own directory from import.meta.url, 'views-baseline.json'); OFFICER, OWNER and MEMBER the three policy names of finding 1 (always pass policy names as query parameters, since OFFICER and OWNER contain an apostrophe). Every label is unique, starts with KFJ- and is followed by a short neutral description, so "PASS KFJ-READ-1 " never matches KFJ-READ-10. Sections in this order:

Fixtures (h.q as superuser; the table has no trigger): for each of CO, CA1, CA2, CG and CB insert rows with slots Head, Hands and Waist (wowhead_id 900001, item_name 'Synthetic'), and a Legs row for CA1. A views(h) helper returns, for each of O_A, R1, R2, GONE, RB, GM_A, GM_B (asUser) and ANON (asAnon), the sorted array of strings KEY:slot for every character_equipped_items row the session reads (KEY is the seed key of the row's character from h.ids.characters); an error result is the string ERR plus its code. A rows(key) helper returns the service-role count of that character's rows.

READ (per D-02; both runs). RULE_SQL, run with h.asService and $1 the user's id from h.resolveUser, returns the same KEY:slot strings for the rows whose character is owned by $1, or whose character has a membership with is_active true in a guild where a character owned by $1 has a membership with is_active true. KFJ-READ-1 to KFJ-READ-7, in the user order above: expectEq of the session's view with the rule result. KFJ-READ-8: ANON's view equals []. KFJ-READ-9 (anchor, one expectEq of an object): O_A, R1 and R2 each read the 10 CO, CA1 and CA2 rows, GONE reads the 3 CG rows, RB the 3 CB rows, GM_A, GM_B and ANON read []. Then create a loot list for CG with h.mkList('CG', 'draft') (guild A). KFJ-READ-10, only when OD1 is A (otherwise print one line starting '# KFJ-READ-10-INFO' with the three views): O_A, R1 and R2 each read exactly their KFJ-READ-9 value. KFJ-READ-11: GONE, RB, GM_A, GM_B and ANON read exactly their KFJ-READ-9 values. Then VA = views(h). When the migration file does not exist (the red run), write VA as JSON to BASE_VIEWS, replacing any earlier file.

CAT-0 (per D-06): KFJ-CAT-0 records whether the migration file exists. When it does not, print one line starting with '# KFJ-SKIP' and skip the RB and CAT sections, going on to WRITE.

RB (per D-01; green run only). Extract the Rollback SQL from the migration file text: the lines after the line that is exactly '-- Rollback', up to the first line that does not start with two hyphens; keep the lines that start with two hyphens and three spaces, drop those first five characters, and join them with newlines. HAS_MEMBER is true when the file's SQL lines (those not starting with two hyphens) contain MEMBER. KFJ-RB-1: the extracted text holds 4 statements when HAS_MEMBER, 2 when not (count the non-blank pieces after splitting on semicolons). KFJ-RB-2: h.exec of the extracted text raises nothing; afterwards pg_policies lists exactly OFFICER, OWNER and MEMBER for public.character_equipped_items, OFFICER's qual and with_check contain no is_active, and MEMBER's qual contains is_active exactly once. KFJ-RB-3: views(h) deep-equals the parsed BASE_VIEWS file from the red run (fail with a clear message if the file is missing; report the first differing user). KFJ-RB-4: h.exec of the whole migration file text raises nothing and views(h) deep-equals VA.

CAT (per D-01; green run only). KFJ-CAT-1: pg_policies for public.character_equipped_items holds exactly three rows, sorted by name: OFFICER ALL, OWNER ALL, MEMBER SELECT, each PERMISSIVE with roles {public}. KFJ-CAT-2: OFFICER's qual and with_check each contain is_active exactly once; MEMBER's qual contains it twice when OD1 is A, once when B; OWNER's qual and with_check contain none. KFJ-CAT-3: h.exec of the migration file text again raises nothing and the CAT-1 and CAT-2 conditions still hold.

WRITE (per D-02; both runs; after each check that can change rows, restore them with h.q whatever the result). KFJ-WRITE-1: O_A's session updates item_name of CG's rows: affectedRows 0 and no CG row has the new item_name. KFJ-WRITE-2: O_A's session inserts a CG row with slot Feet: error 42501; afterwards delete any CG Feet row. KFJ-WRITE-3: O_A's session deletes CG's Hands row: affectedRows 0 and the row still exists; afterwards re-insert it with ON CONFLICT (character_id, slot) DO NOTHING. KFJ-WRITE-4: O_A's session sets character_id to CG on CA1's Legs row: error 42501; afterwards move it back to CA1 if it moved. KFJ-WRITE-5 (one record): O_A's session updates item_name of CA1's rows (affectedRows equals rows('CA1')), inserts a CA2 row with slot Feet (1 row) and deletes it (1 row). KFJ-WRITE-6 (one record): GONE's session updates item_name of CG's rows (affectedRows equals rows('CG')), inserts a CG row with slot Wrist (1 row) and deletes it (1 row). KFJ-WRITE-7 (one record): R1's session updating CA2's rows affects 0 rows, RB's session inserting a CA1 row with slot Back fails 42501, GM_A's session updating CA1's rows affects 0 rows. Cross-guild setup with h.qReplica: insert a membership for CG in guild B (fixed id 0000000b-0000-4000-8000-000000000002, role 'Member', is_active true, joined_via 'manual', membership_status 'full') and set the role of memberships.CB to 'Officer'. KFJ-WRITE-8 (setup anchor): RB's session gets true and O_A's session false from SELECT public.is_guild_officer(guild B). KFJ-WRITE-9: O_A's session updates item_name of CG's rows: affectedRows 0. KFJ-WRITE-10: RB's session updates item_name of CG's rows: affectedRows equals rows('CG'), and RB's view contains the CG rows.

Step 2, red run (per D-06): from SP, node pglite-all/run.mjs --wt WT pglite-kfj/scenarios-kfj.mjs with output to SP/pglite-kfj/run-output-kfj-before.txt (it exits 1). It must show FAIL lines for exactly KFJ-READ-1, KFJ-READ-9, KFJ-CAT-0, KFJ-WRITE-1, KFJ-WRITE-2, KFJ-WRITE-3, KFJ-WRITE-4, KFJ-WRITE-9 and, when OD-1 is A, KFJ-READ-10; PASS lines for KFJ-READ-2 to KFJ-READ-8, KFJ-READ-11, KFJ-WRITE-5 to KFJ-WRITE-8 and KFJ-WRITE-10; and SP/pglite-kfj/views-baseline.json must exist. If not, stop and return a checkpoint: the reproduction or the controls are wrong.

Step 3, j61 test anchor (per D-04): edit only the first case of app/services/__tests__/active-guild-membership-policies-migration.test.ts as D-04 says. Run npx vitest run on that file (it passes). Commit only that file: subject "test(db): anchor the active guild membership migration ordering check", body one or two neutral lines (the ordering check compared the migration with every file in the directory, so any later migration would fail it; it now compares with the newest migration that existed when it was written, as the other migration shape tests do), a blank line, then the trailer line.

Step 4, shape test first (per D-01): create app/services/__tests__/equipped-item-rules-migration.test.ts in the style of the j61 shape test (same helper functions copied locally; a header comment naming quick task 261003-kfj and saying, neutrally, that the migration makes the equipped items officer rule, and the guildmate read rule when included, require an active guild membership of the item's character; the behaviour is proven in a PGlite harness outside the repo and this test pins the file's shape). Constants MIGRATION_TIMESTAMP '20261003200000', the file name from D-01, TABLE 'character_equipped_items', OFFICER, OWNER and MEMBER. Add a blankIdentifiers helper that replaces every double-quoted identifier with "x", applied before blankStrings in the forbidden check (the apostrophe in OFFICER and OWNER would otherwise be read as a string quote). Cases: (a) the file exists; anchored ordering as D-04 with toBeGreaterThan(20261003180000) and a comment naming 20261003180000 (quick task 261003-j61); no other file shares the timestamp. (b) Exactly 5 statements when the comment-stripped SQL contains MEMBER, otherwise exactly 3, in the D-01 order (SET LOCAL lock_timeout = '5s'; DROP POLICY IF EXISTS OFFICER; CREATE POLICY OFFICER; then DROP and CREATE of MEMBER). No dollar quoting. (c) The OFFICER CREATE equals, after whitespace collapsing, baselinePolicy(OFFICER, TABLE) with both occurrences of the D-01 officer substring replaced; the substring occurs exactly twice in the baseline statement; the CREATE directly follows its DROP. (d) Only with MEMBER: the MEMBER CREATE equals baselinePolicy(MEMBER, TABLE) with the D-01 member substring replaced; it occurs exactly once; the CREATE directly follows its DROP and starts with the FOR SELECT form of the baseline. (e) The baseline holds OWNER exactly once, and no migration file other than the baseline contains a DROP POLICY naming OWNER. (f) rollbackStatements() holds, for each policy the file changes in the D-01 order, DROP POLICY IF EXISTS of that name ON "public"."character_equipped_items" followed by a statement equal to baselinePolicy(name, TABLE): 4 statements with MEMBER, 2 without. (g) Over the identifier-blanked and string-blanked statements: no FUNCTION, TRIGGER, GRANT, REVOKE, TRUNCATE, INSERT INTO, DELETE FROM, ALTER TABLE, INDEX, ROW LEVEL SECURITY, RESTRICTIVE or TO clause, no UPDATE followed by SET, and every statement that contains DROP starts with DROP POLICY IF EXISTS. Run it: it fails because the file does not exist yet.

Step 5, migration (per D-01 to D-03, D-05): write the file exactly as D-01 describes, statements (4) and (5) only when OD-1 is A, with the header sections of D-01 in neutral wording (D-07). The Rollback SQL lines are the baseline statements copied verbatim (including their line breaks and indentation) behind the "--   " prefix.

Step 6, green (per D-06): run the new shape test, then npx vitest run app/services (every migration test, including the j61 test and the function grants ratchet, must pass), then the PGlite run from SP with output to SP/pglite-kfj/run-output-kfj-task1.txt: exit 0 and no FAIL line.

Step 7, commit (per D-07): stage exactly the migration and the new shape test. Subject "fix(db): equipped item rules require an active guild membership". Body, two or three neutral lines: the equipped items officer rule now requires the item's character to have an active membership in the officer's guild; (OD-1 A) the guildmate read rule requires the same; this matches the app's gear routes, and a character's owner keeps managing its own equipped items. A blank line, then the trailer line. Do not push.
  </action>
  <verify>
    <automated>WT=/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/wteq; SP=/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad; MIG=supabase/migrations/20261003200000_equipped_item_rules_require_active_membership.sql; ST=app/services/__tests__/equipped-item-rules-migration.test.ts; JT=app/services/__tests__/active-guild-membership-policies-migration.test.ts; B="$SP/pglite-kfj/run-output-kfj-before.txt"; G="$SP/pglite-kfj/run-output-kfj-task1.txt"; cd "$WT" && grep -q '^EXIT=' "$SP/baseline-kfj-vitest.txt" && head -1 "$SP/baseline-kfj-vitest.txt" | grep -q '^HEAD=af3af380' && grep -q '^FAIL KFJ-READ-1 ' "$B" && grep -q '^FAIL KFJ-WRITE-1 ' "$B" && grep -q '^FAIL KFJ-WRITE-2 ' "$B" && grep -q '^FAIL KFJ-WRITE-3 ' "$B" && grep -q '^FAIL KFJ-WRITE-4 ' "$B" && grep -q '^FAIL KFJ-WRITE-9 ' "$B" && grep -q '^PASS KFJ-READ-2 ' "$B" && grep -q '^PASS KFJ-READ-4 ' "$B" && grep -q '^PASS KFJ-READ-11 ' "$B" && grep -q '^PASS KFJ-WRITE-5 ' "$B" && grep -q '^PASS KFJ-WRITE-6 ' "$B" && grep -q '^PASS KFJ-WRITE-7 ' "$B" && grep -q '^PASS KFJ-WRITE-10 ' "$B" && test -s "$SP/pglite-kfj/views-baseline.json" && npx vitest run app/services && cd "$SP" && node pglite-all/run.mjs --wt "$WT" pglite-kfj/scenarios-kfj.mjs > "$G" 2>&1 && ! grep -q '^FAIL' "$G" && grep -q '^PASS KFJ-READ-1 ' "$G" && grep -q '^PASS KFJ-RB-3 ' "$G" && grep -q '^PASS KFJ-RB-4 ' "$G" && grep -q '^PASS KFJ-CAT-3 ' "$G" && grep -q '^PASS KFJ-WRITE-4 ' "$G" && grep -q '^PASS KFJ-WRITE-9 ' "$G" && { ! grep -v '^--' "$WT/$MIG" | grep -q 'Users can view equipped items for guild characters' || { grep -q '^FAIL KFJ-READ-10 ' "$B" && grep -q '^PASS KFJ-READ-10 ' "$G"; }; } && cd "$WT" && test -z "$(git status --porcelain)" && [ "$(git rev-list --count af3af380..HEAD)" = "2" ] && [ "$(git show --name-only --format= HEAD~1 | grep .)" = "$JT" ] && [ "$(git show --name-only --format= HEAD | grep . | LC_ALL=C sort | tr '\n' ' ')" = "$ST $MIG " ] && [ "$(git log af3af380..HEAD --format=%B | grep -c '^Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>$')" = "2" ]</automated>
  </verify>
  <done>The Step 0 baseline exists. The red run shows the new-rule checks failing and the controls passing, and views-baseline.json holds its reads. After the migration, an officer's session reaches only current members' equipped items (and its own), a membership that is active only in a guild where the caller is not an officer does not count, active officers, owners and the cross-guild officer write as before, (OD-1 A) guildmates no longer read a departed character's equipped items, the header Rollback restores the red run's reads exactly and the migration applies again after it; the j61 test, the new shape test and every other migration test pass; two local commits hold, in order, exactly the j61 test file, then exactly the migration and its shape test, each with the trailer.</done>
</task>

<task type="auto">
  <name>Task 2: Full regression, PR body draft and SUMMARY (D-06, D-07)</name>
  <files>SP/pglite-kfj/run-output-kfj.txt, SP/pr-body-kfj.md, /Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/261003-kfj-equipped-item-rules-require-an-active-gu/261003-kfj-SUMMARY.md</files>
  <precondition>Task 1 is committed in WT (git rev-list --count af3af380..HEAD is 2, git status clean); SP/baseline-kfj-vitest.txt has its EXIT= line; SP/pglite-kfj/run-output-kfj-task1.txt has no FAIL line.</precondition>
  <action>
Full verification (per D-07), in this order:
(1) Text gate over the lines the branch adds (git diff af3af380...HEAD -U0 saved to SP/final-kfj-diff.txt, added lines only) and its commit messages: both non-empty and no em dash. If it fails, amend nothing: reword with one fixup commit now (it must touch only files already in files_modified, keep the migration commit migration-and-shape-test only, and carry the trailer), before the long run.
(2) npx tsc --noEmit to SP/final-kfj-tsc.txt (exit 0) and npx eslint --max-warnings 0 on app/services/__tests__/equipped-item-rules-migration.test.ts and app/services/__tests__/active-guild-membership-policies-migration.test.ts to SP/final-kfj-eslint.txt (exit 0).
(3) Final PGlite run from SP to SP/pglite-kfj/run-output-kfj.txt: exit 0, no FAIL line.
(4) Last, after the final commit and with no change in WT while it runs: the full suite to SP/final-kfj-vitest.txt in the Step 0 layout (first line HEAD=, last line EXIT=), foreground with a 600000 ms timeout. Gate it with sh SP/new-fails.sh SP/baseline-kfj-vitest.txt SP/final-kfj-vitest.txt run from WT (a new FAIL counts as flaky only if its file passes alone). Any later commit means running the suite again.
(5) Confirm WT is clean, the branch changes exactly the three files of files_modified, lib/database.types.ts is unchanged, there are no planning files in WT, the branch has no upstream and nothing was pushed.

PR body draft (per D-07): write SP/pr-body-kfj.md with a suggested title line "Equipped item rules require an active guild membership", then sections: Summary (two or three sentences: the equipped items officer rule now requires the item's character to have an active membership in the officer's guild; with OD-1 A the guildmate read rule too; this matches the app's gear routes; a character's owner keeps full access to its own equipped items and active officers and members are unaffected for current members); Changes (the statements in plain words; the separate test-only commit that anchors the previous migration's ordering check so later migrations do not fail it; no app, type or data change); Tests (the shape test and what it pins; a scratchpad PGlite check, not committed, compared every seeded user's reads with the header Rollback applied and with the migration applied, and checked owner, officer and member writes; full suite with no new failures); Deploy (migration-only PR, merge with --admin, deploys about 12 seconds after merge, no app PR needed first; catalog query 1 from the plan before and after, with the expected is_active_terms values for the OD-1 resolution); Rollback (in the migration header; no data change). Neutral wording: nothing about how the previous rules could be used, no follow-ups. End with a blank line and the line "🤖 Generated with [Claude Code](https://claude.com/claude-code)". No em dash.

SUMMARY: see output.
  </action>
  <verify>
    <automated>WT=/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/wteq; SP=/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad; MIG=supabase/migrations/20261003200000_equipped_item_rules_require_active_membership.sql; ST=app/services/__tests__/equipped-item-rules-migration.test.ts; JT=app/services/__tests__/active-guild-membership-policies-migration.test.ts; cd "$SP" && node pglite-all/run.mjs --wt "$WT" pglite-kfj/scenarios-kfj.mjs > pglite-kfj/run-output-kfj.txt 2>&1 && ! grep -q '^FAIL' pglite-kfj/run-output-kfj.txt && grep -q '^PASS KFJ-RB-4 ' pglite-kfj/run-output-kfj.txt && cd "$WT" && npx vitest run "$ST" "$JT" && npx tsc --noEmit > "$SP/final-kfj-tsc.txt" 2>&1 && npx eslint --max-warnings 0 "$ST" "$JT" > "$SP/final-kfj-eslint.txt" 2>&1 && grep -q '^EXIT=' "$SP/baseline-kfj-vitest.txt" && grep -q '^EXIT=' "$SP/final-kfj-vitest.txt" && test "$SP/final-kfj-vitest.txt" -nt "$(git rev-parse --git-path logs/HEAD)" && sh "$SP/new-fails.sh" "$SP/baseline-kfj-vitest.txt" "$SP/final-kfj-vitest.txt" && git diff af3af380...HEAD -U0 > "$SP/final-kfj-diff.txt" && ADDED=$(grep '^+' "$SP/final-kfj-diff.txt" | grep -v '^+++') && [ -n "$ADDED" ] && MSGS=$(git log af3af380..HEAD --format=%B) && [ -n "$MSGS" ] && EMDASH=$(printf '\342\200\224') && ! printf '%s\n%s\n' "$ADDED" "$MSGS" | grep -qF "$EMDASH" && test -s "$SP/pr-body-kfj.md" && ! grep -qF "$EMDASH" "$SP/pr-body-kfj.md" && N=$(git rev-list --count af3af380..HEAD) && [ "$(git log af3af380..HEAD --format=%B | grep -c '^Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>$')" = "$N" ] && [ "$(git diff --name-only af3af380...HEAD | LC_ALL=C sort | tr '\n' ' ')" = "$JT $ST $MIG " ] && test -z "$(git status --porcelain)" && ! git rev-parse --abbrev-ref --symbolic-full-name '@{u}' > /dev/null 2>&1 && test -f /Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/261003-kfj-equipped-item-rules-require-an-active-gu/261003-kfj-SUMMARY.md</automated>
    <human-check>After the PR is merged and deployed (not blocking execution): the user runs catalog query 1 and sees officer 2, owner 0 and member read 2 (OD-1 A) or 1 (OD-1 B); as a raider, the loot list page still shows their own equipped items and a WowSims gear import still works; as an officer, importing gear for a current member still works.</human-check>
  </verify>
  <done>The final PGlite run has zero FAIL lines; the full suite has no new FAIL line against the baseline; tsc and eslint pass; no em dash in added lines, commit messages or the PR body; every commit carries the trailer; the branch changes exactly the j61 test, the new shape test and the migration; WT clean, no upstream, nothing pushed; SP/pr-body-kfj.md and the SUMMARY exist.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser (user session) to PostgREST on character_equipped_items | Untrusted direct reads and writes with a user JWT; RLS policies are the only control (the table has every privilege granted to anon and authenticated) |
| app routes to the database | Service-role client; the routes' own ownership and active-membership checks are the control and are unchanged |
| migration deploy to the production database | One transaction per file; ACCESS EXCLUSIVE lock on character_equipped_items while the policies change |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-kfj-01 | Tampering | character_equipped_items INSERT, UPDATE, DELETE through the officer policy for a character whose membership in the officer's guild is inactive | medium | mitigate | D-02 adds ("cgm"."is_active" = true) to USING and WITH CHECK on the same cgm row; PGlite KFJ-WRITE-1 to KFJ-WRITE-4 and KFJ-WRITE-9 |
| T-kfj-02 | Information disclosure | character_equipped_items SELECT through the officer policy and (OD-1) the member read policy for a character whose membership is inactive | low | mitigate (OD-1 A) or transfer the member read part to follow-up FU-0 (OD-1 B) | D-02, D-03; PGlite KFJ-READ-1, KFJ-READ-10 |
| T-kfj-03 | Denial of service | a legitimate read or write lost (owner, active officer for a current member, cross-guild officer, app gear routes) | medium | mitigate | D-05 reader and writer table (all service role, unaffected); PGlite KFJ-READ-2 to KFJ-READ-8, KFJ-READ-11, KFJ-WRITE-5 to KFJ-WRITE-8, KFJ-WRITE-10, KFJ-RB-3 |
| T-kfj-04 | Denial of service | migration lock on character_equipped_items | low | mitigate | SET LOCAL lock_timeout '5s', one transaction, idempotent statements, no data change |
| T-kfj-05 | Denial of service | rollback needed after deploy | low | mitigate | Header Rollback recreates the baseline texts exactly, pinned by the shape test and run in PGlite KFJ-RB-2 to KFJ-RB-4 against the red run's recorded reads |
| T-kfj-06 | Denial of service | CI failure from the j61 shape test's live ordering scan once a later migration lands | low | mitigate | D-04 anchors it to 20261003120000 in its own test-only commit before the migration commit |
| T-kfj-07 | Information disclosure | public repository wording | low | mitigate | D-07: neutral commit messages, header and PR body; no description of the previous rules' use; follow-ups only in the SUMMARY, worded as the rule to adopt |

No package installs: the proof reuses the existing SP/pglite-all node_modules, so there is no supply-chain gate.
</threat_model>

<verification>
- PGlite: SP/pglite-kfj/run-output-kfj-before.txt shows the red run (FAIL for KFJ-READ-1, KFJ-READ-9, KFJ-CAT-0, KFJ-WRITE-1 to KFJ-WRITE-4, KFJ-WRITE-9 and, with OD-1 A, KFJ-READ-10; every control PASS) and views-baseline.json exists; run-output-kfj-task1.txt and run-output-kfj.txt have zero FAIL lines with READ, RB, CAT and WRITE sections.
- vitest: the new shape test, the anchored j61 test and every other app/services migration test pass; the full run has no new FAIL line against SP/baseline-kfj-vitest.txt (flaky only if the file passes alone).
- npx tsc --noEmit exits 0; npx eslint --max-warnings 0 on both test files exits 0.
- Text gate: no em dash in added lines, commit messages or SP/pr-body-kfj.md, on a non-empty diff.
- Git: commits after af3af380 on fix/equipped-item-rules-active-members (two, or three with a text-gate fixup), each with the trailer; only the three files of files_modified changed; clean status; no upstream; nothing pushed; no PR; no GitHub issue.
</verification>

<success_criteria>
- An active officer reaches through RLS only the equipped items of characters with an active membership in a guild where it is an officer, plus its own; owners keep full access to their own characters' equipped items.
- With OD-1 A, guildmates read only the equipped items of characters whose membership in the shared guild is active.
- Every app gear path (WowSims import, Battle.net import, gear sync, link, gear read) is unaffected: all are service-role routes with their own active-membership checks.
- The migration is idempotent, holds only the D-01 statements and has an exact, tested Rollback; it ships as a migration-only PR together with the test-only j61 anchor commit.
- The OD-1 resolution is applied exactly.
</success_criteria>

<output>
Create /Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/261003-kfj-equipped-item-rules-require-an-active-gu/261003-kfj-SUMMARY.md when done (main checkout, not WT). Include: both commit hashes and messages, marked "migration-only PR, merge with --admin, deploys about 12 seconds after merge, no app PR first"; the OD-1 resolution as applied; the final statement list and the Rollback; the policy inventory (finding 1), the other-table check (finding 2) and the reader and writer table (finding 4); PGlite PASS and FAIL counts for the red, task 1 and final runs; baseline versus final vitest, tsc and eslint results with any FLAKY lines; the path of SP/pr-body-kfj.md; the production catalog queries with the instruction to run 1 and 2 before merging and 1 again after the deploy (3 optional); a note that this closes follow-up FU-1 of quick task 261003-j61; and follow-ups in neutral wording, each stated as the rule to adopt: FU-0 only if OD-1 is B, the equipped items guildmate read policy should require the item's character's membership in the shared guild to be active; FU-1 officer writes on raid_team_members, blp_credits, blp_tracking, donation_records, attendance_records and reserve_awards should check that the referenced character belongs to the row's guild, as the loot_history and character_aliases triggers do; FU-2 review whether the characters policy "Guild members can view submitting characters" should keep following a loot list once the character's membership is inactive (past list and award views may rely on it); FU-3 POST /api/character-gear should recognise officers with is_guild_officer (role position, guild creator) rather than the role names Officer and Guild Master; FU-4 GET /api/character-gear should return only awards from guilds the caller shares with the character.
</output>
