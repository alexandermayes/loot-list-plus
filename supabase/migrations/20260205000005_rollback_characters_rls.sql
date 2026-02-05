-- =====================================================
-- ROLLBACK: Disable characters RLS temporarily
-- =====================================================
-- The RLS policies are breaking character loading.
-- Disabling RLS on characters table to restore access.
-- We can add proper RLS policies later with more testing.
-- =====================================================

-- Drop all the policies we created
DROP POLICY IF EXISTS "Users can view own characters" ON characters;
DROP POLICY IF EXISTS "Guild members can view guild characters" ON characters;
DROP POLICY IF EXISTS "Users can insert own characters" ON characters;
DROP POLICY IF EXISTS "Users can update own characters" ON characters;
DROP POLICY IF EXISTS "Users can delete own characters" ON characters;

-- Disable RLS on characters table
ALTER TABLE characters DISABLE ROW LEVEL SECURITY;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ROLLBACK: Characters RLS disabled';
  RAISE NOTICE 'Access restored to characters table';
  RAISE NOTICE '========================================';
END $$;
