-- Fix infinite recursion in guild_members RLS policies

-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Users can view members of their guilds" ON guild_members;

-- Keep only the simple policy: users can view their own memberships
-- This is sufficient for the Guild Context to work
-- (The first policy "Users can view their own memberships" already exists and is fine)

-- For viewing OTHER members in the guild, we'll handle that differently
-- in specific pages that need it, or use a different approach
