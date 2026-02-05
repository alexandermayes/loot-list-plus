-- =============================================================================
-- Fix seed_tbc_expansion_for_guild: Remove order_index column reference
-- Generated: 2026-02-04
--
-- The raid_tiers table doesn't have an order_index column in the live database
-- =============================================================================

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
  -- Note: raid_tiers table doesn't have order_index column

  -- Phase 1: Karazhan, Gruul's Lair, Magtheridon's Lair
  INSERT INTO raid_tiers (expansion_id, name, is_active)
  SELECT v_expansion_id, 'Karazhan', false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Karazhan');

  INSERT INTO raid_tiers (expansion_id, name, is_active)
  SELECT v_expansion_id, 'Gruul''s Lair', false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Gruul''s Lair');

  INSERT INTO raid_tiers (expansion_id, name, is_active)
  SELECT v_expansion_id, 'Magtheridon''s Lair', false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Magtheridon''s Lair');

  -- Phase 2: Serpentshrine Cavern, Tempest Keep
  INSERT INTO raid_tiers (expansion_id, name, is_active)
  SELECT v_expansion_id, 'Serpentshrine Cavern', false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Serpentshrine Cavern');

  INSERT INTO raid_tiers (expansion_id, name, is_active)
  SELECT v_expansion_id, 'Tempest Keep', false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Tempest Keep');

  -- Phase 3: Mount Hyjal, Black Temple
  INSERT INTO raid_tiers (expansion_id, name, is_active)
  SELECT v_expansion_id, 'Mount Hyjal', false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Mount Hyjal');

  INSERT INTO raid_tiers (expansion_id, name, is_active)
  SELECT v_expansion_id, 'Black Temple', false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Black Temple');

  -- Phase 4: Zul'Aman
  INSERT INTO raid_tiers (expansion_id, name, is_active)
  SELECT v_expansion_id, 'Zul''Aman', false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Zul''Aman');

  -- Phase 5: Sunwell Plateau
  INSERT INTO raid_tiers (expansion_id, name, is_active)
  SELECT v_expansion_id, 'Sunwell Plateau', false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Sunwell Plateau');

  RAISE NOTICE 'TBC expansion and raid tiers seeded for guild %', p_guild_id;
END;
$$;

-- Grant execute permission on the seed function
GRANT EXECUTE ON FUNCTION seed_tbc_expansion_for_guild TO authenticated;
