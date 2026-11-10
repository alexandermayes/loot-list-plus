# Stack Research

**Domain:** WoW loot management, v2.0 additions (Discovery mode lists, Drop Desk, expansion manifests, addon and Discord delivery) on the existing Next.js 16 / React 19 / Supabase / SWR stack
**Researched:** 2026-10-12
**Confidence:** HIGH for in-repo facts and npm versions (checked directly), MEDIUM for Supabase Realtime design (official docs, which the GSD seam rates LOW because they came through WebFetch), LOW to MEDIUM for Forever client and addon facts (community sources only, beta and still changing)

## Bottom line

v2.0 needs **one new runtime dependency (`zod`)** and **one new dev dependency (`csv-parse`)**. You do not need a new UI kit, state library, realtime vendor, ORM or Lua library.

Most of the work is schema and wiring:

1. **Discovery needs are `loot_items` rows with `kind = 'need'`.** Lists, ranks, copies, classification points, allocation cost, BLP, the score engine and the addon export already key on `loot_item_id`. Making a need one of those rows means none of them gets rewritten.
2. **The Drop Desk feels instant because it scores locally, not because of a push channel.** It loads one raid-night snapshot, sorts candidates in the browser with the pure `domain/scoring` code, and writes through one transactional RPC. Supabase Realtime Broadcast (private channel, sent from a DB trigger) only says "something changed, revalidate". SWR polling stays as the fallback.
3. **Manifests are TypeScript data modules checked by a zod schema.** They are verified offline in vitest against **committed, trimmed reference snapshots** taken from wago.tools CSV and the Wowhead Forever tooltip JSON. CI never calls wago.tools: it returned **503 (maintenance) on every probe on 2026-10-12**.
4. **The addon gets Discovery data through the existing `LLP1:1:` string as additive fields.** It classifies drops itself from the client's item data. **Do not build WeakAuras strings.** WeakAuras does not support Mainline-based clients, and Forever uses the Mainline API. **Do not rely on the companion's SavedVariables writes during a raid**: SavedVariables are only read at load, and the Forever beta currently does not read them back at all.

## What is already installed (do not re-add)

Checked in `package.json`, `package-lock.json` and `node_modules` on 2026-10-12.

| Already present | Installed version | Covers |
|---|---|---|
| `@supabase/supabase-js` (declared `^2.90.0`) | **2.106.1** resolved; `@supabase/realtime-js` 2.106.1 | Realtime Broadcast, private channels, `realtime.setAuth()`, broadcast `replay` (present in `RealtimeChannel.d.ts`) |
| `swr` | 2.3.8 | `mutate(..., { optimisticData, rollbackOnError })`, already used in `guild-settings/components/MemberManager.tsx`; `refreshInterval` polling in `app/hooks/use-api.ts` |
| `react` / `react-dom` | 19.2.3 | `useOptimistic`, `useTransition` built in |
| `@upstash/redis`, `@upstash/ratelimit` | 1.36.1 / 2.0.8 | Caching Wowhead tooltip lookups; rate-limiting Drop Desk writes |
| `@radix-ui/react-radio-group`, `framer-motion`, `@dnd-kit/*` | present | Quiz-style need picker (one column, five rows), reordering needs |
| `posthog-js` / `posthog-node` | present | Feature flags for Discovery and Drop Desk rollout, funnel events |
| `wow-classic-items` (dev) | 2.0.1 | Classic Era only. **Cannot verify Forever items** |
| Node `zlib` (`deflateRawSync` / `inflateRawSync`) | built in | The existing `LLP1:1:` addon envelope; no compression library needed |
| `zod` | 4.3.5, **transitive only** (via `eslint-plugin-react-hooks`, dev) | Not usable as an app dependency: it is not declared, so it can vanish on an eslint bump |
| CSP `connect-src` | `wss://*.supabase.co`, `https://nether.wowhead.com` already allowed (`next.config.ts:36`) | Realtime websockets and client tooltip fetches need no CSP change |
| Discord bot `discord.js` | 14.25.1 (latest 14.27.0) | Slash commands, REST posts. No upgrade needed for v2.0 |

## Recommended Stack

### Core technologies (new or newly used)

| Technology | Version | Purpose | Why recommended |
|---|---|---|---|
| **zod** (new, `dependencies`) | `4.6.5` exact for now, move to `^4.6` once 4.6.7 has aged a week | One schema for the expansion manifest, the Discovery need catalogue, Drop Desk request bodies, and the v2 addon import payload | It is the TypeScript standard, it is already in the tree transitively (so a direct dependency de-duplicates rather than adds), it parses at runtime in the seeder and API routes, and `z.toJSONSchema()` (Zod 4 core) can emit a JSON Schema later if non-developers ever hand-edit manifests. TypeScript 5.9.3 is installed, above Zod 4's floor. **4.6.7 was published 2026-10-12 16:29 UTC, the day of this research, and 4.6.6 the day before.** Pin 4.6.5 (published 2026-09-13) as a supply-chain precaution. |
| **Supabase Realtime Broadcast** (already in supabase-js, not yet used anywhere in `app/`, `lib/` or `utils/`) | realtime-js 2.106.1 (installed); raise the declared floor to `"@supabase/supabase-js": "^2.106.1"` so a fresh resolve cannot drop below it | Drop Desk "something changed" signal: drop added, classification changed, award made, override recorded | Supabase docs call Broadcast the "recommended method for scalability and security". A DB trigger calls `realtime.send(payload, event, topic, is_private)`, so **every write path** fires it: web, addon import, companion and bot. Private channels are guarded by RLS on `realtime.messages` using the existing `is_guild_officer(uuid)`, which is granted to `authenticated` (migration `20260930000200`). |
| **Postgres (Supabase), schema only** | existing | Discovery needs, pins, need-aware BLP, an append-only drop decision log, and one transactional `award_drop` RPC | Every v2.0 data concern fits the current tables plus three small additions (see the data model below). No new datastore. |

### Supporting libraries

| Library | Version | Purpose | When to use |
|---|---|---|---|
| **csv-parse** (new, `devDependencies`) | `^7.0.3` (2026-09-25; dual ESM/CJS, `csv-parse/sync` export) | Parse wago.tools DB2 CSV (`Item`, `ItemSparse`, `Map`, `DungeonEncounter`, `ChrClasses`, `ChrRaces`) in `scripts/expansions/snapshot-reference.ts` | Scripts only, never shipped to the app. Item names contain commas and quotes, so `split(',')` is unsafe. Scripts already run under `tsx`. |
| SWR (existing) | 2.3.8 | Drop Desk snapshot fetch, optimistic writes, polling fallback | Use a Drop Desk-specific config. Do **not** reuse the global `swrConfig`, which has `revalidateOnReconnect: false` and `dedupingInterval: 5000`. Raid-night wifi drops, so reconnect must revalidate. |
| React 19 `useOptimistic` (existing) | 19.2.3 | Instant pin, classify and award feedback inside a transition | Use it for single-action feedback. Use SWR `optimisticData` for list-level cache updates, which is the pattern already in `MemberManager.tsx`. |
| Upstash Redis (existing) | 1.36.1 | Cache parsed Wowhead Forever tooltips (`forever:item:<id>` to `{slot, classId, subclassId, stats, name, quality}`) | Drop Desk "classify by item id". Use a long TTL for hits and a short TTL for 404 `{"error":"ID is out of range"}` so newly datamined items appear quickly. |
| Node `fetch` (built in) | Node 20 | Wowhead `nether.wowhead.com/forever/tooltip/item/<id>`, wago CSV in scripts | Same approach as `scripts/fetch-item-icons.ts` (500 ms between batches). |

### Development tools

| Tool | Purpose | Notes |
|---|---|---|
| Vitest (existing 4.1.0) | Per-expansion manifest gate (`data/__tests__/expansion-manifests.test.ts`), need-key classifier parity, BLP SQL fixtures | Offline only: reads committed snapshots, never the network. Same posture as `classic-wow-raids.test.ts` reading `wow-classic-items`. |
| GitHub Actions (existing `refresh-item-data.yml` pattern) | New `refresh-expansion-reference.yml`: scheduled and manual. Re-snapshots wago and Wowhead for manifests with `status: 'provisional'` and opens a PR when anything changes | This is the "watch each new 1.60.x build for Barrow Deeps and Hyjal Summit" loop from the todo, automated. It must tolerate wago 503s: skip and retry, never fail red. |
| luajit tests in the addon repo (existing, `alexandermayes/loot-list-plus-addon`) | Parity tests for the Lua need-key classifier and the additive import fields | Extend `tests/tools/gen_web_fixtures.mts` so TypeScript and Lua classify the same fixture items identically, as is already done for `ScoreEngine`. |

## Installation

```bash
# Runtime: manifest, need catalogue, Drop Desk and addon payload schemas
npm install zod@4.6.5 --save-exact

# Scripts only: wago.tools DB2 CSV snapshots
npm install -D csv-parse@^7.0.3

# No version change, raise the declared floor to what the lockfile already resolves (2.106.1)
#   "@supabase/supabase-js": "^2.106.1"
```

Nothing to install in `discord-bot/`, `companion/` or the addon repo.

## Data model (feature 1 and the BLP question)

### Facts that constrain the choice (from `supabase/migrations/20260101000000_baseline_schema.sql`)

- `loot_items` already has `item_slot`, `armor_type`, `weapon_type`, `primary_stat`, `classification` (Reserved / Limited / Unlimited, the points-based restriction), `allocation_cost` (the slot-weighted loot cost), `roles`, `is_loot_council`. `wowhead_id` is nullable.
- `loot_submission_items(submission_id, loot_item_id, rank, slot)`. `slot` is the copy number and is `CHECK (slot IN (1, 2))`.
- BLP is derived (`recompute_blp_for_item(guild, loot_item_id)`, migration `20260609000001`). Contenders are people who ranked `loot_item_id` in an approved list. They earn a pass when that `loot_item_id` is awarded at an event they attended, and a win resets them.
- `raid_tiers` and `loot_items` are per guild (expansion to tier to items), created by the seeder.
- The award "why" snapshot already exists as `DecisionContext` (`domain/types.ts:324`). It is built **in the browser** in `ItemCandidateModal.tsx` and stored in `audit_logs.new_data` through `/api/loot-history/bulk`.

### Options

| Option | Shape | Rewrite cost | Verdict |
|---|---|---|---|
| **A. Needs are loot items** | `loot_items.kind text NOT NULL DEFAULT 'item' CHECK (kind IN ('item','need'))` plus `need_key text`. Need rows have `wowhead_id NULL` and reuse slot, armour, stat, classification and cost columns | Low. Lists, ranks, copies, scoring, BLP, the master sheet and the addon export work unchanged. Item-only surfaces must filter `kind = 'item'` or render a NeedChip where `ItemLink` currently needs a numeric `wowheadId` | **Recommended** |
| B. Separate `discovery_needs` table | `loot_submission_items.need_id` with an XOR check against `loot_item_id` | High. Every reader of `loot_submission_items` (BLP SQL, `buildMemberRankedItems`, export, Discord `/priority`, master sheet, scoring inputs) gains a second branch | Reject. It is the rewrite the brief rules out |
| C. Generic "list entry" polymorphic table | New table replacing `loot_submission_items` | Very high | Reject |

### Recommended additions (Option A)

1. **`raid_tiers.list_mode text NOT NULL DEFAULT 'known' CHECK (list_mode IN ('known','discovery'))`.** Each tier has a mode, matching the PRD. Known mode switching is deferred, but the column costs nothing now.
2. **Need rows** seeded per guild tier from the manifest's need catalogue. `need_key` is a stable machine key such as `two_hand:str`, `trinket`, `tier:head`. A partial unique index enforces `(raid_tier_id, need_key) WHERE kind = 'need'`. A check enforces `kind <> 'need' OR wowhead_id IS NULL`. Classification comes from the manifest: weapons and trinkets Reserved, jewellery and tier Limited, the rest Unlimited.
3. **Copies beyond 2.** "Tier piece #1 to #N" needs more than two copies. Relax `loot_submission_items_slot_check` to `slot BETWEEN 1 AND 8` and keep the real cap in `domain/loot/slot-capacity.ts` (`maxCopiesForItem`). A CHECK cannot read the item's kind; if it must be enforced in the DB, use a trigger.
4. **Pins: `loot_item_need_pins(guild_id, item_id → loot_items(kind='item'), need_id → loot_items(kind='need'), pinned_by, pinned_at)`**, `UNIQUE (guild_id, item_id)`. RLS: active members select, officers write (`is_guild_officer`).
5. **Need-aware BLP with one column and one expression.** Add `loot_history.need_item_id uuid NULL`, the need a revealed drop was settled against, set by the Drop Desk. In `recompute_blp_for_item`, key the award events on `COALESCE(lh.need_item_id, lh.loot_item_id) = p_loot_item_id`. BLP then accrues per need ("by slot") with no new tables and no change to the derived and self-healing design. Recompute both ids on award, edit and delete (this also covers defect 4 in the brief). Extend the `enforce_loot_history_guild_refs` trigger so `need_item_id` must be a `kind='need'` row of the same guild. "Attach BLP to the specific item once seen" is part of the deferred Known transition; in v2.0 BLP stays on the need, and pins make it visible on the revealed item.
6. **Drop decision log: `drop_decisions`**, append-only (no UPDATE or DELETE policy). Columns: `id uuid` (client generated, the **idempotency key** against double taps on raid night), `guild_id`, `raid_event_id`, `item_wowhead_id`, `need_item_id`, `loot_history_id`, `outcome_type`, `override_reason`, `decision_context jsonb` (the existing `DecisionContext` shape), `decided_by`, `decided_at`.
7. **One `SECURITY DEFINER` RPC, `award_drop(...)`**, which in a single transaction inserts `loot_history` (with `raid_event_id` and `need_item_id`), inserts `drop_decisions`, recomputes BLP for both ids and calls `realtime.send`. **Build `DecisionContext` on the server**, not in the browser as `ItemCandidateModal` does today, so the override audit cannot be stale or forged. This matches the existing pattern of definer RPCs with tightened grants (`20260930000200`).

## Drop Desk realtime design (feature 2)

| Concern | Recommendation | Why |
|---|---|---|
| Candidate ordering | Compute in the browser from one `GET /api/drop-desk/snapshot?raid_event_id=` payload: needs, ranks, standing components, BLP and pins. Re-sorting on a classification change is pure TypeScript from `domain/scoring` (it already runs client-side through `explainScore`) | Zero network round trips per tap. This, not a push channel, is what makes it "instant" |
| Writes | `useOptimistic` or SWR `optimisticData` with `rollbackOnError: true`, then call `award_drop` | Immediate UI with an honest rollback |
| Change signal | **Broadcast from the database**: AFTER triggers on `drop_decisions`, `loot_item_need_pins` and `loot_history` call `realtime.send(jsonb_build_object('raid_event_id', ...), 'changed', 'drop-desk:' \|\| guild_id, true)`. The client subscribes with `{ config: { private: true } }` after `await supabase.realtime.setAuth()` and on each message calls `mutate(snapshotKey)` | IDs only in the payload, so nothing leaks. Fires for addon, companion and bot writes as well as the web |
| Authorization | `CREATE POLICY ... ON realtime.messages FOR SELECT TO authenticated USING (extension = 'broadcast' AND public.is_guild_officer(split_part((select realtime.topic()), ':', 2)::uuid))`. Add a separate member-read policy if raiders get a read-only view | Supabase caches policies per connection, so keep the policy to one indexed helper call. **Do not `ALTER TABLE realtime.messages ENABLE RLS` in a migration**: the docs say it fails with must-be-owner and aborts the migration, and this repo auto-deploys migrations ~12 s after merge |
| Fallback | SWR `refreshInterval: 10000` only while the desk is open and visible, `revalidateOnFocus: true`, `revalidateOnReconnect: true`. Use broadcast `replay` on resubscribe if needed | Realtime is a hint, not the source of truth. Polling keeps the desk correct if the socket dies |
| Capacity | Pro plan: 500 concurrent connections, 500 messages/s, 3,000 KB broadcast payload (Supabase limits page) | Officers only (1 to 5 per raid) fits easily. If every raider watches live, peak raid nights could approach 500. Gate the raider live view behind a flag and measure first |
| Project setting | In Realtime settings, turn off "Allow public access" before shipping | Nothing uses Realtime today, so private-only is safe and stops public-channel snooping |

**Why not Postgres Changes:** every event is authorised once per subscriber, changes are processed on one thread, RLS is not applied to DELETE events, and the tables would have to join the `supabase_realtime` publication. Broadcast avoids all four.

## Expansion manifest format (feature 3)

| Decision | Recommendation |
|---|---|
| File type | **TypeScript data module**, `data/expansions/<slug>/manifest.ts`, typed with `satisfies z.input<typeof ExpansionManifestSchema>`. Comments can carry provenance ("GH-269", "build 1.60.1.70009"), which JSON cannot. The existing data files are TS. Use JSON only for the *generated* reference snapshots |
| Schema | `domain/expansion/manifest-schema.ts` (zod). Top level: `slug`, `displayName`, `gameVersion`, `wowhead: { domain: 'forever', tooltipPath: '/forever/tooltip/item/' }` (replacing the name-keyed `EXPANSION_TO_WOWHEAD_DOMAIN` in `ItemLink.tsx` and the retail links in `lib/discord-loot-announcements.ts`), `reference: { product: 'wow_classic_beta', buildPrefix: '1.60.' }`, `raids[]` (`bosses[]`, optional `items[]` keyed by `wowheadId`), `tokenClasses` keyed by `wowheadId`, `discovery.needs[]`, and per-entry `verification: 'verified' \| 'provisional'` |
| Runtime use | `app/services/expansionSeeder.ts` imports a registry (`data/expansions/index.ts`, slug to manifest) and calls `ExpansionManifestSchema.parse` once per seed. This removes the displayName if/else chain (lines 382 to 405) and the hard-coded registry (195 to 207) |
| Reference snapshots | `scripts/expansions/snapshot-reference.ts` resolves the build (filter `/api/builds` on the `1.60.` prefix; the list is not date-sorted). It downloads `https://wago.tools/db2/<Table>/csv?build=<build>` for `Item`, `ItemSparse`, `Map`, `DungeonEncounter`, `ChrClasses` and `ChrRaces`, parses them with csv-parse, **trims to the ids the manifest references**, and writes `data/expansions/forever/reference/wago-<build>.json` with `build` and `fetchedAt`. For Wowhead it fetches `nether.wowhead.com/forever/tooltip/item/<id>` for the same ids and writes `reference/wowhead.json` |
| Gate | `data/__tests__/expansion-manifests.test.ts` loops over the registry. Checks: schema parse; unique `wowheadId`s; every item id is in a snapshot with a matching normalised name (reuse `normalizeItemName` from `classic-wow-raids.test.ts`); `InventoryType` agrees with the slot; Item `ClassID` / `SubclassID` agree with `armor_type` / `weapon_type`; token classes fall within ItemSparse `AllowableClass` where it is non-zero; every Discovery need slot maps to a real `InventoryType`. `provisional` entries are listed in an explicit allowlist that must shrink over time (a ratchet), so unverified Forever boss names cannot pass silently |
| Columns used (WoWDBDefs, checked 2026-10-12) | `Item`: `ID, ClassID, SubclassID, InventoryType`. `ItemSparse`: `ID, Display_lang, InventoryType, ItemLevel, OverallQualityID, StatModifier_bonusStat_*, AllowableClass`. Confirm exact CSV headers on the first successful pull, because wago flattens arrays with `_N` suffixes |

**Verified reachability on 2026-10-12:**

| URL | Result |
|---|---|
| `https://wago.tools/api/builds`, `/api/builds/wow_classic_beta`, `/db2/ItemSparse/csv?build=1.60.1.70009` | **503, maintenance page**, on two probes several minutes apart. It was 200 on 2026-09-25 per the todo, so the snapshot script must retry and back off |
| `https://nether.wowhead.com/forever/tooltip/item/271940` | 200 JSON `{name, quality, icon, tooltip, spells}` |
| `https://nether.wowhead.com/forever/tooltip/item/99999999` | 404 `{"error":"ID is out of range"}` |
| `https://www.wowhead.com/forever/item=271940` | 202 with an empty body (bot challenge). **Do not scrape item pages**; use the tooltip JSON |

**The tooltip JSON is enough to classify a revealed drop.** The HTML contains the slot text (`<td>Hands</td>`), the item class and subclass in a comment marker (`<!--scstart4:4-->` means armour, plate), and stat ids (`<!--stat4-->` Strength, `3` Agility, `5` Intellect, `6` Spirit, `7` Stamina). A small regex parser in `lib/wowhead-forever.ts` is enough; no HTML library is needed. Sampled live: 271930 (`2:15` Main Hand, Int), 271941 (`4:4` plate, Str), 271945 (`4:1` cloth, Int), 271950 (`4:3` mail, Int). Ids 271940 and 271941 are both "Theramore Gauntlets" with different stats, which shows again that **names are not keys**.

## Delivery to the addon and the Discord bot (feature 4)

| Channel | Recommendation | Why |
|---|---|---|
| Addon import string | Keep `LLP1:1:` + base64(raw deflate(JSON)) (`app/api/addon/export-string/route.ts`). Add **optional** fields: `needCatalog` (need_key to slot group, armour, stat, classification), `members[].needs` (same rank and copy semantics as `items`), `pins` (wowheadId to need_key), and `needKeyRules` (InventoryType to slot group, subclass to armour, stat id to main stat), so the Lua classifier is data-driven. Bump the version only if existing fields change meaning | The addon's `Sync:ProcessImport` and `ParseJSON` read known keys, so older addons ignore the new fields. Payload growth is small: about 40 raiders × 15 needs × ~30 bytes ≈ 18 KB raw, a few KB compressed |
| Classifying a drop in game | The addon classifies locally with Mainline APIs. `C_Item.GetItemInfoInstant(itemID)` gives equip location, classID and subclassID with no server round trip; `C_Item.GetItemStats(link)` gives the main stat once the client holds the item. Then it orders candidates with the existing `ScoreEngine.lua` port | Blizzard hides stats until the item drops on your server, so Wowhead may not have a brand-new item yet. The client that just looted it always does. Web Drop Desk fallback when Wowhead returns 404: three-tap manual classification (slot, armour, stat) |
| Live decisions mid-raid | **Not through the companion or SavedVariables.** Use the addon's own in-raid comms (the existing `Core/Comms`, Ace3 parts) for officer-to-raider fan-out, and the existing export / companion path for after-raid sync | SavedVariables are read only at login or `/reload`. The Forever beta also has a reported bug where SavedVariables are written at logout but **not read at login** (ForeverSVBridge, updated 2026-09-24, Windows-only workaround). The companion path is unreliable until Blizzard fixes that |
| WeakAuras | **Do not build WeakAura export strings** | The WeakAuras team declined to support Mainline (Midnight) because of "secret values". Blizzard says Forever shares the Mainline UI architecture and most 12.1.5 APIs |
| MRT or other note addons | Offer **"Copy as plain text"** (one line per need: `Two-hand (Str): Raider1 > Raider2 > Raider3`). No colour codes, no `{rt}` markup | MRT availability on Forever is unconfirmed. Plain text pastes into any note addon, Discord or chat |
| Discord bot | No new libraries. Fix `/priority` (defect 2) to read `loot_submission_items`. Add a need-aware reply (a need key, or a revealed item id resolved through pins). Build Wowhead links from the manifest's `wowhead.domain` (defect 5). Post Drop Desk decisions through the existing `notifyLootAward` and `discordFetch` path, within the existing 4096-character description clamp | discord.js 14.25.1 already supports everything required. 14.27.0 is optional and outside this milestone |

## Alternatives Considered

| Recommended | Alternative | When to use the alternative |
|---|---|---|
| zod 4 | valibot 1.5.0 (smaller bundle) | Only if manifest or need schemas must ship to the browser and bundle size becomes measurable. Even then, try `zod/mini` first |
| zod 4 | Ajv + hand-written JSON Schema | Only if manifests become JSON edited by non-developers. Generate the schema with `z.toJSONSchema()` rather than maintaining two |
| TS manifest modules | JSON manifests | When a non-developer pipeline (spreadsheet export, admin UI) writes manifests. Keep generated reference snapshots as JSON either way |
| Supabase Broadcast from the DB | Client-sent broadcast after a successful write | Never as the only signal: addon, companion and bot writes would not fire it |
| Supabase Broadcast | SWR polling only (10 s) | Acceptable as an MVP for the 2026-11-30 Drop Desk date if the Realtime RLS work slips. The desk still works, with up to 10 s lag across officers |
| csv-parse | papaparse 5.7.0 | If CSV parsing ever moves into the browser (for example an officer uploads a CSV). For Node scripts, csv-parse's sync API is simpler |
| Needs as `loot_items` rows | Separate `discovery_needs` table | If Known-mode needs ever require columns that conflict with items. Revisit at the deferred Known transition, not now |

## What NOT to Use

| Avoid | Why | Use instead |
|---|---|---|
| Supabase **Postgres Changes** | Authorises per subscriber per event, runs on a single thread, applies no RLS to DELETEs, and needs publication changes | Broadcast from the DB with private channels |
| Pusher, Ably, Liveblocks, PartyKit, Socket.io | A second realtime vendor, secret set and auth model, when Supabase Realtime is already in the plan and in the client | Supabase Broadcast |
| Replicache, Zero, ElectricSQL or other local-first sync engines | Heavy infrastructure for a page with one writer at a time; the snapshot plus local sort gives the same "instant" feel | Snapshot + `domain/scoring` in the browser + `award_drop` RPC |
| TanStack Query, Zustand, Redux, Jotai | SWR and React Context already cover this; two cache layers cause stale-data bugs | SWR (with a Drop Desk-specific config) + `useOptimistic` |
| Prisma, Drizzle or another ORM | Migrations are hand-written SQL with RLS, auto-deployed; types come from `npm run gen:types` | `supabase-js` + SQL migrations + definer RPCs |
| tRPC, next-safe-action | Route handlers plus `authenticateAddonRequest` / `verifyOfficerPermissions` are the house pattern | Route handlers that `schema.parse(await req.json())` with zod |
| cheerio, jsdom or another HTML parser at runtime for tooltips | The tooltip markers are stable comments, so a regex is enough; jsdom is a heavy test-only dependency | A small regex parser with fixture tests on real tooltip JSON |
| Scraping `wowhead.com/forever/item=` pages | It returns a 202 bot challenge | `nether.wowhead.com/forever/tooltip/item/<id>` JSON |
| Live wago.tools calls from tests or app runtime | Returned 503 all of 2026-10-12, and the beta product key will likely change at the 2026-11-04 launch | Committed trimmed snapshots + a scheduled refresh workflow |
| Blizzard Game Data API for Forever | No Forever namespace verified (todo, 2026-09-25) | wago snapshots + Wowhead tooltips |
| `wow-classic-items` for Forever verification | Covers Classic Era only | Forever reference snapshots |
| WeakAuras export strings | WeakAuras is not supported on Mainline-based clients | The addon's own import string + plain-text copy |
| New Lua libraries (LibSerialize, AceSerializer swap) | LibDeflate + the addon's own JSON already round-trip under luajit tests | The existing `LLP1:1:` envelope with additive fields |
| A rules engine (json-rules-engine and similar) for need classification | Three small lookup tables (InventoryType, subclass, stat) cover it, and they must be identical in TS and Lua | Data tables in the manifest, exported to the addon |
| New UI kits (shadcn bulk install, MUI, Mantine), cmdk, hotkey libraries | Radix + Framer Motion + the v1.1 design system are present; the simplicity pass is about fewer controls, not more components | Existing `components/ui` primitives |

## Stack Patterns by Variant

**If master loot is confirmed on Forever:**
- The addon is the primary Drop Desk surface on raid night: local classification, `ScoreEngine.lua` ordering, comms fan-out. Awards sync back through export or companion after the raid.
- The web Drop Desk is for council review and audit, and for officers without the addon.

**If Forever uses group loot with a trade window (as on retail):**
- The web Drop Desk is primary. Officers record "who looted what" and the council decides inside the trade window.
- The addon helps classify (it has the item link) and can push the looted item id to the web through the next import.

**If Wowhead has no data for a fresh drop (first kill on a realm):**
- Manual three-tap classification on the web, or the addon's local classification. Never block an award on a Wowhead lookup.

**If the Realtime RLS work slips past the Drop Desk date:**
- Ship with 10 s SWR polling while the desk is visible and add Broadcast in a follow-up. The data model does not change.

## Version Compatibility

| Package | Compatible with | Notes |
|---|---|---|
| zod 4.6.x | TypeScript 5.9.3 (installed), Node 20, Next 16 | Zod 4 needs TS 5.5 or later. The transitive zod 3.25.76 (puppeteer to chromium-bidi) is isolated and unaffected |
| @supabase/supabase-js 2.106.1 (resolved) | realtime-js 2.106.1, @supabase/ssr 0.8.x | `private: true`, `realtime.setAuth()` and broadcast `replay` all exist in the installed typings. Latest is 2.117.3; upgrading is optional |
| swr 2.3.8 | React 19.2.3 | `optimisticData` / `rollbackOnError` already used in the repo. Latest is 2.5.1; not needed |
| csv-parse 7.0.3 | tsx 4.22, Node 20 and 22 | Use `import { parse } from 'csv-parse/sync'` |
| Addon (Mainline API on Forever) | Interface **16001** reported for Forever (LOW, one community source); beta AddOns folder `_classic_beta_` | The addon repo has six `.toc` files today (Interface 11508 for Vanilla up to 110100 for Mainline). Forever needs a `LootListPlus_Forever.toc` (or the right suffix) with the confirmed interface number. Verify in the client before release |
| discord.js 14.25.1 | Node 20 | No change required |

## Sources

- In-repo, read 2026-10-12 (HIGH): `package.json`, `package-lock.json` / `npm ls`, `node_modules/*/package.json`, `supabase/migrations/20260101000000_baseline_schema.sql`, `20260609000001_blp_recompute_from_history.sql`, `20260930000200_tighten_function_execute_grants.sql`, `app/api/addon/export-string/route.ts`, `app/api/addon/import-string/route.ts`, `app/hooks/use-api.ts`, `app/(app)/master-sheet/components/ItemCandidateModal.tsx`, `domain/types.ts`, `app/components/ItemLink.tsx`, `lib/discord-loot-announcements.ts`, `app/services/expansionSeeder.ts`, `companion/src/main/sync-engine.ts`, `next.config.ts`, addon-repo notes in `.planning/workstreams/default/quick/261002-k0n-*/261002-k0n-PLAN.md`
- npm registry via `npm view`, 2026-10-12 (HIGH): zod 4.6.7 latest (publish times for 4.6.5 to 4.6.7), csv-parse 7.0.3, papaparse 5.7.0, valibot 1.5.0, swr 2.5.1, @supabase/supabase-js 2.117.3, discord.js 14.27.0, fflate 0.8.3, lz-string 1.5.0
- Supabase docs via WebFetch (official; GSD seam tier LOW for WebFetch, treated as MEDIUM because first-party): https://supabase.com/docs/guides/realtime/subscribing-to-database-changes, https://supabase.com/docs/guides/realtime/authorization, https://supabase.com/docs/guides/realtime/broadcast, https://supabase.com/docs/guides/realtime/postgres-changes, https://supabase.com/docs/guides/realtime/limits
- Zod docs (official): https://zod.dev/json-schema (z.toJSONSchema options and unrepresentable types)
- WoWDBDefs (HIGH for column names, MEDIUM for exact wago CSV headers): https://github.com/wowdev/WoWDBDefs (`definitions/Item.dbd`, `definitions/ItemSparse.dbd`)
- Live probes by curl, 2026-10-12: wago.tools endpoints (503), nether.wowhead.com Forever tooltips (200 and 404 shapes, sampled ids 271930 to 271950), wowhead.com Forever item page (202)
- Community (LOW to MEDIUM): ForeverSVBridge, https://www.curseforge.com/wow/addons/foreversvbridge (beta SavedVariables bug); search results quoting Forever on the Mainline API and interface 16001 (CurseForge Forever addon pages, warcraft.wiki.gg API page); WeakAuras ending Mainline support, https://www.icy-veins.com/wow/news/weakauras-to-end-support-in-midnight/ and https://www.wowhead.com/news=378740/no-weakauras-addon-for-midnight; Midnight encounter chat lockdown (`C_ChatInfo.InChatMessagingLockdown`), CurseForge addon notes and https://www.icy-veins.com/wow/news/combat-addon-restrictions-eased-in-midnight/; loot method on Forever still not officially confirmed, https://guildorder.com/games/wow_forever/wiki/loot-systems-for-a-10-and-a-20
- GSD research cache: digests stored under keys `1985e76c...`, `d47734dc...`, `dc054afa...`, `b5a60498...`

---
*Stack research for: LootList+ v2.0 WoW Forever Loot (Discovery to Known)*
*Researched: 2026-10-12*
