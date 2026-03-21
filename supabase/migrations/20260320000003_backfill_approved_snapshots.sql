-- Backfill snapshots for all currently-approved submissions that don't have one.
-- This allows the diff view to work for lists approved before the snapshot-on-approve
-- code change was deployed.

INSERT INTO loot_submission_snapshots (submission_id, version, items)
SELECT
  ls.id AS submission_id,
  0 AS version,
  jsonb_agg(
    jsonb_build_object(
      'rank', lsi.rank,
      'slot', lsi.slot,
      'loot_item_id', lsi.loot_item_id,
      'item_name', COALESCE(li.name, 'Unknown')
    )
    ORDER BY lsi.rank DESC, lsi.slot ASC
  ) AS items
FROM loot_submissions ls
JOIN loot_submission_items lsi ON lsi.submission_id = ls.id AND lsi.removed_at IS NULL
JOIN loot_items li ON li.id = lsi.loot_item_id
WHERE ls.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM loot_submission_snapshots snap
    WHERE snap.submission_id = ls.id
  )
GROUP BY ls.id;
