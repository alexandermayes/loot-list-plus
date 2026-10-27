import type { SupabaseClient } from '@supabase/supabase-js'
import { REGION_API_HOSTS } from '@/lib/battlenet'

// Quick task 261027-lzm. The Classic profile equipment response carries no
// per-item level (261026-wpw spike), so the gear writers fill
// character_equipped_items.item_level with the base item level from the Game
// Data item endpoint. A base level never changes for an item id, so each one
// is cached in item_base_levels (service role only) and fetched once.

// Four requests at a time keep a first sync of about 19 items to a handful of
// short batches.
const FETCH_CONCURRENCY = 4
// A short pause between batches keeps a first sync of about 19 items far under
// Blizzard's per-second limit.
const BATCH_PAUSE_MS = 100
// A slow Blizzard response must not hold the sync route open; at most about 5
// sequential batches.
const REQUEST_TIMEOUT_MS = 3000
// Match the CHECK on item_base_levels and character_equipped_items, so a bad
// value becomes null instead of failing a write.
const MIN_ITEM_LEVEL = 1
const MAX_ITEM_LEVEL = 1999
// The wowhead_id column is a Postgres integer.
const MAX_ITEM_ID = 2147483647

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/**
 * Base item level of a Game Data item response, read at the top-level level
 * field. Only an integer from 1 to 1999 is kept, else null.
 */
export function readBaseItemLevel(json: unknown): number | null {
  if (typeof json !== 'object' || json === null) return null
  const value = (json as { level?: unknown }).level
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  if (value < MIN_ITEM_LEVEL || value > MAX_ITEM_LEVEL) return null
  return value
}

async function fetchBaseItemLevel(
  apiRegion: string,
  token: string,
  wowheadId: number,
): Promise<number | null> {
  try {
    const response = await fetch(`${REGION_API_HOSTS[apiRegion]}/data/wow/item/${wowheadId}?locale=en_US`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Battlenet-Namespace': `static-classic-${apiRegion}`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) return null
    return readBaseItemLevel(await response.json())
  } catch {
    // Network error, timeout or a body that is not JSON. Never log the
    // error: its text can carry the URL.
    return null
  }
}

function errorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code
  return typeof code === 'string' ? code : 'unknown'
}

/**
 * Base item level per wowhead id: cache hits from item_base_levels, the
 * misses fetched from the Game Data item endpoint and upserted. Only ids with
 * a level from 1 to 1999 are in the returned Map.
 *
 * The promise never rejects. A missing base level must never fail a gear
 * sync, it only leaves that slot's item_level null. The token is the linked
 * account's access token that the equipment fetch just used.
 */
export async function resolveBaseItemLevels(
  serviceClient: SupabaseClient,
  region: string,
  token: string,
  wowheadIds: readonly number[],
): Promise<Map<number, number>> {
  const levels = new Map<number, number>()
  try {
    const ids = [...new Set(wowheadIds)].filter(id => Number.isInteger(id) && id >= 1 && id <= MAX_ITEM_ID)
    if (ids.length === 0) return levels

    // One allowlisted value feeds both the host and the namespace, so no
    // stored string reaches a URL or header unchecked.
    const apiRegion = Object.prototype.hasOwnProperty.call(REGION_API_HOSTS, region) ? region : 'us'

    try {
      const { data, error } = await serviceClient.from('item_base_levels').select('wowhead_id, item_level').in('wowhead_id', ids)
      if (error) {
        console.error('item_base_levels read failed, fetching every item:', errorCode(error))
      } else {
        for (const row of (data ?? []) as { wowhead_id: number; item_level: number }[]) {
          if (ids.includes(row.wowhead_id)) levels.set(row.wowhead_id, row.item_level)
        }
      }
    } catch {
      console.error('item_base_levels read threw, fetching every item:', 'unknown')
    }

    const misses = ids.filter(id => !levels.has(id))
    const fetched: { wowhead_id: number; item_level: number; fetched_at: string }[] = []
    for (let i = 0; i < misses.length; i += FETCH_CONCURRENCY) {
      if (i > 0) await sleep(BATCH_PAUSE_MS)
      const batch = misses.slice(i, i + FETCH_CONCURRENCY)
      const results = await Promise.all(batch.map(id => fetchBaseItemLevel(apiRegion, token, id)))
      batch.forEach((id, index) => {
        const level = results[index]
        if (level !== null) {
          levels.set(id, level)
          fetched.push({ wowhead_id: id, item_level: level, fetched_at: new Date().toISOString() })
        }
      })
    }

    if (fetched.length > 0) {
      try {
        const { error } = await serviceClient.from('item_base_levels').upsert(fetched, { onConflict: 'wowhead_id' })
        if (error) console.error('item_base_levels upsert failed:', errorCode(error))
      } catch {
        console.error('item_base_levels upsert threw:', 'unknown')
      }
    }
  } catch {
    console.error('resolveBaseItemLevels failed:', 'unknown')
  }
  return levels
}
