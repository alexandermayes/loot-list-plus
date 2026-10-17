/**
 * Logic for scripts/sync-forever-catalog.ts: argument parsing, the paged run
 * over every Forever expansion, report formatting, the duplicate-name check and
 * the exit code. No top-level side effects, no env loading, no console output,
 * so it can be tested against a fake client without credentials (the
 * scripts/lib/gift-code.ts precedent).
 *
 * Writes go only through syncExpansionCatalog, which is insert-only. This file
 * reads the expansions and raid_tiers tables and nothing else, and the report
 * carries expansion ids, guild ids, manifest tier names and counts only
 * (Standing Constraint 3).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { syncExpansionCatalog } from '@/app/services/expansionCatalogSync'
import { FOREVER_EXPANSION_NAME } from '@/domain/expansion/game'
import { normalizeCatalogName } from '@/lib/loot/guild-scoped-lookup'
import { selectAllPagesOrThrow } from '@/utils/supabase/paginate'

/** The single error type for operator-input mistakes, so the CLI prints it without a stack trace. */
export class ForeverSyncArgError extends Error {}

export interface ForeverSyncOptions {
  apply: boolean
  help: boolean
}

export interface ForeverSyncTierPlan {
  name: string
  phase: number
  sort_order: number
}

export interface ForeverSyncExpansionReport {
  expansionId: string
  guildId: string | null
  matched: number
  toInsert: ForeverSyncTierPlan[]
}

export interface ForeverSyncFailure {
  expansionId: string
  message: string
}

export interface ForeverSyncDuplicate {
  expansionId: string
  names: string[]
}

export interface ForeverSyncReport {
  apply: boolean
  expansions: ForeverSyncExpansionReport[]
  failures: ForeverSyncFailure[]
  duplicates: ForeverSyncDuplicate[]
}

const VALID_FLAGS = ['--apply', '--help', '-h']

/**
 * Anything other than the known flags is an error, never a silent fallback:
 * a typo such as --aply must not quietly run as a dry run the owner mistakes
 * for an apply, and a stray argument must not be ignored.
 */
export function parseForeverSyncArgs(argv: readonly string[]): ForeverSyncOptions {
  const options: ForeverSyncOptions = { apply: false, help: false }
  for (const arg of argv) {
    if (!VALID_FLAGS.includes(arg)) {
      throw new ForeverSyncArgError(
        `Unrecognized argument "${arg}". Valid flags: ${VALID_FLAGS.join(', ')}`
      )
    }
    if (arg === '--apply') options.apply = true
    else options.help = true
  }
  return options
}

interface ForeverExpansionRow {
  id: string
  guild_id: string | null
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Normalized tier names that appear more than once, each reported once under
 * its first-seen spelling. raid_tiers has no unique index on (expansion_id,
 * name), so this is the only place a concurrent-insert duplicate becomes
 * visible.
 */
export function findDuplicateTierNames(rows: ReadonlyArray<{ name: string }>): string[] {
  const firstSpelling = new Map<string, string>()
  const duplicated = new Set<string>()
  for (const row of rows) {
    const key = normalizeCatalogName(row.name)
    if (key === null) continue
    if (firstSpelling.has(key)) duplicated.add(key)
    else firstSpelling.set(key, row.name)
  }
  return [...duplicated].map(key => firstSpelling.get(key) as string)
}

/**
 * Re-reads one expansion's tiers after an apply and returns its duplicated
 * names. Read only: a duplicate is reported for the owner to resolve by hand,
 * never deleted. A failed read throws so the caller records it as a failure
 * instead of reporting a clean expansion it could not check.
 */
async function readDuplicateTierNames(
  client: SupabaseClient,
  expansionId: string
): Promise<string[]> {
  const { data, error } = await client
    .from('raid_tiers')
    .select('id, name')
    .eq('expansion_id', expansionId)
  if (error) {
    throw new Error(`Failed to re-read raid_tiers for expansion ${expansionId}: ${error.message}`)
  }
  return findDuplicateTierNames((data ?? []) as Array<{ name: string }>)
}

/**
 * Syncs every Forever expansion, dry run unless apply is true. A failure on
 * one expansion is recorded with its id and the loop moves on, so one bad
 * guild cannot hide the rest; re-running heals because the sync is idempotent.
 */
export async function runForeverSync(
  client: SupabaseClient,
  { apply }: { apply: boolean }
): Promise<ForeverSyncReport> {
  const rows = await selectAllPagesOrThrow<ForeverExpansionRow>('forever expansions', (start, end) =>
    client
      .from('expansions')
      .select('id, guild_id')
      .eq('name', FOREVER_EXPANSION_NAME)
      .order('id', { ascending: true })
      .range(start, end)
  )

  const report: ForeverSyncReport = { apply, expansions: [], failures: [], duplicates: [] }

  for (const row of rows) {
    try {
      const result = await syncExpansionCatalog(client, {
        expansionId: row.id,
        expansionName: FOREVER_EXPANSION_NAME,
        dryRun: !apply,
      })
      if (apply) {
        const duplicateNames = await readDuplicateTierNames(client, row.id)
        if (duplicateNames.length > 0) {
          report.duplicates.push({ expansionId: row.id, names: duplicateNames })
        }
      }
      report.expansions.push({
        expansionId: row.id,
        guildId: row.guild_id,
        matched: result.matched.length,
        toInsert: result.inserted.map(({ name, phase, sort_order }) => ({ name, phase, sort_order })),
      })
    } catch (error) {
      report.failures.push({ expansionId: row.id, message: describeError(error) })
    }
  }

  return report
}

/** Plain text: ids, manifest tier names and counts only, no em dashes. */
export function formatForeverSyncReport(report: ForeverSyncReport): string {
  const lines: string[] = []
  lines.push(
    report.apply
      ? 'APPLIED: missing tiers were inserted (existing rows were not touched)'
      : 'DRY RUN: nothing was written (pass --apply to insert the tiers listed below)'
  )
  lines.push('')

  for (const entry of report.expansions) {
    const head = `${entry.expansionId} (guild ${entry.guildId ?? 'unknown'}): matched ${entry.matched}`
    const verb = report.apply ? 'inserted' : 'would insert'
    const tiers = entry.toInsert.map(
      tier => `${tier.name} (phase ${tier.phase}, sort ${tier.sort_order})`
    )
    lines.push(
      tiers.length > 0
        ? `${head}, ${verb} ${tiers.length}: ${tiers.join(', ')}`
        : `${head}, ${verb} 0`
    )
  }

  lines.push('')
  if (report.failures.length > 0) {
    lines.push(`Failures (${report.failures.length}):`)
    for (const failure of report.failures) {
      lines.push(`  ${failure.expansionId}: ${failure.message}`)
    }
  } else {
    lines.push('Failures: none')
  }

  if (report.apply) {
    if (report.duplicates.length > 0) {
      lines.push(`Duplicate tier names (${report.duplicates.length}, not deleted, resolve by hand):`)
      for (const duplicate of report.duplicates) {
        lines.push(`  ${duplicate.expansionId}: ${duplicate.names.join(', ')}`)
      }
    } else {
      lines.push('Duplicate tier names: none')
    }
  } else {
    lines.push('Duplicate tier names: checked after --apply')
  }

  const tierCount = report.expansions.reduce((sum, entry) => sum + entry.toInsert.length, 0)
  lines.push('')
  lines.push(
    `Totals: expansions scanned ${report.expansions.length + report.failures.length}, ` +
      `tiers ${report.apply ? 'inserted' : 'would insert'} ${tierCount}, ` +
      `failures ${report.failures.length}, duplicates ${report.duplicates.length}`
  )
  return lines.join('\n')
}

/** 1 when any expansion failed or any duplicate tier name was found, else 0. */
export function syncExitCode(report: ForeverSyncReport): 0 | 1 {
  return report.failures.length > 0 || report.duplicates.length > 0 ? 1 : 0
}
