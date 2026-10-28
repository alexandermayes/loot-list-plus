/**
 * Spike: does the Battle.net Game Data item endpoint, in the static-classic
 * namespace, return an integer top-level level for MoP raid items?
 *
 * Quick task 261027-lzm. The gear writers fill character_equipped_items.item_level
 * from this field (lib/battlenet-item-levels.ts), so the code PR merges only
 * when this probe prints levelFieldPresentOnAll: true.
 *
 * The owner runs it from the main checkout, where tsx resolves through
 * node_modules. The command pulls the production environment to a temporary
 * file outside the repo, runs the probe through node --env-file, then removes
 * the temporary file. The exact command is in the quick task 261027-lzm SUMMARY.
 * This script imports no dotenv and reads process.env only; nothing loads
 * .env.local.
 *
 * Optional inputs (set before node):
 *   SPIKE_ITEM_IDS="id1,id2,id3"  positive integers, default 85979,94722,104425
 *                                 (Mogu'shan Vaults Tier 14, Throne of Thunder
 *                                 Tier 15, Siege of Orgrimmar Tier 16 Heroic,
 *                                 all from data/mop-raids.ts). Deduped, 20 at most.
 *   SPIKE_REGION=eu               us (default) or eu
 *
 * Privacy: this repo is public. The report holds labels (i1, i2, ...), numbers,
 * booleans, status codes and JSON key names only. A self-check refuses to print
 * if any fetched item name or the token appears in the serialized report.
 * Tokens stay in memory; only missing variable NAMES are ever printed.
 *
 * Exit codes: 0 report printed, 1 any other failure (generic message),
 * 2 bad input or missing variables, 3 privacy self-check tripped.
 */

const PAUSE_MS = 150
const DEFAULT_ITEM_IDS = '85979,94722,104425'
const MAX_ITEMS = 20
const MAX_ITEM_ID = 2147483647
const MIN_ITEM_LEVEL = 1
const MAX_ITEM_LEVEL = 1999

interface ItemRecord {
  label: string
  status: number | null
  latencyMs: number | null
  levelPresent: boolean
  levelIsInteger: boolean
  level: number | null
  levelInRange: boolean
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function missingEnv(names: string[]): string[] {
  return names.filter((n) => !process.env[n])
}

/** Parse SPIKE_ITEM_IDS. Returns null on any bad entry; never echoes a value. */
function parseItemIds(raw: string): number[] | null {
  const ids: number[] = []
  for (const part of raw.split(',')) {
    const trimmed = part.trim()
    if (!/^[1-9]\d*$/.test(trimmed)) return null
    const id = Number(trimmed)
    if (!Number.isSafeInteger(id) || id > MAX_ITEM_ID) return null
    if (!ids.includes(id)) ids.push(id)
  }
  return ids.slice(0, MAX_ITEMS)
}

async function getAppToken(): Promise<string> {
  const id = process.env.BLIZZARD_CLIENT_ID
  const secret = process.env.BLIZZARD_CLIENT_SECRET
  const res = await fetch('https://oauth.battle.net/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  })
  if (!res.ok) {
    // Status only: the response body could echo credentials back.
    throw new Error(`token request failed with status ${res.status}`)
  }
  const json = (await res.json()) as { access_token?: string }
  if (!json.access_token) throw new Error('token response had no access_token')
  return json.access_token
}

/** Every string in an item name: a plain string, or the values of a localized object. */
function nameStrings(name: unknown): string[] {
  if (typeof name === 'string') return [name]
  if (typeof name === 'object' && name !== null) {
    return Object.values(name as Record<string, unknown>).filter((v): v is string => typeof v === 'string')
  }
  return []
}

async function probeItem(
  id: number,
  label: string,
  region: string,
  token: string,
  topLevelKeys: Set<string>,
  needles: Set<string>,
): Promise<ItemRecord> {
  const rec: ItemRecord = {
    label,
    status: null,
    latencyMs: null,
    levelPresent: false,
    levelIsInteger: false,
    level: null,
    levelInRange: false,
  }
  const started = Date.now()
  const res = await fetch(`https://${region}.api.blizzard.com/data/wow/item/${id}?locale=en_US`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Battlenet-Namespace': `static-classic-${region}`,
    },
  })
  rec.status = res.status
  rec.latencyMs = Date.now() - started
  if (res.status !== 200) return rec

  const json = (await res.json()) as Record<string, unknown> | null
  if (typeof json !== 'object' || json === null) return rec
  for (const key of Object.keys(json)) topLevelKeys.add(key)
  for (const text of nameStrings(json.name)) {
    const lowered = text.toLowerCase()
    if (lowered.length >= 3) needles.add(lowered)
  }

  const level = json.level
  rec.levelPresent = typeof level === 'number'
  rec.levelIsInteger = typeof level === 'number' && Number.isInteger(level)
  rec.level = typeof level === 'number' ? level : null
  rec.levelInRange = rec.levelIsInteger && (level as number) >= MIN_ITEM_LEVEL && (level as number) <= MAX_ITEM_LEVEL
  return rec
}

async function main() {
  // 1. Inputs, checked before any variable, token or request.
  const itemIds = parseItemIds(process.env.SPIKE_ITEM_IDS ?? DEFAULT_ITEM_IDS)
  if (!itemIds) {
    console.error('SPIKE_ITEM_IDS must be a comma list of positive integers')
    process.exit(2)
  }
  const region = process.env.SPIKE_REGION ?? 'us'
  if (region !== 'us' && region !== 'eu') {
    console.error('SPIKE_REGION must be us or eu')
    process.exit(2)
  }

  // 2. Variables: names only.
  const missing = missingEnv(['BLIZZARD_CLIENT_ID', 'BLIZZARD_CLIENT_SECRET'])
  if (missing.length) {
    console.error('Missing environment variables:', missing.join(', '))
    process.exit(2)
  }

  // 3. Token, in memory only.
  const token = await getAppToken()

  // 4 and 5. Sequential requests, labelled in input order, never by id or name.
  const topLevelKeys = new Set<string>()
  const needles = new Set<string>([token.toLowerCase()])
  const items: ItemRecord[] = []
  for (let i = 0; i < itemIds.length; i++) {
    try {
      items.push(await probeItem(itemIds[i], `i${i + 1}`, region, token, topLevelKeys, needles))
    } catch {
      // Never surface the error text: it can carry the request URL.
      items.push({
        label: `i${i + 1}`,
        status: null,
        latencyMs: null,
        levelPresent: false,
        levelIsInteger: false,
        level: null,
        levelInRange: false,
      })
    }
    if (i < itemIds.length - 1) await sleep(PAUSE_MS)
  }

  const fetched = items.filter((r) => r.status === 200)
  const report = {
    probe: 'item-base-level',
    endpoint: '/data/wow/item/{id}',
    namespace: `static-classic-${region}`,
    fieldPathChecked: 'level',
    itemsTried: itemIds.length,
    itemsFetched: fetched.length,
    items,
    topLevelKeys: [...topLevelKeys].sort(),
    levelFieldPresentOnAll: items.length > 0 && items.every((r) => r.status === 200 && r.levelInRange),
  }

  // Privacy self-check: no fetched item name and not the token may appear in the output.
  const serialized = JSON.stringify(report).toLowerCase()
  if ([...needles].some((n) => serialized.includes(n))) {
    console.log('privacy self-check failed')
    process.exit(3)
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

main().catch(() => {
  // Generic on purpose: error text can include URLs and response bodies.
  console.error('probe failed')
  process.exit(1)
})
