-- Migration: Backfill character_id for existing loot_submissions
-- Updates submissions that don't have a character_id by linking them to characters based on user_id

-- Update submissions where character_id is null using the old user_id field
-- First try to match with user's active character in that guild
UPDATE loot_submissions ls
SET character_id = uac.active_character_id
FROM user_active_characters uac
INNER JOIN characters c ON c.id = uac.active_character_id
WHERE ls.character_id IS NULL
  AND ls.user_id IS NOT NULL
  AND c.user_id = ls.user_id
  AND uac.active_guild_id = ls.guild_id;

-- For remaining nulls, use any character that belongs to the user in that guild
UPDATE loot_submissions ls
SET character_id = (
  SELECT c.id
  FROM characters c
  INNER JOIN character_guild_memberships cgm ON cgm.character_id = c.id
  WHERE c.user_id = ls.user_id
    AND cgm.guild_id = ls.guild_id
    AND cgm.is_active = true
  ORDER BY c.is_main DESC, c.created_at ASC
  LIMIT 1
)
WHERE ls.character_id IS NULL
  AND ls.user_id IS NOT NULL;

-- For any submissions still without character_id, create a placeholder character
-- (This shouldn't happen if the backfill_character_guild_memberships migration ran)

-- Log the results
DO $$
DECLARE
  updated_count INT;
  remaining_null INT;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM loot_submissions WHERE character_id IS NOT NULL;
  SELECT COUNT(*) INTO remaining_null FROM loot_submissions WHERE character_id IS NULL;

  RAISE NOTICE 'Backfilled character_id: % submissions now have character_id', updated_count;
  RAISE NOTICE 'Remaining null: % submissions still need character_id', remaining_null;

  IF remaining_null > 0 THEN
    RAISE WARNING 'Some submissions still have null character_id. Run backfill_character_guild_memberships migration first.';
  END IF;
END $$;
