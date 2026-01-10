-- Fix RLS policies for guilds table
-- Allow members to view guilds they belong to

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Members can view their guilds" ON guilds;

-- Create policy to allow members to view guilds they're part of
CREATE POLICY "Members can view their guilds"
  ON guilds FOR SELECT
  USING (
    id IN (
      SELECT guild_id
      FROM guild_members
      WHERE user_id = auth.uid()
    )
  );
