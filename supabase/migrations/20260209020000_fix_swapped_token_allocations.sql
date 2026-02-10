-- Fix swapped loot_item_classes allocations between Hero and Defender tokens
-- The wowhead_ids were swapped in the original migration, causing officers to
-- allocate specs to the wrong tokens based on misleading tooltips.
--
-- Hero (b5f991e6...) has Druid/Warrior/Priest allocations (should be on Defender)
-- Defender (a9d8da56...) has Warlock/Hunter/Mage allocations (should be on Hero)
--
-- Strategy: Update by specific row IDs to avoid FK constraint issues

-- Move Hero's current allocations (Warrior/Druid/Priest) to Defender
UPDATE loot_item_classes
SET loot_item_id = 'a9d8da56-f8e3-4eb5-8072-33e2f994bbc0'  -- Defender
WHERE id IN (
  '6cd505b9-4867-4b00-8bd5-2847d5081ce0',  -- Warrior (Protection)
  '04b14f99-8399-4a0b-af32-4cbf67aba979',  -- Druid (Feral)
  'bb46e301-6da9-42c6-a0aa-1dc51828a13b',  -- Warrior (Arms/Fury)
  'a1066714-fecc-422e-b904-dd43f051b873',  -- Priest (Shadow)
  'cbfebaaa-d3cd-47e7-8bfc-671210fe830b',  -- Druid (Balance)
  'acdbb778-8139-47a4-b7a2-a7ba00365932',  -- Priest (Holy/Disc)
  'd8e51022-c95d-49c4-aa8c-7f2f885daf34'   -- Druid (Restoration)
);

-- Move Defender's current allocations (Warlock/Hunter/Mage) to Hero
UPDATE loot_item_classes
SET loot_item_id = 'b5f991e6-de1e-4865-9d46-cd7c0f58aa9b'  -- Hero
WHERE id IN (
  '06a66071-5cca-44cf-8a29-47e78fa14b32',  -- Warlock
  'b2e7bb17-2796-463c-80aa-8793c5abe62e',  -- Hunter
  'b5bb2991-f4cf-4cbb-a703-25df12f5dfb5'   -- Mage
);
