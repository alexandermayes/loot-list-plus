---
phase: quick-261028-0gx
plan: 01
subsystem: loot-list
tags: [loot-list, awards, slot-lock, supabase-migration, rls, security-definer, settings, help]
requires:
  - loot_submission_items and save_submission_items (20260727000001 definition)
  - loot_history awards from the bulk route and the addon writers
provides:
  - public.loot_list_slot_locks (one row per award, live while released_at is null)
  - guild_settings.award_slot_lock_enabled (opt-in, default false)
  - save_submission_items refuses a save that breaks a live lock (SQLSTATE 23514)
  - domain/loot/slot-locks.ts and lib/loot/slot-locks.ts
  - lock creation in the three award writers, release on reassignment and award deletion
  - submit 422, revert 409, remove-item 403 or officer release
  - locks on GET /api/loot-submissions and the bootstrap route, lock icon in the editor and officer review
  - settings toggle and help copy
affects:
  - every loot list save (the RPC check runs for all guilds; it only bites when a lock exists)
  - app/api/loot-submissions/remove-item (officer release path)
tech-stack:
  added: []
  patterns:
    - service-role-only write table with a member SELECT policy (REVOKE then GRANT SELECT to authenticated, ALL to service_role)
    - lock check inside the SECURITY DEFINER save RPC, one message shared by SQL and every route
    - award hook that never rejects (log and continue)
key-files:
  created:
    - supabase/migrations/20261028120000_award_slot_locks.sql
    - app/services/__tests__/award-slot-locks-migration.test.ts
    - domain/loot/slot-locks.ts
    - domain/loot/__tests__/slot-locks.test.ts
    - lib/loot/slot-locks.ts
    - lib/loot/__tests__/slot-locks.test.ts
    - app/components/__tests__/SearchableItemSelect.test.tsx
  modified:
    - lib/database.types.ts (identical hunk on both branches)
    - app/api/loot-history/bulk/route.ts
    - app/api/addon/loot-award/route.ts
    - app/api/addon/import-string/route.ts
    - app/api/loot-submissions/route.ts
    - app/api/loot-submissions/submit/route.ts
    - app/api/loot-submissions/remove-item/route.ts
    - app/api/loot-submissions/revert/route.ts
    - app/api/loot-list/bootstrap/route.ts
    - app/api/guild-settings/route.ts
    - app/contexts/LootListContext.tsx
    - app/components/SearchableItemSelect.tsx
    - app/(app)/loot-list/components/LootListContent.tsx
    - app/(app)/loot-submissions/components/LootSubmissionsContent.tsx
    - app/(app)/loot-management/components/SettingsModal.tsx
    - app/(app)/loot-management/components/LootSettingsContent.tsx
    - domain/types.ts
    - lib/help-content.ts
key-decisions:
  - "Locks live in their own table keyed by award, not as a stamp on loot_submission_items, because save_submission_items deletes and re-inserts every live row"
  - "Enforcement sits inside save_submission_items so the raider's own session cannot bypass it; routes repeat the check for a readable error"
  - "An award never fails because its lock did: lockAwardedSlots logs and returns"
  - "The approved list is found item-first (loot_submissions.raid_tier_id is legacy and never written by the editor)"
  - "domain/scoring untouched: the setting is optional on ScoringConfig, defaults.ts not edited, the false default lives in the column and the settings GET"
metrics:
  duration: "about 45 minutes wall clock (planner 22 min, executors in parallel 4 and 13 min)"
  tests_added: 86 new or added cases (36 migration, 32 domain, 18 lib, 3 component, 23 route cases across 7 files)
  full_suite: "253 files, 5049 tests passing on the code branch; app/services/__tests__ 32 files, 578 on the migration branch"
completed: 2026-10-28
status: complete
---

# Quick task 261028-0gx: award slot lock

**One line:** once a raider receives an item from their approved loot list, the rank it held stays locked to that item for the rest of the tier (opt-in per guild), so a lucky early drop cannot be re-ranked into the next chase item and the bracket points it used stay spent.

Origin: officer feedback on 2026-10-24 (no names recorded; this repo is public). Counts and aggregates only in this record.

## Branches and commits

| Branch | Commit | Subject | PR |
|---|---|---|---|
| feat/slot-lock-migration | 3df61a15 (3df61a15cfd37d9f4ba64ed76c09b29ae002ccf0) | feat(db): lock awarded loot list ranks for the rest of the tier | #468 (migration only, merge first with --admin) |
| feat/award-slot-lock | a5a869d4 (a5a869d45d7395df762659a3a9017b6f009532b3) | feat(loot-list): keep awarded ranks locked after an award | #469 (code, merge after #468 is live and copy is signed off) |
| feat/award-slot-lock | 8713c671 (8713c671920900c40511d92a5fd7cd4e62d8614f) | chore(help): explain locked ranks | #469 |
| gsd/quick-261028-0gx-award-slot-lock-keep-awarded-loot-list-r | this commit | docs(quick-261028-0gx) | docs-only PR, merge last |

Migration PR #468 CI: Test, Analyze (javascript-typescript), Analyze (actions), CodeQL, Companion and Vercel preview all pass.

## What was built

- **Table** `public.loot_list_slot_locks`: guild, submission, character, item, rank (1 to 50), slot (>= 1), `loot_history_id` (unique, cascade), `locked_at`, `released_at`, `released_by`, `release_reason` (`removed_by_officer` | `award_reassigned`, shape-checked against `released_at`). Partial unique index on the live position, index on the live submission. RLS on with one SELECT policy for active members of the list's guild; ALL revoked from PUBLIC, anon, authenticated; SELECT granted back to authenticated; ALL to service_role. 18 statements, expand-only, rollback in the header.
- **Setting** `guild_settings.award_slot_lock_enabled boolean not null default false`.
- **RPC** `save_submission_items` redefined from 20260727000001 with the lock check after the insert: `RAISE EXCEPTION 'Rank % is locked to %' USING ERRCODE = 'check_violation'`, highest rank first, item name falls back to `an awarded item`. Grants unchanged (anon revoked; authenticated and service_role execute).
- **Domain** `domain/loot/slot-locks.ts`: `shouldLockForReason` (null, '', score, loot_council, override lock; offspec and roll do not), `pickLockTarget` (copy N is the Nth highest live copy, falling back to the next unlocked row), `findLockViolations`, `lockViolationMessage`, `lockedRankTitle`.
- **Helper** `lib/loot/slot-locks.ts`: `lockAwardedSlots` (setting read, approved list found item-first, one upsert per award with `onConflict: loot_history_id, ignoreDuplicates`, never rejects; an item on two approved lists locks nothing with a warn), `fetchActiveSlotLocks`, `releaseSlotLock`.
- **Award writers**: bulk POST locks after the insert, awaited inline; addon loot-award and import-string lock new rows; bulk PATCH that changes or clears `character_id` releases; bulk DELETE releases through the cascade.
- **List writes**: submit 422 with `locked_ranks`, revert 409 with `locked_ranks`, remove-item 403 for an owner without `manage_submissions`, otherwise release before the soft delete and `lock_released` in the audit row.
- **Reads and UI**: GET loot-submissions and bootstrap return `locks`; `LootListContext` exposes locked positions and guards drag, clear-all and BiS import; `SearchableItemSelect` gets a `lockedTitle` prop (no select, no clear); the editor and officer review show the lock icon; the officer remove confirm gains a sentence when the row is locked; settings modal toggle; help sections and a glossary entry.

## Owner vetoes (defaults chosen without the owner, flip any of them)

1. D2: the setting is opt-in, default off.
2. D3: addon and no-reason awards lock (Gargul exports carry no reason).
3. D5: reassigning an award releases the first raider's lock and locks nothing for the new raider; clearing `character_id` (unlink) also releases.
4. remove-item: a list owner who also holds `manage_submissions` may release their own lock.
5. Copy strings S1 to S11 (sign-off pending, no em dashes): settings label `Lock awarded ranks`; settings help `Once a raider receives an item from their approved list, the rank it sat in stays locked to that item for the rest of the tier. Officers can release a lock by removing the item.`; lock icon title `Awarded from this rank on {Oct 24, 2026}. Locked for this tier.`; aria-label `Locked rank`; error `Rank {rank} is locked to {item name}`; officer remove confirm addition `This item was awarded from this rank, so removing it also releases the rank lock.`; settings 400 `award_slot_lock_enabled must be true or false`; name fallback `an awarded item`; help sections `Locked ranks` (raider, end of the submission-statuses article) and `Lock awarded ranks` (officer, end of the loot-management article); glossary `Locked rank`.

## Planner deviations and defaults

- Approved list found item-first (character + guild + status approved, then live rows for the item) instead of by `loot_submissions.raid_tier_id`, which the editor never writes.
- `domain/scoring/defaults.ts` not edited (the scoring gate); `award_slot_lock_enabled` is optional on `ScoringConfig`; the false default lives in the column and the settings GET no-row defaults.
- GRANT SELECT to authenticated beside the REVOKE so the member policy can apply (officer review reads locks through the browser session).
- The bootstrap route also returns locks (it seeds the editor cache without a refetch).
- `pickLockTarget` falls back to the next unlocked row when the numbered copy is already locked (a second award on another night).
- Locks are awaited inline in the bulk route so the lock exists when the officer's response returns.
- Read paths degrade to `[]` on a lock read error so the editor still loads; remove-item does not degrade (a failed read is a 500).
- `mutateSubmission` spreads the existing cache so locks and removed items survive a manual save.
- Executor: the PATCH release also fires on unlink; BiS import seeds a locked rank only when local state still holds the locked item there; the new component test uses `getByRole` with `name` because `type-scale-floor.test.ts` flags `*LabelText` calls.

## Verification

- Migration branch: new test 36 of 36; `app/services/__tests__` 32 files, 578 passing; eslint and typecheck clean; only the migration, the types hunk and the test changed against origin/main.
- Code branch: targeted 14 files, 357 tests; full `npm test` 253 files, 5049 tests; `npm run lint` 0 errors (375 pre-existing warnings, unchanged per touched UI file); typecheck clean; `git diff --quiet origin/main -- domain/scoring` exits 0; no em dashes in added lines; privacy sweep clean (synthetic names and ids only).
- Orchestrator: `diff` of the `lib/database.types.ts` hunk between the two worktrees prints nothing; read the migration SQL and the lock helper and remove-item diff by hand.

## Merge order

1. #468 (migration only): `gh pr merge 468 --merge --admin` on a non-raid day; migrations deploy about 12 seconds after merge; confirm the deploy-migrations run succeeded.
2. #469 (code): merge after #468 is live and the copy above is signed off. Then the human check: as an officer turn the setting on, award an item from a raider's approved list on the Master Sheet, confirm the raider's editor shows the lock and refuses to move it, remove the item as officer and confirm the lock is gone.
3. The docs PR from `gsd/quick-261028-0gx-award-slot-lock-keep-awarded-loot-list-r`.

## Worktrees to detach after merge

`git worktree remove` (not folder deletion; each holds a `node_modules` symlink): `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-lock-migration` and `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-lock-code`; then the two `feat/` branches locally and on origin.

## Follow-ups (D8 and gaps)

- An officer release action that keeps the item in place.
- Locks for off-spec or roll awards, if a guild wants them.
- Re-locking for the new raider after a PATCH reassignment.
- The Discord bot and the companion do not know about locks.
- No route test for `GET /api/loot-submissions` or the bootstrap route; no component test for the editor, officer review or settings modal.
- An officer's release reaches an open raider editor on the next revalidation (tab focus); the server enforces regardless.
- Changelog entry once both PRs are live.
