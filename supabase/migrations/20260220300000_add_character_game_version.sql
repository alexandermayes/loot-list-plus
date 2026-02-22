-- Add game_version column to characters table
-- Stores which WoW version the character belongs to (for Battle.net API calls)
ALTER TABLE characters ADD COLUMN game_version VARCHAR(20) DEFAULT NULL;

-- Backfill existing Battle.net-imported characters as cata-classic
-- (all imports so far have been cata-classic)
UPDATE characters SET game_version = 'cata-classic' WHERE battle_net_id IS NOT NULL;
