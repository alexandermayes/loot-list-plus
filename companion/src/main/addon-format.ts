/**
 * Pure formatting used by the sync engine: SavedVariables pending data to
 * API requests. It has no Electron, chokidar or file system dependency and
 * only relative imports, so the root vitest suite can test it directly
 * (companion/src/main/__tests__).
 */

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
