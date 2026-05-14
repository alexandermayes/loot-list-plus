-- Auto-reject orphan loot submissions when a CGM is deactivated
-- ===============================================================
-- Prevents the "master sheet hides a raider" bug from recurring. When a
-- character is removed from a guild (CGM goes is_active=false, or the row
-- is deleted), any pending/approved loot submissions for that character in
-- that guild are flipped to 'rejected'. After this, no character can have
-- an active loot list on the master sheet without an active CGM.
--
-- See migration 20260514000001 for the original Bpie incident.

CREATE OR REPLACE FUNCTION reject_submissions_on_cgm_loss()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count INT;
  target_character UUID;
  target_guild UUID;
BEGIN
  -- Determine the (character, guild) pair to clean up
  IF TG_OP = 'UPDATE' THEN
    -- Only fire on transition from active → not-active
    IF COALESCE(OLD.is_active, false) = true
       AND COALESCE(NEW.is_active, false) = false THEN
      target_character := NEW.character_id;
      target_guild := NEW.guild_id;
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Only matters if the row being deleted was active
    IF COALESCE(OLD.is_active, false) = true THEN
      target_character := OLD.character_id;
      target_guild := OLD.guild_id;
    ELSE
      RETURN OLD;
    END IF;
  END IF;

  UPDATE loot_submissions
  SET status = 'rejected',
      review_notes = COALESCE(review_notes, '') ||
        CASE WHEN review_notes IS NOT NULL AND review_notes <> '' THEN E'\n' ELSE '' END ||
        '[system] Auto-rejected: character removed from guild',
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE character_id = target_character
    AND guild_id = target_guild
    AND status IN ('pending', 'approved');

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  IF affected_count > 0 THEN
    RAISE NOTICE 'Auto-rejected % submission(s) for character=% guild=%',
      affected_count, target_character, target_guild;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_submissions_on_cgm_loss ON character_guild_memberships;
CREATE TRIGGER trg_reject_submissions_on_cgm_loss
  AFTER UPDATE OR DELETE ON character_guild_memberships
  FOR EACH ROW
  EXECUTE FUNCTION reject_submissions_on_cgm_loss();

DO $$
BEGIN
  RAISE NOTICE 'Orphan-submission prevention trigger installed';
END $$;
