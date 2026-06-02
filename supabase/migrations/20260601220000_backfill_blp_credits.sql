-- Follow-up to #98: backfill blp_credits from existing loot_history.
--
-- The original journal migration only made NEW credits idempotent. For
-- guilds with prior history, the journal was empty — so re-importing a
-- past raid still hit "new row" path and bumped blp_tracking again. The
-- cascade kept compounding for raids that pre-dated the migration.
--
-- Reconstruct what blp_credits *should* hold by replaying loot_history:
--   1. For every (loot_item, raid_event) award, walk the approved
--      submissions to find characters who had the item ranked.
--   2. Cross-join with attendance_records — anyone who attended (or was
--      benched, if the guild opted in via blp_includes_benched) qualifies.
--   3. Exclude the winner — they don't get a credit for their own win.
--   4. Insert a journal row per non-winner, deduped by the PK.
--
-- After the journal is reconstituted, prune entries rendered moot by a
-- later win (`reset_blp` is what would've cleared them at runtime). For
-- each (character, loot_item) that has a later win, drop credits from
-- raids on/before the most recent win date.
--
-- Finally, recompute blp_tracking.times_passed from the journal so the
-- denormalized counter matches the truth. Guilds that inflated values
-- via the pre-fix cascade will see counts come down to the real number
-- of pass-overs since their last win.
--
-- This is a one-shot reconciliation — the runtime functions stay as-is
-- and continue to maintain both tables in sync from here on.

-- ─── 1. Backfill journal from loot_history ───────────────────────────

INSERT INTO blp_credits (guild_id, character_id, loot_item_id, raid_event_id, expansion_id, created_at)
SELECT DISTINCT
  lh.guild_id,
  ls.character_id,
  lh.loot_item_id,
  lh.raid_event_id,
  lh.expansion_id,
  COALESCE(re.raid_date::timestamptz, NOW())
FROM loot_history lh
JOIN raid_events re ON re.id = lh.raid_event_id
JOIN loot_submission_items lsi
  ON lsi.loot_item_id = lh.loot_item_id
 AND lsi.removed_at IS NULL
JOIN loot_submissions ls
  ON ls.id = lsi.submission_id
 AND ls.guild_id = lh.guild_id
 AND ls.status = 'approved'
JOIN attendance_records ar
  ON ar.raid_event_id = lh.raid_event_id
 AND ar.character_id = ls.character_id
JOIN guild_settings gs ON gs.guild_id = lh.guild_id
WHERE lh.character_id IS NOT NULL
  AND lh.raid_event_id IS NOT NULL
  AND ls.character_id <> lh.character_id  -- exclude the winner from their own credit
  AND gs.blp_enabled = true
  AND (
    ar.attended = true
    OR (gs.blp_includes_benched = true AND ar.was_benched = true)
  )
ON CONFLICT (character_id, loot_item_id, raid_event_id) DO NOTHING;

-- ─── 2. Drop credits older than the (character, loot_item) last-win ──
-- reset_blp would have cleared these at the time; replay that.

WITH last_win AS (
  SELECT
    lh.character_id,
    lh.loot_item_id,
    MAX(re.raid_date) AS win_date
  FROM loot_history lh
  JOIN raid_events re ON re.id = lh.raid_event_id
  WHERE lh.character_id IS NOT NULL
  GROUP BY lh.character_id, lh.loot_item_id
)
DELETE FROM blp_credits bc
USING last_win lw, raid_events re
WHERE bc.character_id = lw.character_id
  AND bc.loot_item_id = lw.loot_item_id
  AND bc.raid_event_id = re.id
  AND re.raid_date <= lw.win_date;

-- ─── 3. Recompute blp_tracking.times_passed from the journal ─────────

WITH counts AS (
  SELECT guild_id, character_id, loot_item_id, COUNT(*) AS cnt
  FROM blp_credits
  GROUP BY guild_id, character_id, loot_item_id
)
INSERT INTO blp_tracking (guild_id, character_id, loot_item_id, times_passed, last_updated_at)
SELECT guild_id, character_id, loot_item_id, cnt, NOW()
FROM counts
ON CONFLICT (guild_id, character_id, loot_item_id) DO UPDATE
SET times_passed = EXCLUDED.times_passed,
    last_updated_at = NOW();

-- 3b. Zero out tracking rows that no longer have any journal backing
--     (a character that "fell off" the journal — e.g. their submission
--     got removed, or their attendance flipped).
UPDATE blp_tracking bt
SET times_passed = 0,
    last_updated_at = NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM blp_credits bc
  WHERE bc.guild_id = bt.guild_id
    AND bc.character_id = bt.character_id
    AND bc.loot_item_id = bt.loot_item_id
);
