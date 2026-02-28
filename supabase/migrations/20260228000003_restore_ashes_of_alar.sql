-- Restore Ashes of Al'ar - it is a real loot drop (mount)
-- Re-insert for all guilds that have a Kael'thas Sunstrider boss in TK
INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, classification, is_available)
SELECT rt.id, 'Ashes of Al''ar', 'Kael''thas Sunstrider', 'Mount', 32458, 'Reserved', true
FROM raid_tiers rt
INNER JOIN expansions e ON e.id = rt.expansion_id
WHERE rt.name IN ('Tempest Keep', 'Tempest Keep: The Eye')
AND NOT EXISTS (
  SELECT 1 FROM loot_items li
  WHERE li.raid_tier_id = rt.id AND li.name = 'Ashes of Al''ar'
);
