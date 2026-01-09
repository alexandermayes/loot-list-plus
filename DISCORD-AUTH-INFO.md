# Discord OAuth Information Available

## What Supabase Gets from Discord OAuth

When a user signs in with Discord through Supabase Auth, the following information is stored in the `user.user_metadata` object:

### Currently Used in Your App:
Based on your code, you're currently accessing:

```typescript
user.user_metadata.provider_id    // Discord user ID
user.user_metadata.avatar_url     // Discord avatar hash
user.user_metadata.full_name      // Discord username
```

### Full Discord OAuth Data Available:

Discord provides the following data through OAuth (when using the `identify` scope):

```typescript
{
  id: string                    // Discord user ID
  username: string              // Discord username (e.g., "john_doe")
  discriminator: string         // Legacy discriminator (e.g., "0000")
  global_name: string | null    // Display name (e.g., "John Doe")
  avatar: string | null         // Avatar hash
  email: string | null          // Email (requires 'email' scope)
  verified: boolean | null      // Email verified status
  locale?: string              // User's locale (e.g., "en-US")
  mfa_enabled?: boolean        // 2FA enabled status
  premium_type?: number        // Nitro subscription type
  public_flags?: number        // User flags
  avatar_decoration?: string   // Avatar decoration hash
  banner?: string | null       // Profile banner hash
  banner_color?: string | null // Profile banner color
}
```

## What Supabase Stores

Supabase automatically maps Discord data to:

```typescript
// In auth.users table
{
  id: uuid                      // Supabase user ID
  email: string | null          // From Discord email
  raw_user_meta_data: {         // All Discord data
    provider_id: string         // Discord ID
    avatar_url: string          // Discord avatar hash
    full_name: string           // Discord username/display name
    name: string                // Discord username
    email: string               // Discord email
    email_verified: boolean     // Discord email verification
    // ... all other Discord fields
  },
  user_metadata: {              // Editable by user
    // Initially empty or copied from raw_user_meta_data
  }
}
```

## Available Scopes

You can request additional Discord OAuth scopes:

1. **identify** (default) - Basic user info (username, ID, avatar)
2. **email** - User's email address
3. **guilds** - List of user's Discord servers
4. **guilds.members.read** - Guild member info (roles, nickname)
5. **connections** - Connected accounts (Steam, Spotify, etc.)

## Current Implementation

In your `app/page.tsx`:
```typescript
await supabase.auth.signInWithOAuth({
  provider: 'discord',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    scopes: 'identify email' // Add more scopes if needed
  }
})
```

## Recommended Profile Fields

For a WoW guild loot management system, consider showing:

### From Discord:
- ✅ Avatar (already implemented)
- ✅ Display name/username (already implemented)
- 📧 Email (if verified)
- 🎮 Discord ID (for officer verification)

### From Your Database (guild_members):
- ✅ Character name (already implemented)
- ✅ Class (already implemented)
- ✅ Role (Officer/Member/etc.) (already implemented)
- 📊 Attendance score
- 📋 Loot submission status
- 📅 Join date

## Accessing User Data

```typescript
// Get current user
const { data: { user } } = await supabase.auth.getUser()

// Access Discord data
const discordId = user?.user_metadata?.provider_id
const avatar = user?.user_metadata?.avatar_url
const username = user?.user_metadata?.full_name || user?.user_metadata?.name
const email = user?.email

// Build avatar URL
const avatarUrl = `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png`
// Or with size parameter:
const avatarUrl = `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=256`
```

## Additional Discord Data You Could Request

If you want more Discord integration:

### Guild Integration (requires 'guilds' scope):
```typescript
// Could verify user is in your Discord server
// Could sync Discord roles to app roles
// Could display Discord server nickname
```

### Connections (requires 'connections' scope):
```typescript
// Could show user's Battle.net account
// Could link to their Warcraft Logs
// Could display other gaming profiles
```

## Privacy Considerations

- Email should be optional and not required for basic functionality
- Discord ID is useful for officer verification but should not be publicly displayed
- Avatar URLs are public and safe to display
- Consider adding a privacy settings page for users to control what's shown

## Next Steps

Would you like to:
1. Create a user profile page showing Discord + WoW character info?
2. Add more Discord scopes (like guilds to verify server membership)?
3. Create a profile settings page where users can update preferences?
4. Add Discord role syncing with your app roles?
