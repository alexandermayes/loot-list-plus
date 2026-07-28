-- Add missing TBC Phase 3 loot: two Teron Gorefiend drops (GH #199) and the
-- Hyjal Summit jewelcrafting designs (GH #200).
--
-- Same shape as 20260715000001_add_bt_hyjal_trash_loot.sql: every guild has
-- its own copy of each raid_tier and its loot_items (there is no shared/global
-- item row and no guild_id on raid_tiers), so we insert one row PER GUILD by
-- joining the item list against every matching tier. The "Black Temple" and
-- "Hyjal Summit" tier names are unique to TBC, so matching on name alone is
-- safe. The NOT EXISTS guard (wowhead_id + raid_tier_id) makes this idempotent.
--
-- Item names/ids/slots match the entries added to data/tbc-raids.ts, so
-- newly-seeded and existing guilds converge.

-- ---------------------------------------------------------------------------
-- GH #199: Teron Gorefiend (Black Temple).
--
-- Both are ranged weapons that were never in the seed's Teron Gorefiend loot
-- table, so raiders could not list them. 32326 was already present in
-- data/item-icons.ts and data/item-types.ts — the metadata existed, the loot
-- row never did. Classified 'Limited' to match the year-2 classification pass
-- (scripts/update-tbc-year2-item-classifications.ts).
-- ---------------------------------------------------------------------------
INSERT INTO loot_items (raid_tier_id, name, wowhead_id, item_slot, boss_name, classification, allocation_cost, is_available)
SELECT rt.id, v.name, v.wowhead_id, v.item_slot, 'Teron Gorefiend', 'Limited', 0, true
FROM raid_tiers rt
CROSS JOIN (VALUES
  ('Rifle of the Stoic Guardian', 32325, 'Ranged'),
  ('Twisted Blades of Zarak', 32326, 'Ranged')
) AS v(name, wowhead_id, item_slot)
WHERE rt.name = 'Black Temple'
  AND NOT EXISTS (
    SELECT 1 FROM loot_items li
    WHERE li.raid_tier_id = rt.id
      AND li.wowhead_id = v.wowhead_id
  );

-- ---------------------------------------------------------------------------
-- GH #200: Hyjal Summit jewelcrafting designs (trash drops).
--
-- Neither Hyjal Summit nor Black Temple was seeded with ANY 'Recipe' items,
-- which is why raiders saw no recipes at all for Phase 3 while Karazhan (7)
-- and Tempest Keep (16) had them. The original generator filtered the source
-- data to equippable epics, so non-equippable recipe rows were dropped, and
-- the #171 trash backfill added gear only.
--
-- Recipes are 'Unlimited' + cost 0, matching how the Karazhan/Tempest Keep
-- recipe rows are seeded.
-- ---------------------------------------------------------------------------
INSERT INTO loot_items (raid_tier_id, name, wowhead_id, item_slot, boss_name, classification, allocation_cost, is_available)
SELECT rt.id, v.name, v.wowhead_id, v.item_slot, 'Trash', 'Unlimited', 0, true
FROM raid_tiers rt
CROSS JOIN (VALUES
  ('Design: Flashing Crimson Spinel', 32285, 'Recipe'),
  ('Design: Stormy Empyrean Sapphire', 32289, 'Recipe'),
  ('Design: Mystic Lionseye', 32295, 'Recipe'),
  ('Design: Great Lionseye', 32296, 'Recipe'),
  ('Design: Sovereign Shadowsong Amethyst', 32297, 'Recipe'),
  ('Design: Shifting Shadowsong Amethyst', 32298, 'Recipe'),
  ('Design: Inscribed Pyrestone', 32303, 'Recipe'),
  ('Design: Veiled Pyrestone', 32307, 'Recipe')
) AS v(name, wowhead_id, item_slot)
WHERE rt.name = 'Hyjal Summit'
  AND NOT EXISTS (
    SELECT 1 FROM loot_items li
    WHERE li.raid_tier_id = rt.id
      AND li.wowhead_id = v.wowhead_id
  );
