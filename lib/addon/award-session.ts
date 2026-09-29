/**
 * Matches an addon award to the attendance session it happened in, from
 * the same import string (GH #295 PD-07, GH #307 PD-02).
 *
 * The addon stamps every timestamp in UTC (Core/Utils.lua GetTimestamp is
 * date("!%Y-%m-%dT%H:%M:%SZ")). A session's raidDate is the UTC date at
 * session start, its raidName is the live instance (GetInstanceInfo), and
 * its bossKills are the live encounters with their kill times. The award's
 * own bossName and raidName, by contrast, echo the cached catalog row the
 * companion wrote to SavedVariables (LootDistribution.lua), so they cannot
 * tell AQ20 from AQ40 for a shared item. The session can.
 *
 * Pure: no I/O.
 */
import { toRaidNightDate } from '@/utils/raid-events/team-routing'

export interface AwardSessionContext {
  /** The session's raid night date (YYYY-MM-DD). */
  raidDate: string
  /** The live instance name, trimmed, or null. */
  raidName: string | null
  /** The latest live boss kill at or before the award, or null. */
  bossName: string | null
}

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

function parseIsoTime(value: unknown): number | null {
  if (typeof value !== 'string' || !ISO_TIMESTAMP.test(value.trim())) return null
  const time = Date.parse(value.trim())
  return Number.isNaN(time) ? null : time
}

function trimmedOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Returns the session whose [startTime, endTime] contains awardedAt, with
 * its raidDate, live instance name and the latest live boss killed at or
 * before the award. With overlapping sessions the latest start wins.
 * Sessions with a non-ISO start or end time, or an invalid raidDate, are
 * skipped. Returns null when no session contains the award, when awardedAt
 * cannot be parsed, or when sessions is not an array.
 */
export function matchAwardSession(awardedAt: unknown, sessions: unknown): AwardSessionContext | null {
  if (!Array.isArray(sessions)) return null
  const awardTime = parseIsoTime(awardedAt)
  if (awardTime === null) return null

  let best: { start: number; session: Record<string, unknown>; raidDate: string } | null = null
  for (const candidate of sessions) {
    if (!candidate || typeof candidate !== 'object') continue
    const session = candidate as Record<string, unknown>
    const start = parseIsoTime(session.startTime)
    const end = parseIsoTime(session.endTime)
    if (start === null || end === null) continue
    const raidDate = toRaidNightDate(session.raidDate)
    if (!raidDate) continue
    if (awardTime < start || awardTime > end) continue
    if (!best || start > best.start) best = { start, session, raidDate }
  }
  if (!best) return null

  let bossName: string | null = null
  let bossTime = -Infinity
  const kills = Array.isArray(best.session.bossKills) ? best.session.bossKills : []
  for (const kill of kills) {
    if (!kill || typeof kill !== 'object') continue
    const k = kill as Record<string, unknown>
    const name = trimmedOrNull(k.bossName)
    const killTime = parseIsoTime(k.killTime)
    if (!name || killTime === null) continue
    if (killTime <= awardTime && killTime >= bossTime) {
      bossName = name
      bossTime = killTime
    }
  }

  return { raidDate: best.raidDate, raidName: trimmedOrNull(best.session.raidName), bossName }
}
