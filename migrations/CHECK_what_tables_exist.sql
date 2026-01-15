-- Check which tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'characters',
  'character_guild_memberships',
  'user_active_characters',
  'raid_events',
  'attendance_records'
)
ORDER BY table_name;
