---
status: resolved
trigger: "Issue #273: Tier tokens and some boss loot missing on Classic Era for AQ40 and BWL. Reported examples: \"Carapace of the Old God\" (AQ40 tier token), \"Ring of the Martyr\" (AQ40 boss loot), \"Boots of Pure Thought\" (BWL). Reporter ozafy via Discord, filed 2026-09-26. The items apparently do not appear in the loot list / item picker for Era guilds."
created: 2026-09-26T21:35:00Z
updated: 2026-09-28T03:50:00Z
---

## Current Focus

RESOLVED 2026-09-28. Shipped and verified in production.
  - PR #275 (catalog, token mapping, icons/types, completeness tests) squash-merged 2026-09-28T03:26Z as 605499dd; Vercel production deploy 6701771264 succeeded before the backfill merged (deploy-race split held).
  - PR #282 (backfill migration 20260926233000_add_classic_missing_loot.sql + parity test) retargeted to main, updated, all required checks green, squash-merged 2026-09-28T03:32Z as f1c9beee. deploy-migrations run 36374100414: "apply 20260926233000_add_classic_missing_loot.sql ... Applied 1 migration(s)."
  - GH #273 auto-closed (completed) by #282. The feedback bot posted "Closed (completed)" with the reply quoted in the Discord thread and retitled it "(FIXED) ...", observed in the browser.
  - Not done: the pre-merge staging run and read-only production queries (no DB access in session; .env.local not readable). Substituted code evidence for the expansion-name check (seeder and guild creation use 'Classic'; legacy script 'Classic WoW'; both matched). In-app search not observed (browser not signed in to LootList+).
  - Follow-ups filed: #276 (class-locked set pieces), #277 (Horde heads), #278 (zone-less completeness gap), #279 (AQ20 phase name), #284 (Classic raid recipes, reporter's addendum).
next_action: none

## Prior Focus (history)

cycle_3 (2026-09-26T23:20Z-23:45Z, PR #275 review follow-ups, user-approved): DONE.
  work_location: "worktree scratchpad/wt273; debug file stays here, uncommitted"
  result: |
    fix/273-missing-classic-loot (PR #275, draft, base main): 865efd2d (migration + parity test removed), 9fc57d55 (Windseeker left 18563, Sinew Token/Hunter). Pushed.
    fix/273-classic-loot-backfill (PR #282, draft, base fix/273-missing-classic-loot): 47db6547 (migration restored as 20260926233000_add_classic_missing_loot.sql with 67 rows, Sinew Hunter row, name+boss guard, per-token-per-guild verification, extended parity test). Pushed.
    PR #275 body updated (Refs #273, merge order, follow-ups, migration sections moved to #282). #282 body: Fixes #273, merge order, DB checks, residual gaps. No em dashes in either.
  next_action: "HUMAN: (1) apply 20260926233000_add_classic_missing_loot.sql to a local/staging DB with a Classic guild, run verification queries 1-3, re-run to confirm no-op, confirm non-Classic tiers untouched; (2) read-only prod check of expansions names; (3) merge #275, wait for the Vercel production deploy, retarget #282 to main (merge main into it if the squash leaves #275's files in the diff), merge #282; (4) re-run queries 1-3 read-only in prod and search marty/carap/pure in an existing Era guild. Session stays in .planning/debug/ until confirmed."

hypothesis: CONFIRMED - data/classic-wow-raids.ts (copied into each guild's loot_items by app/services/expansionSeeder.ts at expansion-seed time) omits the items. Its 2026-01-09 rewrite kept only equippable, single-boss "Boss Drop" epics for MC/BWL/Ony and left AQ/ZG/Naxx as hand-curated "existing data", so tier tokens (non-equippable), trash epics (no boss) and several plain boss drops were never seeded for any Classic (Era) guild.
bug_class: Bohrbug (deterministic data omission)
user_decisions (2026-09-26, answered, do not re-ask): (1) fix now; (2) core scope only, excluding legendary/quest mats, single-source 23072 + 21890, and sub-epic items; (3) correct Imperial Qiraji Armaments/Regalia from reward data (wow-classic-items); (4) backfill matches the seeder exactly (per-item classification from the seeder's classification data, same allocation cost).
test: data/__tests__/classic-catalog-completeness.test.ts + app/services/__tests__/classic-loot-backfill-migration.test.ts (new) - RED against the pre-fix catalog, GREEN after.
expecting: done - RED 171/200 failing (+ migration suite load failure) before, 288/288 passing after.
next_action: HUMAN VERIFICATION before merge (cannot be done in this session): apply supabase/migrations/20260926000000_add_classic_missing_loot.sql to a local or staging database seeded with at least one Classic guild, run the two commented verification SELECTs, re-run the migration to confirm it is a no-op, then take read-only before/after aggregate counts in production after the merge auto-deploys. Session stays in .planning/debug/ (not archived) until that is confirmed.

reasoning_checkpoint (pre-fix, 2026-09-26T23:05Z):
  hypothesis: "Era pickers show no Carapace of the Old God / Ring of the Martyr / Boots of Pure Thought because the static Classic catalog that expansionSeeder copies per guild never listed them; adding them to the catalog fixes new guilds and a per-guild NOT EXISTS backfill fixes existing guilds."
  confirming_evidence:
    - "grep + two independent loot sources (wow-classic-items, AtlasLootClassic) agree the ids are absent from data/classic-wow-raids.ts"
    - "seeder copies classicRaids verbatim; officer table and picker have no filter that hides existing rows"
  falsification_test: "A new completeness test built from the package's own zone attribution must FAIL on the pre-fix catalog for exactly the known misses, and PASS after; a mocked seedExpansionForGuild run must produce rows identical to the migration's VALUES."
  fix_rationale: "Catalog data is the root cause; the migration is required because the architecture copies at seed time; token mappings are required because Token-slot rows without a mapping are offered to every class."
  blind_spots: "Production DB state not observed (no read creds); migration not executed against any database in this session; 'Classic WoW' legacy expansion name is covered defensively but its existence in prod is unverified."
  candidate_causes:
    - "data: catalog omission (confirmed)"
    - "code: filter hiding rows (eliminated)"
    - "config: tier toggles (eliminated)"
    - "architecture: seed-time copy (contributing, handled by the backfill)"
  and_gate: "yes for the fix (catalog omission AND seed-time copy), no for the symptom."

reasoning_checkpoint:
  hypothesis: "The Era item picker and officer table show no row for Carapace of the Old God, Ring of the Martyr and Boots of Pure Thought because loot_items has no such rows for any Classic guild, because the static catalog data/classic-wow-raids.ts that expansionSeeder copies per guild never contained them (tokens, trash and some boss drops were filtered out or omitted in the 2026-01-09 rewrite)."
  confirming_evidence:
    - "grep: none of the 3 names/ids are in data/classic-wow-raids.ts; AQ40 has zero tier tokens and no Trash group; BWL has no Trash group; Huhuran lists 5 items without Ring of the Martyr"
    - "wow-classic-items and AtlasLootClassic both list all three (C'Thun / Princess Huhuran / BWL trash) and agree on 70 Epic+ misses"
    - "officer table and picker queries have no filter that could hide an existing row; shot5 shows AQ40 active"
    - "git log -S: the names were in the pre-rewrite file with wrong ids and were dropped by f3ec9fdf; never re-added; no migration inserts these ids"
  falsification_test: "A prod SELECT on loot_items for wowhead_id in (20929, 21620, 19437) returning rows in the reporter's guild tiers would falsify it (rows exist, something else hides them). Not run: prod credentials not readable in this session."
  fix_rationale: "Add the missing items to data/classic-wow-raids.ts (fixes newly seeded guilds) and ship an idempotent per-guild backfill migration (fixes existing guilds, since the catalog is copied at seed time), plus token class mappings so tokens show only to eligible classes, plus a completeness regression test so the class cannot return silently."
  blind_spots: "Prod DB not directly observed; package-only items (21890, 23072, 19002, 21110) not independently confirmed; Onyxia/Four Horsemen completeness relies on AtlasLoot alone; non-epic scope (ZG bijous, AQ20 rare rep tokens, AQ40 mounts, recipes) is a product decision."
  candidate_causes:
    - "data: static catalog omission (confirmed)"
    - "code: query/filter hiding existing rows (eliminated: no such filter in LootSettingsContent or loot-items-query)"
    - "config: per-guild tier toggle / is_guild_active hiding AQ40 or BWL (eliminated: same tiers show other items, e.g. Silithid Carapace Chestguard)"
    - "environment/architecture: seed-time copy means static-file fixes never reach existing guilds (contributing: dictates the backfill)"
  and_gate: "yes for the fix, no for the symptom. Symptom needs only the data omission. But the per-guild seed-time copy architecture is a second condition that makes a data-only fix insufficient for existing guilds, and the missing completeness gate (tests only check id/name agreement, #269) is why it went unnoticed."

## Symptoms

expected: Era guilds can find and rank every AQ40 and BWL drop, including tier tokens, in both (a) the raider loot-list "Select item" picker and (b) the officer item-management table (the "On / LC / Item name / Boss / Slot / Raid / Classification" grid).
actual: searches return nothing for these items in both surfaces:
  - "marty" -> "No items found" in the raider picker and in the officer table (expected: Ring of the Martyr, AQ40).
  - "carap" -> only "Silithid Carapace Chestguard" (Fankriss the Unyielding) in both surfaces (expected also: Carapace of the Old God, the AQ40 C'Thun tier chest token).
  - "pure" in the officer table with "All raids" -> only Pure Elementium (Nefarian), Essence of the Pure Flame (Ragnaros), Shroud of Pure Thought (Flamegor). Expected also: Boots of Pure Thought (BWL).
  The officer table shows no row at all for these items (not a row that is toggled off), so the gap is in the catalog/query that builds the list, not a per-guild enable toggle.
errors: none reported. Silent absence.
reproduction: as a member or officer of a Classic Era guild, open the loot list item picker (or the officer item settings table), search "marty", "carap" or "pure" with all raids selected.
started: reported 2026-09-26 19:01 UTC via Discord (reporter ozafy, filed as GitHub issue #273 by the feedback bot). The user called it a "new bug", so it may be a regression. Not known whether these items were ever present. Check git history of the item catalog source.
evidence_files: reporter screenshots saved at /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/issue273/shot1.png ... shot5.png (the Discord CDN links in the issue expire around 2026-09-27).

## Eliminated

- hypothesis: a query or client-side filter (slot/type exclusion, token filter) hides rows that exist in loot_items
  evidence: LootSettingsContent.loadLootItems selects all loot_items for guild-active tiers; filteredItems filters only by search/tier/slot/classification; lib/loot-items-query.ts only applies class proficiency and token class rules. Officer table would show a toggled-off row; it shows none.
  timestamp: 2026-09-26T22:05:00Z

- hypothesis: the AQ40/BWL tiers are disabled for the guild (is_guild_active / master_sheet_visible)
  evidence: the same searches return other AQ40 and BWL items (Silithid Carapace Chestguard from Fankriss, Shroud of Pure Thought from Flamegor), so the tiers are active.
  timestamp: 2026-09-26T22:05:00Z

## Evidence

- timestamp: 2026-09-26T21:45:00Z
  checked: knowledge base (.planning/debug/knowledge-base.md, KB-001 attendance, KB-002 'use client')
  found: no match on catalog / missing items keywords
  implication: no known-pattern candidate; investigate fresh

- timestamp: 2026-09-26T21:46:00Z
  checked: grep for the 3 named items across the repo; app/services/expansionSeeder.ts
  found: None of "Carapace of the Old God", "Ring of the Martyr", "Boots of Pure Thought" appear in data/classic-wow-raids.ts. They appear only in scripts/update-all-item-classifications.ts (and Boots of Pure Thought in data/classic-wow-item-classifications.ts as 'Reserved'), i.e. someone classified them but they were never added to the loot table. expansionSeeder.transformClassicRaids() copies classicRaids (data/classic-wow-raids.ts) into per-guild raid_tiers + loot_items at seed time; 'Classic' is the only Classic expansion (Era == 'Classic').
  implication: the per-guild catalog is seeded from the static file, so items missing from the static file are missing for every Classic guild. Existing guilds also need a DB backfill (precedent: migrations 20260715000001 / 20260728000001, one row per guild tier, NOT EXISTS on (wowhead_id, raid_tier_id)).

- timestamp: 2026-09-26T21:47:00Z
  checked: data/classic-wow-raids.ts AQ40 + BWL sections
  found: AQ40 has no tier tokens at all (no Qiraji Bindings, Vek'lor's Diadem, Vek'nilash's Circlet, Ouro's Intact Hide, Skin of the Great Sandworm, Carapace/Husk of the Old God, Imperial Qiraji Armaments/Regalia), no Trash group. Princess Huhuran lists 5 items, no Ring of the Martyr. BWL has no Trash group at all (Naxxramas does). Header comment says AQ/ZG/Naxx are "From existing data".
  implication: the gap is systematic (tokens + trash + some boss drops), not three typos.

- timestamp: 2026-09-26T21:48:00Z
  checked: node_modules/wow-classic-items/data/json/data.json for the named ids
  found: 20929 Carapace of the Old God - Epic, Miscellaneous/Junk, slot Non-equippable, source Boss Drop C'Thun zone 3428. 21620 Ring of the Martyr - Epic Finger, Boss Drop Princess Huhuran zone 3428. 19437 Boots of Pure Thought - Epic Feet, source category "Zone Drop" (no boss name) zone 2677 (BWL). Zone ids: MC 2717, BWL 2677, Ony 2159, ZG 1977, AQ20 3429, AQ40 3428, Naxx 3456.
  implication: the package the catalog was generated from has all three; the three illustrate three distinct filter losses: non-equippable token, zone (trash) drop, plain omission.

- timestamp: 2026-09-26T21:55:00Z
  checked: diff of wow-classic-items (source.zone in Classic raid zones, Epic/Legendary, itemId<25000) vs every wowhead_id in classicRaids (script: scratchpad/diff/diff.ts)
  found: 70 Epic+ items missing. AQ40 22 (8 T2.5 tokens + 2 Imperial Qiraji weapon tokens, Ring of the Martyr, Thick Qirajihide Belt, Boots of the Fallen Prophet, Bile-Covered Gauntlets, Mantle of the Desert's Fury, Guise of the Devourer, 8 Anubisath trash epics). BWL 11 (9 trash gear incl. Boots of Pure Thought, Elementium Ore) + Nefarian quest items 19002 Head of Nefarian (Horde; 19003 Alliance is seeded) and 21138 Red Scepter Shard. MC 18 T1 belts+bracers (all MC trash) + Bindings of the Windseeker (left, 18563) + Draconic for Dummies. ZG 9 Primal Hakkari tokens + Seal of the Gurubashi Berserker. AQ20 Qiraji Spiked/Ornate Hilt. Naxx Splinter of Atiesh + Fists of the Unrelenting. Blind spot: package has no source for Classic Onyxia items, Four Horsemen chest, most of Majordomo cache.
  implication: the gap spans every Classic raid, not only AQ40/BWL. Package alone is insufficient (single source per item, no source for some).

- timestamp: 2026-09-26T22:00:00Z
  checked: independent second source, AtlasLootClassic data.lua (Classic Era loot tables, github Hoizame/AtlasLootClassic master) parsed per raid/boss (scratchpad/diff/atlasdiff.ts, scratchpad/atlas/data.lua)
  found: 70 unique (raid,id) Epic+ missing, agreeing with the package on all AQ40/BWL items and resolving the multi-boss attribution the package flattens to "Zone Drop": Imperial Qiraji Armaments/Regalia drop from all 9 AQ40 encounters; Qiraji Bindings of Command/Dominance from Viscidus + Huhuran; Vek'lor's Diadem + Vek'nilash's Circlet Twin Emperors; Ouro's Intact Hide + Skin of the Great Sandworm Ouro; Carapace + Husk C'Thun; Guise of the Devourer, Bile-Covered Gauntlets, Mantle of the Desert's Fury Bug Trio ('Silithid Royalty' in our data); Ring of the Martyr Huhuran; BWL 9 gear items are Trash. AtlasLoot also adds items the package cannot place: Majordomo cache Fireguard Shoulders 19139, Gloves of the Hypnotic Flame 18808, Cauterizing Band 19140; Onyxia Mature Black Dragon Sinew 18705; Frame of Atiesh 22727. Package-only (not in AtlasLoot, treat as unverified): 21890 Gloves of the Fallen Prophet, 23072 Fists of the Unrelenting, 19002 Head of Nefarian (Horde), 21110 Draconic for Dummies. Many more non-epic misses (ZG bijous/coins, AQ20 rare rep tokens and idols/scarabs, AQ40 Qiraji Resonating Crystal mounts, recipes, mats) that fall outside the file's stated epic scope.
  implication: two independent sources agree on the defect and on per-boss attribution; a fix list can be built from their intersection.

- timestamp: 2026-09-26T22:03:00Z
  checked: git log -S for the named items; commits ce682724, 7bb36bc5, f3ec9fdf (all 2026-01-09)
  found: the original file had "Carapace of the Old God", "Ring of the Martyr", "Boots of Pure Thought" but with wrong ids (21680, 21627, 19382/21695). f3ec9fdf ("Fix Blackwing Lair loot tables", 2050 lines rewritten) dropped them; nothing has re-added them since. The file header still claims "ALL epic quality items". scripts/update-all-item-classifications.ts (8aab05f9, 2026-01-20) classifies all AQ40 tokens and most of the missing items, i.e. the spreadsheet expected them.
  implication: not a recent regression in production terms; the items have been absent since 9 Jan 2026 (essentially since launch). "New bug" is the reporter's first encounter (Era guild reaching AQ40/BWL trash).

- timestamp: 2026-09-26T22:05:00Z
  checked: officer table query (app/(app)/loot-management/components/LootSettingsContent.tsx loadLootItems 632-690 + filteredItems 1249) and raider picker filter (lib/loot-items-query.ts 169-200)
  found: officer table selects every loot_items row for guild-active tiers and filters client-side only by search/tier/slot/classification; no slot/type exclusion. Picker filters tokens only via canClassUseToken(name, class) and gear via armor/weapon proficiency. Screenshot shot5 shows AQ40 is active (Silithid Carapace Chestguard, Fankriss).
  implication: there is no query/filter that could hide an existing row; absence of the rows in loot_items fully explains both surfaces.

- timestamp: 2026-09-26T22:07:00Z
  checked: attempted read-only prod query (scratchpad/diff/prod-read.ts, selects only) to confirm zero loot_items rows for the missing ids
  found: could not run: reading .env.local is denied by the permission system and the service key did not load; supabase CLI is logged in but the project is not linked. Did not attempt any workaround.
  implication: DB state is inferred (seed copies the static file; no migration has ever inserted these ids: grep of supabase/migrations for 20929/21620/19437 = 0 hits), not directly observed. Low risk: an officer "add item" path could in theory have added one manually for some guild; the backfill's NOT EXISTS guard covers that.

- timestamp: 2026-09-26T22:10:00Z
  checked: AtlasLootClassic Data/Token.lua (token -> per-class reward) vs data/token-class-mapping.ts and scripts/update-all-item-classifications.ts
  found: AQ40 token class splits (AtlasLoot, matches the classification spreadsheet): Command W/H/R/Pr; Dominance Pa/Sh/Ma/Wl/Dr; Vek'lor's Diadem Pa/H/R/Sh/Dr; Vek'nilash's Circlet W/Pr/Ma/Wl; Ouro's Intact Hide W/R/Pr/Ma; Skin of the Great Sandworm Pa/H/Sh/Wl/Dr; Carapace W/Pa/H/R/Sh; Husk Pr/Ma/Wl/Dr. None of these 8 are in TOKEN_CLASS_MAPPING (so as 'Token' slot they would be offered to every class). TOKEN_CLASS_MAPPING already has 'Imperial Qiraji Armaments' (W/Pa/H/R) and 'Imperial Qiraji Regalia' (Pr/Ma/Wl/Dr/Sh), never exercised because the items were never seeded; the rewards are not class-restricted (Regalia -> Blessed Qiraji War Hammer 1H healer mace, Acolyte + Augur staves; Armaments -> War Axe, Pugio, Musket, Bulwark shield), so Regalia's mapping would hide the War Hammer from Holy Paladins. data/item-icons.ts, data/item-types.ts have none of the missing ids.
  implication: the fix must add 8 AQ40 (and 9 ZG Primal Hakkari) token class mappings and revisit the Imperial Qiraji mapping, or tokens will show to the wrong classes.

- timestamp: 2026-09-26T22:50:00Z
  checked: recount of the fix_scope_options "Core" block against wow-classic-items (scratchpad/fix/core.ts + inspect.ts)
  found: COUNT DISCREPANCY. The Core block lists 23 AQ40 ids after excluding 21890 (8 T2.5 tokens + 2 Imperial Qiraji + Ring of the Martyr, Thick Qirajihide Belt, Boots of the Fallen Prophet, Guise of the Devourer, Bile-Covered Gauntlets, Mantle of the Desert's Fury + 7 trash: 21838 21888 21889 21856 21837 21836 21891), not 22. The earlier "AQ40 22" summary itself did not add up (8+2+6+8 = 24 with 21890). Totals: AQ40 23, MC 21, ZG 10, BWL 9, AQ20 2, Ony 1 = 66, not 65. All 23 AQ40 ids are Epic, in both sources, and outside every user exclusion, so all 66 listed ids are implemented; no id was dropped to force 65. Package name for 21856 is "Neretzek, The Blood Drinker" (the block abbreviated it).
  implication: scope = the 66 ids explicitly listed in the Core block; discrepancy reported in the return so the user can drop an id if 65 was meant literally.

- timestamp: 2026-09-26T22:55:00Z
  checked: token class derivation. (a) 8 AQ40 T2.5 + 9 ZG Primal Hakkari: wow-classic-items tooltip "Classes:" line vs AtlasLoot Token.lua per-class reward rows. (b) Imperial Qiraji: package items whose source is the quest of the same name (8789 Armaments, 8790 Regalia), weapon subclass + slot mapped to WeaponType, then CLASS_PROFICIENCIES / canUseWeaponType (the same proficiency data lib/loot-items-query.ts filters with), union over the 9 Classic classes (scratchpad/fix/derive.ts).
  found: |
    Sources agree on all 17 class-restricted tokens:
      Qiraji Bindings of Command 20928: Warrior, Hunter, Rogue, Priest
      Qiraji Bindings of Dominance 20932: Paladin, Shaman, Mage, Warlock, Druid
      Vek'lor's Diadem 20930: Paladin, Hunter, Rogue, Shaman, Druid
      Vek'nilash's Circlet 20926: Warrior, Priest, Mage, Warlock
      Ouro's Intact Hide 20927: Warrior, Rogue, Priest, Mage
      Skin of the Great Sandworm 20931: Paladin, Hunter, Shaman, Warlock, Druid
      Carapace of the Old God 20929: Warrior, Paladin, Hunter, Rogue, Shaman
      Husk of the Old God 20933: Priest, Mage, Warlock, Druid
      Primal Hakkari Bindings 19716: Paladin, Hunter, Mage
      Primal Hakkari Armsplint 19717: Warrior, Rogue, Shaman
      Primal Hakkari Stanchion 19718: Priest, Warlock, Druid
      Primal Hakkari Girdle 19719: Warrior, Rogue, Shaman
      Primal Hakkari Sash 19720: Priest, Warlock, Druid
      Primal Hakkari Shawl 19721: Paladin, Hunter, Mage
      Primal Hakkari Tabard 19722: Paladin, Shaman, Druid
      Primal Hakkari Kossack 19723: Warrior, Mage, Warlock
      Primal Hakkari Aegis 19724: Hunter, Rogue, Priest
    Imperial Qiraji Armaments 21232 -> rewards 21242 War Axe (1H axe: Wa Pa Hu Sh), 21244 Pugio (dagger: Wa Hu Ro Pr Sh Ma Wl Dr), 21269 Bulwark (shield: Wa Pa Sh), 21272 Musket (gun: Wa Hu Ro). Union = all 9 Classic classes.
    Imperial Qiraji Regalia 21237 -> rewards 21268 War Hammer (1H mace: Wa Pa Ro Pr Sh Dr), 21273 Acolyte Staff + 21275 Augur Staff (staff: Wa Hu Pr Sh Ma Wl Dr). Union = all 9 Classic classes.
    Package reward ids match AtlasLoot Token.lua exactly. The old mapping (Armaments W/Pa/H/R, Regalia Pr/Ma/Wl/Dr/Sh) hid the Pugio from 5 classes and the War Hammer from Paladins and Rogues.
  implication: Imperial Qiraji rows are corrected to all 9 Classic classes (precedent: 'Trophy of the Crusade' lists every Wrath class). Effect: every Classic character can list them and gets the P badge; functionally equivalent to "unrestricted" in the picker filter.

- timestamp: 2026-09-26T23:00:00Z
  checked: conventions for multi-boss drops and classification source
  found: (a) classic-wow-raids.ts duplicates BWL T2 gloves under Firemaw/Ebonroc/Flamegor, but migration 20260729000003 explicitly rejected per-boss duplication because it breaks the one-row-per-(wowhead_id, raid_tier_id) invariant the backfill NOT EXISTS guards rely on, and moved Hyjal multi-boss drops to a 'Shared Boss Loot' group (also used by data/tbc-raids.ts, data/mop-raids.ts; utils/bossOrder.ts 995, utils/bossImages.ts). 'Trash' is already a Classic group (Naxxramas). (b) The seeder reads data/classic-wow-item-classifications.ts (name-keyed, unlisted = Unlimited). It lists 3 of the 66 new names (Boots of Pure Thought Reserved, Band of Dark Dominion Limited, Cauterizing Band Reserved). The one-off spreadsheet script scripts/update-all-item-classifications.ts disagrees with that file on 15 already-seeded items and classifies 41 existing AQ40 items the seeder leaves Unlimited, so it is not the seeder's classification data. (c) CLASSIC_ITEM_ROLES has none of the 66 names, so the seeder writes roles '{}'.
  implication: multi-boss drops go to 'Shared Boss Loot' (AQ40 Bindings + Imperial Qiraji, ZG Primal Hakkari + Seal of the Gurubashi Berserker, AQ20 hilts), trash to 'Trash'; classification comes from ITEM_CLASSIFICATIONS unchanged (3 rows cost 1, 63 rows Unlimited cost 0), no new classification entries invented; migration writes roles '{}' like the seeder.

- timestamp: 2026-09-26T23:15:00Z
  checked: RED run of the new regression suites against the unfixed catalog (npx vitest run data/__tests__/classic-catalog-completeness.test.ts app/services/__tests__/classic-loot-backfill-migration.test.ts)
  found: completeness suite 171 failed / 29 passed. Package completeness test lists 62 misses (the 70 known Epic+ misses minus the 8 deliberate exclusions; the other 4 core items have no package source and are caught by the fixture table). All 66 fixture rows fail, token-inclusion fails. Passing pre-fix: Naxx token mappings, Imperial Qiraji derivation helper, ITEM_TYPES agreement for existing entries, icons for existing items. Migration suite fails to load (migration file does not exist yet).
  implication: the tests reproduce the defect deterministically; oracle type = derived (package data + proficiency model) plus specified (fixture table).

- timestamp: 2026-09-26T23:40:00Z
  checked: GREEN + guardrail after applying the fix
  found: |
    target suites: 2 files, 288/288 pass. data/__tests__ + app/services/__tests__: 4 files, 382/382. Full vitest: 85 files, 1684/1684. tsc --noEmit exit 0. eslint on the 7 touched/new TS files: 0 problems. Full npm run lint: 0 errors, 397 warnings (all pre-existing, none in touched files).
    revert-and-reconfirm: restored the 4 data files from git and moved the migration away -> 171 failed / 29 passed + migration suite ENOENT; reapplied -> 288/288.
    manual mutants (Stryker not configured), all killed: M1 drop Ring of the Martyr (3 fail), M2 drop Shaman from Carapace mapping (2), M3 restore old Imperial Qiraji Regalia list (2), M4 migration Boots of Pure Thought as Unlimited/0 (1), M5 migration drop Druid from 19718 classes (1), M6 wrong slot in catalog (2), M7 drop an icon (2), M8 wrong ITEM_TYPES armor type (1), M9 drop Classic scope from migration (1).
    migration syntax: parsed with libpg-query (the real Postgres parser, scratchpad install, parse only, nothing executed): 1 InsertStmt into loot_item_classes with CTEs items (66 VALUES rows), token_classes (19 rows), inserted (InsertStmt). Not applied to any database.
  implication: fix accepted by the guardrail; only DB execution remains unverified (human step).

- timestamp: 2026-09-26T23:15:00Z
  checked: cycle 3 pre-work. Worktree scratchpad/wt273 (fix/273-missing-classic-loot 3dabe1be = origin, draft PR #275, based on origin/main 364b108f). Package data for 18563/18564/18705; seeder classification path; Token-slot consumers; historical catalogs ce682724/7bb36bc5/f3ec9fdf/6026e937/158aa519 (scratchpad/hist/oldrows.ts); migration ordering (origin/main, open PRs, scripts/deploy-migrations.sh).
  found: |
    - 18563 Bindings of the Windseeker: Legendary, Non-equippable, Boss Drop Baron Geddon (MC 2717), icon spell_ice_lament (same as 18564, Garr, slot 'Quest'). Not in ITEM_CLASSIFICATIONS (seeder: Unlimited/0) nor CLASSIC_ITEM_ROLES (exact-name lookup; only 'Thunderfury, Blessed Blade of the Windseeker' is keyed) so roles [].
    - 18705 Mature Black Dragon Sinew: package tooltip "Classes: Hunter", so the completeness suite's expectedTokenClasses derives ['Hunter'] once it is a Token row. No TOKEN_CLASS_MAPPING key is a substring of it and it appears in no other expansion's data.
    - Token slot semantics beyond class filtering: tokens may be listed once per bracket section (LootListContent disabled/duplicate sets), are exempt from the item_type duplicate rule, and count toward maxTokens per bracket when enforceSlotRestrictions is on (domain/loot/bracket-validation.ts). Seeder and migration add a Hunter 'primary' loot_item_classes row, so Sinew becomes a primary-allocated item for Hunters.
    - Old catalogs (Jan 9, pre-seeder; the seeder dbeee03b landed Jan 10 on the f3ec9fdf catalog) had these names under other ids. Name+boss guard catches: Boots of the Fallen Prophet 21701, Ouro's Intact Hide 21710, Carapace 21680, Thick Qirajihide Belt 21668, Ring of the Martyr 21627, Vek'nilash's Circlet 21693, Fireguard Shoulders 18808, Gloves of the Hypnotic Flame 18809. Guard misses (different boss): Ringo's Blizzard Boots 19344 and Boots of Pure Thought 19382 under Vaelastrasz, Seal of the Gurubashi Berserker 19898 under Hakkar, Qiraji Ornate Hilt 20886 under Kurinnaxx, Imperial Qiraji Regalia 21605 under Twin Emperors. Id collisions in old data: old 'Fireguard Shoulders' used 18808 (the real Gloves of the Hypnotic Flame id) and old 'Qiraji Ornate Hilt' used 20886 (the real Spiked Hilt id), so the id guard skips those real items for such a tier.
    - Migration ordering: origin/main latest is 20260913000000, ours 20260926000000 sorts after. Open PR #280 (not draft, mergeable, review required) adds 20260926120000_add_guild_game_version.sql, which sorts AFTER ours; the backfill merges only after #275 + Vercel deploy, so #280 will likely land first. scripts/deploy-migrations.sh (prod deploy) applies any unrecorded version regardless of order, so prod would not reject it, but `supabase db push` would need --include-all and local replay order would differ.
  implication: Windseeker row = ('Molten Core','Baron Geddon','Bindings of the Windseeker',18563,'Quest','Unlimited',0). Sinew as Token is consistent across seeder/migration/picker; its extra Token semantics are flagged for the human. Residual guard gap recorded for the human, not widened. Rename the restored migration to the current UTC timestamp (after #280's) to keep apply order monotonic whichever PR lands first.

- timestamp: 2026-09-26T23:25:00Z
  checked: old catalogs for rows holding a GH-273 id under another name (scratchpad/hist/idcollide.ts)
  found: 7bb36bc5 has 6 (16819 'Bracers of Prophecy', 16817 'Belt of Prophecy', 18808 'Fireguard Shoulders', 20886 'Qiraji Ornate Hilt', 21693 "Vek'nilash's Circlet", 21682 'Dark Storm Gauntlets'); ce682724 has 1 (20886). f3ec9fdf, 6026e937, 158aa519 (every catalog the per-guild seeder ever used) have 0.
  implication: a tier seeded from a pre-seeder catalog would have guard 1 (same id) skip the real item while keeping the wrong-named row. Pre-existing design from cycle 2, not widened; recorded for the human. Verification query 3 detects the same-name duplicates; query 1 counts by id so it cannot see wrong-named id holders.

- timestamp: 2026-09-26T23:30:00Z
  checked: cycle 3 implementation and guardrail (worktree scratchpad/wt273)
  found: |
    fix/273-missing-classic-loot: 865efd2d removes migration + parity test; 9fc57d55 adds 18563 under Baron Geddon (Quest), Sinew slot Token + TOKEN_CLASS_MAPPING ['Hunter'], icon 18563, fixture 67 rows, exclusion removed, tests (halves under different bosses, 20 tokens, canClassUseToken Hunter-only x9). Catalog header now says to ship a backfill in its own PR after the app deploy. Full vitest 67 files / 1433 tests pass, tsc exit 0, eslint on the 6 changed files exit 0.
    Mutants on PR #275 sites, all killed: MB1 drop 18563 (3 fail), MB2 18563 under Garr in catalog (2), MB3 re-exclude 18563 (1), MB4 Sinew back to Quest (11), MB5 drop Sinew mapping (9), MB6 Sinew mapping + Warrior (2), MB7 drop 18563 icon (2).
    fix/273-classic-loot-backfill (from 9fc57d55): migration restored as 20260926233000_add_classic_missing_loot.sql with 67 rows (18563; Sinew 'Token'), token_classes 20 rows (+18705 Hunter), guard 2 NOT EXISTS on lower(name) + boss_name, deploy-order header, residual-gap header note, 3 read-only aggregate verification queries (per-raid counts incl. 18563; per-token-per-guild class rows with min/max/rows_off_expected/rows_not_token_slot; same-name duplicates per tier). Parity test extended: guard 2 regex, class rows only from inserted, JS model of both guards against the pre-#273 catalog (none skipped; Windseeker 18564 Garr vs 18563 Geddon), Sinew Token + Hunter, verification id lists and class arrays equal the statement, per-row (not average) check. Full vitest 68 files / 1510 tests pass, tsc exit 0, eslint on the 7 changed files exit 0.
    libpg-query (parse only, never executed): 1 statement, InsertStmt into loot_item_classes, CTEs items (67 rows), token_classes (20), inserted (InsertStmt into loot_items) with 2 NOT EXISTS sublinks and 2 lower() calls; verification queries 1-3 each parse as one SelectStmt.
    Mutants on backfill sites, all killed: MC1 remove guard 2, MC2 guard 2 case-sensitive, MC3 guard 2 name-only, MC4 Sinew Quest in migration (3), MC5 drop Sinew class row (3), MC6 drop 18563 row (4), MC7 18563 under Garr in migration only (2), MC8 18563 under Garr in catalog + fixture + migration together (2: halves test + guard model test), MC9 verification Q2 drops Sinew, MC10 Q1 omits 18563, MC11 Q2 back to an average, MC12 class rows from loot_items instead of inserted, MC13 drop Classic scope.
  implication: both branches green; guardrail signals pass for the cycle 3 changes. Migration still not executed against any database.

- timestamp: 2026-09-26T23:40:00Z
  checked: origin/main moved during the cycle (#280 c8a00c9c and #281 52fb7805 merged). Diffed 364b108f..origin/main; trial-merged origin/main into throwaway copies of both branches (deleted afterwards).
  found: |
    #280's 20260926120000_add_guild_game_version.sql is now on main; ours (20260926233000) sorts after it. #281 adds guilds.game and a 'Forever' expansion (no raids) and tags seeder definitions with a game; seedExpansionForGuild's body and signature are unchanged, and the migration's e.name IN ('Classic','Classic WoW') scope excludes Forever. Trial merge of #275 + main: 70 files / 1467 tests, tsc 0. Trial merge of backfill + main: 71 files / 1544 tests, tsc 0. No conflicts.
    Pushed: fix/273-missing-classic-loot 3dabe1be..9fc57d55 (fast-forward); fix/273-classic-loot-backfill new at 47db6547. Draft PR #282 created (base fix/273-missing-classic-loot); diff = the migration + parity test only. PR #275 body replaced from scratchpad/pr-275-body-v2.md (original scratchpad/pr-273-body.md untouched); both live bodies grep clean of U+2014; #275 says Refs #273, #282 says Fixes #273 and ends with the Claude Code line.
  implication: the rename was the right call (it now matters, not just prospectively). Nothing left for this session but the human DB and merge steps.

## Specialist Review

specialist_hint: typescript
skill: typescript-expert (NOT INSTALLED in this environment; no project or user skill by that name). Specialist review skipped; no LOOKS_GOOD / SUGGEST_CHANGE verdict recorded.

## Resolution

root_cause: "Data omission in data/classic-wow-raids.ts, the static Classic (Era) catalog that app/services/expansionSeeder.ts copies into every guild's own loot_items at expansion-seed time. The 2026-01-09 rewrite (f3ec9fdf) kept only equippable, named-boss epics for MC/BWL/Ony and left AQ20/AQ40/ZG/Naxx as hand-curated data, so non-equippable tier tokens, trash (zone) drops and several plain boss drops were never seeded. 70 Epic+ items are missing across all 7 Classic raids, confirmed by two independent sources; contributing: per-guild copy-at-seed means a data fix alone does not reach existing guilds; no completeness test existed (the #269 test only checks id/name agreement)."
fix_scope_options: |
  Core (both sources agree, Epic+ gear + tier tokens), per raid, boss attribution from AtlasLootClassic:
    AQ40 (22): C'Thun: Carapace of the Old God 20929, Husk of the Old God 20933 | Twin Emperors: Vek'lor's Diadem 20930, Vek'nilash's Circlet 20926 | Ouro: Ouro's Intact Hide 20927, Skin of the Great Sandworm 20931 | Viscidus + Huhuran: Qiraji Bindings of Command 20928, Qiraji Bindings of Dominance 20932 (shared) | all 9 encounters: Imperial Qiraji Armaments 21232, Imperial Qiraji Regalia 21237 (shared) | Princess Huhuran: Ring of the Martyr 21620 | Battleguard Sartura: Thick Qirajihide Belt 21675 | The Prophet Skeram: Boots of the Fallen Prophet 21705 | Silithid Royalty: Guise of the Devourer 21693, Bile-Covered Gauntlets 21682, Mantle of the Desert's Fury 21684 | Trash: Garb of Royal Ascension 21838, Gloves of the Immortal 21888, Gloves of the Redeemed Prophecy 21889, Neretzek 21856, Anubisath Warhammer 21837, Ritssyn's Ring of Chaos 21836, Shard of the Fallen Star 21891 (+ package-only Gloves of the Fallen Prophet 21890)
    BWL (9 gear): Trash: Boots of Pure Thought 19437, Cloak of Draconic Might 19436, Band of Dark Dominion 19434, Essence Gatherer 19435, Doom's Edge 19362, Draconic Maul 19358, Draconic Avenger 19354, Ringo's Blizzard Boots 19438, Interlaced Shadow Jerkin 19439
    MC (21): Trash: 18 T1 belts+bracers (16799 16802 16804 16806 16817 16819 16825 16827 16828 16830 16838 16840 16850 16851 16857 16858 16861 16864) | Majordomo cache: Fireguard Shoulders 19139, Gloves of the Hypnotic Flame 18808, Cauterizing Band 19140
    ZG (10): Primal Hakkari x9 tokens 19716-19724 (shared across the 7 non-Hakkar bosses) | Seal of the Gurubashi Berserker 22722 (High Priest shared)
    AQ20 (2): Qiraji Spiked Hilt 20886, Qiraji Ornate Hilt 20890 (Moam/Buru/Ayamiss/Ossirian, shared)
    Ony (1): Mature Black Dragon Sinew 18705 (quest item, hunter)
  Optional / needs decision: legendary + quest mats (Bindings of the Windseeker left 18563, Splinter of Atiesh 22726, Frame of Atiesh 22727, Elementium Ore 18562, Red Scepter Shard 21138, Head of Nefarian Horde 19002, Draconic for Dummies 21110); package-only unverified (Fists of the Unrelenting 23072, 21890); non-epic (AQ20 rare rep tokens 20884/20885/20888/20889, ZG bijous/coins, AQ40 Qiraji Resonating Crystal mounts, recipes).
  Required with the data change: TOKEN_CLASS_MAPPING entries for 8 AQ40 tokens (+9 ZG Primal Hakkari if added); fix or drop the Imperial Qiraji Regalia/Armaments mapping (rewards are not class-restricted; current Regalia mapping hides Blessed Qiraji War Hammer from Paladins); idempotent per-guild backfill migration (NOT EXISTS on raid_tier_id + wowhead_id, plus loot_item_classes for new tokens, like 20260913000000); icons/types from the package for data/item-icons.ts + data/item-types.ts; completeness regression test.
scope_count_discrepancy: "The Core block's AQ40 list has 23 ids once 21890 is excluded (the summary said 22), so the implemented total is 66, not 65. All 66 meet the user's criteria (Epic, both sources, not a legendary/quest mat, not single-source); none was dropped to force 65. If 65 was meant literally, say which id to remove (it is one line in the catalog, fixture, and migration each)."
fix: |
  1. data/classic-wow-raids.ts: added the 66 core items. AQ40 (23): T2.5 tokens under Twin Emperors / Ouro / C'Thun; Ring of the Martyr (Huhuran), Thick Qirajihide Belt (Sartura), Boots of the Fallen Prophet (Skeram), Guise of the Devourer / Bile-Covered Gauntlets / Mantle of the Desert's Fury (Silithid Royalty); new 'Shared Boss Loot' group (Qiraji Bindings of Command/Dominance, Imperial Qiraji Armaments/Regalia); new 'Trash' group (7). BWL: new 'Trash' group (9). MC: 3 Cache of the Firelord items under Majordomo Executus + new 'Trash' group (18 T1 belts/bracers). ZG: new 'Shared Boss Loot' (9 Primal Hakkari tokens + Seal of the Gurubashi Berserker). AQ20: new 'Shared Boss Loot' (2 hilts, slot Quest). Onyxia: Mature Black Dragon Sinew (Quest). Rewrote the misleading "ALL epic ... COMPLETE" file header to describe the real scope, groups, seed-time copy, and the new completeness test.
  2. data/token-class-mapping.ts: 8 AQ40 T2.5 + 9 ZG Primal Hakkari entries; Imperial Qiraji Armaments and Regalia corrected to all 9 Classic classes, with the reward derivation in a comment.
  3. data/item-icons.ts: 66 icon entries from the package (manual block; also fixed the missing trailing comma on the previous last entry). data/item-types.ts: 37 armor/weapon types from the package subclass.
  4. supabase/migrations/20260926000000_add_classic_missing_loot.sql: single-statement idempotent per-guild backfill, Classic expansion tiers only (e.name IN ('Classic','Classic WoW')), NOT EXISTS on (raid_tier_id, wowhead_id), same columns/values as the seeder (classification from ITEM_CLASSIFICATIONS: Boots of Pure Thought Reserved/1, Band of Dark Dominion Limited/1, Cauterizing Band Reserved/1, the other 63 Unlimited/0; is_available true; roles '{}'), plus loot_item_classes (spec_id NULL, 'primary') only for token rows this run inserted. Two commented aggregate-only verification SELECTs. NOT applied anywhere.
  5. Tests: data/__tests__/classic-catalog-completeness.test.ts (package-driven completeness gate with an explicit 8-item exclusion list, 66-row placement table, token class lists re-derived from the package, icon and item-type checks), data/__tests__/fixtures/classic-gh273-core.ts (shared 66-row table), app/services/__tests__/classic-loot-backfill-migration.test.ts (runs the real seeder against an in-memory fake and asserts the migration rows and token class rows equal what it writes).
  cycle 3 (PR #275 review follow-ups, user-approved):
  6. Deploy-race split: PR #275 (fix/273-missing-classic-loot) now carries catalog, token mapping, icons/types and the completeness suite only (865efd2d removes the migration + parity test). The backfill moved to fix/273-classic-loot-backfill / draft PR #282 (base fix/273-missing-classic-loot), merged only after #275's Vercel production deploy. Catalog header documents the rule.
  7. Bindings of the Windseeker left (18563) added to MC under Baron Geddon, slot 'Quest' (same as 18564 Garr); removed from DELIBERATELY_EXCLUDED; icon spell_ice_lament; fixture 67 rows (MC 22). Seeder by name: Unlimited/0, roles [].
  8. Mature Black Dragon Sinew: slot 'Token' in catalog, fixture and migration; TOKEN_CLASS_MAPPING 'Mature Black Dragon Sinew': ['Hunter']; migration token_classes (18705, ['Hunter']).
  9. Migration renamed 20260926000000 -> 20260926233000 (sorts after #280's 20260926120000, now on main). Guard 2: NOT EXISTS same lower(name) AND same boss_name in the tier (in addition to the wowhead_id guard); class rows still only from the inserted CTE. Header: deploy order, guard rationale, residual gap list. Verification: Q1 per-raid counts (67 ids incl. 18563; MC 22), Q2 per-token-per-guild-row class sets (min/max class rows, rows_off_expected by set comparison, rows_not_token_slot), Q3 names a tier holds under more than one id (Windseeker allowed two). All read-only aggregates.
  10. Parity test extended: guard 2 regex, class rows from inserted only, JS model of both guards against the pre-#273 catalog (no new item skipped; Windseeker 18564 Garr vs 18563 Geddon), Sinew Token + Hunter, verification id lists and class arrays equal the statement, per-row not average. Completeness suite: both Windseeker halves under different bosses, 20 tokens, canClassUseToken Sinew Hunter-only for all 9 classes.
derived_token_classes:
  Imperial Qiraji Armaments 21232: "Warrior, Paladin, Hunter, Rogue, Priest, Shaman, Mage, Warlock, Druid (rewards: War Axe 1H axe, Pugio dagger, Bulwark shield, Musket gun)"
  Imperial Qiraji Regalia 21237: "Warrior, Paladin, Hunter, Rogue, Priest, Shaman, Mage, Warlock, Druid (rewards: War Hammer 1H mace, Acolyte Staff, Augur Staff)"
  AQ40 T2.5 and ZG Primal Hakkari: see the 2026-09-26T22:55 evidence entry (package tooltip and AtlasLoot agree on all 17).
verification:
  target_test: { result: pass, detail: "288/288 in the two new suites; RED 171/200 + migration suite load failure before the fix" }
  mutation_check: { result: pass, reason_if_skipped: "Stryker not configured; 9 manual mutants at the fix sites instead", mutant_killed: "9/9" }
  no_op_deletion: { result: pass, deletion_justified_by_rca: true, detail: "diff is additive; only deletions are the old file header and the two wrong Imperial Qiraji lists, both justified by the RCA" }
  adjacent_tests: { result: pass, suites_run: ["full vitest 85 files / 1684 tests", "tsc --noEmit", "eslint touched files (0 problems)", "npm run lint (0 errors, 397 pre-existing warnings)"] }
  revert_and_reconfirm: { result: pass, bug_returned_on_revert: true, fixed_on_reapply: true }
  migration_execution: { result: not_run, reason: "no database may be touched in this session; parsed only with libpg-query" }
  cycle_3:
    pr_275_branch: { commit: 9fc57d55, vitest: "67 files / 1433 tests pass", tsc: 0, eslint_changed_files: "0 problems (exit 0)", trial_merge_with_new_main: "70 files / 1467 tests, tsc 0" }
    backfill_branch: { commit: 47db6547, vitest: "68 files / 1510 tests pass", tsc: 0, eslint_changed_files: "0 problems (exit 0)", trial_merge_with_new_main: "71 files / 1544 tests, tsc 0" }
    mutation_check: { result: pass, mutant_killed: "20/20 (MB1-MB7 on #275, MC1-MC13 on backfill incl. MC8 multi-file)" }
    migration_parse: "libpg-query parse only: 1 statement, 67 item rows, 20 token_classes rows, 2 NOT EXISTS sublinks; verification queries 1-3 each parse as one SelectStmt"
    migration_execution: { result: not_run, reason: "no database may be touched; human step" }
  deployed:
    catalog_pr_275: { merge: 605499dd, vercel_production: "6701771264 success" }
    backfill_pr_282: { merge: f1c9beee, deploy_migrations_run: 36374100414, result: "applied 20260926233000_add_classic_missing_loot.sql" }
    issue_273: "closed completed by #282; Discord thread closed out by the feedback bot"
    unverified: "production row counts (queries 1-3) not run; in-app search not observed"
  guardrail_verdict: accepted
  oracle_type: "derived (wow-classic-items zone attribution, tooltip class lines, quest rewards x CLASS_PROFICIENCIES) + specified (66-row fixture) + differential (migration vs real seeder)"
side_findings (out of scope, not changed):
  - "data/expansion-phases.ts lists \"Ahn'Qiraj\" where the catalog tier is \"Ruins of Ahn'Qiraj\" (phase lookup mismatch, noted in diagnosis)."
  - "Classification data: data/classic-wow-item-classifications.ts has no AQ40/ZG/AQ20 entries at all, so every AQ40 item (old and new) seeds as Unlimited/0. The one-off spreadsheet script scripts/update-all-item-classifications.ts has Limited for all 10 AQ40 tokens, Reserved for Ring of the Martyr and Ritssyn's Ring of Chaos, Limited for Cloak of Draconic Might, and disagrees with the data file on 15 already-seeded items. Adopting it would be a product decision affecting existing AQ40 items too."
  - "Imperial Qiraji now seed 9 loot_item_classes rows each, so every Classic character sees the P badge on them (same pattern as Wrath 'Trophy of the Crusade'). If that badge is unwanted, the alternative is removing the two mapping entries (picker filter is identical, no class rows seeded)."
  - "Class-restricted non-token items are filtered only by armor/weapon proficiency: Qiraji Spiked/Ornate Hilt (package: W/Pa/H/R/Sh and Pr/Ma/Wl/Dr) are slot 'Quest' like the existing Eye of Divinity / Ancient Petrified Leaf, so all classes see them; Gloves of the Redeemed Prophecy is Paladin-only but plate, so Warriors also see it. Pre-existing convention."
  - "ZG 'Primal Hakkari Idol' (22637, Rare quest item) is seeded with slot 'Idol' (the Druid relic slot name). Harmless (class-agnostic) but mislabeled."
  - "The 8 deliberate exclusions (18562, 18563, 19002, 21110, 21138, 21890, 22726, 23072) are recorded with reasons in the completeness test; adding any later means deleting its exclusion line."
commit: "Shipped from origin/main-based branches (the local b80f1162 on fix/273-classic-missing-loot is superseded; do not use it). PR #275 fix/273-missing-classic-loot: 3dabe1be (original fix), 865efd2d (migration split out), 9fc57d55 (Windseeker left + Sinew Hunter-only); pushed. PR #282 fix/273-classic-loot-backfill: 47db6547 (backfill migration + parity test); pushed. This debug file is intentionally uncommitted until the session is archived."
residual_notes_for_human:
  - "Guard 2 only matches old copies under the SAME boss. The 2026-01-09 catalogs also filed Boots of Pure Thought + Ringo's Blizzard Boots (Vaelastrasz), Seal of the Gurubashi Berserker (Hakkar), Qiraji Ornate Hilt (Kurinnaxx), Imperial Qiraji Regalia (Twin Emperors) under other bosses; such a tier would gain a duplicate. Verification Q3 lists them. Not widened, per approval."
  - "Old rows holding a real id under a wrong name (7bb36bc5: 16817, 16819, 18808, 20886, 21682, 21693; ce682724: 20886) make guard 1 skip the real item. Q1 counts by id and cannot see it. Every catalog the per-guild seeder used (f3ec9fdf onward) has neither problem, so only tiers that predate the seeder (Jan 10) are exposed."
  - "Sinew as 'Token' also takes token list rules: listable once per bracket section instead of once overall, and counts toward maxTokens per bracket when enforceSlotRestrictions is on."
  - "After #275 squash-merges, #282 retargeted to main may show #275's files; merging main into the backfill branch (no force-push) reduces the diff to the two files."
files_changed:
  - data/classic-wow-raids.ts
  - data/token-class-mapping.ts
  - data/item-icons.ts
  - data/item-types.ts
  - data/__tests__/classic-catalog-completeness.test.ts
  - data/__tests__/fixtures/classic-gh273-core.ts
  - supabase/migrations/20260926233000_add_classic_missing_loot.sql (PR #282 only; renamed from 20260926000000)
  - app/services/__tests__/classic-loot-backfill-migration.test.ts (PR #282 only)
