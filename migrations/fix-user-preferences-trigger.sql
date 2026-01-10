-- Fix the create_user_preferences function to use correct field
-- when triggered from guild_members table

CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- When triggered from guild_members, use NEW.user_id
  -- When triggered from auth.users, use NEW.id
  INSERT INTO user_preferences (user_id)
  VALUES (COALESCE(NEW.user_id, NEW.id))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
