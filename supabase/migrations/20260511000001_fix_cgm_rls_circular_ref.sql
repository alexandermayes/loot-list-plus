-- Fix character_guild_memberships SELECT policy: circular RLS reference
-- =====================================================================
-- The "Guild members can view guild memberships" policy had a self-referential
-- subquery on character_guild_memberships, which caused PostgreSQL to apply
-- RLS recursively and return empty results. This meant officers couldn't see
-- other members' membership_status (trial/full), breaking trial penalty scoring
-- on the master sheet.
--
-- Fix: use the existing SECURITY DEFINER function get_user_guild_ids() which
-- bypasses RLS to resolve the user's guild IDs without circular references.

-- Drop the broken self-referential policy
DROP POLICY IF EXISTS "Guild members can view guild memberships" ON character_guild_memberships;

-- Recreate using the SECURITY DEFINER function to avoid circular RLS
CREATE POLICY "Guild members can view guild memberships" ON character_guild_memberships
  FOR SELECT
  USING (
    guild_id IN (SELECT get_user_guild_ids(auth.uid()))
  );
