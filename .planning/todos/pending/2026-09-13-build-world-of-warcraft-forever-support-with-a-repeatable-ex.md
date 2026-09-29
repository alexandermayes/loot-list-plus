---
created: 2026-09-14T05:11:19.557Z
title: Build World of Warcraft Forever support with a repeatable expansion-onboarding format
area: data
severity: major
files:
  - app/services/expansionSeeder.ts:195-207
  - app/services/expansionSeeder.ts:382-405
  - data/classic-wow-raids.ts
  - data/token-class-mapping.ts
  - data/classic-wow-item-classifications.ts
  - data/classic-item-roles.ts
  - data/item-icons.ts
  - data/__tests__/classic-wow-raids.test.ts
  - .github/workflows/refresh-item-data.yml
---

## Problem

Blizzard announced World of Warcraft: Forever (the official "Classic Plus") at BlizzCon on 2026-09-12. What is public so far: worldwide launch 2026-11-04, beta from 2026-09-17, included in the existing WoW subscription, built by the Classic team on Classic principles, set between Warcraft III Reforged: Forsaken Kingdom and Molten Core, level cap 60, three new zones plus overhauls of existing zones, over 1,000 new quests, nine new dungeons, two new raids, new professions, a new battleground, and a new race (Skyborne Elves). No item ids, raid loot tables or tier-token structure have been published yet.

LootList+ has no way to add an expansion without hand-building it. Every supported expansion (Classic, TBC, Wrath, Cata, MoP) is a parallel set of hand-written files: a raids file with boss loot and wowhead_ids, an item-classifications map keyed by item NAME, an item-roles map keyed by NAME, token class restrictions keyed by NAME substring in token-class-mapping.ts, and icon lookups. expansionSeeder.ts selects among them with displayName if/else chains (lines 382-405) and a hardcoded registry (195-207). Names are the join key everywhere, so a single wrong id or misspelt name silently attaches restrictions and classifications to the wrong item; GH-269 (2026-09-13) showed exactly that for all 24 Naxxramas Tier 3 tokens, and the only reason it was catchable was the wow-classic-items reference dataset, which will not cover Forever content.

Forever guilds will want to set up loot lists during beta and certainly by 2026-11-04, and the sprint (Phases 1 to 6) ends 2026-09-24, so this is the natural next milestone.

## Solution

TBD in detail; direction:

1. Define one expansion-support format instead of a sixth copy of the pattern: a per-expansion manifest (raids, bosses, items with verified wowhead_id as the primary key, slot, classification, roles, token class groups, phases, icons) that the seeder consumes generically, replacing the displayName if/else chains with a registry lookup. Existing five expansions migrate onto the format or stay as adapters.
2. Make wowhead_id the join key for classifications, roles and token classes, so names are display-only and cannot corrupt behaviour (the GH-269 failure class).
3. Ship a verification gate per expansion like data/__tests__/classic-wow-raids.test.ts: every item name and id checked against a reference source. For Forever the source is open; candidates are Wowhead's Forever branch once it exists, or Blizzard's game data API. Decide when the beta client and its data are live.
4. Build the Forever manifest as data appears: beta from 2026-09-17 (expect first item ids and the two raids' loot tables), launch 2026-11-04. Also plan for Forever-specific additions the current schema may lack (new race Skyborne Elves in class/race tables, new professions, possibly new item slots or token conventions).
5. Route: `/gsd-new-milestone` after the sprint closes on 2026-09-24, with a research phase on the Forever data sources first.

Triggers: 2026-09-17 beta (start data research), 2026-09-24 sprint end (open the milestone), 2026-11-04 launch (Forever guilds must be able to seed raids).

## Data sources, checked 2026-09-13

Nothing structured exists publicly yet; the Forever client is not downloadable until the beta opens 2026-09-17 (beta runs to 2026-10-21).

- Confirmed content names to seed against: raids Barrow Deeps (10 player) and Hyjal Summit (20 player) at launch; Onyxia's Lair on the December roadmap; nine dungeons; new race Skyborne Elves (starts on Zephras Isle, levels 1 to 12); new professions; new battleground.
- wago.tools: the earliest structured source. It publishes client DB2 tables per product branch (Item, ItemSparse, ItemEffect, JournalInstance, JournalEncounter, JournalEncounterItem, ChrRaces, ChrClasses). A Forever branch should appear when the beta client ships. The site returns 403 to plain scripted fetches, so pulls need a browser session or its documented API; check before automating. Precedent: wowforevertalents.com uses Classic Era client tables (1.15.9.69722) as its baseline and plans to regenerate from the Forever client.
- Wowhead: wowhead.com/forever is a launch countdown plus guides today, no item database. Expect the database to populate during beta; when it does, its item ids become the second verification source.
- Blizzard game data API: Classic uses namespace static-classic-{region}. Watch for a Forever namespace on the Battle.net developer portal; if none appears, the API will not be a source at launch.
- Not usable: the wow-classic-items npm package (Classic Era only) cannot verify Forever items. The verification gate for Forever must target wago.tools or Wowhead exports instead.

Day-one checklist for 2026-09-17: (1) does wago.tools list a Forever product, and do Item and JournalEncounter tables have rows for Barrow Deeps and Hyjal Summit; (2) does Wowhead show a Forever database; (3) does the developer portal list a Forever namespace; (4) record item-id ranges and any new item slot or token conventions observed.

## Day-one checklist results, checked 2026-09-25

Checked eight days after the beta opened. Summary: item data is available now from two independent sources, but neither launch raid and no raid loot data exist in any source yet.

1. **wago.tools: yes, Forever product present, raids absent.**
   - Forever ships under the existing `wow_classic_beta` product as version 1.60.x. Builds listed: 1.60.1.69876 and 1.60.1.69893 (2026-09-16), 69913 (09-18), 69977 (09-23), 70009 (09-24). The `/api/builds` list is not sorted by date, so filter on the `1.60.` prefix and do not take the first entry.
   - Scripted access works now (HTTP 200 without a browser session, unlike the 403 on 2026-09-13). CSV pattern: `https://wago.tools/db2/<Table>/csv?build=1.60.1.70009`.
   - JournalInstance, JournalEncounter and JournalEncounterItem return 404 ("Table not found"): 1.x clients have no encounter journal, so the client will never provide loot tables. Loot-to-boss mapping must come from Wowhead drop data or be hand-built.
   - Map has no Barrow Deeps or Hyjal Summit (only Hyjal Crater, map 2995, InstanceType 4, no encounters). DungeonEncounter has none of the eight Barrow Deeps boss names reported by third-party guides (Deepscar Matriarch, Khalith the Dreadspinner, Amethrax, Ravus and Darlissa, Elder Tangleclaw, Well of Sorrow, Del'lynar Songwood, Sonya Darkhallow). Treat those names as unverified.
   - New dungeons do appear with encounters: City of Dalaran (map 2959, 9 bosses), Ruins of Lordaeron (2999, 7), The Hall of Thanes (3065, 4), Excavation Site: Wetlands (2998, 4), Half-Pint Tavern (3002, 2), Manor Mistmantle (3109, no encounters yet).
   - ChrRaces adds ids 95 "High Order Skyborne" and 96 "Windshaper Skyborne" (the Skyborne Elves, apparently one per faction).
2. **Wowhead: yes, Forever database live, items only.**
   - Item pages at `wowhead.com/forever/item=<id>`; tooltip JSON at `https://nether.wowhead.com/forever/tooltip/item/<id>` (200 for Forever ids; the `/classic/` tooltip path returns 404 for them). This is a second verification source for names and ids.
   - No drop-source listviews yet (checked item 271940, Theramore Gauntlets). The zones list has no Barrow Deeps or Hyjal Summit.
3. **Battle.net developer portal: not verified.** The public namespace docs mention no Forever namespace. Confirming whether the API accepts one needs an OAuth token from the app's Blizzard credentials, which was not done in this check. Assume no API source for now.
4. **Item-id ranges and conventions (ItemSparse, build 1.60.1.70009 vs Classic Era 1.15.9.69722).**
   - 4,963 item ids in Forever are not in Classic Era, almost all from 230000 to 289999 (230000s: 49, 240000s: 250, 250000s: 1,267, 260000s: 608, 270000s: 2,288, 280000s: 467). Some are Season of Discovery carry-overs (for example, Hakkari Summoning Token, Demonic Gauntlet), so a new id is not automatically Forever content.
   - No new InventoryType values, so no new item slots. 404 new equippable epics, with ilvl 65 to 71 at the top, mostly PvP sets ("Premier ..." rank sets) and faction gear.
   - Tier is not final: item 273878 is "[DNT] Crafted Tier Piece Placeholder". No tier-token items identified yet, so the token-class convention for Forever is still unknown.
   - Forever ItemSparse has fewer rows than Classic Era (19,224 vs 24,442). Check for missing or encrypted rows before treating it as complete.

**Next triggers:** re-run the Map and DungeonEncounter check on each new 1.60.x build until Barrow Deeps and Hyjal Summit appear; watch for Wowhead drop-source data on Forever items, since that is the only realistic source for boss loot tables.

## Design doc, 2026-09-28

PRD and product spec for loot priority when Forever loot is unknown: https://docs.google.com/document/d/1DviIxYZ8kWTi_XhAxE5Ynf_BMx0y4Jztoc3YcMksPzo/edit

Key research findings that change this todo's premises:
- Blizzard hides item stats by design until an item drops ("until it drops for someone on your server"); stats are computed server-side and the boss-drop table ships empty, so no data source can reveal raid loot early.
- Raids open 2026-12-09 (not at the 2026-11-04 launch): Barrow Deeps (10), Hyjal Summit (20), Onyxia's Lair (40), one difficulty each. Every future tier is expected to start hidden too.
- The Forever client is built on the retail client (Encounter Journal code present, data absent), not a 1.x client.
- Master loot is unconfirmed; GDKP is banned; every boss has rare chase items; tier sets appear role-split; crafted tier may consume disenchanted raid gear.

Recommended design (pending owner decisions in section 15 of the doc): a per-tier Discovery mode where raiders rank generic needs (e.g. Two-hand weapon, Tier piece #1, Trinket #2) instead of items; Loot Score split into standing (attendance, BLP, modifiers, a new slot-weighted loot cost) and interest (need rank); a Drop Desk that classifies each drop, orders candidates by response then score, and records audited council overrides; pinning revealed items onto needs; switching a raid to Known mode once loot is mapped. Milestones: Forever lists by 2026-10-31, Drop Desk by 2026-11-30, raids 2026-12-09.
