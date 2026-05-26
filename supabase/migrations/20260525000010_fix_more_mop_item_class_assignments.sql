-- Follow-up to 20260525000003/4: same incomplete-sheet-import pattern across more
-- MoP items. Only target items that already have *partial* class restrictions
-- (so the missing specs are actually invisible to those classes). Fully unallocated
-- items aren't touched — they already show for every class.

BEGIN;

DO $$
DECLARE
  hunter_class_id UUID;
  hunter_spec_id UUID;
  rogue_class_id UUID;
  rogue_spec_id UUID;
  shaman_class_id UUID;
  ele_shaman_spec_id UUID;
  resto_shaman_spec_id UUID;
  priest_class_id UUID;
  hd_priest_spec_id UUID;
BEGIN
  SELECT id INTO hunter_class_id FROM wow_classes WHERE name = 'Hunter';
  SELECT id INTO hunter_spec_id FROM class_specs
    WHERE name = 'Hunter' AND class_id = hunter_class_id;
  SELECT id INTO rogue_class_id FROM wow_classes WHERE name = 'Rogue';
  SELECT id INTO rogue_spec_id FROM class_specs
    WHERE name = 'Rogue' AND class_id = rogue_class_id;
  SELECT id INTO shaman_class_id FROM wow_classes WHERE name = 'Shaman';
  SELECT id INTO ele_shaman_spec_id FROM class_specs
    WHERE name = 'Elemental' AND class_id = shaman_class_id;
  SELECT id INTO resto_shaman_spec_id FROM class_specs
    WHERE name = 'Restoration' AND class_id = shaman_class_id;
  SELECT id INTO priest_class_id FROM wow_classes WHERE name = 'Priest';
  SELECT id INTO hd_priest_spec_id FROM class_specs
    WHERE name = 'Holy/Disc' AND class_id = priest_class_id;

  IF hunter_class_id IS NULL OR rogue_class_id IS NULL OR shaman_class_id IS NULL
     OR priest_class_id IS NULL OR hunter_spec_id IS NULL OR rogue_spec_id IS NULL
     OR ele_shaman_spec_id IS NULL OR resto_shaman_spec_id IS NULL
     OR hd_priest_spec_id IS NULL THEN
    RAISE EXCEPTION 'Could not resolve required class/spec ids';
  END IF;

  -- 1) Immerseus' Crystalline Eye (Heroic) (104411) — Agi neck. Has Feral/Windwalker
  --    but missing Hunter. (Normal 105158 is fully unallocated — skip.)
  INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
  SELECT li.id, hunter_class_id, hunter_spec_id, 'primary'
  FROM loot_items li
  WHERE li.wowhead_id = 104411
    AND NOT EXISTS (
      SELECT 1 FROM loot_item_classes lic
      WHERE lic.loot_item_id = li.id AND lic.class_id = hunter_class_id
    );

  -- 2) Agi Ranged weapons (Bow/Crossbow/Gun) currently assigned to Hunter only —
  --    add Rogue primary. Rogues use ranged weapons too.
  --    Skip 103776 (Death Lotus Crossbow normal) and 104563 (Kor'kron Hand Cannon
  --    Heroic) — both fully unallocated, already visible to everyone.
  INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
  SELECT li.id, rogue_class_id, rogue_spec_id, 'primary'
  FROM loot_items li
  WHERE li.wowhead_id IN (
    103885, 104486,            -- Dagryn's Discarded Longbow (normal, heroic)
    105180, 104433,            -- Death Lotus Crossbow (alt normal, heroic)
    103886, 104627,            -- Hisek's Reserve Longbow (normal, heroic)
    103953, 105310             -- Kor'kron Hand Cannon (normal, alt normal)
  )
    AND NOT EXISTS (
      SELECT 1 FROM loot_item_classes lic
      WHERE lic.loot_item_id = li.id AND lic.class_id = rogue_class_id
    );

  -- 3) Int Staff items missing Shaman casters.
  --    Lever of the Megantholithic Apparatus (Heroic) (104618): missing both
  --    Elemental and Restoration. (Normal 103874 is unallocated — skip.)
  --    Gaze of Arrogance (103873, 104479): heroic already has Resto; both missing
  --    Elemental.
  INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
  SELECT li.id, shaman_class_id, ele_shaman_spec_id, 'primary'
  FROM loot_items li
  WHERE li.wowhead_id IN (104618, 103873, 104479)
    AND NOT EXISTS (
      SELECT 1 FROM loot_item_classes lic
      WHERE lic.loot_item_id = li.id AND lic.spec_id = ele_shaman_spec_id
    );

  INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
  SELECT li.id, shaman_class_id, resto_shaman_spec_id, 'primary'
  FROM loot_items li
  WHERE li.wowhead_id IN (104618, 103873)
    AND NOT EXISTS (
      SELECT 1 FROM loot_item_classes lic
      WHERE lic.loot_item_id = li.id AND lic.spec_id = resto_shaman_spec_id
    );

  -- 4) Immaculately Preserved Wand (103964) — Int Wand, has Mage/Shadow/Warlock,
  --    missing Holy/Disc Priest. (Heroic 104598 is unallocated — skip.)
  INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
  SELECT li.id, priest_class_id, hd_priest_spec_id, 'primary'
  FROM loot_items li
  WHERE li.wowhead_id = 103964
    AND NOT EXISTS (
      SELECT 1 FROM loot_item_classes lic
      WHERE lic.loot_item_id = li.id AND lic.spec_id = hd_priest_spec_id
    );
END $$;

COMMIT;
