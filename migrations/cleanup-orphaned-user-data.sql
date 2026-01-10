-- This script helps identify and clean up orphaned user data

-- First, let's see what guilds exist
SELECT id, name, created_by FROM guilds;

-- Check guild_members for entries with deleted guilds
SELECT gm.id, gm.user_id, gm.guild_id, gm.character_name, gm.role
FROM guild_members gm
LEFT JOIN guilds g ON gm.guild_id = g.id
WHERE g.id IS NULL;

-- Check user_active_guilds for entries with deleted guilds
SELECT uag.user_id, uag.active_guild_id
FROM user_active_guilds uag
LEFT JOIN guilds g ON uag.active_guild_id = g.id
WHERE g.id IS NULL;

-- Clean up orphaned guild_members entries
DELETE FROM guild_members
WHERE guild_id NOT IN (SELECT id FROM guilds);

-- Clean up orphaned user_active_guilds entries
DELETE FROM user_active_guilds
WHERE active_guild_id NOT IN (SELECT id FROM guilds);
