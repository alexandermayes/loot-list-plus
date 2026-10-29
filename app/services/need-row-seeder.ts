/**
 * Need-row seeder: writes the generic "need" rows a Discovery tier holds, and
 * the one guarded update that switches a Forever tier to Discovery first.
 *
 * Need rows come only from NEED_DEFINITIONS, mapped by needRowColumns (D-12), so
 * no caller can invent a key, a cost or a slot. Seeding is read-then-insert: the
 * unique index on (raid_tier_id, need_key) WHERE kind = 'need' is partial, so it
 * cannot be an ON CONFLICT target through PostgREST. A unique violation from two
 * simultaneous runs surfaces as a thrown insert error and is healed by running
 * again, because the second run reads the keys the first one wrote.
 *
 * The database refuses a need row in a tier that is not yet 'discovery'
 * (enforce_loot_item_need_rules, D-17), so callers flip a tier before seeding it.
 * The file's only update is flipTiersToDiscovery: list_mode 'known' to
 * 'discovery', filtered by id and by the current mode. It never deletes, renames
 * or upserts a row.
 *
 * Lives in the service layer beside expansionCatalogSync so the owner-run admin
 * script can import it without loading the legacy catalogs.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { NEED_DEFINITIONS, needRowColumns, type NeedRowColumns } from '@/domain/loot/needs'
import { selectAllPagesOrThrow } from '@/utils/supabase/paginate'

export interface NeedRowInsert extends NeedRowColumns {
  raid_tier_id: string
}

export interface SeedNeedRowsResult {
  /** Every row the run decided to insert, whether or not dryRun wrote it. */
  planned: NeedRowInsert[]
  /** Rows actually written; 0 on a dry run. */
  inserted: number
}

type NeedKeysByTier = ReadonlyMap<string, ReadonlySet<string>>

/**
 * Pure: the rows still missing. Tier order first, then NEED_DEFINITIONS order,
 * so two plans of the same input are deep-equal (DISC-01). A tier id listed
 * twice is planned once, because a repeat would break the unique index.
 */
export function planNeedRows({
  tierIds,
  existingKeysByTier,
}: {
  tierIds: readonly string[]
  existingKeysByTier: NeedKeysByTier
}): NeedRowInsert[] {
  const rows: NeedRowInsert[] = []
  for (const tierId of new Set(tierIds)) {
    const held = existingKeysByTier.get(tierId)
    for (const definition of NEED_DEFINITIONS) {
      if (held?.has(definition.key)) continue
      rows.push({ raid_tier_id: tierId, ...needRowColumns(definition) })
    }
  }
  return rows
}

/**
 * Pure: the tiers to switch. Only a Known tier that holds no need rows is
 * flipped; a Known tier that already holds some was switched back by an officer
 * on purpose (D-03) and stays Known.
 */
export function planDiscoveryFlip(
  tiers: ReadonlyArray<{ id: string; list_mode: string }>,
  existingKeysByTier: NeedKeysByTier
): string[] {
  return tiers
    .filter(tier => tier.list_mode === 'known' && !existingKeysByTier.get(tier.id)?.size)
    .map(tier => tier.id)
}

/** Need keys each tier already holds. Every page is checked; a failed read throws. */
export async function readNeedKeysByTier(
  supabase: SupabaseClient,
  tierIds: readonly string[]
): Promise<Map<string, Set<string>>> {
  const keys = new Map<string, Set<string>>()
  if (tierIds.length === 0) return keys

  const rows = await selectAllPagesOrThrow<{
    id: string
    raid_tier_id: string
    need_key: string | null
  }>('loot_items need keys', (start, end) =>
    supabase
      .from('loot_items')
      .select('id, raid_tier_id, need_key')
      .eq('kind', 'need')
      .in('raid_tier_id', [...tierIds])
      .order('id', { ascending: true })
      .range(start, end)
  )

  for (const row of rows) {
    if (row.need_key === null) continue
    const held = keys.get(row.raid_tier_id) ?? new Set<string>()
    held.add(row.need_key)
    keys.set(row.raid_tier_id, held)
  }
  return keys
}

/**
 * Inserts the need rows the given tiers are missing, in one insert. The tiers
 * must already be 'discovery' (see the header). With dryRun nothing is written
 * and the planned rows come back. Pass existingKeysByTier when the caller has
 * already read the keys, to skip a second read.
 */
export async function seedNeedRows(
  supabase: SupabaseClient,
  tierIds: readonly string[],
  {
    dryRun = false,
    existingKeysByTier,
  }: { dryRun?: boolean; existingKeysByTier?: NeedKeysByTier } = {}
): Promise<SeedNeedRowsResult> {
  const keys = existingKeysByTier ?? (await readNeedKeysByTier(supabase, tierIds))
  const planned = planNeedRows({ tierIds, existingKeysByTier: keys })

  if (dryRun || planned.length === 0) return { planned, inserted: 0 }

  const { error } = await supabase.from('loot_items').insert(planned)
  if (error) {
    throw new Error(`Failed to insert need rows for raid tiers ${tierIds.join(', ')}: ${error.message}`)
  }
  return { planned, inserted: planned.length }
}

/**
 * Switches Known tiers to Discovery (D-05). The current-mode filter makes it a
 * no-op for a tier an officer already moved, and it is the only update in this
 * file. Does nothing for an empty list.
 */
export async function flipTiersToDiscovery(
  supabase: SupabaseClient,
  tierIds: readonly string[]
): Promise<void> {
  if (tierIds.length === 0) return

  const { error } = await supabase
    .from('raid_tiers')
    .update({ list_mode: 'discovery' })
    .in('id', [...tierIds])
    .eq('list_mode', 'known')
  if (error) {
    throw new Error(`Failed to switch raid tiers to Discovery: ${error.message}`)
  }
}
