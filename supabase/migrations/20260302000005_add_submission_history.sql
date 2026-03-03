-- Add resubmission tracking to loot submissions
-- Tracks how many times a raider has resubmitted and snapshots previous items

-- 1. Add resubmission_count column
ALTER TABLE loot_submissions ADD COLUMN resubmission_count INTEGER NOT NULL DEFAULT 0;

-- 2. Create snapshots table
CREATE TABLE loot_submission_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES loot_submissions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  items JSONB NOT NULL,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submission_snapshots_submission_id ON loot_submission_snapshots(submission_id);

-- 3. RLS: officers and submission owners can view snapshots
ALTER TABLE loot_submission_snapshots ENABLE ROW LEVEL SECURITY;

-- SELECT: Guild members can view snapshots for submissions in their guild
CREATE POLICY "loot_submission_snapshots_select" ON loot_submission_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      JOIN character_guild_memberships cgm ON cgm.guild_id = ls.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE ls.id = loot_submission_snapshots.submission_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
  );

-- INSERT: Users can create snapshots for their own submissions
CREATE POLICY "loot_submission_snapshots_insert" ON loot_submission_snapshots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = submission_id
      AND c.user_id = auth.uid()
    )
  );
