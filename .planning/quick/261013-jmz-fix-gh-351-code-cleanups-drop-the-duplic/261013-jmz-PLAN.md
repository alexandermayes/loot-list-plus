---
phase: quick-261013-jmz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/guilds/route.ts
  - app/api/guilds/__tests__/route.test.ts
  - app/api/user/delete-account/route.ts
autonomous: true
requirements:
  - GH-351

estimate:
  tokens: 35000
  raw_tokens: 35000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "Creating a guild through POST /api/guilds no longer issues its own insert into guild_roles, so the 23505 unique_role_per_guild error and its console log stop on every guild creation (GH #351)"
    - "A new guild still ends up with Member, Officer and Guild Master roles, because the create_guild_default_roles trigger (AFTER INSERT ON guilds) inserts them"
    - "A vitest case fails if POST /api/guilds ever touches the guild_roles table again on a successful creation"
    - "Deleting an account through POST /api/user/delete-account no longer runs a delete on loot_submission_items filtered by a character_id column that does not exist, so the 42703 error log stops (GH #351)"
    - "A deleted account's loot_submission_items rows are still removed, by ON DELETE CASCADE from the loot_submissions delete"
    - "The numbered step comments in the delete-account route read 1 through 10 with no gaps"
  artifacts:
    - path: "app/api/guilds/route.ts"
      provides: "POST /api/guilds without the duplicate default roles insert, with a comment naming the trigger and GH #351"
      contains: "create_guild_default_roles"
    - path: "app/api/guilds/__tests__/route.test.ts"
      provides: "Fake client that records every from() table name, plus a GH #351 regression test"
      contains: "fromCalls"
    - path: "app/api/user/delete-account/route.ts"
      provides: "Account deletion without the broken submission-items step, with a cascade comment citing the FK and GH #351"
      contains: "loot_submission_items_submission_id_fkey"
  key_links:
    - from: "app/api/guilds/route.ts (guilds insert)"
      to: "supabase/migrations/20260101000000_baseline_schema.sql:125-137 and :2990 (create_default_guild_roles function, create_guild_default_roles trigger)"
      via: "AFTER INSERT ON guilds trigger"
      pattern: "create_guild_default_roles"
    - from: "app/api/user/delete-account/route.ts (loot_submissions delete)"
      to: "supabase/migrations/20260101000000_baseline_schema.sql:3301 (loot_submission_items_submission_id_fkey ON DELETE CASCADE)"
      via: "FK cascade"
      pattern: "loot_submission_items_submission_id_fkey"
---

<objective>
Close the two server-side cleanups in GH #351.

1. POST /api/guilds inserts the three default guild_roles rows itself, right after the guilds insert. The create_guild_default_roles trigger already inserts the same three rows (same names, colours, positions, is_default) on AFTER INSERT ON guilds, so the route's insert always fails with 23505 on unique_role_per_guild, logs an error, and is ignored. Remove it and lock that in with a test.
2. POST /api/user/delete-account step 4 deletes loot_submission_items filtered by character_id, a column that table does not have (columns: id, submission_id, loot_item_id, rank, slot, removed_at, removed_by). Postgres returns 42703 and the route logs it. The items are already removed by loot_submission_items_submission_id_fkey ON DELETE CASCADE when step 5 deletes loot_submissions. Remove step 4 and renumber.

Purpose: stop two errors that fire on every guild creation and every account deletion and hide real failures in the logs. Neither change alters what data ends up in the database.
Output: two edited routes, one extended test file, two commits on fix/351-server-cleanups.
</objective>

<execution_context>
All work happens in the git worktree /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357 on branch fix/351-server-cleanups (forked from origin/main). Every path below is relative to that worktree. Do NOT read or write anything under /Users/alexander.mayes/Code/personal/loot-list-plus (another session is committing there). The worktree has no .claude/ or gsd-core directory; proceed without them.

Project rules: TypeScript strict, 2-space indent, trailing commas, `import type` for type-only imports, comments explain why and cite the GH issue, no em dashes anywhere (comments, test names, commit messages, SUMMARY).
</execution_context>

<context>
@/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/.planning/workstreams/default/STATE.md (read only, do not edit)
@/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/app/api/guilds/route.ts
@/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/app/api/guilds/__tests__/route.test.ts
@/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/app/api/user/delete-account/route.ts

Facts verified at planning time (2026-10-13, worktree HEAD 523e2efe):
- Trigger: supabase/migrations/20260101000000_baseline_schema.sql line 2990 creates trigger create_guild_default_roles AFTER INSERT ON guilds, executing create_default_guild_roles() (lines 125-137, SECURITY DEFINER), which inserts Guild Master '#ff8000' 100, Officer '#fbbf24' 50, Member '#a1a1a1' 0, all is_default true. No later migration drops the trigger or function; 20260930000100_enforce_guild_membership_write_rules.sql line 33 documents it as the source of the default roles.
- Constraint: unique_role_per_guild UNIQUE (guild_id, name), baseline line 2529.
- FK: loot_submission_items_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES loot_submissions(id) ON DELETE CASCADE, baseline line 3301. No later migration alters it.
- In app/api/guilds/route.ts the only mention of role creation is the inline block at lines 229-241. The POST handler's header is the single line "// POST - Create a new guild"; no doc comment lists role creation as a step, so nothing else needs updating.
- Baseline test run: `npx vitest run app/api/guilds` passes 7 files, 82 tests.
- delete-account step comments currently read 1,2,3,4,5,6,7,8,9,10,11. There is no test directory for that route.

Test harness shape (app/api/guilds/__tests__/route.test.ts):
- createMockSupabase(opts) at lines 46-110 builds one recording fake client. It returns { supabase, insertPayloads, writes }. supabase is { from: (table) => buildBuilder(table) }; from() itself does not record the table name yet.
- The "Discord server link" describe (lines 189-342) uses separate user and service mocks via setupClients(); the first describe shares one mock for both clients.
- getAuthenticatedUser and seedExpansionForGuild are set up in each describe's beforeEach (see lines 125-129).
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: POST /api/guilds stops inserting default roles the trigger already creates (GH #351)</name>
  <files>app/api/guilds/__tests__/route.test.ts, app/api/guilds/route.ts</files>
  <precondition>`git -C /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357 branch --show-current` prints fix/351-server-cleanups and `git status --short -- app/` is empty.</precondition>
  <behavior>
    - A successful POST /api/guilds (Classic expansion, realm Arugal, no discord_server_id) returns 200, and neither the user-session client nor the service-role client is ever asked for the guild_roles table.
    - The same request still reaches the steps that follow the removed block: the user client records guild_settings and the service client records guild_invite_codes, which proves the table recorder works and the route did not stop early.
    - Run against the current route (before the removal) the new test FAILS, because the route asks the service client for guild_roles. After the removal it passes, and every existing test in app/api/guilds still passes.
  </behavior>
  <action>
RED first (test file). In app/api/guilds/__tests__/route.test.ts extend createMockSupabase so it records every table name passed to from(), in call order, in a new array named fromCalls (string[]). Change the returned supabase object so from() pushes the table name onto fromCalls before calling buildBuilder(table), and add fromCalls to the returned object next to supabase, insertPayloads and writes. Existing destructures keep working because they only pick named fields. Add one sentence to the JSDoc above createMockSupabase saying every from() table name is recorded in call order.

Add a new top-level describe block after the existing two, titled "POST /api/guilds default roles (GH #351)". Give it a beforeEach that mirrors lines 125-129: getAuthenticatedUser resolves { user: { id: 'user-1' }, error: null }, seedExpansionForGuild is reset and resolves { expansionId: 'exp-1' }. Add one test named "never writes guild_roles, since the create_guild_default_roles trigger seeds the default roles". In it, build two separate mocks (one for createClient, one for createServiceRoleClient, the same way setupClients does at lines 193-199), POST the body { ...baseBody, expansion: 'Classic', realm: 'Arugal' }, and assert: status 200; the user mock's fromCalls contains 'guild_settings'; the service mock's fromCalls contains 'guild_invite_codes'; the combined fromCalls of both mocks does not contain 'guild_roles'. Run `npx vitest run app/api/guilds/__tests__/route.test.ts` and confirm this one new test fails against the unchanged route (it must, since the route currently asks the service client for that table). Do not commit the red state on its own; the decided direction is one commit per task.

GREEN (route). In app/api/guilds/route.ts delete lines 229 to 241 inclusive: the "Create default guild roles" comment, the service-role insert of the three role rows, and the if-block that logs that insert's error and continues. Do not replace it with an upsert, an ignoreDuplicates insert, or any other write; the trigger is the single source of the default roles. In its place put exactly this two-line comment (keep the blank line before the invite-code block):
  line 1: // The create_guild_default_roles trigger already inserts Member, Officer and Guild Master
  line 2: // when the guild row is inserted, so a second insert here only hit unique_role_per_guild (GH #351).
Leave the guild_settings insert above and the invite-code insert below untouched. No header or doc comment in this file lists role creation as a step (checked at planning time), so nothing else changes. Re-run the guilds tests and confirm all pass, now 83 (82 at baseline plus the new one).

Commit on fix/351-server-cleanups, staging only the two files by explicit path (never git add -A or git add .; .planning/ must stay uncommitted). Message subject: "fix(guilds): drop the duplicate default roles insert on guild create (GH #351)". Body: one or two sentences saying the create_guild_default_roles trigger already inserts Member, Officer and Guild Master when the guild row is inserted, so the route's own insert always failed on unique_role_per_guild and logged an error on every guild creation, plus a sentence noting the new regression test. End the message with the attribution trailer your harness attribution reminder specifies; the orchestrator specified "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>", and if your own harness reminder names a different trailer, the harness reminder wins. No em dashes in the message. Do not push.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357 && npx vitest run app/api/guilds && test "$(grep -cE "\.from\('guild_roles'\)" app/api/guilds/route.ts)" = 0 && test "$(grep -c 'rolesError' app/api/guilds/route.ts)" = 0 && grep -q 'create_guild_default_roles' app/api/guilds/route.ts && grep -q 'GH #351' app/api/guilds/route.ts && grep -q 'fromCalls' app/api/guilds/__tests__/route.test.ts && grep -q 'GH #351' app/api/guilds/__tests__/route.test.ts && npx eslint app/api/guilds/route.ts app/api/guilds/__tests__/route.test.ts</automated>
  </verify>
  <done>
    - The new test was observed failing against the unchanged route, then passing after the removal.
    - `npx vitest run app/api/guilds` passes 83 tests in 7 files.
    - app/api/guilds/route.ts has no guild_roles insert and no roles error variable, and carries the two-line trigger comment citing GH #351.
    - eslint is clean on both files.
    - Exactly one commit on fix/351-server-cleanups touches exactly these two files; nothing pushed; no .planning/ file committed.
  </done>
</task>

<task type="auto">
  <name>Task 2: delete-account stops deleting submission items by a column that does not exist (GH #351)</name>
  <files>app/api/user/delete-account/route.ts</files>
  <action>
In app/api/user/delete-account/route.ts delete lines 109 to 117 inclusive: the "4. Delete loot submission items (if table exists)" comment, the delete on the submission items table filtered with .in on character_id, and the if-block that logs its error unless the message says "does not exist". That table has no character_id column, so the step always failed with 42703. Do not replace it with a delete by submission_id or any other query; the FK cascade already removes those rows.

Renumber the step comments that follow so they stay sequential: "5. Delete loot submissions for user's characters" becomes 4, "6. Delete loot history" becomes 5, "7. Delete character guild memberships" becomes 6, "8. Delete characters" becomes 7, "9. (guild_members cleanup handled by trigger ...)" becomes 8, "10. Delete user preferences" becomes 9, "11. Delete the auth user using admin API" becomes 10. Change only the number in each comment, not its wording.

Directly under the renumbered "// 4. Delete loot submissions for user's characters" comment, add exactly one comment line:
  // Its loot_submission_items rows go with it via loot_submission_items_submission_id_fkey ON DELETE CASCADE (GH #351).
Leave the JSDoc header (it says "All loot submissions", which stays true) and the general "Note: Some tables may have ON DELETE CASCADE" comment unchanged. Do not touch any other query, status code or message.

Run the checks in <verify>. If `npm run typecheck` reports errors, confirm none are in the three files this plan touches; if any pre-existing errors exist elsewhere, record them in the SUMMARY as pre-existing rather than fixing them.

Commit on fix/351-server-cleanups, staging only this file by explicit path. Message subject: "fix(account): stop deleting loot_submission_items by a missing character_id column (GH #351)". Body: one or two sentences saying loot_submission_items has no character_id column, so the step always failed with 42703 and logged an error on every account deletion, and the rows are removed by ON DELETE CASCADE from the loot_submissions delete, so nothing is left behind. End with the same attribution trailer rule as Task 1. No em dashes. Do not push and do not open a PR.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357 && test "$(grep -cE "\.from\('loot_submission_items'\)" app/api/user/delete-account/route.ts)" = 0 && test "$(grep -c 'submissionItemsError' app/api/user/delete-account/route.ts)" = 0 && test "$(grep -oE '// [0-9]+\.' app/api/user/delete-account/route.ts | tr -dc '0-9\n' | paste -sd, -)" = "1,2,3,4,5,6,7,8,9,10" && grep -q 'loot_submission_items_submission_id_fkey' app/api/user/delete-account/route.ts && grep -q 'GH #351' app/api/user/delete-account/route.ts && npx eslint app/api/user/delete-account/route.ts && npm run typecheck</automated>
  </verify>
  <done>
    - app/api/user/delete-account/route.ts has no query against loot_submission_items and no submission items error variable.
    - Step comments read 1 through 10 in order with no gaps.
    - The loot_submissions delete carries the one-line cascade comment naming loot_submission_items_submission_id_fkey and GH #351.
    - eslint is clean on the file and `npm run typecheck` reports no error in any file this plan touched.
    - Exactly one commit on fix/351-server-cleanups touches exactly this file; two commits total for the plan; nothing pushed; no PR opened; no .planning/ file committed.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser to POST /api/guilds | Authenticated, Discord-verified user creates a guild; the route writes with both the user session and the service role |
| browser to POST /api/user/delete-account | Authenticated user deletes their own account; the route deletes with the service role |
| route to Postgres triggers and FKs | The routes now rely on the create_guild_default_roles trigger and the loot_submission_items_submission_id_fkey cascade instead of duplicating that work |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-351-01 | Information disclosure | delete-account route, loot_submission_items | medium | mitigate | Removing the explicit items delete could leave a deleted user's ranked list items behind if the cascade were missing. Verified at planning time that loot_submission_items_submission_id_fkey is ON DELETE CASCADE (baseline line 3301) with no later migration altering it, and the removed step never deleted anything (it always failed with 42703), so retained data is unchanged. The new route comment names the FK so a future migration author sees the dependency. |
| T-351-02 | Denial of service | guilds route, default roles | low | mitigate | A guild with no default roles would break role display and permissions. The create_guild_default_roles trigger inserts all three roles on every guilds insert (baseline lines 125-137, 2990; documented again in 20260930000100 line 33), and the removed route insert never succeeded anyway, so behaviour is unchanged. The route comment names the trigger. |
| T-351-03 | Repudiation | server logs | low | accept | Both removed steps logged an error on every call, which buried real failures. Removing them makes the logs more trustworthy; no audit trail is lost because neither step ever wrote a row. |
| T-351-04 | Tampering | service-role writes | low | accept | The change removes service-role writes and adds none; no new input reaches any query. |
</threat_model>

<verification>
Run from /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357:
- `npx vitest run app/api/guilds` passes (83 tests, 7 files)
- `npm run typecheck` reports no error in the three touched files
- `npx eslint app/api/guilds/route.ts app/api/user/delete-account/route.ts app/api/guilds/__tests__/route.test.ts` is clean
- `git log --oneline origin/main..HEAD` shows exactly two commits, each citing GH #351
- `git show --stat HEAD~1 HEAD` lists only app/api/guilds/route.ts and app/api/guilds/__tests__/route.test.ts (first commit) and app/api/user/delete-account/route.ts (second commit)
- `git diff origin/main..HEAD | grep '^+' | LC_ALL=C grep -c $'\xe2\x80\x94'` prints 0 (no em dash added by this plan), and `git log -2 --format=%B | LC_ALL=C grep -c $'\xe2\x80\x94'` prints 0
</verification>

<success_criteria>
- POST /api/guilds no longer issues its own guild_roles insert; the default roles come only from the create_guild_default_roles trigger, and a regression test enforces it.
- POST /api/user/delete-account no longer runs the broken loot_submission_items step; items go via the FK cascade, and step numbering is 1 through 10.
- Two commits on fix/351-server-cleanups, nothing pushed, no PR, no .planning/ files committed.
</success_criteria>

<output>
Create /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/.planning/quick/261013-jmz-fix-gh-351-code-cleanups-drop-the-duplic/261013-jmz-SUMMARY.md when done (do not commit it). Record both commit hashes, the red then green test observation from Task 1, the final test count, and any pre-existing typecheck errors outside the touched files.
</output>
