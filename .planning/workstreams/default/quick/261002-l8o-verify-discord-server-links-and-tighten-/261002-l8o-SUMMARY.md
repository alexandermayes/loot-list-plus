---
phase: quick-261002-l8o
plan: 01
subsystem: guilds, discord, database rules
tags: [discord, guilds, rls, triggers, grants, character-aliases, invites, migration]
status: complete
requires:
  - "260929-wcr (function EXECUTE grants model, ratchet test)"
  - "260929-qzn (guild write rule triggers, 20260930000100)"
  - "#296 and #313 (guild reference rules for awards)"
provides:
  - "lib/discord-server-access.ts: canManageDiscordServer, checkUserManagesDiscordServer, discordServerAccessError"
  - "Manage check before any Discord server link write (PUT /api/guilds/info, POST /api/guilds)"
  - "Migration 20261002120000: enforce_guild_discord_link_rules, get_current_user_guildmate_ids, rebuilt memberships and profiles SELECT policies, DROP get_user_guild_ids, redeem_invite_code service-role only, enforce_character_alias_guild_refs"
affects:
  - app/api/guilds/info/route.ts
  - app/api/guilds/route.ts
  - app/api/discord-servers/route.ts
  - app/api/bot/_helpers.ts
  - app/api/guild-invites/[code]/route.ts
  - app/api/character-aliases/route.ts
  - lib/database.types.ts
tech-stack:
  added: []
  patterns:
    - "Route-level Discord manage check with the user's own provider token, plus a database trigger that keeps the column server-written"
    - "auth.uid()-bound RLS helpers only; no helper takes a user id"
    - "All-caller reference trigger with the #313 RLS-error mask for non-officer client callers"
key-files:
  created:
    - lib/discord-server-access.ts
    - lib/__tests__/discord-server-access.test.ts
    - app/api/character-aliases/__tests__/route.test.ts
    - supabase/migrations/20261002120000_guild_discord_links_and_helper_rules.sql
    - app/services/__tests__/guild-discord-links-and-helper-rules-migration.test.ts
  modified:
    - app/api/guilds/info/route.ts
    - app/api/guilds/info/__tests__/route.test.ts
    - app/api/guilds/route.ts
    - app/api/guilds/__tests__/route.test.ts
    - app/api/discord-servers/route.ts
    - app/api/bot/_helpers.ts
    - app/api/guild-invites/[code]/route.ts
    - app/api/guild-invites/[code]/__tests__/route.test.ts
    - app/api/character-aliases/route.ts
    - lib/database.types.ts
decisions:
  - "OD-01 to OD-05 applied as resolved by the user on 2026-10-02 (recommendations accepted; no unique index; OD-04 left as a follow-up)"
  - "The alias trigger also raises the RLS error (42501) instead of the reference error for anon and non-officer authenticated callers, as the #313 loot_history trigger does"
  - "PR 2 file set for the commit split: supabase/, lib/database.types.ts and the new migration shape test"
metrics:
  duration: "about 30 minutes (20:39 to 21:09 PDT)"
  completed: 2026-10-02
  tasks: 4
  files: 15
estimate:
  tokens: 290000
  tasks: 4
actuals:
  tokens: 24850
  tasks: 4
  commits: 8
---

# Quick Task 261002-l8o: Discord server links, guild helper rules, invite redemption and alias rules Summary

A Discord server can now be linked to a guild only by someone who owns or manages it. The server checks this with the user's own Discord sign-in, and a trigger keeps `guilds.discord_server_id` server-written. The guild helpers used by policies now read the signed-in user, and `get_user_guild_ids` is dropped. `redeem_invite_code` is service-role only. Character aliases point only at active members of their guild, through the route and in the database.

Work location: WT = `scratchpad/wtsec2`, branch `fix/guild-link-and-helper-rules`. Before any change it was fast-forwarded from f87a359c to origin/main **2bfb6000**, which is the new base. Nothing is pushed and no PR is open. The branch has no upstream.

## Commits

### PR 1, app code (works on the current database)

| Hash | Message |
|------|---------|
| a12c38fb | fix(guilds): link a Discord server only when the signed-in user manages it |
| 7c0c96c5 | fix(guilds): check Discord server access when a guild is created with a server |
| 41df5dd3 | fix(invites): redeem invite codes with the server client |
| b6ca91d7 | fix(aliases): character aliases point only at active members of the guild |

### PR 2, migration (after PR 1 is live in production; migration-only, merge with --admin)

| Hash | Message |
|------|---------|
| 9823f070 | fix(db): only the server writes a guild's Discord server link |
| ca3f11ca | fix(db): guild helpers read the signed-in user, and invite redemption is server-only |
| 8018968b | fix(db): keep character aliases inside their guild |
| 1d862f25 | test(db): build the em dash from its code point in the migration shape test |

None of the commits mix the two kinds. Every commit ends with the Co-Authored-By trailer.

PR body drafts (scratchpad, neutral wording, no em dash, vocabulary gate clean):
- PR 1: `scratchpad/l8o-pr1-body.md`
- PR 2: `scratchpad/l8o-pr2-body.md`

## PR 1 standalone check (Task 4 step 3, OD-05)

- A temporary detached worktree `scratchpad/wtsec2-pr1` was created at origin/main 2bfb6000, with node_modules symlinked.
- The 4 app-code commits were cherry-picked in order with no conflict: a12c38fb to 0e2e17c1, 7c0c96c5 to 69b40a33, 41df5dd3 to a7498c98, b6ca91d7 to a1291223. That count matches the app-code commit count.
- `git diff --name-only origin/main HEAD` there listed only the 12 app files. Nothing came from supabase/, lib/database.types.ts or the shape test, and both new test files were included.
- `npx tsc --noEmit` exited 0. `npx vitest run lib/__tests__/discord-server-access.test.ts app/api/guilds "app/api/guild-invites/[code]" app/api/character-aliases app/api/discord-guilds` passed: 9 files, 113 tests.
- The result file `scratchpad/pr1-check-l8o.txt` ends with `PR1 OK`.
- The worktree was removed with `git worktree remove --force` (its node_modules symlink was unlinked first). `git worktree list` no longer shows it, and wt-phase06 is still registered. `git worktree prune` was never run.

## Changes by area

**Manage rule and helper (D-02).** `lib/discord-server-access.ts` exports three functions:
- `canManageDiscordServer`: owner, or bit 0x8 or 0x20 of `BigInt(permissions)`. Unparseable permissions count as false.
- `checkUserManagesDiscordServer(serverId)`: `session.provider_token`, with one `refreshSession()` fallback, then a plain fetch of `https://discord.com/api/v10/users/@me/guilds`. A non-digit id returns not_manager with no call. 429 returns rate_limited. 401 or 403 returns token_expired. Other errors, a thrown fetch or a non-array body return discord_error.
- `discordServerAccessError(reason)`: maps each reason to a status and body.

Logs use constant first arguments. `GET /api/discord-servers` now filters with `canManageDiscordServer`.

**PUT /api/guilds/info (D-03).** The check runs only when a new, non-empty id differs from the stored id. Both ids are compared after trimming. A null value unlinks the server with no Discord call. If the stored-id read fails, the route returns 500 "Failed to update guild information" and writes nothing.

**POST /api/guilds (D-04).**
- The check runs before the insert, and the user-session insert no longer carries `discord_server_id`.
- A non-string id returns 403 COPY-1 without a Discord call.
- After a successful insert, the service role writes the verified (trimmed) id. If that write fails, the service role deletes the guild and the route returns 500 "Failed to create guild".
- **The existing seeding-failure rollback now deletes with `serviceSupabase` instead of the user-session client.** guilds has no DELETE policy, so the earlier delete removed 0 rows and left the guild behind. PGlite B-11 shows this.
- The icon auto-fetch uses the verified id.

**Bot (D-06).** `resolveGuildFromDiscord` adds `.order('created_at', { ascending: true }).order('id', { ascending: true })` before `.limit(1)`, and its doc comment is updated. No other lookup by discord_server_id exists in `app/api/bot` or `discord-bot`.

**Invites (D-10).** `POST /api/guild-invites/[code]` creates `serviceSupabase` before the redeem step and calls `serviceSupabase.rpc('redeem_invite_code', { code_input: code })`. The `createClient` import and the user-session client are removed.

**Aliases (D-09).** The route normalizes each `character_id` with `normalizeRefId` and checks the non-null ids with `findInvalidCharacterIds`. Null, missing and empty ids are invalid and are reported as `null`, each invalid value once, in first-seen order.
- Any invalid id returns 400 with the reused C-3 text and `invalid_character_ids`, and nothing is written.
- A lookup error returns 500 "Failed to save aliases".

**Types.** `lib/database.types.ts` adds `get_current_user_guildmate_ids: { Args: never; Returns: string[] }` and removes `get_user_guild_ids`.

## Final migration statement list (20261002120000, 21 statements)

1. CREATE OR REPLACE FUNCTION enforce_guild_discord_link_rules
2. COMMENT ON FUNCTION
3. REVOKE ALL ... FROM PUBLIC, anon, authenticated
4. CREATE OR REPLACE TRIGGER enforce_guild_discord_link_rules BEFORE INSERT OR UPDATE OF "discord_server_id" ON guilds FOR EACH ROW
5. COMMENT ON TRIGGER
6. CREATE OR REPLACE FUNCTION get_current_user_guildmate_ids() (sql, STABLE, SECURITY DEFINER, search_path public, pg_temp)
7. COMMENT ON FUNCTION
8. REVOKE ALL ... FROM PUBLIC
9. GRANT EXECUTE ... TO anon, authenticated, service_role
10. DROP POLICY IF EXISTS "Guild members can view guild memberships"
11. CREATE POLICY "Guild members can view guild memberships" ... USING ("guild_id" IN (SELECT get_current_user_guild_ids()))
12. DROP POLICY IF EXISTS "Profiles viewable by self or guildmates"
13. CREATE POLICY "Profiles viewable by self or guildmates" ... USING (auth.uid() = id OR id IN (SELECT get_current_user_guildmate_ids()))
14. DROP FUNCTION IF EXISTS get_user_guild_ids(p_user_id uuid) (no CASCADE)
15. REVOKE ALL ON FUNCTION redeem_invite_code(code_input text) FROM PUBLIC, anon, authenticated
16. GRANT EXECUTE ON FUNCTION redeem_invite_code(code_input text) TO service_role
17. CREATE OR REPLACE FUNCTION enforce_character_alias_guild_refs
18. COMMENT ON FUNCTION
19. REVOKE ALL ... FROM PUBLIC, anon, authenticated
20. CREATE OR REPLACE TRIGGER enforce_character_alias_guild_refs BEFORE INSERT OR UPDATE OF "guild_id", "character_id" ON character_aliases FOR EACH ROW
21. COMMENT ON TRIGGER

The header has these sections: Background, Fix (parts 1 to 4), Why triggers, Error contract, Not changed, Deploy order and Rollback. The Rollback lists 13 statements in order:
1. Drop the link trigger and its function.
2. Recreate `get_user_guild_ids` with search_path public, pg_temp, then REVOKE PUBLIC, then GRANT to anon, authenticated and service_role.
3. Drop and recreate both policies exactly as in the baseline and 20260722000002.
4. Drop `get_current_user_guildmate_ids`.
5. Grant redeem_invite_code to authenticated.
6. Drop the alias trigger and its function.

## Proof

### PGlite (scratchpad/pglite-l8o, never committed)

The harness is `scenarios-l8o.mjs`, with a copy of `fn-catalog.mjs` whose NEW_FILES list also has 20261001120000 and 20261002120000, and a copy of `scenarios-wcr-all.mjs` pointed at wtsec2. Each run's PASS and FAIL counts:

| Output | PASS | FAIL |
|--------|------|------|
| run-output-l8o-task1.txt | 31 | 0 |
| run-output-l8o-task2.txt | 45 | 0 |
| run-output-l8o-task3.txt | 89 | 0 |
| run-output-l8o.txt (final) | 133 | 0 |

Final run, by section:
- setup: 7
- A, link rule: 24
- B, shared servers, bot order and guild deletes: 14
- C, reads, drop order and invites: 44
- D, aliases: 21
- F, re-apply, rollback and catalog dry run: 23

Highlights:
- **A-a1:** the pre-migration control shows an officer session can change the link.
- **A-c1 to A-c3:** after the migration, officer and owner sessions get 42501 with the guilds RLS message and no DETAIL.
- **A-d, A-e:** other columns stay editable by officers, and the service role can still write the link.
- **A-f:** a user-session insert with a link fails, while an insert without one passes and gets its three default roles.
- **B-7 to B-10:** the bot query returns the oldest active guild, also after a rename, with the lower id breaking a created_at tie. There is no unique index.
- **B-11:** a user-session delete of the user's own guild removes 0 rows.
- **C-4:** reads for anon, G, O, M, I, X and D are deep-equal before and after the migration.
- **C-2:** the drop control fails with 2BP01.
- **C-6:** guildmate sets are computed from the seed.
- **C-7:** redeem_invite_code is service-role only, and the service role still redeems, counts uses and returns MAX_USES_REACHED, DEACTIVATED and NOT_FOUND.
- **D:** 23514 with the alias message and DETAIL for the service role and for officer sessions on insert, upsert, character change and guild change. Non-officer and anon sessions get the RLS error. The legacy alias is left alone and stays editable.
- **F-1 to F-3:** re-applying the migration leaves reads and every public function ACL unchanged.
- **F-4 to F-10:** the header rollback runs and restores the control behaviour, the reads and the `get_user_guild_ids` grants and proconfig, matching the C-0 snapshot exactly.
- **F-13 to F-23:** the five catalog queries, read verbatim from the plan, return the after-deploy expectations.

Deviations from production in the harness (listed in its header):
- auth stub and NOLOGIN roles
- service_role has BYPASSRLS
- gen_random_uuid stand-in
- PGlite runs as a superuser that owns everything
- reduced tables: profiles without its FK to auth.users; character_aliases with both of its indexes; the guilds discord_server_id index added
- 20261001120000 skipped (loot_history only)

### libpg-query (scratchpad/pglite-l8o/parse-output-l8o.txt)

All 21 statements parse, in the D-01 node order: 3 CreateFunctionStmt, 5 CommentStmt, 6 GrantStmt, 2 CreateTrigStmt, 2 CreatePolicyStmt and 3 DropStmt. The rollback block parses as 13 statements. There are no ERROR lines.

### Regression

| Check | Baseline (2bfb6000) | Final (1d862f25) |
|-------|---------------------|------------------|
| Full vitest | 165 files, 2925 tests, 0 failed, EXIT=0 | 168 files, 3011 tests, 0 failed, EXIT=0 |
| New FAIL lines (l8o-new-fails.sh) | n/a | none; no FLAKY lines; Errors 0 vs 0; file total not lower |
| npx tsc --noEmit | empty, exit 0 | empty, exit 0 |
| eslint (changed files) | 1 warning (app/api/guilds/route.ts GET `request` unused, line 301) | the same single warning, now line 342; 0 errors |

The first line of each full-suite output file is HEAD=<sha>, and the final file's sha matches `git rev-parse HEAD`.

Text gates over the guarded, non-empty diff (1741 added lines) and the commit messages: no em dash, and no vocabulary-gate word.

## "Executor verifies first" results

- **Task 1 precondition:** WT was clean with no commits. On instruction it was fast-forwarded to 2bfb6000. The harness models, PGlite node_modules and k0n-new-fails.sh existed, and OD-01, OD-02 and OD-05 were resolved (OD-01 option A).
- **Task 3 (callers):**
  - `get_user_guild_ids`: called only by the two policies (baseline 3545 and 20260722000002). Besides those, it appears only in lib/database.types.ts and the wcr shape test inventory.
  - `redeem_invite_code`: called only by `POST /api/guild-invites/[code]`.
  - This matches findings 4 and 6. The `addon/` directory no longer exists in the repo after #358.
- **Task 4 (alias callers):** both callers pick characters from `/api/guild-members`, which returns only characters with an active membership in the requested guild:
  - The raid-tracking import builds its member list from that route.
  - PriorityListTab's `bulkRoster` is built from `characters`, which is loaded from that route.
- **Task 2 (other bot lookups):** none.

## OD resolutions as applied

- **OD-01, option A:** the check uses the user's Discord token and `/users/@me/guilds`. A lapsed token returns the existing reconnect text.
- **OD-02, no unique index:** several guilds can still share a server, and the bot picks the oldest active one. COPY-3 is not used.
- **OD-03:** existing links and alias rows are not changed.
- **OD-04:** not implemented; follow-up below.
- **OD-05:** two PRs, app code first, with the commits kept separate and the PR 1 standalone check passed.

## COPY as shipped

- COPY-1 (403): "You can only link a Discord server where you have the Manage Server permission."
- COPY-2 (502): "Couldn't check your Discord server permissions. Try again."
- Reused: "Discord connection expired. Please log in again to reconnect." with code `discord_token_expired` (403); "Discord rate limit reached. Please wait a moment and try again." (429); "Failed to create guild" (500); "Failed to update guild information" (500); "Some raiders aren't active members of this guild. Check the roster, then try again." (400, alias route); "Failed to save aliases" (500).

## Production catalog check (read-only; run in the Supabase SQL editor)

Run queries 1, 2, 4 and 5 **before merging PR 2**:
- Query 1 should return the two policies.
- Query 2 should return pg_policy with 2, and no function should name `get_user_guild_ids`. If anything else appears, hold PR 2: the DROP would refuse and roll back the deploy.
- Review any shared links from query 4 and the count from query 5 in the Supabase dashboard, not here.

Run queries 1 to 3 **after the deploy**:
- Queries 1 and 2 should return no rows.
- Query 3 should show redeem_invite_code false, false, true; get_current_user_guildmate_ids true, true, true; and both enforce_* functions false, false, true. There should be no get_user_guild_ids row.

```sql
-- 1. Policies that call get_user_guild_ids (before: the two named in finding 4; after: none)
select schemaname, tablename, policyname, cmd
  from pg_policies
 where coalesce(qual, '') || ' ' || coalesce(with_check, '') like '%get_user_guild_ids%'
 order by 1, 2, 3;

-- 2. Anything else that depends on or names get_user_guild_ids (before: pg_policy 2 and no body; after: no rows)
select d.classid::regclass::text as catalog, count(*) as dependents
  from pg_depend d
 where d.refclassid = 'pg_proc'::regclass
   and d.refobjid = to_regprocedure('public.get_user_guild_ids(uuid)')
 group by 1;
select p.oid::regprocedure::text as function_naming_it
  from pg_proc p
 where p.prosrc like '%get_user_guild_ids%' and p.proname <> 'get_user_guild_ids';

-- 3. EXECUTE on the functions this change touches
select p.oid::regprocedure::text as function,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('redeem_invite_code', 'get_user_guild_ids', 'get_current_user_guildmate_ids',
                     'enforce_guild_discord_link_rules', 'enforce_character_alias_guild_refs')
 order by 1;

-- 4. Discord server ids linked by more than one guild (aggregate only, OD-02 and OD-03)
select count(*) as shared_server_ids, coalesce(max(n), 0) as most_guilds_on_one_server
  from (select discord_server_id, count(*) as n
          from public.guilds
         where discord_server_id is not null
         group by discord_server_id
        having count(*) > 1) s;

-- 5. Aliases whose character has no active membership in the alias's guild (count only; the migration does not change them)
select count(*) as aliases_outside_active_roster
  from public.character_aliases ca
 where not exists (select 1 from public.character_guild_memberships m
                    where m.character_id = ca.character_id and m.guild_id = ca.guild_id and m.is_active = true);
```

## Deviations from Plan

1. **Base commit.** WT was fast-forwarded to origin/main 2bfb6000 instead of starting at f87a359c, as the orchestrator instructed. 2bfb6000 adds #358 and #359 (the addon removal and docs), which touch none of this plan's objects.
2. **[Rule 2, security] RLS-error mask in the alias trigger.** D-09 asks for check_violation for every caller "as #313 does". The #313 trigger also returns the RLS error to anon and non-officer authenticated callers so the check reveals nothing to them, so the alias trigger does the same. Officer sessions and the service role get the 23514 contract exactly as D-09 states. PGlite D-10 to D-12 cover the masked case. The trigger also leaves a NULL guild_id or character_id to the NOT NULL constraints, as #313 does.
3. **Fixup commit 1d862f25.** The tool that wrote the shape test turned the backslash-u-2014 escape into the literal character, which failed the em dash gate. The fixup builds the character from its code point instead. It is test-only.
4. **Commit split rule.** The step 3 rule ("nothing under supabase/ and not lib/database.types.ts") would have counted the shape-test-only fixup as app code. That fixup cannot apply without its migration commit. Following OD-05, which places the shape test in the migration PR, the PR 2 file set is supabase/, lib/database.types.ts and the shape test. The A-2 count check (4 app commits) and the A-2 diff check both passed with this set.
5. **Extra tests beyond the behavior lists:**
   - PUT: a first link when no id is stored.
   - POST: the icon fetch uses the verified id; a rollback when seeding fails for a guild with no link.
   - Invite route: RPC error case.
   - Aliases: first-seen ordering.
6. **PUT stored-id read uses `.single()`.** A missing guild row counts as a lookup error (500, no write). The owner check before it already requires the guild to exist.
7. **`/api/discord-servers`.** An unparseable permissions string now filters the server out instead of throwing (the old code returned 500). Discord always sends numeric strings, so the response is unchanged in practice.
8. **No handoff.** All four tasks ran in one session, so no handoff note was written (`scratchpad/l8o-handoff.txt` does not exist).
9. **Planning files.** STATE.md and ROADMAP.md were not updated, per the orchestrator's constraints.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model. The new code adds no endpoints. The new Discord call uses the user's own token against an endpoint the app already calls.

## Follow-ups (neutral, no detail)

- OD-04: a send-time check that a guild's saved raid summary channel belongs to its linked Discord server, and clearing the saved channel when the link changes. This is a separate quick task.
- Treat `user_preferences.discord_verified` as a display flag, not as proof of a Discord link. The user's own session writes it.
- `update_guild_icon` and `update_guild_info` have no callers (noted in 260929-wcr) and could be dropped in a later change.

## Self-Check: PASSED

- All 5 created files and 10 modified files exist in WT.
- All 8 commits exist on `fix/guild-link-and-helper-rules` (a12c38fb, 9823f070, 7c0c96c5, 41df5dd3, ca3f11ca, b6ca91d7, 8018968b, 1d862f25).
- The scratchpad proof files exist: run-output-l8o.txt, parse-output-l8o.txt, pr1-check-l8o.txt, final-l8o-vitest.txt and baseline-l8o-vitest.txt.
- `scratchpad/wtsec2-pr1` does not exist, and WT `git status` is clean.

## Delivery (orchestrator, 2026-10-03)

- App PR #360: the four app commits, cherry-picked onto origin/main as a1291223 (the PR 1 standalone check's tip), squash-merged as f6380533 after every CI check passed; the Vercel production deploy succeeded.
- Migration PR #361: the four migration-side commits cherry-picked onto the new main (migration, shape test, database types only; tsc clean, migration tests 260/260), squash-merged as 8019a27d after every CI check passed. Deploy Migrations applied 20261002120000_guild_discord_links_and_helper_rules.sql in production at 07:30 UTC; the DROP FUNCTION of the old helper succeeded.
- Still open: the real-Discord manual checks in the verification report, and the optional read-only catalog queries (the Supabase dashboard is blocked for the browser extension by the organization's policy, so the user runs them).
