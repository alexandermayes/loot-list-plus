-- Fix all raid tiers with null phases and update seed function to include phase

-- Backfill any existing raid tiers missing phase values
-- TBC
UPDATE raid_tiers SET phase = 1 WHERE name IN ('Karazhan', 'Gruul''s Lair', 'Magtheridon''s Lair') AND phase IS NULL;
UPDATE raid_tiers SET phase = 2 WHERE name ILIKE '%tempest%' AND phase IS NULL;
UPDATE raid_tiers SET phase = 2 WHERE name = 'Serpentshrine Cavern' AND phase IS NULL;
UPDATE raid_tiers SET phase = 3 WHERE name IN ('Hyjal Summit', 'Mount Hyjal', 'Black Temple') AND phase IS NULL;
UPDATE raid_tiers SET phase = 4 WHERE name = 'Zul''Aman' AND phase IS NULL;
UPDATE raid_tiers SET phase = 5 WHERE name = 'Sunwell Plateau' AND phase IS NULL;

-- Classic
UPDATE raid_tiers SET phase = 1 WHERE name IN ('Molten Core', 'Onyxia''s Lair') AND phase IS NULL;
UPDATE raid_tiers SET phase = 2 WHERE name = 'Blackwing Lair' AND phase IS NULL;
UPDATE raid_tiers SET phase = 3 WHERE name IN ('Ruins of Ahn''Qiraj', 'Temple of Ahn''Qiraj') AND phase IS NULL;
UPDATE raid_tiers SET phase = 4 WHERE name = 'Naxxramas' AND phase IS NULL;

-- Wrath
UPDATE raid_tiers SET phase = 1 WHERE name IN ('Naxxramas', 'The Eye of Eternity', 'The Obsidian Sanctum', 'Vault of Archavon') AND phase IS NULL;
UPDATE raid_tiers SET phase = 2 WHERE name = 'Ulduar' AND phase IS NULL;
UPDATE raid_tiers SET phase = 3 WHERE name IN ('Trial of the Crusader', 'Onyxia''s Lair') AND phase IS NULL;
UPDATE raid_tiers SET phase = 4 WHERE name = 'Icecrown Citadel' AND phase IS NULL;
UPDATE raid_tiers SET phase = 5 WHERE name = 'Ruby Sanctum' AND phase IS NULL;

-- Update the seed_tbc_expansion function to include phase in inserts
CREATE OR REPLACE FUNCTION seed_tbc_expansion(p_guild_id UUID)
RETURNS void AS $$
DECLARE
  v_expansion_id UUID;
BEGIN
  -- Get or create the TBC expansion for this guild
  SELECT id INTO v_expansion_id FROM expansions
  WHERE guild_id = p_guild_id AND name = 'The Burning Crusade';

  IF v_expansion_id IS NULL THEN
    RETURN;
  END IF;

  -- Phase 1: Karazhan, Gruul, Magtheridon
  INSERT INTO raid_tiers (expansion_id, name, is_active, phase)
  SELECT v_expansion_id, 'Karazhan', false, 1
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Karazhan');

  INSERT INTO raid_tiers (expansion_id, name, is_active, phase)
  SELECT v_expansion_id, 'Gruul''s Lair', false, 1
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Gruul''s Lair');

  INSERT INTO raid_tiers (expansion_id, name, is_active, phase)
  SELECT v_expansion_id, 'Magtheridon''s Lair', false, 1
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Magtheridon''s Lair');

  -- Phase 2: Serpentshrine Cavern, Tempest Keep
  INSERT INTO raid_tiers (expansion_id, name, is_active, phase)
  SELECT v_expansion_id, 'Serpentshrine Cavern', false, 2
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Serpentshrine Cavern');

  INSERT INTO raid_tiers (expansion_id, name, is_active, phase)
  SELECT v_expansion_id, 'Tempest Keep', false, 2
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Tempest Keep');

  -- Phase 3: Mount Hyjal, Black Temple
  INSERT INTO raid_tiers (expansion_id, name, is_active, phase)
  SELECT v_expansion_id, 'Mount Hyjal', false, 3
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Mount Hyjal');

  INSERT INTO raid_tiers (expansion_id, name, is_active, phase)
  SELECT v_expansion_id, 'Black Temple', false, 3
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Black Temple');

  -- Phase 4: Zul'Aman
  INSERT INTO raid_tiers (expansion_id, name, is_active, phase)
  SELECT v_expansion_id, 'Zul''Aman', false, 4
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Zul''Aman');

  -- Phase 5: Sunwell Plateau
  INSERT INTO raid_tiers (expansion_id, name, is_active, phase)
  SELECT v_expansion_id, 'Sunwell Plateau', false, 5
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Sunwell Plateau');
END;
$$ LANGUAGE plpgsql;
