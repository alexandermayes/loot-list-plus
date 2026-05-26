-- Fix three MoP loot items reported as missing from primary specs:
--
-- 1. Arcweaver Spell Sword (103946, 105301, 104554) — Int one-hand sword,
--    seeded with Mage + Warlock only. Mistweaver Monk is also an Int caster
--    that can equip One-Handed Swords, so they should be primary.
--
-- 2. Juggernaut's Power Core (103918) — Int off-hand; Mistweaver was seeded
--    as secondary, but Mistweavers are a primary Int-healer user of off-hands.
--    Promote to primary. Same fix for Festering Primordial Globule
--    (103919 / 104609) which is missing Mistweaver entirely.
--
-- 3. Kil'ruk's Band of Ascendancy (103844, 104628) — Agi finger, missing
--    Hunter entirely. Normal version (103844) also incorrectly lists
--    Mistweaver (an Int spec) as a primary user; swap to Windwalker to
--    match the heroic version's assignments.

BEGIN;

DO $$
DECLARE
  monk_class_id UUID;
  hunter_class_id UUID;
  mistweaver_spec_id UUID;
  windwalker_spec_id UUID;
  hunter_spec_id UUID;
BEGIN
  SELECT id INTO monk_class_id FROM wow_classes WHERE name = 'Monk';
  SELECT id INTO hunter_class_id FROM wow_classes WHERE name = 'Hunter';
  SELECT id INTO mistweaver_spec_id FROM class_specs
    WHERE name = 'Mistweaver' AND class_id = monk_class_id;
  SELECT id INTO windwalker_spec_id FROM class_specs
    WHERE name = 'Windwalker' AND class_id = monk_class_id;
  SELECT id INTO hunter_spec_id FROM class_specs
    WHERE name = 'Hunter' AND class_id = hunter_class_id;

  IF monk_class_id IS NULL OR hunter_class_id IS NULL
     OR mistweaver_spec_id IS NULL OR windwalker_spec_id IS NULL
     OR hunter_spec_id IS NULL THEN
    RAISE EXCEPTION 'Could not resolve required class/spec ids';
  END IF;

  -- 1) Arcweaver Spell Sword: add Mistweaver primary where missing.
  INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
  SELECT li.id, monk_class_id, mistweaver_spec_id, 'primary'
  FROM loot_items li
  WHERE li.wowhead_id IN (103946, 105301, 104554)
    AND NOT EXISTS (
      SELECT 1 FROM loot_item_classes lic
      WHERE lic.loot_item_id = li.id
        AND lic.spec_id = mistweaver_spec_id
    );

  -- 2a) Juggernaut's Power Core normal (103918): promote Mistweaver to primary.
  UPDATE loot_item_classes lic
  SET spec_type = 'primary'
  FROM loot_items li
  WHERE lic.loot_item_id = li.id
    AND li.wowhead_id = 103918
    AND lic.spec_id = mistweaver_spec_id
    AND lic.spec_type IS DISTINCT FROM 'primary';

  -- 2b) Festering Primordial Globule (103919, 104609): add Mistweaver primary.
  INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
  SELECT li.id, monk_class_id, mistweaver_spec_id, 'primary'
  FROM loot_items li
  WHERE li.wowhead_id IN (103919, 104609)
    AND NOT EXISTS (
      SELECT 1 FROM loot_item_classes lic
      WHERE lic.loot_item_id = li.id
        AND lic.spec_id = mistweaver_spec_id
    );

  -- 3a) Kil'ruk's Band of Ascendancy (103844, 104628): add Hunter primary.
  INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
  SELECT li.id, hunter_class_id, hunter_spec_id, 'primary'
  FROM loot_items li
  WHERE li.wowhead_id IN (103844, 104628)
    AND NOT EXISTS (
      SELECT 1 FROM loot_item_classes lic
      WHERE lic.loot_item_id = li.id
        AND lic.class_id = hunter_class_id
    );

  -- 3b) Kil'ruk's Band of Ascendancy normal (103844): replace incorrect
  --     Mistweaver assignment with Windwalker. If both already exist on a
  --     given item row (unlikely but possible), drop Mistweaver instead.
  DELETE FROM loot_item_classes lic
  USING loot_items li
  WHERE lic.loot_item_id = li.id
    AND li.wowhead_id = 103844
    AND lic.spec_id = mistweaver_spec_id
    AND EXISTS (
      SELECT 1 FROM loot_item_classes lic2
      WHERE lic2.loot_item_id = li.id
        AND lic2.spec_id = windwalker_spec_id
    );

  UPDATE loot_item_classes lic
  SET spec_id = windwalker_spec_id
  FROM loot_items li
  WHERE lic.loot_item_id = li.id
    AND li.wowhead_id = 103844
    AND lic.spec_id = mistweaver_spec_id;
END $$;

COMMIT;
