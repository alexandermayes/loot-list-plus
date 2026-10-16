/**
 * Forever catalog sync: seeds a Forever guild's raid tiers from the manifest.
 *
 * INSERT-ONLY. This file never updates, deletes or upserts a row. A tier that
 * already matches a manifest raid gets no write at all, so officer-set
 * is_guild_active, master_sheet_visible, is_active and submission_deadline stay
 * exactly as they were (EXPN-05, D-09, D-10). A tier that matches nothing (an
 * officer-created raid) and a duplicate of a manifest tier are both left alone.
 *
 * Matching is by normalizeCatalogName on the raid name or a previousNames
 * alias, so a curly apostrophe or a case change never creates a second tier.
 *
 * Forever only (D-08 to D-11): the legacy catalogs keep their own seeding loop.
 * syncExpansionCatalog throws before touching the client for any other name.
 *
 * Idempotency is read-then-insert. raid_tiers has no unique index on
 * (expansion_id, name), and adding one needs a migration, which is out of scope
 * for this phase. Two simultaneous syncs for one expansion could both insert;
 * the new-guild path runs once inside guild creation and the admin script is a
 * single owner-run process that ends with a duplicate-name check.
 *
 * This lives beside the seeder, not inside it, so the admin script can import it
 * without loading the five legacy catalogs. opens_on is never read here (D-06).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { getRaidPhase } from '@/data/expansion-phases'
import { FOREVER_MANIFEST } from '@/data/expansions/forever/manifest'
import { findManifestRaid } from '@/data/expansions/forever/lookup'
import type { ManifestRaid } from '@/domain/expansion/manifest-schema'

export interface ForeverTierInsert {
  expansion_id: string
  name: string
  is_active: boolean
  is_guild_active: boolean
  master_sheet_visible: boolean
  phase: number
  sort_order: number
}

export interface CatalogSyncResult {
  expansionId: string
  matched: Array<{ name: string; tierId: string; via: 'name' | 'alias' }>
  inserted: ForeverTierInsert[]
  dryRun: boolean
}

interface ExistingTier {
  id: string
  name: string
}

/**
 * Pure planning step: which manifest raids are already present and which rows
 * must be inserted. The first existing tier to resolve to a raid index claims
 * it; later duplicates and unmatched tiers are ignored, never cleaned up.
 */
export function planCatalogSync({
  expansionId,
  existingTiers,
  raids = FOREVER_MANIFEST.raids,
  slug = FOREVER_MANIFEST.slug,
}: {
  expansionId: string
  existingTiers: readonly ExistingTier[]
  raids?: readonly ManifestRaid[]
  slug?: string
}): { matched: CatalogSyncResult['matched']; inserted: ForeverTierInsert[] } {
  const claimed = new Set<number>()
  const matched: CatalogSyncResult['matched'] = []

  for (const tier of existingTiers) {
    const match = findManifestRaid(tier.name, raids)
    if (!match || claimed.has(match.index)) continue
    claimed.add(match.index)
    matched.push({ name: tier.name, tierId: tier.id, via: match.via })
  }

  const inserted: ForeverTierInsert[] = []
  raids.forEach((raid, index) => {
    if (claimed.has(index)) return

    const phase = getRaidPhase(slug, raid.name)
    if (phase === null) {
      // GH #279 class: a NULL-phase tier is invisible, so refuse to write one.
      throw new Error(`Forever raid "${raid.name}" has no phase in EXPANSION_PHASES.${slug}`)
    }
    const inInitialPhase = phase <= 1
    inserted.push({
      expansion_id: expansionId,
      name: raid.name,
      // Mirrors the legacy index === 0 rule: the first raid is the current one.
      is_active: index === 0,
      is_guild_active: inInitialPhase,
      master_sheet_visible: inInitialPhase,
      phase,
      sort_order: index + 1,
    })
  })

  return { matched, inserted }
}

/**
 * Inserts the manifest raid tiers a Forever expansion is missing, in one bulk
 * insert (one PostgREST statement, all or nothing per guild). With dryRun the
 * result lists what would be inserted and nothing is written.
 */
export async function syncExpansionCatalog(
  supabase: SupabaseClient,
  {
    expansionId,
    expansionName,
    dryRun = false,
  }: { expansionId: string; expansionName: string; dryRun?: boolean }
): Promise<CatalogSyncResult> {
  if (expansionName !== FOREVER_MANIFEST.storedName) {
    throw new Error(`syncExpansionCatalog supports Forever only (got "${expansionName}")`)
  }

  const { data, error } = await supabase
    .from('raid_tiers')
    .select('id, name')
    .eq('expansion_id', expansionId)

  if (error) {
    throw new Error(`Failed to read raid_tiers for expansion ${expansionId}: ${error.message}`)
  }

  const { matched, inserted } = planCatalogSync({
    expansionId,
    existingTiers: (data ?? []) as ExistingTier[],
  })

  if (!dryRun && inserted.length > 0) {
    const { error: insertError } = await supabase.from('raid_tiers').insert(inserted)
    if (insertError) {
      throw new Error(
        `Failed to insert raid_tiers for expansion ${expansionId}: ${insertError.message}`
      )
    }
  }

  return { expansionId, matched, inserted, dryRun }
}
