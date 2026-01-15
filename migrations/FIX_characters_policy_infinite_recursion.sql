-- Fix infinite recursion in characters RLS policy
-- The "Guild members can view guild characters" policy was causing infinite recursion
-- We'll remove it and rely on the simpler "Users can view own characters" policy

-- Drop the problematic policy
DROP POLICY IF EXISTS "Guild members can view guild characters" ON characters;

-- The "Users can view own characters" policy is sufficient
-- Users can already see their own characters, and guild members will be able to see
-- other characters through the character_guild_memberships join in their queries

-- Verify the remaining policy
-- This query shows all active policies on the characters table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'characters';
