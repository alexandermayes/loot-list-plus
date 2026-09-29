---
created: 2026-09-28T20:45:00.000Z
title: Fix five existing defects found in the Forever loot code review
area: integrations
severity: major
files:
  - app/api/addon/guild-data/route.ts
  - app/api/addon/export-string/route.ts
  - app/api/bot/priority/route.ts
  - app/api/addon/loot-award/route.ts
  - lib/loot/loot-history-rows.ts
  - app/api/loot-history/bulk/route.ts
  - lib/discord-loot-announcements.ts
  - app/api/discord/post-raid-summary/route.ts
---

## Problem

Found by reading origin/main (3f57adc1) on 2026-09-28 while researching WoW Forever loot. Not yet reproduced at runtime.

1. Addon data routes query tables and a column that do not exist in the migrations or lib/database.types.ts: `bad_luck_protection`, `item_priorities` and `loot_items.slot` (guild-data/route.ts:71, 77, 90; export-string/route.ts:205, 211). The companion likely receives no items; BLP and priorities are likely empty.
2. Discord `/priority` (app/api/bot/priority/route.ts:72-80) selects `loot_submissions.items`, which does not exist, and sorts by raw rank instead of Loot Score, so it likely always returns nobody.
3. Addon awards never set `raid_event_id` (lib/loot/loot-history-rows.ts:51-65), so they fall outside bad luck protection, and the loot-award route never triggers a BLP recompute.
4. Award DELETE and PATCH in app/api/loot-history/bulk/route.ts:334-499 do not recompute BLP, so reversals and reassignments leave stale values.
5. Discord loot announcement links point at retail Wowhead (lib/discord-loot-announcements.ts:32-34, 81) and the raid summary hardcodes /classic/ (post-raid-summary/route.ts:281); Forever needs the /forever/ domain.

## Solution

Reproduce each against a test guild first, then fix with route tests. Items 3 and 4 overlap the Forever design's per-category BLP work (see the Forever loot PRD linked in the WoW Forever todo), so fix them before that rewrite.
