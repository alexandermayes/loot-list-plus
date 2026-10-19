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
 * Every request sends only USER_AGENT, on every attempt. A 403 is retried with
 * the same backoff as 429 and 5xx and is never retried under another identity,
 * because changing identity to get past a block would work around an access
 * control (owner decision 2026-10-14). A block that persists is an outage.
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
  raidMapIds,
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

// 403 is retried like the others: a public host can answer a scripted fetch with
// 403 for a while (research A4: 403 on 2026-09-13, 200 on 2026-09-25). It is never
// worked around by changing identity, so one that persists is simply an outage.
const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([403, 429, 500, 502, 503, 504])

/** A failure worth another attempt: a retryable status, a network error or a timeout. */
export class RetryableHttpError extends Error {
  constructor(
    message: string,
    /** HTTP status, or null for a network error or timeout. */
    readonly status: number | null,
    /** Parsed Retry-After in milliseconds, when the response carried a readable one. */
    readonly retryAfterMs: number | null = null,
  ) {
    super(message)
    this.name = 'RetryableHttpError'
  }
}

/** A failure retrying cannot fix: a 404, any other non-2xx. */
export class TerminalHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'TerminalHttpError'
  }
}

// Retry-After in seconds. The HTTP-date form is not honoured; backoff applies instead.
function retryAfterMs(response: Response): number | null {
  const header = response.headers.get('retry-after')
  if (header === null || !/^\d+$/.test(header.trim())) return null
  return Number(header.trim()) * 1000
}

/**
 * One attempt: the USER_AGENT header and nothing else, with a 30 s timeout.
 * Retryable statuses, network errors and timeouts throw RetryableHttpError; any
 * other non-2xx throws TerminalHttpError. Both carry the status in the message.
 */
async function fetchText(fetchImpl: typeof fetch, url: string): Promise<string> {
  let response: Response
  try {
    response = await fetchImpl(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new RetryableHttpError(`GET ${url} failed before a response: ${reason}`, null)
  }
  if (!response.ok) {
    const message = `GET ${url} failed with HTTP ${response.status}`
    if (RETRYABLE_STATUSES.has(response.status)) {
      throw new RetryableHttpError(message, response.status, retryAfterMs(response))
    }
    throw new TerminalHttpError(message, response.status)
  }
  try {
    return await response.text()
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new RetryableHttpError(`GET ${url} failed while reading the body: ${reason}`, null)
  }
}

export type RetryResult<T> =
  | { kind: 'ok'; value: T; attempts: number }
  | { kind: 'exhausted'; attempts: number; lastStatus: number | null }

export interface RetryOptions {
  attempts?: number
  baseMs?: number
  capMs?: number
  sleep: (ms: number) => Promise<void>
  random?: () => number
  /** Called before each wait, for logging. `attempt` is the one that just failed. */
  onRetry?: (info: { attempt: number; status: number | null; delayMs: number }) => void
}

/**
 * Runs `fn` up to `attempts` times. After failure k (1-based) it waits
 * baseMs * 2^(k-1), jittered by plus or minus 25 percent, and never longer than
 * capMs. A Retry-After on the failure replaces that delay (still capped). Only
 * RetryableHttpError is retried: a TerminalHttpError or any other error
 * propagates at once. Running out of attempts is a result, not a throw, so the
 * caller decides what an outage means.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<RetryResult<T>> {
  const { attempts = 5, baseMs = 2000, capMs = 60_000, sleep, random = Math.random, onRetry } = options
  let lastStatus: number | null = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return { kind: 'ok', value: await fn(), attempts: attempt }
    } catch (error) {
      if (!(error instanceof RetryableHttpError)) throw error
      lastStatus = error.status
      if (attempt === attempts) break
      const jittered = baseMs * 2 ** (attempt - 1) * (0.75 + random() * 0.5)
      const delayMs = Math.min(capMs, error.retryAfterMs ?? jittered)
      onRetry?.({ attempt, status: error.status, delayMs })
      await sleep(delayMs)
    }
  }
  return { kind: 'exhausted', attempts, lastStatus }
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
 * whose MapID is a manifest mapId, or whose normalised name matches a boss of
 * a raid and whose map is that raid's (a Classic "Onyxia" on another map is
 * dropped); maps by mapId or by raid name or alias; items by manifest item id.
 * Names go through normalizeCatalogName (curly apostrophes, spacing, case).
 */
export function trimToManifest(tables: Tables, manifest: ExpansionManifest): Tables {
  const raidNames = new Set<string>()
  const mapIds = new Set<number>()
  for (const raid of manifest.raids) {
    for (const name of [raid.name, ...raid.previousNames]) {
      const normalized = normalizeCatalogName(name)
      if (normalized !== null) raidNames.add(normalized)
    }
    if (raid.mapId !== null) mapIds.add(raid.mapId)
  }
  const itemIds = new Set(Object.keys(manifest.items))

  // A boss name only counts on its own raid's map: the pinned product also
  // carries the Classic encounters, which reuse names such as "Onyxia".
  const scopes = manifest.raids.map((raid) => {
    const names = new Set<string>()
    for (const boss of raid.bosses) {
      const normalized = normalizeCatalogName(boss.name)
      if (normalized !== null) names.add(normalized)
    }
    return { mapIds: raidMapIds(raid, tables.Map), names }
  })

  const isNamed = (value: string, names: Set<string>) => {
    const normalized = normalizeCatalogName(value)
    return normalized !== null && names.has(normalized)
  }

  return {
    DungeonEncounter: byId(
      tables.DungeonEncounter.filter(
        (row) =>
          mapIds.has(row.MapID) ||
          scopes.some((scope) => scope.mapIds.has(row.MapID) && isNamed(row.Name_lang, scope.names)),
      ),
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
  | { outcome: 'outage'; attempts: number; lastStatus: number | null }
  | { outcome: 'unchanged'; build: string; sha256: string; promotable: PromotableBoss[] }
  | { outcome: 'updated'; build: string; sha256: string; snapshot: ReferenceSnapshot; promotable: PromotableBoss[] }

// Thrown inside refreshSnapshot when a request runs out of retries, and caught
// there to become the 'outage' outcome. It never leaves this module.
class WagoOutage extends Error {
  constructor(
    readonly attempts: number,
    readonly lastStatus: number | null,
  ) {
    super(`wago unavailable after ${attempts} attempts`)
  }
}

/**
 * Re-pulls the pinned tables for the newest build under the manifest's prefix,
 * trims them, and writes the snapshot only when the build or the canonical hash
 * differs from the committed one. fetchedAt is excluded from the hash, so a
 * re-pull of unchanged data never produces a diff (research Pitfall 4). The
 * snapshot is schema-validated before any write.
 *
 * Outage set (D-13 as amended 2026-10-14): when retries run out on 403, 429,
 * 500, 502, 503, 504, a network error or a timeout, on any request, it returns
 * outcome 'outage' and writes nothing. Everything else throws: a 404 or other
 * non-2xx, a missing CSV header, an unknown builds shape, no build under the
 * prefix, an untrimmed DungeonEncounter or Map table with zero rows, a snapshot
 * that fails the schema.
 */
export async function refreshSnapshot(deps: RefreshDeps): Promise<RefreshResult> {
  try {
    return await refresh(deps)
  } catch (error) {
    if (error instanceof WagoOutage) {
      return { outcome: 'outage', attempts: error.attempts, lastStatus: error.lastStatus }
    }
    throw error
  }
}

async function refresh(deps: RefreshDeps): Promise<RefreshResult> {
  const { fetchImpl, manifest, log } = deps
  const { product, buildPrefix } = manifest.reference

  // Every request goes through the same retry policy and the same single identity.
  const get = async (url: string): Promise<string> => {
    const result = await withRetry(() => fetchText(fetchImpl, url), {
      sleep: deps.sleep,
      random: deps.random,
      onRetry: ({ attempt, status, delayMs }) =>
        log(`attempt ${attempt} failed (${status === null ? 'no response' : `HTTP ${status}`}); retrying in ${delayMs} ms`),
    })
    if (result.kind === 'exhausted') throw new WagoOutage(result.attempts, result.lastStatus)
    return result.value
  }

  const buildsText = await get(BUILDS_URL)
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
    const csv = await get(tableUrl(table, build))
    // The cast is per table: parseTable's return type tracks the table name.
    ;(untrimmed as Record<PinnedTable, unknown>)[table] = parseTable(csv, table)
  }
  const pulled = untrimmed as Tables

  // A 200 with a header and no rows (wrong build, truncated export, partial
  // upstream outage) would trim to empty tables and open a PR that deletes every
  // reference row, quietly disabling the D-15 forcing function. These two tables
  // are never empty for a real build, so treat that as a terminal error rather
  // than an outage. ItemSparse is not checked: the manifest has no items yet.
  log(
    `pulled ${pulled.DungeonEncounter.length} encounters, ${pulled.Map.length} maps, ` +
      `${pulled.ItemSparse.length} items for build ${build}`,
  )
  for (const table of ['DungeonEncounter', 'Map'] as const) {
    if (pulled[table].length === 0) throw new Error(`${table}: wago returned no rows for build ${build}`)
  }

  const tables = trimToManifest(pulled, manifest)

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
