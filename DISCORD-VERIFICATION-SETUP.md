# Discord Server Verification Setup

This guide explains how to set up Discord server verification so you can verify that guild members are in your Discord server.

## Prerequisites

- Discord Developer Mode enabled
- Access to your Supabase database
- Your guild's Discord server

## Step 1: Get Your Discord Server ID

1. Open Discord
2. Enable Developer Mode:
   - Click the gear icon (User Settings) at the bottom left
   - Go to "Advanced" or "App Settings > Advanced"
   - Toggle on "Developer Mode"
3. Right-click on your guild's Discord server icon in the left sidebar
4. Click "Copy Server ID" (or "Copy ID")
5. Save this ID - you'll need it for the next step

## Step 2: Add Discord Server ID to Database

Run this SQL query in your Supabase SQL Editor:

```sql
-- First, run the migration to add the column if it doesn't exist
-- (This is in migrations/add-discord-server-id.sql)
ALTER TABLE guilds
ADD COLUMN IF NOT EXISTS discord_server_id VARCHAR(255);

-- Then update your guild with the Discord server ID
UPDATE guilds
SET discord_server_id = 'YOUR_DISCORD_SERVER_ID_HERE'
WHERE name = 'Your Guild Name';

-- Verify it worked
SELECT id, name, discord_server_id FROM guilds;
```

Replace:
- `YOUR_DISCORD_SERVER_ID_HERE` with the server ID you copied
- `Your Guild Name` with your actual guild name

## Step 3: How Verification Works

### User Flow:
1. User logs in with Discord OAuth (grants `guilds` and `guilds.members.read` permissions)
2. User goes to Profile Settings (`/profile/settings`)
3. User clicks "Verify Discord Server Membership" button
4. System checks if user is a member of the guild's Discord server
5. Verification status is displayed with a badge

### Technical Flow:
1. User's OAuth token is used to fetch their Discord guilds via Discord API
2. System checks if the guild's `discord_server_id` matches any of the user's guilds
3. `user_preferences` table is updated with:
   - `discord_verified: true`
   - `discord_guild_member: true/false` (based on membership)
   - `last_verified_at: timestamp`

## Step 4: OAuth Scopes

The following Discord OAuth scopes are required (already configured in `app/page.tsx`):
- `identify` - Basic Discord user info
- `email` - User's email address
- `guilds` - List of Discord servers the user is in
- `guilds.members.read` - Read guild membership info

**Important:** Users need to re-authenticate (sign out and sign back in) for the new scopes to take effect if they signed up before these scopes were added.

## Verification Badge Display

The verification badge will appear in:
- Profile page (`/profile`) - Shows if user is verified as a guild member
- Profile settings (`/profile/settings`) - Shows detailed verification status with last verified date

## Troubleshooting

### "No Discord server configured for your guild"
- Make sure you've added the `discord_server_id` to the guilds table
- Check that the guild member record is properly linked to a guild

### "No Discord guilds data available"
- User needs to re-authenticate to grant the new OAuth scopes
- Have them sign out and sign back in

### "You are not a member of the guild Discord server"
- User is authenticated but not in the Discord server
- User may need to join the Discord server first
- Or they may be in a different Discord account than they authenticated with

### Verification not updating
- Check that the `user_preferences` table has the correct RLS policies
- Verify the API route `/api/verify-discord/route.ts` is working
- Check browser console for errors

## API Endpoint

The verification endpoint is available at:
```
POST /api/verify-discord
```

This endpoint:
- Requires authentication
- Fetches user's Discord guilds using their OAuth token
- Compares against the guild's `discord_server_id`
- Updates `user_preferences` with verification status
- Returns JSON response with verification result

## Future Enhancements

Consider adding:
- Automatic verification on login
- Re-verification reminders (e.g., every 30 days)
- Role-based verification (check if user has specific Discord roles)
- Admin dashboard to see verification status of all members
- Webhook notifications when verification status changes
