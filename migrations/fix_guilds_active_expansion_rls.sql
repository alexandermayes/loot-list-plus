-- Fix RLS policy on guilds table to allow officers to update active_expansion_id

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Officers can update guild settings" ON guilds;
DROP POLICY IF EXISTS "Guild officers can update guild" ON guilds;
DROP POLICY IF EXISTS "Officers can update their guild" ON guilds;

-- Create new policy that allows officers to update guild settings including active_expansion_id
CREATE POLICY "Officers can update guild settings" ON guilds
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      INNER JOIN guild_roles gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
      WHERE cgm.guild_id = guilds.id
        AND c.user_id = auth.uid()
        AND cgm.is_active = true
        AND gr.position >= 50
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      INNER JOIN guild_roles gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
      WHERE cgm.guild_id = guilds.id
        AND c.user_id = auth.uid()
        AND cgm.is_active = true
        AND gr.position >= 50
    )
  );

-- Verify the policy was created
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'guilds' AND cmd = 'UPDATE';
