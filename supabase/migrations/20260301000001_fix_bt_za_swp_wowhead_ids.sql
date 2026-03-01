-- Fix wrong wowhead_ids in Black Temple, Zul'Aman, and Sunwell Plateau across ALL guilds
-- Verified all 651 TBC items against wowhead API

-- Black Temple (7 fixes)
UPDATE loot_items SET wowhead_id = 32510 WHERE name = 'Softstep Boots of Tracking' AND wowhead_id = 32280;
UPDATE loot_items SET wowhead_id = 32324 WHERE name = 'Insidious Bands' AND wowhead_id = 32281;
UPDATE loot_items SET wowhead_id = 32512 WHERE name = 'Girdle of Lordaeron''s Fallen' AND wowhead_id = 32324;
UPDATE loot_items SET wowhead_id = 32606 WHERE name = 'Girdle of the Lightbearer' AND wowhead_id = 32328;
UPDATE loot_items SET wowhead_id = 32348 WHERE name = 'Soul Cleaver' AND wowhead_id = 32326;
UPDATE loot_items SET wowhead_id = 32280 WHERE name = 'Gauntlets of Enforcement' AND wowhead_id = 32329;
UPDATE loot_items SET wowhead_id = 32328 WHERE name = 'Botanist''s Gloves of Growth' AND wowhead_id = 32330;

-- Zul'Aman (3 fixes)
UPDATE loot_items SET wowhead_id = 33497 WHERE name = 'Mana Attuned Band' AND wowhead_id = 33494;
UPDATE loot_items SET wowhead_id = 29997 WHERE name = 'Band of the Ranger-General' AND wowhead_id = 33495;
UPDATE loot_items SET wowhead_id = 30736 WHERE name = 'Ring of Flowing Light' AND wowhead_id = 33497;

-- Sunwell Plateau (23 fixes)
UPDATE loot_items SET wowhead_id = 34166 WHERE name = 'Band of Lucent Beams' AND wowhead_id = 34164;
UPDATE loot_items SET wowhead_id = 34164 WHERE name = 'Dragonscale-Encrusted Longblade' AND wowhead_id = 34166;
UPDATE loot_items SET wowhead_id = 34170 WHERE name = 'Pantaloons of Calming Strife' AND wowhead_id = 34167;
UPDATE loot_items SET wowhead_id = 34195 WHERE name = 'Shoulderpads of Vehemence' AND wowhead_id = 34168;
UPDATE loot_items SET wowhead_id = 34438 WHERE name = 'Skyshatter Bracers' AND wowhead_id = 34437;
UPDATE loot_items SET wowhead_id = 34197 WHERE name = 'Shiv of Exsanguination' AND wowhead_id = 34189;
UPDATE loot_items SET wowhead_id = 35290 WHERE name = 'Sin''dorei Pendant of Conquest' AND wowhead_id = 34193;
UPDATE loot_items SET wowhead_id = 35291 WHERE name = 'Sin''dorei Pendant of Salvation' AND wowhead_id = 34191;
UPDATE loot_items SET wowhead_id = 35292 WHERE name = 'Sin''dorei Pendant of Triumph' AND wowhead_id = 34192;
UPDATE loot_items SET wowhead_id = 34203 WHERE name = 'Grip of Mannoroth' AND wowhead_id = 34206;
UPDATE loot_items SET wowhead_id = 34205 WHERE name = 'Shroud of Redeemed Souls' AND wowhead_id = 34209;
UPDATE loot_items SET wowhead_id = 34336 WHERE name = 'Sunflare' AND wowhead_id = 34199;
UPDATE loot_items SET wowhead_id = 34206 WHERE name = 'Book of Highborne Hymns' AND wowhead_id = 34204;
UPDATE loot_items SET wowhead_id = 34208 WHERE name = 'Equilibrium Epaulets' AND wowhead_id = 34202;
UPDATE loot_items SET wowhead_id = 34209 WHERE name = 'Spaulders of Reclamation' AND wowhead_id = 34208;
UPDATE loot_items SET wowhead_id = 34240 WHERE name = 'Gauntlets of the Soothed Soul' AND wowhead_id = 34212;
UPDATE loot_items SET wowhead_id = 34346 WHERE name = 'Mounting Vengeance' AND wowhead_id = 34210;
UPDATE loot_items SET wowhead_id = 35282 WHERE name = 'Sin''dorei Band of Dominance' AND wowhead_id = 34230;
UPDATE loot_items SET wowhead_id = 35283 WHERE name = 'Sin''dorei Band of Salvation' AND wowhead_id = 34231;
UPDATE loot_items SET wowhead_id = 35284 WHERE name = 'Sin''dorei Band of Triumph' AND wowhead_id = 34229;
UPDATE loot_items SET wowhead_id = 34212 WHERE name = 'Sunglow Vest' AND wowhead_id = 34233;
UPDATE loot_items SET wowhead_id = 34234 WHERE name = 'Shadowed Gauntlets of Paroxysm' AND wowhead_id = 34214;
UPDATE loot_items SET wowhead_id = 34575 WHERE name = 'Slayer''s Boots' AND wowhead_id = 34445;

-- Remove fake items that don't exist in WoW
DELETE FROM loot_items WHERE name = 'Belt of the Wastelands' AND wowhead_id = 34195;
DELETE FROM loot_items WHERE name = 'Rhythmic Cloak of Change' AND wowhead_id = 34232;
