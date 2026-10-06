---
phase: quick-261006-a1l
plan: 01
subsystem: api
tags: [addon, loot-history, supabase, vitest, gh-307]

requires:
  - phase: quick-260929-l3a
    provides: "resolveGuildLootItem's boss/boss_tier/raid/fallback rules (PR #322, GH #307 suggested fix)"
provides:
  - "data/raid-catalog-names.ts: RAID_INSTANCE_NAMES (10 catalog raid names to their in-game GetInstanceInfo map names) and CATALOG_GROUP_LABELS (Shared Boss Loot, Trash, Crafting Materials, Tier 3 Tokens)"
  - "lib/loot/guild-scoped-lookup.ts: the raid-hint rule matches a tier's own name or one of its in-game instance names (tierMatchesRaidHint, via a module-level Map, never a plain-object index); group labels read from the data file"
  - "lib/loot/__tests__/guild-scoped-lookup-catalog.test.ts: a catalog-driven guard over every multi-tier item in all five raid catalogs, both tier id orders"
affects: [addon-import-string, addon-loot-award, resolve-guild-loot-item, raid-catalog-data]

actuals:
  tokens: 7760
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Module-level Map built once from a data-file Record, keyed by normalizeCatalogName output, so a database-supplied tier name can never index a plain object (constructor/__proto__ safety)"
    - "Catalog-driven test guard: iterate the real data/*-raids.ts catalogs, seed a guild in both tier-id orders, and assert the pinned multi-tier id list and per-order case counts, so a future catalog edit that adds/removes/un-decides a multi-tier item fails until reviewed"

key-files:
  created:
    - data/raid-catalog-names.ts
    - lib/loot/__tests__/guild-scoped-lookup-catalog.test.ts
  modified:
    - lib/loot/guild-scoped-lookup.ts
    - lib/loot/__tests__/guild-scoped-lookup.test.ts
    - app/api/addon/import-string/__tests__/route.test.ts

key-decisions:
  - "OD-1 (user, 2026-10-06): A - ship the server-side fixes for the live names an addon export already carries; leave companion awards (which only ever send the cached catalog label) to #319, which will carry the live boss and instance name"
  - "OD-2 (user, 2026-10-06): PR body uses \"Refs #307\", consistent with PR #322's prior decision, since the companion-award gap (#319) stays open"
  - "D-02: the raid-hint rule reads in-game instance name aliases from a Map built once at module load from data/raid-catalog-names.ts, never a plain-object index, so a raid_tiers.name of 'constructor' or '__proto__' cannot reach Object.prototype"
  - "D-03: CATALOG_GROUP_LABELS moved out of the lookup module into the data file so the new catalog guard test and the lookup's own group-row rule share one list"

requirements-completed:
  - A1L-R1
  - A1L-R2
  - A1L-R3
  - A1L-R4
  - DELIVERY-R1

coverage:
  - id: D1
    description: "An AQ formula awarded in a live AQ40 session is filed under Temple of Ahn'Qiraj when the session reports the in-game instance name \"Ahn'Qiraj Temple\" and a Classic-Era kill name that is not a catalog boss name"
    requirement: "A1L-R1"
    verification:
      - kind: unit
        ref: "app/api/addon/import-string/__tests__/route.test.ts#files an AQ formula from a live AQ40 session under Temple of Ahn'Qiraj when the game names the instance Ahn'Qiraj Temple"
        status: pass
      - kind: unit
        ref: "lib/loot/__tests__/guild-scoped-lookup.test.ts#uses the in-game instance name Ahn'Qiraj Temple as the raid hint"
        status: pass
      - kind: unit
        ref: "lib/loot/__tests__/guild-scoped-lookup.test.ts#tier names that are Object prototype keys neither throw nor take an instance name"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every item the five raid catalogs list in more than one raid (Classic 7, TBC 10, Cata 12) resolves to the raid it dropped in from a live boss or an in-game/catalog instance name, in both tier-id orders, including the Crafting Materials rows (Nether Vortex, Heart of Darkness) that previously fell back"
    requirement: "A1L-R2"
    verification:
      - kind: unit
        ref: "lib/loot/__tests__/guild-scoped-lookup-catalog.test.ts (22 tests: T-1..T-4 x 5 catalogs, T-5, T-6)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Companion awards (POST /api/addon/loot-award) are unchanged and pinned per catalog row; no change to any route, resolveGuildLootItemIds, findGuildLootItemsByWowheadIds, companion/, supabase/, or the catalogs; no migration"
    requirement: "A1L-R3"
    verification:
      - kind: unit
        ref: "lib/loot/__tests__/guild-scoped-lookup-catalog.test.ts#T-4: the cached catalog label a companion award receives today (OD-1) resolves per row"
        status: pass
      - kind: unit
        ref: "app/api/addon/loot-award/__tests__/route.test.ts (full suite, unchanged outcome)"
        status: pass
      - kind: unit
        ref: "app/api/addon/__tests__/companion-bearer-routes.test.ts (full suite, unchanged outcome)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Regression: the full vitest suite has no new failing test; tsc and eslint are clean on the five changed files; three local WT commits, each ending with the required trailer, touching only the five files_modified paths; nothing pushed"
    requirement: "DELIVERY-R1"
    verification:
      - kind: unit
        ref: "node SP/new-fails-388.mjs baseline-a1l-vitest.json final-a1l-vitest.json -> No new failures (exit 0)"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (exit 0); npx eslint --max-warnings 0 on the five files (exit 0, 0 warnings)"
        status: pass
    human_judgment: false

duration: ~75min
completed: 2026-10-06
status: complete
---

# Quick Task 261006-a1l: Fix GH #307, addon awards for multi-tier items match the live boss and instance name Summary

**Added `data/raid-catalog-names.ts` (10 in-game instance-name aliases + the catalog's group-boss labels) and a `tierMatchesRaidHint` Map-based lookup so an addon export's live session hints correctly file a shared item (AQ formulas, TBC Crafting Materials rows) under the raid it actually dropped in, with a catalog-driven test guarding all 29 multi-tier items across the five raid catalogs in both tier-id orders.**

## Performance

- **Duration:** ~75 min
- **Tasks:** 3 (Task 1 tracer, Task 2 catalog guard + fix, Task 3 report/verification/PR body)
- **Files modified:** 5 (2 created, 3 modified)
- **Commits:** 3 (all carry the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer)

## Background: what PR #322 already shipped

PR #322 (`2a727361`, merged 2026-09-29, quick task `260929-l3a`) implemented GH #307's suggested fix: `resolveGuildLootItem` picks between a guild's tiers for a shared item using, in order, (a) the tier whose own row names the live boss, (b) the one tier whose group row (`Shared Boss Loot`/`Trash`) sits in a tier that has that boss, (c) the tier named by a raid hint, (d) a deterministic fallback. `#307` stayed open by user decision ("Refs #307" on that PR) because two gaps remained, both closed by this plan:

1. Rule (c) compared the session's instance name with the catalog tier name only. The game reports map names, and several differ from the catalog ("Ahn'Qiraj Temple" for Temple of Ahn'Qiraj, "Tempest Keep" for Tempest Keep: The Eye, etc.). On Classic Era the addon also names AQ40 kills from its own NPC table ("Princess Yauj", not the catalog's "Silithid Royalty"), so after those kills neither rule (a)/(b) nor (c) decided and the import kept the addon's stale cached tier.
2. Nether Vortex (30183) and Heart of Darkness (32428) sit under `Crafting Materials` in both raids they drop in. That label was not recognized as a group label, so rule (b) never ran for them and a live boss never decided 24 of 136 TBC live-boss cases.

## What was built

1. **`data/raid-catalog-names.ts` (new):** `RAID_INSTANCE_NAMES` (the 10 catalog raid names whose in-game `GetInstanceInfo` map name differs, each with its warcraft.wiki.gg InstanceID noted) and `CATALOG_GROUP_LABELS` (`Shared Boss Loot`, `Trash`, `Crafting Materials`, `Tier 3 Tokens`).
2. **`lib/loot/guild-scoped-lookup.ts`:** a module-level `RAID_INSTANCE_NAME_MAP` (a `Map`, never a plain object, built once from the data file) and `tierMatchesRaidHint(tierName, raidHint)`, used by rule (c) so a raid hint matches a tier's own name or one of its instance-name aliases. `GROUP_BOSS_LABELS` is now built from `CATALOG_GROUP_LABELS` instead of an inline two-item list. Three doc passages (module doc, `LootItemHints.raidName`, the `resolveGuildLootItem` order-list JSDoc, and the rule-(b) comment) updated to describe the data-file-driven rules.
3. **`lib/loot/__tests__/guild-scoped-lookup-catalog.test.ts` (new, 22 tests):** seeds a guild from each of the five real catalogs (`classic-wow-raids.ts`, `tbc-raids.ts`, `wrath-raids.ts`, `cata-raids.ts`, `mop-raids.ts`) the way `app/services/expansionSeeder.ts` does, in both ascending and descending tier-id order, and checks every multi-tier item against a live boss (T-2), the raid's catalog or in-game instance name (T-3), and the cached catalog label a companion award receives today (T-4, characterization only, pinned per OD-1). T-5 checks every boss label repeated across two or more raids of one catalog is a recognized group label (and every group label is used by some catalog); T-6 checks `RAID_INSTANCE_NAMES`'s keys and that no instance name collides with its own key or a sibling raid.
4. **Test additions:** the import-string route tracer test (an AQ formula from a live AQ40 session lands under Temple of Ahn'Qiraj), two `resolveGuildLootItem` unit tests (the instance-name hint, and `constructor`/`__proto__` tier names), and two new cases in the existing "boss hint is not a boss signal" `it.each` table (`Crafting Materials`, `Tier 3 Tokens`).

## Commits (WT, branch `fix/307-multi-tier-award-tier`, based on `origin/main` at `059357e1`)

1. `44eb8429` - `fix(addon): match an award's raid tier by the in-game instance name (#307)` - Task 1: `data/raid-catalog-names.ts` created with `RAID_INSTANCE_NAMES` holding only the Temple of Ahn'Qiraj entry; `tierMatchesRaidHint` and rule (c) change; the D-01 tracer test and the U-1/U-2 lookup unit tests.
2. `bfb8f700` - `refactor(loot): read the catalog group labels from data/raid-catalog-names.ts` - Task 2 Step 1: `CATALOG_GROUP_LABELS` (the original two labels only) added to the data file; `GROUP_BOSS_LABELS` built from it. No behavior change (confirmed: all four Task-1 suites still 143/143).
3. `418a1c48` - `fix(addon): Crafting Materials rows and in-game raid names decide multi-tier awards (#307)` - Task 2 Steps 2-3: the new catalog guard test file, `Crafting Materials`/`Tier 3 Tokens` added to `CATALOG_GROUP_LABELS`, the remaining nine `RAID_INSTANCE_NAMES` entries added, doc updates.

Nothing was pushed; no PR was opened. **App-only PR, no migration.**

## RED evidence (tests-first, per task)

- **R-1 (route tracer, Task 1):** before the instance name was added, the insert used the cached AQ20 row: `AssertionError: expected 'aaaaaaaa-0000-0000-0000-000000000020' to be 'aaaaaaaa-0000-0000-0000-000000000040'` (on `insertPayload(calls).loot_item_id`).
- **U-1 (lookup unit test, Task 1):** `AssertionError: expected 'aq20-20727' to be 'aq40-20727'` (on `result?.id`); `matched_by` was `'fallback'`.
- **U-2:** passed immediately (no throw on `constructor`/`__proto__` tier names; own-name match already worked via direct comparison).
- **U-3 (Task 2 Step 2):** both new cases (`Crafting Materials`, `Tier 3 Tokens`) failed on the roster-query-count assertion (2 `loot_items` calls instead of 1 - the lookup fell through to rule (b)'s roster query because the labels were not yet recognized as group labels).
- **T-2 (catalog guard, Task 2 Step 2):** TBC failed with 40 lines total, 20 per tier order, out of 132 boss-hint cases per order (112 correct `boss_tier` cases + 20 that resolved to `fallback` instead of `boss`/`boss_tier`): 16 from the eight T6 recipes picking up "Crafting Materials" as a spurious dropper of Hyjal Summit/Black Temple (not yet filtered as a group label), 4 from Nether Vortex/Heart of Darkness themselves (their own boss label, not expanded).
- **T-3:** TBC's alias-case count was 0 instead of the pinned 11 (no `RAID_INSTANCE_NAMES` entries existed yet for any TBC raid); no failure lines (the catalog-name cases were already correct).
- **T-4:** TBC failed with 8 lines total, 4 per order - the four `Crafting Materials` rows (Nether Vortex x2 raids, Heart of Darkness x2 raids) expected `matched_by: 'boss'` but got `'fallback'`.
- **T-5:** 4 failure lines - `tbc: crafting materials`, `wrath: crafting materials`, `cata: crafting materials`, `mop: crafting materials` (the label repeats across raids in each of those catalogs but was not yet in `CATALOG_GROUP_LABELS`).
- **T-6:** failed on the key-list assertion - `RAID_INSTANCE_NAMES` had 1 key (`Temple of Ahn'Qiraj`) instead of the pinned 10.

All of the above pass after Task 2 Step 3 (confirmed: `lib/loot/__tests__/guild-scoped-lookup-catalog.test.ts` + `lib/loot/__tests__/guild-scoped-lookup.test.ts` = 85/85; all five related suites = 167/167).

## Multi-tier items per catalog (finding, confirmed unchanged before/after by `a1l-plan-scan.ts`/`a1l-after-scan-out.txt`)

| Catalog | uniqueIds | multiTierIds | ids | sameRaidRepeats |
|---|---|---|---|---|
| Classic | 736 | 7 | 20727, 20728, 20729, 20730, 20731, 20734, 20736 (AQ enchanting formulas, `Shared Boss Loot` in both Ruins and Temple of Ahn'Qiraj) | 36 |
| TBC | 724 | 10 | 30183 (Nether Vortex, SSC + Tempest Keep: The Eye), 32428 (Heart of Darkness, Hyjal Summit + Black Temple), both `Crafting Materials`; 32736, 32739, 32745, 32746, 32748, 32751, 32752, 32755 (8 T6 recipes, `Trash` in Hyjal Summit + Black Temple) | 0 |
| Wrath | 1250 | 0 | - | 31 |
| Cata | 767 | 12 | 63682, 63683, 63684, 65000, 65001, 65002 (T11 head tokens: Nefarian in Blackwing Descent + Al'Akir in Throne of the Four Winds); 64314, 64315, 64316, 65087, 65088, 65089 (shoulder tokens: Cho'gall in Bastion of Twilight + Al'Akir in Throne of the Four Winds) | 37 |
| MoP | 1648 | 0 | - | 61 |

Cross-catalog ids: 0 (no wowhead id appears in two different catalogs).

## What boss/raid name reaches each route today (finding, D-06)

- **`POST /api/addon/loot-award` (companion):** `boss_name` only - the addon award's cached `bossName` (`item.itemData.bossName` from `guild-data`, or the addon's `currentBossName`/`"Unknown"` fallback). No instance name, no live `lootItemId`. For multi-tier items this is a group label (17 ids: never a boss signal, falls back) or the cached row's own boss (12 Cata tokens: decides by `'boss'`, correctly resolving that row's own raid - but which of the two rows `guild-data` cached is not defined).
- **`POST /api/addon/import-string` (addon export):** each award carries its cached `bossName`/`raidName`/`lootItemId`, but the export's attendance sessions carry the *live* instance name (`GetInstanceInfo` at session start) and live boss kills with times; `matchAwardSession` gives each award its session's latest kill and instance name, and `processAward` uses those - never the award's own cached fields - as the hints this plan's fix resolves correctly.
- **`POST /api/addon/attendance` (companion):** accepts `raid_name` and `boss_kills` but stores neither (`raid_events` has no raid-name column) - unchanged by this plan (see FU-5).

## Callers decision (D-06, unchanged, no migration)

- `resolveGuildLootItem`: called only by `loot-award` (bossName hint only) and `import-string` (session hints, plus the ownership fallback with no hints that `processAward` immediately re-resolves with hints).
- `resolveGuildLootItemIds`: called by bulk award, remove-item, and `import-string` for client-supplied row ids - one row, one tier, so there's no tier to choose.
- `findGuildLootItemsByWowheadIds`: called by the raid-tracking import client, which returns every matching row and lets its own caller choose.
- None of these three functions, their callers, `companion/`, `supabase/`, `data/*-raids.ts`, or any `loot_items` data were changed. No package install.

## Before/after simulation (`a1l-plan-sim.ts` / `a1l-after-sim-out.txt`, both tier-id orders)

| Catalog | Before: live-boss cases decided right | Before: raid-hint cases decided right | After: live-boss cases decided right | After: raid-hint cases decided right (catalog name + alias) |
|---|---|---|---|---|
| Classic | 105 / 105 (`boss_tier`) | 14 (catalog name) + 0 (alias; no entries existed) | 105 / 105 | 14 + 7 |
| TBC | 112 / 136 (24 fell back: Nether Vortex/Heart of Darkness) | 20 (catalog name) + 0 (alias) | 136 / 136 | 20 + 11 |
| Cata | 24 / 24 (`boss`) | 24 (catalog name; no aliases needed) | 24 / 24 | 24 + 0 |

After Task 2, the after-scan confirms catalog counts unchanged (`classic: uniqueIds=736 multiTierIds=7`, `tbc: uniqueIds=724 multiTierIds=10`, `wrath: uniqueIds=1250 multiTierIds=0`, `cata: uniqueIds=767 multiTierIds=12`, `mop: uniqueIds=1648 multiTierIds=0`, `cross-catalog ids: 0`, `sim tbc: multiTierIds=10 liveBossCases=136 boss_tier:right=136`), and the after-sim has no `boss/current/` or `raid/current/` line containing `fallback` or `wrong` (only `cached/current/fallback/...` lines appear, which is the expected, unchanged companion characterization per OD-1).

## Test counts per changed file

| File | Tests (final) | Notes |
|---|---|---|
| `app/api/addon/import-string/__tests__/route.test.ts` | 29 (28 baseline + 1 new) | R-1 tracer |
| `lib/loot/__tests__/guild-scoped-lookup.test.ts` | 63 (59 baseline + 2 U-1/U-2 + 2 U-3) | |
| `lib/loot/__tests__/guild-scoped-lookup-catalog.test.ts` | 22 (new file) | T-1..T-4 x 5 catalogs + T-5 + T-6 |
| `app/api/addon/loot-award/__tests__/route.test.ts` | unchanged | outcome pinned by T-4 |
| `app/api/addon/__tests__/companion-bearer-routes.test.ts` | unchanged | outcome unchanged |

## Baseline vs final

- **Baseline** (WT `059357e1`, clean, taken before any edit): `npx vitest run` - 3758/3758 tests passed, `EXIT=0`. `npx tsc --noEmit` - `EXIT=0`. `npx eslint` on the three original files - `EXIT=0`, 0 warnings.
- **Final** (WT `418a1c48`): `npx vitest run` - 3785/3785 tests passed, `EXIT=0`. `node SP/new-fails-388.mjs baseline final` -> `No new failures.` (exit 0). `npx tsc --noEmit` - `EXIT=0`. `npx eslint --max-warnings 0` on the five `files_modified` paths - `EXIT=0`, 0 errors/0 warnings. No flaky lines.
- `git diff --name-only 059357e1...HEAD` lists exactly the five `files_modified` paths. `git status --porcelain` clean. Branch has no upstream configured. No push, no PR, no issue comment, no SQL, no `.env` read, no `git worktree prune`.
- No added line in `git diff 059357e1...HEAD`, no commit message, the PR body draft, or this SUMMARY contains an em dash (checked with the literal U+2014 byte sequence); pre-existing em-dash lines in the touched files were left untouched.

## PR body draft

`/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/331da5ac-3e3c-42a8-a81a-1d8985a423b4/scratchpad/pr-body-307.md` - title "Addon export awards for items in two raids match the live boss and instance name", uses "Refs #307" (OD-2), names #319 and #322, no internal OD labels, ends with the Claude Code generation line.

## Handoff notes

None. `SP/a1l-handoff.txt` was never created - the disk guard (`SP/disk-guard-uge.sh`) passed at every check (free space ranged from about 3.49GB to 4.58GB across the session, never below the 3GB floor), so the run never stopped mid-task.

## Open decisions (resolved by the user before execution, 2026-10-06)

| ID | Question | Resolution |
|----|----------|------------|
| OD-1 | What to do about companion awards (which cannot see the live raid today) | A - ship the server-side fixes for the live names an addon export already carries; leave companion awards to #319 |
| OD-2 | Which issue keyword the PR body uses | Refs #307 |

## COPY

None. No user-facing copy was added or changed (server lookup, data constants and tests only; `matched_by` keeps its existing five values).

## Known Stubs

None.

## Deviations from Plan

None - plan executed exactly as written. The one minor process note: the full baseline `vitest` run (Task 1 Step 0) was started in the background slightly before `data/raid-catalog-names.ts` was written and the D-01 route test was added; verified after the run completed that the baseline JSON (3758/3758 passed) contains no trace of the new test name, so the baseline is not contaminated. Subsequent heavy steps were run strictly after their preceding edits.

## Proposed follow-ups (not filed as GitHub issues; stated as the rule to adopt, per the plan's output spec)

- **FU-1 (#319):** the addon should prefer the live encounter over the cached catalog label and record the instance name (or instance id) on each award; the companion should forward both; `loot-award` should pass them as hints, matched with `RAID_INSTANCE_NAMES`.
- **FU-2:** the addon's Classic Era kill table should name encounters as the catalog does (`Silithid Royalty`, `Twin Emperors`) and include the Ruins of Ahn'Qiraj bosses (addon repo change).
- **FU-3:** the addon and `guild-data` should keep every catalog row of a multi-tier item, or order them deterministically, instead of caching one arbitrary row per wowhead id.
- **FU-4:** instance and boss names are localized, so a locale-independent instance id (`GetInstanceInfo`'s `instanceID`) should be sent and mapped on the server instead.
- **FU-5:** `POST /api/addon/attendance` accepts `raid_name` and `boss_kills` but stores neither; either store them for later tier choices or stop requiring `raid_name`.

## Next Phase Readiness

- Server-side GH #307 work is complete and tested; the catalog guard will fail a future catalog edit that adds, removes, or makes undecidable a multi-tier item, or adds a repeated boss label without listing it as a group.
- #319 (companion sends the live boss/instance) remains the one open tracker for #307; this plan's `RAID_INSTANCE_NAMES`/`tierMatchesRaidHint` are ready for it to use once the companion/addon send that data.
- No blockers. No deploy action needed beyond a normal app-only PR review and merge (no migration).

## Self-Check: PASSED

All five `files_modified` paths confirmed present in WT; the SUMMARY and the PR body draft confirmed present on disk; all three commit hashes (`44eb8429`, `bfb8f700`, `418a1c48`) confirmed present in `git log --oneline --all`.

---
*Quick task: 261006-a1l*
*Completed: 2026-10-06*
