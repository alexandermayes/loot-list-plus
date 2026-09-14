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
