# Class Specs Setup Guide

This guide explains how to add class specialization support to your loot management system.

## Overview

Instead of restricting items by just class (e.g., "Paladin"), you can now restrict by specific specs (e.g., "Holy Paladin", "Retribution Paladin", "Protection Paladin"). This allows for more granular loot distribution control.

## Step 1: Add Database Tables

Run the SQL migration in Supabase Dashboard:

1. Go to **Supabase Dashboard** > **SQL Editor**
2. Copy and paste from `scripts/add-class-specs.sql`
3. Click **Run**

This creates:
- `class_specs` table - Stores spec definitions (Holy Paladin, Shadow Priest, etc.)
- `spec_id` column in `loot_item_classes` - Links items to specific specs

## Step 2: Seed Class Specs

Run the seeding script to populate the class specs:

```bash
npx tsx scripts/seed-class-specs.ts
```

This will create specs for all classes based on the Google Sheet structure:

**Paladin**
- Holy
- Retribution
- Protection

**Priest**
- Holy/Disc
- Shadow

**Shaman**
- Restoration
- Elemental
- Enhancement

**Druid**
- Restoration
- Feral
- Balance

**Warrior**
- Protection
- Arms/Fury

**Hunter, Mage, Warlock, Rogue**
- Single spec per class

**Death Knight** (if applicable)
- Blood
- Frost/Unholy

## Step 3: Configure Item Restrictions

1. Go to `/admin/loot-items`
2. Click "Edit Classes" on any item
3. You'll now see specs grouped by class:

### Primary Specs (Green)
- Select specific specs that can use this item as **main-spec**
- Items count toward 3-point bracket allocation limit
- Example: "Judgement Crown" → Select "Holy Paladin" and "Protection Paladin"

### Secondary Specs (Yellow)
- Select specific specs that can use this item as **off-spec**
- No allocation cost
- Example: "Judgement Crown" → Select "Retribution Paladin" for off-spec healing

### No Selection
- If a spec is not selected (neither primary nor secondary), the item won't appear for that spec

## How It Works

### Before (Class-based):
- Item restricted to "Paladin" (all specs see it)

### After (Spec-based):
- Item restricted to "Holy Paladin" and "Protection Paladin" only
- Retribution Paladins won't see this item in their loot list

## Benefits

1. **More precise loot distribution** - Healers don't see tank gear, tanks don't see healer gear
2. **Prevents confusion** - Players only see items relevant to their spec
3. **Matches your Google Sheet** - Now supports the Class Spec column from your sheet
4. **Flexible off-spec** - Can mark items as secondary for off-spec roles

## Migration Notes

- Existing class restrictions (without specs) will continue to work
- The system checks both `class_id` and `spec_id` in filtering
- You can gradually migrate items to use spec restrictions

## Example Configurations

**Healing Trinket** (Nelth's Tear):
- Primary: Holy Paladin, Holy/Disc Priest, Restoration Shaman, Restoration Druid
- Secondary: (empty)

**Tank Weapon** (Thunderfury):
- Primary: Protection Warrior, Protection Paladin
- Secondary: Arms/Fury Warrior (for off-spec tanking)

**DPS Caster Item** (Tier 2 Mage Helm):
- Primary: Mage
- Secondary: (empty)

## Verification

After setup, test by:
1. Viewing the loot list as different classes
2. Verifying only appropriate specs see each item
3. Checking that bracket validation still works with spec restrictions
