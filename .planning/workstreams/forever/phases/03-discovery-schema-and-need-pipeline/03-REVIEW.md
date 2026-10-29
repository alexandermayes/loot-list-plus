---
phase: 03-discovery-schema-and-need-pipeline
reviewed: 2026-10-21T00:00:00Z
depth: standard
files_reviewed: 107
files_reviewed_list:
  - supabase/migrations/20261020120000_discovery_schema.sql
  - app/(app)/loot-management/components/LootSettingsContent.tsx
  - app/(app)/loot-management/components/PriorityListTab.tsx
  - app/(app)/master-sheet/components/BossSection.tsx
  - app/(app)/master-sheet/components/MasterSheetContent.tsx
  - app/(app)/master-sheet/components/RaidModeView.tsx
  - app/(app)/overview/components/DashboardContent.tsx
  - app/(app)/raid-tracking/_client.tsx
  - app/(app)/raid-tracking/components/types.ts
  - app/api/addon/export-string/route.ts
  - app/api/addon/guild-data/route.ts
  - app/api/admin/sheet-import/route.ts
  - app/api/bis-items/route.ts
  - app/api/bot/priority/route.ts
  - app/api/character-gear/route.ts
  - app/api/loot-history/route.ts
  - app/api/loot-items/route.ts
  - app/api/loot-items/specs/route.ts
  - app/api/loot-submissions/submit/route.ts
  - app/api/raid-tiers/route.ts
  - app/api/reserve-runs/[id]/awards/route.ts
  - app/api/reserve-runs/[id]/route.ts
  - app/api/reserve-runs/items/route.ts
  - app/api/reserve-runs/join/[token]/route.ts
  - app/api/reserve-runs/raid-tiers/route.ts
  - app/api/reserve-runs/route.ts
  - app/components/ItemLink.tsx
  - app/components/LootListSummaryView.tsx
  - app/components/NeedLabel.tsx
  - app/services/expansionCatalogSync.ts
  - app/services/need-row-seeder.ts
  - domain/loot/apply-receive-skip.ts
  - domain/loot/bracket-validation.ts
  - domain/loot/gargul-dft.ts
  - domain/loot/item-copies.ts
  - domain/loot/item-identity.ts
  - domain/loot/list-mode.ts
  - domain/loot/need-ranking-hold.ts
  - domain/loot/needs.ts
  - domain/loot/slot-capacity.ts
  - lib/addon/member-ranked-items.ts
  - lib/database.types.ts
  - lib/loot-items-query.ts
  - lib/loot/master-sheet-summary.ts
  - lib/loot/need-skip.ts
  - lib/loot/tier-need-rows.ts
  - package.json
  - scripts/lib/forever-sync.ts
  - scripts/sync-forever-catalog.ts
  - app/(app)/master-sheet/components/__tests__/BossSection.test.tsx
  - app/(app)/master-sheet/components/__tests__/RaidModeView.test.tsx
  - app/api/addon/export-string/__tests__/route.test.ts
  - app/api/addon/guild-data/__tests__/route.test.ts
  - app/api/admin/sheet-import/__tests__/route.test.ts
  - app/api/bis-items/__tests__/route.test.ts
  - app/api/bot/priority/__tests__/route.test.ts
  - app/api/character-gear/__tests__/route.test.ts
  - app/api/loot-history/bulk/__tests__/route.test.ts
  - app/api/loot-items/__tests__/route.test.ts
  - app/api/loot-items/specs/__tests__/route.test.ts
  - app/api/loot-list/bootstrap/__tests__/route.test.ts
  - app/api/loot-submissions/__tests__/route.test.ts
  - app/api/loot-submissions/item-counts/__tests__/route.test.ts
  - app/api/loot-submissions/remove-item/__tests__/route.test.ts
  - app/api/loot-submissions/revert/__tests__/route.test.ts
  - app/api/loot-submissions/review/__tests__/route.test.ts
  - app/api/loot-submissions/submit/__tests__/route.test.ts
  - app/api/master-sheet/visibility/__tests__/route.test.ts
  - app/api/prio-list/__tests__/route.test.ts
  - app/api/raid-tiers/__tests__/route.test.ts
  - app/api/reserve-runs/[id]/__tests__/route.test.ts
  - app/api/reserve-runs/[id]/awards/__tests__/route.test.ts
  - app/api/reserve-runs/__tests__/route.test.ts
  - app/api/reserve-runs/items/__tests__/route.test.ts
  - app/api/reserve-runs/join/[token]/__tests__/route.test.ts
  - app/api/reserve-runs/raid-tiers/__tests__/route.test.ts
  - app/components/__tests__/ItemLink.render.test.tsx
  - app/components/__tests__/NeedLabel.test.tsx
  - app/services/__tests__/discovery-schema-migration.test.ts
  - app/services/__tests__/discovery-schema-pglite.test.ts
  - app/services/__tests__/expansionCatalogSync.test.ts
  - app/services/__tests__/expansionSeeder.test.ts
  - app/services/__tests__/helpers/pglite-chain.ts
  - app/services/__tests__/need-row-seeder.test.ts
  - domain/loot/__fixtures__/need-keys.json
  - domain/loot/__tests__/apply-receive-skip.test.ts
  - domain/loot/__tests__/bracket-validation.test.ts
  - domain/loot/__tests__/gargul-dft.test.ts
  - domain/loot/__tests__/item-copies.test.ts
  - domain/loot/__tests__/item-identity.test.ts
  - domain/loot/__tests__/list-mode.test.ts
  - domain/loot/__tests__/need-ranking-hold.test.ts
  - domain/loot/__tests__/needs.test.ts
  - domain/loot/__tests__/slot-capacity.test.ts
  - lib/__tests__/discord-loot-announcements.test.ts
  - lib/__tests__/discord-raid-summary.test.ts
  - lib/__tests__/loot-items-query.test.ts
  - lib/addon/__tests__/member-ranked-items.test.ts
  - lib/loot/__tests__/addon-award-insert.test.ts
  - lib/loot/__tests__/guild-scoped-lookup.test.ts
  - lib/loot/__tests__/loot-history-rows.test.ts
  - lib/loot/__tests__/master-sheet-summary.test.ts
  - lib/loot/__tests__/need-reader-inventory.test.ts
  - lib/loot/__tests__/need-skip.test.ts
  - lib/loot/__tests__/needs-boss-sentinel.test.ts
  - lib/loot/__tests__/tier-need-rows.test.ts
  - scripts/lib/__tests__/forever-sync.test.ts
findings:
  critical: 0
  warning: 5
  info: 5
  total: 10
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-10-21
**Depth:** standard (phase diff per file, surrounding code read where the diff needed it)
**Files Reviewed:** 107 (49 source, 58 test or fixture)
**Status:** issues_found

## Summary

I found no BLOCKER. I checked the focus areas you named and all hold up.

- **Guild-ownership checks.** `PATCH /api/raid-tiers` is now fail-closed. It loads the tier, then its expansion, and 404s when the expansion's guild is not the permission-checked guild. The old route updated any tier by id. `PATCH /api/loot-items` and `POST /api/loot-items/specs` refuse need rows after their ownership check.
- **Need rows reaching item-only consumers.** I audited every `from('loot_items')` reader, the addon payloads, the bot, the Gargul export, BIS import, sheet import, reserves and the Discord posters. The readers either filter `kind = 'item'` or label via `wowheadIdForDisplay`, `NeedLabel` or `itemIdentityKey`. The reader-inventory test pins the list so a new reader fails CI until it is classified.
- **Null `wowhead_id`.** I found no `wowhead_id || 0` or `?? 0` left outside `wowheadIdForDisplay`. `itemIdentityKey` never defaults a null to a shared key.
- **SQL guard triggers and RLS.** I read the whole migration. `current_setting('role')` is the same GUC PostgREST sets. It survives `SECURITY DEFINER`, so `save_submission_items` and `create_expansion_for_guild` are covered as claimed. Every `WHEN` clause matches its function. The constraints, the column grant and the RLS matrix on `loot_item_need_pins` are correct. Every app caller of `seedExpansionForGuild` uses the service role, so the D-24 lock does not break an app path.
- **Checks run.** `npm run typecheck` is clean. The domain, services, `lib/loot`, raid-tiers and submit suites pass (1147 passed, 1 skipped).

The five warnings are:

- the raid-tiers PATCH can commit a mode switch and then fail on the remaining fields;
- the master sheet puts every need id into a GET URL through the unchanged visibility route, which is exactly the URL-length risk Pitfall 7 warns about;
- the prio-list test that backs an "ok" inventory entry cannot fail;
- the D-27 delete lock is bypassed by an officer deleting the tier;
- reserve-run creation still does not check that the tier belongs to the guild.

The migration is already deployed, so WR-04 would need a new migration.

## Warnings

### WR-01: `PATCH /api/raid-tiers` commits `list_mode` and then can fail on the other fields (partial write)

**Resolved 2026-10-28** in `0e309326`: the mode and the other fields travel in one update statement in both branches, the trailing update runs only when the mode is unchanged, and a failed need seed restores the other fields with the mode. Tests: one-statement cases for Discovery and Known, and the failed-seed restore.

**File:** `app/api/raid-tiers/route.ts:266-318`
**Issue:** When the request carries `list_mode` plus `is_guild_active` or `master_sheet_visible`, the route does the following in order:

1. It switches the mode (and, for Discovery, seeds the 145 need rows).
2. It writes the audit row.
3. It runs a separate `.update(otherFields)`.

If step 3 fails, the route returns 500 although the tier is already in the new mode and the audit row says so. The comment promises "Every decision is made before the first write", but the last write is not atomic with the first. A retry then sees no mode change and applies only the other fields. The caller is also told the request failed when half of it landed. No test covers this ordering: the raid-tiers suite never fails the second update.
**Fix:** Fold `otherFields` into the same update that switches the mode, so one statement carries both:
```ts
.update({ list_mode: 'discovery', ...(otherFields as TablesUpdate<'raid_tiers'>) })
.eq('id', tier_id)
.eq('list_mode', 'known')
.select()
```
Do the same for the Known branch. Then drop the trailing update when `modeChange !== null`. If you keep two writes, apply `otherFields` first, since it needs no seed and no compensation, then switch the mode. Add a test where the second update errors.

### WR-02: Master sheet sends every need id to the visibility route, which puts them in GET URLs (Pitfall 7 not closed, failure is silent)

**File:** `app/(app)/master-sheet/components/MasterSheetContent.tsx:732-767`, `app/api/master-sheet/visibility/route.ts:41-47` and `:262-271` (unchanged in this phase)
**Issue:** The client comment says "Need ids travel in the POST body only (T-03-10-02), never in a GET URL". That is only true for the browser-to-Next hop. The visibility route is unchanged. For a non-bypass raider it runs `.in('id', itemIds)` through `paginatedSelect`. For everyone it runs `.in('loot_item_id', allowedItemIds)`. Both are PostgREST GET requests.

The Forever manifest puts all three raids in phase 1 (`data/expansion-phases.ts:98`). The master sheet loads every tier of the phase, so one request carries 3 x 145 = 435 need ids (about 16 KB of URL). That is exactly the figure Pitfall 7 (03-RESEARCH) says "overflows the URL limit", and the research marks the gateway limit as `[ASSUMED]`.

The failure is silent. The route's page loop does `const { data: page } = ...; if (!page || page.length === 0) break`. The `error` is never read. An over-long URL therefore returns `rankings: []`, and a Forever guild would see an empty master sheet for the whole phase, items included, with no error. The "unranked needs stay hidden" filter runs after this call, so it cannot reduce the request.
**Fix:** Have the route resolve need ids itself from tier ids, and stop sending them:
```ts
// client: send { guild_id, item_ids: itemIds, tier_ids: activeTierIds }
// route: need ids = loot_items where kind='need' and raid_tier_id in tier_ids (checked against the earned-phase gate)
```
Or chunk the two `.in()` calls to about 100 ids per request. In either case, read and throw on `error` in the page loop so a rejected request cannot pass for "no rankings". Correct the client comment.

### WR-03: The `prio-list` test that backs an `ok` inventory entry cannot fail

**File:** `app/api/prio-list/__tests__/route.test.ts:47-57,100-110` and `lib/loot/__tests__/need-reader-inventory.test.ts:363-369`
**Issue:** The test asserts that the route returns a priority whose `loot_item` has `kind === 'need'` and `wowhead_id === null`. The route's embed is `loot_item:loot_items(id, name, boss_name, item_slot, wowhead_id, classification)` (`app/api/prio-list/route.ts:58-65`). It selects neither `kind` nor `need_key`, so a real response can never contain `kind`. The fake builder returns the fixture whatever the select says, so the test proves only that `NextResponse.json` serialises its input. It would pass if the route were deleted and re-written to filter needs. The inventory marks the reader `ok` ("a need-embedded priority is returned unchanged") on the strength of this test.

In practice a consumer cannot tell a need priority from an item priority, and `wowhead_id: null` reaches `PrioListItemModal` and similar code typed `number`. Separately, `POST /api/prio-list` still accepts any `item_id`, including a need row, and does not check that the item or tier belongs to `guild_id`. That gap predates this phase.
**Fix:** Pick the intended behaviour and test it.

- If priorities stay item-only, add `.eq('loot_item.kind', 'item')` (or select `kind` and drop need rows) and assert on the recorded filter, as the bot, BIS and sheet-import tests do.
- If you keep pass-through, select `kind, need_key` in the embed and make the fake apply the select list, so the assertion depends on the route.

### WR-04: The D-27 delete lock is bypassed by deleting the raid tier (or expansion), which cascades through awards

**File:** `supabase/migrations/20261020120000_discovery_schema.sql:541-568` (already deployed, so the fix needs a new migration)
**Issue:** The lock refuses a browser `DELETE` on a need row only when `pg_trigger_depth() = 1`. Officers also hold `DELETE` on `raid_tiers` and `expansions` (policies "Officers can delete raid tiers" and "Officers can delete expansions" in the baseline). Every link in the chain is `ON DELETE CASCADE`: `loot_items.raid_tier_id`, `loot_history.loot_item_id`, `loot_submission_items.loot_item_id`, `blp_tracking.loot_item_id` and the pin FKs. One PostgREST `DELETE` on a Discovery tier therefore silently drops the need rows, every ranking, every need award and the BLP credit. The header's stated purpose ("a direct delete can never silently drop need rankings or BLP credit") is not met. The cascade exemption exists for `delete_guild`, but it is unconditional.

The same exposure exists for item rows today, so this is not a regression. It is a gap in what D-27 says it closes, and the PGlite suite has no case that deletes the tier.
**Fix:** In a follow-up migration, add a WHEN-gated `BEFORE DELETE` guard on `raid_tiers` for browser sessions. Refuse it when the tier has any `loot_submission_items` or `loot_history` row on a need (the D-03 predicate in `enforce_raid_tier_list_mode_rules`). Keep the cascade exemption for `delete_guild` by checking that the guild row is being deleted. Alternatively, record this as an accepted residual in the D-27 decision and add a PGlite test that pins the behaviour.

### WR-05: Reserve-run creation reads the tier without checking it belongs to the guild

**Resolved 2026-10-28** in `0e309326`, with one deviation from the fix below: `guild_id` stays optional, because personal runs are designed to use any guild's Known tier of an expansion through the public `/api/reserve-runs/raid-tiers` catalog. A guild run now has to sit on one of that guild's own tiers, checked before `list_mode` and answered with the same fail-closed message as a missing or Discovery tier. Tests: foreign tier refused, own tier matched before the insert, personal run keeps the catalog, expansion read error answers 500.

**File:** `app/api/reserve-runs/route.ts:162-177`
**Issue:** The new D-14 check loads `raid_tiers` by `raid_tier_id` using the service-role client and inspects `list_mode`. It never compares the tier's expansion to `guild_id`. A member of guild A can create a run on guild B's Known tier. A foreign Discovery tier answers "Soft reserves are not available for this raid" while a foreign Known tier gets 201. That is a small cross-guild oracle for tier ids, and it keeps the original gap. `PATCH /api/raid-tiers` in the same phase fixes this class of bug ("regression for research Pitfall 4"), but this adjacent route, which now reads the same row, does not. `guild_id` is also optional here (`if (guild_id)`), so the membership check can be skipped.
**Fix:** Select `expansion_id` with the tier and verify `expansions.guild_id === guild_id` (404 or 400 otherwise), as the raid-tiers PATCH does. Require `guild_id` or reject runs without one.

## Info

### IN-01: `noteNeedSkipped` logs the count from the first call only

**File:** `lib/loot/need-skip.ts:35-39`, used at `lib/addon/member-ranked-items.ts:95-98`
**Issue:** The one-per-request warning is emitted on the first positive count with `{ reader, skipped: scope.skipped }`. Later calls only bump the counter, and the counter is never logged again. `buildMemberRankedItems` calls it once per need row, so the log always says `skipped: 1`. In `export-string` the BLP batch runs first, so the logged number is the BLP count and omits the ranked needs. The D-16 intent is "never drop silently", and the log under-reports. `need-skip.test.ts` checks that it warns once and that `scope.skipped` accumulates, but it never checks the logged number.
**Fix:** Accumulate through the request, then add `flushNeedSkipped(scope)` that warns once with the final total. Call it at the end of each reader and assert the logged total in the test.

### IN-02: Tautological assertion in the `loot-submissions` GET test

**File:** `app/api/loot-submissions/__tests__/route.test.ts` (the "returns a need row id in rankings..." case)
**Issue:** `expect(NEED_ROW.kind).toBe('need')` asserts a constant defined in the same file. The rest of the case does prove ids pass through unchanged, which is worthwhile, but this line adds nothing.
**Fix:** Delete the line.

### IN-03: `NEED_PAIRED_SLOTS` duplicates `MAX_COPIES_PER_SLOT` keys

**File:** `domain/loot/slot-capacity.ts:44`
**Issue:** `['Finger', 'Trinket']` is hardcoded beside `PAIRED_SLOTS = Object.keys(MAX_COPIES_PER_SLOT)`. If a paired slot is added or renamed there, needs will not follow. The needs table uses `Finger` and `Trinket` item slots, so a test that fails on drift would be enough.
**Fix:** Derive it, for example `PAIRED_SLOTS.filter(s => s !== 'One-Hand')`, or add a test that asserts every need slot in `NEED_DEFINITIONS` that is in `PAIRED_SLOTS` is in `NEED_PAIRED_SLOTS`.

### IN-04: The D-03 count in the raid-tiers PATCH puts every need id in two GET URLs

**File:** `app/api/raid-tiers/route.ts:188-205`
**Issue:** `needRows.map(row => row.id)` (145 ids, about 5.4 KB) goes into `.in('loot_item_id', needIds)` twice, as head counts on `loot_submission_items` and `loot_history`. It fits under typical limits, but it is the pattern the phase says to avoid. `tier-need-rows.ts` already shows the tier-scoped inner-embed alternative.
**Fix:** Count through an inner embed filtered by `loot_items.raid_tier_id` and `loot_items.kind = 'need'`. Alternatively, rely on the database guard (`enforce_raid_tier_known_switch`) for the decision and keep the route for the friendly reason.

### IN-05: Migration notes: validation under the same lock, and one leftover diagnostic

**File:** `supabase/migrations/20261020120000_discovery_schema.sql:184-208`, `app/api/addon/export-string/route.ts:333`
**Issue:**

- Each `ADD CONSTRAINT ... NOT VALID` is followed by `VALIDATE` in the same transaction. The `ACCESS EXCLUSIVE` lock taken by the add is held through the validating scan, so the NOT VALID/VALIDATE split adds no lock benefit. The header's "Production safety" paragraph implies it does. The tables are small and it is already deployed, so this is a documentation point only. `CREATE UNIQUE INDEX` without `CONCURRENTLY` is acknowledged in the header.
- The existing debug count in `export-string` ("Items in first tier") now counts need rows too, so its log line is misleading for Discovery tiers. Add `.eq('kind', 'item')` or drop the debug query.

**Fix:** Adjust the header wording for the next migration. Filter the debug count.

---

_Reviewed: 2026-10-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
