/**
 * Idempotent loot_history insert for addon and companion awards (GH #295
 * D-04, PD-06; FU-1 of GH #331 and #293), shared by POST
 * /api/addon/loot-award and POST /api/addon/import-string.
 *
 * Re-sends are normal: the companion clears its pending list only after a
 * whole sync pass, so a crash before the clear re-sends every award, and an
 * officer can paste the same addon export twice (exports are cumulative
 * until "Clear pending" is clicked in game). A re-send must never create a
 * second row, but a real second drop of the same item to the same raider on
 * the same night (a raider who listed the item twice) must be recorded.
 *
 * Keyed path (row.source_award_key set, see addonAwardKey): the key is
 * 'addon:' + awardedAt + ':' + wowheadId + ':' + the trimmed lowercased
 * name, so the same in-game award gives the same key from the export string
 * and from a companion that forwards awardedAt. Limitation: two awards of
 * one item to one raider within the same second share a key and are
 * recorded once (a later addon release adds an awardId). Each attempt:
 *   1. A row with this key in this guild means already recorded.
 *   2. On a linked night, an unkeyed row for the same item, night and raider
 *      (same character_id, or for an unmatched name a null character_id with
 *      the same trimmed lowercased name) is claimed by stamping the key on it
 *      and the award is already recorded. Such a row is a web award, an
 *      award from today's companion or one recorded before keys existed; it
 *      may absorb one keyed award so one drop recorded both on the web and in
 *      game is never doubled (OD-3; a real second drop recorded on the web
 *      first then needs a second web award). A lost claim race tries again.
 *   3. Otherwise the row is inserted with the next free award_copy for the
 *      item, raider and night (1 when unlinked or the name is unmatched) and
 *      the key. A unique violation tries again from step 1: an identical
 *      concurrent retry is then found by its key, and a different concurrent
 *      award picks the next copy.
 * After MAX_ATTEMPTS attempts, or when the raider already has
 * MAX_AWARD_COPIES copies, it throws.
 *
 * Keyless path (no source_award_key): today's companion sends no award
 * timestamp, so its re-send and a real second copy are identical requests.
 * This path is unchanged: every row is copy 1 (the column default), a unique
 * violation on a linked award means already recorded, and for a linked award
 * with an unmatched name a same-night, same-item row with the same name
 * (trimmed, case-insensitive) means already recorded, since the per-night
 * unique rule does not cover rows with no character_id. Unlinked keyless
 * awards are not deduplicated: with no night there is nothing reliable to
 * key on.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LootHistoryInsert } from '@/lib/loot/loot-history-rows'
// Relative, not '@/': the PGlite proof imports this module through tsx,
// outside the Next.js alias setup.
import { MAX_AWARD_COPIES, nextAwardCopy } from '../../domain/loot/award-copies'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryClient = SupabaseClient<any, any, any>

export interface AddonAwardInsertResult {
  status: 'inserted' | 'already_recorded'
  /** The new row's id, or the existing row's id when already recorded
   * (null if the existing row could not be looked up). */
  id: string | null
}

const UNIQUE_VIOLATION = '23505'
const MAX_ATTEMPTS = 3
const MAX_KEY_LENGTH = 200
/** The addon's UTC timestamp (Core/Utils.lua GetTimestamp), with an
 * optional fraction of a second. */
const ADDON_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/

function normalizeName(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

/**
 * The per-award idempotency key for an addon award, or null when the
 * award does not carry a usable identity: awardedAt must be the addon's UTC
 * timestamp (YYYY-MM-DDTHH:MM:SS, optional fraction, ending in Z),
 * wowheadId a positive integer and the trimmed name non-empty, and the key
 * at most 200 characters (the column's CHECK).
 */
export function addonAwardKey(input: {
  awardedAt: unknown
  wowheadId: unknown
  characterName: unknown
}): string | null {
  const { awardedAt, wowheadId, characterName } = input
  if (typeof awardedAt !== 'string' || !ADDON_TIMESTAMP.test(awardedAt)) return null
  if (typeof wowheadId !== 'number' || !Number.isInteger(wowheadId) || wowheadId <= 0) return null
  if (typeof characterName !== 'string') return null
  const name = normalizeName(characterName)
  if (!name) return null
  const key = `addon:${awardedAt}:${wowheadId}:${name}`
  return key.length <= MAX_KEY_LENGTH ? key : null
}

/**
 * Inserts one addon award row, returning 'already_recorded' instead of
 * failing when the same award is already recorded. Rows with a
 * source_award_key take the keyed path, all others the unchanged keyless
 * path (see the module comment). Any other insert or lookup error is thrown
 * for the caller to report.
 */
export async function insertAddonAward(
  supabase: QueryClient,
  row: LootHistoryInsert,
): Promise<AddonAwardInsertResult> {
  if (row.source_award_key) return insertKeyedAddonAward(supabase, row, row.source_award_key)

  const raidEventId = row.raid_event_id ?? null
  const characterId = row.character_id ?? null

  if (raidEventId && row.character_name && !characterId) {
    const { data: existing, error } = await supabase
      .from('loot_history')
      .select('id, character_name')
      .eq('guild_id', row.guild_id)
      .eq('loot_item_id', row.loot_item_id)
      .eq('raid_event_id', raidEventId)
      .is('character_id', null)

    if (error) {
      throw new Error(`Failed to check for an existing addon award: ${error.message}`)
    }

    const wanted = normalizeName(row.character_name)
    const match = ((existing ?? []) as Array<{ id: string; character_name: string | null }>).find(
      r => normalizeName(r.character_name) === wanted,
    )
    if (match) return { status: 'already_recorded', id: match.id }
  }

  const { data, error } = await supabase.from('loot_history').insert(row).select('id').single()

  if (error) {
    if (error.code === UNIQUE_VIOLATION && raidEventId && characterId) {
      const { data: existing, error: lookupError } = await supabase
        .from('loot_history')
        .select('id')
        .eq('guild_id', row.guild_id)
        .eq('loot_item_id', row.loot_item_id)
        .eq('character_id', characterId)
        .eq('raid_event_id', raidEventId)
        .limit(1)
        .maybeSingle()
      const existingId = lookupError ? null : ((existing as { id: string } | null)?.id ?? null)
      return { status: 'already_recorded', id: existingId }
    }
    throw new Error(`Failed to insert addon award: ${error.message}`)
  }

  return { status: 'inserted', id: (data as { id: string } | null)?.id ?? null }
}

/** The keyed path of insertAddonAward (steps 1 to 3 in the module comment). */
async function insertKeyedAddonAward(
  supabase: QueryClient,
  row: LootHistoryInsert,
  key: string,
): Promise<AddonAwardInsertResult> {
  const raidEventId = row.raid_event_id ?? null
  const characterId = row.character_id ?? null
  const wantedName = normalizeName(row.character_name)

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data: keyed, error: keyError } = await supabase
      .from('loot_history')
      .select('id')
      .eq('guild_id', row.guild_id)
      .eq('source_award_key', key)
      .limit(1)
      .maybeSingle()
    if (keyError) {
      throw new Error(`Failed to check for an existing addon award: ${keyError.message}`)
    }
    if (keyed) return { status: 'already_recorded', id: (keyed as { id: string }).id }

    if (raidEventId && (characterId || wantedName)) {
      let candidatesQuery = supabase
        .from('loot_history')
        .select('id, character_name, award_copy')
        .eq('guild_id', row.guild_id)
        .eq('loot_item_id', row.loot_item_id)
        .eq('raid_event_id', raidEventId)
        .is('source_award_key', null)
      candidatesQuery = characterId
        ? candidatesQuery.eq('character_id', characterId)
        : candidatesQuery.is('character_id', null)
      const { data: candidates, error: candidatesError } = await candidatesQuery.order('award_copy', {
        ascending: true,
      })
      if (candidatesError) {
        throw new Error(`Failed to check for an unkeyed addon award: ${candidatesError.message}`)
      }

      const candidate = ((candidates ?? []) as Array<{ id: string; character_name: string | null }>).find(
        r => characterId !== null || normalizeName(r.character_name) === wantedName,
      )
      if (candidate) {
        const { data: claimed, error: claimError } = await supabase
          .from('loot_history')
          .update({ source_award_key: key })
          .eq('id', candidate.id)
          .is('source_award_key', null)
          .select('id')
        if (claimError) {
          // A concurrent identical award stamped this key on another row
          // first: the next attempt finds it by key.
          if (claimError.code === UNIQUE_VIOLATION) continue
          throw new Error(`Failed to claim an unkeyed addon award: ${claimError.message}`)
        }
        if (((claimed ?? []) as unknown[]).length > 0) {
          return { status: 'already_recorded', id: candidate.id }
        }
        continue
      }
    }

    let awardCopy = 1
    if (raidEventId && characterId) {
      const { data: top, error: topError } = await supabase
        .from('loot_history')
        .select('award_copy')
        .eq('guild_id', row.guild_id)
        .eq('loot_item_id', row.loot_item_id)
        .eq('raid_event_id', raidEventId)
        .eq('character_id', characterId)
        .order('award_copy', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (topError) {
        throw new Error(`Failed to read existing award copies: ${topError.message}`)
      }
      const next = nextAwardCopy((top as { award_copy: number } | null)?.award_copy)
      if (next === null) {
        throw new Error(
          `Failed to insert addon award: the raider already has ${MAX_AWARD_COPIES} copies of this item on this raid night`,
        )
      }
      awardCopy = next
    }

    const { data, error } = await supabase
      .from('loot_history')
      .insert({ ...row, source_award_key: key, award_copy: awardCopy })
      .select('id')
      .single()
    if (!error) return { status: 'inserted', id: (data as { id: string } | null)?.id ?? null }
    if (error.code !== UNIQUE_VIOLATION) {
      throw new Error(`Failed to insert addon award: ${error.message}`)
    }
  }

  throw new Error(`Failed to insert addon award: still conflicting after ${MAX_ATTEMPTS} attempts`)
}
