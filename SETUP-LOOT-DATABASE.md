# Setting Up the Loot Database

## Why Items Aren't Showing

If you're not seeing loot items in your loot list creation or admin management screens, it's because:

1. **Loot items haven't been seeded** - The loot items need to be imported from the data file into your database
2. **No active raid tier** - At least one raid tier needs to be marked as "active" for items to show up for users

## Quick Setup (Recommended)

Run this single command to automatically set everything up:

```bash
npm run setup:loot
```

This script will:
- ✅ Find your guild ID
- ✅ Create the Classic WoW expansion
- ✅ Create all raid tiers (Molten Core, BWL, Onyxia, etc.)
- ✅ Import all 1,100+ loot items from all Classic WoW raids
- ✅ Set Blackwing Lair as the active raid tier (you can change this later)

After running this, items will immediately appear in both:
- The loot list creation page (for regular users)
- The admin loot items management page (for officers)

## Manual Setup (Advanced)

If you prefer to do it manually or need to seed specific raids:

### 1. Get Your Guild ID

Run this query in your Supabase SQL editor:

```sql
SELECT id, name FROM guilds;
```

Copy your guild ID.

### 2. Seed Loot Items

Run the seed script with your guild ID:

```bash
npm run seed:classic YOUR_GUILD_ID_HERE
```

Example:
```bash
npm run seed:classic 12345678-1234-1234-1234-123456789abc
```

This will create:
- Classic WoW expansion
- All 7 raid tiers
- All loot items from all bosses

### 3. Set Active Raid Tier

Run this query in your Supabase SQL editor to set which raid tier is currently active:

```sql
-- First, deactivate all raid tiers
UPDATE raid_tiers SET is_active = false;

-- Then activate the one you want (e.g., Blackwing Lair)
UPDATE raid_tiers
SET is_active = true
WHERE name = 'Blackwing Lair';
```

Available raid tiers:
- Molten Core
- Blackwing Lair
- Onyxia's Lair
- Zul'Gurub
- Ruins of Ahn'Qiraj
- Temple of Ahn'Qiraj
- Naxxramas

## After Setup

### Configure Items (Important!)

After seeding, you should configure your loot items:

1. **Log in as an Officer**
2. **Go to Admin > Loot Items**
3. **Configure each item:**
   - ✅ **Availability** - Toggle items on/off
   - ✅ **Classification** - Set as Reserved, Limited, or Unlimited
     - **Reserved**: Legendary items (costs 1 allocation point, no companion items allowed)
     - **Limited**: High-value items (costs 1 allocation point)
     - **Unlimited**: Normal items (costs 0 allocation points)
   - ✅ **Class Restrictions** - Define which classes can select each item
     - **Primary**: Can select as main-spec (counts toward allocation)
     - **Secondary**: Can select as off-spec (no allocation cost)

### Helper Scripts

There are optional scripts to help with initial configuration:

```bash
# Set up item classifications (Reserved, Limited, Unlimited)
npm run tsx scripts/setup-item-classification.ts

# Set up item availability (all available by default)
npm run tsx scripts/setup-loot-availability.ts
```

## Changing Active Raid Tier Later

You can change which raid tier is active at any time:

### Option 1: Via SQL (Fast)

```sql
-- Deactivate all
UPDATE raid_tiers SET is_active = false;

-- Activate the one you want
UPDATE raid_tiers
SET is_active = true
WHERE name = 'Temple of Ahn''Qiraj';
```

### Option 2: Via Admin Panel (Coming Soon)

We'll be adding a UI for this in the admin panel.

## Troubleshooting

### Items still not showing?

1. **Check if items were seeded:**
   ```sql
   SELECT COUNT(*) FROM loot_items;
   ```
   Should return 1,100+ items.

2. **Check if a raid tier is active:**
   ```sql
   SELECT name, is_active FROM raid_tiers;
   ```
   At least one should have `is_active = true`.

3. **Check if items are available:**
   ```sql
   SELECT COUNT(*) FROM loot_items WHERE is_available = true;
   ```
   Should return a number > 0.

4. **Check if raid tier has an expansion:**
   ```sql
   SELECT rt.name, e.name
   FROM raid_tiers rt
   JOIN expansions e ON rt.expansion_id = e.id;
   ```
   All raid tiers should be linked to "Classic WoW" expansion.

5. **Check if expansion is linked to your guild:**
   ```sql
   SELECT e.name, g.name
   FROM expansions e
   JOIN guilds g ON e.guild_id = g.id;
   ```
   The expansion should be linked to your guild.

### Still having issues?

Check the browser console (F12) for any error messages when loading the loot list or admin pages.

## Database Schema Reference

Here's how loot items are structured:

```
guilds
  └── expansions (Classic WoW)
        └── raid_tiers (Molten Core, BWL, etc.)
              └── loot_items (All boss loot)
                    └── loot_item_classes (Class restrictions)
```

Key fields:
- `loot_items.raid_tier_id` - Links to raid tier
- `loot_items.is_available` - Must be true to show up
- `raid_tiers.is_active` - Only items from active tiers show in loot lists
- `raid_tiers.expansion_id` - Links to expansion
- `expansions.guild_id` - Links to guild

## Complete Loot Database

After running the setup, you'll have:

- **Molten Core**: 10 bosses, 200+ items
- **Blackwing Lair**: 8 bosses, 160+ items (NOW WITH CORRECT TIER 2 DROPS!)
- **Onyxia's Lair**: 1 boss, 17 items
- **Zul'Gurub**: 10 bosses, 90+ items
- **Ruins of Ahn'Qiraj**: 6 bosses, 60+ items
- **Temple of Ahn'Qiraj**: 9 bosses, 110+ items
- **Naxxramas**: 15 bosses, 100+ items

**Total: ~1,100+ epic items!**
