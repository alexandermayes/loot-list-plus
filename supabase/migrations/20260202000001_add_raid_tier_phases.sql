-- Add phase column to raid_tiers for grouping raids by content phase
ALTER TABLE raid_tiers
  ADD COLUMN IF NOT EXISTS phase INTEGER;

-- Create index for efficient filtering by phase
CREATE INDEX IF NOT EXISTS idx_raid_tiers_phase ON raid_tiers(phase);

-- Backfill phase data for existing tiers
-- Classic
UPDATE raid_tiers SET phase = 1 WHERE name IN ('Molten Core', 'Onyxia''s Lair');
UPDATE raid_tiers SET phase = 2 WHERE name = 'Blackwing Lair';
UPDATE raid_tiers SET phase = 3 WHERE name = 'Zul''Gurub';
UPDATE raid_tiers SET phase = 4 WHERE name = 'Ahn''Qiraj';
UPDATE raid_tiers SET phase = 5 WHERE name = 'Temple of Ahn''Qiraj';
UPDATE raid_tiers SET phase = 6 WHERE name = 'Naxxramas';

-- TBC
UPDATE raid_tiers SET phase = 1 WHERE name IN ('Karazhan', 'Gruul''s Lair', 'Magtheridon''s Lair');
UPDATE raid_tiers SET phase = 2 WHERE name IN ('Serpentshrine Cavern', 'Tempest Keep', 'Tempest Keep: The Eye', 'The Eye');
UPDATE raid_tiers SET phase = 3 WHERE name IN ('Hyjal Summit', 'Mount Hyjal', 'Black Temple');
UPDATE raid_tiers SET phase = 4 WHERE name = 'Zul''Aman';
UPDATE raid_tiers SET phase = 5 WHERE name = 'Sunwell Plateau';

-- Wrath
UPDATE raid_tiers SET phase = 1 WHERE name IN ('Naxxramas (Wrath)', 'Eye of Eternity', 'Obsidian Sanctum');
UPDATE raid_tiers SET phase = 2 WHERE name = 'Ulduar';
UPDATE raid_tiers SET phase = 3 WHERE name = 'Trial of the Crusader';
UPDATE raid_tiers SET phase = 4 WHERE name = 'Icecrown Citadel';
UPDATE raid_tiers SET phase = 5 WHERE name = 'Ruby Sanctum';
