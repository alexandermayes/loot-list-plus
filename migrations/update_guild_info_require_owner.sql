-- Update guild info function to require guild owner (creator) permissions
-- This prevents non-owners from modifying guild name, realm, faction, or Discord settings
-- Migration: update_guild_info_require_owner.sql

-- Update the update_guild_info function to only allow the guild creator
CREATE OR REPLACE FUNCTION update_guild_info(
  p_guild_id UUID,
  p_name TEXT,
  p_realm TEXT,
  p_faction TEXT,
  p_discord_server_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guild_creator UUID;
BEGIN
  -- Get the guild creator
  SELECT created_by INTO v_guild_creator
  FROM guilds
  WHERE id = p_guild_id;

  IF v_guild_creator IS NULL THEN
    RAISE EXCEPTION 'Guild not found';
  END IF;

  -- Only the guild creator can update guild info
  IF auth.uid() != v_guild_creator THEN
    RAISE EXCEPTION 'Only the guild owner can modify guild information';
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

-- Update the update_guild_icon function to only allow the guild creator
CREATE OR REPLACE FUNCTION update_guild_icon(
  p_guild_id UUID,
  p_icon_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guild_creator UUID;
BEGIN
  -- Get the guild creator
  SELECT created_by INTO v_guild_creator
  FROM guilds
  WHERE id = p_guild_id;

  IF v_guild_creator IS NULL THEN
    RAISE EXCEPTION 'Guild not found';
  END IF;

  -- Only the guild creator can update guild icon
  IF auth.uid() != v_guild_creator THEN
    RAISE EXCEPTION 'Only the guild owner can modify guild settings';
  END IF;

  -- Update the guild icon
  UPDATE guilds
  SET icon_url = p_icon_url
  WHERE id = p_guild_id;
END;
$$;

-- Add comment explaining the security model
COMMENT ON FUNCTION update_guild_info IS 'Updates guild basic info (name, realm, faction, discord). Only the guild creator can call this function.';
COMMENT ON FUNCTION update_guild_icon IS 'Updates guild icon URL. Only the guild creator can call this function.';
