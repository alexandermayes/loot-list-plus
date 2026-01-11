-- Create a function to update guild icon (bypasses RLS)
CREATE OR REPLACE FUNCTION update_guild_icon(
  p_guild_id UUID,
  p_icon_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function owner, not the caller
AS $$
BEGIN
  -- Verify the caller is a member of the guild
  IF NOT EXISTS (
    SELECT 1 FROM guild_members
    WHERE guild_id = p_guild_id
    AND user_id = auth.uid()
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Not authorized to update this guild';
  END IF;

  -- Update the guild icon
  UPDATE guilds
  SET icon_url = p_icon_url
  WHERE id = p_guild_id;
END;
$$;
