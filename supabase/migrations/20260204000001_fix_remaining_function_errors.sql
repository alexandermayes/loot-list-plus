-- =============================================================================
-- Fix Remaining Database Function Errors
-- Generated: 2026-02-04
--
-- Fixes remaining issues from db lint:
-- 1. get_user_characters_in_guild: class_color VARCHAR -> TEXT (column 8)
-- 2. seed_tbc_expansion_for_guild: Use conditional INSERT instead of ON CONFLICT
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Fix get_user_characters_in_guild: All VARCHARs -> TEXT for consistency
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_user_characters_in_guild(UUID, UUID);
CREATE OR REPLACE FUNCTION get_user_characters_in_guild(p_user_id UUID, p_guild_id UUID)
RETURNS TABLE (
  character_id UUID,
  character_name TEXT,
  character_realm TEXT,
  character_level INTEGER,
  character_is_main BOOLEAN,
  membership_role TEXT,
  class_name TEXT,
  class_color TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name::TEXT,
    c.realm::TEXT,
    c.level,
    c.is_main,
    cgm.role::TEXT,
    wc.name::TEXT,
    wc.color_hex::TEXT
  FROM characters c
  INNER JOIN character_guild_memberships cgm ON cgm.character_id = c.id
  LEFT JOIN wow_classes wc ON wc.id = c.class_id
  WHERE c.user_id = p_user_id
  AND cgm.guild_id = p_guild_id
  AND cgm.is_active = true
  ORDER BY c.is_main DESC, c.created_at ASC;
END;
$$;

-- -----------------------------------------------------------------------------
-- Fix seed_tbc_expansion_for_guild: Use conditional INSERT without ON CONFLICT
-- The expansions table may not have the expected unique constraint
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS seed_tbc_expansion_for_guild(UUID);
CREATE OR REPLACE FUNCTION seed_tbc_expansion_for_guild(p_guild_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expansion_id UUID;
BEGIN
  -- Check if TBC expansion already exists for this guild
  SELECT id INTO v_expansion_id
  FROM expansions
  WHERE guild_id = p_guild_id AND name = 'The Burning Crusade';

  -- If not found, insert it
  IF v_expansion_id IS NULL THEN
    INSERT INTO expansions (guild_id, name)
    VALUES (p_guild_id, 'The Burning Crusade')
    RETURNING id INTO v_expansion_id;
  END IF;

  -- Insert TBC raid tiers in progression order using conditional inserts
  -- Phase 1: Karazhan, Gruul's Lair, Magtheridon's Lair
  INSERT INTO raid_tiers (expansion_id, name, order_index, is_active)
  SELECT v_expansion_id, 'Karazhan', 1, false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Karazhan');

  INSERT INTO raid_tiers (expansion_id, name, order_index, is_active)
  SELECT v_expansion_id, 'Gruul''s Lair', 2, false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Gruul''s Lair');

  INSERT INTO raid_tiers (expansion_id, name, order_index, is_active)
  SELECT v_expansion_id, 'Magtheridon''s Lair', 3, false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Magtheridon''s Lair');

  -- Phase 2: Serpentshrine Cavern, Tempest Keep
  INSERT INTO raid_tiers (expansion_id, name, order_index, is_active)
  SELECT v_expansion_id, 'Serpentshrine Cavern', 4, false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Serpentshrine Cavern');

  INSERT INTO raid_tiers (expansion_id, name, order_index, is_active)
  SELECT v_expansion_id, 'Tempest Keep', 5, false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Tempest Keep');

  -- Phase 3: Mount Hyjal, Black Temple
  INSERT INTO raid_tiers (expansion_id, name, order_index, is_active)
  SELECT v_expansion_id, 'Mount Hyjal', 6, false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Mount Hyjal');

  INSERT INTO raid_tiers (expansion_id, name, order_index, is_active)
  SELECT v_expansion_id, 'Black Temple', 7, false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Black Temple');

  -- Phase 4: Zul'Aman
  INSERT INTO raid_tiers (expansion_id, name, order_index, is_active)
  SELECT v_expansion_id, 'Zul''Aman', 8, false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Zul''Aman');

  -- Phase 5: Sunwell Plateau
  INSERT INTO raid_tiers (expansion_id, name, order_index, is_active)
  SELECT v_expansion_id, 'Sunwell Plateau', 9, false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Sunwell Plateau');

  RAISE NOTICE 'TBC expansion and raid tiers seeded for guild %', p_guild_id;
END;
$$;

-- Grant execute permission on the seed function
GRANT EXECUTE ON FUNCTION seed_tbc_expansion_for_guild TO authenticated;
