-- Create attendance tracking system with character-based support
-- This migration creates the full attendance system
-- Prerequisites: characters table must exist (run create_characters_system_v3.sql first)

-- Check if characters table exists, if not, exit gracefully
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'characters') THEN
    RAISE EXCEPTION 'Characters table does not exist. Please run create_characters_system_v3.sql first.';
  END IF;
END $$;

-- Create raid_events table to track raids
CREATE TABLE IF NOT EXISTS raid_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  raid_tier_id UUID REFERENCES raid_tiers(id) ON DELETE SET NULL,
  raid_date DATE NOT NULL,
  raid_name TEXT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(guild_id, raid_date, raid_name)
);

CREATE INDEX IF NOT EXISTS idx_raid_events_guild_id ON raid_events(guild_id);
CREATE INDEX IF NOT EXISTS idx_raid_events_raid_date ON raid_events(raid_date);

-- Create attendance_records table with character support
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raid_event_id UUID NOT NULL REFERENCES raid_events(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id), -- For backward compatibility
  signed_up BOOLEAN DEFAULT false,
  attended BOOLEAN DEFAULT false,
  no_call_no_show BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT attendance_unique_character UNIQUE(raid_event_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_raid_event_id ON attendance_records(raid_event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_character_id ON attendance_records(character_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id ON attendance_records(user_id);

-- Enable RLS
ALTER TABLE raid_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for raid_events
-- Users can view raid events for their guilds
CREATE POLICY "Users can view guild raid events" ON raid_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE c.user_id = auth.uid()
      AND cgm.guild_id = raid_events.guild_id
    )
  );

-- Officers can manage raid events
CREATE POLICY "Officers can manage raid events" ON raid_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE c.user_id = auth.uid()
      AND cgm.guild_id = raid_events.guild_id
      AND cgm.role IN ('Officer', 'Guild Master')
    )
  );

-- RLS Policies for attendance_records
-- Users can view attendance for their characters
CREATE POLICY "Users can view own character attendance" ON attendance_records
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
      INNER JOIN raid_events re ON re.id = attendance_records.raid_event_id
      WHERE c.user_id = auth.uid()
      AND cgm.guild_id = re.guild_id
    )
  );

-- Officers can view and manage all attendance in their guilds
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

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_raid_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_raid_events_updated_at
  BEFORE UPDATE ON raid_events
  FOR EACH ROW
  EXECUTE FUNCTION update_raid_events_updated_at();

CREATE OR REPLACE FUNCTION update_attendance_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_records_updated_at();
