-- Drop deprecated guild_members and user_active_guilds tables.
-- guild_members was replaced by character_guild_memberships (Mar 2026).
-- user_active_guilds was replaced by user_active_characters (Mar 2026).
-- Both tables have had zero app reads/writes since Mar 21, 2026.
-- Monitoring period (2 weeks) expired Apr 4, 2026.

-- Step 1: Drop the sync trigger and functions
DROP TRIGGER IF EXISTS trg_sync_guild_members ON character_guild_memberships;
DROP FUNCTION IF EXISTS sync_guild_members_from_cgm();
DROP FUNCTION IF EXISTS refresh_guild_member_from_cgm(UUID, UUID);

-- Step 2: Drop RLS policies on guild_members
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'guild_members' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON guild_members', pol.policyname);
  END LOOP;
END $$;

-- Step 3: Drop RLS policies on user_active_guilds
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'user_active_guilds' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_active_guilds', pol.policyname);
  END LOOP;
END $$;

-- Step 4: Drop stale RLS policies on OTHER tables that still JOIN on guild_members.
-- These were superseded by newer policies using character_guild_memberships
-- but were never cleaned up.
DROP POLICY IF EXISTS "Officers can view guild expansions" ON expansions;
DROP POLICY IF EXISTS "Members can view loot item classes" ON loot_item_classes;
DROP POLICY IF EXISTS "Members can view their guilds" ON guilds;
DROP POLICY IF EXISTS "Officers can view guild invite codes" ON guild_invite_codes;
DROP POLICY IF EXISTS "Officers can create invite codes" ON guild_invite_codes;
DROP POLICY IF EXISTS "Officers can update invite codes" ON guild_invite_codes;
DROP POLICY IF EXISTS "Officers can delete invite codes" ON guild_invite_codes;
DROP POLICY IF EXISTS "Officers can manage invite codes" ON guild_invite_codes;
DROP POLICY IF EXISTS "Officers can update submissions in their guild" ON loot_submissions;
DROP POLICY IF EXISTS "Officers can view guild submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Officers can delete guild submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Officers can manage loot item classes" ON loot_item_classes;
DROP POLICY IF EXISTS "Guild members can view item priorities" ON guild_item_priorities;
DROP POLICY IF EXISTS "Officers can create item priorities" ON guild_item_priorities;
DROP POLICY IF EXISTS "Officers can update item priorities" ON guild_item_priorities;
DROP POLICY IF EXISTS "Officers can delete item priorities" ON guild_item_priorities;

-- Step 5: Update delete_guild function to remove references to dropped tables
CREATE OR REPLACE FUNCTION delete_guild(p_guild_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete in dependency order
  DELETE FROM loot_submission_items WHERE submission_id IN (
    SELECT id FROM loot_submissions WHERE guild_id = p_guild_id
  );
  DELETE FROM loot_submissions WHERE guild_id = p_guild_id;
  DELETE FROM loot_history WHERE guild_id = p_guild_id;
  DELETE FROM attendance_records WHERE raid_event_id IN (
    SELECT id FROM raid_events WHERE guild_id = p_guild_id
  );
  DELETE FROM raid_events WHERE guild_id = p_guild_id;
  DELETE FROM character_guild_memberships WHERE guild_id = p_guild_id;
  DELETE FROM guild_invite_codes WHERE guild_id = p_guild_id;
  DELETE FROM guild_settings WHERE guild_id = p_guild_id;
  DELETE FROM guild_roles WHERE guild_id = p_guild_id;
  DELETE FROM audit_logs WHERE guild_id = p_guild_id;
  DELETE FROM blp_tracking WHERE guild_id = p_guild_id;
  DELETE FROM character_aliases WHERE guild_id = p_guild_id;
  DELETE FROM guild_item_priorities WHERE guild_id = p_guild_id;

  -- Clear active guild references
  UPDATE user_active_characters
  SET active_guild_id = NULL
  WHERE active_guild_id = p_guild_id;

  -- Delete raid teams and members
  DELETE FROM raid_team_members WHERE raid_team_id IN (
    SELECT id FROM raid_teams WHERE guild_id = p_guild_id
  );
  DELETE FROM raid_teams WHERE guild_id = p_guild_id;

  -- Delete expansions
  DELETE FROM expansions WHERE guild_id = p_guild_id;

  -- Finally delete the guild
  DELETE FROM guilds WHERE id = p_guild_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Drop the tables
DROP TABLE IF EXISTS guild_members;
DROP TABLE IF EXISTS user_active_guilds;
