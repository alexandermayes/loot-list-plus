-- Check if guild_settings table exists and has data
SELECT
  table_name
FROM information_schema.tables
WHERE table_name = 'guild_settings';

-- Check if there are any guild_settings records
SELECT
  COUNT(*) as settings_count,
  guild_id
FROM guild_settings
GROUP BY guild_id;

-- Show the settings for your guild(s)
SELECT
  g.name as guild_name,
  gs.attendance_type,
  gs.max_attendance_bonus,
  gs.rank_modifiers
FROM guild_settings gs
JOIN guilds g ON g.id = gs.guild_id;
