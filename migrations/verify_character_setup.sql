-- Comprehensive verification of character setup

-- 1. Show current user ID
SELECT auth.uid() as current_user_id;

-- 2. Check characters for current user
SELECT 'Your Characters:' as section, id, name, user_id, is_main, created_at
FROM characters
WHERE user_id = (SELECT auth.uid());

-- 3. Check guild_members (old system)
SELECT 'Your Guild Memberships (old system):' as section,
  id, user_id, guild_id, character_name, role, is_active
FROM guild_members
WHERE user_id = (SELECT auth.uid());

-- 4. Check character_guild_memberships (new system)
SELECT 'Your Character Guild Memberships (new system):' as section,
  cgm.id, cgm.character_id, cgm.guild_id, cgm.role, cgm.is_active,
  c.name as character_name,
  g.name as guild_name
FROM character_guild_memberships cgm
INNER JOIN characters c ON c.id = cgm.character_id
INNER JOIN guilds g ON g.id = cgm.guild_id
WHERE c.user_id = (SELECT auth.uid());

-- 5. Check guild_roles and positions
SELECT 'Guild Roles and Positions:' as section,
  gr.guild_id, gr.name as role_name, gr.position,
  g.name as guild_name
FROM guild_roles gr
INNER JOIN guilds g ON g.id = gr.guild_id
WHERE gr.guild_id IN (
  SELECT guild_id FROM guild_members WHERE user_id = (SELECT auth.uid())
)
ORDER BY gr.position DESC;

-- 6. Check the specific permission check that the API uses
SELECT 'Permission Check for API:' as section,
  c.name as character_name,
  cgm.role as character_role,
  gr.position as role_position,
  CASE WHEN gr.position >= 50 THEN 'YES - Is Officer' ELSE 'NO - Not Officer' END as has_permission
FROM character_guild_memberships cgm
INNER JOIN characters c ON c.id = cgm.character_id
INNER JOIN guilds g ON g.id = cgm.guild_id
LEFT JOIN guild_roles gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
WHERE c.user_id = (SELECT auth.uid())
  AND cgm.is_active = true;
