-- Fix RLS policy for loot_submissions to allow officers to approve/reject submissions

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Officers can update submissions in their guild" ON loot_submissions;
DROP POLICY IF EXISTS "Users can view submissions in their guild" ON loot_submissions;
DROP POLICY IF EXISTS "Users can insert their own submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Users can update their own pending submissions" ON loot_submissions;

-- Enable RLS on loot_submissions
ALTER TABLE loot_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view submissions in their guild
CREATE POLICY "Users can view submissions in their guild" ON loot_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guild_members
      WHERE guild_members.user_id = auth.uid()
      AND guild_members.guild_id = loot_submissions.guild_id
    )
  );

-- Policy: Users can insert their own submissions
CREATE POLICY "Users can insert their own submissions" ON loot_submissions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM guild_members
      WHERE guild_members.user_id = auth.uid()
      AND guild_members.guild_id = loot_submissions.guild_id
    )
  );

-- Policy: Users can update their own pending submissions
CREATE POLICY "Users can update their own pending submissions" ON loot_submissions
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- Policy: Officers can update (approve/reject) any submissions in their guild
CREATE POLICY "Officers can update submissions in their guild" ON loot_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM guild_members
      WHERE guild_members.user_id = auth.uid()
      AND guild_members.guild_id = loot_submissions.guild_id
      AND guild_members.role IN ('Officer', 'Guild Master')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guild_members
      WHERE guild_members.user_id = auth.uid()
      AND guild_members.guild_id = loot_submissions.guild_id
      AND guild_members.role IN ('Officer', 'Guild Master')
    )
  );
