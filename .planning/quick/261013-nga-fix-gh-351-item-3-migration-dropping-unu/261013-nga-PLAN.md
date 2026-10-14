---
quick_id: 261013-nga
slug: fix-gh-351-item-3-migration-dropping-unu
date: 2026-10-13
status: complete
---

# 261013-nga: Drop unused update_guild_icon and update_guild_info (GH #351 item 3)

## Objective

Remove the two uncalled SECURITY DEFINER functions `public.update_guild_icon` and `public.update_guild_info` with a forward migration, drop their entries from `lib/database.types.ts`, and pin both with a shape test. Third and last item of #351 (items 1 and 2 are PR #401).

## Context

- WT = `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357` (detached at origin/main 523e2efe). All commands run from WT. Never touch `/Users/alexander.mayes/Code/personal/loot-list-plus`. `WT/node_modules` is a symlink to the primary install: never unlink it, never run `npm ci` or `npm install`.
- Definitions: `supabase/migrations/20260101000000_baseline_schema.sql` lines 1124-1195 (owner-only check, comment says only the guild creator can call). Baseline grants at 4559-4567.
- `supabase/migrations/20260930000200_tighten_function_execute_grants.sql` lines 92-95 (REVOKE/GRANT, service_role only) and 163 (search_path pin on update_guild_info). Forward-only; it and `app/services/__tests__/function-execute-grants-migration.test.ts` stay untouched. That test reads only its own file, plus a scan of later migrations for CREATE FUNCTION without REVOKE (the new file has no CREATE, so it stays green).
- Only app reference: `lib/database.types.ts` lines 2385-2399. No later migration, policy, trigger or view references either function (grep confirmed), so a drop without CASCADE succeeds.
- Patterns: drop precedent `20261002120000_guild_discord_links_and_helper_rules.sql` line 269; test helpers `stripComments`, `splitStatements`, `blankStrings` in `app/services/__tests__/guild-discord-links-and-helper-rules-migration.test.ts` lines 1-90; header style in `20261004040000_loot_item_officer_notes_officers_only.sql`; rules in `supabase/migrations/README.md` (forward-only, one file per change).

## Tasks

### Task 1: Shape test first (RED)

File: `app/services/__tests__/drop-unused-guild-update-functions-migration.test.ts` (new).

Copy (do not import) `stripComments`, `splitStatements`, `blankStrings` from the #361 test. Constants: `MIGRATION_TIMESTAMP = '20261013120000'`, file `20261013120000_drop_unused_guild_update_functions.sql`, `BASELINE_FILE`, `TYPES_FILE = lib/database.types.ts`, repo root `path.resolve(__dirname, '../../..')`. Signatures as constants:
- ICON = `"public"."update_guild_icon"("p_guild_id" "uuid", "p_icon_url" "text")`
- INFO = `"public"."update_guild_info"("p_guild_id" "uuid", "p_name" "text", "p_realm" "text", "p_faction" "text", "p_discord_server_id" "text")`

Tests:
1. File exists; no other `.sql` in migrations shares the 14-char timestamp; `Number(MIGRATION_TIMESTAMP) > 20261004040000`.
2. Exactly 4 statements, in order (whitespace collapsed): `SET LOCAL lock_timeout = '5s'`; `DROP FUNCTION IF EXISTS ${ICON}` (toBe, exact); `DROP FUNCTION IF EXISTS ${INFO}` (toBe, exact); then one statement starting `DO $$` and ending `$$`.
3. Each signature appears in the baseline as `CREATE OR REPLACE FUNCTION ${SIG} RETURNS` (cross-check that the DROP args match the real definition).
4. No other statement kinds: after `blankStrings`, no statement starts with CREATE, ALTER, INSERT, UPDATE, DELETE, GRANT, REVOKE, TRUNCATE or COMMENT; the code (comments stripped) has no `CASCADE`; the DO body (strings blanked) has no word match for CREATE, ALTER, INSERT, UPDATE, DELETE, GRANT, REVOKE, DROP or TRUNCATE.
5. DO body contains `pg_proc`, `pg_namespace`, `'public'`, `'update_guild_icon'`, `'update_guild_info'` and `RAISE EXCEPTION`.
6. No string literal contains `--`: take raw lines whose trimmed form does not start with `--`, collect every `'(?:[^']|'')*'` match, assert none contains `--` (this is what makes `stripComments` safe).
7. Header: raw file matches `^-- <heading>$` (m flag) for Problem, Fix, Error contract, Production safety, Not changed, Deploy, Rollback; raw file does not contain the em dash U+2014 (build it in the test as `String.fromCharCode(0x2014)` so the test file never contains the literal character).
8. Types: `lib/database.types.ts` contains neither `update_guild_icon:` nor `update_guild_info:`, and still contains `seed_tbc_expansion_for_guild:`.
9. No callers: recursive `fs` walk over existing roots `app`, `components`, `lib`, `domain`, `utils`, `scripts`, `__tests__`, `companion/src`, `discord-bot` (skip missing roots; skip dirs named `node_modules`, `.next`, `dist`, `out`, `build`, `coverage`, `.git`); extensions `.ts .tsx .js .jsx .mjs .cjs .sql`. Collect repo-relative paths whose text includes `update_guild_icon` or `update_guild_info`. Expect exactly `['app/services/__tests__/drop-unused-guild-update-functions-migration.test.ts', 'app/services/__tests__/function-execute-grants-migration.test.ts']` (sorted; this test file names them itself; migrations live under `supabase/` and are out of scan scope). Keep it synchronous and under a second.

Header comment of the test: one paragraph naming quick task 261013-nga and GH #351 item 3, plain hyphens only.

Verify RED: `npx vitest run app/services/__tests__/drop-unused-guild-update-functions-migration.test.ts` fails (migration missing, types still present).

### Task 2: Migration and types edit (GREEN)

File A: `supabase/migrations/20261013120000_drop_unused_guild_update_functions.sql` (new). Header in house style (title line, then `-- Heading` / `-- -------` sections), no em dashes, plain hyphens or commas:
- Title: `-- Drop the unused guild update functions update_guild_icon and update_guild_info.`
- Problem: both are SECURITY DEFINER functions from the baseline that let the guild creator change icon_url, or name, realm, faction and discord_server_id. Nothing in the app, the Discord bot, the companion or scripts calls them, and since 20260930000200 only service_role can execute them, so they are dead code with write power over guilds (GH #351).
- Fix: drop both by exact signature. No CASCADE, so the drop refuses if anything still depends on them. The DO block at the end stops the migration if either name still exists in schema public.
- Error contract: any call to either function, by any role including service_role, now gets PostgreSQL 42883 (function does not exist); through PostgREST it is PGRST202. anon and authenticated already got 42501. No app path is affected because none calls them.
- Production safety: DROP FUNCTION locks only the function objects, not the guilds table. SET LOCAL lock_timeout gives up after 5 seconds instead of queueing, and a timeout rolls the whole file back so the next deploy runs it again. IF EXISTS makes it idempotent; no data changes. Their grants and comments go with them.
- Not changed: the guilds table, its rows, policies and triggers (enforce_guild_discord_link_rules still guards discord_server_id). Every other function. 20260930000200, which stays as shipped (forward-only). The #361 helpers get_current_user_guild_ids and get_current_user_guildmate_ids.
- Deploy: normal PR. It also changes lib/database.types.ts and adds a test, so CI runs and no admin override is needed. The migration deploys about 12 seconds after merge.
- Rollback: a forward migration that re-creates both functions from the baseline definition (the CREATE OR REPLACE FUNCTION, ALTER FUNCTION OWNER and COMMENT statements at 20260101000000 lines 1124-1195), then applies the 20260930000200 REVOKE and GRANT pairs and the search_path pin on update_guild_info, restores them exactly (the REVOKE is required, CREATE grants EXECUTE to PUBLIC by default). Nothing in the app or in the #361 helpers references them, so the app never needs the rollback.

Body, exactly:
```sql
SET LOCAL lock_timeout = '5s';

DROP FUNCTION IF EXISTS "public"."update_guild_icon"("p_guild_id" "uuid", "p_icon_url" "text");

DROP FUNCTION IF EXISTS "public"."update_guild_info"("p_guild_id" "uuid", "p_name" "text", "p_realm" "text", "p_faction" "text", "p_discord_server_id" "text");

DO $$
DECLARE
  v_name text;
BEGIN
  FOR v_name IN
    SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('update_guild_icon', 'update_guild_info')
  LOOP
    RAISE EXCEPTION 'public.% still exists after the drop', v_name;
  END LOOP;
END
$$;
```

File B: `lib/database.types.ts`. Delete exactly lines 2385-2399 (the `update_guild_icon: {...}` and `update_guild_info: {...}` entries) so `seed_tbc_expansion_for_guild` is followed directly by the `    }` that closes `Functions`. Nothing else changes.

Verify GREEN (all from WT):
- `npx vitest run app/services/__tests__/drop-unused-guild-update-functions-migration.test.ts app/services/__tests__/function-execute-grants-migration.test.ts` passes.
- `npx vitest run app/services/__tests__` passes (several shape tests scan every migration file).
- `npm run typecheck` passes.
- `npx eslint app/services/__tests__/drop-unused-guild-update-functions-migration.test.ts` is clean.
- `git diff --numstat lib/database.types.ts` prints `0	15	lib/database.types.ts`.
- `LC_ALL=C grep -n $'\xe2\x80\x94' supabase/migrations/20261013120000_drop_unused_guild_update_functions.sql app/services/__tests__/drop-unused-guild-update-functions-migration.test.ts` prints nothing.

### Task 3: Timestamp collision check (before commit)

- `git fetch origin`; `git ls-tree --name-only origin/main supabase/migrations/ | grep 20261013120000` prints nothing, and the newest timestamp on origin/main is below 20261013120000.
- `gh pr view 401 --json files --jq '.files[].path' | grep supabase/migrations` shows no file with the same timestamp.
- On a clash, move to the next free `202610131X0000`, renaming the file and updating `MIGRATION_TIMESTAMP`, then re-run the Task 2 checks.

## Commit and PR

1. `git switch -c fix/351-drop-unused-guild-functions origin/main` (if origin/main moved past 523e2efe, re-run the Task 2 checks on the new base).
2. Stage exactly the three files: the migration, `lib/database.types.ts`, the new test. `git status --short` must show no staged `.planning/` path.
3. One commit, message:
   - Subject: `fix(db): drop unused update_guild_icon and update_guild_info functions (GH #351)`
   - Body: two short lines (drops both by exact signature with a guard block, removes their generated types, adds a shape test pinning the statements and that no code calls them), blank line, then the trailer as the final line: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
4. `git push -u origin fix/351-drop-unused-guild-functions`.
5. Write the PR body to a scratch file outside the repo, then `gh pr create --base main --head fix/351-drop-unused-guild-functions --title "fix(db): drop unused update_guild_icon and update_guild_info (GH #351)" --body-file <scratch file>`. Body: Summary (what and why), Changes (three files), Safety (no CASCADE, guard DO block, lock_timeout, no callers test), Test plan (the Task 2 commands with results), the line `Third and last item of #351; items 1 and 2 are PR #401.`, and as the last line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Do not use `Closes #351`.
6. Do not merge. Report the PR URL and commit hash.

## Must not

- No em dashes in any file (migration, test, commit message, PR body). Use plain hyphens or commas.
- Do not edit any pushed migration, including `20260101000000_baseline_schema.sql` and `20260930000200_tighten_function_execute_grants.sql`, or `function-execute-grants-migration.test.ts`.
- Do not touch the primary checkout `/Users/alexander.mayes/Code/personal/loot-list-plus`.
- Do not commit planning docs (anything under `.planning/`) on the code branch.
- Do not run `npm ci` or `npm install`, and do not unlink or replace `WT/node_modules`.
- Do not use CASCADE, do not change any other function, grant or policy, and do not regenerate `lib/database.types.ts` wholesale.
- Do not merge the PR or use the admin merge override.
