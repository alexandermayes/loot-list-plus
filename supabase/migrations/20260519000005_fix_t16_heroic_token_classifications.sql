-- Migration: Fix Tier 16 (Siege of Orgrimmar) Heroic token classifications
--
-- The original MoP classification map only listed the normal-name Tier 16
-- tokens as Limited (allocation_cost=1). Their "(Heroic)" variants fell
-- through to the default Unlimited / allocation_cost=0, which made them
-- look free to rank for raiders. Both modes are gated tier tokens and
-- should cost 1 allocation point.
--
-- This sets the (Heroic) variants of every Tier 16 token to Limited /
-- allocation_cost=1 across every guild with the Siege of Orgrimmar tier.

UPDATE loot_items
SET classification = 'Limited',
    allocation_cost = 1
WHERE name IN (
        'Helm of the Cursed Conqueror (Heroic)',
        'Helm of the Cursed Protector (Heroic)',
        'Helm of the Cursed Vanquisher (Heroic)',
        'Shoulders of the Cursed Conqueror (Heroic)',
        'Shoulders of the Cursed Protector (Heroic)',
        'Shoulders of the Cursed Vanquisher (Heroic)',
        'Chest of the Cursed Conqueror (Heroic)',
        'Chest of the Cursed Protector (Heroic)',
        'Chest of the Cursed Vanquisher (Heroic)',
        'Gauntlets of the Cursed Conqueror (Heroic)',
        'Gauntlets of the Cursed Protector (Heroic)',
        'Gauntlets of the Cursed Vanquisher (Heroic)',
        'Leggings of the Cursed Conqueror (Heroic)',
        'Leggings of the Cursed Protector (Heroic)',
        'Leggings of the Cursed Vanquisher (Heroic)'
    )
  AND classification = 'Unlimited';
