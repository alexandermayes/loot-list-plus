-- =====================================================
-- ADD TBC (The Burning Crusade) Expansion and Raid Tiers
-- =====================================================
-- This migration adds TBC expansion and all TBC raid tiers
-- Works with the existing expansion system where each guild
-- can have multiple expansions
-- =====================================================

BEGIN;

-- Step 1: Ensure expansions table exists
CREATE TABLE IF NOT EXISTS expansions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(guild_id, name)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_expansions_guild_id ON expansions(guild_id);
CREATE INDEX IF NOT EXISTS idx_expansions_name ON expansions(name);

-- Step 2: Ensure raid_tiers table exists
CREATE TABLE IF NOT EXISTS raid_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expansion_id UUID NOT NULL REFERENCES expansions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT false,
  order_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(expansion_id, name)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_raid_tiers_expansion_id ON raid_tiers(expansion_id);
CREATE INDEX IF NOT EXISTS idx_raid_tiers_name ON raid_tiers(name);
CREATE INDEX IF NOT EXISTS idx_raid_tiers_is_active ON raid_tiers(is_active);

-- Step 3: Enable RLS on tables
ALTER TABLE expansions ENABLE ROW LEVEL SECURITY;
ALTER TABLE raid_tiers ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for expansions
DROP POLICY IF EXISTS "Guild members can view expansions" ON expansions;
CREATE POLICY "Guild members can view expansions" ON expansions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = expansions.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
  );

DROP POLICY IF EXISTS "Officers can insert expansions" ON expansions;
CREATE POLICY "Officers can insert expansions" ON expansions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      INNER JOIN guild_roles gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
      WHERE cgm.guild_id = expansions.guild_id
      AND c.user_id = auth.uid()
      AND gr.position >= 50
    )
  );

DROP POLICY IF EXISTS "Officers can update expansions" ON expansions;
CREATE POLICY "Officers can update expansions" ON expansions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      INNER JOIN guild_roles gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
      WHERE cgm.guild_id = expansions.guild_id
      AND c.user_id = auth.uid()
      AND gr.position >= 50
    )
  );

DROP POLICY IF EXISTS "Officers can delete expansions" ON expansions;
CREATE POLICY "Officers can delete expansions" ON expansions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      INNER JOIN guild_roles gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
      WHERE cgm.guild_id = expansions.guild_id
      AND c.user_id = auth.uid()
      AND gr.position >= 50
    )
  );

-- Step 5: Create RLS policies for raid_tiers
DROP POLICY IF EXISTS "Guild members can view raid tiers" ON raid_tiers;
CREATE POLICY "Guild members can view raid tiers" ON raid_tiers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expansions e
      INNER JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE e.id = raid_tiers.expansion_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
  );

DROP POLICY IF EXISTS "Officers can insert raid tiers" ON raid_tiers;
CREATE POLICY "Officers can insert raid tiers" ON raid_tiers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expansions e
      INNER JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
      INNER JOIN characters c ON c.id = cgm.character_id
      INNER JOIN guild_roles gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
      WHERE e.id = raid_tiers.expansion_id
      AND c.user_id = auth.uid()
      AND gr.position >= 50
    )
  );

DROP POLICY IF EXISTS "Officers can update raid tiers" ON raid_tiers;
CREATE POLICY "Officers can update raid tiers" ON raid_tiers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM expansions e
      INNER JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
      INNER JOIN characters c ON c.id = cgm.character_id
      INNER JOIN guild_roles gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
      WHERE e.id = raid_tiers.expansion_id
      AND c.user_id = auth.uid()
      AND gr.position >= 50
    )
  );

DROP POLICY IF EXISTS "Officers can delete raid tiers" ON raid_tiers;
CREATE POLICY "Officers can delete raid tiers" ON raid_tiers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM expansions e
      INNER JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
      INNER JOIN characters c ON c.id = cgm.character_id
      INNER JOIN guild_roles gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
      WHERE e.id = raid_tiers.expansion_id
      AND c.user_id = auth.uid()
      AND gr.position >= 50
    )
  );

-- Step 6: Create function to seed TBC data for a guild
CREATE OR REPLACE FUNCTION seed_tbc_expansion_for_guild(p_guild_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expansion_id UUID;
BEGIN
  -- Insert TBC expansion if it doesn't exist for this guild
  INSERT INTO expansions (guild_id, name)
  VALUES (p_guild_id, 'The Burning Crusade')
  ON CONFLICT (guild_id, name) DO UPDATE
    SET updated_at = NOW()
  RETURNING id INTO v_expansion_id;

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

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TBC Expansion System Ready!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created/verified:';
  RAISE NOTICE '- expansions';
  RAISE NOTICE '- raid_tiers';
  RAISE NOTICE '';
  RAISE NOTICE 'TBC Raid Tiers (9 total):';
  RAISE NOTICE '- Phase 1: Karazhan, Gruul, Magtheridon';
  RAISE NOTICE '- Phase 2: SSC, TK';
  RAISE NOTICE '- Phase 3: Hyjal, Black Temple';
  RAISE NOTICE '- Phase 4: Zul''Aman';
  RAISE NOTICE '- Phase 5: Sunwell Plateau';
  RAISE NOTICE '';
  RAISE NOTICE 'To seed TBC for a guild, run:';
  RAISE NOTICE 'SELECT seed_tbc_expansion_for_guild(''<guild_id>'');';
  RAISE NOTICE '========================================';
END $$;
