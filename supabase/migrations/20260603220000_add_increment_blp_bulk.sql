-- Set-based BLP increment, journal-aware.
--
-- increment_blp() handles one character per call, so awarding an item looped
-- one RPC round-trip per eligible non-winner (up to ~roster size per award,
-- multiplied across items in a bulk import). This adds a bulk variant that
-- does the same insert-or-increment for every character in one statement.
--
-- Journal semantics (GH #98): credits flow through blp_credits, keyed by
-- (character, loot_item, raid_event). Re-firing the bulk RPC for the same
-- (raid, item, characters) tuple is a no-op — blp_tracking only bumps for
-- characters whose journal insert actually landed (i.e. did not conflict).
-- Mirrors the per-row idempotency that increment_blp(uuid,uuid,uuid,uuid)
-- gained in 20260601180000.
--
-- DISTINCT in the journal insert guards against the "ON CONFLICT DO UPDATE
-- cannot affect row a second time" error if the caller passes duplicate
-- character ids, and matches the once-per-eligible-character intent.
--
-- Returns the number of characters whose blp_tracking row was bumped this
-- call (i.e. journal inserts that actually landed). Re-fires return 0.

CREATE OR REPLACE FUNCTION public.increment_blp_bulk(
  p_guild_id UUID,
  p_loot_item_id UUID,
  p_raid_event_id UUID,
  p_character_ids UUID[]
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expansion_id UUID;
  v_count INTEGER;
BEGIN
  -- Look up expansion_id once for all credit rows (same pattern as
  -- increment_blp). NULL is acceptable — column is nullable.
  SELECT rt.expansion_id INTO v_expansion_id
  FROM loot_items li
  JOIN raid_tiers rt ON rt.id = li.raid_tier_id
  WHERE li.id = p_loot_item_id
  LIMIT 1;

  -- Journal first: idempotent per (character, loot_item, raid_event).
  -- Only the characters whose row actually inserted (no conflict) flow
  -- into the blp_tracking bump, so re-imports stop compounding.
  WITH inserted_credits AS (
    INSERT INTO blp_credits (guild_id, character_id, loot_item_id, raid_event_id, expansion_id)
    SELECT p_guild_id, cid, p_loot_item_id, p_raid_event_id, v_expansion_id
    FROM (SELECT DISTINCT unnest(p_character_ids) AS cid) AS chars
    ON CONFLICT (character_id, loot_item_id, raid_event_id) DO NOTHING
    RETURNING character_id
  ),
  bumped AS (
    INSERT INTO blp_tracking (guild_id, character_id, loot_item_id, times_passed, last_updated_at)
    SELECT p_guild_id, character_id, p_loot_item_id, 1, NOW()
    FROM inserted_credits
    ON CONFLICT (guild_id, character_id, loot_item_id) DO UPDATE
    SET times_passed = blp_tracking.times_passed + 1,
        last_updated_at = NOW()
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM bumped;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_blp_bulk(UUID, UUID, UUID, UUID[]) TO authenticated;
