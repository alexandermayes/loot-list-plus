---
phase: quick-260928-x7o
plan: 01
subsystem: database
tags: [vitest, pglite, supabase-migrations, wow-classic-items, classic-catalog]

requires:
  - phase: quick-260927-sos
    provides: the AQ20 phase-4 fix and its two-PR (data + backfill) shipping pattern this quick task reuses
provides:
  - 21 raid-specific Classic profession recipes (28 raid-scoped catalog rows) added to data/classic-wow-raids.ts, gated by a fixture-driven completeness suite
  - A picker proof that all 9 Classic classes see every recipe
  - An idempotent backfill migration for existing Classic guilds, proven in PGlite across 5 scenarios (110 rows inserted, 0 on a second run)
  - Two stacked draft PRs (#308 data, #309 backfill) following the #275/#282/#285/#286 merge-order pattern
affects: [classic-catalog, loot-items-picker, expansion-seeder]

actuals:
  tokens: 20427
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Fixture-driven completeness gate for Rare-quality catalog additions the package's zone-attribution check does not cover (classic-gh284-recipes.json/.ts, modeled on GH-273's classic-gh273-core.ts)"
    - "Backfill migration parity suite reusing createSeederFake from the prior (#273) migration test, cited in a comment rather than re-abstracted, to keep the PR to exactly two files"
    - "PGlite scenario proof with a deliberate 'scope trap' seed (a non-Classic expansion with a same-named tier) to prove the expansion-name filter, not the tier-name join, is what scopes the migration"

key-files:
  created:
    - data/__tests__/fixtures/classic-gh284-recipes.json
    - data/__tests__/fixtures/classic-gh284-recipes.ts
    - supabase/migrations/20260929120000_add_classic_raid_recipes.sql
    - app/services/__tests__/classic-recipe-backfill-migration.test.ts
  modified:
    - data/classic-wow-raids.ts
    - data/item-icons.ts
    - data/item-types.ts
    - data/__tests__/classic-catalog-completeness.test.ts
    - lib/__tests__/loot-items-query.test.ts

key-decisions:
  - "OD-01 (orchestrator-accepted): data/item-types.ts gets a doc comment explaining why recipes have no ITEM_TYPES entry, with no entries added"
  - "OD-02 (orchestrator-accepted): both emperor-specific formulas (Formula: Enchant Gloves - Threat, Formula: Enchant Cloak - Subtlety) placed under the catalog's single 'Twin Emperors' boss group"
  - "OD-04 (orchestrator-accepted): the new Molten Core 'Shared Boss Loot' group placed between Ragnaros and Trash"
  - "OD-03 (orchestrator-accepted, filed as GH #307, referenced in PR #308's body under 'The same id in two raids' rather than merely suggested): the addon award lookup resolves a shared AQ formula's award to the lowest raid_tier_id among the guild's AQ20/AQ40 rows, matching existing TBC Black Temple/Hyjal recipe behavior; not fixed in this task"
  - "Deviation (Rule 1, documented, not fixed): app/services/__tests__/addon-auth-codes-migration.test.ts (already on main, from #302/#303) dynamically re-scans supabase/migrations/ and asserts its own file is timestamped later than every other migration. Adding this task's later-dated migration breaks that pre-existing, inherently fragile assertion. Left unfixed because the plan's own verification requires PR 2's branch diff (against PR 1's branch) to be exactly the 2 declared files; fixing the other test would add a 3rd file and violate that check. Documented in PR #309's body as a known, pre-existing collision, not a defect in this migration."

requirements-completed: [GH-284-R1, GH-284-R2, GH-284-R3]

coverage:
  - id: D1
    description: "Catalog has 28 recipe entries (MC 10, AQ20 8, AQ40 10) placed per D-01 (single-boss recipes under their boss, everything else under Shared Boss Loot), only the 21 raid-specific recipes (no world-drop recipes), 21 icons matching the package, and a fixture-driven gate that fails on any missing, moved or extra recipe"
    requirement: "GH-284-R1"
    verification:
      - kind: unit
        ref: "data/__tests__/classic-catalog-completeness.test.ts#Classic raid profession recipes (#284)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Recipes seeded as slot Recipe, classification Unlimited, allocation_cost 0, roles [], no loot_item_classes rows (D-03), and fetchFilteredLootItems returns every recipe for all 9 Classic classes"
    requirement: "GH-284-R3"
    verification:
      - kind: unit
        ref: "data/__tests__/classic-catalog-completeness.test.ts#Classic raid profession recipes (#284) (D-03 visibility assertions)"
        status: pass
      - kind: unit
        ref: "lib/__tests__/loot-items-query.test.ts#GH-284: Classic raid recipes visible to every class"
        status: pass
    human_judgment: false
  - id: D3
    description: "Idempotent backfill migration matches the seeder row for row, guarded per tier by (raid_tier_id, wowhead_id) and (raid_tier_id, lower(name), boss_name), proven in PGlite (5 scenarios, 110 rows then 0) and by a parity suite against the real seeder; stacked as draft PR #309 with the merge order stated"
    requirement: "GH-284-R2"
    verification:
      - kind: unit
        ref: "app/services/__tests__/classic-recipe-backfill-migration.test.ts (42 tests)"
        status: pass
      - kind: integration
        ref: "scratchpad/pglite-289/scenarios-284.mjs (5 scenarios A-E, PASS)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Two draft PRs open (#308 Refs #284 base main, #309 Fixes #284 base #308's branch), both stating the merge order, no em dashes, ending with the Claude Code line; nothing merged, nothing pushed to main, no SQL run against a real database"
    verification:
      - kind: other
        ref: "gh pr view fix/284-classic-raid-recipes / fix/284-classic-raid-recipes-backfill --json isDraft,baseRefName,body"
        status: pass
    human_judgment: true
    rationale: "Merging is explicitly the user's call, gated on PR #308's Vercel production deploy finishing before PR #309 can be retargeted and merged; the executor never merged or pushed to main."

duration: 23min
completed: 2026-09-29
status: complete
---

# Quick Task 260928-x7o: Fix GH #284 (Classic raid profession recipes) Summary

**Added the 21 raid-specific Classic profession recipes (28 raid-scoped rows across Molten Core, Ruins of Ahn'Qiraj and Temple of Ahn'Qiraj) to the catalog and item picker, plus an idempotent, PGlite-proven backfill migration for existing guilds, shipped as two stacked draft PRs (#308, #309) following the #273/#279/#282/#285/#286 two-PR pattern.**

## Performance

- **Duration:** ~23 min
- **Started:** 2026-09-29T00:10:24 PDT (first baseline vitest run in wt284)
- **Completed:** 2026-09-29T00:33 PDT
- **Tasks:** 3 (tracer, picker proof + PR 1, backfill migration + PR 2)
- **Files modified:** 9 total (7 in PR 1, 2 in PR 2)

## Accomplishments

- **PR #308** ("fix: add the Classic raid profession recipes to the loot tables (#284)"): adds 28 recipe rows (21 unique ids) to `data/classic-wow-raids.ts` — a new Molten Core `Shared Boss Loot` group (10 recipes, between Ragnaros and Trash), the 7 shared AQ enchanting formulas appended to each Ahn'Qiraj raid's existing `Shared Boss Loot` group, and 4 single-boss recipes (Moam, The Prophet Skeram, and both emperor-specific formulas under `Twin Emperors`). 21 new icon entries. A fixture-driven `Classic raid profession recipes (#284)` describe block gates the catalog against a byte-identical copy of the verified research JSON. A picker test proves all 9 Classic classes see every recipe. `data/item-types.ts` gets a doc comment (OD-01), no entries.
- **PR #309** ("fix(db): backfill the Classic raid recipes for existing guilds (#284)"), stacked on #308: an idempotent migration inserting the same 28 rows per guild tier, guarded per tier on `(raid_tier_id, wowhead_id)` and on `(raid_tier_id, lower(name), boss_name)`. A parity suite proves every migration row matches what the real seeder writes. A PGlite proof (5 scenarios) confirms 110 rows on the first run, 0 on a second run.

## Task Commits

1. **Task 1: Tracer (PR 1 core)** - `a663ebc2` (fix) - fixture, catalog edit, icons, and the new completeness describe block, on `fix/284-classic-raid-recipes`
2. **Task 2: Picker proof + item-types comment, PR 1 push** - `d8083dbd` (test) - all-9-classes picker test, `data/item-types.ts` doc comment, same branch
3. **Task 3: Backfill migration + parity suite, PR 2 push** - `96c9ce7c` (fix(db)) - migration and parity test, on `fix/284-classic-raid-recipes-backfill` (branched from PR 1's tip)

All three commits carry the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer.

## Files Created/Modified

- `data/__tests__/fixtures/classic-gh284-recipes.json` - byte-identical copy of the verified research (28 entries, 21 unique ids), cmp-verified against `docs/273-debug-resolved`
- `data/__tests__/fixtures/classic-gh284-recipes.ts` - typed `GH284_RECIPES`/`GH284_RESEARCH` loader, D-01 boss-group derivation (`catalogBossName`)
- `data/classic-wow-raids.ts` - 28 recipe entries added across 3 raids
- `data/item-icons.ts` - 21 new icon entries
- `data/item-types.ts` - OD-01 doc comment, no entries
- `data/__tests__/classic-catalog-completeness.test.ts` - new `Classic raid profession recipes (#284)` describe block (28 it.each placement/package/icon checks, plus fixture-shape, shared-id, boss-mapping and D-03 visibility checks)
- `lib/__tests__/loot-items-query.test.ts` - `GH-284: Classic raid recipes visible to every class` describe block, built from the real catalog, 9 classes + a Plate control on the Mage run
- `supabase/migrations/20260929120000_add_classic_raid_recipes.sql` - idempotent per-guild-tier backfill, 2 guards, 3 read-only verification queries
- `app/services/__tests__/classic-recipe-backfill-migration.test.ts` - 42-test parity suite against the real seeder

## Decisions Made

See `key-decisions` in the frontmatter above (OD-01, OD-02, OD-04 accepted as written; OD-03 filed as GH #307 and referenced by number in PR #308's body).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - lint cleanup] Dropped an unused `catalogBossName` import in the completeness test**
- **Found during:** Task 1
- **Issue:** the plan's action text listed `catalogBossName` among the fixture imports for the new describe block, but the block only reads `recipe.sourceBosses` (already resolved through `catalogBossName` inside the fixture module), so importing it directly triggered an eslint `no-unused-vars` warning.
- **Fix:** removed the unused import; kept `GH284_RECIPES` and `GH284_RESEARCH`.
- **Files modified:** `data/__tests__/classic-catalog-completeness.test.ts`
- **Verification:** `npx eslint` clean (0 warnings) on the four Task 1 files; suite still 336/336 passing.
- **Committed in:** `a663ebc2`

**2. [Rule 1 - test-logic bug in a newly-authored file] Two of my own parity-test assertions were too strict against the real seeder/migration shape**
- **Found during:** Task 3, first parity-suite run
- **Issue:** (a) `expect(fake.itemClasses).toEqual([])` failed because `seedExpansionForGuild` legitimately writes `loot_item_classes` rows for the *other* (Token-slot) items in a full Classic seed, not just for recipes; the assertion needed to be scoped to recipe-linked rows only. (b) `expect(text).not.toMatch(/\bplayer\b/i)` (and `\bcharacter\b`) false-matched the verification section's own English sentence explaining why it avoids player/character data.
- **Fix:** (a) scoped the class-rows check to `loot_item_classes` rows whose `loot_item_id` belongs to a seeded recipe row. (b) narrowed the check to concrete identifier patterns (`guild_id`, `player_id`, `character_id`) over the executable SQL only, excluding the verification block's prose.
- **Files modified:** `app/services/__tests__/classic-recipe-backfill-migration.test.ts`
- **Verification:** 42/42 tests pass after the fix.
- **Committed in:** `96c9ce7c`

### Documented, not auto-fixed (out of scope per the plan's own file-count verification)

**3. [Pre-existing test collision, not fixed] `addon-auth-codes-migration.test.ts`'s "latest migration" assertion breaks**
- **Found during:** Task 3, full-suite verification in WTB
- **Issue:** `app/services/__tests__/addon-auth-codes-migration.test.ts` (already merged to `main` via #302/#303) asserts its own migration file is "timestamped later than every other migration" by re-scanning `supabase/migrations/` at test-run time. This assertion is inherently fragile — it breaks the moment *any* later-dated migration is added by *any* author, and this task's required `20260929120000` migration is exactly such a file.
- **Why not fixed:** the plan's own verification step requires `git diff --name-only fix/284-classic-raid-recipes...HEAD` (PR 2's branch, against PR 1's tip) to list **exactly** the 2 declared files (the migration and the parity test). Modifying the other test would add a 3rd file and fail that explicit, plan-mandated check. Per the deviation rules' SCOPE BOUNDARY ("only auto-fix issues directly caused by the current task's changes" is weighed against explicit plan constraints), I judged the plan's concrete file-count verification to be the more specific, load-bearing instruction and left the other test untouched.
- **Disposition:** documented in PR #309's body under a "Known, pre-existing test collision" section, and here. Full suite in WTB: 99 files / 2029 tests, exactly 1 failure (this one), all others passing. `npx tsc --noEmit` and `npx eslint app/services/__tests__/classic-recipe-backfill-migration.test.ts` are both clean.
- **Recommended follow-up:** loosen that test's assertion to compare against a fixed anchor timestamp (the pattern this task's own parity suite uses: `PRIOR_LATEST_MIGRATION_TIMESTAMP = 20260928180000`, a constant, not a live directory re-scan) instead of dynamically re-scanning the migrations directory forever.

---

**Total deviations:** 2 auto-fixed (1 lint cleanup, 1 test-logic bug in a newly-authored file) + 1 documented-not-fixed (pre-existing test collision, explained in the PR body, left for a human follow-up).
**Impact on plan:** No scope creep. Both auto-fixes were necessary for the new tests to correctly express what they claim to test. The documented-not-fixed item is a defect in already-merged code, unrelated to this task's correctness, and fixing it would have violated the plan's own explicit file-scope verification for PR 2.

## Issues Encountered

- The migration's query-1 header comment initially wrapped "Temple of Ahn'Qiraj 10" across two `--` comment lines, which the parity suite's single-line regex check didn't match. Reflowed onto one line; also added the caveat that a tier can show fewer than the full count only where guard 2 kept a differently-id'd hand-added copy (matching what the PGlite proof's scenario D actually demonstrates), so the migration's own comment doesn't overstate what production could show if an officer had already hand-added a recipe under a different id.
- See Deviation 3 above for the one pre-existing, unrelated test failure discovered during full-suite verification.

## PGlite scenario table (`scratchpad/pglite-289/scenarios-284.mjs`, `run-output-284.txt`)

Schema: minimal `expansions`, `raid_tiers`, `loot_items` (with the `classification` CHECK, `name NOT NULL`, `roles text[]` default), `wow_classes`, `loot_item_classes`, columns taken from `supabase/migrations/20260101000000_baseline_schema.sql`. `@electric-sql/pglite` installed only in the scratchpad package (`scratchpad/pglite-289/package.json`), never added to either worktree.

| Scenario | Setup | Rows inserted (run 1) | Result |
|---|---|---|---|
| A | `Classic`, all 7 raid tiers, a few pre-existing non-recipe rows | 28 | Molten Core 10, Ruins of Ahn'Qiraj 8, Temple of Ahn'Qiraj 10, others 0; id 20727 present in both AQ tiers exactly once |
| B | Same as A, expansion named `Classic WoW` | 28 | Same as A |
| C | `Classic`; Temple of Ahn'Qiraj already has id 20727 hand-added under `Princess Huhuran` | 27 | Guard 1 (same wowhead_id) blocks the real Temple of Ahn'Qiraj row; the hand-added row is untouched; Ruins of Ahn'Qiraj still gains its own 20727 row |
| D | `Classic`; Molten Core already has `pattern: core armor kit` (id 99999) under `Shared Boss Loot` | 27 | Guard 2 (case-insensitive name + boss) blocks the real 18252 (`Pattern: Core Armor Kit`) row; Molten Core gains the other 9 |
| E | `The Burning Crusade`, with a tier literally named `Molten Core` | 0 | Expansion-name scope filter keeps a same-named non-Classic tier from gaining any row (the "scope trap") |

- **Total first run:** 110 rows (28 + 28 + 27 + 27 + 0), matching `run 1 affected rows: 110`.
- **Second run:** 0 rows inserted (idempotent).
- **Row shape:** every one of the 110 inserted rows is `Unlimited`, cost 0, slot `Recipe`, `is_available` true, `roles: []`, with 0 `loot_item_classes` rows.
- **Verification queries:** all 3 read-only queries at the end of the migration returned the expected per-raid, per-id and per-name aggregates (query 1's `Molten Core` row correctly shows `min_items=9, max_items=10` across the 4 scenario-tiers touching it, since scenario D's guard-2 collision legitimately holds one tier back — the migration's own comment now explains this).

## Test, typecheck and lint results

**WT (`fix/284-classic-raid-recipes`, PR #308):**
- Baseline (before any change, from `origin/main` `aafb4a63`): `npx vitest run` -> 98 test files, 1878 tests, 0 failures.
- RED, new gate before the catalog/icon edit: 62 of 99 tests in the `Classic raid profession recipes (#284)` describe block failed.
- Final: `npx vitest run` -> 98 test files, 1987 tests, all passing.
- `npx tsc --noEmit`: clean.
- `npx eslint` on the six touched `.ts` files: clean (0 errors; only pre-existing, unrelated `_cols`/`_column`/`_opts` unused-arg warnings in `loot-items-query.test.ts`'s mock builder, not introduced by this task).
- `git diff --name-only origin/main...HEAD`: exactly the 7 declared PR 1 files.

**WTB (`fix/284-classic-raid-recipes-backfill`, PR #309):**
- Parity suite RED, before the migration file existed: `ENOENT` (file missing).
- Parity suite GREEN: 42/42 tests pass.
- Full suite: 99 test files, 2029 tests; **1 failure** — the pre-existing, unrelated `addon-auth-codes-migration.test.ts` collision documented above. All other 2028 tests pass.
- `npx tsc --noEmit`: clean.
- `npx eslint app/services/__tests__/classic-recipe-backfill-migration.test.ts`: clean.
- `git diff --name-only fix/284-classic-raid-recipes...HEAD`: exactly the 2 declared PR 2 files.

## PRs

- **#308**: https://github.com/alexandermayes/loot-list-plus/pull/308 — "fix: add the Classic raid profession recipes to the loot tables (#284)". Draft, base `main`, head `fix/284-classic-raid-recipes`. Commits `a663ebc2`, `d8083dbd`.
- **#309**: https://github.com/alexandermayes/loot-list-plus/pull/309 — "fix(db): backfill the Classic raid recipes for existing guilds (#284)". Draft, base `fix/284-classic-raid-recipes` (PR #308's branch), head `fix/284-classic-raid-recipes-backfill`. Commit `96c9ce7c`.
- Merge order (stated in both bodies): merge #308 first, wait for its Vercel production deploy, then retarget #309 to `main` and merge it. The user performs both merges; the agent never merged, never used `--admin`, never pushed to `main`, and never ran SQL against a real database.

## User Setup Required

None - no external service configuration required. The only outstanding manual steps are the ones the PRs themselves gate on: merging #308, confirming its Vercel deploy, then retargeting and merging #309 (all the user's call).

## Next Phase Readiness

- Both PRs are open as drafts and ready for review; nothing is merged.
- GH #307 (the addon-award tier-ambiguity follow-up for the 7 shared AQ formulas, OD-03) is filed and referenced from PR #308's body; not addressed in this task by design.
- The pre-existing `addon-auth-codes-migration.test.ts` collision (Deviation 3) is a good candidate for an unrelated, small follow-up quick task: loosen its "latest migration" assertion to a fixed anchor timestamp instead of a live directory re-scan, so it stops breaking on every subsequent migration.

---
*Quick task: 260928-x7o*
*Completed: 2026-09-29*

## Self-Check: PASSED

- FOUND: data/__tests__/fixtures/classic-gh284-recipes.json
- FOUND: data/__tests__/fixtures/classic-gh284-recipes.ts
- FOUND: supabase/migrations/20260929120000_add_classic_raid_recipes.sql
- FOUND: app/services/__tests__/classic-recipe-backfill-migration.test.ts
- FOUND: scratchpad/pglite-289/scenarios-284.mjs
- FOUND: scratchpad/pglite-289/run-output-284.txt
- FOUND: commit a663ebc2 (Task 1, branch fix/284-classic-raid-recipes)
- FOUND: commit d8083dbd (Task 2, branch fix/284-classic-raid-recipes)
- FOUND: commit 96c9ce7c (Task 3, branch fix/284-classic-raid-recipes-backfill)
- FOUND: PR #308, isDraft true, base main, Refs #284, Claude Code line confirmed
- FOUND: PR #309, isDraft true, base fix/284-classic-raid-recipes, Fixes #284, Claude Code line confirmed
