-- =============================================================================
-- Fix Database Function Errors
-- Generated: 2026-02-04
--
-- Fixes HIGH-02 from security audit:
-- 1. get_character_guilds: Return type mismatch (VARCHAR -> TEXT for guild_name)
-- 2. get_user_characters_in_guild: Return type mismatch (VARCHAR -> TEXT for class_name)
-- 3. seed_tbc_expansion_for_guild: References non-existent updated_at on expansions
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Fix get_character_guilds: Change guild_name from VARCHAR to TEXT
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_character_guilds(UUID);
CREATE OR REPLACE FUNCTION get_character_guilds(p_character_id UUID)
RETURNS TABLE (
  guild_id UUID,
  guild_name TEXT,  -- Fixed: was VARCHAR, but guilds.name is TEXT
  guild_icon_url TEXT,
  membership_role VARCHAR,
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.icon_url,
    cgm.role,
    cgm.joined_at
  FROM guilds g
  INNER JOIN character_guild_memberships cgm ON cgm.guild_id = g.id
  WHERE cgm.character_id = p_character_id
  AND cgm.is_active = true
  ORDER BY cgm.joined_at DESC;
END;
$$;

-- -----------------------------------------------------------------------------
-- Fix get_user_characters_in_guild: Change class_name from VARCHAR to TEXT
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_user_characters_in_guild(UUID, UUID);
CREATE OR REPLACE FUNCTION get_user_characters_in_guild(p_user_id UUID, p_guild_id UUID)
RETURNS TABLE (
  character_id UUID,
  character_name VARCHAR,
  character_realm VARCHAR,
  character_level INTEGER,
  character_is_main BOOLEAN,
  membership_role VARCHAR,
  class_name TEXT,  -- Fixed: was VARCHAR, but wow_classes.name is TEXT
  class_color VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.realm,
    c.level,
    c.is_main,
    cgm.role,
    wc.name,
    wc.color_hex
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
-- Fix seed_tbc_expansion_for_guild: Remove reference to non-existent updated_at
-- Use DO NOTHING instead of DO UPDATE SET updated_at for expansions table
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
  -- Insert TBC expansion if it doesn't exist for this guild
  -- Fixed: expansions table doesn't have updated_at column, use DO NOTHING
  INSERT INTO expansions (guild_id, name)
  VALUES (p_guild_id, 'The Burning Crusade')
  ON CONFLICT (guild_id, name) DO NOTHING;

  -- Get the expansion ID (whether just inserted or already existed)
  SELECT id INTO v_expansion_id
  FROM expansions
  WHERE guild_id = p_guild_id AND name = 'The Burning Crusade';

  -- Insert TBC raid tiers in progression order
  -- Phase 1: Karazhan, Gruul's Lair, Magtheridon's Lair
  INSERT INTO raid_tiers (expansion_id, name, order_index, is_active)
  VALUES
    (v_expansion_id, 'Karazhan', 1, false),
    (v_expansion_id, 'Gruul''s Lair', 2, false),
    (v_expansion_id, 'Magtheridon''s Lair', 3, false)
  ON CONFLICT (expansion_id, name) DO UPDATE
    SET updated_at = NOW();

  -- Phase 2: Serpentshrine Cavern, Tempest Keep
  INSERT INTO raid_tiers (expansion_id, name, order_index, is_active)
  VALUES
    (v_expansion_id, 'Serpentshrine Cavern', 4, false),
    (v_expansion_id, 'Tempest Keep', 5, false)
  ON CONFLICT (expansion_id, name) DO UPDATE
    SET updated_at = NOW();

  -- Phase 3: Mount Hyjal, Black Temple
  INSERT INTO raid_tiers (expansion_id, name, order_index, is_active)
  VALUES
    (v_expansion_id, 'Mount Hyjal', 6, false),
    (v_expansion_id, 'Black Temple', 7, false)
  ON CONFLICT (expansion_id, name) DO UPDATE
    SET updated_at = NOW();

  -- Phase 4: Zul'Aman
  INSERT INTO raid_tiers (expansion_id, name, order_index, is_active)
  VALUES
    (v_expansion_id, 'Zul''Aman', 8, false)
  ON CONFLICT (expansion_id, name) DO UPDATE
    SET updated_at = NOW();

  -- Phase 5: Sunwell Plateau
  INSERT INTO raid_tiers (expansion_id, name, order_index, is_active)
  VALUES
    (v_expansion_id, 'Sunwell Plateau', 9, false)
  ON CONFLICT (expansion_id, name) DO UPDATE
    SET updated_at = NOW();

  RAISE NOTICE 'TBC expansion and raid tiers seeded for guild %', p_guild_id;
END;
$$;

-- Grant execute permission on the seed function
GRANT EXECUTE ON FUNCTION seed_tbc_expansion_for_guild TO authenticated;
