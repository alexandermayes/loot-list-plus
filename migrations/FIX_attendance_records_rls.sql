-- Fix attendance_records RLS to allow users to query (even if no data exists)

-- Drop and recreate the policy to be simpler
DROP POLICY IF EXISTS "Users can view own character attendance" ON attendance_records;
DROP POLICY IF EXISTS "Officers can manage guild attendance" ON attendance_records;

-- Simple policy: users can view attendance for their own characters
CREATE POLICY "Users can view own character attendance" ON attendance_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = attendance_records.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- Officers can view all attendance in their guilds
CREATE POLICY "Officers can view guild attendance" ON attendance_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM raid_events re
      INNER JOIN guild_members gm ON gm.guild_id = re.guild_id
      WHERE re.id = attendance_records.raid_event_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('Officer', 'Guild Master')
    )
  );

-- Officers can insert/update/delete attendance
CREATE POLICY "Officers can manage attendance" ON attendance_records
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM raid_events re
      INNER JOIN guild_members gm ON gm.guild_id = re.guild_id
      WHERE re.id = attendance_records.raid_event_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('Officer', 'Guild Master')
    )
  );
