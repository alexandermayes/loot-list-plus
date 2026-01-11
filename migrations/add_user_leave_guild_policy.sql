-- Add policy to allow users to leave guilds (delete their own membership)
CREATE POLICY "Users can leave guilds"
ON guild_members
FOR DELETE
USING (auth.uid() = user_id);
