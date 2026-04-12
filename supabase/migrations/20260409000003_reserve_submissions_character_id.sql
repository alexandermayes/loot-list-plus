-- Link reserve submissions to a real LootList+ character when the
-- submitter is logged in and picks one of their characters. Anonymous
-- submissions (and legacy rows) stay as free-text name/class/spec.
--
-- Nullable FK, ON DELETE SET NULL so deleting a character doesn't
-- destroy the reserve audit trail.

ALTER TABLE reserve_submissions
  ADD COLUMN IF NOT EXISTS character_id UUID
  REFERENCES characters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reserve_submissions_character_id
  ON reserve_submissions(character_id)
  WHERE character_id IS NOT NULL;
