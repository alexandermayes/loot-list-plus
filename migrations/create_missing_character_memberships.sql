-- Create missing character_guild_memberships from existing guild_members
-- This fixes the issue where characters exist but aren't linked to guilds

-- First, check what we have
SELECT 'Characters for current user:' as info;
SELECT id, name, user_id FROM characters WHERE user_id = (SELECT auth.uid());

SELECT 'Guild memberships for current user:' as info;
SELECT * FROM guild_members WHERE user_id = (SELECT auth.uid());

SELECT 'Character guild memberships for current user:' as info;
SELECT cgm.*, c.name as character_name, g.name as guild_name
FROM character_guild_memberships cgm
INNER JOIN characters c ON c.id = cgm.character_id
INNER JOIN guilds g ON g.id = cgm.guild_id
WHERE c.user_id = (SELECT auth.uid());

-- Now create the missing memberships
-- This will copy all guild_members records to character_guild_memberships
-- using the first character for each guild
INSERT INTO character_guild_memberships (character_id, guild_id, role, is_active, joined_at, joined_via)
SELECT
  c.id as character_id,
  gm.guild_id,
  gm.role,
  gm.is_active,
  gm.joined_at,
  gm.joined_via
FROM guild_members gm
INNER JOIN characters c ON c.user_id = gm.user_id
WHERE gm.user_id = (SELECT auth.uid())
  AND NOT EXISTS (
    -- Don't insert if membership already exists
    SELECT 1 FROM character_guild_memberships cgm2
    WHERE cgm2.character_id = c.id
      AND cgm2.guild_id = gm.guild_id
  )
  -- If user has multiple characters, use the first one (or main character)
  AND c.id = (
    SELECT id FROM characters
    WHERE user_id = gm.user_id
    ORDER BY is_main DESC, created_at ASC
    LIMIT 1
  )
ON CONFLICT (character_id, guild_id) DO NOTHING;

-- Verify the result
SELECT 'After creating memberships:' as info;
SELECT cgm.*, c.name as character_name, g.name as guild_name
FROM character_guild_memberships cgm
INNER JOIN characters c ON c.id = cgm.character_id
INNER JOIN guilds g ON g.id = cgm.guild_id
WHERE c.user_id = (SELECT auth.uid());
