---
phase: 02-expansion-onboarding-manifest
fixed_at: 2026-10-19T13:20:00Z
review_path: .planning/workstreams/forever/phases/02-expansion-onboarding-manifest/02-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 5
skipped: 1
status: partial
---

# Phase 2: Code Review Fix Report

**Fixed at:** 2026-10-19
**Source review:** .planning/workstreams/forever/phases/02-expansion-onboarding-manifest/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (WR-01 to WR-06; no critical findings; Info excluded by scope)
- Fixed: 5
- Skipped: 1 (WR-05, accepted risk R-02-05)

**Where verification ran:** the main checkout on branch `gsd/v2.0-forever-loot`. `workflow.use_worktrees` is `false` in `.planning/config.json`, so no worktree, temp branch or recovery sentinel was created. Every number below is reproducible from the checkout.

## Fixed Issues

### WR-01: A failed Forever sync leaves a tier-less expansion behind and blocks retry

**Status:** fixed (logic change, requires human verification)
**Files modified:** `app/services/expansionSeeder.ts`, `app/services/__tests__/expansionSeeder.test.ts`
**Commit:** 7a12b069
**Applied fix:** In the `seedMode === 'sync'` branch the seeder now catches a `syncExpansionCatalog` throw, calls a new best-effort `rollbackSyncedExpansion` helper, and rethrows into the existing catch (generic error unchanged). The helper clears `guilds.active_expansion_id` (only when this call set it, and only where it still equals the new id) and then deletes the new `expansions` row. It never throws, so a rollback failure cannot mask the sync error. Guild creation keeps its delete-the-guild behavior untouched, and the legacy loop is not changed. Tests: the recording fake gained `delete()`; two new cases assert the pointer is set then cleared and the row deleted on a sync failure, and that the pointer is left alone when `setAsCurrent` is false.
**Verification:**
- `CI=true npx vitest run app/services/__tests__/expansionSeeder.test.ts app/services/__tests__/expansionSeeder-golden.test.ts app/services/__tests__/expansionSeeder-registry.test.ts app/services/__tests__/expansionCatalogSync.test.ts`: 4 files, 98 tests passed
- `npm run typecheck`: exit 0
- `npm run lint`: 0 errors, 377 warnings (pre-existing)

### WR-02: Reference checks match boss names globally, so a name collision can promote or "verify" a boss

**Status:** fixed (logic change, requires human verification)
**Files modified:** `data/expansions/forever/reference-check.ts`, `scripts/lib/wago-snapshot.ts`, `data/expansions/__tests__/forever-reference.test.ts`, `scripts/lib/__tests__/wago-snapshot.test.ts`
**Commit:** 0be81f9e
**Applied fix:** Added an exported pure helper `raidMapIds(raid, maps)` in `reference-check.ts`: a pinned manifest `mapId` is authoritative; otherwise the raid name or a previous name is joined to `Map.MapName_lang` (normalized). `findPromotableBosses` now matches a DungeonEncounter row only when its `MapID` is one of the raid's maps. `checkVerifiedEncounters` requires the cited row to exist, to sit on the raid's map, and to carry the boss name (separate error messages; the "not in the committed snapshot" message is unchanged). `trimToManifest` keeps a boss-named encounter only on its own raid's map, plus the existing keep-by-manifest-mapId rule. The snapshot schema and the committed placeholder `data/expansions/forever/reference/wago.json` are unchanged (verified with `git diff --quiet`). Tests added: Classic-Onyxia row on another map does not promote Forever Onyxia; an empty Map table promotes nothing; the raid-map row wins over an earlier same-named row; a pinned mapId beats the name join; verified checks for wrong map, wrong name and a spacing/case variant; `trimToManifest` drops the colliding row and drops boss-named rows when no map matches.
**Known limit:** while every Forever raid has `mapId: null`, a Classic row on a map that has the same name as the Forever raid cannot be told apart by name. Pinning `mapId` in the manifest once the owner or wago supplies it closes that. This is called out in the `raidMapIds` doc comment.
**Verification:**
- `CI=true npx vitest run data/expansions scripts/lib`: 7 files, 304 tests passed
- `npm run typecheck`: exit 0
- `npm run lint`: 0 errors, 377 warnings (pre-existing)

### WR-03: refresh-item-data.yml triggers on data/expansions/** which nothing in that workflow reads

**Status:** fixed
**Files modified:** `.github/workflows/refresh-item-data.yml`
**Commit:** 826a6665
**Applied fix:** Removed the `"data/expansions/**"` push path and reverted the header comment to its pre-phase wording (the comment claiming manifest items refresh the maps was untrue: `scripts/*.ts` does not read `data/expansions/`). The file is now byte-identical to its state before the phase (zero diff against the merge-base with `origin/main`), so its four pre-existing em dashes are untouched and none were added. I chose full removal over narrowing to `data/expansions/forever/manifest.ts` because neither fetcher reads it.
**Verification:**
- `grep -rn "data/expansions" scripts/*.ts`: no matches
- `git diff <merge-base> -- .github/workflows/refresh-item-data.yml`: empty
- `grep -c "—" .github/workflows/refresh-item-data.yml`: 4 (unchanged)
- The workflow is YAML-only; no unit tests apply

### WR-04: The weekly snapshot job force-pushes over commits the PR body tells reviewers to add

**Status:** fixed (logic change, requires human verification)
**Files modified:** `.github/workflows/refresh-wago-snapshot.yml`
**Commit:** 01d31289
**Applied fix:** Before rebuilding the bot branch the job now runs `git ls-remote` and, if the branch exists, fetches it and records its tip as `expected`. If the tip commit's author email is not the bot's, the job exits 1 with an `::error::` telling the owner to merge or close the PR. A fetch followed by a lease on that same tip would not by itself protect reviewer commits, because the lease would always match what was just fetched, so the author check is what makes the failure real; the lease then guards against a push landing between inspection and update. The plain force push became `git push --force-with-lease="$branch:$expected" origin "$branch"` (empty `expected` means the branch must not exist, which covers the first run). The literal `git push --force` still appears exactly once. The PR body now says that once a commit is pushed the weekly job will not overwrite it and fails until the PR is merged or closed. All required strings are intact (`cron: '17 6 * * 1'`, `workflow_dispatch:`, `group: refresh-wago-snapshot`, the tsx command, `chore/refresh-wago-snapshot`, `gh pr edit`, `steps.snapshot.outputs.outage`, `GITHUB_TOKEN`, `node-version: 22`, `NPM_RC`), there is no push or pull_request trigger, and the file has no em dashes. I left the redundant `sed` indentation strip in place: it is harmless and was not in the requested scope.
**Verification:**
- Count of the force-push literal in the file: 1; em dashes: 0
- Ruby `YAML.load_file`: parses; extracted run script of the PR step passes `bash -n`
- Plan 02-09 plain-text check: `exit=0` (see below)
- Not exercised end to end: the lease and fetch logic runs only in GitHub Actions, and a local run would need a push, which I did not do.

### WR-06: A degenerate wago pull can overwrite the snapshot with empty tables and open a PR

**Status:** fixed (logic change, requires human verification)
**Files modified:** `scripts/lib/wago-snapshot.ts`, `scripts/lib/__tests__/wago-snapshot.test.ts`
**Commit:** 419baa44
**Applied fix:** In `refresh`, after parsing and before `trimToManifest`, the untrimmed row counts are logged (`pulled N encounters, M maps, K items for build B`) and a plain `Error` is thrown when `DungeonEncounter` or `Map` has zero rows. It is deliberately not a `WagoOutage`, so it is terminal. `ItemSparse` is not checked because the manifest has no items yet. Tests: an `it.each` over both tables injects a header-only CSV and asserts a rejection with the table name and build, no write and no sleep (so no retries); another test asserts the logged counts.
**CLI exit codes confirmed** by running `scripts/expansions/snapshot-reference.ts` through `npx tsx --import <stub>` with an injected `globalThis.fetch` (stub files kept in the session scratchpad, no live requests): header-only DungeonEncounter gave an `::error::` line and `exit=1`; persistent 503 gave the `::notice::` line and `exit=0`. `git status` showed `wago.json` untouched afterwards.
**Verification:**
- `CI=true npx vitest run data/expansions scripts/lib`: 7 files, 307 tests passed
- `npm run typecheck`: exit 0
- `npm run lint`: 0 errors, 377 warnings (pre-existing)

## Skipped Issues

### WR-05: Raid icon lookup indexes a plain object with officer-controlled tier names

**File:** `utils/raidIcons.ts:97-105`
**Reason:** skipped by instruction. It is accepted risk R-02-05 in `02-SECURITY.md`: the Classic icon lookup is unchanged by design so no Classic-line icon moves. No file was touched.
**Original issue:** `raidIconMap[raidName] || 'inv_misc_questionmark'` has no own-property guard, so a tier named `constructor`, `toString` or `__proto__` resolves through `Object.prototype` and yields a malformed icon URL (broken image, no script injection).

## Final verification (end of run)

- `CI=true npx vitest run data/expansions scripts/lib app/services/__tests__`: 33 files, 731 tests passed. No `-u` was used, and `git diff 950fad50 HEAD -- app/services/__tests__/__golden__` is empty, so the five golden files are byte-identical.
- `npm run typecheck`: exit 0. `npm run lint`: 0 errors, 377 warnings (the same 377 pre-existing).
- No live wago.tools or Wowhead requests were made; no host literal was added outside `scripts/`; no schema or migration changes; no planning docs edited other than this file.
- Plan 02-09 workflow plain-text check (the `refresh-wago-snapshot.yml` clauses and the no push/pull_request trigger count): `exit=0`. The `refresh-item-data.yml` `"data/expansions/**"` clause of the original check is intentionally dropped by WR-03, since that path no longer exists in the workflow.

Commits, oldest first: 7a12b069 (WR-01), 0be81f9e (WR-02), 826a6665 (WR-03), 01d31289 (WR-04), 419baa44 (WR-06). Each is on `gsd/v2.0-forever-loot` with the requested trailer and contains only its own finding's files.

---

_Fixed: 2026-10-19_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
