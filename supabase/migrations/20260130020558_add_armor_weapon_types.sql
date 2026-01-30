-- Add armor_type and weapon_type columns for class proficiency filtering
-- These columns enable filtering items based on what a character's class can equip

-- Add armor_type column (Cloth, Leather, Mail, Plate)
-- Only applies to armor slots (Head, Shoulder, Chest, Wrist, Hands, Waist, Legs, Feet)
ALTER TABLE loot_items
ADD COLUMN IF NOT EXISTS armor_type TEXT;

-- Add weapon_type column (Dagger, One-Handed Sword, Two-Handed Axe, Staff, etc.)
-- Only applies to weapon slots (One-Hand, Two-Hand, Main Hand, Ranged)
ALTER TABLE loot_items
ADD COLUMN IF NOT EXISTS weapon_type TEXT;

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_loot_items_armor_type ON loot_items(armor_type);
CREATE INDEX IF NOT EXISTS idx_loot_items_weapon_type ON loot_items(weapon_type);

-- Add comments
COMMENT ON COLUMN loot_items.armor_type IS 'Armor weight class: Cloth, Leather, Mail, or Plate. Used for class proficiency filtering.';
COMMENT ON COLUMN loot_items.weapon_type IS 'Weapon type (e.g., Dagger, One-Handed Sword, Staff). Used for class proficiency filtering.';
