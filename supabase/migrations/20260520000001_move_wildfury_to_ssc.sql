-- Wildfury Greatstaff (30021) was appearing in both SSC and TK on the master sheet:
--   - 20260219000000 backfilled it into SSC (then re-bossed to "Trash" by 20260329000001)
--   - 20260430000001 backfilled it into TK trash for the same guilds
-- The canonical location for the master sheet is SSC Trash. This migration consolidates
-- existing rows to SSC, preserving submission/history/BLP/award references.

DO $$
DECLARE
  v_exp RECORD;
  v_ssc_id UUID;
  v_tk_id UUID;
  v_ssc_item_id UUID;
  v_tk_item_id UUID;
BEGIN
  FOR v_exp IN
    SELECT e.id AS expansion_id
    FROM expansions e
    WHERE EXISTS (
      SELECT 1 FROM raid_tiers rt WHERE rt.expansion_id = e.id AND rt.name = 'Serpentshrine Cavern'
    )
    AND EXISTS (
      SELECT 1 FROM raid_tiers rt WHERE rt.expansion_id = e.id AND rt.name = 'Tempest Keep: The Eye'
    )
  LOOP
    SELECT id INTO v_ssc_id FROM raid_tiers
      WHERE expansion_id = v_exp.expansion_id AND name = 'Serpentshrine Cavern';
    SELECT id INTO v_tk_id FROM raid_tiers
      WHERE expansion_id = v_exp.expansion_id AND name = 'Tempest Keep: The Eye';

    v_ssc_item_id := NULL;
    v_tk_item_id := NULL;
    SELECT id INTO v_ssc_item_id FROM loot_items
      WHERE raid_tier_id = v_ssc_id AND wowhead_id = 30021 LIMIT 1;
    SELECT id INTO v_tk_item_id FROM loot_items
      WHERE raid_tier_id = v_tk_id AND wowhead_id = 30021 LIMIT 1;

    IF v_ssc_item_id IS NOT NULL AND v_tk_item_id IS NOT NULL THEN
      -- Both rows exist. Re-point references from TK row to SSC row, then drop TK row.

      UPDATE loot_submission_items
        SET loot_item_id = v_ssc_item_id
        WHERE loot_item_id = v_tk_item_id;

      UPDATE loot_history
        SET loot_item_id = v_ssc_item_id
        WHERE loot_item_id = v_tk_item_id;

      -- blp_tracking has UNIQUE(guild_id, character_id, loot_item_id). Merge counts
      -- on conflict, then move the non-conflicting rows.
      UPDATE blp_tracking ssc
      SET times_passed = ssc.times_passed + tk.times_passed,
          last_updated_at = GREATEST(ssc.last_updated_at, tk.last_updated_at)
      FROM blp_tracking tk
      WHERE tk.loot_item_id = v_tk_item_id
        AND ssc.loot_item_id = v_ssc_item_id
        AND ssc.guild_id = tk.guild_id
        AND ssc.character_id = tk.character_id;

      UPDATE blp_tracking
        SET loot_item_id = v_ssc_item_id
        WHERE loot_item_id = v_tk_item_id
        AND NOT EXISTS (
          SELECT 1 FROM blp_tracking b2
          WHERE b2.guild_id = blp_tracking.guild_id
            AND b2.character_id = blp_tracking.character_id
            AND b2.loot_item_id = v_ssc_item_id
        );

      UPDATE guild_item_priorities
        SET item_id = v_ssc_item_id
        WHERE item_id = v_tk_item_id;

      UPDATE reserve_awards
        SET loot_item_id = v_ssc_item_id
        WHERE loot_item_id = v_tk_item_id;

      -- Any remaining children (loot_item_classes, leftover blp_tracking conflicts)
      -- get cleaned up by ON DELETE CASCADE.
      DELETE FROM loot_items WHERE id = v_tk_item_id;

      RAISE NOTICE 'Expansion %: merged TK Wildfury Greatstaff into SSC', v_exp.expansion_id;

    ELSIF v_tk_item_id IS NOT NULL AND v_ssc_item_id IS NULL THEN
      -- Only TK row exists. Move it to SSC in place to preserve references.
      UPDATE loot_items
        SET raid_tier_id = v_ssc_id, boss_name = 'Trash'
        WHERE id = v_tk_item_id;

      RAISE NOTICE 'Expansion %: moved TK Wildfury Greatstaff row to SSC', v_exp.expansion_id;

    ELSIF v_ssc_item_id IS NULL AND v_tk_item_id IS NULL THEN
      -- Neither row exists. Seed the SSC row.
      INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
        VALUES (v_ssc_id, 'Wildfury Greatstaff', 'Trash', 'Two-Hand', 30021, true);

      RAISE NOTICE 'Expansion %: inserted SSC Wildfury Greatstaff', v_exp.expansion_id;
    END IF;
    -- Only SSC exists: already canonical, no-op.
  END LOOP;
END;
$$;
