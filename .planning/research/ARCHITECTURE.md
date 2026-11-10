# Architecture Research

**Domain:** WoW Forever loot for LootList+ (Discovery-mode need lists, Drop Desk, manifest-driven expansions, five Forever-path defects)
**Researched:** 2026-10-12 (branch `gsd/v2.0-forever-loot`, HEAD 35c088da)
**Confidence:** HIGH for every "current code" statement (read directly, paths and lines cited). MEDIUM for the recommended designs (reasoned from the code, not yet spiked). LOW for anything that depends on unpublished Forever data (boss names, master loot, tier-token shape).

## Bottom line

1. **A need is a `loot_items` row with `kind = 'need'`.** Do not build a parallel `loot_needs` / `loot_submission_needs` stack. `loot_submission_items.loot_item_id`, `save_submission_items`, the status triggers, review snapshots, the master sheet, `recompute_blp_for_item` and the award routes are all keyed on `loot_items.id`, so a need row rides every one of them with no change. Per-category BLP then comes for free: `blp_tracking.loot_item_id` is the need id, and the recompute SQL stays as it is.
2. **The Loot Score split is a return-shape change in `computeScore`, not a new engine.** `total` stays exactly the same sum. The function also returns `interest = itemRank` and `standing = total - interest`. A new `lootCost` component defaults to 0 behind an opt-in setting. Existing guilds and the Lua parity fixtures see identical numbers.
3. **The Drop Desk grows out of the master sheet's existing Raid Mode and award modal.** It adds one new table (`loot_drops`) and a small `/api/drops` route family, and it reuses `/api/loot-history/bulk`'s award writer, the Award Decision Receipt in `audit_logs`, the BLP recompute and `notifyLootAward`. It refreshes through SWR polling, which is what the app already uses. No Supabase Realtime (unused anywhere today) and no server actions (none in the codebase).
4. **Defects: two are fully confirmed, two partly, one refuted.** #1 (part), #4 and #5 are real today. Half of #2 (raw-rank ordering) is real. #3 was fixed in #322 and the `loot_items.slot` part of #1 in #301. Fix #4 before any BLP work and #1/#5 in week one. The rest of #2 closes once the server-side ranker exists (early November).
5. **Manifest:** adapters for the five existing expansions now (no behaviour change, guarded by a golden-row snapshot). Forever is the first native, wowhead_id-keyed manifest. Converting the five expansions to id keys fully is a separate later phase behind the same snapshot gate.

---

## Standard Architecture

### System Overview (what changes, marked NEW / MOD)

```
┌──────────────────────────────── Browser (Next.js client) ────────────────────────────────┐
│  Loot list page (MOD)            Master sheet (MOD)                 Drop Desk (NEW mode)  │
│  LootListContent + NeedPicker    MasterSheetContent, BossSection    evolves RaidModeView  │
│  (NEW, quiz: slot/armour/stat)   (need rows render as NeedLabel)    + ItemCandidateModal  │
│        │ LootListContext (unchanged model: "rank-slot" -> loot_item_id)   │ SWR poll 5s    │
└────────┼─────────────────────────────────────────────────────────────────┼───────────────┘
         │ save_submission_items RPC (unchanged)                            │ fetch
┌────────▼──────────────────────── Route handlers (app/api) ───────────────▼───────────────┐
│ /api/loot-items, /api/loot-list/bootstrap (MOD: kind, need_key)   /api/drops/* (NEW)       │
│ /api/loot-history/bulk (MOD: BLP recompute on DELETE/PATCH, awarded_item_id, drop_id)      │
│ /api/addon/loot-award (MOD: unknown id in a Discovery tier -> loot_drops inbox, not 404)   │
│ /api/addon/guild-data, export-string (MOD: real table names, needs excluded)               │
│ /api/bot/priority (MOD: Loot Score via shared ranker)                                       │
└────────┬───────────────────────────────────────────────────────────────────┬──────────────┘
         │                                                                   │
┌────────▼────────────── Domain (pure) ──────────────┐   ┌───────────── lib (I/O) ──────────▼──┐
│ domain/loot/needs.ts (NEW) taxonomy + classify      │   │ lib/loot/candidate-ranking.ts (NEW)  │
│ domain/loot/rank-candidates.ts (NEW, extracted)     │   │   server loader for ranker           │
│ domain/loot/drop-order.ts (NEW) response then score │   │ lib/loot/award-writer.ts (NEW,       │
│ domain/scoring/engine.ts (MOD) standing/interest    │   │   extracted from bulk POST)          │
│ domain/scoring/loot-cost.ts (NEW, opt-in)           │   │ lib/discord-loot-announcements (MOD) │
│ domain/expansion/wowhead.ts (NEW, moved helper)     │   └──────────────────────────────────────┘
└─────────────────────────────────────────────────────┘
┌──────────────── Data / seeding ────────────────────────────────────────────────────────────┐
│ data/expansions/registry.ts (NEW, client-safe meta)  data/expansions/<slug>/ (NEW)           │
│ app/services/expansionSeeder.ts (MOD: registry lookup + idempotent syncExpansionCatalog)     │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────── Supabase ───────────────────────────────────────────────────────────────────┐
│ raid_tiers.loot_mode (NEW col)  loot_items.kind/need_key/need_id (NEW cols)                  │
│ loot_history.awarded_item_id/drop_id (NEW cols)  loot_drops (NEW table)                      │
│ recompute_blp_for_item / _event (UNCHANGED)  save_submission_items (UNCHANGED)               │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status | Where |
|-----------|----------------|--------|-------|
| Need taxonomy | Canonical need keys, display labels, valid (slot, armour, stat) combos per class/spec, max copies, restriction class; `classifyItem()` maps a drop to exactly one need key | NEW | `domain/loot/needs.ts` |
| NeedPicker | Quiz picker (slot, then armour class, then main stat) that resolves to a need row id; reused by the Drop Desk to classify a drop | NEW | `app/components/NeedPicker.tsx` |
| Candidate ranker | Pure: rankings + context in, ordered candidates out (lifted from the inline loop at `MasterSheetContent.tsx:925-993`) | NEW (extracted) | `domain/loot/rank-candidates.ts` |
| Candidate loader | Server-side data assembly for the ranker (bot, Drop Desk server checks) | NEW | `lib/loot/candidate-ranking.ts` |
| Drop ordering | Response bucket first, then `total`, then `standing`, then name | NEW | `domain/loot/drop-order.ts` |
| Drop Desk API | Open drops, manual drop entry, classify, pin, award, void | NEW | `app/api/drops/**/route.ts` |
| Award writer | Guild-scope checks, team routing, copy numbering, insert, audit, BLP recompute, Discord (lifted from `loot-history/bulk` POST 159-435) | NEW (extracted) | `lib/loot/award-writer.ts` |
| Expansion registry | One table of expansion meta (stored name, game, slug, wowhead domain, phases); replaces four hand maps | NEW | `data/expansions/registry.ts` |
| Catalog sync | Idempotent insert of missing tiers, items (by wowhead_id) and needs (by need_key) for one guild expansion | NEW | `app/services/expansionSeeder.ts` |

---

## Recommended Project Structure (new and moved files only)

```
data/expansions/
├── types.ts                 # ExpansionManifest, RaidManifest, ItemManifest (wowhead_id keyed)
├── registry.ts              # client-safe meta only, imports nothing heavy
├── classic/index.ts         # ADAPTER: wraps classic-wow-raids.ts + name maps -> manifest
├── tbc/index.ts             # ADAPTER (same for wrath, cata, mop)
├── forever/manifest.ts      # NATIVE: raids, bosses (verified only), lootMode 'discovery'
├── forever/__fixtures__/    # pinned wago.tools CSV subsets (ItemSparse, DungeonEncounter, Map)
└── __tests__/
    ├── manifest-gate.test.ts            # structural gate, every registry entry
    ├── forever-reference.test.ts        # Forever ids/encounters vs pinned wago fixture
    └── seeder-golden-rows.test.ts       # five legacy expansions: rows identical pre/post refactor
domain/loot/needs.ts          # need taxonomy + classifyItem (pure)
domain/loot/rank-candidates.ts
domain/loot/drop-order.ts
domain/scoring/loot-cost.ts
domain/expansion/wowhead.ts   # getWowheadDomain + wowheadItemUrl, moved out of ItemLink.tsx
lib/loot/candidate-ranking.ts
lib/loot/award-writer.ts
app/api/drops/route.ts                 # GET open drops for a raid night, POST manual drop
app/api/drops/[id]/route.ts            # PATCH classify / responses / pin, DELETE void
app/api/drops/[id]/award/route.ts      # POST award (claims drop, writes history)
app/components/NeedPicker.tsx
app/(app)/master-sheet/components/DropDesk.tsx   # replaces/extends RaidModeView
```

### Structure Rationale

- **`data/expansions/registry.ts` is meta only.** `domain/expansion/game.ts:9-13` says that module "must import nothing... must never pull in raid data" because client components import it. The registry follows the same rule, and heavy catalogs are loaded only by the seeder.
- **The need taxonomy lives in `domain/`.** The raider picker, the seeder (which creates need rows) and the Drop Desk (which classifies drops) must agree on one function, or a drop can classify to a need nobody could pick.
- **The ranker is extracted, not rewritten.** The master sheet stays the reference. Bot and desk call the same pure function, so nothing diverges.

---

## (1) Discovery mode: data model and exact integration points

### Recommendation: a discriminated `kind` on `loot_items` (not a new table)

| Option | Cost | Verdict |
|--------|------|---------|
| New `loot_needs` + `loot_submission_needs` tables | Duplicates `save_submission_items`, the two status triggers (`20260930000000_enforce_loot_list_status_rules.sql`), snapshots, review, revert, master sheet, BLP SQL (`recompute_blp_for_item` reads `loot_submission_items.loot_item_id`), received-copy skip, item counts | Reject. Two bolted-together modes. |
| `kind` on `loot_submission_items` with a nullable `need_id` | Every reader of `loot_item_id` needs a second branch, and the BLP SQL changes | Reject |
| **`loot_items.kind IN ('item','need')`** | A few guards where code assumes `wowhead_id` is set. The list, review, BLP and award paths are unchanged. | **Recommend** |

Why it fits: `loot_items` rows are already per guild (`loot_items.raid_tier_id -> raid_tiers.expansion_id -> expansions.guild_id`, `lib/database.types.ts:1349-1422, 1794-1837, 671-735`). `wowhead_id` is already nullable (`:1369`). The columns a need is defined by already exist: `item_slot`, `armor_type`, `primary_stat`, `weapon_type`, `classification`, `allocation_cost`, `roles`, `is_loot_council` (`:1351-1369`). The proficiency filter (`lib/loot-items-query.ts:179-200`) and the raider's armour/stat filters (`LootListContent.tsx:1099-1155`) work on those columns as they are.

### How a need maps to slot, armour class, main stat, weapon type

The need key is canonical and deterministic, so one drop maps to exactly one need:

```
need_key = slotGroup [ '|' armorClass ] [ '|' mainStat ]
  'two-hand|strength'         item_slot 'Two-Hand',  armor_type null,   primary_stat 'Strength'
  'chest|plate|strength'      item_slot 'Chest',     armor_type 'Plate', primary_stat 'Strength'
  'trinket|agility'           item_slot 'Trinket',   max copies 2 (paired, like MAX_COPIES_PER_SLOT)
  'finger|intellect'          item_slot 'Finger',    max copies 2
  'one-hand|agility'          item_slot 'One-Hand',  max copies 2
  'tier|<role>'               item_slot 'Tier' (NOT 'Token': see pitfall), copies = tier slots
```

- **Weapon type is not part of the key.** Handedness lives in the slot group (Two-Hand, One-Hand, Main Hand, Off Hand, Ranged). That matches the PRD's preferred grain ("two-handed weapon + strength"), while `weapon_type` stays null on need rows.
- **Restriction class** comes from the taxonomy: weapons and trinkets are `Reserved`, jewellery and tier are `Limited`, everything else is `Unlimited`, with `allocation_cost` 1/1/0 exactly as the seeder computes today (`expansionSeeder.ts:465-467`). Bracket validation (`domain/loot/bracket-validation.ts`) is unchanged.
- **"Trinket #1 / #2"** is the same need row listed twice. `copyGroupKey` already falls back to the row id when `wowhead_id` is null (`domain/loot/item-copies.ts:34-35`). `maxCopiesForItem` (`domain/loot/slot-capacity.ts`) gets a `kind === 'need'` branch that reads max copies from the taxonomy, because `isUniqueEquipped(null)` returns undefined (`:48-50`) and would cap at 1.
- **Scope:** need rows are seeded per Discovery raid tier (Barrow Deeps, Hyjal Summit, Onyxia's Lair). This matches the per-raid Known switch in the PRD and how lists already group by raid, and it avoids a synthetic "need pool" tier that 37 `raid_tiers` consumers would show as a raid (raid tracking, reserves, master loot and more). **Owner decision flag:** with per-raid needs, a raider ranks "Two-hand, Strength" once per raid and BLP accrues per raid-need. If the guild wants one pool per content phase, that needs a synthetic tier plus a `kind` filter on `raid_tiers` in those 37 places. Ask before Phase C starts.

### Pins and per-category BLP

- **Pin (revealed item to need):** `loot_items.need_id uuid NULL REFERENCES loot_items(id) ON DELETE SET NULL` on `kind = 'item'` rows. A revealed item belongs to exactly one need key, so this is many-to-one and needs no join table. The route enforces that the pin stays in the same guild and tier (pattern: `lib/loot/guild-scoped-lookup.ts`).
- **Award against a need:** `loot_history.loot_item_id = need id`, plus the new `loot_history.awarded_item_id` for the real revealed item. As a result:
  - `recompute_blp_for_item(guild, need_id)` works unchanged. Contenders are raiders with the need on an approved list, and award events are need awards at linked raid nights (`20260721000001_add_blp_reset_anchor.sql`). That is "BLP accrues by slot" with zero SQL change.
  - The `idx_loot_history_unique_award_copy` index (`20261001120000_allow_second_same_night_award.sql:91`) plus `assignAwardCopies` already handles two different two-handers to one raider on one night (copy 2).
  - The deferred Known transition can re-attribute history through `awarded_item_id`.

### Migration sketch (one migration-only PR, `--admin` merge, before the code PR)

```sql
-- 1. Per-tier mode. Default keeps every existing tier 'known'.
ALTER TABLE public.raid_tiers
  ADD COLUMN IF NOT EXISTS loot_mode text NOT NULL DEFAULT 'known';
ALTER TABLE public.raid_tiers
  ADD CONSTRAINT raid_tiers_loot_mode_check CHECK (loot_mode IN ('known','discovery'));

-- 2. Needs and pins on loot_items. Default keeps every existing row an 'item'.
ALTER TABLE public.loot_items
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'item',
  ADD COLUMN IF NOT EXISTS need_key text,
  ADD COLUMN IF NOT EXISTS need_id uuid REFERENCES public.loot_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revealed_at timestamptz;
ALTER TABLE public.loot_items ADD CONSTRAINT loot_items_kind_check CHECK (kind IN ('item','need'));
ALTER TABLE public.loot_items ADD CONSTRAINT loot_items_need_shape_check CHECK (
  (kind = 'need' AND need_key IS NOT NULL AND wowhead_id IS NULL AND need_id IS NULL)
  OR (kind = 'item' AND need_key IS NULL));
CREATE UNIQUE INDEX IF NOT EXISTS idx_loot_items_tier_need_key
  ON public.loot_items (raid_tier_id, need_key) WHERE kind = 'need';
CREATE INDEX IF NOT EXISTS idx_loot_items_need_id
  ON public.loot_items (need_id) WHERE need_id IS NOT NULL;

-- 3. What actually dropped, when the award was against a need.
ALTER TABLE public.loot_history
  ADD COLUMN IF NOT EXISTS awarded_item_id uuid REFERENCES public.loot_items(id) ON DELETE SET NULL;
-- loot_history.drop_id is added with loot_drops in the Drop Desk migration.

-- 4. Opt-in slot-weighted loot cost (standing). Off = identical scores.
ALTER TABLE public.guild_settings
  ADD COLUMN IF NOT EXISTS loot_cost_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loot_cost_weights jsonb,
  ADD COLUMN IF NOT EXISTS loot_cost_window_weeks integer;
```

Follow the house migration rules: idempotent (`IF NOT EXISTS`), `SET LOCAL lock_timeout`, a PGlite contract test in `app/services/__tests__/<name>-migration.test.ts` (pattern: `live-loot-list-item-positions-migration.test.ts`), a regenerated `lib/database.types.ts`, and a migration PR deployed before the code that reads it (`20260926120000_add_guild_game_version.sql:5-6`).

### Exact integration points for Discovery (NEW vs MOD)

| Area | File and lines | Change |
|------|----------------|--------|
| Schema | `supabase/migrations/<new>` | NEW (above) |
| Types | `lib/database.types.ts`, `lib/db.ts`, `domain/types.ts`, `app/hooks/use-api.ts:155-165` (LootItem) | MOD: `kind`, `need_key`, `need_id`, `loot_mode` |
| Taxonomy | `domain/loot/needs.ts` | NEW |
| Seeder | `app/services/expansionSeeder.ts:449-498` | MOD: Discovery raids insert need rows from the taxonomy, not boss items |
| Existing Forever guilds | Forever expansion rows created with zero tiers (`expansionSeeder.ts:211-219`; `seedExpansionForGuild` short-circuits on `guildHasExpansion`, `:357-363`) | NEW `syncExpansionCatalog` run over every Forever expansion row (admin script, service role) |
| Item query | `lib/loot-items-query.ts:139-200` | MOD: select `kind, need_key`; `kind === 'need'` branch before token/name inference (`inferWeaponType(item_slot, item.name)` at `:191-192` would guess from a need's label) |
| Bootstrap and items API | `app/api/loot-list/bootstrap/route.ts`, `app/api/loot-items/route.ts` | MOD: pass `loot_mode` per tier and the new columns |
| Context | `app/contexts/LootListContext.tsx` | **No model change.** `rankings` stays `"rank-slot" -> loot_item_id` (`:167`, saved at `:803-808` and `:930-935` through the unchanged `save_submission_items`). Only BIS import (`:590-700`) must skip Discovery tiers (BIS is by wowhead id). |
| List UI | `app/(app)/loot-list/components/LootListContent.tsx:261, 279, 340, 358, 474` | MOD: render `NeedPicker` instead of `SearchableItemSelect` when the cell's tier is Discovery |
| Copies | `domain/loot/slot-capacity.ts` (`maxCopiesForItem`) | MOD: need branch |
| Received skip | `domain/loot/apply-receive-skip.ts` (key `${character_id}-${wowhead_id}`), `lib/addon/member-ranked-items.ts:95-135` (skips rows with no wowhead id), `MasterSheetContent.tsx:919` | MOD: one `itemIdentityKey(item)` helper = `wowhead_id ?? 'need:' + id`. Without it a raider who already won a need keeps their entry. |
| Master sheet | `MasterSheetContent.tsx:700-1000`, `BossSection.tsx`, `ItemCandidateModal.tsx` | MOD: need rows have `boss_name` null (group label "Any boss") and no `ItemLink` (it requires a numeric `wowheadId`), so add a `NeedLabel` |
| Scoring | `domain/scoring/*` | MOD, see section (2). `calculateLootScore` (legacy positional, `loot-score.ts`) unchanged. |
| Team filter | `domain/loot/apply-team-filter.ts` | **Unchanged.** It filters by character, not item. |
| BLP SQL | `recompute_blp_for_item`, `recompute_blp_for_event` | **Unchanged** |
| Addon exports | `app/api/addon/guild-data/route.ts:82-83`, `export-string/route.ts:106` | MOD: filter `kind = 'item'`. The companion and addon key by wowhead id (`guild-data/route.ts:125-128`). Showing needs in game is an addon-repo feature for later. |
| Gargul export | `domain/loot/gargul-dft.ts:62` | Unchanged (already skips null or non-positive ids) |
| Discord bot | `app/api/bot/priority/route.ts:110-171` | Works for needs (name `ilike`; the null-wowhead branch at `:169-171` exists). Ranking order changes come with the defect #2 fix. |
| Reserves and BIS | `app/api/reserve-runs/raid-tiers/route.ts`, `app/api/bis-items/route.ts` | MOD: exclude `loot_mode = 'discovery'` tiers (needs cannot be soft-reserved) |
| Lua addon | **Not in this repo.** `addon/` does not exist on this branch; the addon lives in `alexandermayes/loot-list-plus-addon` (`domain/scoring/index.ts:29-33`). CLAUDE.md is stale on this point. | Out of repo, plan separately |

---

## (2) Standing vs interest in `domain/scoring` without breaking item-list guilds

Current formula (`domain/scoring/engine.ts:27-58`): `total = itemRank + attendanceScore + rankModifier + roleBonus + badLuckBonus + priorityBonus + trialPenalty + donationBonus + raiderBonus`. `itemRank` is the list rank value 1-50 (`bracket-validation.ts:30-48`). Scores are computed **client-side** in `MasterSheetContent.tsx:956` and `:1445`, and in `DashboardContent.tsx:1151, 1559`.

Recommended change:

```ts
// domain/types.ts (MOD)
export interface ScoreComponents { /* existing 9 */ lootCost: number }
export interface ScoreInput { /* existing */ lootCost?: number }   // pre-computed per character, like donationBonus
export interface ScoreResult { total: number; components: ScoreComponents; standing: number; interest: number }

// domain/scoring/engine.ts (MOD): total is the same sum plus lootCost (0 unless enabled)
const interest = components.itemRank
const standing = total - interest   // attendance, BLP, rank/role/raider/trial/donation, priority, lootCost
return { total, components, standing, interest }

// domain/scoring/loot-cost.ts (NEW): calculateLootCost(awards, config) -> <= 0
//   awards: { item_slot, awarded_date }[] for the character inside the window
//   returns 0 when !config.loot_cost_enabled (default false), so nothing moves for existing guilds
```

- Put `priorityBonus` in standing. It is an officer modifier, and the PRD defines interest as "need rank" only.
- `explainScore` (`domain/scoring/explain.ts`) gets a `lootCost` line, shown only when it is non-zero.
- Add `lootCost`, `donationBonus` and `raiderBonus` to `ALLOWED_COMPONENT_KEYS` in `app/api/loot-history/bulk/route.ts:19`. **Pre-existing gap:** the Award Decision Receipt already drops `donationBonus` and `raiderBonus`, so audited overrides lose two components today.
- **Parity:** the Lua `ScoreEngine.lua` and `gen_web_fixtures.mts` (addon repo) must gain the zero-default component. Fixtures are unchanged while it stays at 0.
- **The Drop Desk orders by response first, then `total`.** `standing` is shown separately so an officer can see "high standing, low interest".

---

## (3) Drop Desk architecture

### What already exists (reuse, do not rebuild)

- **Raid Mode:** `app/(app)/master-sheet/components/RaidModeView.tsx` (161 lines) searches items and opens `ItemCandidateModal.tsx`, which awards with a reason (`'' | score | loot_council | override | offspec | roll`) and a `decision_context` (`ItemCandidateModal.tsx:44-55, 263-288`).
- **Award Decision Receipt:** `/api/loot-history/bulk` POST sanitizes `decision_context` (top 3 candidates, `was_score_winner`, `gap_to_next`) into `audit_logs` (`route.ts:88-117, 361-382`). This is already the "audited council override" record.
- **Raid nights:** `/api/raid-events/ensure` and `findAwardRaidEvent` (`utils/raid-events/team-routing.ts:183-208`) with team routing (`routeRecordsToTeamEvents`).
- **BLP:** `after(() => recomputeBlpForItems(...))` (`bulk/route.ts:390-395`, `utils/blp/recompute.ts`).
- **Discord:** `notifyLootAward` (`lib/discord-loot-announcements.ts:46-121`).

### New pieces

```sql
CREATE TABLE public.loot_drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  raid_event_id uuid REFERENCES public.raid_events(id) ON DELETE SET NULL,
  raid_tier_id uuid NOT NULL REFERENCES public.raid_tiers(id) ON DELETE CASCADE,
  boss_name text,
  wowhead_id integer,                 -- when known (addon, pasted link)
  item_name text,
  loot_item_id uuid REFERENCES public.loot_items(id) ON DELETE SET NULL,  -- real item row (catalog or revealed)
  need_id uuid REFERENCES public.loot_items(id) ON DELETE SET NULL,       -- classified need (Discovery)
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','awarding','awarded','disenchanted','void')),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','addon','import')),
  source_award_key text,              -- dedupe with addon awards (lib/loot/addon-award-insert.ts keys)
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,  -- officer overrides: { characterId: 'pass' | 'offspec' | ... }
  loot_history_id uuid REFERENCES public.loot_history(id) ON DELETE SET NULL,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid, decided_at timestamptz
);
CREATE UNIQUE INDEX ON public.loot_drops (guild_id, source_award_key) WHERE source_award_key IS NOT NULL;
CREATE INDEX ON public.loot_drops (guild_id, raid_event_id, status);
ALTER TABLE public.loot_history ADD COLUMN IF NOT EXISTS drop_id uuid REFERENCES public.loot_drops(id) ON DELETE SET NULL;
-- RLS: SELECT for active guild members (house helper policies, 20261003180000); no client writes,
-- all writes through /api/drops with verifyPermission(..., 'manage_loot') and the service role.
```

### Request flow: "boss died, item dropped" to Discord post

```
A. Manual (primary path while master loot is unconfirmed)
   Officer on Drop Desk -> POST /api/drops {raid night, boss, item name or Wowhead link}
     -> server: guild scope check, ensure raid_event (existing ensure logic)
     -> Known tier: resolve loot_items by wowhead_id (resolveGuildLootItem)
     -> Discovery tier: create or find revealed item row (kind 'item', revealed_at now), drop status 'open'
B. Addon / companion
   POST /api/addon/loot-award (MOD): when resolveGuildLootItem finds no row AND the guild has a
     Discovery tier for the boss, insert loot_drops(source 'addon', status 'open', character hint)
     instead of returning 404. The companion never retries (PD-05, loot-award/route.ts:119-122),
     so today a Forever award is lost; after this it lands in the desk inbox.

C. Classify  PATCH /api/drops/:id {slot, armour, stat}  (same NeedPicker as raiders)
     -> classifyItem() -> need_key -> need row in that tier; sets drop.need_id and pins revealed item.need_id

D. Candidates (client, inside the master sheet data already loaded)
     rankings for need_id (or loot_item_id in Known tiers)
     -> rankCandidates() (extracted from MasterSheetContent.tsx:925-993)
     -> orderDropCandidates(): response bucket, then total, then standing, then name
        response default derived from list placement: ranks 25-50 'main', 1-24 'offspec';
        officer can mark 'pass' / 'absent' (stored in drop.responses)

E. Decide  POST /api/drops/:id/award {character_id, reason, note, decision_context}
     -> UPDATE loot_drops SET status 'awarding' WHERE id AND status 'open' RETURNING  (two-officer lock)
     -> lib/loot/award-writer.ts: insert loot_history(loot_item_id = need_id or item id,
        awarded_item_id = revealed item, raid_event_id, drop_id), audit receipt; a non-top
        pick requires reason in (loot_council, override, offspec, roll) plus a note
     -> drop status 'awarded', loot_history_id set (on insert failure: back to 'open')
     -> after(): recomputeBlpForItems(need_id or item id); notifyLootAward (MOD: awarded item
        name + Forever Wowhead link; "for Two-hand, Strength")
F. Undo  DELETE/PATCH via loot-history/bulk -> BLP recompute (after the defect #4 fix) -> drop reopens
```

### Realtime vs SWR polling vs server actions

| Option | Fit with existing patterns | Verdict |
|--------|----------------------------|---------|
| Supabase Realtime | Not used anywhere in `app/`, `lib/` or `utils/`. Supabase docs recommend Broadcast over Postgres Changes; private channels need `realtime.messages` RLS policies [LOW, web] | Defer. A new subsystem for 1-3 officers. |
| **SWR polling** | `app/hooks/use-api.ts` already polls (`refreshInterval: 30000` at `:108, 126, 311, 409, 526`), and route handlers plus `fetch` are the house style | **Use.** A `useOpenDrops(guildId, raidEventId)` hook with `refreshInterval: 5000` only while the desk is open, plus `mutate()` after the user's own actions. |
| Server actions | No `'use server'` anywhere in the codebase | Do not introduce |

Upgrade path if latency complaints come: a Broadcast trigger on `loot_drops` keyed by `guild:<id>`. The hook's interface stays the same.

### Where ranking runs

The v1 Drop Desk runs inside the master sheet (`MasterSheetContent.tsx` already loads attendance, BLP, priorities, donations and received counts). That is the least new code and keeps one score source. The server-side loader (`lib/loot/candidate-ranking.ts`) is still needed for the Discord bot (defect #2) and for the server to check that "top candidate" in a receipt is truthful. Build it in early November, but the Nov 30 desk does not depend on it.

---

## (4) Manifest-driven expansion format

### Current state (line numbers moved since the brief was written)

- Registry: `EXPANSION_DATA` at `app/services/expansionSeeder.ts:224-237` (the brief's 195-207 predates Forever being added at `:211-219`).
- The displayName if/else chains are now at `:449-462` (classifications) and `:470-481` (roles), not 382-405.
- Token classes are looked up by **name substring** at seed time (`:532`, `getTokenClasses` in `data/token-class-mapping.ts:220-229`) **and at read time** (`lib/loot-items-query.ts:173-175`, `canClassUseToken(item.name, ...)`). The GH-269 class therefore lives in the query path too, not only the seeder.
- There are four more hand maps of expansion meta: `EXPANSION_TO_WOWHEAD_DOMAIN` (`app/components/ItemLink.tsx:42-56`), `EXPANSION_NAME_TO_SLUG` (`data/expansion-phases.ts:7-21`, no Forever entry), `EXPANSION_GAMES` (`domain/expansion/game.ts:41-48`) and `utils/expansionVisuals.ts`.
- **Precedent for id keys:** `data/item-types.ts` is already keyed by `wowhead_id`, and so are `data/item-unique.ts` and `data/token-copies.ts`.

### Target format

```ts
// data/expansions/types.ts
export interface ItemManifest {
  wowheadId: number                 // primary key; name is display only
  name: string
  slot: string
  classification?: 'Reserved' | 'Limited' | 'Unlimited'   // default Unlimited
  roles?: ('tank' | 'healer' | 'physical' | 'caster')[]
  tokenClasses?: WowClassName[]     // required when slot === 'Token' (gate enforces)
  armorType?: ArmorType; weaponType?: WeaponType; primaryStat?: string
}
export interface RaidManifest {
  name: string                      // must equal a phases[].raids entry (gate)
  lootMode: 'known' | 'discovery'
  bosses: { name: string; encounterId?: number; itemIds: number[] }[]
}
export interface ExpansionManifest {
  key: string                       // 'forever'
  storedName: string                // expansions.name, e.g. 'Forever'
  game: GameVersion
  wowheadDomain: string             // 'forever'
  phases: PhaseDefinition[]
  raids: RaidManifest[]
  items: Record<number, ItemManifest>
}
```

Seeder: `getExpansionDefinition(name)` becomes `registry[name].load()`. The two if/else chains disappear because classification, roles and token classes are properties of `items[wowheadId]`. `seedExpansionForGuild` becomes "create the expansions row, then call `syncExpansionCatalog`". The sync inserts missing tiers (by name), missing items (by `(raid_tier_id, wowhead_id)`), missing needs (by `(raid_tier_id, need_key)`) and `loot_item_classes` from `tokenClasses`. It is idempotent and safe to re-run.

### Migration path for the five existing expansions: adapters now, full conversion later

1. **Snapshot first (before touching anything).** Extract the pure "rows the seeder would insert" builder and commit a golden JSON per expansion: name, item_slot, wowhead_id, boss_name, classification, allocation_cost, roles, token classes. `seeder-golden-rows.test.ts` asserts byte equality.
2. **Adapters (about one day).** `data/expansions/<slug>/index.ts` wraps the existing raids, classification and role files into an `ExpansionManifest`. To preserve current behaviour exactly, the adapter expands each name-keyed entry to **every id with that name in that expansion**. The golden test must pass unchanged.
3. **Forever is native from day one:** raids and bosses only, `lootMode: 'discovery'`, `items: {}`.
4. **Full id conversion (separate phase, after Nov 30).** A one-time script writes id-keyed files from the adapter output. The golden test still guards it. Then delete the name maps and switch `lib/loot-items-query.ts:173-175` to read `loot_item_classes` (already seeded) instead of the name.
5. **Do not run `syncExpansionCatalog` over legacy expansions for existing guilds.** Their catalogs have diverged (officer edits, pre-2026-01-09 ids; see the guards in `20260926233000_add_classic_missing_loot.sql:45-60`). Legacy backfills keep the reviewed-SQL pattern, and sync is used for Forever only.

### Per-expansion verification gate (modelled on `data/__tests__/classic-wow-raids.test.ts`)

- **`manifest-gate.test.ts`** (every registry entry):
  - unique `wowheadId` per raid
  - every boss `itemIds` entry exists in `items`
  - every raid in a phase and every phase raid in `raids` (this subsumes `app/services/__tests__/raid-phase-coverage.test.ts`)
  - every `Token` slot has `tokenClasses`
  - classifications are valid
  - registry `storedName` and `game` agree with `EXPANSION_GAMES`
- **Reference checks:**
  - Classic keeps the `wow-classic-items` check (`classic-wow-raids.test.ts:66-80`); TBC keeps `tbc-raids.test.ts`.
  - **Forever** checks against pinned wago.tools CSV fixtures for build 1.60.x (ItemSparse for ids and names, DungeonEncounter and Map for bosses). A Forever boss may only be added with an `encounterId` present in the fixture. This matters because the guide-sourced Barrow Deeps boss names are unverified (todo 2026-09-13, checklist item 1). A raid with `bosses: []` is allowed while `lootMode` is `'discovery'`.

---

## (5) The five defects: status against this branch

| # | Claim | Status | Evidence | Actual schema |
|---|-------|--------|----------|---------------|
| 1 | Addon routes query `bad_luck_protection`, `item_priorities`, `loot_items.slot` | **PARTLY CONFIRMED.** Two tables still wrong. `slot` is fixed (OD-01, GH #290, commit e9fda0b7 / #301). | `guild-data/route.ts:88` (`bad_luck_protection`), `:100-103` (`item_priorities` `.in('loot_item_id')`); `export-string/route.ts:178-187` (both). `:82` and `:106` now select `item_slot`. Errors are ignored, so the companion silently gets empty `blp` and `priorities`, and the addon's score preview omits BLP and priority bonuses. | No such tables in migrations or `lib/database.types.ts`. Real tables: `blp_tracking(character_id, loot_item_id, times_passed, guild_id, ...)` (`:278-339`) and `guild_item_priorities(item_id, raid_tier_id, guild_id, role_priorities, class_priorities, character_priorities, priority_bonuses)` (`:780-843`; the column is `item_id`, not `loot_item_id`). |
| 2 | Discord `/priority` selects `loot_submissions.items` and sorts by raw rank | **HALF CONFIRMED.** The `items` select was fixed in #363 (297e4f41): it now reads `loot_submission_items` (`priority/route.ts:185-198`). Raw-rank ordering is still true, by design: "ordered by raw list rank (not Loot Score: no server-side Loot Score pipeline exists yet)" (`:5-7`, `orderItemCandidates` at `:259`). | The bot embed title also contains an em dash, `Top priority — ${item}` (`discord-bot/interactions.js:85, 95`), which breaks the no-em-dash rule. | `loot_submissions` has no `items` column (`:1500-1600`). |
| 3 | Addon awards never set `raid_event_id`; loot-award never recomputes BLP | **REFUTED** (fixed in #322, 2a727361, GH #295) | `buildAddonAwardRow` sets `raid_event_id: raidEventId ?? null` (`lib/loot/loot-history-rows.ts:79`); the route finds the night with `findAwardRaidEvent` (`loot-award/route.ts:123-133`) and recomputes BLP when linked (`:197-201`). Residual by design: with no raid night found, the award is saved unlinked and does not count for BLP. The Drop Desk always links a night. | `loot_history.raid_event_id` nullable (`:1223`) |
| 4 | Award DELETE and PATCH do not recompute BLP | **CONFIRMED** | DELETE `bulk/route.ts:445-537` and PATCH `:558-659` write and audit but never call `recomputeBlpForItems`. Only POST does (`:390-395`). No DB trigger on `loot_history` recomputes. Because BLP is derived (`20260609000001`), a recompute fully heals it. | `blp_tracking` UNIQUE (guild_id, character_id, loot_item_id) (baseline `:2289`) |
| 5 | Discord links use retail Wowhead; raid summary hardcodes `/classic/` | **CONFIRMED, plus a third site** | `lib/discord-loot-announcements.ts:32-35` (`wowhead.com/item=`), `app/api/discord/post-raid-summary/route.ts:281` (`/classic/`), and `discord-bot/interactions.js:79-81` (retail). A correct map exists client-side only: `getWowheadDomain` in `app/components/ItemLink.tsx:42-61` (has `'Forever': 'forever'`). | n/a |

### Fix order relative to the BLP and Discovery work

1. **#4 first (week of Oct 12).** In DELETE, collect `loot_item_id` from `toDelete` rows that have `raid_event_id`. In PATCH, collect `beforeRow.loot_item_id` when `raid_event_id` is set. Then `after(() => recomputeBlpForItems(...))`. Per-need BLP reuses exactly this recompute, so it has to be correct before the Drop Desk adds undo and reassign.
2. **#1 (same week).** Rename to `blp_tracking`. Switch to `guild_item_priorities` with `.eq('guild_id').in('item_id', ids)`, and map `item_id` to the existing `loot_item_id` output key so the companion contract (`GuildData`) is unchanged. Add route tests that fail on a PostgREST error instead of swallowing it.
3. **#5 (same week, before any Forever award is announced).** Move `getWowheadDomain` to `domain/expansion/wowhead.ts` and add `wowheadItemUrl(expansionName, id)`. Use it in both server sites by joining `loot_items -> raid_tiers -> expansions(name)`, and return `item_url` from `/api/bot/priority` so the bot stops building URLs. Remove the em dash in the bot embed.
4. **#3:** nothing to fix. Close the todo item with the #322 reference.
5. **#2 remainder (early Nov):** switch to Loot Score via `rankCandidates` plus the server loader. Until then, the bot reply should say "by list rank" (copy needs owner sign-off).

---

## (6) Build order: Oct 31 Discovery lists, Nov 30 Drop Desk

| Window | Phase | Delivers | NEW | MOD | Depends on |
|--------|-------|----------|-----|-----|------------|
| Oct 12-16 | A. Defects | #4, #1, #5 fixed with route tests; bot copy | `domain/expansion/wowhead.ts` | `loot-history/bulk`, `addon/guild-data`, `addon/export-string`, `discord-loot-announcements`, `post-raid-summary`, `discord-bot/interactions.js`, `ItemLink.tsx` | none |
| Oct 13-21 | B. Manifest format | Registry, adapters, golden snapshot, gate, Forever native manifest (raids only), `syncExpansionCatalog` | `data/expansions/**`, gate tests | `expansionSeeder.ts`, `domain/expansion/game.ts`, `data/expansion-phases.ts` | none (parallel with A) |
| Oct 19-23 | C1. Discovery schema and taxonomy | Migration-only PR (admin merge), types regen, `domain/loot/needs.ts`, need rows seeded, sync run for existing Forever guilds | migration, `needs.ts`, PGlite test | seeder, `lib/database.types.ts` | B (sync); owner call on need grain and per-raid vs pool |
| Oct 21-30 | C2. Discovery lists | NeedPicker, need-aware query, copies, received-skip key, master sheet need rows, review flow | `NeedPicker.tsx`, `NeedLabel` | `LootListContent.tsx`, `lib/loot-items-query.ts`, `slot-capacity.ts`, `apply-receive-skip.ts`, `member-ranked-items.ts`, `MasterSheetContent.tsx`, reserve and BIS routes, addon exports | C1 |
| Oct 26-30 | C3. Score split (no behaviour change) | `standing` and `interest` on `ScoreResult`; `lootCost` component at 0; receipt keys | `loot-cost.ts` | `engine.ts`, `types.ts`, `explain.ts`, `bulk/route.ts:19` | none |
| **Oct 31** | **Milestone** | Forever raiders build, submit and get approved need lists; officers see need rankings | | | |
| Nov 2-10 | D. Ranker extraction | `rankCandidates` used by the master sheet; server loader; bot Loot Score (#2 closed); loot cost opt-in setting and UI | `rank-candidates.ts`, `candidate-ranking.ts` | `MasterSheetContent.tsx`, `bot/priority`, settings UI | C2, C3 |
| Nov 9-24 | E. Drop Desk | `loot_drops` migration, `/api/drops/*`, award writer extraction, desk UI in the master sheet, classify via NeedPicker, pins, addon inbox, Discord post | `loot_drops`, `drops` routes, `award-writer.ts`, `drop-order.ts`, `DropDesk.tsx` | `addon/loot-award`, `bulk/route.ts` (uses writer), `notifyLootAward`, `RaidModeView`/`ItemCandidateModal` | A (#4), C, D (pure ranker only) |
| Nov 23-28 | F. Rehearsal and polish | Test guild with one Known Classic tier and one fake Discovery tier; officer UAT; copy sign-off | | | E |
| **Nov 30** | **Milestone** | Drop Desk live | | | |
| Dec 1-8 | Buffer | Forever raids open Dec 9 | | | |
| After Nov 30 | G. Id conversion | Five legacy expansions moved to id-keyed files; name lookup removed from the query path | | | B golden gate |

Ordering rationale: A and B have no dependencies and unblock everything else. The schema has to deploy before code (house rule), so C1 is its own PR. C3 is a pure refactor and can slot in anywhere before D. The Drop Desk depends on #4 (undo correctness), needs, and the extracted ranker, but **not** on the server loader or the id conversion.

---

## Architectural Patterns

### Pattern 1: Discriminated row, shared pipeline
**What:** Add a `kind` column to an existing entity instead of a parallel table.
**When:** The new concept flows through the same lifecycle (list, approve, award, BLP).
**Trade-offs:** Readers that assume item-only fields (`wowhead_id` in 63 files) need guards, but every lifecycle rule (status triggers, unique live positions, RLS) applies automatically.

### Pattern 2: Derived state recomputed on every write
**What:** BLP is rebuilt from history (`20260609000001`). Every write path that changes awards or attendance must call the recompute.
**When:** Any new award writer (Drop Desk award, void, reassign).
**Trade-offs:** Order-independent and self-healing, but any write path that forgets the call leaves BLP stale (defect #4).

### Pattern 3: Claim-then-write for multi-officer actions
**What:** `UPDATE loot_drops SET status='awarding' WHERE id=$1 AND status='open' RETURNING id` before inserting history. Zero rows means another officer won.
**When:** Drop Desk award and void.
**Trade-offs:** No transaction across PostgREST calls, so a failed insert must reset the status to `open`.

---

## Data Flow

### Key Data Flows

1. **Need list:** NeedPicker gives a need row id, then `rankings["rank-slot"]`, then `save_submission_items` (unchanged), then submit, review and snapshot (unchanged).
2. **Score:** master sheet loads, then `rankCandidates` -> `computeScore` -> `{ total, standing, interest }`, then the display or the desk ordering.
3. **Drop:** manual or addon entry, then `loot_drops (open)`, classify to need, ordered candidates, award (claim, write history against the need with `awarded_item_id`, audit receipt), then `after()` BLP recompute for the need and the Discord post.

---

## Scaling Considerations

| Scale | Adjustments |
|-------|-------------|
| Today (hundreds of guilds) | Polling at 5s only while the desk is open: about 12 req/min per open officer tab, which is trivial |
| Forever launch spike | Need rows add about 25 rows per Discovery raid per guild, 3 raids gives about 75 per guild, negligible next to MoP's 1,700+ items per guild (`lib/loot-items-query.ts:110-113`) |
| Many concurrent desks | Move the desk to Broadcast; the hook interface stays the same |

### Scaling Priorities

1. **First bottleneck:** `recompute_blp_for_item` per award is a CTE over the item's history, cheap per item. Watch `recompute_blp_for_event` when large attendance imports touch many need ids.
2. **Second:** `MasterSheetContent` client assembly (2,010 lines) is already heavy. The ranker extraction lets it slim down later.

---

## Anti-Patterns

### Anti-Pattern 1: A second loot-list stack for needs
**What people do:** Create `loot_needs` and `loot_submission_needs` "to keep Forever separate".
**Why it's wrong:** It duplicates status triggers, snapshots, BLP SQL and the master sheet. Two modes drift apart and the product stops feeling like one app.
**Do this instead:** `loot_items.kind = 'need'`.

### Anti-Pattern 2: Need rows in the `Token` slot
**What people do:** Model "Tier piece" as `item_slot = 'Token'`.
**Why it's wrong:** `isTokenSlot` paths run `canClassUseToken(item.name, ...)` (`lib/loot-items-query.ts:173-175`) and seeding `getTokenClasses(token.name)`, which are name-substring lookups that would match or miss on a label like "Tier piece".
**Do this instead:** Use a distinct `'Tier'` slot handled by the need branch.

### Anti-Pattern 3: Computing the "top candidate" in two places
**What people do:** Re-implement Loot Score in the bot or in a desk API.
**Why it's wrong:** `bot/score/route.ts:5-9` already documents a partial reimplementation (attendance only). A third copy diverges again.
**Do this instead:** One pure `rankCandidates`, called from the client and the server.

### Anti-Pattern 4: Running catalog sync over legacy guilds
**Why it's wrong:** It duplicates rows where old catalogs used other ids or bosses (`20260926233000_add_classic_missing_loot.sql:45-60`).
**Do this instead:** Sync Forever only. Legacy expansions keep reviewed SQL backfills.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Wowhead Forever | Link `wowhead.com/forever/item=<id>`, tooltip `nether.wowhead.com/forever/tooltip/item/<id>` | No drop sources yet. Stats are hidden until an item drops on the server, so manual classification is the reliable path. |
| wago.tools | Pinned CSV fixtures for the Forever gate (`/db2/<Table>/csv?build=1.60.x`) | Filter builds on the `1.60.` prefix; no encounter journal tables |
| Discord (bot on Railway) | Calls `/api/bot/*` with bot auth | Send `item_url` from the server and stop building URLs in `interactions.js` |
| Companion / addon | `/api/addon/*` keyed by wowhead id | Exclude need rows. A Discovery award with an unknown id goes to the desk inbox. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Picker / desk ↔ taxonomy | Direct import of `domain/loot/needs.ts` | Must be the same function on both sides |
| Desk ↔ award writer | `/api/drops/:id/award` calls `lib/loot/award-writer.ts` | The bulk POST also calls the writer (one write path) |
| Seeder ↔ registry | `registry[name].load()` | No if/else; heavy catalogs server-only |

## Sources

- Codebase on `gsd/v2.0-forever-loot` (HEAD 35c088da): every path and line cited above [HIGH, read directly]
- `git log` for defect history: e9fda0b7 (#301), 297e4f41 (#363), 2a727361 (#322), 6ec51a3a (#391) [HIGH]
- `.planning/workstreams/forever/MILESTONE-BRIEF.md`, todos 2026-09-13 and 2026-09-28, SEED-001 [HIGH as project intent; Forever facts within them MEDIUM or LOW]
- RCLootCouncil response model (configurable Need / Offspec / Minor / Pass buttons, council votes, master looter awards): https://www.curseforge.com/wow/addons/rclootcouncil [LOW, web search]
- Supabase Realtime guidance (Broadcast preferred over Postgres Changes; private channels need RLS on realtime.messages): https://supabase.com/docs/guides/realtime/subscribing-to-database-changes, https://supabase.com/docs/guides/realtime/benchmarks [LOW, web search, unverified figures not used]

---
*Architecture research for: WoW Forever loot (Discovery, Drop Desk, manifest format, defects)*
*Researched: 2026-10-12*
