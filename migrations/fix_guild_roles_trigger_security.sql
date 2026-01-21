-- Fix guild roles trigger to bypass RLS
-- The trigger runs AFTER INSERT on guilds, but at that point the user
-- isn't a guild member yet, so RLS blocks the guild_roles insert.
-- Using SECURITY DEFINER makes the function run as the owner (bypasses RLS).

-- Drop and recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_default_guild_roles()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO guild_roles (guild_id, name, color_hex, position, is_default)
  VALUES
    (NEW.id, 'Guild Master', '#ff8000', 100, true),
    (NEW.id, 'Officer', '#fbbf24', 50, true),
    (NEW.id, 'Member', '#a1a1a1', 0, true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify the trigger still exists
-- (no need to recreate since we're just changing the function)
