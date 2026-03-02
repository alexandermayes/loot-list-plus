-- Remove duplicate loot items within the same expansion (same name, same raid tier)
-- Keeps the item with the most references (loot_item_classes, loot_submission_items, loot_history)
-- Falls back to keeping the oldest item (lowest id) if tied.
-- loot_item_classes has ON DELETE CASCADE so child rows are cleaned up automatically.

WITH duplicates AS (
  SELECT
    li.id,
    li.name,
    li.raid_tier_id,
    rt.expansion_id,
    ROW_NUMBER() OVER (
      PARTITION BY li.name, rt.expansion_id
      ORDER BY
        -- Prefer items that have loot history or submission references
        (SELECT COUNT(*) FROM loot_history lh WHERE lh.loot_item_id = li.id) DESC,
        (SELECT COUNT(*) FROM loot_submission_items lsi WHERE lsi.loot_item_id = li.id) DESC,
        -- Then keep the oldest one
        li.created_at ASC
    ) AS rn
  FROM loot_items li
  JOIN raid_tiers rt ON li.raid_tier_id = rt.id
)
DELETE FROM loot_items
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
