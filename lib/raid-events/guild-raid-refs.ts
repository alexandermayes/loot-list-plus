/**
 * Server-side guild checks for the expansion and raid team that
 * /api/raid-events/ensure and /api/raid-events/bonus write into new raid
 * events, plus the raid tier lookup both routes share.
 *
 * Both routes write with the service role, which bypasses RLS, so these
 * checks keep a new raid event's tier and team inside the guild the request
 * was verified for. An expansion belongs to a guild only when
 * expansions.guild_id equals that guild, so an expansion with no guild
 * (kept, detached, when its guild was deleted) belongs to no guild and is
 * refused. Every query error is thrown, never treated as "not found".
 *
 * Quick task 261004-u8w.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryClient = SupabaseClient<any, any, any>

// Identical to UUID_PATTERN in lib/loot/guild-award-refs.ts, duplicated
// rather than exported so that module stays unchanged.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** 400 when the expansion sent is not one of the guild's expansions. */
export const RAID_EVENT_EXPANSION_NOT_IN_GUILD_ERROR =
  "This expansion isn't in this guild. Refresh the page, then try again."

/** 400 when the raid team sent is not one of the guild's teams. */
export const RAID_EVENT_TEAM_NOT_IN_GUILD_ERROR =
  "This raid team isn't in this guild. Refresh the page, then try again."

export interface GuildExpansionRef {
  id: string
  current_phase: number | null
}

/**
 * Finds the expansions row for expansionId, scoped to guildId. A value
 * that is not a string matching UUID_PATTERN returns null with no query.
 * A detached expansion (guild_id NULL) never matches the eq guild_id
 * filter, so it returns null too.
 *
 * Throws if the underlying query errors.
 */
export async function findGuildExpansion(
  supabase: QueryClient,
  guildId: string,
  expansionId: unknown
): Promise<GuildExpansionRef | null> {
  if (typeof expansionId !== 'string' || !UUID_PATTERN.test(expansionId)) {
    return null
  }

  const { data, error } = await supabase
    .from('expansions')
    .select('id, current_phase')
    .eq('id', expansionId)
    .eq('guild_id', guildId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to look up expansion ${expansionId} for guild ${guildId}: ${error.message}`)
  }

  if (!data) return null
  return { id: data.id, current_phase: data.current_phase }
}

/**
 * Returns whether teamId is a raid_teams row belonging to guildId. A value
 * that is not a string matching UUID_PATTERN returns false with no query.
 *
 * Throws if the underlying query errors.
 */
export async function isGuildRaidTeam(
  supabase: QueryClient,
  guildId: string,
  teamId: unknown
): Promise<boolean> {
  if (typeof teamId !== 'string' || !UUID_PATTERN.test(teamId)) {
    return false
  }

  const { data, error } = await supabase
    .from('raid_teams')
    .select('id')
    .eq('id', teamId)
    .eq('guild_id', guildId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to look up raid team ${teamId} for guild ${guildId}: ${error.message}`)
  }

  return data !== null
}

/**
 * Picks a raid tier id for expansion, using the existing four-step
 * fallback chain of both routes in the existing order. Callers pass only a
 * verified expansion (from findGuildExpansion), so every tier it returns
 * belongs to the guild. currentPhase is expansion.current_phase or 1 when
 * null or 0 (same as today's current_phase || 1).
 *
 * A step whose query errors throws at once and the later steps do not run
 * (today an error falls through to the next step, which can pick a
 * different tier).
 */
export async function resolveGuildRaidTierId(
  supabase: QueryClient,
  expansion: GuildExpansionRef
): Promise<string | null> {
  const currentPhase = expansion.current_phase || 1

  // Step 1: phase currentPhase, is_guild_active true
  const { data: activeForPhase, error: activeForPhaseError } = await supabase
    .from('raid_tiers')
    .select('id')
    .eq('expansion_id', expansion.id)
    .eq('phase', currentPhase)
    .eq('is_guild_active', true)
    .limit(1)
    .maybeSingle()
  if (activeForPhaseError) {
    throw new Error(`Failed to look up raid tier for expansion ${expansion.id}: ${activeForPhaseError.message}`)
  }
  if (activeForPhase?.id) return activeForPhase.id

  // Step 2: phase currentPhase, any
  const { data: anyForPhase, error: anyForPhaseError } = await supabase
    .from('raid_tiers')
    .select('id')
    .eq('expansion_id', expansion.id)
    .eq('phase', currentPhase)
    .limit(1)
    .maybeSingle()
  if (anyForPhaseError) {
    throw new Error(`Failed to look up raid tier for expansion ${expansion.id}: ${anyForPhaseError.message}`)
  }
  if (anyForPhase?.id) return anyForPhase.id

  // Step 3: is_guild_active true, any phase
  const { data: anyActive, error: anyActiveError } = await supabase
    .from('raid_tiers')
    .select('id')
    .eq('expansion_id', expansion.id)
    .eq('is_guild_active', true)
    .limit(1)
    .maybeSingle()
  if (anyActiveError) {
    throw new Error(`Failed to look up raid tier for expansion ${expansion.id}: ${anyActiveError.message}`)
  }
  if (anyActive?.id) return anyActive.id

  // Step 4: any tier for the expansion
  const { data: lastResort, error: lastResortError } = await supabase
    .from('raid_tiers')
    .select('id')
    .eq('expansion_id', expansion.id)
    .limit(1)
    .maybeSingle()
  if (lastResortError) {
    throw new Error(`Failed to look up raid tier for expansion ${expansion.id}: ${lastResortError.message}`)
  }
  return lastResort?.id ?? null
}
