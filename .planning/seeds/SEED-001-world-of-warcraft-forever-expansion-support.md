---
id: SEED-001
status: dormant
planted: 2026-09-13
planted_during: Milestone "Search & AI Sprint Completion", between Phase 05 (complete) and Phase 06 (Sep 20 to 24)
trigger_when: the Search and AI sprint closes on 2026-09-24, or the Forever beta (from 2026-09-17) exposes item and encounter data on wago.tools, whichever comes first
scope: large
---

# SEED-001: Build World of Warcraft Forever support on a repeatable expansion-onboarding format

## Why This Matters

Blizzard announced World of Warcraft: Forever (official Classic Plus) at BlizzCon on 2026-09-12: beta 2026-09-17 to 2026-10-21, worldwide launch 2026-11-04, included in the WoW subscription. Two launch raids (Barrow Deeps, 10 player; Hyjal Summit, 20 player), Onyxia's Lair on the December roadmap, nine dungeons, a new race (Skyborne Elves) and new professions. Forever guilds will want loot lists during beta and need them at launch; a loot tool with no Forever raids on 2026-11-04 loses the category it just spent a sprint trying to own.

The way LootList+ adds expansions does not scale to a sixth one safely. Each expansion is a hand-copied set of files joined by item name (raids, classifications, roles, token classes, icons) selected by displayName if/else chains in app/services/expansionSeeder.ts. GH-269 (2026-09-13) showed the failure mode: 24 Naxxramas tokens with wrong ids silently misattached class restrictions in 9 guilds, and the only reason it was catchable was a reference dataset that will not cover Forever. The Forever work should therefore land the format first (manifest per expansion, wowhead_id as the join key, a verification gate per expansion) and Forever as its first consumer.

## When to Surface

**Trigger:** the sprint closes on 2026-09-24 (open as the next milestone via /gsd-new-milestone with a research phase first), or earlier if the beta client ships and wago.tools lists a Forever product with Item and JournalEncounter rows for the two raids.

Dates: 2026-09-17 beta opens (run the day-one data checklist in the todo), 2026-09-24 sprint end, 2026-10-21 beta closes, 2026-11-04 launch.

## Scope Estimate

**Large**: a full milestone. Roughly: research phase (data sources, schema gaps for the new race and professions), format phase (manifest, registry-driven seeder, id-keyed classifications and token classes, per-expansion verification test, migration of the five existing expansions or adapters), Forever data phase (manifest built from beta data, verified against wago.tools or Wowhead), launch readiness (seeding smoke test on a real guild, docs).

## Breadcrumbs

- .planning/todos/pending/2026-09-13-build-world-of-warcraft-forever-support-with-a-repeatable-ex.md (full context, data-source findings, day-one checklist)
- app/services/expansionSeeder.ts:195-207 (hardcoded expansion registry) and :382-405 (displayName if/else chains)
- data/classic-wow-raids.ts, data/tbc-raids.ts, data/wrath-raids.ts, data/cata-raids.ts, data/mop-raids.ts (per-expansion raid data)
- data/token-class-mapping.ts (name-substring token class lookup), data/*-item-classifications.ts, data/*-item-roles.ts (name-keyed)
- data/__tests__/classic-wow-raids.test.ts (the verification-gate pattern to generalise)
- supabase/migrations/20260913000000_fix_naxx_token_names.sql (what a data correction costs when names are the join key)
- .github/workflows/refresh-item-data.yml (existing scheduled item-data refresh; candidate home for a Forever data pull)
- GitHub #269 (the motivating incident)

## Notes

Data-source status as of 2026-09-13: nothing structured public yet. wago.tools client tables are the earliest expected source (day one of beta), Wowhead's Forever database second; the wow-classic-items npm package cannot verify Forever items. A Google Calendar reminder set was attempted and failed on an expired connector session; re-create on the three dates above if wanted.
