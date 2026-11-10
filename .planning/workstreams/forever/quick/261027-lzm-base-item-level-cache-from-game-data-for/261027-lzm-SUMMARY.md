---
phase: quick-261027-lzm
plan: 01
subsystem: gear-sync
tags: [battlenet, game-data, item-level, supabase-migration, rls, probe]
requires:
  - 261026-wpw (item_level column, domain slot rules, read route, Equipped panel)
provides:
  - public.item_base_levels (service-role-only cache of base item level per wowhead id)
  - resolveBaseItemLevels / readBaseItemLevel helper
  - sync-gear, Battle.net import and link-battlenet store profile level, else base level, else null
  - owner-run Game Data probe
affects:
  - character_equipped_items.item_level (now filled for Classic)
  - Equipped column header title (copy proposal, sign-off pending)
tech-stack:
  added: []
  patterns:
    - service-role-only table (RLS on, no policies, REVOKE then explicit GRANT)
    - cache-through helper that never rejects
key-files:
  created:
    - supabase/migrations/20261027120000_item_base_levels.sql
    - app/services/__tests__/item-base-levels-migration.test.ts
    - lib/battlenet-item-levels.ts
    - lib/__tests__/battlenet-item-levels.test.ts
    - scripts/spikes/item-base-level-spike.ts
  modified:
    - supabase/migrations/20261026120000_equipped_item_level.sql (comment text only)
    - lib/battlenet.ts
    - lib/database.types.ts
    - app/api/battlenet/characters/sync-gear/route.ts
    - app/api/battlenet/characters/import/route.ts
    - app/api/battlenet/characters/import/__tests__/route.test.ts
    - app/api/characters/[id]/link-battlenet/route.ts
    - app/(app)/master-sheet/components/ItemCandidateModal.tsx
decisions:
  - Base level is cached forever per item id (it never changes), fetched_at only records when
  - A missing table, failed read, failed fetch or failed upsert degrades to a null level and never fails a sync
  - Header title says Base because MoP upgrades (up to 8 levels) are not counted
status: complete
requirements: [LZM-R1, LZM-R2, LZM-R3, LZM-R4, LZM-R5, DELIVERY-R1]
actuals:
  tokens: 14500
  tasks: 3
  commits: 6
metrics:
  completed: 2026-10-27
---

# Phase quick-261027-lzm Plan 01: Base item level cache from Game Data Summary

Base item level per wowhead id, cached in a new service-role-only table and filled from the Battle.net Game Data item endpoint, so `character_equipped_items.item_level` is populated on Classic where the profile equipment response carries no level.

## What was built

1. **Migration `20261027120000_item_base_levels.sql`** (migration worktree). Seven statements: CREATE TABLE IF NOT EXISTS, DROP then ADD the 1 to 1999 CHECK, ENABLE ROW LEVEL SECURITY, REVOKE ALL from PUBLIC, anon and authenticated, GRANT ALL to service_role, COMMENT ON TABLE. No policy, function, trigger or view. Header has the seven sections of 20261026120000 and a one-statement Rollback.
2. **Helper `lib/battlenet-item-levels.ts`** (code worktree). `resolveBaseItemLevels` dedupes ids, reads the cache through the service client, fetches only misses (4 in flight, 100 ms between batches, 3 s timeout), upserts hits, and resolves to a Map of integer levels from 1 to 1999. It never rejects. The region is allowlisted to the `REGION_API_HOSTS` keys for both host and namespace.
3. **Three writers** call the helper once per sync after the equipment fetch and store `readEquippedItemLevel(item) ?? baseLevels.get(item.item.id) ?? null`. sync-gear and link-battlenet resolve before their delete. Flow and every error string are unchanged.
4. **Types and copy.** `item_base_levels` entry in `lib/database.types.ts`; `REGION_API_HOSTS` exported; Equipped header title is now "Base item level of what this player has equipped in the slot this item fills, from their last Battle.net gear sync" (owner sign-off pending).
5. **Probe `scripts/spikes/item-base-level-spike.ts`**, owner-run, labels, numbers, booleans and key names only.

## Commits (oldest first, nothing pushed)

Branch `feat/equipped-item-level-migration` (worktree `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-migration`):

| SHA | Subject |
|-----|---------|
| 82221093 | test(db): anchor the discovery PGlite chain hook to the Discovery file (predecessor) |
| 8e865ed6 | feat(db): store equipped item level per slot (predecessor) |
| cfde98ff | docs(db): item_level comments name the Game Data base level source |
| ef7715d4 | feat(db): cache base item levels per wowhead id |

Final migration timestamp: **20261027120000** (unique across origin/main and every ref; orders after 20261026120000). No older test needed anchoring in this task: the whole `app/services/__tests__` directory passed without it, so there is no separate anchoring commit (82221093 from the predecessor remains the only one).

Branch `feat/armory-item-level` (worktree `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code`):

| SHA | Subject |
|-----|---------|
| a11e3d86 | chore(spike): Battle.net Classic equipped item level probe (predecessor) |
| 46ea1f6a | feat(gear): store item level from Battle.net gear sync and import (predecessor) |
| db7d4dca | feat(loot): equipped slot rules for item level comparison (predecessor) |
| f7f511ce | feat(gear): store item level on Battle.net character link (predecessor) |
| 8f75416a | feat(master-sheet): show equipped item level in the item candidate panel (predecessor) |
| 0e21e509 | feat(gear): resolve equipped item level from Game Data base levels |
| 07ef423a | chore(spike): Game Data base item level probe |

Every commit of this task ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. This SUMMARY is not committed (the quick workflow commits docs).

## Owner probe (run before the code PR merges)

Run from the main checkout. It pulls production env to a temporary file outside the repo, runs the probe, then removes the file:

```
cd /Users/alexander.mayes/Code/personal/loot-list-plus && vercel env pull /tmp/llp-prod.env --environment=production --yes && node --env-file=/tmp/llp-prod.env --import tsx /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code/scripts/spikes/item-base-level-spike.ts; rm -f /tmp/llp-prod.env
```

Optional prefixes, placed before `node`: `SPIKE_ITEM_IDS="id1,id2,id3"` (positive integers, deduped, 20 at most; default is one Tier 14, one Tier 15 and one Tier 16 Heroic raid item) and `SPIKE_REGION=eu` (default `us`). Paste the printed JSON back; it contains no names. Expected: `levelFieldPresentOnAll: true` with levels in the MoP raid range.

**Rule: the code PR merges only when `levelFieldPresentOnAll` is true.** If it is false, stop before the code PR and revisit the field path in `readBaseItemLevel`.

Status 2026-10-27, later the same day: the owner reports the probe was run. The printed JSON was not pasted into this record, so the result is not on file here; paste it into the code PR before merge. The rule above still applies.

Exit codes: 2 bad input or missing variables (names only), 3 privacy self-check tripped, 1 generic failure.

## Merge order

1. Push `feat/equipped-item-level-migration` and open one migration-only PR carrying both `20261026120000` and `20261027120000`. Merge with `--admin` on a non-raid day and confirm the deploy about 12 seconds after merge.
2. Push `feat/armory-item-level` and open the code PR. Merge only after the owner's copy sign-off (the new header title plus the 261026-wpw Equipped copy) and after the probe confirms the level field. Then run the 261026-wpw human check: as a `manage_loot` officer, open a ring, a trinket, a two-hand weapon, a tier token and a mount on the master sheet.
3. Push the `gsd/quick-*` branches and open the docs PR.

## Worktrees to detach after merge

Use the git worktree command, not deleting folders (each holds a node_modules symlink):

- `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code`
- `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-migration`

## Verification (real results)

Migration worktree:
- `item-base-levels-migration.test.ts`: 18 passed (7 shape cases, 11 PGlite cases). `equipped-item-level-migration.test.ts`: 23 passed after the comment correction, run together 41 passed.
- Whole `app/services/__tests__`: 31 files, 542 tests passed.
- eslint on the new test clean; `npm run typecheck` clean.
- Added em dashes on the branch: 0. 20261027 migration paths on any remote ref: none; commits on this branch touching a 20261027 path: 1.
- `git diff --stat origin/main...HEAD`: the two migrations, their two tests and the predecessor's anchored `discovery-schema-pglite.test.ts`.

Code worktree:
- Helper test 35 passed; `app/api/battlenet` 14 passed (includes the rewritten import cases); targeted run with `ItemCandidateModal.test.tsx` 60 passed across 3 files.
- grep count of `baseLevels.get(item.item.id)`: 1 in each of the three routes. Header title string present once.
- `npm run lint`: 0 errors (375 pre-existing warnings, none in files touched here). `npm run typecheck`: clean. `npm test`: 248 files, 4932 tests passed (single run; `quality-brand-token-parity` did not time out, so no rerun was needed).
- `git diff --quiet origin/main -- domain/scoring`: clean. Added em dashes on the branch: 0.
- Probe, no credentials: with both variables unset it exits 2 and names `BLIZZARD_CLIENT_ID`; with `SPIKE_ITEM_IDS=abc` it exits 2 with the fixed input message, naming `SPIKE_ITEM_IDS` and not `BLIZZARD_CLIENT_ID`; `SPIKE_REGION=kr` exits 2. eslint and typecheck clean.
- Extra, offline: the probe's report and privacy self-check were also exercised against a stubbed `fetch` (synthetic names and a fake token, no network, no Blizzard credentials). A healthy run printed `levelFieldPresentOnAll: true`, a 404 item flipped it to false, and an item name that appears in the report made it print the self-check message. The stub lived in the scratchpad only.

Privacy sweep on added lines of both branches (this task's commits) and commit messages: no email-like strings, no long bearer tokens, no realm or character names; test data is synthetic (`test-token`, ids 101 to 209, `00000000-...` style ids).

## Test gaps

- No route test exists for sync-gear or link-battlenet, and none was created (as planned). Only the import route test covers the writer change; the other two writers are covered by the identical call-site grep and the helper tests.
- The `ItemCandidateModal` test does not assert the header title, so it needed no change.

## Deviations from Plan

None to scope. Two small notes:
- A first attempt to batch-edit the helper test with BSD `sed -i -E` left a stray backup file `battlenet-item-levels.test.ts-E`; it was moved out of the repo before the commit and never tracked. The test's shared `Response` body issue (a `Response` can be read once, so `mockResolvedValue` broke multi-id cases) was fixed in the test by returning a fresh `Response` per call. No helper change.
- Task 1 needed no anchoring test commit; nothing in `app/services/__tests__` assumed its own migration was newest.

## Discretion items the owner may veto

- The comment-only correction to `20261026120000` (Task 1 Step 4): header Problem, Readers and writers, Deploy, and the COMMENT ON COLUMN string now describe the Game Data base level fallback. Statement count (12) and every statement are unchanged; safe because the file is not yet deployed.
- The explicit `GRANT ALL ... TO service_role` (after the REVOKE).
- The 3 s request timeout and 100 ms batch pause.
- The probe's 20-id cap.

## Open follow-up (out of scope)

When a character returns 404 during a sync, keep the last stored rows rather than delete them (the 261026-wpw sample had 4 of 10 characters no longer resolving).

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat register. T-lzm-01 (browser write to the cache) is proven closed by the PGlite privilege matrix; T-lzm-03 region allowlist is covered by tests including an own-key trap (`constructor`) and a path-injection string.

## Privacy check

Counts and aggregates only. No guild, character, realm or account names, ids or tokens appear in any file, test data or commit message of this task.

## Self-Check: PASSED

- Files present in their worktrees: migration, migration test, helper, helper test, probe.
- Commits present: cfde98ff, ef7715d4, 0e21e509, 07ef423a.

## Pull requests (opened 2026-10-27)

| PR | Branch | Base | Merge when |
|---|---|---|---|
| #462 | feat/equipped-item-level-migration | main | First. Migration-only: --admin merge on a non-raid day, confirm the deploy about 12 seconds after merge. |
| #463 | feat/armory-item-level | main | After #462 is live, the probe JSON is pasted into the PR with levelFieldPresentOnAll true, and the copy is signed off. |
| #464 | gsd/quick-261026-wpw-v1-armory-gear-sync-spike-battle-net-cla | main | Any time; docs only. |
| #465 | gsd/quick-261027-lzm-base-item-level-cache-from-game-data-for | #464's branch | After #464; it retargets to main on its own. Docs only. |

