-- Fix Tempest Keep phase assignment (name includes ": The Eye")
UPDATE raid_tiers SET phase = 2 WHERE name ILIKE '%tempest%';
