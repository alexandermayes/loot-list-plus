// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PATCH } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'
import { logAudit } from '@/utils/audit/log'
import { NEED_DEFINITIONS } from '@/domain/loot/needs'
import { DISCOVERY_FOREVER_ONLY_REASON, KNOWN_SWITCH_BLOCKED_REASON } from '@/domain/loot/list-mode'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({
  verifyPermission: vi.fn(),
  verifyOfficerPermissions: vi.fn(),
  verifyGuildMasterPermissions: vi.fn(),
}))
vi.mock('@/utils/audit/log', () => ({ logAudit: vi.fn() }))

// ─── Fixture ids (synthetic UUIDs) ──────────────────────────

const GUILD_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const GUILD_B = 'aaaaaaaa-0000-0000-0000-000000000002'
const X_FOREVER = 'bbbbbbbb-0000-0000-0000-000000000001'
const X_CLASSIC = 'bbbbbbbb-0000-0000-0000-000000000002'
const X_OTHER_GUILD = 'bbbbbbbb-0000-0000-0000-000000000003'
const T1 = 'cccccccc-0000-0000-0000-000000000001' // Forever, known, no need rows
const T_DISC = 'cccccccc-0000-0000-0000-000000000002' // Forever, discovery, holds need rows
const T_CLASSIC = 'cccccccc-0000-0000-0000-000000000003'
const T_FOREIGN = 'cccccccc-0000-0000-0000-000000000004'
const T_UNKNOWN = 'cccccccc-0000-0000-0000-000000000099'
const T_FOREVER_KNOWN_WITH_NEEDS = 'cccccccc-0000-0000-0000-000000000005'
const OFFICER_USER_ID = 'eeeeeeee-0000-0000-0000-000000000001'

// ─── Recording fake client ──────────────────────────────────

type Op = 'select' | 'insert' | 'update' | 'delete' | 'upsert'
type Filter = ['eq' | 'in', string, unknown]
interface Call {
  table: string
  op: Op
  filters: Filter[]
  selectCols?: string
  payload?: unknown
  head?: boolean
}

interface TierRow {
  id: string
  expansion_id: string
  list_mode: string
  is_guild_active: boolean
  master_sheet_visible: boolean
}
interface ExpansionRow { id: string; guild_id: string | null; name: string; current_phase?: number }
interface NeedRowState { id: string; raid_tier_id: string; need_key: string; kind: 'need' }

interface Fixture {
  tiers: TierRow[]
  expansions: ExpansionRow[]
  needRows: NeedRowState[]
  rankedLootItemIds: string[] // one loot_submission_items row per entry
  awardedLootItemIds: string[] // one loot_history row per entry
  // Blanket error for every call to `${table}:${op}`.
  errors?: Partial<Record<string, string>>
  // Per-call errors for `${table}:${op}`: the nth call fails when the nth entry is a message.
  errorSequence?: Partial<Record<string, Array<string | null>>>
}

function tier(id: string, expansionId: string, listMode: string): TierRow {
  return { id, expansion_id: expansionId, list_mode: listMode, is_guild_active: true, master_sheet_visible: true }
}

function needRowsFor(tierId: string, idPrefix: string): NeedRowState[] {
  return NEED_DEFINITIONS.map((definition, i) => ({
    id: `${idPrefix}-${i}`,
    raid_tier_id: tierId,
    need_key: definition.key,
    kind: 'need' as const,
  }))
}

function baseFixture(): Fixture {
  return {
    tiers: [
      tier(T1, X_FOREVER, 'known'),
      tier(T_DISC, X_FOREVER, 'discovery'),
      tier(T_CLASSIC, X_CLASSIC, 'known'),
      tier(T_FOREIGN, X_OTHER_GUILD, 'known'),
      tier(T_FOREVER_KNOWN_WITH_NEEDS, X_FOREVER, 'known'),
    ],
    expansions: [
      { id: X_FOREVER, guild_id: GUILD_A, name: 'Forever', current_phase: 2 },
      { id: X_CLASSIC, guild_id: GUILD_A, name: 'Classic', current_phase: 2 },
      { id: X_OTHER_GUILD, guild_id: GUILD_B, name: 'Forever', current_phase: 2 },
    ],
    needRows: [
      ...needRowsFor(T_DISC, 'need-disc'),
      ...needRowsFor(T_FOREVER_KNOWN_WITH_NEEDS, 'need-known'),
    ],
    rankedLootItemIds: [],
    awardedLootItemIds: [],
  }
}

/**
 * The fake mirrors the database rules the route relies on: a need row is
 * refused in a tier that is not Discovery (enforce_loot_item_need_rules), and
 * updates apply to the stateful tier rows so a later read sees them.
 */
function makeClient(fixture: Fixture, calls: Call[]) {
  const tiers = fixture.tiers.map(t => ({ ...t }))
  const needRows = fixture.needRows.map(r => ({ ...r }))
  const seen: Record<string, number> = {}

  const filterValue = (call: Call, kind: Filter[0], col: string) =>
    call.filters.find(f => f[0] === kind && f[1] === col)?.[2]

  function configuredError(call: Call): string | null {
    const key = `${call.table}:${call.op}`
    const index = seen[key] ?? 0
    seen[key] = index + 1
    const sequenced = fixture.errorSequence?.[key]?.[index]
    if (sequenced) return sequenced
    return fixture.errors?.[key] ?? null
  }

  function resolveQuery(call: Call, single: boolean): { data: unknown; error: { message: string } | null; count?: number | null } {
    const message = configuredError(call)
    if (message) return { data: null, error: { message }, count: null }

    if (call.table === 'raid_tiers' && call.op === 'select') {
      const idVal = filterValue(call, 'eq', 'id')
      const expVal = filterValue(call, 'eq', 'expansion_id')
      const rows = tiers.filter(t => (idVal === undefined || t.id === idVal) && (expVal === undefined || t.expansion_id === expVal))
      const copies = rows.map(r => ({ ...r }))
      return { data: single ? (copies[0] ?? null) : copies, error: null }
    }

    if (call.table === 'expansions' && call.op === 'select') {
      const matched = fixture.expansions.find(e => e.id === filterValue(call, 'eq', 'id'))
      return { data: matched ?? null, error: null }
    }

    if (call.table === 'raid_tiers' && call.op === 'update') {
      const idVal = filterValue(call, 'eq', 'id')
      const modeVal = filterValue(call, 'eq', 'list_mode')
      const matched = tiers.filter(t => t.id === idVal && (modeVal === undefined || t.list_mode === modeVal))
      for (const row of matched) Object.assign(row, call.payload)
      return { data: matched.map(r => ({ ...r })), error: null }
    }

    if (call.table === 'loot_items' && call.op === 'select') {
      const tierFilter = filterValue(call, 'eq', 'raid_tier_id')
      const tierIn = filterValue(call, 'in', 'raid_tier_id') as string[] | undefined
      const rows = needRows.filter(
        r => (tierFilter === undefined || r.raid_tier_id === tierFilter) && (tierIn === undefined || tierIn.includes(r.raid_tier_id))
      )
      return { data: rows.map(r => ({ ...r })), error: null }
    }

    if (call.table === 'loot_items' && call.op === 'insert') {
      const rows = call.payload as Array<{ raid_tier_id: string; need_key: string }>
      for (const row of rows) {
        const owner = tiers.find(t => t.id === row.raid_tier_id)
        if (!owner || owner.list_mode !== 'discovery') {
          return { data: null, error: { message: 'need rows are only allowed in a Discovery tier' } }
        }
      }
      needRows.push(...rows.map((r, i) => ({ id: `new-${needRows.length + i}`, raid_tier_id: r.raid_tier_id, need_key: r.need_key, kind: 'need' as const })))
      return { data: null, error: null }
    }

    if ((call.table === 'loot_submission_items' || call.table === 'loot_history') && call.op === 'select') {
      const ids = (filterValue(call, 'in', 'loot_item_id') as string[] | undefined) ?? []
      const source = call.table === 'loot_submission_items' ? fixture.rankedLootItemIds : fixture.awardedLootItemIds
      return { data: null, error: null, count: source.filter(id => ids.includes(id)).length }
    }

    return { data: null, error: null }
  }

  const client = {
    from(table: string) {
      const call: Call = { table, op: 'select', filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (cols?: string, opts?: { head?: boolean }) => { call.selectCols = cols; call.head = opts?.head; return builder },
        insert: (payload: unknown) => { call.op = 'insert'; call.payload = payload; return builder },
        update: (payload: unknown) => { call.op = 'update'; call.payload = payload; return builder },
        delete: () => { call.op = 'delete'; return builder },
        upsert: (payload: unknown) => { call.op = 'upsert'; call.payload = payload; return builder },
        eq: (col: string, val: unknown) => { call.filters.push(['eq', col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push(['in', col, val]); return builder },
        lte: () => builder,
        order: () => builder,
        range: () => builder,
        limit: () => builder,
        maybeSingle: () => Promise.resolve(resolveQuery(call, true)),
        single: () => Promise.resolve(resolveQuery(call, true)),
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(resolveQuery(call, false)).then(resolve, reject),
      }
      return builder
    },
  }
  return { client, tiers, needRows }
}

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/raid-tiers', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PATCH>[0]
}

function setupMocks(client: unknown, { user = true, hasPermission = true } = {}) {
  vi.mocked(createServiceRoleClient).mockReturnValue(client as ReturnType<typeof createServiceRoleClient>)
  vi.mocked(getAuthenticatedUser).mockResolvedValue(
    (user ? { user: { id: OFFICER_USER_ID }, error: null } : { user: null, error: null }) as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>
  )
  vi.mocked(verifyPermission).mockResolvedValue({ hasPermission } as unknown as Awaited<ReturnType<typeof verifyPermission>>)
}

async function run(
  fixture: Fixture,
  body: Record<string, unknown>,
  opts: { user?: boolean; hasPermission?: boolean } = {}
) {
  const calls: Call[] = []
  const made = makeClient(fixture, calls)
  setupMocks(made.client, opts)
  const res = await PATCH(patchRequest({ guild_id: GUILD_A, ...body }))
  const json = await res.json()
  return { res, json, calls, ...made }
}

const writes = (calls: Call[]) => calls.filter(c => c.op !== 'select')
const tierUpdates = (calls: Call[]) => calls.filter(c => c.table === 'raid_tiers' && c.op === 'update')
const needInserts = (calls: Call[]) => calls.filter(c => c.table === 'loot_items' && c.op === 'insert')

describe('PATCH /api/raid-tiers list_mode: switching a Forever tier to Discovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('[DISC-01, D-04, D-17] switches the tier first, then seeds its 145 need rows, and audits once', async () => {
    const { res, json, calls, tiers, needRows } = await run(baseFixture(), {
      tier_id: T1,
      updates: { list_mode: 'discovery' },
    })

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.tier.list_mode).toBe('discovery')
    expect(tiers.find(t => t.id === T1)?.list_mode).toBe('discovery')

    // Call order: tier read, expansion read, switch, need-key read, one insert.
    expect(calls.map(c => `${c.table}:${c.op}`)).toEqual([
      'raid_tiers:select',
      'expansions:select',
      'raid_tiers:update',
      'loot_items:select',
      'loot_items:insert',
    ])

    const [update] = tierUpdates(calls)
    expect(update.payload).toEqual({ list_mode: 'discovery' })
    expect(update.filters).toEqual(expect.arrayContaining([
      ['eq', 'id', T1],
      ['eq', 'list_mode', 'known'],
    ]))

    expect(NEED_DEFINITIONS).toHaveLength(145)
    const [insert] = needInserts(calls)
    const inserted = insert.payload as Array<{ raid_tier_id: string }>
    expect(inserted).toHaveLength(145)
    expect(inserted.every(row => row.raid_tier_id === T1)).toBe(true)
    expect(needRows.filter(r => r.raid_tier_id === T1)).toHaveLength(145)

    expect(logAudit).toHaveBeenCalledTimes(1)
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
      guildId: GUILD_A,
      tableName: 'raid_tiers',
      recordId: T1,
      action: 'UPDATE',
      userId: OFFICER_USER_ID,
      oldData: { list_mode: 'known' },
      newData: { list_mode: 'discovery' },
    }))
  })

  it('[DISC-01] a failed need-row insert switches the tier back to Known, writes no audit row and answers 500', async () => {
    const fixture = baseFixture()
    fixture.errors = { 'loot_items:insert': 'insert exploded' }
    const { res, json, calls, tiers } = await run(fixture, { tier_id: T1, updates: { list_mode: 'discovery' } })

    expect(res.status).toBe(500)
    expect(json.error).toBe('Failed to set up Discovery needs for this raid')

    const updates = tierUpdates(calls)
    expect(updates).toHaveLength(2)
    expect(updates[1].payload).toEqual({ list_mode: 'known' })
    expect(updates[1].filters).toEqual(expect.arrayContaining([
      ['eq', 'id', T1],
      ['eq', 'list_mode', 'discovery'],
    ]))
    expect(tiers.find(t => t.id === T1)?.list_mode).toBe('known')
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('[DISC-01] a failed compensating update still answers 500 and logs with a fixed first argument', async () => {
    const fixture = baseFixture()
    fixture.errors = { 'loot_items:insert': 'insert exploded' }
    fixture.errorSequence = { 'raid_tiers:update': [null, 'revert exploded'] }
    const { res, json, calls } = await run(fixture, { tier_id: T1, updates: { list_mode: 'discovery' } })

    expect(res.status).toBe(500)
    expect(json.error).toBe('Failed to set up Discovery needs for this raid')
    expect(tierUpdates(calls)).toHaveLength(2)
    expect(logAudit).not.toHaveBeenCalled()

    const logged = vi.mocked(console.error).mock.calls.map(args => args[0])
    expect(logged.every(first => typeof first === 'string')).toBe(true)
    expect(logged.filter(first => first === 'Error switching raid tier back to Known after a failed seed:')).toHaveLength(1)
  })

  it('[D-17] the same request for a tier of a non-Forever expansion answers 400 with the reason and writes nothing', async () => {
    const { res, json, calls } = await run(baseFixture(), { tier_id: T_CLASSIC, updates: { list_mode: 'discovery' } })

    expect(res.status).toBe(400)
    expect(json.error).toBe(DISCOVERY_FOREVER_ONLY_REASON)
    expect(writes(calls)).toHaveLength(0)
    expect(logAudit).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/raid-tiers list_mode: guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('[D-03] a loot_submission_items row on a need of the tier blocks the switch to Known with 409', async () => {
    const fixture = baseFixture()
    fixture.rankedLootItemIds = ['need-disc-3']
    const { res, json, calls } = await run(fixture, { tier_id: T_DISC, updates: { list_mode: 'known' } })

    expect(res.status).toBe(409)
    expect(json.error).toBe(KNOWN_SWITCH_BLOCKED_REASON)
    expect(writes(calls)).toHaveLength(0)
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('[D-03] a loot_history row on a need of the tier blocks the switch to Known with 409', async () => {
    const fixture = baseFixture()
    fixture.awardedLootItemIds = ['need-disc-7']
    const { res, json, calls } = await run(fixture, { tier_id: T_DISC, updates: { list_mode: 'known' } })

    expect(res.status).toBe(409)
    expect(json.error).toBe(KNOWN_SWITCH_BLOCKED_REASON)
    expect(writes(calls)).toHaveLength(0)
  })

  it('[D-03] with need rows but no ranking and no award the switch to Known answers 200 and keeps the need rows', async () => {
    const { res, json, calls, needRows, tiers } = await run(baseFixture(), { tier_id: T_DISC, updates: { list_mode: 'known' } })

    expect(res.status).toBe(200)
    expect(json.tier.list_mode).toBe('known')
    expect(tiers.find(t => t.id === T_DISC)?.list_mode).toBe('known')
    expect(calls.filter(c => c.table === 'loot_items' && c.op === 'delete')).toHaveLength(0)
    expect(needRows.filter(r => r.raid_tier_id === T_DISC)).toHaveLength(145)
    // Both counts were read, scoped to the tier's need ids.
    const counts = calls.filter(c => c.head)
    expect(counts.map(c => c.table).sort()).toEqual(['loot_history', 'loot_submission_items'])

    const [update] = tierUpdates(calls)
    expect(update.payload).toEqual({ list_mode: 'known' })
    expect(update.filters).toEqual(expect.arrayContaining([['eq', 'id', T_DISC], ['eq', 'list_mode', 'discovery']]))
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
      tableName: 'raid_tiers',
      oldData: { list_mode: 'discovery' },
      newData: { list_mode: 'known' },
    }))
  })

  it('[D-03] a tier with no need rows switches to Known with no count queries', async () => {
    const fixture = baseFixture()
    fixture.tiers.push(tier('cccccccc-0000-0000-0000-000000000006', X_FOREVER, 'discovery'))
    const { res, calls } = await run(fixture, { tier_id: 'cccccccc-0000-0000-0000-000000000006', updates: { list_mode: 'known' } })

    expect(res.status).toBe(200)
    expect(calls.filter(c => c.table === 'loot_submission_items' || c.table === 'loot_history')).toHaveLength(0)
  })

  it.each([
    ['loot_submission_items'],
    ['loot_history'],
  ])('a failing %s count read answers 500 and writes nothing', async table => {
    const fixture = baseFixture()
    fixture.errors = { [`${table}:select`]: 'count exploded' }
    const { res, calls } = await run(fixture, { tier_id: T_DISC, updates: { list_mode: 'known' } })

    expect(res.status).toBe(500)
    expect(writes(calls)).toHaveLength(0)
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('a failing need-row read answers 500 and writes nothing', async () => {
    const fixture = baseFixture()
    fixture.errors = { 'loot_items:select': 'read exploded' }
    const { res, calls } = await run(fixture, { tier_id: T_DISC, updates: { list_mode: 'known' } })

    expect(res.status).toBe(500)
    expect(writes(calls)).toHaveLength(0)
  })

  it('a failing tier read answers 500 and writes nothing', async () => {
    const fixture = baseFixture()
    fixture.errors = { 'raid_tiers:select': 'read exploded' }
    const { res, json, calls } = await run(fixture, { tier_id: T1, updates: { is_guild_active: false } })

    expect(res.status).toBe(500)
    expect(json.error).toBe('Failed to load raid tier')
    expect(writes(calls)).toHaveLength(0)
  })

  it.each([
    ['is_guild_active', { is_guild_active: false }],
    ['master_sheet_visible', { master_sheet_visible: false }],
    ['list_mode', { list_mode: 'discovery' }],
  ])('[Pitfall 4] %s on a tier of another guild answers 404 and makes no update', async (_field, updates) => {
    const { res, json, calls } = await run(baseFixture(), { tier_id: T_FOREIGN, updates })

    expect(res.status).toBe(404)
    expect(json.error).toBe('Raid tier not found')
    expect(writes(calls)).toHaveLength(0)
  })

  it.each([
    ['is_guild_active', { is_guild_active: false }],
    ['master_sheet_visible', { master_sheet_visible: false }],
    ['list_mode', { list_mode: 'discovery' }],
  ])('[Pitfall 4] %s on an unknown tier id answers 404', async (_field, updates) => {
    const { res, json, calls } = await run(baseFixture(), { tier_id: T_UNKNOWN, updates })

    expect(res.status).toBe(404)
    expect(json.error).toBe('Raid tier not found')
    expect(writes(calls)).toHaveLength(0)
  })

  it('[DISC-01 adjacency] list_mode equal to the current mode and no other field answers 200 with no write', async () => {
    const { res, json, calls } = await run(baseFixture(), { tier_id: T_DISC, updates: { list_mode: 'discovery' } })

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.tier.id).toBe(T_DISC)
    expect(json.tier.list_mode).toBe('discovery')
    expect(writes(calls)).toHaveLength(0)
    expect(needInserts(calls)).toHaveLength(0)
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('[DISC-01 adjacency] list_mode equal to the current mode beside another field applies only the other field', async () => {
    const { res, calls } = await run(baseFixture(), {
      tier_id: T_DISC,
      updates: { list_mode: 'discovery', is_guild_active: false },
    })

    expect(res.status).toBe(200)
    const updates = tierUpdates(calls)
    expect(updates).toHaveLength(1)
    expect(updates[0].payload).toEqual({ is_guild_active: false })
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('an ordinary field update still works for a tier of the guild', async () => {
    const { res, json, calls } = await run(baseFixture(), { tier_id: T1, updates: { master_sheet_visible: false } })

    expect(res.status).toBe(200)
    expect(json.tier.master_sheet_visible).toBe(false)
    const [update] = tierUpdates(calls)
    expect(update.filters).toEqual([['eq', 'id', T1]])
  })

  it('[DISC-01 empty] updates {} answers 400 No valid fields to update', async () => {
    const { res, json, calls } = await run(baseFixture(), { tier_id: T1, updates: {} })

    expect(res.status).toBe(400)
    expect(json.error).toBe('No valid fields to update')
    expect(writes(calls)).toHaveLength(0)
  })

  it('[DISC-01 empty] updates with only unknown keys answer 400 No valid fields to update', async () => {
    const { res, json, calls } = await run(baseFixture(), { tier_id: T1, updates: { name: 'x', expansion_id: X_CLASSIC } })

    expect(res.status).toBe(400)
    expect(json.error).toBe('No valid fields to update')
    expect(writes(calls)).toHaveLength(0)
  })

  it.each([
    ['null', null],
    ['an empty string', ''],
    ['Known', 'Known'],
    ['item', 'item'],
  ])('[DISC-01 empty] list_mode %s answers 400 and writes nothing', async (_label, value) => {
    const { res, json, calls } = await run(baseFixture(), { tier_id: T1, updates: { list_mode: value } })

    expect(res.status).toBe(400)
    expect(json.error).toBe("list_mode must be 'known' or 'discovery'")
    expect(writes(calls)).toHaveLength(0)
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('answers 401 without a user', async () => {
    const { res, calls } = await run(baseFixture(), { tier_id: T1, updates: { list_mode: 'discovery' } }, { user: false })

    expect(res.status).toBe(401)
    expect(calls).toHaveLength(0)
  })

  it('answers 403 without manage_settings and touches nothing', async () => {
    const { res, calls } = await run(baseFixture(), { tier_id: T1, updates: { list_mode: 'discovery' } }, { hasPermission: false })

    expect(res.status).toBe(403)
    expect(calls).toHaveLength(0)
    expect(verifyPermission).toHaveBeenCalledWith(expect.anything(), OFFICER_USER_ID, GUILD_A, 'manage_settings')
  })
})

describe('GET /api/raid-tiers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('selects list_mode on every tier', async () => {
    const calls: Call[] = []
    const { client } = makeClient(baseFixture(), calls)
    setupMocks(client)
    const req = new Request(`http://localhost/api/raid-tiers?expansion_id=${X_FOREVER}&guild_id=${GUILD_A}`) as unknown as Parameters<typeof GET>[0]
    // NextRequest exposes nextUrl; the route only reads searchParams from it.
    Object.defineProperty(req, 'nextUrl', { value: new URL(req.url) })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    const tierSelect = calls.find(c => c.table === 'raid_tiers' && c.op === 'select')
    expect(tierSelect?.selectCols).toContain('list_mode')
    expect(json.tiers.length).toBeGreaterThan(0)
  })
})

describe('[D-02] no list-mode control in Phase 3', () => {
  it('the expansion page does not mention list_mode', () => {
    const source = readFileSync(
      path.resolve(__dirname, '../../../../app/(app)/expansions/[expansionId]/_client.tsx'),
      'utf8'
    )
    expect(source).not.toMatch(/list_mode|listMode|Discovery/)
  })
})
