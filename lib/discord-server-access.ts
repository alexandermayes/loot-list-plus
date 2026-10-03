// Discord server access: a Discord server can be linked to a guild only by
// someone who owns it or has Administrator or Manage Server in it. This is
// the same rule the create-guild server picker (GET /api/discord-servers)
// applies, checked with the signed-in user's own Discord sign-in.
import { createClient } from '@/utils/supabase/server'

const DISCORD_USER_GUILDS_URL = 'https://discord.com/api/v10/users/@me/guilds'
const ADMINISTRATOR = BigInt(0x8)
const MANAGE_GUILD = BigInt(0x20)

/** The fields of a Discord guild object (GET /users/@me/guilds) the manage rule reads. */
export interface DiscordGuildAccess {
  owner?: boolean | null
  permissions?: string | null
}

/** Why the signed-in user cannot link a Discord server. */
export type DiscordServerAccessReason = 'not_manager' | 'token_expired' | 'rate_limited' | 'discord_error'

export type DiscordServerAccessResult = { ok: true } | { ok: false; reason: DiscordServerAccessReason }

/**
 * True when the user owns the Discord server or has Administrator (0x8) or
 * Manage Server (0x20) in it. A permissions string that cannot be parsed
 * counts as no permissions.
 *
 * @param guild - a guild object from GET /users/@me/guilds
 * @returns whether the user may manage that server
 */
export function canManageDiscordServer(guild: DiscordGuildAccess): boolean {
  if (guild.owner === true) return true
  let permissions: bigint
  try {
    permissions = BigInt(guild.permissions || '0')
  } catch {
    return false
  }
  return (permissions & ADMINISTRATOR) === ADMINISTRATOR || (permissions & MANAGE_GUILD) === MANAGE_GUILD
}

/**
 * The signed-in user's Discord token from the Supabase session. When the
 * session has none, tries one session refresh (the same steps as
 * getDiscordToken in app/api/discord-guilds/route.ts).
 */
async function getUserDiscordToken(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.provider_token) {
    return session.provider_token
  }

  const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession()
  if (error) {
    return null
  }
  return refreshedSession?.provider_token || null
}

/**
 * Checks, with the signed-in user's Discord token, that the user owns or
 * manages the Discord server with this id.
 *
 * @param serverId - the Discord server id (digits only)
 * @returns { ok: true }, or { ok: false, reason } with reason not_manager,
 *   token_expired, rate_limited or discord_error
 */
export async function checkUserManagesDiscordServer(serverId: string): Promise<DiscordServerAccessResult> {
  if (!/^\d+$/.test(serverId)) {
    return { ok: false, reason: 'not_manager' }
  }

  const token = await getUserDiscordToken()
  if (!token) {
    return { ok: false, reason: 'token_expired' }
  }

  let guilds: unknown
  try {
    const response = await fetch(DISCORD_USER_GUILDS_URL, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.status === 429) {
      return { ok: false, reason: 'rate_limited' }
    }
    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: 'token_expired' }
    }
    if (!response.ok) {
      console.error('Discord server access check failed:', response.status)
      return { ok: false, reason: 'discord_error' }
    }
    guilds = await response.json()
  } catch (error) {
    console.error('Discord server access check error:', error)
    return { ok: false, reason: 'discord_error' }
  }

  if (!Array.isArray(guilds)) {
    console.error('Discord server access check got an unexpected response')
    return { ok: false, reason: 'discord_error' }
  }

  const managed = guilds.some(
    (guild) =>
      guild !== null &&
      typeof guild === 'object' &&
      (guild as { id?: unknown }).id === serverId &&
      canManageDiscordServer(guild as DiscordGuildAccess)
  )
  return managed ? { ok: true } : { ok: false, reason: 'not_manager' }
}

/**
 * The HTTP status and JSON body a route returns when the access check fails.
 *
 * @param reason - the reason from checkUserManagesDiscordServer
 * @returns { status, body } for NextResponse.json(body, { status })
 */
export function discordServerAccessError(reason: DiscordServerAccessReason): {
  status: number
  body: { error: string; code?: string }
} {
  switch (reason) {
    case 'token_expired':
      return {
        status: 403,
        body: {
          error: 'Discord connection expired. Please log in again to reconnect.',
          code: 'discord_token_expired',
        },
      }
    case 'rate_limited':
      return {
        status: 429,
        body: { error: 'Discord rate limit reached. Please wait a moment and try again.' },
      }
    case 'discord_error':
      return {
        status: 502,
        body: { error: "Couldn't check your Discord server permissions. Try again." },
      }
    case 'not_manager':
    default:
      return {
        status: 403,
        body: { error: 'You can only link a Discord server where you have the Manage Server permission.' },
      }
  }
}
