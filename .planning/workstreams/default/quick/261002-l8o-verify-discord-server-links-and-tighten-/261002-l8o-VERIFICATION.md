---
phase: quick-261002-l8o
verified: 2026-10-03T04:25:00Z
status: human_needed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Before merging PR 2, run catalog queries 1, 2, 4 and 5 from the SUMMARY in the Supabase SQL editor (read-only, aggregate output only); after the migration deploys, run queries 1 to 3"
    expected: "Before: query 1 returns the two policies, query 2 returns pg_policy with 2 and no function naming get_user_guild_ids (anything else means PR 2 waits). After: queries 1 and 2 return no rows; query 3 shows redeem_invite_code false/false/true, get_current_user_guildmate_ids true/true/true, both enforce_* functions false/false/true, and no get_user_guild_ids row"
    why_human: "Production catalog state; no SQL may be run against a real database from here"
  - test: "Merge PR 1 (commits a12c38fb, 7c0c96c5, 41df5dd3, b6ca91d7), wait until the Vercel production deploy is live, then merge PR 2 (9823f070, ca3f11ca, 8018968b, 1d862f25) with --admin"
    expected: "Guild creation with a server and invite redemption keep working through the whole window; the migration applies in one go"
    why_human: "Deploy-order action on the live app and database (OD-05)"
  - test: "After PR 1 is live, sign in with Discord and (a) change the linked server in guild settings to a server you manage, (b) try one you only belong to, (c) create a guild with a server from the picker, (d) redeem an invite link; after PR 2 is live repeat (c) and (d)"
    expected: "(a) saves; (b) shows 'You can only link a Discord server where you have the Manage Server permission.' and nothing changes; (c) creates the guild with the link and icon; (d) joins as before. A session whose Discord token has lapsed gets 'Discord connection expired. Please log in again to reconnect.' and works again after a fresh Discord sign-in (the OD-01 trade-off, which also applies to the create page's typed-in server id fallback)"
    why_human: "Real Discord OAuth provider token and GET /users/@me/guilds; every automated test stubs fetch and the Supabase session"
---

# Quick task 261002-l8o: Discord server links, guild helper rules, invite redemption and alias rules, Verification Report

**Goal:** A Discord server can be linked to a guild only by someone who owns it or has Administrator or Manage Server (checked with the user's Discord sign-in in the guild settings and creation routes, and enforced by a trigger so user sessions cannot write discord_server_id directly); the bot resolves a shared server to the oldest active guild (created_at then id); guild-creation rollbacks delete with the service role; get_user_guild_ids(user_id) is replaced in the two policies by helpers bound to the signed-in user and dropped, with identical legitimate reads; character aliases must point at an active member of the guild (route plus trigger); redeem_invite_code runs with the service role and loses authenticated EXECUTE; app PR first, then the migration PR; signed-off COPY-1 and COPY-2 used verbatim.
**Verified:** 2026-10-03T04:25:00Z
**Status:** human_needed (all automated checks pass; only deploy-order, production catalog and real-Discord checks remain)
**Re-verification:** No, initial verification
**Code under test:** worktree scratchpad/wtsec2, branch fix/guild-link-and-helper-rules, HEAD 1d862f25, 8 commits over origin/main 2bfb6000, no upstream and no remote branch, `git status` clean, no .planning paths in the diff.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | D-02, D-03 (L8O-R1): PUT /api/guilds/info checks a changed, non-null id; four failure mappings with no update; no Discord call without the field, for the stored value (both trimmed) or for null | VERIFIED | app/api/guilds/info/route.ts 78-105: runs only when the trimmed new value is non-empty, reads the stored id with the service role (`.single()`; error gives 500 'Failed to update guild information'), compares with the trimmed stored id, calls checkUserManagesDiscordServer only when they differ and returns discordServerAccessError(reason) before the update. Owner check (40-52) still runs first. Tests (real discordServerAccessError via importOriginal): new id saves trimmed '555'; first link; it.each over the four reasons gives 403/403+code/429/502 with `updates` empty; stored '111' vs ' 111 ' both ways makes no check call; null and '' unlink with no check and no stored read; no field means no read and no check; lookup error 500 with no check; non-owner 403 before any check. 21 tests pass in my run |
| 2 | D-04 (L8O-R1): POST /api/guilds checks before insert; user session inserts without the id; service role writes it; link-write failure and seeding failure both delete with the service role; user session never updates or deletes a guild | VERIFIED | app/api/guilds/route.ts 91-174: non-string id gives COPY-1 403 with no call; trimmed id checked before the insert; insert payload (117-128) has no discord_server_id; serviceSupabase created before the insert; link update with the service role at 141-155 with service-role delete and 500 'Failed to create guild'; seeding rollback at 169 now `serviceSupabase.from('guilds').delete()`; icon fetch uses verifiedDiscordServerId. The only user-session calls left in POST are user_preferences select, guilds insert, guild_settings insert. Tests use two separate recording mocks (setupClients): service mock records `update {discord_server_id:'123'} eq id g1` then `delete eq id g1`; `guildWrites(user.writes)` is `[]` in every case, including both rollbacks; failure reasons give no insert on either mock. PGlite B-11/B-12 show a user-session DELETE of the user's own guild affects 0 rows |
| 3 | D-02: one exported predicate canManageDiscordServer (owner, 0x8, 0x20) used by the check and by GET /api/discord-servers, response unchanged | VERIFIED | lib/discord-server-access.ts 30-39: owner true, else `BigInt(guild.permissions or '0')` in try/catch (unparseable returns false), bit tests with BigInt(0x8) and BigInt(0x20). checkUserManagesDiscordServer uses it (104-110). app/api/discord-servers/route.ts imports it and filters with it; only the filter lines changed. Helper tests cover owner, '8', '32', 2^50+0x20, '0', '2048', 'not-a-number'. Deviation: an unparseable permissions string now drops that server instead of throwing a 500 (SUMMARY deviation 7); Discord sends numeric strings |
| 4 | D-05 (L8O-R2): user sessions cannot insert a non-null link or change it (42501, guilds RLS text, no DETAIL); service role can; link-less user insert passes the owner trigger and gets three roles; officer edits of other columns work | VERIFIED | Migration statements 1-5: guard `coalesce(current_setting('role', true), '') NOT IN ('anon','authenticated') OR pg_trigger_depth() > 1` returns NEW; INSERT passes only with NULL; UPDATE only when IS NOT DISTINCT FROM OLD; RAISE USING MESSAGE, ERRCODE insufficient_privilege, no DETAIL. Separate function from enforce_guild_owner_write_rules; neither modifies NEW, so no interaction. PGlite (my re-run): A-a1 control before the migration (officer change affects 1 row), A-c1 to A-c4, A-d1 to A-d3, A-e1 to A-e3, A-f1 to A-f6 (user insert without link passes, three default roles, free tier), A-g1 to A-g3, A-h1/A-h2 all PASS |
| 5 | D-06 (L8O-R2): resolveGuildFromDiscord orders by created_at asc, then id asc, before limit 1 | VERIFIED | app/api/bot/_helpers.ts 60-68 adds `.order('created_at', { ascending: true }).order('id', { ascending: true })` before `.limit(1).maybeSingle()`; doc comment updated. It is the only discord_server_id lookup used by the bot (discord-bot/lootlist-api.js goes through /api/bot/score and /api/bot/priority). PGlite B-7 to B-10 prove the same SQL shape returns the oldest active guild, also after a rename, with the lower id breaking a created_at tie. No JS unit test covers the chain (no app/api/bot tests exist); the code line is direct |
| 6 | D-07, D-08 (L8O-R3): identical rows for anon and every seeded user; get_user_guild_ids gone; get_current_user_guildmate_ids() no args, caller's guildmates only, SECURITY DEFINER, search_path public, pg_temp, EXECUTE anon/authenticated/service_role, not PUBLIC | VERIFIED | Statements 6-14. get_current_user_guild_ids (baseline 323) has the same body as get_user_guild_ids (baseline 454) with auth.uid() in place of the argument, so the memberships policy is equivalent; the guildmate set is the per-row question of 20260722000002 computed once. get_user_guild_ids appears in no other policy, function body or app/bot/script code (grep of all migrations and the worktree). DROP FUNCTION IF EXISTS without CASCADE. PGlite C-4 compares JSON of sorted id lists per role (anon, G, O, M, I, X, D) before and after: deep-equal, non-trivial (C-4b); C-2 control drop fails 2BP01; C-5 to C-5d; C-6a to C-6g (expected sets computed from the seed). function-execute-grants ratchet over later migrations passes (16 tests) |
| 7 | D-09 (L8O-R4): alias route 400 with C-3 text and invalid_character_ids (null for missing/null/empty), no write; valid upserts as before; trigger refuses out-of-roster insert, upsert, guild_id or character_id change; leaves existing rows and alias_name-only updates alone | VERIFIED | app/api/character-aliases/route.ts 34-63: normalizeRefId per entry, findInvalidCharacterIds on non-null ids only, null and invalid ids listed once in first-seen order, `formatInvalidAwardRefsError([], ...)` always returns the C-3 text, lookup throw gives 500 'Failed to save aliases'; upsert writes the same values that were checked. 10 route tests pass (null, missing key, '' each give `[null]` and no null reaches the lookup). Trigger statements 17-21; PGlite D-1 to D-20 PASS. Documented deviation (SUMMARY 2): anon and non-officer authenticated callers get the RLS error (42501) instead of 23514, as the #313 loot_history trigger does; officers and the service role get 23514 with DETAIL. The refusal holds for every role; this matches the brief ("non-officers get the RLS error") |
| 8 | D-10 (L8O-R5): invite route redeems with the service role and never creates the user-session client; only service_role can execute; 42501 for anon/authenticated; redeem, use counting and the three error codes still work | VERIFIED | app/api/guild-invites/[code]/route.ts: createClient import removed; `serviceSupabase.rpc('redeem_invite_code', { code_input: code })` at 126-127 after getAuthenticatedUser. redeem_invite_code body reads no auth.uid(). Route test asserts service rpc called once with the code and `createClient` not called; RPC error keeps the existing 500. Statements 15-16. PGlite C-0b (before: authenticated, service_role), C-3 (before: authenticated call works), C-7a to C-7j (after: grantees service_role only, anon and authenticated 42501, uses 1, 2, MAX_USES_REACHED, DEACTIVATED, NOT_FOUND) |
| 9 | D-11, D-12 (DELIVERY-R1): PGlite 0 FAIL; libpg-query parses all; full vitest no new FAIL; tsc 0; eslint 0; text gates; separate commits; PR 1 standalone check; nothing pushed | VERIFIED | See spot-checks and probes below. Commit split: a12c38fb, 7c0c96c5, 41df5dd3, b6ca91d7 touch only app files; 9823f070, ca3f11ca, 8018968b, 1d862f25 touch only the migration, lib/database.types.ts and the shape test. Tree at the PR 1 tip a1291223 (cherry-picks on 2bfb6000, objects still present) differs from HEAD only by those three migration-side files. All 8 commits carry the trailer |

**Score:** 9/9 truths verified (0 present but behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| supabase/migrations/20261002120000_guild_discord_links_and_helper_rules.sql | 21 statements, two triggers, helper, policies, drop, invite grants, header with Rollback | VERIFIED | 21 statements in D-01 order (libpg-query); header sections Background, Fix 1-4, Why triggers, Error contract, Not changed, Deploy order, Rollback (13 statements, executed in PGlite F-4 to F-10) |
| app/services/__tests__/guild-discord-links-and-helper-rules-migration.test.ts | shape lock | VERIFIED | 20 tests pass: order, bodies, grants, trigger events, policy text, only the three DROPs and no CASCADE, no data change, ratchet, COMMENT strings |
| lib/discord-server-access.ts | predicate, check, error mapping | VERIFIED | 150 lines, no next/server import, constant first log arguments; imported by both link routes and the picker |
| lib/__tests__/discord-server-access.test.ts | helper tests | VERIFIED | 25 tests pass |
| app/api/guilds/info/route.ts, app/api/guilds/route.ts | manage check before link writes | VERIFIED | Truths 1 and 2 |
| app/api/character-aliases/route.ts and its new test | active-roster check | VERIFIED | Truth 7 |
| app/api/guild-invites/[code]/route.ts | service-role redeem | VERIFIED | Truth 8 |
| lib/database.types.ts | add guildmate helper, remove get_user_guild_ids | VERIFIED | Diff shows exactly those two edits; no code calls either function |
| scratchpad/pglite-l8o/scenarios-l8o.mjs | PGlite proof | VERIFIED | Exists and reads the migration from wtsec2 at run time. (gsd-tools verify.artifacts reports it missing because it resolves the absolute path against the cwd; the file is present and was re-run) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| GuildSettingsContent (PUT /api/guilds/info), CreateGuildModal and create page (POST /api/guilds) | checkUserManagesDiscordServer | user's provider token, GET discord.com/api/v10/users/@me/guilds | WIRED | Both routes import and call it; helper fetches the v10 URL with Bearer (test asserts URL and header). UIs show `data.error`, no UI change |
| PostgREST INSERT/UPDATE on guilds by anon/authenticated | enforce_guild_discord_link_rules() | BEFORE INSERT OR UPDATE OF "discord_server_id" FOR EACH ROW | WIRED | pg_get_triggerdef in PGlite A-g3; the only SQL function that writes the column (update_guild_info) is service-role only since 20260930000200 |
| SELECT policies on memberships and profiles | get_current_user_guild_ids(), get_current_user_guildmate_ids() | DROP POLICY IF EXISTS plus CREATE POLICY, then DROP FUNCTION | WIRED | PGlite C-5c/C-5d read the stored policy expressions |
| POST /api/guild-invites/[code] | redeem_invite_code | serviceSupabase.rpc | WIRED | route.ts 126-127 (call split over two lines, so the plan's one-line grep pattern needs multiline) |
| POST /api/character-aliases and officer PostgREST writes | findInvalidCharacterIds and enforce_character_alias_guild_refs() | active membership in the alias's guild | WIRED | route.ts 42-46; trigger statement 20 (PGlite D-20) |

gsd-tools verify.key-links cannot parse this plan's key links (their `from` fields are descriptions, not paths); each link was checked by hand as above.

### Data-Flow Trace (Level 4)

Not applicable: no rendered dynamic data was added. The new response bodies come from discordServerAccessError and the reused C-3 text, which the route tests assert verbatim.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| New and changed tests | `npx vitest run lib/__tests__/discord-server-access.test.ts app/api/guilds "app/api/guild-invites/[code]" app/api/character-aliases app/services/__tests__/guild-discord-links-and-helper-rules-migration.test.ts app/services/__tests__/function-execute-grants-migration.test.ts app/api/discord-guilds app/api/bot` | 11 files, 149 tests passed | PASS |
| Type check | `npx tsc --noEmit` and `npx tsc --noEmit --incremental false` | both exit 0, empty output | PASS |
| eslint on changed files | the plan's eslint file list | exit 0; 0 errors, 1 warning (app/api/guilds/route.ts 342 GET `request` unused, the same warning as the baseline at line 301) | PASS |
| Full suite (saved run) | first line and totals of scratchpad/final-l8o-vitest.txt and baseline-l8o-vitest.txt | final HEAD=1d862f25 (equals `git rev-parse HEAD`), started 21:07:34 after the last commit at 21:05:56, 168 files / 3011 tests passed, EXIT=0; baseline HEAD=2bfb6000, 165 / 2925 passed, EXIT=0. The +3 files are the three new test files. Not re-run, as instructed, since these were consistent | PASS |
| New FAIL comparison | `sh ../l8o-new-fails.sh ../baseline-l8o-vitest.txt ../final-l8o-vitest.txt` | exit 0; "165 test files, 0 errors; final: 168 test files, 0 errors"; no new FAIL lines | PASS |
| Em dash and wording gates | added lines of `git diff origin/main...HEAD -U0` (1744), all commit messages, both PR drafts | 0 U+2014, 0 U+2013; no plan-gate vocabulary word; a wider word list matched only neutral text (a header sentence about the service role and RLS, the word "whole", a mocked Discord 401 body) | PASS |
| New user-facing text | string literals in added non-test app lines | only COPY-1 and COPY-2 (byte-identical to the plan, straight apostrophe) plus the reused reconnect, rate-limit, 'Failed to create guild', 'Failed to update guild information', 'Failed to save aliases' and C-3 strings; console.error calls use constant first arguments | PASS |

### Probe Execution

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| PGlite harness | `cd scratchpad/pglite-l8o && node scenarios-l8o.mjs` (output to scratchpad/verifier-l8o-pglite.txt) | exit 0; RESULT 133 PASS, 0 FAIL (setup 7, A 24, B 14, C 44, D 21, F 23) | PASS |
| libpg-query parse | `cd scratchpad/pglite-l8o/parse && node parse-l8o.mjs` (output to scratchpad/verifier-l8o-parse.txt) | exit 0; 21 OK lines in D-01 order, node counts 3/5/6/2/2/3, rollback 13 statements, 0 failed | PASS |
| PR 1 standalone check (executor run, inspected) | scratchpad/pr1-check-l8o.txt | base 2bfb6000; 4 cherry-picks = 4 app commits; changed files are the 12 app files only, naming lib/__tests__/discord-server-access.test.ts and app/api/character-aliases/__tests__/route.test.ts; tsc section empty; 9 files / 113 tests run in wtsec2-pr1; `PR1 OK`. 9/113 equals what those paths contain (enumerated with `vitest list`). Cherry-pick commits 0e2e17c1..a1291223 still exist. wtsec2-pr1 is gone and wt-phase06 is still registered | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| L8O-R1 | 261002-l8o-PLAN | Linking requires owner, Administrator or Manage Server | SATISFIED | Truths 1, 2, 3 |
| L8O-R2 | 261002-l8o-PLAN | Only the server writes discord_server_id; shared server resolves to the oldest active guild | SATISFIED | Truths 4, 5 |
| L8O-R3 | 261002-l8o-PLAN | Policy helpers take no user id; reads unchanged | SATISFIED | Truth 6 |
| L8O-R4 | 261002-l8o-PLAN | Aliases point only at active members (route and database) | SATISFIED | Truth 7 |
| L8O-R5 | 261002-l8o-PLAN | redeem_invite_code via service role, executable only by service_role | SATISFIED | Truth 8 |
| DELIVERY-R1 | 261002-l8o-PLAN | Proof, shape test, route tests, regression, neutral wording, local commits | SATISFIED | Truth 9 |

These IDs are local to the quick task; REQUIREMENTS.md lists none of them, so there are no orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (added lines, all files) | - | TBD, FIXME, XXX, TODO, HACK, placeholder | none found | - |
| supabase/migrations/20261002120000_guild_discord_links_and_helper_rules.sql | 142 | one header comment line runs long ("...character_id. Several guilds may still share one Discord server (for example") | Info | Formatting only |
| scratchpad/pr1-check-l8o.txt | last line | `PR1 OK` is followed by an appended `PR1 worktree gone` line, so the file does not literally end with `PR1 OK` | Info | `PR1 OK` was written by the A-2 chain only after tsc and vitest succeeded; the extra line came from the cleanup step |

### Notes

- OD-01 trade-off, visible after PR 1: the check needs the Discord provider token in the current Supabase session. The create page's typed-in server id fallback (offered when the picker cannot load) and any guild settings link change after the session has refreshed now return the existing reconnect message until the user signs in with Discord again. This was accepted in OD-01 (T-l8o-09); human item 3 covers it.
- Changing the guild settings link also refetches the icon through the bot before saving (GuildSettingsContent 198-221); when the save is refused nothing is written, so this is unchanged behavior.
- OD-04 (raid summary channel belongs to the linked server) is a recorded follow-up and not part of this task.

### Human Verification Required

### 1. Production catalog checks around PR 2

**Test:** Before merging PR 2, run catalog queries 1, 2, 4 and 5 (SUMMARY) in the Supabase SQL editor; after the deploy, run queries 1 to 3.
**Expected:** Before: two policies from query 1, pg_policy 2 and no naming function from query 2. After: no rows from queries 1 and 2; query 3 as listed in the SUMMARY.
**Why human:** Production catalog state; no SQL against a real database from here.

### 2. Deploy order

**Test:** Merge PR 1, wait for the production deploy, then merge PR 2 with --admin.
**Expected:** No window in which guild creation with a server or invite redemption fails.
**Why human:** Live deploy action (OD-05).

### 3. Real Discord flows

**Test:** With a fresh Discord sign-in: link a managed server in guild settings, try a server you only belong to, create a guild from the picker, redeem an invite; repeat creation and redemption after PR 2.
**Expected:** Managed server saves; other server shows COPY-1 and nothing changes; creation links the server and fetches the icon; invites work. A lapsed token shows the reconnect message and a fresh sign-in resolves it.
**Why human:** Real OAuth provider token and Discord API; automated tests stub both.

### Gaps Summary

No gaps. Every must-have holds in the code and is backed by a passing behavioral test or the re-run PGlite harness: the manage rule and its single predicate, the change-only trimmed check, service-role link writes and rollbacks with separate user and service mocks, the guilds link trigger beside the unchanged owner trigger, the deterministic bot order, the policy helper swap with deep-equal reads for anon and six users and the refused control drop, the alias route and trigger (with the documented RLS-error mask for non-officers), and the service-role-only invite RPC. Delivery checks hold: separate app and migration commits, a PR 1 tree that is exactly HEAD minus the three migration-side files and passed tsc and the route tests on origin/main, clean tsc and eslint, no new full-suite failures, verbatim COPY-1 and COPY-2, and no em dashes. What remains are the three post-merge checks above.

---

_Verified: 2026-10-03T04:25:00Z_
_Verifier: Claude (gsd-verifier)_
