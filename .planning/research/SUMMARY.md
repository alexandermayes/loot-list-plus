# Project Research Summary

**Project:** LootList+ v2.0, WoW Forever Loot: Discovery to Known (workstream `forever`)
**Domain:** Guild raid loot management for WoW, Forever first (Discovery need lists, raid-night Drop Desk, manifest-driven expansion onboarding)
**Branch:** `gsd/v2.0-forever-loot` (HEAD 35c088da)
**Researched:** 2026-10-12
**Confidence:** MEDIUM overall (HIGH for in-repo facts, MEDIUM for designs, LOW for unpublished Forever facts)

## Executive Summary

LootList+ v2.0 adds a loot path for a game where item lists cannot exist at raid open. Blizzard hides item stats until an item drops on a server, and no data source reveals raid loot early. Current guild tools either wait for item data (That's My BiS, Gargul, softres.it, Viserio wishlists) or decide at the corpse with votes (RCLootCouncil). The research points to a third path that fits what LootList+ already has: raiders rank generic needs (slot, armour class, stat family) from day one, officers classify each revealed drop and award it from a Drop Desk in seconds with a visible one-sentence reason, and everything runs on the existing Next.js, Supabase, SWR and pure `domain/scoring` code. Most of the milestone is schema and wiring. v2.0 needs one new runtime dependency (`zod`, pinned exact) and one dev dependency (`csv-parse`).

The approach has five commitments. A need is a `loot_items` row with `kind = 'need'`, so lists, BLP, the master sheet, awards and the addon export keep working. BLP stays derived and is recomputed from every write path, including the award DELETE and PATCH paths that are broken today. The Loot Score is split into standing and interest as a presentation change: the total is unchanged for existing guilds and the new slot-weighted loot-cost component defaults to off. The Drop Desk is web-first, refreshes by SWR polling in v1, and writes each award through one transactional path with idempotency keys. Expansion manifests are keyed by `wowhead_id`, verified offline against committed snapshots, and never fetched at runtime (wago.tools returned 503 on every probe on 2026-10-12). The in-game addon is an accelerator, never a dependency.

Main risks are sequencing and unknowns. Migrations auto-deploy about 12 seconds after merge with no CI on the SQL, so every schema change must be expand-only and deploy before the code that reads it. RLS gaps return empty lists rather than errors, and the repo history shows this has already happened several times. Forever facts the plan leans on (master loot, tier shape, boss names, the addon API on the Forever client) are unconfirmed, so each must be optional or spiked. The calendar is tight: 19 days to the Oct 31 Discovery milestone. The need-grain decision (Decision 1) is needed by Oct 16.

## Key Findings

### Recommended Stack

- **zod 4.6.5 (new, runtime, pinned exact):** one schema for manifests, the need catalogue, Drop Desk bodies and the addon payload. Currently only transitive (via `eslint-plugin-react-hooks`), so declare it. 4.6.7 was published on research day; pin 4.6.5 as a supply-chain precaution.
- **Supabase Realtime Broadcast (already in supabase-js 2.106.1, unused in app code):** optional change signal, fired from a DB trigger so addon, companion and bot writes also trigger it. Not required for v1 (see Disagreements 1 and 13).
- **Postgres schema (existing):** needs, pins, an append-only drop log and one award RPC. No new datastore.
- **SWR 2.3.8 with a Drop Desk-specific config:** do not reuse the global `swrConfig` (it sets `revalidateOnReconnect: false` and `dedupingInterval: 5000`). Raid-night Wi-Fi drops mean reconnect must revalidate.
- **csv-parse ^7.0.3 (new, dev-only):** parses wago.tools DB2 CSV in snapshot scripts. Item names contain commas and quotes, so `split(',')` is unsafe.
- **Upstash Redis (existing):** cache parsed Wowhead Forever tooltips; long TTL for hits, short TTL for 404 `{"error":"ID is out of range"}`.

**Do not add:** Pusher, Ably, Liveblocks, TanStack Query, Zustand, Prisma, tRPC, a rules engine, cheerio or jsdom at runtime, WeakAuras strings (unsupported on Mainline), live wago calls in tests or runtime, scraping `wowhead.com/forever/item=` (202 bot challenge; use the `nether.wowhead.com/forever/tooltip/item/<id>` JSON), the Blizzard Game Data API for Forever (no namespace verified), and `wow-classic-items` for Forever (Classic Era only).

**Live probes 2026-10-12:** wago.tools returned 503 maintenance. Wowhead Forever tooltip returned 200 JSON for valid ids and 404 for invalid ids. The Forever item page returned 202 with an empty body.

### Expected Features

**Must have, by milestone:**
- **Oct 31 (Discovery lists):** five defects fixed; five-row, one-column need picker with smart defaults and a cost budget; need taxonomy frozen in `domain/loot`; Discord "Set your 5" deep link; loot style presets at setup.
- **Nov 30 (Drop Desk):** one-sentence verdict per candidate with Award and Council buttons; audited council override with a reason; award outcome (awarded, disenchanted, council); who's-interested responses on web and Discord; Discord loot thread; "What would it take"; chase-item council card; a path that works with no master loot.
- **Table stakes throughout:** class and armour eligibility filter; main spec before off spec; attendance and BLP that accrue before items exist; correct Forever Discord links; 10/20/40 player support; Discord-login onboarding with no addon.

**Differentiators:** smart-default list ("Looks right" in one tap); revealed-item map pooled across guilds (post-Dec 9, 10-guild floor, no guild names); auto-classify from an item link (spike first); crafted-tier essence queue (only if confirmed); opt-in public loot record.

**Defer:** Known-mode transition (resets 3 to 6, per the brief); TMB importer; co-officer phone desk; Droptimizer or sim integration; raid assignments, positioning and comp (the owner's separate tool).

**Anti-features:** GDKP, gold or resource bidding (banned on Forever); pre-launch BiS or guessed loot tables; DKP-style spending; officer-typed GP per item; custom need-taxonomy builder; mandatory raider addon; in-encounter addon voting; AI auto-award with no confirm; cross-guild leaderboards with names.

### Architecture Approach

The change is additive. The existing lifecycle (submission, approval, snapshot, award, BLP, export) is reused. New pieces:

1. **Need taxonomy** (`domain/loot/needs.ts`): one pure `classifyItem()` used by the picker, the seeder and the Drop Desk.
2. **Candidate ranker and drop ordering** (`domain/loot/rank-candidates.ts`, `drop-order.ts`, extracted from `MasterSheetContent.tsx:925-993`): orders by response bucket, then total, then standing, then name.
3. **Award writer** (`lib/loot/award-writer.ts`, extracted from the `loot-history/bulk` POST): one write path for the bulk route and the Desk.
4. **Drop Desk** (`app/api/drops/**`, `DropDesk.tsx`): tables `loot_drops` (state) and `drop_decisions` (append-only audit).
5. **Expansion registry and catalog sync** (`data/expansions/`, `syncExpansionCatalog`): Forever only in v1, idempotent.
6. **Score split** (`domain/scoring/engine.ts` returns `total`, `standing`, `interest`; `loot-cost.ts` opt-in): `total` is the same sum plus a zero-default `lootCost`.

Patterns: discriminated row shared pipeline (`kind` on `loot_items`); derived state recomputed on every write (BLP); claim-then-write for multi-officer actions (refined by Disagreement 4); mode is a property of the raid tier, not `guild.game === 'forever'`.

### Critical Pitfalls

1. **Stale defect todo.** Re-verify each item before planning; do not regress deliberate code (raw-rank `/priority` is by design until decided). Prevention: re-verification table in Phase 1; a typed service-role client for addon and bot routes so queries against nonexistent tables fail typecheck; route tests that fail on PostgREST errors instead of swallowing them.
2. **Nullable FK dual-mode drift.** `need_id` on `loot_submission_items` or `loot_history` makes item readers silently drop or crash on needs. Prevention: `kind` on `loot_items`; reader audit with a guard and test per reader before the schema PR; a tier capability resolver rather than new `guild.game` checks (about 20 files already do this).
3. **BLP silent zero and pin double count.** Need-ranked raiders are never contenders unless the bucket key is the need. Pinning must map, not copy. Property tests: total credits unchanged by pin and unpin; recompute idempotent; order-independent.
4. **Scoring regression and Lua drift.** Golden fixtures (`LOOT_SCORE_FIXTURES`, `engine-contracts.test.ts`) stay byte-identical for every item-mode input; new components default to 0; `format_version` on the export so the Lua side refuses unknown versions.
5. **Name-keyed joins (GH-269 class) and volatile Forever data.** Manifest keyed by `wowhead_id`, names display-only; unknown token means "needs review", not allow-all; `provisional` flag on unverified bosses; committed snapshots with provenance; a grep test that no runtime code fetches wago or Wowhead; the Desk works with an unknown boss and an item not yet in the catalog.

Also critical: **migration ordering and silent RLS** (expand-and-contract, local `db reset` evidence in each PR, a raider/officer/non-member/ex-member policy matrix per new table) and **Drop Desk races** (client idempotency key per decision, conditional status update, synchronous recompute for the single bucket being awarded).

## Implications for Roadmap

Dates come from the brief and the architecture build order. Phases 1 and 2 can run in parallel.

### Phase 1: Forever defects and link fixes (Oct 12 to 16)
**Rationale:** downstream correctness depends on awards and BLP; defect #4 is a prerequisite for Desk undo; links must be fixed before any Forever award is announced.
**Delivers:**
- Defect #4: award DELETE and PATCH collect the affected `loot_item_id` (where `raid_event_id` is set) and call `recomputeBlpForItems` in `after()`, with route tests.
- Defect #1 remainder: `bad_luck_protection` becomes `blp_tracking`; `item_priorities` becomes `guild_item_priorities` (column `item_id`, mapped back to the existing output key so the companion contract holds). Check errors instead of discarding them.
- Defect #5: `domain/expansion/wowhead.ts` with `wowheadItemUrl(expansion, id)`, used in `lib/discord-loot-announcements.ts`, `app/api/discord/post-raid-summary/route.ts:281` (third site, hardcoded `/classic/`) and `discord-bot/interactions.js:79-81`. Bot receives `item_url` from the server. Remove the em dash in the bot embed title (`interactions.js:85, 95`).
- Defect #2 relabel: reply says "by list rank" until the Loot Score ranker lands (Decision 10).
- Gap found: `ALLOWED_COMPONENT_KEYS` in `app/api/loot-history/bulk/route.ts:19` drops `donationBonus` and `raiderBonus` from the award receipt. Add them.
- PostHog fix: `master_loot_awarded` (`app/(app)/master-loot/_client.tsx:262`) stops sending `character_name` and stops using review status as `item_name` (Decision 19).
**Avoids:** Pitfalls 1, 3 (defect #4 part), 9.
**Research flag:** standard. Skip research-phase.

### Phase 2: Expansion manifest, SEED-001 (Oct 13 to 21)
**Rationale:** Forever needs raids and bosses before any loot exists; manifests must precede need rows.
**Delivers:**
- `domain/expansion/manifest-schema.ts` (zod) and `data/expansions/` with a client-safe registry (heavy catalogues server-only, per `domain/expansion/game.ts:9-13`).
- Adapters for the five legacy expansions that emit the manifest shape, expanding name-keyed entries to every matching id. The golden-row snapshot test must pass unchanged. No rewrite of legacy data.
- Forever native: raids and bosses only, `lootMode: 'discovery'`, `items: {}`, bosses `provisional` unless present in a pinned DungeonEncounter fixture.
- `syncExpansionCatalog`: idempotent, Forever only, never deletes or renames a referenced row.
- Vitest manifest gate (unique ids, token classes present, phase and raid coverage, stored name agrees with `EXPANSION_GAMES`) with a shrinking allowlist for provisional entries.
- Replaces the displayName chains at `app/services/expansionSeeder.ts:449-462` and `:470-481` and the registry at `:224-237`.
- Offline snapshot script with retry and backoff for wago 503s; scheduled refresh workflow opens a PR and never fails red; Refresh Item Data workflow `paths` extended to the manifest location.
**Avoids:** Pitfalls 5, 6, 7.
**Research flag:** light. Confirm wago CSV headers on the first pull (array columns flatten with `_N` suffixes).

### Phase 3: Discovery schema and taxonomy (Oct 19 to 23)
**Rationale:** the biggest blast radius; migration-only PR with `--admin` merge, on a non-raid day, before code.
**Delivers (expand-only):**
- `raid_tiers.list_mode text NOT NULL DEFAULT 'known' CHECK (list_mode IN ('known','discovery'))`.
- `loot_items.kind` (default `'item'`), `need_key`, `revealed_at`; CHECKs added `NOT VALID` then validated; partial unique index on `(raid_tier_id, need_key) WHERE kind = 'need'`; need rows have `wowhead_id IS NULL`.
- `loot_submission_items` slot CHECK relaxed to `BETWEEN 1 AND 8`; real per-item cap in `domain/loot/slot-capacity.ts` (`maxCopiesForItem`, with a need branch).
- `loot_history.awarded_item_id` (the real revealed item when an award is against a need).
- `loot_item_need_pins` (guild_id, item_id, need_id, `UNIQUE (guild_id, item_id)`); officers write, active members read.
- `guild_settings` loot-cost columns, default off.
- Need rows seeded per Discovery tier from `needs.ts`; weapons and trinkets Reserved, jewellery and tier Limited, others Unlimited; allocation cost 1/1/0.
- Reader audit: every reader of `loot_submission_items` and `loot_history` (BLP SQL, `buildMemberRankedItems`, export, `/priority`, master sheet, `gargul-dft.ts`) has a mode branch or guard with a test.
- PGlite migration test; regenerated `lib/database.types.ts`; RLS matrix per new table.
**Avoids:** Pitfalls 2, 11, 12, 14.
**Research flag:** needs `/gsd-plan-phase --research-phase` (reader audit and BLP keying). Blocked on Decisions 1 and 2.

### Phase 4: Discovery lists and score split (Oct 21 to 30; milestone Oct 31)
**Delivers:**
- `NeedPicker`: one column, five rows, three questions (slot, armour class where it matters, stat family); budget as one sentence; "Looks right" or "Save my 5". Entry points: Overview, Discord DM button, first-run in guild join.
- Spec smart defaults (Decision 5) and three loot style presets at setup, with "Fine-tune" behind disclosure.
- Need-aware item query in `lib/loot-items-query.ts`: a `kind === 'need'` branch before token and name inference.
- `itemIdentityKey(item) = wowhead_id ?? 'need:' + id` used by received-skip (`apply-receive-skip.ts`, `lib/addon/member-ranked-items.ts`, `MasterSheetContent.tsx:919`).
- Master sheet `NeedLabel` (need rows have no `ItemLink` and no boss).
- Reserve and BIS routes exclude Discovery tiers; addon exports filter `kind = 'item'`; BIS import (`LootListContext.tsx:590-700`) skips Discovery tiers.
- `computeScore` returns `total`, `standing` (total minus interest) and `interest` (`itemRank`); `lootCost` defaults to 0; `explainScore` shows the loot-cost line only when non-zero. Lua fixtures unchanged while zero.
**Avoids:** Pitfalls 4, 15, 16.
**Research flag:** none for score split (golden fixtures define it). Picker needs copy sign-off and 375px checks, and officer validation of defaults.

### Phase 5: Ranker extraction and Loot Score everywhere (Nov 2 to 10)
**Delivers:** `domain/loot/rank-candidates.ts` used by the master sheet with no behaviour change; `lib/loot/candidate-ranking.ts` server loader for the bot and for award-time verification; `/api/bot/priority` ordered by Loot Score if Decision 10 says so; loot-cost opt-in setting (off by default, Decision 9).
**Research flag:** standard.

### Phase 6: Drop Desk (Nov 9 to 24; milestone Nov 30)
**Delivers:**
- Expand-only migration: `loot_drops` (guild_id, raid_event_id, raid_tier_id, nullable boss_name and wowhead_id, item fields, need_id, status `open|awarding|awarded|disenchanted|void`, source `manual|addon|import`, `source_award_key` unique per guild, responses jsonb, loot_history_id, decided_by/at). `drop_decisions` append-only (no UPDATE or DELETE policy; client idempotency key). `loot_history.drop_id`. Allow-list `loot_history.source = 'desk'` before any desk code ships (current CHECK is `web | addon | import`).
- One `SECURITY DEFINER` RPC: in one transaction, claims the drop, inserts history and the decision row, and recomputes BLP for the awarded bucket synchronously (Disagreement 4).
- `app/api/drops/**`: GET snapshot per raid night (needs, ranks, standing components, BLP, pins in one payload); POST manual drop (Known tiers resolve by `wowhead_id`; Discovery tiers create or find a revealed row); PATCH classify (NeedPicker); POST award; void.
- Desk UI inside Raid Mode (evolves `RaidModeView` and `ItemCandidateModal`). Server builds `DecisionContext`.
- Ordering: response bucket (main spec before off spec; pass or absent last), then total, then standing, then name.
- Addon `loot-award` route: unknown id in a Discovery tier goes to the desk inbox (`source 'addon'`) instead of 404. The companion never retries, so today a Forever award is lost.
- Undo: void reopens the drop, reverses the award, recomputes BLP, edits the Discord message.
- SWR hook with its own config: poll 5 s only while open and visible; revalidate on focus and reconnect; `mutate()` after own actions; `optimisticData` with `rollbackOnError`.
- Discord: one edited, debounced message per raid night (Decision 12).
- PostHog events: ids and counts only.
- Desk gate: `guild_settings.drop_desk_enabled`, not a PostHog flag.
**Avoids:** Pitfalls 8 (web-first, works with addon absent), 9, 10, 13, 14.
**Research flag:** needs `/gsd-plan-phase --research-phase` (RPC versus TypeScript writer split, Discord batching, undo semantics, addon inbox contract). Addon-side work is in the separate repo and needs its own spike.

### Phase 7: Rehearsal, copy and beta night (Nov 23 to 28; milestone Nov 30)
**Delivers:** replay of a past raid's real award log on a staging guild; officer-only dry run; named officer authorised to abandon to paper fallback; reconciliation of `loot_history`, BLP and the Discord post; signed copy sheet (Decision 7); em dash test passing; 375px checks.
**Avoids:** Pitfalls 13, 16. **Research flag:** standard; owner inputs (Decision 13).

### Phase 8: Simplicity pass across the board (audit from Oct 26; cuts after Nov 30)
**Rationale:** the brief asks for the pass across the product. Cuts before the Desk ships risk Nov 30 regressions; removing power features breaks paying guilds. Audit early, cut late.
**Delivers:** owner-signed keep, move or remove list from aggregated PostHog usage (no names). Characterization tests before restructuring `LootListContent.tsx` (2,533 lines), `DashboardContent.tsx` and `raid-tracking/_client.tsx`. Proposed sidebar reduced from up to 11 entries (`app/components/Sidebar.tsx:44-227`, four loot-named) to: raiders get My list, Raid night, History; officers add Drop Desk, Roster, Settings (proposal only). Progressive disclosure with an "Advanced" section keeping every setting reachable. Help content (`lib/help-content.ts`) updated in the same change.
**Avoids:** Pitfalls 15, 16. **Research flag:** needs a UX research pass on navigation. Sidebar proposal is LOW confidence. No formula changes in this phase (Pitfall 4).

### Phase 9: After Dec 9, driven by real drops (not in v2.0 core)
- Reveal card, auto-pin on reveal, revealed-item map (published only at 10+ guilds per number, no guild names).
- Fairness digest, slot soft reserves, public loot record, recap card.
- Auto-classify from the addon, only after the Forever-client API spike.
- Essence queue, only if crafted tier and disenchant-to-essence are confirmed.
- Deferred: Known-mode transition (resets 3 to 6); legacy expansion id conversion (after Nov 30, under the golden-row gate).

### Phase Ordering Rationale
- Defects first, because the brief says so and BLP correctness underpins Desk undo.
- Manifest beside defects: no dependencies, and it unblocks the Forever catalog and need rows.
- Schema is its own phase because it must deploy before code; its reader audit gates the picker.
- Score split rides with the lists: presentation change protected by golden fixtures; the Desk needs `standing` and `interest`.
- Ranker before the Desk so Desk and bot share one ordering function.
- Simplicity audit starts early; cuts ship after the Desk is stable.
- Nothing in Phases 1 to 7 requires Forever loot data. Unknown items and bosses are supported from the start.

### Research Flags
Needs `/gsd-plan-phase --research-phase`: Phase 3 (reader audit, BLP keying); Phase 6 (award RPC versus TypeScript writer; Discord batching; undo; addon inbox); Phase 8 (navigation, needs UX research).
Addon-side spike (separate repo): Forever interface number (16001 reported, unverified); whether loot events fire after the encounter; whether the API exposes a revealed item's stats; whether `C_Item.GetItemStats` works on a fresh drop.
Standard patterns (skip research): Phase 1 (known files and fixes); Phase 2 (mirrors `classic-wow-raids.test.ts` and the existing id-keyed data files `item-types.ts`, `item-unique.ts`, `token-copies.ts`); Phase 4 score split (golden fixtures); Phase 5 (extraction of an existing loop).

## Where the Reports Disagree

| # | Topic | Position A | Position B | Resolution and reason |
|---|-------|-----------|-----------|-----------------------|
| 1 | Drop Desk change signal | ARCHITECTURE: SWR polling at 5 s while open; Realtime deferred as a new subsystem for 1 to 3 officers. | STACK: Broadcast from a DB trigger (private channel), with SWR polling at 10 s as fallback. | **Polling at 5 s in v1.** No new RLS on `realtime.messages`, no migration risk, meets Nov 30, lag up to 5 s. Add Broadcast after the RLS matrix passes, behind the same hook, and drop polling to a 10 to 30 s fallback. STACK is right that a DB trigger covers addon, companion and bot writes; that is the real advantage, and it is a follow-up. (Decision 17.) |
| 2 | Pin storage | ARCHITECTURE: `loot_items.need_id` self-reference on item rows. | STACK and PITFALLS: `loot_item_need_pins` table, unique `(guild_id, item_id)`. | **Pin table.** Keeps the self-reference off the hot `loot_items` table, gives pins their own RLS, makes unpin a delete, matches PITFALLS' mapping-row call. |
| 3 | BLP keying for awards | ARCHITECTURE: `loot_history.loot_item_id` = the need row; add `awarded_item_id` for the real item; recompute SQL unchanged. | STACK: add `need_item_id`; `loot_item_id` stays the revealed item; recompute keys on `COALESCE(need_item_id, loot_item_id)` (changes BLP SQL). | **ARCHITECTURE.** Leaves the most load-bearing query and every `loot_item_id` reader untouched. Cost: for Discovery awards, reporting must read `awarded_item_id` for names. Record this in the Phase 3 reader audit. |
| 4 | Award write path | ARCHITECTURE: TypeScript award writer; claim-then-write via PostgREST with status reset on failure. | STACK and PITFALLS: one `SECURITY DEFINER` RPC (`award_drop`), transactional; PITFALLS adds a version check. | **Hybrid.** Atomic core (claim, insert history, insert decision, synchronous single-bucket BLP) in one RPC, because PostgREST calls are not transactional (ARCHITECTURE admits this). Team routing, copy numbering, audit and Discord stay in the TypeScript writer around it. |
| 5 | Where candidates are ranked | ARCHITECTURE: browser ranking in the master sheet in v1; server loader later. | PITFALLS: server-precomputed candidates per item. STACK: browser sort from one snapshot payload. | **Browser ranking in v1** via the shared pure function, fed by one snapshot endpoint. Same score source as today; no second implementation. Server verifies the top candidate and builds `DecisionContext` at award time, so the receipt cannot be forged. Server precompute becomes necessary only past about 80 raiders per guild. |
| 6 | Discord posting model | ARCHITECTURE and STACK: one `notifyLootAward` post per award. | PITFALLS: one edited, debounced message per raid night, stored on the raid event. | **PITFALLS.** A 40-player night can post several messages a second; rate limits drop or reorder posts from `after()`. Product change (Decision 12). If per-award is kept, run a burst test before Nov 30. |
| 7 | Need grain and scope | ARCHITECTURE: rows per Discovery raid tier; per-raid BLP; a single pool needs a synthetic tier that 37 `raid_tiers` consumers would show. | FEATURES: one list for all three raids, since needs are slot-based; a setting can split by raid size. | **Per-raid tier rows, one picker fanning the ranking out to all three.** The raider sees one list; no synthetic tier; no change to the 37 consumers. Most important owner decision (Decision 1). |
| 8 | Need key format and tier slot | STACK: `two_hand:str`, `tier:head`; DB copy CHECK relaxed to 1 to 8. | ARCHITECTURE: `two-hand\|strength`, `tier\|<role>`, slot `'Tier'`, copy cap in TypeScript only. PITFALLS: `Tier`, never `Token`. | **ARCHITECTURE's key format and `Tier` slot** (`Token` triggers name-substring token lookups, the GH-269 class). Relaxed CHECK from STACK. Settle separator and stat-family names once in Phase 3. |
| 9 | Copy-count enforcement | ARCHITECTURE: need branch in `maxCopiesForItem` only. | STACK: relax the slot CHECK to 1 to 8. | **Both.** The DB must accept the value; TypeScript caps it. Cap alone would reject a legal tier piece #3 at the DB. |
| 10 | Tier column name | ARCHITECTURE: `loot_mode`. | STACK and PITFALLS: `list_mode` (PITFALLS: `items`/`discovery`; STACK: `known`/`discovery`). | **`list_mode` with `known` and `discovery`.** Two of three documents use it; the brief uses Known and Discovery. |
| 11 | Drop table naming | ARCHITECTURE: `loot_drops`. | STACK: `drop_decisions`. PITFALLS: `raid_drops`, `desk_overrides`. | **`loot_drops` (state) plus `drop_decisions` (append-only audit).** |
| 12 | Addon-side classification | STACK: addon classifies locally with `C_Item.GetItemInfoInstant` and `GetItemStats`, orders with `ScoreEngine.lua`. | FEATURES and PITFALLS: unverified; addon may not work on the Forever client at all. | **Spike, not commitment.** Web classification (NeedPicker or Wowhead tooltip) is the Dec 9 path; addon classification is an upgrade after the spike. |
| 13 | Realtime in v1 at all | STACK: yes, with polling fallback. | ARCHITECTURE: no. | **No in v1.** Same as row 1. |
| 14 | Seeder line numbers | STACK: brief's numbers (382 to 405; 195 to 207). | ARCHITECTURE: corrected numbers. | **ARCHITECTURE's.** Forever was added, so the brief's numbers are stale. |
| 15 | Defect #2 status | ARCHITECTURE: half confirmed (items select fixed in #363; raw-rank ordering remains by design). | PITFALLS: mostly fixed; changing to Loot Score is a product decision. | **Both true.** Query defect closed; ordering is Decision 10. |
| 16 | Discovery sync scope | PITFALLS: Desk runs `syncCatalogToGuild` on demand for unknown items. | ARCHITECTURE: Forever only; legacy keeps reviewed SQL backfills. | **Compatible.** Sync is Forever only; the Desk's unknown-item path calls the same function. Legacy is never synced (duplicate-row risk; see `20260926233000`). |

## Corrections to the Milestone Brief

Carry these into `.planning/workstreams/forever/MILESTONE-BRIEF.md` and the defect todo:

1. **Seeder line numbers are stale.** Registry `EXPANSION_DATA` is at `app/services/expansionSeeder.ts:224-237` (not 195 to 207; Forever added at 211 to 219). Display-name if/else chains are at 449 to 462 (classifications) and 470 to 481 (roles), not 382 to 405. Name-based token lookup is at 532 and at read time in `lib/loot-items-query.ts:173-175`.
2. **The addon is in a separate repo.** Lua addon lives in `alexandermayes/loot-list-plus-addon`. There is no `addon/` directory on this branch, and `CLAUDE.md`'s reference is stale.
3. **The defect todo is partly stale.** #1: slot fixed (#290, #301); still wrong: `bad_luck_protection` (should be `blp_tracking`) and `item_priorities` (should be `guild_item_priorities`, column `item_id`), with errors swallowed. #2: items select fixed (#363); raw-rank ordering remains by design until Decision 10. #3: fixed in #322 (`lib/loot/loot-history-rows.ts:79`); close the todo. #4: still open (award DELETE ~445 to 537; PATCH ~558 to 659 in `bulk/route.ts`). #5: still open, with a third site at `post-raid-summary/route.ts:281`, plus `discord-bot/interactions.js:79-81`; the bot embed also has an em dash. Additional: `ALLOWED_COMPONENT_KEYS` drops `donationBonus` and `raiderBonus`.
4. **PostHog privacy issue.** `app/(app)/master-loot/_client.tsx:262` sends `master_loot_awarded` with `character_name` (a player name), and sets `item_name` to the review status. Breaks the no-names-in-analytics constraint; fix in Phase 1.
5. **Sidebar has up to 11 entries.** `app/components/Sidebar.tsx:44-227`, four loot-named (Master Sheet, Loot Lists, Loot Submissions, Loot Management). `/master-loot` renders submission review, not master looting.

## Ranked New Feature Ideas

Score = Impact (1 to 5) x Discovery fit (1 to 5) / Complexity (LOW 1, MEDIUM 2, HIGH 3). Class: TS table stakes, D differentiator. Full switch lines and evidence are in `.planning/research/FEATURES.md`.

| Rank | Feature | Score | Class | Build window |
|------|---------|-------|-------|--------------|
| 1 | Live loot thread in Discord (one edited message per raid, reason on every award) | 16.0 | D | Phase 6 |
| 2 | Weekly fairness digest and drought alert | 16.0 | D | After Dec 9 |
| 3 | "What would it take" standing line | 16.0 | D | Phases 4 to 6 |
| 4 | First-seen reveal card | 15.0 | D | After Dec 9 |
| 5 | Drop Desk verdict line | 12.5 | TS | Phase 6 |
| 6 | Who's-interested responses (phone and Discord) | 12.5 | D | Phase 6 |
| 7 | Smart-default need list ("Looks right") | 12.5 | TS | Phase 4 |
| 8 | Loot style presets at setup | 12.0 | TS | Phase 4 |
| 9 | Public guild loot record (opt-in) | 12.0 | D | After Dec 9 |
| 10 | End-of-tier recap card | 12.0 | D | After Dec 9 |
| 11 | Auto-suggest pin on reveal | 10.0 | D | After Dec 9 |
| 12 | Slot soft reserves for pugs and alts | 10.0 | D | After Dec 9 |
| 13 | Crafted-tier essence queue | 10.0 | D | Conditional on Dec 9 |
| 14 | Chase-item and legendary council card | 10.0 | D | Phase 6 |
| 15 | Zero-setup start (Discord-based guild creation) | 10.0 | TS | Unscheduled (table stakes) |
| 16 | Forever revealed-item map (pooled, 10-guild floor) | 8.3 | D | After Dec 9, needs data |
| 17 | Auto-classify at the corpse (addon) | 8.3 | D | After Dec 9, after spike |
| 18 | Gargul bridge for Discovery priority | 8.0 | TS | Phase 6 only if trade or master loot confirmed |
| 19 | Upgrade size from equipped item level | 8.0 | D | Unscheduled |
| 20 | Co-officer phone Drop Desk | 6.0 | D | Future |
| 21 | One-paste switch from TMB or softres.it | 4.0 | TS | Future |

Recommendation: pull ranks 3, 5, 6, 7, 8 and 14 into the Oct and Nov phases as mapped. Defer 2, 4, 9, 10, 11, 12, 16 and 17 until real Forever drops exist. Rank 13 waits for Dec 9 confirmation.

## Decisions Needed from the Owner

Recommended defaults are given so the roadmap can proceed if no answer arrives. All user-facing copy in each item needs sign-off.

**By Oct 16 (blocks Phase 3):**
1. **Need grain and scope.** Per-raid tier rows with one picker fanning out to all three (recommended), or one expansion pool with a synthetic tier.
10. **Bot ordering until the Loot Score ranker.** Keep raw list rank labelled "by list rank" (recommended), or switch to Loot Score now.
19. **PostHog event fix.** Approve removing `character_name` and correcting `item_name` on `master_loot_awarded`. This changes existing dashboards.

**By Oct 21 (Phase 3 and picker):**
2. **Stat families.** Strength, Agility, Spell damage, Healing, Tank; Physical for jewellery, cloak and trinket. Keep Healing and Spell damage separate until the Forever stat model is confirmed (recommended).
3. **Tier pieces.** Keep "Tier piece" off the default picker (recommended); decide on a "Tier drops as tokens" toggle at 2 points.
4. **Separate lists per raid size.** Guild setting, default off (recommended), or defer.
6. **Cost budget.** 10 points; Big 3, Medium 2, Standard 1; trinkets Big.
23. **Addon scope for Forever.** Is LootList+ addon work (separate repo) in v2.0 scope, and who owns it?
26. **Forever boss names.** Owner or officers confirm Barrow Deeps and Hyjal boss names; until then they stay `provisional`.

**By Oct 26 (picker copy and simplicity audit):**
5. **Spec defaults.** Officer review of all 22 specs, especially Enhancement Shaman (Windfury rework) and Feral.
7. **Copy sign-off** for picker, presets and "Set your 5" entry points. No em dashes.
8. **Score presentation.** Show standing and interest separately, each with a one-sentence explanation (recommended).
18. **Simplicity scope.** Approve the audit; choose sidebar direction; confirm no power features (PPR, priority lists, reserves, Warcraft Logs import, Gargul export) are removed before Nov 30 (recommended).
21. **Ranked feature picks.** Recommended: ranks 3, 5, 6, 7, 8, 14 now; others after Dec 9.

**By Oct 31:**
11. **Drop Desk tier.** Discovery lists stay free (recommended). Decide whether the Desk is free or Premium ($4.99/mo or $39/yr per guild). Gate server-side only.

**By Nov 2:**
9. **Loot cost.** Plumbing ships at zero in October. Decide whether the opt-in toggle ships in v1 and who sets weights and window (recommended: off by default, owner sets weights).
12. **Discord posting model.** One edited, debounced message per raid (recommended), or per award.
17. **Realtime in v1.** Accept polling-only Desk for Nov 30 with up to 5 s lag; defer Broadcast (recommended).

**By Nov 9:**
13. **Beta guild and beta night.** Which guild runs the first live night (brief suggests Big Yikes); staging replay of a past raid log; the named officer who can abandon to paper; rule for voiding rows.
14. **Master loot or trade on Forever.** Unconfirmed. Decide whether the Gargul export is in scope until the beta client confirms the flow.
15. **Rare and chase drops.** Does "Count me in for rare drops" default on (recommended); every council award publishes a one-line public reason.
16. **Off-spec ordering.** Off-spec interest ranks below every main-spec need at the Desk (recommended).

**Before Dec 9 or later:**
20. **Revealed-item map and public records.** Confirm the privacy floor (at least 10 guilds per number, no guild names) and opt-in wording for public loot records and recap cards.
22. **Essence queue.** Hold feature 13 until crafted tier is confirmed live (recommended).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH (in-repo, npm); MEDIUM (Realtime) | Realtime behaviour from first-party docs retrieved via WebFetch. |
| Features | MEDIUM | Competitor mechanics cross-checked (MEDIUM). Forever rules MEDIUM to LOW (datamine, press). Picker defaults LOW to MEDIUM. Reddit blocked; r/classicwow points LOW. |
| Architecture | HIGH (current code); MEDIUM (designs) | Every cited path and line was read directly. Designs not spiked; migration sketches not run against PGlite. |
| Pitfalls | HIGH (codebase); MEDIUM (raid-night, delivery); LOW (Forever client) | Migration history verified. Discord rate limits MEDIUM (no official page retrieved). |

**Overall: MEDIUM.** The engineering plan is well grounded; the calendar and the Forever assumptions are not.

### Gaps to Address
- **Master loot and trade on Forever** (unconfirmed): design the Desk to work without it; verify in the beta client before the Gargul export. Decision 14.
- **Crafted tier and essence** (datamined only): keep "Tier piece" off the default picker; confirm Dec 9. Decision 22.
- **Forever addon API for revealed items:** spike stats for a fresh drop, interface number (16001, unverified), loot events after encounter. Addon repo.
- **Forever stat model:** whether "+healing" and "+spell damage" stay separate. Decision 2.
- **Need-picker defaults:** officer review per spec. Decision 5.
- **Wago CSV headers:** confirm on first pull (`_N` flattening). Phase 2.
- **Forever boss names:** provisional until a pinned DungeonEncounter fixture confirms. Decision 26.
- **Need key format and stat-family names:** settle once in Phase 3 (Disagreement 8).
- **Desk latency:** open under 2 s per drop; not yet benchmarked. Measure on the snapshot endpoint in Phase 6.
- **Discord rate limits:** read response headers in Phase 6 rather than hard-coding.
- **Reddit sentiment:** blocked; a manual pass over Forever threads would strengthen the quote base. Not blocking.

## Sources
- **In-repo (HIGH, read 2026-10-12):** `package.json`, `package-lock.json`; migrations `20260101000000_baseline_schema.sql`, `20260609000001_blp_recompute_from_history.sql`, `20260721000001_add_blp_reset_anchor.sql`, `20260926233000_add_classic_missing_loot.sql`, `20260930000200_tighten_function_execute_grants.sql`, `20261001120000_allow_second_same_night_award.sql`, `20261003180000_policies_require_active_guild_membership.sql`; `app/services/expansionSeeder.ts`; `app/api/addon/{guild-data,export-string,loot-award}/route.ts`; `app/api/loot-history/bulk/route.ts`; `app/api/bot/priority/route.ts`; `app/api/discord/post-raid-summary/route.ts`; `lib/loot/loot-history-rows.ts`; `lib/discord-loot-announcements.ts`; `lib/loot-items-query.ts`; `app/components/{ItemLink,Sidebar}.tsx`; `app/(app)/master-loot/_client.tsx`; `domain/scoring/engine.ts`; `domain/loot/{spec-role-mapping,gargul-dft}.ts`; `data/token-class-mapping.ts`; `utils/blp/recompute.ts`; `discord-bot/interactions.js`; `.github/workflows/{deploy-migrations,refresh-item-data}.yml`.
- **Live probes 2026-10-12 (MEDIUM):** wago.tools 503; `nether.wowhead.com/forever/tooltip/item/<id>` 200 for 271930, 271940, 271941, 271945, 271950 and 404 for 99999999; `www.wowhead.com/forever/item=271940` 202 empty.
- **Planning docs:** `.planning/workstreams/forever/MILESTONE-BRIEF.md`; todos `2026-09-13-build-world-of-warcraft-forever-support...` and `2026-09-28-fix-five-defects-found-in-the-forever-loot-code-review.md`; `.planning/codebase/CONCERNS.md`.
- **External (LOW to MEDIUM):** Warcraft Tavern (2026-09-16 stats hidden; 2026-09-17 GDKP ban); Icy Veins crafted-tier and chase-item datamines (snippets); hostedgg beta datamine; warcraft.wiki.gg Patch 1.60; kami-labs and Icy Veins on Midnight addon restrictions; Guild Order loot wiki; That's My BiS; RCLootCouncil; Gargul; softres.it (Method); Arbiter addons; SimpleLootCouncil; Forever Guide; WowUtils; EPGP slot table (fxpw/EPGP, HIGH for the table); Supabase Realtime docs (first-party via WebFetch); Zod JSON Schema docs; npm registry.

---
*Research completed: 2026-10-12*
*Ready for roadmap: yes, once Decisions 1, 10 and 19 are answered or defaulted.*
