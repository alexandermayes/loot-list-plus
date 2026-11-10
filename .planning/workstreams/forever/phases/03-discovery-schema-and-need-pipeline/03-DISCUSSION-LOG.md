# Phase 3: Discovery Schema and Need Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md; this log preserves the alternatives considered.

**Date:** 2026-10-19
**Phase:** 03-discovery-schema-and-need-pipeline
**Areas discussed:** Officer switch and its timing, Cost scheme on need rows, Need list and naming, What readers show before Phase 4

---

## Officer switch and its timing

| Question | Options | Selected |
|----------|---------|----------|
| When is a Forever tier in Discovery? | Forever tiers start in Discovery / Officer flips each tier / You decide | Forever tiers start in Discovery |
| Switch between Phase 3 and the Phase 4 picker | Ship plumbing, hold the visible switch / Ship the switch now | Ship plumbing, hold the visible switch |
| Switch back to Known | Only while no one has ranked a need / Never in v2.0 / Always allowed | Only while no one has ranked a need |
| Who can change list mode | manage_settings / Guild owner only | manage_settings |

## Cost scheme on need rows

| Question | Options | Selected |
|----------|---------|----------|
| Cost scheme | 10-point budget Big 3 / Medium 2 / Standard 1 / Allocation cost 1/1/0 | 10-point budget |
| Tier membership | Big weapons and trinkets, Medium rings necks cloaks, Standard armour / Big weapons only / You decide | Big weapons and trinkets, Medium jewellery and cloaks, Standard armour |
| Restriction class on need rows | Mirrored from cost tier / Ignored on Discovery tiers | Mirrored from cost tier |
| Existing Forever tiers | Backfill flips them to Discovery and seeds needs / Leave Known | Backfill |

## Need list and naming

| Question | Options | Selected |
|----------|---------|----------|
| Grain | Slot plus stat family, armour class where it matters / No armour class / Slot only | Slot plus stat family, armour class where it matters |
| Naming | "Two-hand weapon, Strength" / "Strength two-hand weapon" / You decide | "Two-hand weapon, Strength" |
| Per raid | Same full set on every tier / Trim per raid | Same full set |
| Source | Frozen list in domain/loot/needs.ts / In the Forever manifest | domain/loot/needs.ts |

## What readers show before Phase 4

| Question | Options | Selected |
|----------|---------|----------|
| Display | NeedLabel with neutral icon, no link, no boss / Hide need rows | NeedLabel |
| Exclusions (multi) | Reserves / BIS import / Addon exports item-only / Bot /priority | All four |
| Award keying | loot_item_id = need, awarded_item_id = real item / loot_item_id = real item, need_item_id | loot_item_id = need, awarded_item_id |
| Unknown reader | Skip and log once / Fail loudly | Skip and log once |

## Claude's Discretion

- Exact stat family list per slot and armour-class slots
- Mechanism that holds the switch until Phase 4
- Whether the Forever backfill is SQL only or SQL plus sync:forever

## Deferred Ideas

- Bot /priority for need rows (Phase 5)
- Known-mode transition (deferred milestone)
- Desk pinning UI (Phases 5 and 6)
