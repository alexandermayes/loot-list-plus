-- Simple fix: Add character_id column to loot_submissions
-- This should resolve the immediate error

-- Add character_id column if it doesn't exist
DO $$
BEGIN
  -- Check if the column exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'loot_submissions'
    AND column_name = 'character_id'
  ) THEN
    -- Add the column
    ALTER TABLE loot_submissions
    ADD COLUMN character_id UUID REFERENCES characters(id) ON DELETE CASCADE;

    -- Add index for performance
    CREATE INDEX idx_loot_submissions_character_id ON loot_submissions(character_id);

    RAISE NOTICE 'Added character_id column to loot_submissions';
  ELSE
    RAISE NOTICE 'character_id column already exists in loot_submissions';
  END IF;
END $$;
