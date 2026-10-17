/**
 * Offline refresh of the committed wago reference snapshot (EXPN-06; D-13, D-15).
 *
 * This is the one approved network-touching module in the repo. Runtime code,
 * app code and tests never fetch the wago service: the snapshot is refreshed
 * only by scripts/expansions/snapshot-reference.ts in the scheduled workflow,
 * and every fetch here goes through an injected `fetchImpl` so tests stay
 * offline.
 *
 * The endpoint paths are assumptions (research A4 and A7): the builds list at
 * /api/builds (shape unconfirmed, so resolveBuild accepts three) and the table
 * CSVs at /db2/<Table>/csv?build=<build>. The expected CSV headers come from
 * WoWDBDefs. The first successful pull is where all of these are confirmed;
 * until then a wrong guess fails loudly (a missing header or an unknown builds
 * shape throws) instead of writing a partial snapshot.
 *
 * Side-effect free at import time: no I/O, no console output.
 */
import { createHash } from 'node:crypto'
import { parse } from 'csv-parse/sync'
import type { ExpansionManifest } from '@/domain/expansion/manifest-schema'
import {
  ReferenceSnapshotSchema,
  canonicalSnapshotPayload,
  type ReferenceSnapshot,
} from '@/domain/expansion/reference-snapshot-schema'
import {
  findPromotableBosses,
  type PromotableBoss,
  type ProvisionalAllowlistEntry,
} from '@/data/expansions/forever/reference-check'
import { normalizeCatalogName } from '@/lib/loot/guild-scoped-lookup'

/** The only place in TypeScript that names the wago host. */
export const WAGO_BASE_URL = 'https://wago.tools'

/** Sent on every request. Plain scripted fetches got a 403 on 2026-09-13 (research A4). */
export const USER_AGENT = 'LootListPlus-reference-snapshot'

export const PINNED_TABLES = ['DungeonEncounter', 'Map', 'ItemSparse'] as const
export type PinnedTable = (typeof PINNED_TABLES)[number]

type Tables = ReferenceSnapshot['tables']

/** Column names per table, from WoWDBDefs. Array columns may flatten with _N suffixes and are ignored. */
export const EXPECTED_HEADERS: Record<PinnedTable, readonly string[]> = {
  DungeonEncounter: ['ID', 'Name_lang', 'MapID', 'OrderIndex', 'DifficultyID'],
  Map: ['ID', 'MapName_lang', 'InstanceType', 'ExpansionID', 'Directory'],
  ItemSparse: ['ID', 'Display_lang', 'InventoryType'],
}

// Which expected columns hold integers; the rest hold text.
const INTEGER_COLUMNS: Record<PinnedTable, readonly string[]> = {
  DungeonEncounter: ['ID', 'MapID', 'OrderIndex', 'DifficultyID'],
  Map: ['ID', 'InstanceType', 'ExpansionID'],
  ItemSparse: ['ID', 'InventoryType'],
}

const SOURCE_TEMPLATE = `${WAGO_BASE_URL}/db2/{table}/csv?build={build}`
const BUILDS_URL = `${WAGO_BASE_URL}/api/builds`
const REQUEST_TIMEOUT_MS = 30_000

function tableUrl(table: PinnedTable, build: string): string {
  return SOURCE_TEMPLATE.replace('{table}', table).replace('{build}', encodeURIComponent(build))
}

/**
 * One attempt: the USER_AGENT header and a 30 s timeout. A non-2xx response
 * throws with the status in the message.
 */
async function fetchText(fetchImpl: typeof fetch, url: string): Promise<string> {
  const response = await fetchImpl(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`GET ${url} failed with HTTP ${response.status}`)
  }
  return response.text()
}

function versionsFrom(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  const versions: string[] = []
  for (const entry of list) {
    if (typeof entry === 'string') versions.push(entry)
    else if (entry !== null && typeof entry === 'object' && typeof (entry as { version?: unknown }).version === 'string') {
      versions.push((entry as { version: string }).version)
    }
  }
  return versions
}

function lastSegment(build: string): number {
  const parts = build.split('.')
  return Number(parts[parts.length - 1])
}

/**
 * Picks the newest build that starts with `prefix`. The builds list is not
 * date-sorted, and a string compare would rank 1.60.1.9 above 1.60.1.70009, so
 * the last segment (the build number) is compared as a number. Accepts a flat
 * list of versions, a list of { version } objects, or an object keyed by
 * product, because the real shape is unconfirmed.
 */
export function resolveBuild(buildsJson: unknown, prefix: string, product: string): string {
  let candidates: string[]
  if (Array.isArray(buildsJson)) {
    candidates = versionsFrom(buildsJson)
  } else if (buildsJson !== null && typeof buildsJson === 'object') {
    candidates = versionsFrom((buildsJson as Record<string, unknown>)[product])
  } else {
    throw new Error('unrecognised builds list: expected a list or an object keyed by product')
  }

  const matching = candidates.filter((build) => build.startsWith(prefix) && /^\d+(\.\d+)+$/.test(build))
  if (matching.length === 0) {
    throw new Error(`no build starting with "${prefix}" for product "${product}" (${candidates.length} builds listed)`)
  }
  return matching.reduce((best, build) => (lastSegment(build) > lastSegment(best) ? build : best))
}

function toInteger(value: string, table: PinnedTable, column: string, rowNumber: number): number {
  const trimmed = value.trim()
  const parsed = Number(trimmed)
  if (!/^-?\d+$/.test(trimmed) || !Number.isSafeInteger(parsed)) {
    throw new Error(`${table} row ${rowNumber}: column ${column} is not an integer`)
  }
  return parsed
}

/**
 * Parses one table's CSV. Checks the expected headers first so a renamed
 * column fails with its name rather than as a pile of undefined rows, then
 * keeps only the expected columns with strict integer parsing.
 */
export function parseTable<T extends PinnedTable>(csvText: string, table: T): Tables[T] {
  let header: string[] | null = null
  let records: Record<string, string>[]
  try {
    records = parse(csvText, {
      columns: (columns: string[]) => {
        header = columns
        return columns
      },
      bom: true,
      skip_empty_lines: true,
    })
  } catch (error) {
    throw new Error(`${table}: CSV could not be parsed (${error instanceof Error ? error.message : String(error)})`)
  }

  const present = new Set<string>(header ?? [])
  const missing = EXPECTED_HEADERS[table].filter((column) => !present.has(column))
  if (missing.length > 0) {
    throw new Error(`${table}: missing expected header(s) ${missing.join(', ')}`)
  }

  const integers = new Set(INTEGER_COLUMNS[table])
  const rows = records.map((record, index) => {
    const row: Record<string, string | number> = {}
    for (const column of EXPECTED_HEADERS[table]) {
      row[column] = integers.has(column)
        ? toInteger(record[column] ?? '', table, column, index + 1)
        : (record[column] ?? '')
    }
    return row
  })
  return rows as unknown as Tables[T]
}

function byId<Row extends { ID: number }>(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => a.ID - b.ID)
}

/**
 * Keeps only what the manifest references, so the committed file stays small
 * and a refresh diff shows only rows the manifest cares about: encounters
 * whose normalised name matches a manifest boss or whose MapID is a manifest
 * mapId; maps by mapId or by raid name or alias; items by manifest item id.
 * Names go through normalizeCatalogName (curly apostrophes, spacing, case).
 */
export function trimToManifest(tables: Tables, manifest: ExpansionManifest): Tables {
  const bossNames = new Set<string>()
  const raidNames = new Set<string>()
  const mapIds = new Set<number>()
  for (const raid of manifest.raids) {
    for (const name of [raid.name, ...raid.previousNames]) {
      const normalized = normalizeCatalogName(name)
      if (normalized !== null) raidNames.add(normalized)
    }
    if (raid.mapId !== null) mapIds.add(raid.mapId)
    for (const boss of raid.bosses) {
      const normalized = normalizeCatalogName(boss.name)
      if (normalized !== null) bossNames.add(normalized)
    }
  }
  const itemIds = new Set(Object.keys(manifest.items))

  const isNamed = (value: string, names: Set<string>) => {
    const normalized = normalizeCatalogName(value)
    return normalized !== null && names.has(normalized)
  }

  return {
    DungeonEncounter: byId(
      tables.DungeonEncounter.filter((row) => mapIds.has(row.MapID) || isNamed(row.Name_lang, bossNames)),
    ),
    Map: byId(tables.Map.filter((row) => mapIds.has(row.ID) || isNamed(row.MapName_lang, raidNames))),
    ItemSparse: byId(tables.ItemSparse.filter((row) => itemIds.has(String(row.ID)))),
  }
}

export interface RefreshDeps {
  fetchImpl: typeof fetch
  sleep: (ms: number) => Promise<void>
  random: () => number
  /** ISO 8601 timestamp; injected so tests are deterministic. */
  now: () => string
  readCommitted: () => ReferenceSnapshot | Promise<ReferenceSnapshot>
  writeSnapshot: (snapshot: ReferenceSnapshot) => void | Promise<void>
  manifest: ExpansionManifest
  allowlist: readonly ProvisionalAllowlistEntry[]
  log: (line: string) => void
}

export type RefreshResult =
  | { outcome: 'unchanged'; build: string; sha256: string; promotable: PromotableBoss[] }
  | { outcome: 'updated'; build: string; sha256: string; snapshot: ReferenceSnapshot; promotable: PromotableBoss[] }

/**
 * Re-pulls the pinned tables for the newest build under the manifest's prefix,
 * trims them, and writes the snapshot only when the build or the canonical hash
 * differs from the committed one. fetchedAt is excluded from the hash, so a
 * re-pull of unchanged data never produces a diff (research Pitfall 4). The
 * snapshot is schema-validated before any write.
 */
export async function refreshSnapshot(deps: RefreshDeps): Promise<RefreshResult> {
  const { fetchImpl, manifest, log } = deps
  const { product, buildPrefix } = manifest.reference

  const buildsText = await fetchText(fetchImpl, BUILDS_URL)
  let buildsJson: unknown
  try {
    buildsJson = JSON.parse(buildsText)
  } catch {
    throw new Error('unrecognised builds list: response is not valid JSON')
  }
  const build = resolveBuild(buildsJson, buildPrefix, product)
  log(`resolved build ${build}`)

  const untrimmed: Partial<Tables> = {}
  for (const table of PINNED_TABLES) {
    const csv = await fetchText(fetchImpl, tableUrl(table, build))
    // The cast is per table: parseTable's return type tracks the table name.
    ;(untrimmed as Record<PinnedTable, unknown>)[table] = parseTable(csv, table)
  }
  const tables = trimToManifest(untrimmed as Tables, manifest)

  const sha256 = createHash('sha256').update(canonicalSnapshotPayload({ build, tables })).digest('hex')
  const promotableFrom = (snapshot: ReferenceSnapshot) =>
    findPromotableBosses(manifest, deps.allowlist, snapshot)

  const committed = await deps.readCommitted()
  if (committed.build === build && committed.sha256 === sha256) {
    return {
      outcome: 'unchanged',
      build,
      sha256,
      promotable: promotableFrom({ ...committed, tables }),
    }
  }

  const candidate = {
    source: SOURCE_TEMPLATE,
    product,
    buildPrefix,
    build,
    fetchedAt: deps.now(),
    sha256,
    tables,
  }
  const parsed = ReferenceSnapshotSchema.safeParse(candidate)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
    throw new Error(`built snapshot failed ReferenceSnapshotSchema: ${issues}`)
  }
  await deps.writeSnapshot(parsed.data)
  return { outcome: 'updated', build, sha256, snapshot: parsed.data, promotable: promotableFrom(parsed.data) }
}
