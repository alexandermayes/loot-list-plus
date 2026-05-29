#!/usr/bin/env npx tsx
/**
 * Populate primary_stat for loot_items by fetching Wowhead tooltips.
 *
 * 1. Queries loot_items where primary_stat IS NULL
 * 2. Deduplicates by wowhead_id (one fetch per unique item)
 * 3. Fetches the tooltip from nether.wowhead.com and parses the stat block
 * 4. Updates ALL loot_items rows matching each wowhead_id
 *
 * Stat resolution:
 *   - If the tooltip shows STR/AGI/INT, that's the primary stat.
 *   - If only Stamina is present, it's 'Stamina' (tank trinkets, some shields).
 *   - If no usable stats found, mark 'None' so we don't re-scrape on the next run.
 *
 * Usage:
 *   npx tsx scripts/populate-primary-stat.ts            # all expansions
 *   npx tsx scripts/populate-primary-stat.ts --dry-run  # no DB writes
 *   npx tsx scripts/populate-primary-stat.ts --limit 50 # process N items only
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const DRY_RUN = process.argv.includes('--dry-run')
const limitArgIdx = process.argv.indexOf('--limit')
const LIMIT = limitArgIdx > -1 ? parseInt(process.argv[limitArgIdx + 1], 10) : null

// Re-process MoP Leather/Mail items currently marked 'Stamina' to catch
// flex-stat items (GH #76). Overwrites the existing primary_stat value
// instead of the usual `is null` guard.
const RESCAN_MOP_FLEX = process.argv.includes('--rescan-mop-flex')

// String values include single stats ('Agility', 'Stamina', …) and
// MoP-era flex pairs in alphabetical-comma form, e.g. 'Agility,Intellect'.
// 'None' = parsed cleanly but no primary stat present (e.g. cosmetic items).
type PrimaryStat = string | 'None'

// Wowhead serves the same tooltip HTML across dataEnvs but the item must exist
// in that env. Try the broadest envs first — this covers Classic→MoP Classic.
const DATA_ENVS = [1, 2, 4, 5, 8, 11]

async function fetchPrimaryStat(wowheadId: number): Promise<PrimaryStat | null> {
  for (const env of DATA_ENVS) {
    try {
      const res = await fetch(
        `https://nether.wowhead.com/tooltip/item/${wowheadId}?dataEnv=${env}&locale=0`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LootListPlus/1.0)' } }
      )
      if (!res.ok) continue
      const data = await res.json()
      if (!data?.tooltip) continue

      const tooltip = data.tooltip as string

      // Wowhead tooltips list each stat as a separate line. Strip tags so we
      // can search the plain text.
      const text = tooltip.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

      // Flex stats (MoP-era and later): `+N [Agility or Intellect]` etc.
      // These morph to whatever the wearer's spec uses. Emit a multi-stat
      // value (comma-separated, alphabetical) so the filter can recognize
      // that the item is valid for either spec.
      const flexMatch = text.match(/\+\s*\d[\d,]*\s+\[\s*([^\]]+?)\s*\]/i)
      if (flexMatch) {
        const inner = flexMatch[1]
        const stats: string[] = []
        for (const stat of ['Strength', 'Agility', 'Intellect']) {
          if (new RegExp(`\\b${stat}\\b`, 'i').test(inner)) stats.push(stat)
        }
        if (stats.length >= 2) {
          return stats.sort().join(',')
        }
      }

      const hasStat = (stat: string) =>
        new RegExp(`\\+\\s*\\d[\\d,]*\\s+${stat}\\b`, 'i').test(text)

      // Primary stats first — items rarely have more than one of these.
      if (hasStat('Strength')) return 'Strength'
      if (hasStat('Agility')) return 'Agility'
      if (hasStat('Intellect')) return 'Intellect'
      // Stam-only items (some tank trinkets, classic shields).
      if (hasStat('Stamina')) return 'Stamina'

      // Tooltip parsed cleanly but no primary stat — mark so we don't refetch.
      return 'None'
    } catch {
      continue
    }
  }
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('Populate primary_stat from Wowhead')
  if (DRY_RUN) console.log('(DRY RUN - no database writes)')
  if (LIMIT) console.log(`(limit: ${LIMIT} items)`)
  if (RESCAN_MOP_FLEX) console.log('(RESCAN MoP flex — overwriting Stamina-marked Leather/Mail in MoP raids)')
  console.log()

  // Resolve MoP raid tier ids when in rescan mode so the scope stays small.
  let mopRaidTierIds: string[] | null = null
  if (RESCAN_MOP_FLEX) {
    const { data: mopExp } = await supabase
      .from('expansions')
      .select('id, name')
      .or('name.ilike.%Pandaria%,name.ilike.%MoP%')
    const mopExpansionIds = (mopExp ?? []).map((e: { id: string }) => e.id)
    if (mopExpansionIds.length === 0) {
      console.error('Could not find any MoP expansions.')
      process.exit(1)
    }
    const { data: mopTiers } = await supabase
      .from('raid_tiers')
      .select('id')
      .in('expansion_id', mopExpansionIds)
    mopRaidTierIds = (mopTiers ?? []).map((t: { id: string }) => t.id)
    console.log(`MoP raid tiers in scope: ${mopRaidTierIds.length}`)
  }

  // Page through loot_items needing backfill.
  const items: Array<{ id: string; name: string; wowhead_id: number }> = []
  const PAGE_SIZE = 1000
  let offset = 0

  while (true) {
    let query = supabase
      .from('loot_items')
      .select('id, name, wowhead_id')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)

    if (RESCAN_MOP_FLEX) {
      query = query
        .eq('primary_stat', 'Stamina')
        .in('armor_type', ['Leather', 'Mail'])
        .in('raid_tier_id', mopRaidTierIds!)
    } else {
      query = query.is('primary_stat', null)
    }

    const { data: page, error } = await query

    if (error) {
      console.error('Error fetching items:', error.message)
      process.exit(1)
    }
    if (!page || page.length === 0) break

    items.push(...page)
    console.log(`  fetched ${items.length} rows…`)
    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  if (items.length === 0) {
    console.log('Nothing to backfill.')
    return
  }

  // Dedupe by wowhead_id so we fetch each tooltip once.
  const uniqueWowheadIds = Array.from(new Set(items.map(i => i.wowhead_id)))
  const targets = LIMIT ? uniqueWowheadIds.slice(0, LIMIT) : uniqueWowheadIds

  console.log(`${items.length} rows, ${uniqueWowheadIds.length} unique wowhead_ids${LIMIT ? ` (limited to ${LIMIT})` : ''}\n`)

  let processed = 0
  let updated = 0
  let none = 0
  let unresolved = 0

  for (const wowheadId of targets) {
    processed++
    const stat = await fetchPrimaryStat(wowheadId)
    const sample = items.find(i => i.wowhead_id === wowheadId)
    const label = `[${processed}/${targets.length}] ${sample?.name || wowheadId}`

    if (stat === null) {
      unresolved++
      console.log(`${label} → UNRESOLVED`)
    } else {
      if (stat === 'None') none++
      console.log(`${label} → ${stat}`)

      if (!DRY_RUN) {
        let update = supabase
          .from('loot_items')
          .update({ primary_stat: stat })
          .eq('wowhead_id', wowheadId)

        if (RESCAN_MOP_FLEX) {
          // Overwrite Stamina-marked rows for this wowhead_id in MoP tiers.
          update = update
            .eq('primary_stat', 'Stamina')
            .in('armor_type', ['Leather', 'Mail'])
            .in('raid_tier_id', mopRaidTierIds!)
        } else {
          update = update.is('primary_stat', null)
        }

        const { error: updateError } = await update

        if (updateError) {
          console.error(`  update failed: ${updateError.message}`)
        } else {
          updated++
        }
      }
    }

    // Be polite to wowhead.
    await sleep(150)
  }

  console.log()
  console.log(`Done. processed=${processed} updated=${updated} none=${none} unresolved=${unresolved}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
