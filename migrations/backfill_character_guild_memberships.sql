-- Migration: Backfill character_guild_memberships for existing guild members
-- This ensures all active characters have proper guild memberships
-- Run this after implementing the character system to migrate existing users

-- For each user's active character that doesn't have a membership in their active guild,
-- create the membership record
INSERT INTO character_guild_memberships (character_id, guild_id, role, is_active, joined_at, joined_via)
SELECT DISTINCT
  uac.active_character_id,
  uac.active_guild_id,
  COALESCE(gm.role, 'Member') as role,
  true as is_active,
  COALESCE(gm.joined_at, NOW()) as joined_at,
  'migration' as joined_via
FROM user_active_characters uac
INNER JOIN characters c ON c.id = uac.active_character_id
LEFT JOIN guild_members gm ON gm.user_id = c.user_id AND gm.guild_id = uac.active_guild_id
WHERE uac.active_character_id IS NOT NULL
  AND uac.active_guild_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    WHERE cgm.character_id = uac.active_character_id
    AND cgm.guild_id = uac.active_guild_id
  )
ON CONFLICT (character_id, guild_id) DO NOTHING;

-- Also backfill for all user characters that are in guilds where the user is a member
-- but the character doesn't have a membership yet
INSERT INTO character_guild_memberships (character_id, guild_id, role, is_active, joined_at, joined_via)
SELECT DISTINCT
  c.id as character_id,
  gm.guild_id,
  gm.role,
  true as is_active,
  COALESCE(gm.joined_at, NOW()) as joined_at,
  'migration' as joined_via
FROM characters c
INNER JOIN guild_members gm ON gm.user_id = c.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM character_guild_memberships cgm
  WHERE cgm.character_id = c.id
  AND cgm.guild_id = gm.guild_id
)
ON CONFLICT (character_id, guild_id) DO NOTHING;

-- Log the results
DO $$
DECLARE
  membership_count INT;
BEGIN
  SELECT COUNT(*) INTO membership_count FROM character_guild_memberships WHERE joined_via = 'migration';
  RAISE NOTICE 'Backfilled % character guild memberships', membership_count;
END $$;
