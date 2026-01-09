# Database Seeding Scripts

This directory contains scripts to seed your database with Classic WoW raid and loot data.

## Classic WoW Raid Seeding

### Overview

The `seed-classic-raids.ts` script populates your database with:
- **7 Classic WoW raids**: Molten Core, Blackwing Lair, Onyxia's Lair, Zul'Gurub, Temple of Ahn'Qiraj, Ruins of Ahn'Qiraj, and Naxxramas
- **Boss encounters** for each raid
- **Loot items** with Wowhead IDs, item slots, and boss assignments

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your environment variables in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

   > **Important**: You need the `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) to bypass Row Level Security and insert data. Find this in your Supabase dashboard under Settings > API.

3. Ensure your database has the following tables:
   - `guilds`
   - `expansions`
   - `raid_tiers`
   - `loot_items`

### Usage

#### Get Your Guild ID

First, you need to find your guild's ID. You can do this by:

1. Going to your Supabase dashboard
2. Navigate to the Table Editor
3. Open the `guilds` table
4. Copy the `id` column value for your guild

Or query it via SQL:
```sql
SELECT id, name FROM guilds;
```

#### Run the Seeding Script

```bash
npm run seed:classic <your_guild_id>
```

Example:
```bash
npm run seed:classic 12345678-1234-1234-1234-123456789abc
```

### What It Does

1. **Validates** that the specified guild exists
2. **Creates or finds** a "Classic WoW" expansion for your guild
3. **Creates raid tiers** for each of the 7 Classic WoW raids
4. **Inserts loot items** for each boss encounter

### Output

You'll see a progress log like this:
```
🎮 Starting Classic WoW raid seeding for guild: 12345678-1234-1234-1234-123456789abc
✅ Found guild: Your Guild Name
✅ Created Classic WoW expansion: abc-def-ghi

📁 Processing raid: Molten Core
  ✅ Created raid tier: xyz-123-456
  ✅ Inserted 95 loot items

📁 Processing raid: Blackwing Lair
  ✅ Created raid tier: def-456-789
  ✅ Inserted 42 loot items

...

🎉 Seeding complete!
📊 Summary:
   - Raids: 7
   - Bosses: 40
   - Loot Items: 200+
```

### Re-running the Script

If you run the script again:
- It will **reuse** the existing "Classic WoW" expansion
- It will **reuse** existing raid tiers
- It will **replace** all loot items (deletes old items and inserts fresh data)

This is useful if you need to update the loot data or fix any errors.

### Data Source

All data is sourced from [Wowhead Classic](https://www.wowhead.com/classic) and stored in `/data/classic-wow-raids.ts`.

### Troubleshooting

**Error: Guild not found**
- Double-check your guild ID
- Make sure the guild exists in your `guilds` table

**Error: Missing environment variables**
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- The service role key is required (not the anon key)

**Error: relation "raid_tiers" does not exist**
- Your database schema might be incomplete
- Check that all required tables are created
- Review your migration files or create the tables manually

### Customizing Data

You can modify the raid and loot data by editing `/data/classic-wow-raids.ts`. The data structure is:

```typescript
{
  name: 'Raid Name',
  tier: 'Tier 1',
  bosses: [
    {
      name: 'Boss Name',
      items: [
        {
          name: 'Item Name',
          slot: 'Head',
          wowhead_id: 12345
        }
      ]
    }
  ]
}
```

After making changes, re-run the seeding script to update your database.
