# Item Classification Setup

This guide explains how to add item classification and validation rules to your loot system.

## Step 1: Add Database Columns

You need to add three columns to the `loot_items` table in Supabase:

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Table Editor** > **loot_items**
3. Click **Add Column** and create:

   **Column 1: classification**
   - Name: `classification`
   - Type: `text`
   - Default value: `Unlimited`
   - Allow nullable: No

   **Column 2: item_type**
   - Name: `item_type`
   - Type: `text`
   - Allow nullable: Yes

   **Column 3: allocation_cost**
   - Name: `allocation_cost`
   - Type: `int4`
   - Default value: `0`
   - Allow nullable: No

### Option B: Using SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `scripts/add-item-classification.sql`
4. Click **Run**

## Step 2: Populate Classification Data

After adding the columns, run the setup script:

```bash
npx tsx scripts/setup-item-classification.ts
```

This will:
- Classify all existing items as Reserved, Limited, or Unlimited
- Assign item types for duplicate detection
- Set allocation costs (Reserved/Limited = 1 point, Unlimited = 0 points)

## Step 3: Verify

The script will show a summary like:

```
✅ Updated 129 items successfully

📊 Classification Summary:
   Reserved: 0
   Limited: 45
   Unlimited: 84
```

## Classification Rules

- **Reserved** (1 allocation point): Legendary items, highly contested items
- **Limited** (1 allocation point): Tier set pieces, high-value weapons/trinkets
- **Unlimited** (0 allocation points): Standard loot

## Bracket Validation Rules

Once set up, the system will enforce:

1. **Maximum 3 allocation points per bracket** (Brackets 1-4 only)
2. **No duplicate item types** within the same bracket (e.g., can't select two one-handed swords in Bracket 1)
3. **Reserved items** must be the only item in their desirability level
4. **Off-spec** (ranks 1-24) has no restrictions

## Next Steps

After completing the database setup, the loot list page will automatically display validation warnings and enforce these rules.
