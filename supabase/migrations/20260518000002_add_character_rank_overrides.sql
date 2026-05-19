-- Per-character rank bonus overrides.
-- Lets officers assign a custom numeric bonus to a single character (typically an alt),
-- which replaces the member-level role bonus for that character during score computation.
-- Shape: { [character_id::uuid::text]: number }. Absence of a key = use role bonus.

ALTER TABLE guild_settings
  ADD COLUMN IF NOT EXISTS character_rank_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;
