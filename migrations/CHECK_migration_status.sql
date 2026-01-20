-- =====================================================
-- CHECK: Did the migration actually create data?
-- =====================================================

-- 1. Check counts
SELECT 'Total Counts' as check_name,
  (SELECT COUNT(*) FROM guild_members WHERE is_active = true) as active_guild_members,
  (SELECT COUNT(*) FROM characters) as characters_created,
  (SELECT COUNT(*) FROM character_guild_memberships) as memberships_created,
  (SELECT COUNT(*) FROM user_active_characters) as active_characters_set;

-- 2. Show sample guild_members that should have been migrated
SELECT 'Sample Guild Members (should be migrated)' as check_name,
  gm.user_id,
  gm.character_name,
  gm.role,
  g.name as guild_name,
  gm.is_active
FROM guild_members gm
INNER JOIN guilds g ON g.id = gm.guild_id
WHERE gm.is_active = true
  AND gm.character_name IS NOT NULL
  AND gm.character_name != ''
LIMIT 10;

-- 3. Show what characters were actually created
SELECT 'Characters Created' as check_name,
  c.user_id,
  c.name,
  c.is_main,
  c.created_at
FROM characters c
LIMIT 10;

-- 4. Show character memberships
SELECT 'Character Guild Memberships' as check_name,
  c.name as character_name,
  g.name as guild_name,
  cgm.role,
  cgm.joined_via
FROM character_guild_memberships cgm
INNER JOIN characters c ON c.id = cgm.character_id
INNER JOIN guilds g ON g.id = cgm.guild_id
LIMIT 10;
