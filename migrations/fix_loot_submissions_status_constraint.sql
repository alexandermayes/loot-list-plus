-- Fix loot_submissions status constraint to include 'draft'

-- Drop the old constraint
ALTER TABLE loot_submissions
DROP CONSTRAINT IF EXISTS loot_submissions_status_check;

-- Add new constraint that includes 'draft'
ALTER TABLE loot_submissions
ADD CONSTRAINT loot_submissions_status_check
CHECK (status IN ('draft', 'pending', 'approved', 'rejected'));

-- Verify the constraint
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'loot_submissions'::regclass
  AND conname LIKE '%status%';
