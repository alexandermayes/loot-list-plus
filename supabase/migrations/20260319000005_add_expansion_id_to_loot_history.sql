-- Add expansion_id to loot_history and blp_tracking
-- Prevents cross-expansion item overlap from inflating BLP or showing wrong items.

-- 1. Add columns (nullable initially for backfill)
ALTER TABLE loot_history ADD COLUMN IF NOT EXISTS expansion_id UUID REFERENCES expansions(id);
ALTER TABLE blp_tracking ADD COLUMN IF NOT EXISTS expansion_id UUID REFERENCES expansions(id);

-- 2. Backfill loot_history from the chain: loot_items → raid_tiers → expansions
UPDATE loot_history lh
SET expansion_id = e.id
FROM loot_items li
JOIN raid_tiers rt ON rt.id = li.raid_tier_id
JOIN expansions e ON e.id = rt.expansion_id
WHERE lh.loot_item_id = li.id
  AND lh.expansion_id IS NULL;

-- 3. Backfill blp_tracking similarly
UPDATE blp_tracking bt
SET expansion_id = e.id
FROM loot_items li
JOIN raid_tiers rt ON rt.id = li.raid_tier_id
JOIN expansions e ON e.id = rt.expansion_id
WHERE bt.loot_item_id = li.id
  AND bt.expansion_id IS NULL;

-- 4. Add indexes for filtered queries
CREATE INDEX IF NOT EXISTS idx_loot_history_expansion
  ON loot_history (expansion_id);
CREATE INDEX IF NOT EXISTS idx_blp_tracking_expansion
  ON blp_tracking (expansion_id);

DO $$
BEGIN
  RAISE NOTICE 'expansion_id added to loot_history and blp_tracking';
END $$;
