# Production Migration Guide

## Overview
These migrations set up the new character system and attendance tracking features for LootList+.

## Prerequisites
- Access to Supabase project SQL Editor
- Production database backup (recommended)
- ~5 minutes of downtime (or run during low-traffic period)

## Migration Files (Run in Order)

### 1. PRODUCTION_MIGRATION_character_system.sql
**What it does:**
- Creates `characters`, `character_guild_memberships`, and `user_active_characters` tables
- Migrates all existing `guild_members` data to the new character system
- Links existing loot submissions to characters
- Sets up RLS policies for security

**Expected results:**
- All existing guild members will have characters created
- All guild memberships will be preserved
- All loot submissions will be linked to characters
- Users will see admin settings after migration

**Time:** ~2-3 minutes

### 2. PRODUCTION_MIGRATION_attendance_updates.sql
**What it does:**
- Adds late arrival and benched player tracking to attendance
- Adds skip day functionality for raid events
- Enables unlinked attendee tracking (for players without accounts)

**Expected results:**
- Raid tracking page will support new attendance states
- Import functionality will work for unlinked players
- Skip day button will function correctly

**Time:** ~30 seconds

## How to Run Migrations

### Option 1: Supabase SQL Editor (Recommended)

1. **Login to Supabase**
   - Go to https://supabase.com/dashboard
   - Select your LootList+ project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run Migration 1**
   - Copy contents of `PRODUCTION_MIGRATION_character_system.sql`
   - Paste into SQL Editor
   - Click "Run" (bottom right)
   - Wait for success message
   - Check output for migration statistics

4. **Run Migration 2**
   - Copy contents of `PRODUCTION_MIGRATION_attendance_updates.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Check output for success message

### Option 2: psql Command Line

```bash
# Connect to your production database
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Run migrations
\i migrations/PRODUCTION_MIGRATION_character_system.sql
\i migrations/PRODUCTION_MIGRATION_attendance_updates.sql
```

## Verification Steps

After running migrations, verify everything worked:

### 1. Check Characters Created
```sql
SELECT COUNT(*) FROM characters;
-- Should match number of active guild members
```

### 2. Check Memberships
```sql
SELECT COUNT(*) FROM character_guild_memberships WHERE joined_via = 'migration';
-- Should show migrated memberships
```

### 3. Check Active Characters
```sql
SELECT COUNT(*) FROM user_active_characters;
-- Should match number of users with guild memberships
```

### 4. Check Loot Submissions Linked
```sql
SELECT
  COUNT(*) FILTER (WHERE character_id IS NOT NULL) as linked,
  COUNT(*) FILTER (WHERE character_id IS NULL) as unlinked,
  COUNT(*) as total
FROM loot_submissions;
-- Most submissions should be linked
```

### 5. Test in UI
- Login to https://lootlistplus.com
- You should now see "ADMIN SETTINGS" section in sidebar (if you're an officer)
- Click "Loot Settings" - page should load
- Click "Raid Tracking" - page should load
- Try importing attendance with comma-separated names

## Expected Output

### Migration 1 Output:
```
========================================
Migration Complete!
========================================
Characters created: X
Guild memberships migrated: Y
Active characters set: Z
Loot submissions linked: W
========================================
```

### Migration 2 Output:
```
========================================
Attendance System Updated!
========================================
Total attendance records: X
Total raid events: Y
New features available:
  - Late arrivals tracking
  - Benched players tracking
  - Skipped raid days
  - Unlinked attendee support
========================================
```

## Rollback Plan

If something goes wrong:

1. **Full Rollback** (if major issues):
   ```sql
   BEGIN;
   DROP TABLE IF EXISTS character_guild_memberships CASCADE;
   DROP TABLE IF EXISTS characters CASCADE;
   DROP TABLE IF EXISTS user_active_characters CASCADE;
   ALTER TABLE loot_submissions DROP COLUMN IF EXISTS character_id;
   ALTER TABLE attendance_records DROP COLUMN IF EXISTS was_late;
   ALTER TABLE attendance_records DROP COLUMN IF EXISTS was_benched;
   ALTER TABLE attendance_records DROP COLUMN IF EXISTS character_name;
   ALTER TABLE raid_events DROP COLUMN IF EXISTS is_skipped;
   ALTER TABLE raid_events DROP COLUMN IF EXISTS skip_reason;
   COMMIT;
   ```

2. **Restore from Backup** (if rollback fails):
   - Use Supabase backup/restore feature
   - Or restore from your pre-migration database dump

## Troubleshooting

### Issue: "relation does not exist"
**Solution:** Tables might not exist yet. Run migration 1 first.

### Issue: "unique constraint violation"
**Solution:** Migration might have been run before. Check if tables exist:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('characters', 'character_guild_memberships', 'user_active_characters');
```

### Issue: No admin settings showing in UI after migration
**Check:**
1. Your user is in `guild_members` with role 'Officer' or 'Guild Master'
2. A character was created for you: `SELECT * FROM characters WHERE user_id = '[YOUR_USER_ID]';`
3. Character has guild membership: `SELECT * FROM character_guild_memberships WHERE character_id = '[YOUR_CHARACTER_ID]';`
4. Clear browser cache and hard reload (Cmd/Ctrl + Shift + R)

### Issue: Loot submissions not showing
**Check:**
```sql
-- Verify submissions are linked
SELECT character_id, COUNT(*) FROM loot_submissions GROUP BY character_id;

-- If unlinked, manually link:
UPDATE loot_submissions ls
SET character_id = c.id
FROM guild_members gm
INNER JOIN characters c ON c.user_id = gm.user_id AND c.name = gm.character_name
WHERE ls.user_id = gm.user_id AND ls.guild_id = gm.guild_id AND ls.character_id IS NULL;
```

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the migration output for errors
3. Check Supabase logs for error messages
4. Verify RLS policies are active: `SELECT * FROM pg_policies WHERE tablename IN ('characters', 'character_guild_memberships');`

## Post-Migration Cleanup (Optional)

After verifying everything works for a few days, you can:

1. **Archive old tables** (don't delete yet):
```sql
-- Rename instead of drop (keep as backup)
ALTER TABLE guild_members RENAME TO guild_members_legacy;
```

2. **Monitor for issues**:
   - Check error logs
   - Monitor user feedback
   - Verify loot lists are working correctly

3. **After 1-2 weeks**, if no issues:
```sql
-- Remove legacy table (only if confident)
DROP TABLE guild_members_legacy;
```
