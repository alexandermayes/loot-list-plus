-- Debug query to check character permissions
-- Run this to see what roles your character has

-- 1. Check if character exists and has membership
SELECT
  c.id as character_id,
  c.name as character_name,
  c.user_id,
  cgm.guild_id,
  cgm.role as character_role,
  cgm.is_active,
  g.name as guild_name
FROM characters c
LEFT JOIN character_guild_memberships cgm ON cgm.character_id = c.id
LEFT JOIN guilds g ON g.id = cgm.guild_id
WHERE c.user_id = (SELECT auth.uid())
ORDER BY cgm.is_active DESC, cgm.joined_at DESC;

-- 2. Check what guild_roles exist and their positions
SELECT
  gr.name as role_name,
  gr.position,
  gr.guild_id,
  g.name as guild_name
FROM guild_roles gr
INNER JOIN guilds g ON g.id = gr.guild_id
WHERE gr.guild_id IN (
  SELECT guild_id FROM character_guild_memberships cgm
  INNER JOIN characters c ON c.id = cgm.character_id
  WHERE c.user_id = (SELECT auth.uid())
)
ORDER BY gr.position DESC;

-- 3. Check old guild_members table for comparison
SELECT
  gm.user_id,
  gm.character_name,
  gm.role,
  gm.guild_id,
  g.name as guild_name
FROM guild_members gm
INNER JOIN guilds g ON g.id = gm.guild_id
WHERE gm.user_id = (SELECT auth.uid());
