-- Create a function to update guild basic info (bypasses RLS)
CREATE OR REPLACE FUNCTION update_guild_info(
  p_guild_id UUID,
  p_name TEXT,
  p_realm TEXT,
  p_faction TEXT,
  p_discord_server_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function owner, not the caller
AS $$
BEGIN
  -- Verify the caller is an officer of the guild
  IF NOT EXISTS (
    SELECT 1 FROM guild_members
    WHERE guild_id = p_guild_id
    AND user_id = auth.uid()
    AND role = 'Officer'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Not authorized to update this guild';
  END IF;

  -- Update the guild basic info
  UPDATE guilds
  SET
    name = p_name,
    realm = p_realm,
    faction = p_faction,
    discord_server_id = p_discord_server_id
  WHERE id = p_guild_id;
END;
$$;
