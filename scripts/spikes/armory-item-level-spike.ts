/**
 * Spike: does the Battle.net Classic character equipment API return a per-slot
 * item level, and how stale is the data?
 *
 * Usage (from the main checkout so .env.local resolves):
 *   npx tsx scripts/spikes/armory-item-level-spike.ts --from-db 10
 *   SPIKE_CHARACTERS="us/some-realm/name;eu/other-realm/name2" npx tsx scripts/spikes/armory-item-level-spike.ts
 *
 * Privacy: this repo is public. The report holds labels (c1, c2, ...), numbers,
 * booleans, status codes and JSON key names only. A self-check refuses to print
 * if any sampled name or realm string appears in the serialized report.
 * Tokens and keys stay in memory; only missing variable NAMES are ever printed.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const PAUSE_MS = 150
const COSMETIC_SLOTS = new Set(['SHIRT', 'TABARD'])

interface Sample {
  region: string
  realmSlug: string
  nameLower: string
  rawRealm: string
}

interface CharacterRecord {
  label: string
  equipmentStatus: number | null
  namespace: string | null
  latencyMs: number | null
  lastModifiedHeaderPresent: boolean
  lastModifiedAgeHours: number | null
  summaryStatus: number | null
  lastLoginAgeHours: number | null
  summaryHasItemLevelField: boolean
  nonCosmeticItems: number
  itemsWithLevel: number
  otherLevelLikeKeys: string[]
  itemKeys: string[]
  slotTypes: string[]
  minLevel: number | null
  maxLevel: number | null
  inventoryTypePresent: boolean
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function missingEnv(names: string[]): string[] {
  return names.filter((n) => !process.env[n])
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

function parseSamples(): Sample[] | null {
  const raw = process.env.SPIKE_CHARACTERS
  if (!raw) return null
  return raw
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [region, realm, name] = entry.split('/')
      return {
        region: (region || 'us').toLowerCase(),
        realmSlug: (realm || '').toLowerCase(),
        nameLower: (name || '').toLowerCase(),
        rawRealm: realm || '',
      }
    })
    .filter((s) => s.realmSlug && s.nameLower)
}

async function sampleFromDb(limit: number): Promise<Sample[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
  const { data: chars, error } = await supabase
    .from('characters')
    .select('id, name, realm, user_id')
    .not('battle_net_id', 'is', null)
    .not('realm', 'is', null)
    .limit(limit)
  if (error || !chars) throw new Error('character sample query failed')

  const userIds = [...new Set(chars.map((c) => c.user_id).filter(Boolean))] as string[]
  const { data: accounts } = await supabase
    .from('battlenet_accounts')
    .select('user_id, region')
    .in('user_id', userIds)
  const regionByUser = new Map((accounts || []).map((a) => [a.user_id as string, a.region as string]))

  return chars.map((c) => ({
    region: regionByUser.get(c.user_id as string) || 'us',
    // Same derivation as sync-gear.
    realmSlug: (c.realm as string).toLowerCase().replace(/\s+/g, '-'),
    nameLower: (c.name as string).toLowerCase(),
    rawRealm: c.realm as string,
  }))
}

function ageHours(ms: number): number {
  return Math.round(((Date.now() - ms) / 3_600_000) * 10) / 10
}

function median(nums: number[]): number | null {
  if (!nums.length) return null
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round(((s[mid - 1] + s[mid]) / 2) * 10) / 10
}

async function probe(sample: Sample, label: string, token: string): Promise<CharacterRecord> {
  const rec: CharacterRecord = {
    label,
    equipmentStatus: null,
    namespace: null,
    latencyMs: null,
    lastModifiedHeaderPresent: false,
    lastModifiedAgeHours: null,
    summaryStatus: null,
    lastLoginAgeHours: null,
    summaryHasItemLevelField: false,
    nonCosmeticItems: 0,
    itemsWithLevel: 0,
    otherLevelLikeKeys: [],
    itemKeys: [],
    slotTypes: [],
    minLevel: null,
    maxLevel: null,
    inventoryTypePresent: false,
  }
  const host = `https://${sample.region}.api.blizzard.com`
  const base = `/profile/wow/character/${sample.realmSlug}/${encodeURIComponent(sample.nameLower)}`
  const namespaces = [`profile-classic-${sample.region}`, `profile-classic1x-${sample.region}`]

  let equipRes: Response | null = null
  const started = Date.now()
  for (let i = 0; i < namespaces.length; i++) {
    const res = await fetch(`${host}${base}/equipment?locale=en_US`, {
      headers: { Authorization: `Bearer ${token}`, 'Battlenet-Namespace': namespaces[i] },
    })
    rec.equipmentStatus = res.status
    rec.namespace = namespaces[i].replace(`-${sample.region}`, '-{region}')
    equipRes = res
    // Retry in classic1x only on 404, per the plan.
    if (res.status !== 404) break
  }
  rec.latencyMs = Date.now() - started
  if (!equipRes || !equipRes.ok) return rec

  const lastModified = equipRes.headers.get('last-modified')
  rec.lastModifiedHeaderPresent = !!lastModified
  if (lastModified) {
    const t = Date.parse(lastModified)
    if (!Number.isNaN(t)) rec.lastModifiedAgeHours = ageHours(t)
  }

  const body = (await equipRes.json()) as { equipped_items?: Array<Record<string, unknown>> }
  const items = Array.isArray(body.equipped_items) ? body.equipped_items : []
  const keys = new Set<string>()
  const slotTypes = new Set<string>()
  const otherKeys = new Set<string>()
  const levels: number[] = []

  for (const item of items) {
    Object.keys(item).forEach((k) => keys.add(k))
    const slot = item.slot as { type?: string } | undefined
    const slotType = slot?.type
    if (slotType) slotTypes.add(slotType)
    if (item.inventory_type) rec.inventoryTypePresent = true
    for (const [k, v] of Object.entries(item)) {
      if (k !== 'level' && typeof v === 'number' && /level|ilvl/i.test(k)) otherKeys.add(k)
    }
    if (slotType && COSMETIC_SLOTS.has(slotType)) continue
    rec.nonCosmeticItems++
    const level = (item.level as { value?: unknown } | undefined)?.value
    if (typeof level === 'number' && Number.isInteger(level) && level > 0) {
      rec.itemsWithLevel++
      levels.push(level)
    }
  }
  rec.itemKeys = [...keys].sort()
  rec.slotTypes = [...slotTypes].sort()
  rec.otherLevelLikeKeys = [...otherKeys].sort()
  if (levels.length) {
    rec.minLevel = Math.min(...levels)
    rec.maxLevel = Math.max(...levels)
  }

  await sleep(PAUSE_MS)
  const summaryRes = await fetch(`${host}${base}?locale=en_US`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Battlenet-Namespace': namespaces.find((n) => n.startsWith(rec.namespace!.split('-{')[0])) || namespaces[0],
    },
  })
  rec.summaryStatus = summaryRes.status
  if (summaryRes.ok) {
    const summary = (await summaryRes.json()) as Record<string, unknown>
    if (typeof summary.last_login_timestamp === 'number') {
      rec.lastLoginAgeHours = ageHours(summary.last_login_timestamp)
    }
    rec.summaryHasItemLevelField =
      typeof summary.equipped_item_level === 'number' || typeof summary.average_item_level === 'number'
  }
  return rec
}

async function main() {
  const missing = missingEnv(['BLIZZARD_CLIENT_ID', 'BLIZZARD_CLIENT_SECRET'])
  if (missing.length) {
    console.error(`Missing environment variables: ${missing.join(', ')}`)
    process.exit(2)
  }

  let samples = parseSamples()
  if (!samples) {
    const missingDb = missingEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
    if (missingDb.length) {
      console.error(
        `Missing environment variables (or set SPIKE_CHARACTERS): ${missingDb.join(', ')}`
      )
      process.exit(2)
    }
    const flag = process.argv.indexOf('--from-db')
    const n = flag >= 0 ? parseInt(process.argv[flag + 1] || '', 10) : NaN
    samples = await sampleFromDb(Number.isFinite(n) && n > 0 ? n : 10)
  }

  const token = await getAppToken()
  const records: CharacterRecord[] = []
  for (let i = 0; i < samples.length; i++) {
    try {
      records.push(await probe(samples[i], `c${i + 1}`, token))
    } catch {
      // Never surface the error text: it can carry request URLs with names.
      records.push({
        label: `c${i + 1}`,
        equipmentStatus: null,
        namespace: null,
        latencyMs: null,
        lastModifiedHeaderPresent: false,
        lastModifiedAgeHours: null,
        summaryStatus: null,
        lastLoginAgeHours: null,
        summaryHasItemLevelField: false,
        nonCosmeticItems: 0,
        itemsWithLevel: 0,
        otherLevelLikeKeys: [],
        itemKeys: [],
        slotTypes: [],
        minLevel: null,
        maxLevel: null,
        inventoryTypePresent: false,
      })
    }
    await sleep(PAUSE_MS)
  }

  const fetched = records.filter((r) => r.equipmentStatus === 200)
  const totalItems = fetched.reduce((a, r) => a + r.nonCosmeticItems, 0)
  const withLevel = fetched.reduce((a, r) => a + r.itemsWithLevel, 0)
  const stale = fetched.map((r) => r.lastLoginAgeHours).filter((x): x is number => x != null)
  const allLevels = fetched.flatMap((r) => [r.minLevel, r.maxLevel]).filter((x): x is number => x != null)

  const report = {
    fieldPathChecked: 'equipped_items[].level.value',
    samplesTried: samples.length,
    samplesFetched: fetched.length,
    nonCosmeticItems: totalItems,
    itemsWithLevel: withLevel,
    coveragePercent: totalItems ? Math.round((withLevel / totalItems) * 1000) / 10 : null,
    levelRange: allLevels.length ? [Math.min(...allLevels), Math.max(...allLevels)] : null,
    medianLastLoginAgeHours: median(stale),
    maxLastLoginAgeHours: stale.length ? Math.max(...stale) : null,
    characters: records,
  }

  // Privacy self-check: no sampled name or realm may appear in the output.
  const serialized = JSON.stringify(report).toLowerCase()
  const needles = samples
    .flatMap((s) => [s.nameLower, s.realmSlug, s.rawRealm.toLowerCase()])
    .filter((x) => x.length >= 3)
  if (needles.some((n) => serialized.includes(n))) {
    console.log('privacy self-check failed')
    process.exit(3)
  }
  console.log(JSON.stringify(report, null, 2))
}

main().catch(() => {
  // Generic on purpose: error text can include URLs that carry character names.
  console.error('spike failed')
  process.exit(1)
})
