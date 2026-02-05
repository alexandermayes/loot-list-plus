-- =====================================================
-- Fix attendance_records RLS to include guild creators
-- =====================================================
-- The previous policies only checked for role IN ('officer', 'guild_master')
-- but guild creators should also have officer access even if they don't
-- have that specific role in character_guild_memberships
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "attendance_records_select" ON attendance_records;
DROP POLICY IF EXISTS "attendance_records_insert" ON attendance_records;
DROP POLICY IF EXISTS "attendance_records_update" ON attendance_records;
DROP POLICY IF EXISTS "attendance_records_delete" ON attendance_records;

-- SELECT: Guild members can view attendance for raids in their guild
CREATE POLICY "attendance_records_select" ON attendance_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN character_guild_memberships cgm ON cgm.guild_id = re.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE re.id = attendance_records.raid_event_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
    OR
    -- Guild creator can view
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN guilds g ON g.id = re.guild_id
      WHERE re.id = attendance_records.raid_event_id
      AND g.created_by = auth.uid()
    )
  );

-- INSERT: Officers OR guild creators can create attendance records
CREATE POLICY "attendance_records_insert" ON attendance_records
  FOR INSERT
  WITH CHECK (
    -- Officer/GM role check
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN character_guild_memberships cgm ON cgm.guild_id = re.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE re.id = raid_event_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('officer', 'guild_master')
    )
    OR
    -- Guild creator check
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN guilds g ON g.id = re.guild_id
      WHERE re.id = raid_event_id
      AND g.created_by = auth.uid()
    )
  );

-- UPDATE: Officers OR guild creators can update attendance records
CREATE POLICY "attendance_records_update" ON attendance_records
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN character_guild_memberships cgm ON cgm.guild_id = re.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE re.id = attendance_records.raid_event_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('officer', 'guild_master')
    )
    OR
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN guilds g ON g.id = re.guild_id
      WHERE re.id = attendance_records.raid_event_id
      AND g.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN character_guild_memberships cgm ON cgm.guild_id = re.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE re.id = attendance_records.raid_event_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('officer', 'guild_master')
    )
    OR
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN guilds g ON g.id = re.guild_id
      WHERE re.id = attendance_records.raid_event_id
      AND g.created_by = auth.uid()
    )
  );

-- DELETE: Officers OR guild creators can delete attendance records
CREATE POLICY "attendance_records_delete" ON attendance_records
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN character_guild_memberships cgm ON cgm.guild_id = re.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE re.id = attendance_records.raid_event_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('officer', 'guild_master')
    )
    OR
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN guilds g ON g.id = re.guild_id
      WHERE re.id = attendance_records.raid_event_id
      AND g.created_by = auth.uid()
    )
  );

-- =====================================================
-- Also fix raid_events RLS to include guild creators
-- =====================================================

DROP POLICY IF EXISTS "raid_events_select" ON raid_events;
DROP POLICY IF EXISTS "raid_events_insert" ON raid_events;
DROP POLICY IF EXISTS "raid_events_update" ON raid_events;
DROP POLICY IF EXISTS "raid_events_delete" ON raid_events;

-- SELECT: Guild members OR guild creators can view raids
CREATE POLICY "raid_events_select" ON raid_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = raid_events.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = raid_events.guild_id
      AND g.created_by = auth.uid()
    )
  );

-- INSERT: Officers OR guild creators can create raids
CREATE POLICY "raid_events_insert" ON raid_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('officer', 'guild_master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = guild_id
      AND g.created_by = auth.uid()
    )
  );

-- UPDATE: Officers OR guild creators can update raids
CREATE POLICY "raid_events_update" ON raid_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = raid_events.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('officer', 'guild_master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = raid_events.guild_id
      AND g.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = raid_events.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('officer', 'guild_master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = raid_events.guild_id
      AND g.created_by = auth.uid()
    )
  );

-- DELETE: Officers OR guild creators can delete raids
CREATE POLICY "raid_events_delete" ON raid_events
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = raid_events.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('officer', 'guild_master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = raid_events.guild_id
      AND g.created_by = auth.uid()
    )
  );

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS policies now include guild creators!';
  RAISE NOTICE 'Officers AND guild creators can manage';
  RAISE NOTICE 'attendance records and raid events';
  RAISE NOTICE '========================================';
END $$;
