/**
 * Guild join records (server only).
 *
 * A join record is the server's record that a user proved the right to join a
 * guild (an invite code or a verified Discord server membership) before they
 * had a character. It lives in public.guild_join_grants, which only the
 * service role can read or write.
 *
 * A character is added to a guild only for:
 * - the guild's creator (guilds.created_by, which only the server changes),
 * - a user who already has another character with an active membership in the
 *   guild (alts), or
 * - a user holding an unconsumed, unexpired join record for the guild.
 *
 * Each function takes the service-role client as its first argument. Log
 * messages are constant strings with no interpolated values.
 *
 * Not exported from the domain/guild barrel: that barrel is imported by client
 * code.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/** A join record is valid for this many days after the join. */
export const GUILD_JOIN_GRANT_TTL_DAYS = 30

/** How the user joined: the joined_via values the join routes write. */
export type GuildJoinGrantSource = 'invite_code' | 'discord_verify'

export type GuildJoinAccess =
  | { allowed: true; via: 'creator' | 'member' | 'grant' }
  | { allowed: false }

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Record that the user joined the guild. Upserts the single row for the user
 * and guild, so a new join starts a fresh window and reopens a used record.
 * Returns the write error, if any, for the caller to handle.
 */
export async function recordGuildJoinGrant(
  supabase: SupabaseClient,
  args: { userId: string; guildId: string; source: GuildJoinGrantSource; now?: Date },
): Promise<{ error: unknown }> {
  const now = args.now ?? new Date()
  const expiresAt = new Date(now.getTime() + GUILD_JOIN_GRANT_TTL_DAYS * DAY_MS)

  const { error } = await supabase.from('guild_join_grants').upsert(
    {
      user_id: args.userId,
      guild_id: args.guildId,
      source: args.source,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      consumed_at: null,
    },
    { onConflict: 'user_id,guild_id' },
  )

  return { error: error ?? null }
}

/**
 * Decide whether the user may add a character to the guild. Checks, in order,
 * the creator, an active membership of another of the user's characters
 * (excludeCharacterId is left out, so a character never vouches for itself),
 * and an unconsumed, unexpired join record. A guild that does not exist is not
 * allowed, so callers answer the same way whether or not it exists.
 *
 * Throws on any lookup error so the caller fails closed.
 */
export async function resolveGuildJoinAccess(
  supabase: SupabaseClient,
  args: { userId: string; guildId: string; excludeCharacterId?: string; now?: Date },
): Promise<GuildJoinAccess> {
  const now = args.now ?? new Date()

  const { data: guild, error: guildError } = await supabase
    .from('guilds')
    .select('created_by')
    .eq('id', args.guildId)
    .maybeSingle()
  if (guildError) {
    throw new Error('Failed to check guild join access')
  }
  if (!guild) {
    return { allowed: false }
  }
  if (guild.created_by === args.userId) {
    return { allowed: true, via: 'creator' }
  }

  const { data: characters, error: charactersError } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', args.userId)
  if (charactersError) {
    throw new Error('Failed to check guild join access')
  }

  const otherCharacterIds = ((characters ?? []) as Array<{ id: string }>)
    .map(c => c.id)
    .filter(id => id !== args.excludeCharacterId)

  if (otherCharacterIds.length > 0) {
    let membershipQuery = supabase
      .from('character_guild_memberships')
      .select('id')
      .eq('guild_id', args.guildId)
      .eq('is_active', true)
      .in('character_id', otherCharacterIds)
    if (args.excludeCharacterId) {
      membershipQuery = membershipQuery.neq('character_id', args.excludeCharacterId)
    }
    const { data: memberships, error: membershipError } = await membershipQuery.limit(1)
    if (membershipError) {
      throw new Error('Failed to check guild join access')
    }
    if (memberships && memberships.length > 0) {
      return { allowed: true, via: 'member' }
    }
  }

  const { data: grant, error: grantError } = await supabase
    .from('guild_join_grants')
    .select('user_id')
    .eq('user_id', args.userId)
    .eq('guild_id', args.guildId)
    .is('consumed_at', null)
    .gt('expires_at', now.toISOString())
    .maybeSingle()
  if (grantError) {
    throw new Error('Failed to check guild join access')
  }
  if (grant) {
    return { allowed: true, via: 'grant' }
  }

  return { allowed: false }
}

/**
 * Use up the user's join record for the guild. Called after every successful
 * membership write that leaves the user active in the guild, whichever path
 * allowed it, so a record cannot bring the user back after they are removed
 * or leave: they need a new invite or Discord join.
 *
 * The access check and this update are separate statements, so two parallel
 * requests can both pass the check before either consumes the record. That is
 * accepted: once the first membership write lands, the member path allows
 * further characters for the user anyway.
 *
 * A failure is logged and not thrown: the membership is already written.
 */
export async function consumeGuildJoinGrant(
  supabase: SupabaseClient,
  args: { userId: string; guildId: string; now?: Date },
): Promise<void> {
  const now = args.now ?? new Date()

  const { error } = await supabase
    .from('guild_join_grants')
    .update({ consumed_at: now.toISOString() })
    .eq('user_id', args.userId)
    .eq('guild_id', args.guildId)
    .is('consumed_at', null)

  if (error) {
    console.error('Failed to consume guild join record')
  }
}
