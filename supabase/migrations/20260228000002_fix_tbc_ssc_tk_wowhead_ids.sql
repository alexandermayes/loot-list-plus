-- Fix incorrect wowhead_ids for SSC and TK items across ALL guilds
-- These were wrong in the seed data, causing tooltip mismatches

-- SSC: Boots of Courage Unending (was 30098 = Razor-Scale Battlecloak)
UPDATE loot_items SET wowhead_id = 30027
WHERE name = 'Boots of Courage Unending' AND wowhead_id = 30098;

-- TK Kael'thas: Crown of the Sun (was 29986 = Cowl of the Grand Engineer)
UPDATE loot_items SET wowhead_id = 29990
WHERE name = 'Crown of the Sun' AND wowhead_id = 29986;

-- TK Kael'thas: Royal Cloak of the Sunstriders (was 29994 = Netherstrand Longbow legendary)
UPDATE loot_items SET wowhead_id = 29992
WHERE name = 'Royal Cloak of the Sunstriders' AND wowhead_id = 29994;

-- TK Kael'thas: Leggings of Murderous Intent (was 30236 = Chestguard token)
UPDATE loot_items SET wowhead_id = 29995
WHERE name = 'Leggings of Murderous Intent' AND wowhead_id = 30236;

-- TK Kael'thas: Sunshower Light Cloak (was 30237 = Chestguard token)
UPDATE loot_items SET wowhead_id = 29989
WHERE name = 'Sunshower Light Cloak' AND wowhead_id = 30237;

-- TK Kael'thas: The Nexus Key (was 30095 = Fang of the Leviathan)
UPDATE loot_items SET wowhead_id = 29988
WHERE name = 'The Nexus Key' AND wowhead_id = 30095;

-- TK Kael'thas: Royal Gauntlets of Silvermoon (was 30106 = Belt of One-Hundred Deaths)
UPDATE loot_items SET wowhead_id = 29998
WHERE name = 'Royal Gauntlets of Silvermoon' AND wowhead_id = 30106;

-- TK Kael'thas: Twinblade of the Phoenix (was 29996 = Rod of the Sun King)
UPDATE loot_items SET wowhead_id = 29993
WHERE name = 'Twinblade of the Phoenix' AND wowhead_id = 29996;

-- TK Kael'thas: Verdant Sphere (was 30449 = Void Star Talisman)
UPDATE loot_items SET wowhead_id = 32405
WHERE name = 'Verdant Sphere' AND wowhead_id = 30449;

-- Remove Kael'thas legendary phase weapons (not actual loot drops, used during encounter only)
DELETE FROM loot_items WHERE name = 'Cosmic Infuser' AND wowhead_id = 29988;
DELETE FROM loot_items WHERE name = 'Devastation' AND wowhead_id = 29989;
DELETE FROM loot_items WHERE name = 'Infinity Blade' AND wowhead_id = 29990;
DELETE FROM loot_items WHERE name = 'Warp Slicer' AND wowhead_id = 29991;
DELETE FROM loot_items WHERE name = 'Phaseshift Bulwark' AND wowhead_id = 29992;
DELETE FROM loot_items WHERE name = 'Staff of Disintegration' AND wowhead_id = 29993;
DELETE FROM loot_items WHERE name = 'Netherstrand Longbow' AND wowhead_id = 29994;

-- Remove Ashes of Al'ar (mount, not distributable loot)
DELETE FROM loot_items WHERE name = 'Ashes of Al''ar' AND wowhead_id = 32458;
