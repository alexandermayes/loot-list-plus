/**
 * Pure formatting used by the sync engine: SavedVariables pending data to
 * API requests, and guild data to the tables written for the addon. It has
 * no Electron, chokidar or file system dependency and only relative
 * imports, so the root vitest suite can test it directly
 * (companion/src/main/__tests__).
 */
import type { GuildData } from './api-client'
import { markLuaNumberKeys } from './lua-parser'

/** One pending addon award as POST /api/addon/loot-award receives it. */
export interface PendingAwardRequest {
  wowhead_id: number
  character_name: string
  boss_name?: string
  /** The date part of awardedAt (YYYY-MM-DD), used to find the raid night. */
  awarded_date?: string
  /** The addon's raw award timestamp (UTC ISO), part of the award's key. */
  awarded_at?: string
  /** The addon's own award id (addon 1.1.0 and later), part of the key. */
  award_id?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/**
 * Maps the addon's profile.pendingAwards list to loot-award requests.
 * awardedAt and awardId are forwarded raw when they are strings, so the
 * server builds the same key it builds from the export string for the same
 * in-game award. Absent values stay undefined, so JSON.stringify drops them.
 * A missing or non-array list gives [].
 */
export function toPendingAwardRequests(raw: unknown): PendingAwardRequest[] {
  if (!Array.isArray(raw)) return []
  const requests: PendingAwardRequest[] = []
  for (const entry of raw) {
    const a = asRecord(entry)
    if (!a) continue
    const awardedAt = typeof a['awardedAt'] === 'string' ? (a['awardedAt'] as string) : undefined
    const awardId = typeof a['awardId'] === 'string' ? (a['awardId'] as string) : undefined
    requests.push({
      wowhead_id: a['wowheadId'] as number,
      character_name: a['characterName'] as string,
      boss_name: a['bossName'] as string | undefined,
      awarded_date: awardedAt ? awardedAt.split('T')[0] : undefined,
      awarded_at: awardedAt,
      award_id: awardId,
    })
  }
  return requests
}

/**
 * guildData.items for the addon, keyed by wowhead id. The keys are marked as
 * Lua numbers, so they are written as [20928]: the addon looks items up by
 * number (DB:GetItemByWowheadId), and a ["20928"] string key is never found.
 */
export function convertItemsToLuaFormat(items: GuildData['items']): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const item of items) {
    result[String(item.wowhead_id)] = {
      id: item.id,
      name: item.name,
      bossName: item.boss_name,
      raidName: item.raid_name,
      classification: item.classification,
      slot: item.slot,
      itemType: item.item_type,
      wowheadId: item.wowhead_id,
    }
  }
  markLuaNumberKeys(result, Object.keys(result))
  return result
}

/**
 * guildData.members for the addon, keyed by character id. Each member's
 * items holds the highest rank per item and itemRanks every rank, highest
 * first (equal ranks in two slots stay two entries), both with string keys,
 * since the addon reads them with tostring(wowheadId). An addon that does
 * not know itemRanks ignores it and still finds the best rank in items.
 */
export function convertMembersToLuaFormat(members: GuildData['members']): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const member of members) {
    const ranksById = new Map<string, number[]>()
    for (const item of member.items) {
      const key = String(item.wowhead_id)
      const ranks = ranksById.get(key)
      if (ranks) ranks.push(item.rank)
      else ranksById.set(key, [item.rank])
    }
    const items: Record<string, number> = {}
    const itemRanks: Record<string, number[]> = {}
    for (const [key, ranks] of ranksById) {
      const sorted = [...ranks].sort((a, b) => b - a)
      items[key] = sorted[0]
      itemRanks[key] = sorted
    }
    result[member.character_id] = {
      name: member.name,
      class: member.class_token,
      classColor: member.class_color,
      spec: member.spec_name,
      specId: member.spec_id,
      role: member.role,
      guildRole: member.guild_role,
      membershipStatus: member.membership_status,
      items,
      itemRanks,
    }
  }
  return result
}
