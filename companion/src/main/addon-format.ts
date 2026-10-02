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

/** One pending attendance record as POST /api/addon/attendance receives it. */
export interface PendingAttendanceRequest {
  raid_date: string
  raid_name: string
  attended: string[]
}

/** The pending lists read at the start of a sync pass, as the addon wrote
 * them. Only these entries are cleared at the end of the pass. */
export interface SentPending {
  awards: unknown[]
  attendance: unknown[]
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
 * Maps the addon's profile.pendingAttendance list to attendance requests.
 * A missing or non-array list (an empty Lua table parses as {}) gives [].
 */
export function toPendingAttendanceRequests(raw: unknown): PendingAttendanceRequest[] {
  if (!Array.isArray(raw)) return []
  const requests: PendingAttendanceRequest[] = []
  for (const entry of raw) {
    const a = asRecord(entry)
    if (!a) continue
    requests.push({
      raid_date: a['raidDate'] as string,
      raid_name: a['raidName'] as string,
      attended: Array.isArray(a['attended']) ? (a['attended'] as string[]) : [],
    })
  }
  return requests
}

/**
 * The pending lists of a parsed SavedVariables file (LootListPlusDB,
 * profiles.Default), as raw arrays. A missing or non-array list gives [].
 */
export function readPendingLists(saved: Record<string, unknown>): SentPending {
  const db = asRecord(saved['LootListPlusDB'])
  const profiles = asRecord(db?.['profiles'])
  const profile = asRecord(profiles?.['Default'])
  const awards = profile?.['pendingAwards']
  const attendance = profile?.['pendingAttendance']
  return {
    awards: Array.isArray(awards) ? awards : [],
    attendance: Array.isArray(attendance) ? attendance : [],
  }
}

function pendingAwardIdentity(entry: unknown): string | null {
  const a = asRecord(entry)
  if (!a) return null
  if (typeof a['awardId'] === 'string') return `id:${a['awardId']}`
  const name = typeof a['characterName'] === 'string' ? a['characterName'].trim().toLowerCase() : ''
  return `at:${String(a['awardedAt'])}|${String(a['wowheadId'])}|${name}`
}

function pendingAttendanceIdentity(entry: unknown): string | null {
  const a = asRecord(entry)
  if (!a) return null
  return `${String(a['raidDate'])}|${String(a['raidName'])}|${String(a['startTime'])}`
}

/**
 * The entries of current that were not sent: each sent entry removes one
 * current entry with the same identity. Kept entries are the same objects.
 */
function withoutSent(current: unknown, sent: readonly unknown[], identity: (entry: unknown) => string | null): unknown[] {
  if (!Array.isArray(current)) return []
  const sentCounts = new Map<string, number>()
  for (const entry of sent) {
    const id = identity(entry)
    if (id !== null) sentCounts.set(id, (sentCounts.get(id) ?? 0) + 1)
  }
  return current.filter(entry => {
    const id = identity(entry)
    const left = id === null ? 0 : (sentCounts.get(id) ?? 0)
    if (left === 0) return true
    sentCounts.set(id as string, left - 1)
    return false
  })
}

/** The table at parent[key], created in place when it is missing. */
function tableAt(parent: Record<string, unknown>, key: string): Record<string, unknown> {
  const existing = asRecord(parent[key])
  if (existing) return existing
  const created: Record<string, unknown> = {}
  parent[key] = created
  return created
}

/**
 * Applies one sync pass to a parsed SavedVariables file and returns the
 * LootListPlusDB table to write. profiles.Default.guildData is replaced.
 * With sent (the pending lists read at the start of the pass, when it had
 * any), the sent awards and attendance are removed from the file's pending
 * lists, matching awards on awardId when present, otherwise on awardedAt,
 * wowheadId and name, and attendance on raidDate, raidName and startTime.
 * Entries the addon added while the pass ran stay for the next sync.
 *
 * The parsed tables are changed in place and every other table is kept by
 * reference, so the hidden Lua number-key markers (lua-parser.ts) survive
 * and keys such as [20928] in lootHistory or another profile are written
 * back unchanged. Never rebuild these tables with a spread, structuredClone
 * or a JSON round trip.
 */
export function applyGuildDataToSavedVars(
  saved: Record<string, unknown>,
  guildDataLua: Record<string, unknown>,
  sent: SentPending | null,
): Record<string, unknown> {
  const db = tableAt(saved, 'LootListPlusDB')
  const profiles = tableAt(db, 'profiles')
  const profile = tableAt(profiles, 'Default')
  profile['guildData'] = guildDataLua
  if (sent) {
    profile['pendingAwards'] = withoutSent(profile['pendingAwards'], sent.awards, pendingAwardIdentity)
    profile['pendingAttendance'] = withoutSent(profile['pendingAttendance'], sent.attendance, pendingAttendanceIdentity)
  }
  return db
}

/**
 * The guildData table written for the addon (the same fields the addon's
 * own /llp import stores).
 */
export function buildGuildDataLua(guildData: GuildData, importedAt: string): Record<string, unknown> {
  return {
    guildId: guildData.guildId,
    guildName: guildData.guildName,
    importedAt,
    expansionId: guildData.expansionId,
    phase: guildData.phase,
    settings: guildData.settings,
    items: convertItemsToLuaFormat(guildData.items),
    members: convertMembersToLuaFormat(guildData.members),
    priorities: guildData.priorities,
    blp: guildData.blp,
    attendance: guildData.attendance,
  }
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
