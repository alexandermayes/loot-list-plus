'use client'

import useSWR, { SWRConfiguration } from 'swr'

// Generic fetcher for API routes
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    throw error
  }
  return res.json()
}

// Default SWR config with sensible caching defaults
// Disabled focus/reconnect revalidation to prevent data loss when users tab away
// (e.g., when switching to game to export data and back to paste it)
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: false, // Don't refetch on window focus
  revalidateIfStale: true,
  revalidateOnReconnect: false, // Don't refetch when browser reconnects (prevents refresh on tab switch)
  dedupingInterval: 5000, // Dedupe requests within 5 seconds
  errorRetryCount: 3,
}

// Types
export interface Character {
  id: string
  user_id: string
  name: string
  realm: string | null
  class_id: string | null
  spec_id: string | null
  level: number | null
  is_main: boolean
  region: string
  created_at: string
  class?: {
    id: string
    name: string
    color_hex: string
  }
  spec?: {
    id: string
    name: string
  } | null
}

export interface Guild {
  id: string
  name: string
  realm: string | null
  faction: string
  discord_server_id: string | null
  created_by: string
  is_active: boolean
}

export interface GuildMembership {
  membership_id: string
  character_id: string
  character_name: string
  role: string
  joined_at: string
  guild: Guild
}

export interface GuildMember {
  user_id: string
  role: string
  joined_at: string
  joined_via: string
  characters: {
    id: string
    name: string
    is_main: boolean
    class?: { name: string; color_hex: string }
    spec?: { name: string } | null
  }[]
  mainCharacter: {
    id: string
    name: string
    is_main: boolean
    class?: { name: string; color_hex: string }
    spec?: { name: string } | null
  } | null
  discordName: string
}

// === Character Hooks ===

/**
 * Fetch current user's characters with caching
 * Cache: 30 seconds stale time, background revalidation
 */
export function useCharacters(options?: SWRConfiguration) {
  return useSWR<{ characters: Character[] }>(
    '/api/characters',
    fetcher,
    {
      ...swrConfig,
      refreshInterval: 30000, // Revalidate every 30 seconds in background
      ...options,
    }
  )
}

// === Guild Hooks ===

/**
 * Fetch current user's guilds with caching
 * Cache: 30 seconds stale time, background revalidation
 */
export function useGuilds(options?: SWRConfiguration) {
  return useSWR<{ guilds: GuildMembership[] }>(
    '/api/guilds',
    fetcher,
    {
      ...swrConfig,
      refreshInterval: 30000,
      ...options,
    }
  )
}

/**
 * Fetch guild members with caching
 * @param guildId - The guild ID to fetch members for
 */
export function useGuildMembers(guildId: string | null, options?: SWRConfiguration) {
  return useSWR<{ members: GuildMember[] }>(
    guildId ? `/api/guild-members?guild_id=${guildId}` : null,
    fetcher,
    {
      ...swrConfig,
      refreshInterval: 60000, // Revalidate every 60 seconds (member data changes less frequently)
      ...options,
    }
  )
}

// === Loot List Hooks ===

export interface LootItem {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
  classification?: string
  item_type?: string
  armor_type?: string  // Cloth, Leather, Mail, Plate
  weapon_type?: string // Dagger, One-Handed Sword, Staff, etc.
  allocation_cost?: number
  roles?: string[]
  raid_tier_id?: string
  raid_tier_name?: string | null  // Populated by phase-based queries
  loot_item_classes?: {
    class_id: string
    spec_id: string | null
    spec_type: string | null
  }[]
  consensus_count?: number  // Number of OTHER guildmates who ranked this item
}

export interface LootSubmission {
  id: string
  status: string
  submitted_at: string | null
  review_notes: string | null
  expansion_id?: string
  phase?: number
}

export interface RaidTier {
  id: string
  name: string
  is_active: boolean
  is_guild_active?: boolean
  submission_deadline: string | null
  phase?: number
}

/**
 * Fetch loot items for a specific raid tier
 * @param tierId - The raid tier ID
 * @param characterId - The character ID (for spec filtering on server)
 * @param guildId - The guild ID (for consensus counts from other guildmates)
 */
export function useLootItems(
  tierId: string | null,
  characterId: string | null,
  guildId?: string | null,
  options?: SWRConfiguration
) {
  const url = tierId && characterId
    ? `/api/loot-items?tier_id=${tierId}&character_id=${characterId}${guildId ? `&guild_id=${guildId}` : ''}`
    : null

  return useSWR<{ items: LootItem[] }>(
    url,
    fetcher,
    {
      ...swrConfig,
      revalidateOnFocus: false, // Prevent refetch on tab switch
      dedupingInterval: 10000, // Longer dedup for loot items
      ...options,
    }
  )
}

/**
 * Fetch raid tiers for an expansion
 * @param expansionId - The expansion ID
 * @param guildId - The guild ID
 * @param includeAllPhases - If true, returns all phases (for admin views). If false/undefined, filters to unlocked phases only.
 */
export function useRaidTiers(
  expansionId: string | null,
  guildId: string | null,
  includeAllPhases?: boolean,
  options?: SWRConfiguration
) {
  const url = expansionId && guildId
    ? `/api/raid-tiers?expansion_id=${expansionId}&guild_id=${guildId}${includeAllPhases ? '&includeAllPhases=true' : ''}`
    : null

  return useSWR<{ tiers: RaidTier[]; current_phase?: number }>(
    url,
    fetcher,
    {
      ...swrConfig,
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Tiers change rarely
      ...options,
    }
  )
}

/**
 * Fetch loot submission for a character/tier
 * @param characterId - The character ID
 * @param tierId - The raid tier ID
 * @param guildId - The guild ID
 */
export function useLootSubmission(
  characterId: string | null,
  tierId: string | null,
  guildId: string | null,
  options?: SWRConfiguration
) {
  return useSWR<{ submission: LootSubmission | null; rankings: Record<string, string> }>(
    characterId && tierId && guildId
      ? `/api/loot-submissions?character_id=${characterId}&tier_id=${tierId}&guild_id=${guildId}`
      : null,
    fetcher,
    {
      ...swrConfig,
      revalidateOnFocus: false,
      revalidateIfStale: false, // Don't auto-revalidate - we manage saves manually
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // 30 second deduping to prevent rapid refetches
      ...options,
    }
  )
}

/**
 * Fetch submission statuses for all tiers
 * @param characterId - The character ID
 * @param guildId - The guild ID
 * @param tierIds - Array of tier IDs to fetch statuses for
 */
export function useTierSubmissionStatuses(
  characterId: string | null,
  guildId: string | null,
  tierIds: string[],
  options?: SWRConfiguration
) {
  const key = characterId && guildId && tierIds.length > 0
    ? `/api/loot-submissions/statuses?character_id=${characterId}&guild_id=${guildId}&tier_ids=${tierIds.join(',')}`
    : null

  return useSWR<{ statuses: Record<string, { status: string; submitted_at: string | null }> }>(
    key,
    fetcher,
    {
      ...swrConfig,
      refreshInterval: 30000, // Refresh every 30 seconds to catch officer updates
      ...options,
    }
  )
}

// === Phase-Based Loot List Hooks ===

export interface PhaseLootItem extends LootItem {
  raid_tier_id: string
  raid_tier_name?: string | null
}

/**
 * Fetch loot items for all active tiers in a phase
 * @param expansionId - The expansion ID
 * @param phase - The phase number
 * @param characterId - The character ID (for spec filtering)
 * @param guildId - The guild ID (for consensus counts + active tier filtering)
 */
export function usePhaseLootItems(
  expansionId: string | null,
  phase: number | null,
  characterId: string | null,
  guildId: string | null,
  options?: SWRConfiguration
) {
  const url = expansionId && phase !== null && characterId && guildId
    ? `/api/loot-items?expansion_id=${expansionId}&phase=${phase}&character_id=${characterId}&guild_id=${guildId}`
    : null

  return useSWR<{ items: PhaseLootItem[] }>(
    url,
    fetcher,
    {
      ...swrConfig,
      revalidateOnFocus: false,
      dedupingInterval: 10000,
      ...options,
    }
  )
}

/**
 * Fetch loot submission for a character/phase
 * @param characterId - The character ID
 * @param expansionId - The expansion ID
 * @param phase - The phase number
 * @param guildId - The guild ID
 */
export function usePhaseSubmission(
  characterId: string | null,
  expansionId: string | null,
  phase: number | null,
  guildId: string | null,
  options?: SWRConfiguration
) {
  return useSWR<{ submission: LootSubmission | null; rankings: Record<string, string> }>(
    characterId && expansionId && phase !== null && guildId
      ? `/api/loot-submissions?character_id=${characterId}&expansion_id=${expansionId}&phase=${phase}&guild_id=${guildId}`
      : null,
    fetcher,
    {
      ...swrConfig,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
      ...options,
    }
  )
}

/**
 * Fetch submission statuses for all phases in an expansion
 * @param characterId - The character ID
 * @param guildId - The guild ID
 * @param expansionId - The expansion ID
 */
export function usePhaseSubmissionStatuses(
  characterId: string | null,
  guildId: string | null,
  expansionId: string | null,
  options?: SWRConfiguration
) {
  const key = characterId && guildId && expansionId
    ? `/api/loot-submissions/statuses?character_id=${characterId}&guild_id=${guildId}&expansion_id=${expansionId}`
    : null

  return useSWR<{ statuses: Record<string, { status: string; submitted_at: string | null }>; phaseStatuses: Record<number, { status: string; submitted_at: string | null }> }>(
    key,
    fetcher,
    {
      ...swrConfig,
      refreshInterval: 30000, // Refresh every 30 seconds to catch officer updates
      ...options,
    }
  )
}

/**
 * Invalidate loot items cache for a tier
 */
export function invalidateLootItems(tierId: string, characterId: string) {
  return mutate(`/api/loot-items?tier_id=${tierId}&character_id=${characterId}`)
}

/**
 * Invalidate loot items cache for a phase
 */
export function invalidatePhaseLootItems(expansionId: string, phase: number, characterId: string, guildId: string) {
  return mutate(`/api/loot-items?expansion_id=${expansionId}&phase=${phase}&character_id=${characterId}&guild_id=${guildId}`)
}

/**
 * Invalidate loot submission cache
 */
export function invalidateLootSubmission(characterId: string, tierId: string, guildId: string) {
  return mutate(`/api/loot-submissions?character_id=${characterId}&tier_id=${tierId}&guild_id=${guildId}`)
}

/**
 * Invalidate tier submission statuses cache
 */
export function invalidateTierSubmissionStatuses(characterId: string, guildId: string, tierIds: string[]) {
  return mutate(`/api/loot-submissions/statuses?character_id=${characterId}&guild_id=${guildId}&tier_ids=${tierIds.join(',')}`)
}

/**
 * Invalidate phase submission cache
 */
export function invalidatePhaseSubmission(characterId: string, expansionId: string, phase: number, guildId: string) {
  return mutate(`/api/loot-submissions?character_id=${characterId}&expansion_id=${expansionId}&phase=${phase}&guild_id=${guildId}`)
}

/**
 * Invalidate phase submission statuses cache
 */
export function invalidatePhaseSubmissionStatuses(characterId: string, guildId: string, expansionId: string) {
  return mutate(`/api/loot-submissions/statuses?character_id=${characterId}&guild_id=${guildId}&expansion_id=${expansionId}`)
}

// === Character Gear Hooks ===

export interface EquippedItem {
  id: string
  slot: string
  wowhead_id: number
  item_name: string | null
  enchant_id: number | null
  gem_ids: number[] | null
  imported_at: string
}

export interface AwardedItem {
  wowhead_id: number
  item_name: string | null
  slot: string | null
  awarded_date: string
  source: 'loot_history'
}

/**
 * Fetch equipped items for a character (imported from WowSims)
 * @param characterId - The character ID
 */
export function useCharacterGear(
  characterId: string | null,
  options?: SWRConfiguration
) {
  return useSWR<{ character_id: string; items: EquippedItem[]; awarded_items?: AwardedItem[]; count: number }>(
    characterId ? `/api/character-gear?character_id=${characterId}` : null,
    fetcher,
    {
      ...swrConfig,
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Gear changes rarely
      ...options,
    }
  )
}

/**
 * Invalidate character gear cache
 */
export function invalidateCharacterGear(characterId: string) {
  return mutate(`/api/character-gear?character_id=${characterId}`)
}

// === Prio List Hooks ===

export interface PrioListItem {
  id: string
  item_id: number
  item_name: string
  priority: number
  character_id: string
  guild_id: string
}

/**
 * Fetch priority list for a guild
 * @param guildId - The guild ID
 */
export function usePrioList(guildId: string | null, options?: SWRConfiguration) {
  return useSWR<{ items: PrioListItem[] }>(
    guildId ? `/api/prio-list?guild_id=${guildId}` : null,
    fetcher,
    {
      ...swrConfig,
      refreshInterval: 30000,
      ...options,
    }
  )
}

// === Utility Hooks ===

/**
 * Prefetch data for a URL (useful for prefetching on hover)
 */
export function usePrefetch() {
  return {
    prefetchCharacters: () => fetch('/api/characters'),
    prefetchGuilds: () => fetch('/api/guilds'),
    prefetchGuildMembers: (guildId: string) => fetch(`/api/guild-members?guild_id=${guildId}`),
    prefetchPrioList: (guildId: string) => fetch(`/api/prio-list?guild_id=${guildId}`),
  }
}

// === Cache Invalidation Utilities ===

import { mutate } from 'swr'

/**
 * Invalidate (refetch) character data
 */
export function invalidateCharacters() {
  return mutate('/api/characters')
}

/**
 * Invalidate (refetch) guild data
 */
export function invalidateGuilds() {
  return mutate('/api/guilds')
}

/**
 * Invalidate (refetch) guild members for a specific guild
 */
export function invalidateGuildMembers(guildId: string) {
  return mutate(`/api/guild-members?guild_id=${guildId}`)
}

/**
 * Invalidate (refetch) prio list for a specific guild
 */
export function invalidatePrioList(guildId: string) {
  return mutate(`/api/prio-list?guild_id=${guildId}`)
}

/**
 * Invalidate all cached data (useful after major changes like guild switch)
 */
export function invalidateAll() {
  return mutate(() => true, undefined, { revalidate: true })
}
