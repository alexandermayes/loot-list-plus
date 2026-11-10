---
phase: 02-expansion-onboarding-manifest
reviewed: 2026-10-19T00:00:00Z
depth: standard
files_reviewed: 62
files_reviewed_list:
  - .github/workflows/refresh-item-data.yml
  - .github/workflows/refresh-wago-snapshot.yml
  - app/(app)/expansions/[expansionId]/_client.tsx
  - app/(app)/guild-settings/components/ExpansionManager.tsx
  - app/(app)/loot-list/components/LootListContent.tsx
  - app/(app)/loot-submissions/components/LootSubmissionsContent.tsx
  - app/(app)/master-sheet/components/MasterSheetContent.tsx
  - app/(app)/master-sheet/components/RaidTierHeader.tsx
  - app/(app)/master-sheet/components/VirtualizedMasterSheet.tsx
  - app/(app)/overview/components/__tests__/SetupGuide.test.tsx
  - app/(app)/overview/components/DashboardContent.tsx
  - app/(app)/overview/components/SetupGuide.tsx
  - app/(app)/reserve/_client.tsx
  - app/(app)/reserve/components/__tests__/CreateReserveRunModal.test.tsx
  - app/(app)/reserve/components/CreateReserveRunModal.tsx
  - app/(app)/reserve/runs/[id]/_client.tsx
  - app/api/reserve-runs/[id]/__tests__/route.test.ts
  - app/api/reserve-runs/[id]/route.ts
  - app/api/reserve-runs/raid-tiers/__tests__/route.test.ts
  - app/reserve/join/[token]/__tests__/raid-icon-game.test.tsx
  - app/reserve/join/[token]/opengraph-image.tsx
  - app/reserve/join/[token]/page.tsx
  - app/services/__tests__/__golden__/cata.rows.txt
  - app/services/__tests__/__golden__/classic.rows.txt
  - app/services/__tests__/__golden__/mop.rows.txt
  - app/services/__tests__/__golden__/tbc.rows.txt
  - app/services/__tests__/__golden__/wrath.rows.txt
  - app/services/__tests__/expansionCatalogSync.test.ts
  - app/services/__tests__/expansionSeeder-golden.test.ts
  - app/services/__tests__/expansionSeeder-registry.test.ts
  - app/services/__tests__/expansionSeeder.test.ts
  - app/services/__tests__/raid-phase-coverage.test.ts
  - app/services/expansionCatalogSync.ts
  - app/services/expansionSeeder.ts
  - data/expansion-phases.ts
  - data/expansions/__fixtures__/legacy-token-exceptions.json
  - data/expansions/__tests__/forever-lookup.test.ts
  - data/expansions/__tests__/forever-reference.test.ts
  - data/expansions/__tests__/manifest-gate.test.ts
  - data/expansions/__tests__/no-live-fetch.test.ts
  - data/expansions/catalogs.ts
  - data/expansions/forever/__fixtures__/shipped-names.json
  - data/expansions/forever/lookup.ts
  - data/expansions/forever/manifest.ts
  - data/expansions/forever/provisional-allowlist.json
  - data/expansions/forever/reference-check.ts
  - data/expansions/forever/reference/wago.json
  - data/expansions/registry.ts
  - data/expansions/types.ts
  - data/expansions/validate.ts
  - domain/expansion/manifest-schema.ts
  - domain/expansion/reference-snapshot-schema.ts
  - package.json
  - scripts/expansions/snapshot-reference.ts
  - scripts/lib/__tests__/forever-sync.test.ts
  - scripts/lib/__tests__/wago-snapshot.test.ts
  - scripts/lib/forever-sync.ts
  - scripts/lib/wago-snapshot.ts
  - scripts/sync-forever-catalog.ts
  - utils/__tests__/raidIcons.test.ts
  - utils/raidIcons.ts
findings:
  critical: 0
  warning: 6
  info: 4
  total: 10
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-10-19
**Depth:** standard
**Files Reviewed:** 62 (the five frozen golden row files were checked only for drift risk, not content)
**Status:** issues_found

## Summary

The phase is well built. The sync service is insert-only and matches by normalized name, the gate rules are pure and individually tested, the registry and catalog lookups use own-property guards, the legacy path is untouched, and the golden test records writes without regenerating anything (nothing in scope writes to `__golden__/`; the test uses `toMatchFileSnapshot`, which fails on mismatch and does not rewrite in CI). The wago fetch code lives only in `scripts/`, uses a single User-Agent, and returns an outage result instead of throwing. No secrets, em dashes in user-facing copy, or hardcoded credentials were found in scope. No BLOCKER-class defect was found.

The warnings are about the seams: what happens when the Forever sync throws partway through the seeder, a reference check that can promote a boss on a name collision, a workflow trigger that does nothing, and a refresh branch that overwrites human commits.

## Structural Findings (fallow)

None provided for this review.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: A failed Forever sync leaves a tier-less expansion behind and blocks retry

**File:** `app/services/expansionSeeder.ts:242-250` (caller without rollback: `app/api/guilds/[id]/expansions/route.ts:124-133`)
**Issue:** For `seedMode === 'sync'` the seeder creates the `expansions` row, optionally points `guilds.active_expansion_id` at it, then awaits `syncExpansionCatalog`. If the read or the bulk insert fails (or `planCatalogSync` throws on a NULL phase), the catch returns the generic error but the expansion row and the active pointer are already written. The legacy loop never had this problem because it logs and `continue`s on a tier error and still returns success. Now:
- `POST /api/guilds` and `POST /api/guilds/change-expansion` roll back (they delete the guild or the expansion row), so those two are fine.
- `POST /api/guilds/[id]/expansions` does not roll back. The caller sees a 400, the guild is left with a Forever expansion that has zero tiers, and a retry returns "Guild already has ... Each expansion can only be added once per guild." The only way out is the owner running `npm run sync:forever -- --apply`.

The seeder's own contract ("the new-guild path runs once inside guild creation") assumes every caller rolls back, and one does not.
**Fix:** Make the seeder own the cleanup so no caller has to, for example in the `sync` branch:
```ts
if (expansionData.seedMode === 'sync') {
  try {
    await syncExpansionCatalog(supabase, { expansionId: expansion.id, expansionName: expansionData.displayName })
  } catch (syncError) {
    console.error('[SEEDER] Catalog sync failed, removing the new expansion:', syncError)
    await supabase.from('expansions').delete().eq('id', expansion.id)
    if (setAsCurrent) await supabase.from('guilds').update({ active_expansion_id: null }).eq('id', guildId).eq('active_expansion_id', expansion.id)
    return { expansionId: '', error: 'Something went wrong while setting up the expansion' }
  }
  return { expansionId: expansion.id }
}
```
Alternatively add the same delete-on-failure block that `change-expansion/route.ts` has to the `[id]/expansions` route.

### WR-02: Reference checks match boss names globally, so a name collision can promote or "verify" a boss

**File:** `data/expansions/forever/reference-check.ts:96-110` and `:113-130`; `scripts/lib/wago-snapshot.ts:304-309`
**Issue:** `trimToManifest` keeps every `DungeonEncounter` row whose normalized name matches any manifest boss name, regardless of `MapID`, and `findPromotableBosses` builds its lookup from names only. The pinned product (`wow_classic_beta`, prefix `1.60.`) also carries the Classic encounters, and the Forever manifest ships a boss named "Onyxia" in "Onyxia's Lair", a Classic raid with the same name (the phase already knows these names collide: see `FOREVER_RAID_ICON`). The first successful snapshot is therefore likely to report `onyxia` as promotable from the Classic encounter, and the workflow PR will tell the reviewer to promote it. `checkVerifiedEncounters` is weaker still: it only checks that the cited `encounterId` exists anywhere in the snapshot, so a `verified` boss can cite an unrelated encounter and pass. The module's stated aim is to make a verification "honest".
**Fix:** Require the encounter to belong to the raid. Join `DungeonEncounter.MapID` to `Map.ID` and require the map's normalized `MapName_lang` (or the manifest `mapId`) to equal the raid name or a `previousName`, in both `findPromotableBosses` and `checkVerifiedEncounters`; also assert the verified boss's normalized name equals the cited row's `Name_lang`. Note that Forever and Classic can share a map name, so prefer setting `mapId` in the manifest once known and matching on it.

### WR-03: `refresh-item-data.yml` now triggers on `data/expansions/**`, which nothing in that workflow reads

**File:** `.github/workflows/refresh-item-data.yml:25-27` (and the new header comment at lines 15-18)
**Issue:** The new path filter fires the job (a 30-minute `npm ci` plus two Wowhead fetchers, with `contents: write` and `pull-requests: write`) on any push to main that touches anything under `data/expansions/`. That includes tests, fixtures, `provisional-allowlist.json`, and `reference/wago.json`, so every merged weekly wago snapshot PR and every gate-test edit starts a Wowhead crawl. `icons:fetch` and `unique:fetch` do not read `data/expansions/` at all (a grep of `scripts/*.ts` finds no reference), so the comment "icon and unique maps refresh when manifest items change" is not true today: the trigger has no effect, only cost and Wowhead traffic. It also sits oddly beside the no-live-fetch constraint, since it widens how often a fetch site runs.
**Fix:** Drop the filter until the fetch scripts actually read manifest items, or narrow it to the files that can carry items:
```yaml
paths:
  - "data/*-raids.ts"
  - "data/expansions/forever/manifest.ts"
```
and correct the comment to say the scripts do not yet consume manifest items.

### WR-04: The weekly snapshot job force-pushes over commits the PR body tells reviewers to add

**File:** `.github/workflows/refresh-wago-snapshot.yml:80-83` and `:92`
**Issue:** The job rebuilds `chore/refresh-wago-snapshot` from the current checkout with `git checkout -B` and runs `git push --force origin`. The PR body it writes tells the reviewer: "Run npm run test locally (or push a commit to this branch) before merging." Pushing a fixup commit (for example the manifest promotion that the same PR body asks for) is the documented path, and the next Monday run silently discards it. The job also never checks whether the existing remote branch has commits that are not from the bot.
**Fix:** Use `git push --force-with-lease origin "$branch"` after a `git fetch origin "$branch"` so the push fails loudly when someone added commits, or reset the PR body to say "do not push to this branch; apply promotions on a separate branch". Also remove the redundant `sed` indentation strip (YAML already removes the block indentation).

### WR-05: Raid icon lookup indexes a plain object with officer-controlled tier names

**File:** `utils/raidIcons.ts:97-105`
**Issue:** `raidIconMap[raidName] || 'inv_misc_questionmark'` has no own-property guard. A tier named `constructor`, `toString` or `__proto__` resolves through `Object.prototype` to a function, which is truthy, so the URL becomes `https://wow.zamimg.com/images/wow/icons/medium/function Object() { [native code] }.jpg`. Officers can create their own raid tiers (the sync code and `findManifestRaid` both note this), and the rest of this phase (`getExpansionMeta`, `getExpansionCatalog`, `getExpansionGame`, `findManifestRaid`) was deliberately written to avoid exactly this lookup. The Forever branch of the same expression was added in this phase and sits next to the unguarded one. Impact is a broken image and a malformed URL, not script injection, because the value only lands in an `img src` with a fixed host prefix.
**Fix:**
```ts
const iconFor = (raidName: string, game?: GameVersion) =>
  game === 'forever'
    ? FOREVER_RAID_ICON
    : (Object.prototype.hasOwnProperty.call(raidIconMap, raidName) ? raidIconMap[raidName] : null) ?? 'inv_misc_questionmark'
```
or move the map to a `Map<string, string>` as `RAID_INSTANCE_NAME_MAP` already does.

### WR-06: A degenerate wago pull can overwrite the snapshot with empty tables and open a PR

**File:** `scripts/lib/wago-snapshot.ts:392-428`
**Issue:** `refresh` checks CSV headers but never checks that the untrimmed tables contain rows. A 200 response with a header-only CSV (wrong build argument, a truncated export, an upstream partial outage that returns 200) parses cleanly, trims to empty tables, hashes differently from the committed rows, passes `ReferenceSnapshotSchema`, and is written as an `updated` snapshot. The workflow then opens a PR that deletes every reference row, `findPromotableBosses` reports nothing, and the ratchet quietly stops working. Because the first real pull will also be mostly trimmed to empty (names are not in wago yet), the PR reviewer cannot tell a good empty result from a bad one.
**Fix:** After parsing, before trimming, throw if `untrimmed.DungeonEncounter` or `untrimmed.Map` is empty (these tables are never legitimately empty for a real build), and log the untrimmed row counts so a reviewer can see the pull was real:
```ts
for (const table of ['DungeonEncounter', 'Map'] as const) {
  if (untrimmed[table]!.length === 0) throw new Error(`${table}: wago returned no rows for build ${build}`)
}
log(`pulled ${untrimmed.DungeonEncounter!.length} encounters, ${untrimmed.Map!.length} maps, ${untrimmed.ItemSparse!.length} items`)
```

## Info

### IN-01: `sync:forever` exits 1 forever when an officer-created duplicate tier exists

**File:** `scripts/lib/forever-sync.ts:93-103`, `:152-157`, `:229-231`
**Issue:** `findDuplicateTierNames` counts every normalized duplicate in `raid_tiers`, including pre-existing duplicates the sync did not create and has promised to leave alone. Any guild with two officer-made tiers of the same name makes every `--apply` run exit 1 and list that expansion under "Duplicate tier names", which will train the owner to ignore the exit code.
**Fix:** Report only duplicates among names that match a manifest raid (`findManifestRaid(name) !== null`), or snapshot the duplicates before the insert and report only new ones.

### IN-02: Proposed Forever copy is still in the code and makes a timing claim

**File:** `app/(app)/overview/components/SetupGuide.tsx:36-45`
**Issue:** The block is marked "PROPOSED copy awaiting owner sign-off before the PR merges" (the project requires user sign-off on user-facing copy). Separately, `FOREVER_PROVISIONAL_NOTE = 'Boss names are confirmed when the raid opens.'` promises a schedule the manifest does not back: the owner's input on names is due 2026-10-21 and promotion depends on wago, not on the Dec 9 open date. If names are confirmed earlier or later, the sentence is wrong.
**Fix:** Get sign-off before merge, and consider wording that makes no timing promise, such as "Boss names are not confirmed yet."

### IN-03: `sortRowsById` tie-break uses a locale-dependent comparison inside the hash input

**File:** `domain/expansion/reference-snapshot-schema.ts:136-139`
**Issue:** The tie-break for repeated IDs uses `localeCompare`, so the canonical order (and therefore the sha256 that decides whether a PR opens) can differ between runtime locales if a table ever repeats an ID. The comment says the point of the tie-break is a total order, but a locale-sensitive one is not stable across machines (local run versus the GitHub runner).
**Fix:** Compare the JSON strings with a plain code-unit comparison, for example `(x < y ? -1 : x > y ? 1 : 0)`.

### IN-04: `getRaidPhase` does not guard its slug lookup

**File:** `data/expansion-phases.ts:109-118`
**Issue:** `EXPANSION_PHASES[expansionSlug]` has no own-property check. The doc comment says it returns `null` when the slug is missing, but a slug such as `constructor` returns `Object`, and `for (const phase of phases)` then throws a `TypeError` instead of returning `null`. Every current caller passes a registry or manifest slug, so this is latent, but the function is exported and documented as total.
**Fix:**
```ts
const phases = Object.prototype.hasOwnProperty.call(EXPANSION_PHASES, expansionSlug)
  ? EXPANSION_PHASES[expansionSlug]
  : undefined
if (!phases) return null
```

---

_Reviewed: 2026-10-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
