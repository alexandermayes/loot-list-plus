-- =====================================================
-- Fix attendance_records RLS policies
-- =====================================================
-- The existing policies use guild_members/guild_roles tables
-- but the app uses character_guild_memberships for role checking
-- =====================================================

-- Drop existing policies that use the wrong tables
DROP POLICY IF EXISTS "Officers can delete attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Officers can manage attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Officers can update attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_select" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_insert" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_update" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_delete" ON public.attendance_records;

-- Enable RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

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
  );

-- INSERT: Officers can create attendance records for raids in their guild
CREATE POLICY "attendance_records_insert" ON attendance_records
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN character_guild_memberships cgm ON cgm.guild_id = re.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE re.id = raid_event_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('officer', 'guild_master')
    )
  );

-- UPDATE: Officers can update attendance records for raids in their guild
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
  );

-- DELETE: Officers can delete attendance records for raids in their guild
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
  );

-- =====================================================
-- Also fix raid_events RLS policies (same issue)
-- =====================================================

-- Drop existing policies that use the wrong tables
DROP POLICY IF EXISTS "Officers can create raid events" ON public.raid_events;
DROP POLICY IF EXISTS "Officers can update raid events" ON public.raid_events;
DROP POLICY IF EXISTS "Officers can delete raid events" ON public.raid_events;
DROP POLICY IF EXISTS "raid_events_select" ON public.raid_events;
DROP POLICY IF EXISTS "raid_events_insert" ON public.raid_events;
DROP POLICY IF EXISTS "raid_events_update" ON public.raid_events;
DROP POLICY IF EXISTS "raid_events_delete" ON public.raid_events;

-- Enable RLS
ALTER TABLE raid_events ENABLE ROW LEVEL SECURITY;

-- SELECT: Guild members can view raids in their guild
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
  );

-- INSERT: Officers can create raids in their guild
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
  );

-- UPDATE: Officers can update raids in their guild
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
  );

-- DELETE: Officers can delete raids in their guild
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
  );

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'attendance_records & raid_events RLS fixed!';
  RAISE NOTICE 'Now uses character_guild_memberships';
  RAISE NOTICE 'Officers can manage attendance records';
  RAISE NOTICE '========================================';
END $$;
