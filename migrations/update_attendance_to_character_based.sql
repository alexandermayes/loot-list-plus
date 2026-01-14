-- Migration: Update attendance tracking to be character-based
-- This migration adds character_id to attendance_records and updates related policies

-- Add character_id column to attendance_records
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_attendance_records_character_id
ON attendance_records(character_id);

-- Add unique constraint for character-based attendance (one record per character per raid)
-- Note: This allows the old user_id based records to coexist until migration is complete
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_records_raid_character
ON attendance_records(raid_event_id, character_id)
WHERE character_id IS NOT NULL;

-- Update RLS policies for attendance_records to support character-based access
DROP POLICY IF EXISTS "Users can view attendance for their guilds" ON attendance_records;
DROP POLICY IF EXISTS "Officers can manage attendance" ON attendance_records;
DROP POLICY IF EXISTS "Users can view own attendance" ON attendance_records;

-- Policy: Users can view attendance for their characters in guilds they're in
CREATE POLICY "Users can view attendance for their characters" ON attendance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = attendance_records.character_id
      AND characters.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      INNER JOIN raid_events re ON re.guild_id = cgm.guild_id
      WHERE c.user_id = auth.uid()
      AND re.id = attendance_records.raid_event_id
    )
    OR
    -- Backward compatibility: allow viewing by user_id if character_id is null
    (attendance_records.character_id IS NULL AND attendance_records.user_id = auth.uid())
  );

-- Policy: Officers can view and manage all attendance in their guilds
CREATE POLICY "Officers can manage guild attendance" ON attendance_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM raid_events re
      INNER JOIN character_guild_memberships cgm ON cgm.guild_id = re.guild_id
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE re.id = attendance_records.raid_event_id
      AND c.user_id = auth.uid()
      AND cgm.role IN ('Officer', 'Guild Master')
    )
  );

-- Policy: Users can insert attendance for their own characters
CREATE POLICY "Users can insert attendance for their characters" ON attendance_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = attendance_records.character_id
      AND characters.user_id = auth.uid()
    )
    OR
    -- Backward compatibility: allow insert by user_id if character_id is null
    (attendance_records.character_id IS NULL AND attendance_records.user_id = auth.uid())
  );

-- Policy: Users can update attendance for their own characters
CREATE POLICY "Users can update attendance for their characters" ON attendance_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = attendance_records.character_id
      AND characters.user_id = auth.uid()
    )
    OR
    -- Backward compatibility: allow update by user_id if character_id is null
    (attendance_records.character_id IS NULL AND attendance_records.user_id = auth.uid())
  );

-- Note: This migration maintains backward compatibility by keeping user_id
-- and allowing null character_id. Future migrations can enforce character_id NOT NULL
-- after all existing data has been migrated.
