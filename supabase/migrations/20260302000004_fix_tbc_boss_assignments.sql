-- Fix TBC items assigned to wrong bosses/raids
-- Verified against wowhead TBC database

-- ============================================================================
-- TEMPEST KEEP: Move items from Solarian to Kael'thas
-- ============================================================================
UPDATE loot_items li
SET boss_name = 'Kael''thas Sunstrider'
FROM raid_tiers rt
WHERE li.raid_tier_id = rt.id
  AND rt.name = 'Tempest Keep: The Eye'
  AND li.boss_name = 'High Astromancer Solarian'
  AND li.name IN ('Sunhawk Leggings', 'Thalassian Wildercloak');

-- ============================================================================
-- BLACK TEMPLE: Move T6 Chest tokens from Bloodboil to Illidan
-- ============================================================================
UPDATE loot_items li
SET boss_name = 'Illidan Stormrage'
FROM raid_tiers rt
WHERE li.raid_tier_id = rt.id
  AND rt.name = 'Black Temple'
  AND li.boss_name = 'Gurtogg Bloodboil'
  AND li.name IN (
    'Chestguard of the Forgotten Conqueror',
    'Chestguard of the Forgotten Protector',
    'Chestguard of the Forgotten Vanquisher'
  );

-- BLACK TEMPLE: Move T6 Shoulder tokens from Illidari Council to Mother Shahraz
UPDATE loot_items li
SET boss_name = 'Mother Shahraz'
FROM raid_tiers rt
WHERE li.raid_tier_id = rt.id
  AND rt.name = 'Black Temple'
  AND li.boss_name = 'The Illidari Council'
  AND li.name IN (
    'Pauldrons of the Forgotten Conqueror',
    'Pauldrons of the Forgotten Protector',
    'Pauldrons of the Forgotten Vanquisher'
  );

-- BLACK TEMPLE: Move T6 Leg tokens from Mother Shahraz to Illidari Council
-- (These were swapped with shoulders)
-- Wait - let me check. Shahraz currently has Leg tokens, Council has Shoulder tokens.
-- Shoulders should be on Shahraz, Legs should stay on Shahraz? No.
-- Wowhead: Shoulders drop from Mother Shahraz, Legs drop from Illidari Council.
-- So: Shoulders (currently on Council) -> Shahraz (done above)
--     Legs (currently on Shahraz) -> need to check if that's correct...
-- Actually wowhead says: Leggings of the Forgotten tokens drop from Illidari Council.
-- They're currently on Mother Shahraz. Need to swap.

-- Move T6 Leg tokens from Mother Shahraz to Illidari Council (where they actually drop)
-- But wait - we need to be careful not to conflict with the shoulder move above.
-- The shoulder tokens were moved FROM Council TO Shahraz.
-- The leg tokens need to move FROM Shahraz TO Council.
-- Since both updates use boss_name in WHERE clause, and we already moved shoulders,
-- the leg tokens are still on Shahraz with boss_name = 'Mother Shahraz'.

-- Actually, re-reading the original data:
-- Mother Shahraz has: Leg tokens + her own loot
-- Illidari Council has: Shoulder tokens + council loot
-- Wowhead says: Shahraz drops Shoulders, Council drops Legs
-- So BOTH token sets are on the wrong boss. We already moved shoulders above.
-- Now move legs:
UPDATE loot_items li
SET boss_name = 'The Illidari Council'
FROM raid_tiers rt
WHERE li.raid_tier_id = rt.id
  AND rt.name = 'Black Temple'
  AND li.boss_name = 'Mother Shahraz'
  AND li.name IN (
    'Leggings of the Forgotten Conqueror',
    'Leggings of the Forgotten Protector',
    'Leggings of the Forgotten Vanquisher'
  );

-- ============================================================================
-- SUNWELL PLATEAU: Move Shoulderpads of Vehemence from Kalecgos to Eredar Twins
-- ============================================================================
UPDATE loot_items li
SET boss_name = 'Eredar Twins'
FROM raid_tiers rt
WHERE li.raid_tier_id = rt.id
  AND rt.name = 'Sunwell Plateau'
  AND li.name = 'Shoulderpads of Vehemence'
  AND li.boss_name = 'Kalecgos';

-- ============================================================================
-- SUNWELL PLATEAU: Move Sunflare from Eredar Twins to Kil'jaeden
-- ============================================================================
UPDATE loot_items li
SET boss_name = 'Kil''jaeden'
FROM raid_tiers rt
WHERE li.raid_tier_id = rt.id
  AND rt.name = 'Sunwell Plateau'
  AND li.name = 'Sunflare'
  AND li.boss_name = 'Eredar Twins';

-- ============================================================================
-- REMOVE NON-RAID DROPS (dungeon drops and world boss drops)
-- These items should never have been in raid loot tables.
-- Using DELETE CASCADE to clean up loot_item_classes too.
-- ============================================================================

-- Remove Heroic Magisters' Terrace dungeon drops from SWP
DELETE FROM loot_items li
USING raid_tiers rt
WHERE li.raid_tier_id = rt.id
  AND rt.name = 'Sunwell Plateau'
  AND li.name IN (
    'Commendation of Kael''thas',
    'Shard of Contempt',
    'Vial of the Sunwell'
  );

-- Remove Doom Lord Kazzak world boss drop from ZA
DELETE FROM loot_items li
USING raid_tiers rt
WHERE li.raid_tier_id = rt.id
  AND rt.name = 'Zul''Aman'
  AND li.name = 'Ring of Flowing Light';

-- ============================================================================
-- DEDUPLICATE: Sunflare may exist on both Eredar Twins and Kil'jaeden
-- after the move. Run dedup again to clean up.
-- ============================================================================
WITH duplicates AS (
  SELECT
    li.id,
    li.name,
    rt.expansion_id,
    ROW_NUMBER() OVER (
      PARTITION BY li.name, rt.expansion_id
      ORDER BY
        (SELECT COUNT(*) FROM loot_history lh WHERE lh.loot_item_id = li.id) DESC,
        (SELECT COUNT(*) FROM loot_submission_items lsi WHERE lsi.loot_item_id = li.id) DESC,
        li.created_at ASC
    ) AS rn
  FROM loot_items li
  JOIN raid_tiers rt ON li.raid_tier_id = rt.id
)
DELETE FROM loot_items
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
