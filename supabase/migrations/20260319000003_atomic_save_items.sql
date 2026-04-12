-- Atomic save for loot submission items
-- Replaces the non-atomic DELETE + INSERT pattern in LootListContext.
-- A concurrent read between DELETE and INSERT would see an empty list.
-- This function does both in a single transaction.

CREATE OR REPLACE FUNCTION save_submission_items(
  p_submission_id UUID,
  p_items JSONB -- Array of { loot_item_id, rank, slot }
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item_count INTEGER;
BEGIN
  -- Delete existing active items (preserve soft-deleted/removed items)
  DELETE FROM loot_submission_items
  WHERE submission_id = p_submission_id
    AND removed_at IS NULL;

  -- Insert new items
  INSERT INTO loot_submission_items (submission_id, loot_item_id, rank, slot)
  SELECT
    p_submission_id,
    (item->>'loot_item_id')::UUID,
    (item->>'rank')::INTEGER,
    (item->>'slot')::INTEGER
  FROM jsonb_array_elements(p_items) AS item;

  GET DIAGNOSTICS item_count = ROW_COUNT;
  RETURN item_count;
END;
$$;
