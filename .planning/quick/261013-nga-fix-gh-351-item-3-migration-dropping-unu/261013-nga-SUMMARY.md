---
phase: quick-261013-nga
plan: 01
subsystem: database
tags: [migration, functions, gh-351]
requirements: [GH-351]
key-files:
  created:
    - supabase/migrations/20261013120000_drop_unused_guild_update_functions.sql
    - app/services/__tests__/drop-unused-guild-update-functions-migration.test.ts
  modified:
    - lib/database.types.ts
status: complete
completed: 2026-10-13
---

# Quick 261013-nga: Drop unused update_guild_icon and update_guild_info (GH #351 item 3)

The two SECURITY DEFINER guild update functions from the baseline had no callers anywhere in the app, bot, companion or scripts and were service-role only since 20260930000200. A new migration drops them by exact signature and the generated types no longer list them.

## Commits (branch fix/351-drop-unused-guild-functions, PR #407)

- `01281449` fix(db): drop unused update_guild_icon and update_guild_info functions (GH #351)

## What changed

- `supabase/migrations/20261013120000_drop_unused_guild_update_functions.sql`: `SET LOCAL lock_timeout = '5s'`, two `DROP FUNCTION IF EXISTS` statements with the full signatures (no CASCADE), and a DO block that raises if either name still exists in schema public. House-style header covers problem, fix, error contract (42883 / PGRST202 for any caller), production safety, what is not changed, deploy and rollback.
- `lib/database.types.ts`: the `update_guild_icon` and `update_guild_info` entries removed from `Functions` (14 lines).
- `app/services/__tests__/drop-unused-guild-update-functions-migration.test.ts`: nine cases pinning the statement order and signatures, no CREATE/ALTER/GRANT/REVOKE/DML, no `--` inside string literals, the types file no longer naming either function, and a source scan proving no caller outside the grants test and this test.

## Verification

- New test plus `function-execute-grants-migration.test.ts`: 2 files, 25 tests passed (RED first: 8 failing before the migration and types edit).
- `npx vitest run app/services/__tests__`: 24 files, 336 tests passed (several shape tests scan every migration file).
- `npm run typecheck`: clean. `npm run lint`: 0 errors, 379 pre-existing warnings.
- No em dash bytes in the migration, the test or the commit.
- `20260930000200_tighten_function_execute_grants.sql` and the baseline are untouched (forward-only).

## Deviations from Plan

- The plan's line range for `lib/database.types.ts` was off by one (2385-2398, not 2385-2399); the executor restored the file and re-applied the correct range.

## Flags for the user

- Normal PR, not migration-only: it also changes `lib/database.types.ts` and adds a test, so CI runs and no admin merge override is needed (same shape as PR #361). The migration deploys about 12 seconds after merge.
- With PR #401 (items 1 and 2) this closes out #351; close the issue once both are merged.

## Known Stubs

None.

## Threat Flags

None. The drop removes write power over guilds that nothing used.
