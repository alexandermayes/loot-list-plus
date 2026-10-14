---
phase: quick-261013-jmz
plan: 01
subsystem: api
tags: [guilds, delete-account, supabase, cleanup, gh-351]
requires: []
provides:
  - POST /api/guilds without the duplicate default roles insert
  - POST /api/user/delete-account without the broken loot_submission_items step
affects:
  - app/api/guilds/route.ts
  - app/api/user/delete-account/route.ts
key-files:
  modified:
    - app/api/guilds/route.ts
    - app/api/guilds/__tests__/route.test.ts
    - app/api/user/delete-account/route.ts
status: complete
completed: 2026-10-13
actuals:
  tasks: 2
  commits: 2
---

# Quick 261013-jmz: GH #351 server cleanups Summary

Removed two always-failing database steps from the guild create and account delete routes, and locked the first in with a regression test.

## Commits (branch fix/351-server-cleanups, not pushed)

- `fb1a9862` fix(guilds): drop the duplicate default roles insert on guild create (GH #351)
- `1cd0f336` fix(account): stop deleting loot_submission_items by a missing character_id column (GH #351)

## What changed

**Task 1: POST /api/guilds.** Deleted the route's own insert of Member, Officer and Guild Master into `guild_roles` and its error log. The `create_guild_default_roles` trigger (AFTER INSERT ON guilds) already inserts those rows, so the route's insert always hit `unique_role_per_guild` (23505). A two-line comment now names the trigger and GH #351. In the test file, `createMockSupabase` now records every `from()` table name in a `fromCalls` array, and a new describe "POST /api/guilds default roles (GH #351)" asserts a successful create returns 200, reaches `guild_settings` (user client) and `guild_invite_codes` (service client), and never asks for `guild_roles`.

**Task 2: POST /api/user/delete-account.** Deleted step 4, which deleted `loot_submission_items` filtered by a `character_id` column that table does not have (42703 on every account deletion). The rows are removed by `loot_submission_items_submission_id_fkey ON DELETE CASCADE` when the `loot_submissions` delete runs; a one-line comment says so. Step comments renumbered, now 1 through 10 with no gaps.

## TDD observation (Task 1)

- Red: against the unchanged route the new test failed with `expected [ 'user_preferences', 'guilds', ...(6) ] to not include 'guild_roles'` (20 passed, 1 failed in the file).
- Green: after removing the block, all pass.

## Verification

- `npx vitest run app/api/guilds`: 7 files, 83 tests passed (82 baseline plus 1 new).
- `npx eslint` on the three touched files: clean.
- `npm run typecheck`: clean, no errors anywhere (no pre-existing errors).
- `git log --oneline origin/main..HEAD`: exactly the two commits above.
- `git diff --stat origin/main..HEAD`: only the three code and test files, no `.planning/` paths.
- No em dash in added lines or in the two commit messages.

## Deviations from Plan

- Commit trailer: used `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` as directed by the orchestrator.
- Task 2 deletion removed the blank line after the removed block as well, so spacing stays single-blank between steps (same as the plan's intent).

Otherwise none; plan executed as written.

## Not done (left for a separate task)

The third item in GH #351, dropping the unused `update_guild_icon` / `update_guild_info` database functions, is a migration and was intentionally not part of this task. Migration-only PRs need `--admin` merge per project CI notes.

## Known Stubs

None.
