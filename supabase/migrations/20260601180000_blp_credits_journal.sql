-- Stop BLP from compounding on re-imports (GH #98).
--
-- Original bug: `increment_blp(guild, character, loot_item)` always +1s
-- `blp_tracking.times_passed`. The bulk loot-history importer (and the
-- master sheet award flow) call it once per `loot_history` row. If an
-- officer deletes loot_history rows and re-imports the same raid, the
-- second pass fires `increment_blp` AGAIN — `blp_tracking` doesn't know
-- which (raid_event, loot_item) combos already credited a character, so
-- it just adds another +1 per non-winner. The cascade compounds with
-- every cycle (eithelien hit +3 after the third cycle).
--
-- Fix: introduce a per-(character, loot_item, raid_event) journal so the
-- credit becomes idempotent. Re-firing increment_blp for the same
-- (character, loot_item, raid_event) tuple is a no-op.
--
-- blp_tracking stays — it's still the denormalized read surface that
-- the dashboard, audit log, addon export, and BLP API all hit, so we
-- don't want to break those callers. We just gate the +1 on a new row
-- actually being inserted into the journal.
--
-- Existing blp_tracking values are NOT touched. Old (pre-fix) credits
-- have no journal backing, so they look "orphaned," but they're still
-- the truth from the guild's perspective — they just can't be precisely
-- attributed to specific raids. From this migration forward, every new
-- credit lands in the journal and old values continue to drain when
-- raiders win (reset_blp still works the same way).

-- ─── 1. Journal table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blp_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  loot_item_id UUID NOT NULL REFERENCES loot_items(id) ON DELETE CASCADE,
  raid_event_id UUID NOT NULL REFERENCES raid_events(id) ON DELETE CASCADE,
  expansion_id UUID REFERENCES expansions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- The idempotency anchor: one credit per (character, loot_item, raid_event).
  CONSTRAINT blp_credits_unique UNIQUE (character_id, loot_item_id, raid_event_id)
);

CREATE INDEX IF NOT EXISTS idx_blp_credits_guild ON blp_credits(guild_id);
CREATE INDEX IF NOT EXISTS idx_blp_credits_character_item ON blp_credits(character_id, loot_item_id);
CREATE INDEX IF NOT EXISTS idx_blp_credits_raid_item ON blp_credits(raid_event_id, loot_item_id);

-- ─── 2. RLS — mirrors blp_tracking ───────────────────────────────────

ALTER TABLE blp_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guild members can view BLP credits" ON blp_credits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = blp_credits.guild_id
        AND c.user_id = auth.uid()
        AND cgm.is_active = true
    )
  );

CREATE POLICY "Officers can insert BLP credits" ON blp_credits FOR INSERT
  WITH CHECK (public.is_guild_officer(guild_id));

CREATE POLICY "Officers can update BLP credits" ON blp_credits FOR UPDATE
  USING (public.is_guild_officer(guild_id))
  WITH CHECK (public.is_guild_officer(guild_id));

CREATE POLICY "Officers can delete BLP credits" ON blp_credits FOR DELETE
  USING (public.is_guild_officer(guild_id));

-- ─── 3. New increment_blp with raid_event_id ─────────────────────────
--
-- Idempotent: journal insert hits ON CONFLICT DO NOTHING for re-fires.
-- The +1 on blp_tracking is gated on a row actually being inserted, so
-- re-imports don't compound.
--
-- Signature change: old (uuid, uuid, uuid) → new (uuid, uuid, uuid, uuid).
-- Callers in /api/blp/update and /api/loot-history/bulk update in the
-- same PR to pass raid_event_id.

DROP FUNCTION IF EXISTS public.increment_blp(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.increment_blp(
  p_guild_id UUID,
  p_character_id UUID,
  p_loot_item_id UUID,
  p_raid_event_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expansion_id UUID;
  v_times_passed INTEGER;
  v_inserted BOOLEAN;
BEGIN
  -- Look up expansion_id for the new credit row.
  SELECT rt.expansion_id INTO v_expansion_id
  FROM loot_items li
  JOIN raid_tiers rt ON rt.id = li.raid_tier_id
  WHERE li.id = p_loot_item_id
  LIMIT 1;

  -- Idempotent journal: one row per (character, loot_item, raid_event).
  INSERT INTO blp_credits (guild_id, character_id, loot_item_id, raid_event_id, expansion_id)
  VALUES (p_guild_id, p_character_id, p_loot_item_id, p_raid_event_id, v_expansion_id)
  ON CONFLICT (character_id, loot_item_id, raid_event_id) DO NOTHING;

  -- Only bump the denormalized counter if we actually inserted a credit.
  -- FOUND reflects whether the INSERT affected a row (i.e. no conflict).
  v_inserted := FOUND;

  IF v_inserted THEN
    INSERT INTO blp_tracking (guild_id, character_id, loot_item_id, times_passed, last_updated_at)
    VALUES (p_guild_id, p_character_id, p_loot_item_id, 1, NOW())
    ON CONFLICT (guild_id, character_id, loot_item_id) DO UPDATE
    SET times_passed = blp_tracking.times_passed + 1,
        last_updated_at = NOW()
    RETURNING times_passed INTO v_times_passed;
  ELSE
    SELECT times_passed INTO v_times_passed
    FROM blp_tracking
    WHERE guild_id = p_guild_id
      AND character_id = p_character_id
      AND loot_item_id = p_loot_item_id;
  END IF;

  RETURN COALESCE(v_times_passed, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_blp(UUID, UUID, UUID, UUID) TO authenticated;

-- ─── 4. reset_blp also wipes the journal ────────────────────────────
--
-- Wins clear *all* prior credits for (character, loot_item) so the next
-- raid starts fresh. Existing reset_blp already cleared blp_tracking;
-- we extend it to delete the matching journal rows so the two stay in
-- sync.

CREATE OR REPLACE FUNCTION public.reset_blp(
  p_guild_id UUID,
  p_character_id UUID,
  p_loot_item_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM blp_credits
  WHERE character_id = p_character_id
    AND loot_item_id = p_loot_item_id;

  DELETE FROM blp_tracking
  WHERE guild_id = p_guild_id
    AND character_id = p_character_id
    AND loot_item_id = p_loot_item_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_blp(UUID, UUID, UUID) TO authenticated;
