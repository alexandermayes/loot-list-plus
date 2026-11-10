#!/usr/bin/env npx tsx
/**
 * Counts the loot lists that already hold a ranked item outside its zone's
 * officer prio pool (#484), grouped by list status.
 *
 * Read-only and aggregate-only: it prints counts and nothing else. No guild,
 * character, list or item name ever reaches the output, so the result can go
 * into a planning doc as is. It applies findPrioViolations the way the submit
 * route does (items recomputed over the list's phase-group tiers, active award
 * locks never re-judged), so the count is the number of lists submit would
 * refuse today.
 *
 * Usage: npx tsx scripts/count-prio-violations.ts --confirm
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Do not point it at production without the owner's go-ahead; the --confirm
 * flag is there so a stray run prints the usage and stops.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { listTierIds } from '@/domain/expansion/list-tier-ids'
import { findPrioViolations, type PrioCheckItem, type PrioLockPosition, type PrioRankedEntry } from '@/domain/loot/prio-violations'
import { fetchExpansionListTiers, type ExpansionListTiers } from '@/lib/loot/prio-check'
import { fetchFilteredLootItems, fetchLootItemsCharacter, type LootItemCharacter } from '@/lib/loot-items-query'
import { paginatedSelect } from '@/utils/supabase/paginate'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

interface SubmissionRow {
  id: string
  character_id: string | null
  expansion_id: string | null
  phase: number | null
  status: string | null
}

interface ItemRow {
  submission_id: string
  loot_item_id: string
  rank: number
  slot: number
}

interface LockRow {
  submission_id: string
  loot_item_id: string
  rank: number
  slot: number
}

interface StatusCount {
  lists: number
  listsWithViolation: number
  violations: number
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>()
  for (const row of rows) {
    const k = key(row)
    const bucket = out.get(k)
    if (bucket) bucket.push(row)
    else out.set(k, [row])
  }
  return out
}

async function main() {
  if (!process.argv.includes('--confirm')) {
    console.log('Usage: npx tsx scripts/count-prio-violations.ts --confirm')
    console.log('Read-only. Counts lists with out-of-prio ranked items by status. Needs the owner\'s go-ahead before a production run.')
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
    process.exit(1)
  }
  const supabase = createClient(url, key)

  // One pass over each table; everything else is served from memory so the
  // run stays at a handful of queries per distinct expansion, phase and spec.
  const [submissions, items, locks] = await Promise.all([
    paginatedSelect<SubmissionRow>((start, end) =>
      supabase
        .from('loot_submissions')
        .select('id, character_id, expansion_id, phase, status')
        .order('id', { ascending: true })
        .range(start, end),
    ),
    paginatedSelect<ItemRow>((start, end) =>
      supabase
        .from('loot_submission_items')
        .select('submission_id, loot_item_id, rank, slot')
        .is('removed_at', null)
        .order('id', { ascending: true })
        .range(start, end),
    ),
    paginatedSelect<LockRow>((start, end) =>
      supabase
        .from('loot_list_slot_locks')
        .select('submission_id, loot_item_id, rank, slot')
        .is('released_at', null)
        .order('id', { ascending: true })
        .range(start, end),
    ),
  ])

  const itemsBySubmission = groupBy(items, row => row.submission_id)
  const locksBySubmission = groupBy(locks, row => row.submission_id)

  const expansionTiers = new Map<string, ExpansionListTiers>()
  const characters = new Map<string, LootItemCharacter | null>()
  // The item set and its prio flags depend only on the expansion, the phase
  // group and the character's class and spec, so lists of raiders with the
  // same spec share one fetch.
  const prioItems = new Map<string, PrioCheckItem[]>()

  const byStatus = new Map<string, StatusCount>()
  let skippedEmpty = 0
  let skippedIncomplete = 0
  let skippedNoCharacter = 0

  for (const submission of submissions) {
    const rows = itemsBySubmission.get(submission.id) ?? []
    if (rows.length === 0) {
      skippedEmpty++
      continue
    }
    if (!submission.character_id || !submission.expansion_id || submission.phase == null) {
      skippedIncomplete++
      continue
    }

    let character = characters.get(submission.character_id)
    if (character === undefined) {
      character = await fetchLootItemsCharacter(supabase, submission.character_id)
      characters.set(submission.character_id, character)
    }
    if (!character) {
      skippedNoCharacter++
      continue
    }

    let tiers = expansionTiers.get(submission.expansion_id)
    if (!tiers) {
      tiers = await fetchExpansionListTiers(supabase, submission.expansion_id)
      expansionTiers.set(submission.expansion_id, tiers)
    }

    const cacheKey = [submission.expansion_id, submission.phase, character.class_id, character.spec_id].join(':')
    let checkItems = prioItems.get(cacheKey)
    if (!checkItems) {
      const tierIds = listTierIds(tiers.tiers, tiers.currentPhase, tiers.phaseGroups, submission.phase)
      checkItems = (await fetchFilteredLootItems(supabase, character, tierIds)) as PrioCheckItem[]
      prioItems.set(cacheKey, checkItems)
    }

    const entries: PrioRankedEntry[] = rows.map(row => ({
      loot_item_id: row.loot_item_id,
      rank: Number(row.rank),
      slot: Number(row.slot),
    }))
    const lockPositions: PrioLockPosition[] = (locksBySubmission.get(submission.id) ?? []).map(lock => ({
      rank: Number(lock.rank),
      slot: Number(lock.slot),
      loot_item_id: lock.loot_item_id,
    }))
    const violations = findPrioViolations(entries, checkItems, lockPositions)

    const status = submission.status ?? 'unknown'
    const count = byStatus.get(status) ?? { lists: 0, listsWithViolation: 0, violations: 0 }
    count.lists++
    if (violations.length > 0) {
      count.listsWithViolation++
      count.violations += violations.length
    }
    byStatus.set(status, count)
  }

  console.log('Lists with at least one ranked item outside officer prio (#484)')
  console.log('status\tlists\tlists_with_violation\tout_of_prio_items')
  for (const [status, count] of [...byStatus.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`${status}\t${count.lists}\t${count.listsWithViolation}\t${count.violations}`)
  }
  console.log('')
  console.log(`Skipped: ${skippedEmpty} lists with no live items, ${skippedIncomplete} with no character, expansion or phase, ${skippedNoCharacter} whose character no longer exists`)
  console.log(`Distinct expansion/phase/spec item sets fetched: ${prioItems.size}`)
}

main().catch(error => {
  // Error objects can carry row data; print the message only.
  console.error('count-prio-violations failed:', error instanceof Error ? error.message : 'unknown error')
  process.exit(1)
})
