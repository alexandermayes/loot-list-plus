/**
 * Batched donation bonus computation.
 *
 * Single round-trip to the database: fetches all donation_records for the
 * given guild + characters, groups by character, then runs the pure
 * `calculateDonationBonus()` engine function once per character.
 *
 * Short-circuits to all-zeros when donation_bonuses_enabled is false, so the
 * common case (most guilds) costs nothing.
 *
 * Result: Record<character_id, donationBonus>. Characters with no records
 * are present in the map with value 0 — callers can safely do
 * `result[id] ?? 0` either way.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateDonationBonus } from '@/domain/scoring'
import type { DonationRecord, ScoringConfig } from '@/domain/scoring'
import { toDateString } from '@/utils/date'

export async function calculateDonationsBatch(
  supabase: SupabaseClient,
  guildId: string,
  config: Partial<ScoringConfig>,
  characterIds: string[],
  asOfDate: string = toDateString(new Date()),
): Promise<Record<string, number>> {
  const result: Record<string, number> = {}
  for (const id of characterIds) result[id] = 0

  if (!config.donation_bonuses_enabled || characterIds.length === 0) {
    return result
  }

  const { data, error } = await supabase
    .from('donation_records')
    .select('character_id, points, awarded_at')
    .eq('guild_id', guildId)
    .in('character_id', characterIds)

  if (error || !data) {
    if (error) console.error('calculateDonationsBatch: query failed', error)
    return result
  }

  const byChar = new Map<string, DonationRecord[]>()
  for (const row of data) {
    if (!row.character_id) continue
    const records = byChar.get(row.character_id) ?? []
    records.push({ points: row.points, awarded_at: row.awarded_at })
    byChar.set(row.character_id, records)
  }

  for (const [charId, records] of byChar) {
    result[charId] = calculateDonationBonus(records, config, asOfDate)
  }

  return result
}
