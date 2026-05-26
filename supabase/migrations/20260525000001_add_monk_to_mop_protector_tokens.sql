-- MoP tier Protector tokens (T14 Shadowy, T15 Crackling, T16 Cursed) include Monks
-- as a primary class, but loot_item_classes was seeded without Monk for guilds whose
-- MoP expansion was created before the seeder was fixed. Backfill the missing Monk
-- entries so Monks can add these tokens to brackets 1-4.

INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND wc.name = 'Monk'
  AND (
    li.name LIKE '%of the Shadowy Protector%'
    OR li.name LIKE '%of the Crackling Protector%'
    OR li.name LIKE '%of the Cursed Protector%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM loot_item_classes lic
    WHERE lic.loot_item_id = li.id
      AND lic.class_id = wc.id
      AND lic.spec_id IS NULL
  );
