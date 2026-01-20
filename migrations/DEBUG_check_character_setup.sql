-- =====================================================
-- DEBUG: Check Character Setup
-- =====================================================
-- Run this to see if your character and memberships were created
-- Replace YOUR_EMAIL with your actual login email
-- =====================================================

-- 1. Check if you have characters
SELECT
  'Your Characters:' as info,
  c.id,
  c.name,
  c.is_main,
  c.created_at
FROM characters c
INNER JOIN auth.users u ON u.id = c.user_id
WHERE u.email = 'YOUR_EMAIL_HERE';  -- REPLACE THIS

-- 2. Check your character guild memberships
SELECT
  'Your Guild Memberships:' as info,
  c.name as character_name,
  g.name as guild_name,
  cgm.role,
  cgm.is_active
FROM character_guild_memberships cgm
INNER JOIN characters c ON c.id = cgm.character_id
INNER JOIN guilds g ON g.id = cgm.guild_id
INNER JOIN auth.users u ON u.id = c.user_id
WHERE u.email = 'YOUR_EMAIL_HERE';  -- REPLACE THIS

-- 3. Check your active character
SELECT
  'Your Active Character:' as info,
  c.name as active_character,
  g.name as active_guild
FROM user_active_characters uac
INNER JOIN characters c ON c.id = uac.active_character_id
INNER JOIN guilds g ON g.id = uac.active_guild_id
INNER JOIN auth.users u ON u.id = uac.user_id
WHERE u.email = 'YOUR_EMAIL_HERE';  -- REPLACE THIS

-- 4. Check your old guild_members record (to see what we should have migrated)
SELECT
  'Your Old Guild Member Record:' as info,
  gm.character_name,
  g.name as guild_name,
  gm.role,
  gm.is_active
FROM guild_members gm
INNER JOIN guilds g ON g.id = gm.guild_id
INNER JOIN auth.users u ON u.id = gm.user_id
WHERE u.email = 'YOUR_EMAIL_HERE';  -- REPLACE THIS
