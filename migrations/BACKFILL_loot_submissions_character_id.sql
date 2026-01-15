-- Backfill character_id for existing loot submissions
-- This links old user-based submissions to the new character system

-- First, let's see what we're working with
SELECT
  COUNT(*) as total_submissions,
  COUNT(character_id) as with_character_id,
  COUNT(*) - COUNT(character_id) as missing_character_id
FROM loot_submissions;

-- Strategy: For each user, create a character if they don't have one,
-- then link their submissions to that character

-- Step 1: Create a default character for each user who has submissions but no characters
INSERT INTO characters (user_id, name, is_main)
SELECT DISTINCT
  ls.user_id,
  COALESCE(gm.character_name, u.email, 'Character'), -- Use guild_members name or email
  true -- Mark as main character
FROM loot_submissions ls
LEFT JOIN auth.users u ON u.id = ls.user_id
LEFT JOIN guild_members gm ON gm.user_id = ls.user_id AND gm.guild_id = ls.guild_id
WHERE ls.character_id IS NULL
  AND ls.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM characters c
    WHERE c.user_id = ls.user_id
  )
ON CONFLICT ON CONSTRAINT unique_character_per_user DO NOTHING;

-- Step 2: Link characters to guilds via character_guild_memberships
INSERT INTO character_guild_memberships (character_id, guild_id, role)
SELECT DISTINCT
  c.id as character_id,
  ls.guild_id,
  COALESCE(gm.role, 'Member') as role
FROM loot_submissions ls
INNER JOIN characters c ON c.user_id = ls.user_id
LEFT JOIN guild_members gm ON gm.user_id = ls.user_id AND gm.guild_id = ls.guild_id
WHERE ls.character_id IS NULL
  AND ls.guild_id IS NOT NULL
ON CONFLICT ON CONSTRAINT unique_character_guild DO NOTHING;

-- Step 3: Update loot_submissions to link to characters
-- For each submission, find the user's character in that guild (or any character if not found)
UPDATE loot_submissions ls
SET character_id = (
  SELECT c.id
  FROM characters c
  WHERE c.user_id = ls.user_id
  ORDER BY c.is_main DESC, c.created_at ASC
  LIMIT 1
)
WHERE ls.character_id IS NULL
  AND ls.user_id IS NOT NULL;

-- Verify the backfill
SELECT
  COUNT(*) as total_submissions,
  COUNT(character_id) as with_character_id,
  COUNT(*) - COUNT(character_id) as still_missing_character_id
FROM loot_submissions;
