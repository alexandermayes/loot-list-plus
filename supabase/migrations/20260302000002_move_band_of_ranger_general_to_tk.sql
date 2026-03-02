-- Move Band of the Ranger-General from Zul'Aman (Timed Event) to Tempest Keep (Kael'thas Sunstrider)
-- It actually drops from Kael'thas in TK, not the ZA timed chest.
UPDATE loot_items li
SET
  raid_tier_id = tk_tier.id,
  boss_name = 'Kael''thas Sunstrider'
FROM
  raid_tiers za_tier
  JOIN expansions e ON za_tier.expansion_id = e.id
  JOIN raid_tiers tk_tier ON tk_tier.expansion_id = e.id
    AND tk_tier.name = 'Tempest Keep: The Eye'
WHERE
  li.name = 'Band of the Ranger-General'
  AND li.raid_tier_id = za_tier.id
  AND za_tier.name = 'Zul''Aman';
