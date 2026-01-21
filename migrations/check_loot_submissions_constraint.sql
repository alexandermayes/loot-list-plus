-- Check the status constraint on loot_submissions
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'loot_submissions'::regclass
  AND conname LIKE '%status%';

-- Also check the table definition
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'loot_submissions'
  AND column_name = 'status';
