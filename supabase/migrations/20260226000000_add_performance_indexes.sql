-- Performance indexes for frequently used composite query patterns.
-- These complement existing single-column indexes by covering multi-column
-- filters and sort orders that appear in hot paths (list views, dashboards,
-- loot history lookups, attendance reports).

-- character_guild_memberships
-- Covers WHERE guild_id = ? AND is_active = ? (member lists, roster queries)
CREATE INDEX IF NOT EXISTS idx_cgm_guild_active
  ON character_guild_memberships (guild_id, is_active);

-- Covers WHERE guild_id = ? AND character_id = ? AND is_active = ? (membership checks)
CREATE INDEX IF NOT EXISTS idx_cgm_guild_char_active
  ON character_guild_memberships (guild_id, character_id, is_active);

-- loot_history
-- Covers WHERE guild_id = ? ORDER BY awarded_date DESC (recent loot feed)
CREATE INDEX IF NOT EXISTS idx_lh_guild_date
  ON loot_history (guild_id, awarded_date DESC);

-- Covers WHERE raid_event_id = ? (loot per raid lookup)
CREATE INDEX IF NOT EXISTS idx_lh_raid_event
  ON loot_history (raid_event_id);

-- loot_submissions
-- Covers WHERE status = ? (pending review queues, filtered lists)
CREATE INDEX IF NOT EXISTS idx_ls_status
  ON loot_submissions (status);

-- loot_submission_items
-- Covers WHERE submission_id = ? (loading items for a submission)
CREATE INDEX IF NOT EXISTS idx_lsi_submission
  ON loot_submission_items (submission_id);

-- attendance_records
-- Covers WHERE raid_event_id = ? (attendance per raid)
CREATE INDEX IF NOT EXISTS idx_ar_raid_event
  ON attendance_records (raid_event_id);

-- guild_item_priorities
-- Covers WHERE guild_id = ? AND raid_tier_id = ? (tier-scoped priority lists)
CREATE INDEX IF NOT EXISTS idx_gip_guild_tier
  ON guild_item_priorities (guild_id, raid_tier_id);

-- Covers WHERE guild_id = ? AND item_id = ? AND raid_tier_id = ? (single-item lookup)
CREATE INDEX IF NOT EXISTS idx_gip_guild_item_tier
  ON guild_item_priorities (guild_id, item_id, raid_tier_id);
