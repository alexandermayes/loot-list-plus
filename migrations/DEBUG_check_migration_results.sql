-- =====================================================
-- DEBUG: Check Migration Results
-- =====================================================
-- Run this to see if the migration worked
-- =====================================================

-- 1. Total counts
SELECT
  (SELECT COUNT(*) FROM characters) as total_characters,
  (SELECT COUNT(*) FROM character_guild_memberships) as total_memberships,
  (SELECT COUNT(*) FROM user_active_characters) as total_active,
  (SELECT COUNT(*) FROM guild_members WHERE is_active = true) as total_old_members;

-- 2. Check if Officer/Guild Master roles were migrated
SELECT
  'Officers and Guild Masters:' as info,
  c.name as character_name,
  g.name as guild_name,
  cgm.role
FROM character_guild_memberships cgm
INNER JOIN characters c ON c.id = cgm.character_id
INNER JOIN guilds g ON g.id = cgm.guild_id
WHERE cgm.role IN ('Officer', 'Guild Master')
ORDER BY g.name, cgm.role DESC, c.name;

-- 3. Check if any active users don't have characters
SELECT
  'Users without characters:' as info,
  COUNT(*) as users_without_characters
FROM guild_members gm
WHERE gm.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM characters c WHERE c.user_id = gm.user_id
  );

-- 4. Check current user's info (whoever is running this query)
SELECT
  'Your Info:' as info,
  auth.uid() as your_user_id,
  CASE
    WHEN EXISTS (SELECT 1 FROM characters WHERE user_id = auth.uid())
    THEN 'Yes'
    ELSE 'No'
  END as has_character,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE c.user_id = auth.uid()
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    THEN 'Yes'
    ELSE 'No'
  END as is_officer;
