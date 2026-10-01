---
phase: quick-260930-f0m
plan: 01
subsystem: database, api
status: complete
tags: [supabase, rls, guild-membership, guild-join, pglite]
requires:
  - 20260930000100 (membership rows written only by the server; guilds.created_by server-managed)
  - 20260930000200 and 20260930000300 (function EXECUTE grants)
provides:
  - public.guild_join_grants (service-role-only join record table) with a one-time backfill
  - domain/guild/join-grants.ts (recordGuildJoinGrant, resolveGuildJoinAccess, consumeGuildJoinGrant)
  - access rule on POST /api/characters/[id]/guilds and POST /api/battlenet/characters/import
  - join records written by POST /api/guild-invites/[code] and POST /api/discord-guilds/join
affects:
  - CreateCharacterModal, CharacterSelector and BattlenetCharacterPickerModal (403 "You are not a member of this guild" when no access path applies)
tech-stack:
  added: []
  patterns:
    - service-role-only table (RLS on, no policies, REVOKE ALL FROM PUBLIC, anon, authenticated) as in 20260928180000
    - server-only domain helper taking the service-role client, throwing on lookup errors (fail closed), constant log messages
key-files:
  created:
    - supabase/migrations/20260930100000_create_guild_join_grants.sql
    - domain/guild/join-grants.ts
    - domain/guild/__tests__/join-grants.test.ts
    - app/services/__tests__/guild-join-grants-migration.test.ts
    - app/api/guild-invites/[code]/__tests__/route.test.ts
    - app/api/discord-guilds/join/__tests__/route.test.ts
    - app/api/battlenet/characters/import/__tests__/route.test.ts
  modified:
    - app/api/characters/[id]/guilds/route.ts
    - app/api/characters/[id]/guilds/__tests__/route.test.ts
    - app/api/guild-invites/[code]/route.ts
    - app/api/discord-guilds/join/route.ts
    - app/api/battlenet/characters/import/route.ts
decisions:
  - "OD-1: backfill everyone waiting now, no age window; per A-1 there is no post-deploy re-run, only a read-only count query"
  - "OD-2: single use, 30 days from the join; a new join upserts the row and starts a fresh 30 days"
  - "OD-3: included; a membership written through a join record starts as trial when guild_settings.new_members_start_as_trial is true"
  - "OD-4: the 403 reuses 'You are not a member of this guild'; no new user-facing text"
  - "Check and consume are not atomic (A-2); accepted because the member path allows further characters once the first membership lands"
metrics:
  duration: 25min
  completed: 2026-09-30
  tasks: 3
  files: 12
estimate:
  tokens: 240000
  tasks: 3
actuals:
  tokens: 24600
  tasks: 3
  commits: 5
---

# Quick Task 260930-f0m: Require a server-side join record before a character is added to a guild

**A character is now added to a guild only for the guild's creator, for a user who already has another active character in it, or for a user whose invite or Discord join the server recorded. The record lives in a new service-role-only table, is used up by the membership write it allows, and expires after 30 days.**

All work is local on `fix/guild-join-records` in WT (`scratchpad/wtjr`), from origin/main 678806b7. Nothing was pushed and no PR was opened.

## Commits (local, each with the Co-Authored-By trailer)

| # | Hash | Message |
|---|------|---------|
| 1 | 00d5658a | fix(guilds): add a service-role-only guild join record table and helper |
| 2 | da622c32 | fix(guilds): add a character to a guild only for its creator, an existing member or a recorded join |
| 3 | c8bc0d9e | fix(guilds): invite joins record the join for users who have no character yet |
| 4 | f3528f9b | fix(guilds): Discord joins record the join and the Battle.net import follows the same guild rule |
| 5 | 509c32ae | test(guilds): build the em dash check character from its code point |

Task 1 is commits 1 and 2 (the split A-4 allows). Task 2 is commit 3. Task 3 is commit 4. Commit 5 is a small follow-up to the Task 2 shape test (see Deviations).

## Migration: supabase/migrations/20260930100000_create_guild_join_grants.sql

The timestamp is unique in the directory and later than 20260930000300. The statements, in order (the shape test locks this list):

1. `CREATE TABLE IF NOT EXISTS "public"."guild_join_grants"`: user_id uuid NOT NULL, guild_id uuid NOT NULL, source text NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, expires_at timestamptz DEFAULT (now() + interval '30 days') NOT NULL, consumed_at timestamptz. Constraints: `guild_join_grants_pkey` PRIMARY KEY (user_id, guild_id); `guild_join_grants_source_check` (invite_code, discord_verify, backfill); `guild_join_grants_expires_check` (expires_at > created_at); user_id FK to auth.users ON DELETE CASCADE; guild_id FK to public.guilds ON DELETE CASCADE.
2. `CREATE INDEX IF NOT EXISTS "idx_guild_join_grants_guild_id"`.
3. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` (no policies).
4. `REVOKE ALL ON TABLE ... FROM PUBLIC, "anon", "authenticated"`.
5. `GRANT ALL ON TABLE ... TO "service_role"`.
6. `COMMENT ON TABLE`.
7. The one-time backfill `INSERT ... SELECT ... ON CONFLICT ("user_id", "guild_id") DO NOTHING`. It takes users with an active guild set, no active character, who did not create that guild, have no character with a class set, and have no active membership in that guild. It has no age window (OD-1).

The migration creates no function, trigger, policy or view. The header has Background, Table, Access, Backfill and Rollback sections. The Rollback section is the single statement `DROP TABLE IF EXISTS "public"."guild_join_grants";`, run after the route changes are reverted.

## Access rule and where records are used up

`resolveGuildJoinAccess(service, { userId, guildId, excludeCharacterId? })` checks in this order and stops at the first path that allows:

1. **creator:** `guilds.created_by` is the user. A missing guild is not allowed, so the 403 does not say whether the guild exists.
2. **member:** another of the user's characters has an active membership in the guild. If the user has no character other than the excluded one, the membership query is skipped, so `.in()` is never called with an empty list (A-3).
3. **grant:** a join record exists with consumed_at NULL and expires_at later than now.

If none applies, the result is `{ allowed: false }`. Any lookup error throws, and the route's existing catch returns 500 "Internal server error" with no write.

- **POST /api/characters/[id]/guilds:** the check runs after the 404, 400 and 409 checks and before any insert or reactivation, with `excludeCharacterId` set to the route's character. If access is denied it returns 403 `{ error: 'You are not a member of this guild' }` and writes nothing. For access through a join record, trial fields are added when the guild has trial for new members on (OD-3).
- **POST /api/battlenet/characters/import:** the service client is now created before the Battle.net fetch. When a guildId is sent, the check runs right after the version check. If access is denied it returns the same 403 before any Battle.net request or write. Without a guildId nothing changes. OD-3 trial fields are added to the upsert for access through a join record.
- **Writers (recordGuildJoinGrant):** the no-character branch of POST /api/guild-invites/[code] (source invite_code) and of POST /api/discord-guilds/join (source discord_verify) writes the record before the user_active_characters upsert. If that write fails, the route returns 500 "Couldn't join guild. Try again or contact an officer." and writes nothing else. It also skips the event and funnel calls in the invite route.
- **Consume (consumeGuildJoinGrant), called after each successful membership write:** characters route insert and reactivation; import upsert; invite insert and reactivation; Discord insert and reactivation. It is not called when the membership write failed, or in the Discord "Already a member" branch. A consume error is logged with a constant message and does not change the response.
- **Not atomic (A-2):** two parallel requests can both pass the check before either one uses up the record. This is accepted because, once the first membership write lands, the member path allows further characters anyway. The helper's doc comment says so.

## Verification

| Check | Baseline (678806b7) | Final (509c32ae) |
|-------|---------------------|------------------|
| Full vitest | 141 files, 2554 tests, 0 failed | 146 files, 2616 tests, 0 failed (+5 files, +62 tests) |
| npx tsc --noEmit | exit 0, no output | exit 0, no output |
| eslint --max-warnings 0 (changed files) | n/a | exit 0, no output |

The known flaky 5s timeout in quality-brand-token-parity did not appear. Outputs are in SP: baseline-f0m-vitest.txt, baseline-f0m-tsc.txt, final-f0m-vitest.txt, final-f0m-tsc.txt, final-f0m-eslint.txt, final-f0m-diff.txt and final-f0m-files.txt.

The full Task 3 verify chain passed (printed TASK3_VERIFY_OK). It checked: eslint, full vitest, tsc, no .planning path in the diff, no em dash and no vocabulary-gate match in added lines or commit messages, the trailer on all 5 commits, at least 3 commits, a clean tree, and no upstream.

**PGlite** (SP/pglite-f0m, scratchpad only, never committed). The harness loads the real baseline objects, the real characters and user_active_characters definitions, and the four baseline default-privilege statements. It then replays the function catalog (258 statements, 0 loader errors) and applies 20260930000000 to 20260930000300 whole before the new file.

- Tracer run: `SP/pglite-f0m/run-output-f0m-task1.txt`, 57 PASS, 0 FAIL.
- Full run: `SP/pglite-f0m/run-output-f0m.txt`, 93 PASS, 0 FAIL. It covers:
  - (a) the default-privilege control: a new table gives anon SELECT and authenticated INSERT;
  - (b) the migration applies, and the public function count is unchanged;
  - (c) no anon or authenticated privilege on the table, an ACL of postgres and service_role only, RLS on, no policies, the five named constraints and the index;
  - (d) 42501 for anon and signed-in SELECT, INSERT, UPDATE and DELETE;
  - (e) the RLS second layer under a temporary grant;
  - (f) service-role upsert, lookup, consume (1 row, then 0), reset by a new join, expired record not found, creator, own-characters and member lookups;
  - (g) the membership insert after an allowed check passes the 20260930000100 rules;
  - (h) the backfill writes exactly P1, P2 and P3 (P2's row is 400 days old), with no row for R, M, N, C, A, Z or K;
  - (i) a re-apply adds no rows and does not reopen a consumed record;
  - (j) 23514 for source 'officer' and for expires_at = created_at;
  - (k) guild and user deletes cascade;
  - (l) a user_active_characters write by the user's own session creates no record;
  - (n) the A-1 count query runs and counts correctly;
  - (m) the header Rollback drops the table inside a transaction.
- Parse: `SP/pglite-f0m/parse-output-f0m.txt`. OK for all 7 statements and the rollback (DropStmt), 0 failed, plus OK for the A-1 count query (SelectStmt).
- Harness files: `scenarios-f0m.mjs`, `scenarios-f0m-full.mjs`, `a1-count-query.sql`, and copies of `fn-catalog.mjs` and `scenarios-wcr-all.mjs`. In the copies, WT points at wtjr and the loader skips the four 20260930 files and the new file. SP/pglite-all was not modified.

**Membership write scan (Task 2 "executor verifies first"):** this scanned every `.from('character_guild_memberships')` chain in app, lib, utils, domain, discord-bot and companion, and every migration. The only inserts, upserts or is_active true updates are:
- POST /api/guilds (creator);
- the invite route insert and reactivation;
- the Discord route insert and reactivation;
- the characters route insert and reactivation;
- the import upsert.

The other updates set role or membership status only (guild-members, trial-status, auto-promote-trials, transfer-ownership, guild-roles). No migration SQL inserts or reactivates memberships. The dev scripts under scripts/ and the admin route are unchanged, as in investigation finding 1. No other path was found.

## After the deploy: read-only count query (A-1)

Do not re-run the backfill after the deploy: user_active_characters can be written by the user's own session. Instead, after the Vercel deploy finishes, run this read-only query once in the Supabase SQL editor. Replace the two timestamps with the time the migration applied and the time the deploy finished. The earliest `created_at` of the `source = 'backfill'` rows is a good value for the first timestamp. The expected count is 0 or a handful. Handle any such user case by case, for example with a fresh invite.

```sql
SELECT count(*) AS waiting_without_record
FROM public.user_active_characters uac
JOIN public.guilds g ON g.id = uac.active_guild_id
WHERE uac.updated_at >= '2026-10-01 00:00:00+00'::timestamptz  -- migration applied at
  AND uac.updated_at <= '2026-10-01 00:05:00+00'::timestamptz  -- Vercel deploy finished at
  AND uac.active_character_id IS NULL
  AND g.created_by IS DISTINCT FROM uac.user_id
  AND NOT EXISTS (
    SELECT 1 FROM public.characters c
    WHERE c.user_id = uac.user_id AND c.class_id IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.character_guild_memberships m
    JOIN public.characters c ON c.id = m.character_id
    WHERE c.user_id = uac.user_id
      AND m.guild_id = uac.active_guild_id
      AND m.is_active = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.guild_join_grants j
    WHERE j.user_id = uac.user_id AND j.guild_id = uac.active_guild_id
  );
```

## Deviations from Plan

1. **[Tracer gate] Checked automatically instead of stopping at a checkpoint.** Auto mode is off, so the executor rules would normally stop for a human-verify checkpoint after the tracer. The orchestrator asked for all three tasks to finish (A-4), and the tracer's verify is fully automated. So the tracer verify was re-run end to end (helper and route tests 33/33, PGlite 57 PASS / 0 FAIL) before expanding.
2. **[TDD order] Helper and Task 3 tests.** The helper test file was written before the helper, but it was first run after the helper existed, because the baseline suite was still running. For Task 3, the Discord and import route changes were written before their tests. RED was shown afterwards by running the new tests against the origin/main route files (11 failed, 6 passed) and then GREEN (17/17). The characters route (10 failed before the change), the shape test (3 failed) and the invite route (4 failed) followed RED then GREEN in order.
3. **[Rule 3] Removed an unused guild read in POST /api/guild-invites/[code].** `const { data: guildData } = await supabase.from('guilds').select('realm')...` was never used. It raised the only eslint warning, which blocked the `--max-warnings 0` gate on that directory. It was already on origin/main. Removing it changes no response. Commit c8bc0d9e.
4. **[Rule 1] Em dash character in the shape test.** The shape test's "no em dash" check was meant to be written as a Unicode escape for U+2014, but the file ended up holding the literal character, and the Task 3 added-lines gate caught it. Fixed with `String.fromCharCode(0x2014)`. Commit 509c32ae.
5. **Rollback header format.** The Rollback heading line carries the prose ("revert the route changes first ..."), so that the indented Rollback lines are only the SQL the PGlite and parse harnesses run. This was done in commit 2, before the shape test locked it.
6. **Helper detail.** The member query filters out excludeCharacterId both in the id list (needed for the A-3 early return) and with `.neq('character_id', ...)` as the plan specified.
7. **PGlite fixtures beyond the plan list.** C creates its own guild (GC) instead of reusing G2. Fixture N was added (a character with no class and an active G1 membership), so the active-membership condition of the backfill is tested on its own. Scenario (n) was added to prove the A-1 query. NOT NULL entries, which this PGlite build lists in pg_constraint, are left out of the constraint-name check.
8. **STATE.md and ROADMAP.md not updated.** The orchestrator's constraints for this quick task cover only this SUMMARY.

## Follow-ups (not changed here; investigation finding 8)

- A guild creator who imports their first character through Battle.net gets the default role instead of Guild Master. The import now allows the creator path, but its upsert still uses getDefaultRoleName.
- CreateCharacterModal only logs a failed guild attach, so a 403 there is silent to the user before the page reloads.
- An alt added through the member path gets full status even when the user's other character is on trial.
- CreateCharacterModal reads a sessionStorage key, pending_guild_join, that nothing sets.
- The no-character path now applies new_members_start_as_trial when the first character is added through a join record (OD-3 included). There is no remaining trial follow-up.

## Known Stubs

None.

## Threat Flags

None. The new table and the access checks are the surfaces the plan's threat model covers (T-f0m-01 to T-f0m-09). No new endpoint, auth path or client-facing policy was added.

## Self-Check: PASSED

- All 12 changed files exist in WT (supabase/migrations/20260930100000_create_guild_join_grants.sql, domain/guild/join-grants.ts, its test, the shape test, four routes and four route test files).
- Commits 00d5658a, da622c32, c8bc0d9e, f3528f9b and 509c32ae are on fix/guild-join-records. The tree is clean and the branch has no upstream.
- SP/pglite-f0m/run-output-f0m-task1.txt (57 PASS), run-output-f0m.txt (93 PASS) and parse-output-f0m.txt (0 failed) exist.

## Delivery (orchestrator, 2026-10-01)

- PR #332 squash-merged as 4a085a4f after every CI check passed on 509c32ae.
- Deploy Migrations applied 20260930100000_create_guild_join_grants.sql in production at 16:41 UTC. The Vercel production deploy succeeded.
- Still open: the A-1 read-only count query (once, in the Supabase SQL editor) and the manual join smoke tests listed in the verification report.
