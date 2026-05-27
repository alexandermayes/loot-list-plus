-- Add primary_stat column for spec-based item filtering.
--
-- Values: 'Strength', 'Agility', 'Intellect', 'Stamina', or NULL.
-- NULL means unknown or not applicable (e.g. legacy items not yet backfilled,
-- or items where primary stat doesn't drive equip decisions).
--
-- Populated by scripts/populate-primary-stat.ts which fetches each item's
-- Wowhead tooltip and parses the stat block.

ALTER TABLE loot_items
ADD COLUMN IF NOT EXISTS primary_stat TEXT;

CREATE INDEX IF NOT EXISTS idx_loot_items_primary_stat ON loot_items(primary_stat);

COMMENT ON COLUMN loot_items.primary_stat IS 'Primary stat on the item: Strength, Agility, Intellect, Stamina, or NULL if unknown/N-A. Used for spec-based filtering.';
