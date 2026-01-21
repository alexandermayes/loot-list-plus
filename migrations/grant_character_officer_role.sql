-- Grant officer role to characters based on their user's guild_members role
-- This fixes the officer permissions issue after character system migration

-- Update character_guild_memberships to have officer roles
-- for users who were officers in the guild_members table
UPDATE character_guild_memberships cgm
SET role = gm.role
FROM guild_members gm
INNER JOIN characters c ON c.user_id = gm.user_id
WHERE cgm.character_id = c.id
  AND cgm.guild_id = gm.guild_id
  AND gm.role IN ('Guild Master', 'Officer')
  AND cgm.role = 'Member'; -- Only update if currently Member

-- Verify the update
SELECT
  c.name as character_name,
  cgm.role,
  g.name as guild_name
FROM character_guild_memberships cgm
INNER JOIN characters c ON c.id = cgm.character_id
INNER JOIN guilds g ON g.id = cgm.guild_id
WHERE cgm.role IN ('Guild Master', 'Officer');
