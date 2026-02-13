-- =============================================================================
-- Tighten audit_logs INSERT policy
-- =============================================================================
-- The previous INSERT policy used WITH CHECK (true), allowing any authenticated
-- user to insert audit logs for any guild. This tightens it so that:
--
-- 1. Users can only insert audit logs with their own user_id (prevents spoofing)
-- 2. Guild-specific logs require active membership in that guild
-- 3. Non-guild logs (guild_id IS NULL) are allowed for the authenticated user
--
-- Note: The SELECT policy is not modified here (already fixed in previous migration).
-- =============================================================================

-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;

-- Create a tightened INSERT policy
CREATE POLICY "Authenticated users can insert own audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (
    -- Must always be the authenticated user (prevent spoofing the actor)
    user_id = auth.uid()
    AND (
      -- Guild-specific logs: user must be an active member of the guild
      (
        guild_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM character_guild_memberships cgm
          JOIN characters c ON c.id = cgm.character_id
          WHERE cgm.guild_id = audit_logs.guild_id
            AND c.user_id = auth.uid()
            AND cgm.is_active = true
        )
      )
      OR
      -- Guild-specific logs: guild creator can always log
      (
        guild_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM guilds
          WHERE guilds.id = audit_logs.guild_id
            AND guilds.created_by = auth.uid()
        )
      )
      OR
      -- Non-guild-specific logs: any authenticated user for their own actions
      (guild_id IS NULL)
    )
  );
