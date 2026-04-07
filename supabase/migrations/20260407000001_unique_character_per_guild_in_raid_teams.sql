-- Enforce one team per character per guild.
-- A character can only be on a single raid team within a guild.
-- If duplicates exist, keep the earliest assignment.

-- Remove duplicates (keep earliest joined_at per guild+character)
DELETE FROM raid_team_members a
USING raid_team_members b
WHERE a.guild_id = b.guild_id
  AND a.character_id = b.character_id
  AND a.id > b.id;

-- Drop the old unique constraint (raid_team_id, character_id) if it exists
ALTER TABLE raid_team_members
  DROP CONSTRAINT IF EXISTS raid_team_members_raid_team_id_character_id_key;

-- Add new unique constraint: one team per character per guild
ALTER TABLE raid_team_members
  ADD CONSTRAINT raid_team_members_guild_character_unique
  UNIQUE (guild_id, character_id);

-- Re-add the per-team uniqueness too (no duplicate entries within the same team)
ALTER TABLE raid_team_members
  ADD CONSTRAINT raid_team_members_team_character_unique
  UNIQUE (raid_team_id, character_id);
