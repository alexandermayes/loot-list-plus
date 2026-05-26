-- Follow-up to 20260525000010: the prior migration's `NOT EXISTS` guard skipped
-- guild copies where the target class already had a SECONDARY row. Promote those
-- existing secondary rows to primary so coverage matches the other guild copies.

BEGIN;

DO $$
DECLARE
  rogue_class_id UUID;
  rogue_spec_id UUID;
  priest_class_id UUID;
  hd_priest_spec_id UUID;
BEGIN
  SELECT id INTO rogue_class_id FROM wow_classes WHERE name = 'Rogue';
  SELECT id INTO rogue_spec_id FROM class_specs
    WHERE name = 'Rogue' AND class_id = rogue_class_id;
  SELECT id INTO priest_class_id FROM wow_classes WHERE name = 'Priest';
  SELECT id INTO hd_priest_spec_id FROM class_specs
    WHERE name = 'Holy/Disc' AND class_id = priest_class_id;

  -- Promote Rogue secondary → primary on the eight Agi Ranged weapons.
  UPDATE loot_item_classes lic
  SET spec_type = 'primary'
  FROM loot_items li
  WHERE lic.loot_item_id = li.id
    AND li.wowhead_id IN (
      103885, 104486,            -- Dagryn's Discarded Longbow
      105180, 104433,            -- Death Lotus Crossbow
      103886, 104627,            -- Hisek's Reserve Longbow
      103953, 105310             -- Kor'kron Hand Cannon
    )
    AND lic.spec_id = rogue_spec_id
    AND lic.spec_type = 'secondary';

  -- Promote Holy/Disc Priest secondary → primary on Immaculately Preserved Wand.
  UPDATE loot_item_classes lic
  SET spec_type = 'primary'
  FROM loot_items li
  WHERE lic.loot_item_id = li.id
    AND li.wowhead_id = 103964
    AND lic.spec_id = hd_priest_spec_id
    AND lic.spec_type = 'secondary';
END $$;

COMMIT;
