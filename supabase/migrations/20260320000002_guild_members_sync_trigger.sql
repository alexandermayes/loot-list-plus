-- Auto-sync guild_members (legacy) from character_guild_memberships (new).
-- Replaces ~15 manual dual-write code paths in API routes.
-- The trigger fires AFTER INSERT/UPDATE/DELETE on character_guild_memberships
-- and keeps guild_members in sync automatically.
--
-- guild_members unique constraint: (guild_id, user_id)
-- character_guild_memberships unique constraint: (character_id, guild_id)

-- Step 0: Relax the joined_via CHECK constraint on guild_members.
-- The legacy constraint only allowed 'manual', 'invite_code', 'discord_verify',
-- but character_guild_memberships uses additional values like 'battlenet_import', 'migration'.
ALTER TABLE guild_members DROP CONSTRAINT IF EXISTS check_joined_via;
ALTER TABLE guild_members ADD CONSTRAINT check_joined_via
  CHECK (joined_via IN ('manual', 'invite_code', 'discord_verify', 'battlenet_import', 'migration'));

-- Step 1: Create the sync function
CREATE OR REPLACE FUNCTION sync_guild_members_from_cgm()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_character_name VARCHAR(255);
  v_class_id UUID;
  v_highest_role VARCHAR;
  v_highest_position INT;
  v_is_any_active BOOLEAN;
  v_earliest_joined_at TIMESTAMPTZ;
  v_joined_via VARCHAR(50);
BEGIN
  -- For DELETE, use OLD; for INSERT/UPDATE, use NEW
  IF TG_OP = 'DELETE' THEN
    -- Look up user_id from the character being removed
    SELECT user_id INTO v_user_id FROM characters WHERE id = OLD.character_id;

    -- Check if user has any other active memberships in this guild
    SELECT EXISTS(
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = OLD.guild_id
        AND c.user_id = v_user_id
        AND cgm.is_active = true
        AND cgm.id != OLD.id
    ) INTO v_is_any_active;

    IF NOT v_is_any_active THEN
      -- No more active memberships — deactivate the legacy record
      UPDATE guild_members
      SET is_active = false
      WHERE guild_id = OLD.guild_id AND user_id = v_user_id;
    ELSE
      -- User still has other characters in this guild — refresh with highest role
      PERFORM refresh_guild_member_from_cgm(v_user_id, OLD.guild_id);
    END IF;

    RETURN OLD;
  END IF;

  -- INSERT or UPDATE: sync the new/updated membership
  SELECT user_id INTO v_user_id FROM characters WHERE id = NEW.character_id;

  IF v_user_id IS NULL THEN
    RAISE WARNING 'sync_guild_members_from_cgm: character % not found', NEW.character_id;
    RETURN NEW;
  END IF;

  PERFORM refresh_guild_member_from_cgm(v_user_id, NEW.guild_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Helper function to refresh a user's guild_members row from their character memberships
CREATE OR REPLACE FUNCTION refresh_guild_member_from_cgm(
  p_user_id UUID,
  p_guild_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_character_name VARCHAR(255);
  v_class_id UUID;
  v_highest_role VARCHAR;
  v_highest_position INT DEFAULT 0;
  v_is_any_active BOOLEAN DEFAULT false;
  v_earliest_joined_at TIMESTAMPTZ;
  v_joined_via VARCHAR(50);
  rec RECORD;
BEGIN
  -- Find the highest-role active membership for this user in this guild
  FOR rec IN
    SELECT
      cgm.role,
      cgm.is_active,
      cgm.joined_at,
      cgm.joined_via,
      c.name AS character_name,
      c.class_id,
      COALESCE(gr.position, 0) AS role_position
    FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    LEFT JOIN guild_roles gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
    WHERE cgm.guild_id = p_guild_id
      AND c.user_id = p_user_id
      AND cgm.is_active = true
    ORDER BY COALESCE(gr.position, 0) DESC, cgm.joined_at ASC
    LIMIT 1
  LOOP
    v_highest_role := rec.role;
    v_highest_position := rec.role_position;
    v_character_name := rec.character_name;
    v_class_id := rec.class_id;
    v_is_any_active := true;
    v_earliest_joined_at := rec.joined_at;
    v_joined_via := rec.joined_via;
  END LOOP;

  IF NOT v_is_any_active THEN
    -- No active memberships — deactivate
    UPDATE guild_members
    SET is_active = false
    WHERE guild_id = p_guild_id AND user_id = p_user_id;
    RETURN;
  END IF;

  -- Upsert the guild_members row
  INSERT INTO guild_members (user_id, guild_id, character_name, class_id, role, is_active, joined_at, joined_via)
  VALUES (p_user_id, p_guild_id, v_character_name, v_class_id, v_highest_role, true, v_earliest_joined_at, v_joined_via)
  ON CONFLICT (guild_id, user_id) DO UPDATE SET
    character_name = EXCLUDED.character_name,
    class_id = EXCLUDED.class_id,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    joined_at = EXCLUDED.joined_at,
    joined_via = EXCLUDED.joined_via;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create the trigger
DROP TRIGGER IF EXISTS trg_sync_guild_members ON character_guild_memberships;
CREATE TRIGGER trg_sync_guild_members
  AFTER INSERT OR UPDATE OR DELETE ON character_guild_memberships
  FOR EACH ROW
  EXECUTE FUNCTION sync_guild_members_from_cgm();

-- Step 4: Backfill — ensure guild_members matches current character_guild_memberships state
-- This catches any drift from past bugs
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT c.user_id, cgm.guild_id
    FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.is_active = true
  LOOP
    PERFORM refresh_guild_member_from_cgm(rec.user_id, rec.guild_id);
  END LOOP;

  RAISE NOTICE 'guild_members sync trigger installed and backfilled';
END $$;
