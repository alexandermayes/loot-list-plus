// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { findNeedDefinition, needRowColumns } from '@/domain/loot/needs'
import { NEED_BUDGET_CODE, needOverBudgetSentence } from '@/domain/loot/need-budget'
import { NEED_NOT_ELIGIBLE_CODE, NEED_NOT_ELIGIBLE_ERROR } from '@/domain/loot/need-eligibility'
import { fetchActiveSlotLocks } from '@/lib/loot/slot-locks'
import { fetchListPrioItems } from '@/lib/loot/prio-check'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/audit/log', () => ({ logStatusChange: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), setUserMilestone: vi.fn() }))
vi.mock('@/lib/loot/slot-locks', () => ({ fetchActiveSlotLocks: vi.fn(async () => []) }))
vi.mock('@/lib/cache/submission-tag', () => ({ revalidatePendingSubmissions: vi.fn() }))
vi.mock('@/lib/loot/prio-check', () => ({ fetchListPrioItems: vi.fn(async () => []) }))

const GUILD_ID = 'bbbbbbbb-0000-0000-0000-000000000001'
const SUBMISSION_ID = 'bbbbbbbb-0000-0000-0000-000000000002'
const CHARACTER_ID = 'bbbbbbbb-0000-0000-0000-000000000003'
const OWNER_USER_ID = 'bbbbbbbb-0000-0000-0000-000000000004'
const OTHER_USER_ID = 'bbbbbbbb-0000-0000-0000-000000000005'

const NOT_ACTIVE_MEMBER_ERROR = 'Your character needs to rejoin this guild.'

type Call = { table: string; filters: Array<[string, unknown]>; updatePayload?: Record<string, unknown>; selectArg?: string }

interface Fixture {
  submission: { id: string; guild_id: string; character_id: string | null; expansion_id: string; phase: number; status: string; resubmission_count: number; submitted_at: string | null } | null
  // The class and spec names ride in as the PostgREST to-one embeds the route selects.
  character: { id: string; user_id: string; class?: { name: string } | null; spec?: { name: string } | null } | null
  activeMemberships: Array<{ character_id: string; guild_id: string }>
  membershipError?: { message: string } | null
  statusUpdateError?: { code?: string; message: string } | null
  items?: SubmissionItem[]
}

type RaidTierEmbed = { is_guild_active: boolean | null }

interface SubmissionItem {
  rank: number
  slot: number
  loot_item_id: string
  loot_item: {
    id: string
    name: string
    classification: string | null
    item_type: string | null
    item_slot: string | null
    wowhead_id: number | null
    allocation_cost: number | null
    kind?: string | null
    need_key?: string | null
    // PostgREST can return a to-one embed as an object or a one-element array.
    raid_tier?: RaidTierEmbed | RaidTierEmbed[] | null
  }
}

/**
 * Recording fake client. Supports the loot_submissions and characters
 * single() reads, the loot_submission_items read, the guild_settings read,
 * the character_guild_memberships lookup used by findInvalidCharacterIds
 * (filtered by guild_id, is_active and character_id), and loot_submissions
 * updates whose status update result can be configured to fail.
 */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const call: Call = { table, filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (columns?: string) => { call.selectArg = columns; return builder },
        update: (payload: Record<string, unknown>) => { call.updatePayload = payload; return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        is: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        single: () => {
          if (table === 'loot_submissions') {
            return Promise.resolve(fixture.submission ? { data: fixture.submission, error: null } : { data: null, error: { message: 'not found' } })
          }
          if (table === 'characters') {
            return Promise.resolve({ data: fixture.character, error: null })
          }
          if (table === 'guild_settings') {
            return Promise.resolve({ data: null, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        },
        then: (resolve: (v: unknown) => unknown) => {
          if (table === 'character_guild_memberships') {
            if (fixture.membershipError) {
              return Promise.resolve({ data: null, error: fixture.membershipError }).then(resolve)
            }
            const guildId = call.filters.find(([col]) => col === 'guild_id')?.[1]
            const activeOnly = call.filters.some(([col, val]) => col === 'is_active' && val === true)
            const ids = (call.filters.find(([col]) => col === 'character_id')?.[1] ?? []) as string[]
            const rows = activeOnly
              ? fixture.activeMemberships.filter(m => m.guild_id === guildId && ids.includes(m.character_id)).map(m => ({ character_id: m.character_id }))
              : []
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          if (table === 'loot_submission_items') {
            return Promise.resolve({ data: fixture.items ?? [], error: null }).then(resolve)
          }
          if (table === 'loot_submissions' && call.updatePayload) {
            const isStatusUpdate = 'status' in call.updatePayload
            return Promise.resolve({ error: isStatusUpdate ? (fixture.statusUpdateError ?? null) : null }).then(resolve)
          }
          return Promise.resolve({ data: null, error: null }).then(resolve)
        },
      }
      return builder
    },
  }
  return { client, calls }
}

function baseFixture(): Fixture {
  return {
    submission: {
      id: SUBMISSION_ID,
      guild_id: GUILD_ID,
      character_id: CHARACTER_ID,
      expansion_id: 'bbbbbbbb-0000-0000-0000-000000000006',
      phase: 1,
      status: 'draft',
      resubmission_count: 1,
      submitted_at: '2026-09-01T00:00:00.000Z',
    },
    character: { id: CHARACTER_ID, user_id: OWNER_USER_ID, class: { name: 'Mage' }, spec: { name: 'Mage' } },
    activeMemberships: [{ character_id: CHARACTER_ID, guild_id: GUILD_ID }],
  }
}

function request(body: unknown) {
  return new Request('http://localhost/api/loot-submissions/submit', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

// Two loot_items rows of one real item (GH #293), and a single-slot token.
const BINDINGS_IDS = ['bbbbbbbb-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-0000000000b2']
const DESECRATED_IDS = ['bbbbbbbb-0000-0000-0000-0000000000d1', 'bbbbbbbb-0000-0000-0000-0000000000d2']

function tokenRow(rank: number, lootItemId: string, name: string, wowheadId: number): SubmissionItem {
  return {
    rank,
    slot: 1,
    loot_item_id: lootItemId,
    loot_item: {
      id: lootItemId,
      name,
      classification: null,
      item_type: 'Token',
      item_slot: 'Token',
      wowhead_id: wowheadId,
      allocation_cost: 0,
    },
  }
}

const bindings = (rank: number, idx: number) => tokenRow(rank, BINDINGS_IDS[idx], 'Qiraji Bindings of Command', 20928)
const desecrated = (rank: number, idx: number) => tokenRow(rank, DESECRATED_IDS[idx], 'Desecrated Breastplate', 22349)

// Copy of a row with its item's raid_tier embed set (never mutates the input).
function withTier(row: SubmissionItem, raidTier: SubmissionItem['loot_item']['raid_tier']): SubmissionItem {
  return { ...row, loot_item: { ...row.loot_item, raid_tier: raidTier } }
}

const submissionUpdates = (calls: Call[]) => calls.filter(c => c.table === 'loot_submissions' && c.updatePayload)

// A Discovery need pick is fanned out over every Discovery tier of the phase
// group: one loot_items row per tier, the pick's rank, and slot = tier + 1.
const TEN_POINT_KEYS = [
  'main-hand-weapon.spell-damage', // 3
  'trinket.spell-damage', // 3
  'ring.spell-damage', // 2
  'chest.cloth.spell-damage', // 1
  'head.cloth.spell-damage', // 1
]

function needRows(key: string, rank: number, tiers: readonly number[] = [0, 1, 2], over: Partial<SubmissionItem['loot_item']> = {}): SubmissionItem[] {
  const definition = findNeedDefinition(key)
  if (!definition) throw new Error(`unknown need key ${key}`)
  const columns = needRowColumns(definition)
  return tiers.map(tier => {
    const id = `need-row:${key}:${tier}`
    return {
      rank,
      slot: tier + 1,
      loot_item_id: id,
      loot_item: {
        id,
        name: columns.name,
        classification: columns.classification,
        item_type: null,
        item_slot: columns.item_slot,
        wowhead_id: null,
        allocation_cost: columns.allocation_cost,
        kind: 'need',
        need_key: key,
        ...over,
      },
    }
  })
}

// Picks at ranks 50, 49, 48 and so on, one per key, every tier.
function needList(keys: readonly string[], tiers: readonly number[] = [0, 1, 2]): SubmissionItem[] {
  return keys.flatMap((key, index) => needRows(key, 50 - index, tiers))
}

const statusUpdates = (calls: Call[]) => submissionUpdates(calls).filter(c => c.updatePayload && 'status' in c.updatePayload)

async function run(fixture: Fixture, userId = OWNER_USER_ID) {
  const { client, calls } = makeClient(fixture)
  vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)
  vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: userId }, error: null } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>)
  const res = await POST(request({ submission_id: SUBMISSION_ID }))
  return { res, body: await res.json(), calls }
}

describe('POST /api/loot-submissions/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('submits the list of an active member and sets status pending', async () => {
    const { res, body, calls } = await run(baseFixture())
    expect(res.status).toBe(200)
    expect(body).toEqual({ success: true })
    const updates = submissionUpdates(calls)
    expect(updates.map(u => u.updatePayload)).toEqual([
      { resubmission_count: 2 },
      expect.objectContaining({ status: 'pending', change_rejected_at: null, resubmit_reminded_at: null, resubmit_reminder_count: 0 }),
    ])
  })

  it('returns 403 with the rejoin message and writes nothing when the membership is inactive', async () => {
    const fixture = { ...baseFixture(), activeMemberships: [] }
    const { res, body, calls } = await run(fixture)
    expect(res.status).toBe(403)
    expect(body.error).toBe(NOT_ACTIVE_MEMBER_ERROR)
    expect(submissionUpdates(calls)).toHaveLength(0)
    expect(calls.some(c => c.table === 'loot_submission_items')).toBe(false)
  })

  it('checks the membership in the list guild, not another guild', async () => {
    const fixture = { ...baseFixture(), activeMemberships: [{ character_id: CHARACTER_ID, guild_id: 'bbbbbbbb-0000-0000-0000-0000000000ff' }] }
    const { res, body, calls } = await run(fixture)
    expect(res.status).toBe(403)
    expect(body.error).toBe(NOT_ACTIVE_MEMBER_ERROR)
    expect(submissionUpdates(calls)).toHaveLength(0)
  })

  it('returns 500 and writes nothing when the membership lookup fails', async () => {
    const fixture = { ...baseFixture(), membershipError: { message: 'lookup failed' } }
    const { res, calls } = await run(fixture)
    expect(res.status).toBe(500)
    expect(submissionUpdates(calls)).toHaveLength(0)
  })

  it('returns 403 with the rejoin message when the status update fails with 23514', async () => {
    const fixture = { ...baseFixture(), statusUpdateError: { code: '23514', message: 'loot_submissions: a pending or approved list needs an active guild membership' } }
    const { res, body } = await run(fixture)
    expect(res.status).toBe(403)
    expect(body.error).toBe(NOT_ACTIVE_MEMBER_ERROR)
  })

  it('still returns 500 for any other status update error', async () => {
    const fixture = { ...baseFixture(), statusUpdateError: { code: '57014', message: 'canceling statement' } }
    const { res, body } = await run(fixture)
    expect(res.status).toBe(500)
    expect(body.error).toBe('Failed to submit')
  })

  it('still returns 403 with the ownership message for another raider', async () => {
    const { res, body, calls } = await run(baseFixture(), OTHER_USER_ID)
    expect(res.status).toBe(403)
    expect(body.error).toBe('You can only submit your own lists')
    expect(submissionUpdates(calls)).toHaveLength(0)
    expect(calls.some(c => c.table === 'character_guild_memberships')).toBe(false)
  })

  describe('item copy limits (GH #293, #331)', () => {
    const statusUpdates = (calls: Call[]) =>
      submissionUpdates(calls).filter(u => u.updatePayload && 'status' in u.updatePayload)

    it('returns 422 for three Qiraji Bindings in main spec and leaves the status alone', async () => {
      const fixture = { ...baseFixture(), items: [bindings(50, 0), bindings(40, 1), bindings(30, 0)] }
      const { res, body, calls } = await run(fixture)
      expect(res.status).toBe(422)
      expect(body.violations).toContainEqual({
        bracket: 'Main spec',
        rule: 'item_copy_limit',
        detail: '"Qiraji Bindings of Command" is listed 3 times (max 2)',
      })
      expect(statusUpdates(calls)).toHaveLength(0)
    })

    it('submits two Bindings in main spec plus two in off-spec', async () => {
      const fixture = { ...baseFixture(), items: [bindings(50, 0), bindings(30, 1), bindings(20, 0), bindings(5, 1)] }
      const { res, calls } = await run(fixture)
      expect(res.status).toBe(200)
      expect(statusUpdates(calls).map(u => u.updatePayload?.status)).toEqual(['pending'])
    })

    it('counts one token from two bosses as one item within main spec', async () => {
      const over = await run({ ...baseFixture(), items: [desecrated(45, 0), desecrated(30, 1)] })
      expect(over.res.status).toBe(422)
      expect(over.body.violations.map((v: { rule: string }) => v.rule)).toContain('item_copy_limit')
      expect(statusUpdates(over.calls)).toHaveLength(0)

      const ok = await run({ ...baseFixture(), items: [desecrated(45, 0), desecrated(10, 1)] })
      expect(ok.res.status).toBe(200)
      expect(statusUpdates(ok.calls).map(u => u.updatePayload?.status)).toEqual(['pending'])
    })
  })

  describe('tiers the guild turned off (GH #357)', () => {
    const statusUpdates = (calls: Call[]) =>
      submissionUpdates(calls).filter(u => u.updatePayload && 'status' in u.updatePayload)

    // Two visible Bindings rows plus a third whose tier metadata varies.
    const itemsWithThirdTier = (raidTier: SubmissionItem['loot_item']['raid_tier']) => [
      bindings(50, 0),
      bindings(40, 1),
      withTier(bindings(30, 0), raidTier),
    ]

    it('skips a row whose tier is turned off (object join shape) and submits', async () => {
      const { res, body, calls } = await run({ ...baseFixture(), items: itemsWithThirdTier({ is_guild_active: false }) })
      expect(res.status).toBe(200)
      expect(body).toEqual({ success: true })
      expect(statusUpdates(calls).map(u => u.updatePayload?.status)).toEqual(['pending'])
    })

    it('still returns 422 when the extra row is from an active tier', async () => {
      const { res, body, calls } = await run({ ...baseFixture(), items: itemsWithThirdTier({ is_guild_active: true }) })
      expect(res.status).toBe(422)
      expect(body.violations.map((v: { rule: string }) => v.rule)).toContain('item_copy_limit')
      expect(statusUpdates(calls)).toHaveLength(0)
    })

    it('skips a row whose tier is turned off when the join comes back as a one-element array', async () => {
      const { res, calls } = await run({ ...baseFixture(), items: itemsWithThirdTier([{ is_guild_active: false }]) })
      expect(res.status).toBe(200)
      expect(statusUpdates(calls).map(u => u.updatePayload?.status)).toEqual(['pending'])
    })

    it('keeps a row with no tier metadata in the count', async () => {
      const { res, body, calls } = await run({ ...baseFixture(), items: itemsWithThirdTier(null) })
      expect(res.status).toBe(422)
      expect(body.violations.map((v: { rule: string }) => v.rule)).toContain('item_copy_limit')
      expect(statusUpdates(calls)).toHaveLength(0)
    })

    it('reads the tier flag through the existing loot_submission_items select', async () => {
      const { calls } = await run({ ...baseFixture(), items: [bindings(50, 0)] })
      const itemCalls = calls.filter(c => c.table === 'loot_submission_items')
      expect(itemCalls).toHaveLength(1)
      expect(itemCalls[0].selectArg).toContain('raid_tier:raid_tiers(is_guild_active)')
    })
  })

  // The hold on ranking needs (D-22) is gone: a Discovery list submits, behind
  // the budget and eligibility checks (D-07, D-10).
  describe('need lists (D-08, DISC-05)', () => {
    it('promotes a 15-row, 10-point list (five keys, ranks 50 to 46, three tiers) to pending', async () => {
      const items = needList(TEN_POINT_KEYS)
      expect(items).toHaveLength(15)
      const { res, body, calls } = await run({ ...baseFixture(), items })
      expect(res.status).toBe(200)
      expect(body).toEqual({ success: true })
      expect(statusUpdates(calls).map(u => u.updatePayload?.status)).toEqual(['pending'])
    })

    it('submits a Big need and a Standard need in one bracket with no bracket violation', async () => {
      // As item rows the same costs break the allocation limit (next case).
      const items = [...needRows('trinket.spell-damage', 50, [0]), ...needRows('chest.cloth.spell-damage', 49, [0])]
      const { res, calls } = await run({ ...baseFixture(), items })
      expect(res.status).toBe(200)
      expect(statusUpdates(calls).map(u => u.updatePayload?.status)).toEqual(['pending'])
    })

    it('still answers allocation_limit for the same costs on item rows', async () => {
      const asItem = (row: SubmissionItem, wowheadId: number): SubmissionItem => ({
        ...row,
        loot_item: { ...row.loot_item, kind: undefined, need_key: undefined, wowhead_id: wowheadId },
      })
      const items = [
        asItem(needRows('trinket.spell-damage', 50, [0])[0], 1001),
        asItem(needRows('chest.cloth.spell-damage', 49, [0])[0], 1002),
      ]
      const { res, body, calls } = await run({ ...baseFixture(), items })
      expect(res.status).toBe(422)
      expect(body.violations.map((v: { rule: string }) => v.rule)).toContain('allocation_limit')
      expect(statusUpdates(calls)).toHaveLength(0)
    })

    it('answers item_copy_limit for a third copy of a Ring need and accepts two', async () => {
      const over = await run({
        ...baseFixture(),
        items: [...needRows('ring.spell-damage', 50, [0]), ...needRows('ring.spell-damage', 40, [0]), ...needRows('ring.spell-damage', 30, [0])],
      })
      expect(over.res.status).toBe(422)
      expect(over.body.violations.map((v: { rule: string }) => v.rule)).toContain('item_copy_limit')
      expect(statusUpdates(over.calls)).toHaveLength(0)

      const ok = await run({
        ...baseFixture(),
        items: [...needRows('ring.spell-damage', 50, [0]), ...needRows('ring.spell-damage', 40, [0])],
      })
      expect(ok.res.status).toBe(200)
      expect(statusUpdates(ok.calls).map(u => u.updatePayload?.status)).toEqual(['pending'])
    })

    it('answers item_copy_limit for a second copy of a Main hand weapon need', async () => {
      const items = [...needRows('main-hand-weapon.spell-damage', 50, [0]), ...needRows('main-hand-weapon.spell-damage', 40, [0])]
      const { res, body, calls } = await run({ ...baseFixture(), items })
      expect(res.status).toBe(422)
      expect(body.violations.map((v: { rule: string }) => v.rule)).toContain('item_copy_limit')
      expect(statusUpdates(calls)).toHaveLength(0)
    })

    it('submits a list of item rows exactly as before', async () => {
      const { res, calls } = await run({ ...baseFixture(), items: [bindings(50, 0), bindings(30, 1)] })
      expect(res.status).toBe(200)
      expect(submissionUpdates(calls).map(u => u.updatePayload)).toEqual([
        { resubmission_count: 2 },
        expect.objectContaining({ status: 'pending' }),
      ])
    })

    it('reads kind and need_key through the existing loot_submission_items select', async () => {
      const { calls } = await run({ ...baseFixture(), items: [bindings(50, 0)] })
      const itemCalls = calls.filter(c => c.table === 'loot_submission_items')
      expect(itemCalls[0].selectArg).toMatch(/loot_item:loot_items\([^)]*\bkind\b[^)]*\bneed_key\b/)
    })

    it('reads the class and spec names through the existing character select', async () => {
      const { calls } = await run({ ...baseFixture(), items: [bindings(50, 0)] })
      const characterCalls = calls.filter(c => c.table === 'characters')
      expect(characterCalls).toHaveLength(1)
      expect(characterCalls[0].selectArg).toContain('class:wow_classes(name)')
      expect(characterCalls[0].selectArg).toContain('spec:class_specs(name)')
    })
  })
})

// regression for T-04-08-01 and T-04-08-02: an over-budget or ineligible need
// list must not reach pending through a direct API call.
describe('POST /api/loot-submissions/submit need refusals (D-07, D-10)', () => {
  // Three Big picks and two Standard picks: 11 points.
  const ELEVEN_POINT_KEYS = [
    'main-hand-weapon.spell-damage',
    'trinket.spell-damage',
    'ranged-weapon.spell-damage',
    'chest.cloth.spell-damage',
    'head.cloth.spell-damage',
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(fetchActiveSlotLocks).mockResolvedValue([])
    vi.mocked(fetchListPrioItems).mockResolvedValue([])
  })

  it('answers 422 NEED_BUDGET_EXCEEDED with used, limit and the shared sentence, and writes nothing', async () => {
    const { res, body, calls } = await run({ ...baseFixture(), items: needList(ELEVEN_POINT_KEYS) })
    expect(res.status).toBe(422)
    expect(body).toEqual({
      error: needOverBudgetSentence(3),
      code: NEED_BUDGET_CODE,
      used: 11,
      limit: 10,
    })
    expect(body.error).toBe("That's three big picks. Swap a weapon or trinket for armour.")
    // status, submitted_at and resubmission_count stay as they were.
    expect(submissionUpdates(calls)).toHaveLength(0)
  })

  it('counts every key when five different keys stack at one rank', async () => {
    const stacked = [...TEN_POINT_KEYS, 'ranged-weapon.spell-damage'].flatMap(key => needRows(key, 50))
    const { res, body, calls } = await run({ ...baseFixture(), items: stacked })
    expect(res.status).toBe(422)
    expect(body).toMatchObject({ code: NEED_BUDGET_CODE, used: 13, limit: 10 })
    expect(submissionUpdates(calls)).toHaveLength(0)
  })

  it('accepts five keys at one rank when they sum to 10', async () => {
    const stacked = TEN_POINT_KEYS.flatMap(key => needRows(key, 50))
    const { res, calls } = await run({ ...baseFixture(), items: stacked })
    expect(res.status).toBe(200)
    expect(statusUpdates(calls).map(u => u.updatePayload?.status)).toEqual(['pending'])
  })

  it('answers 422 NEED_NOT_ELIGIBLE naming the key for a need the class cannot use, and writes nothing', async () => {
    const { res, body, calls } = await run({ ...baseFixture(), items: needRows('chest.plate.tank', 50) })
    expect(res.status).toBe(422)
    expect(body.error).toBe(NEED_NOT_ELIGIBLE_ERROR)
    expect(body.code).toBe(NEED_NOT_ELIGIBLE_CODE)
    expect(body.ineligible.map((row: { need_key: string }) => row.need_key)).toEqual([
      'chest.plate.tank',
      'chest.plate.tank',
      'chest.plate.tank',
    ])
    expect(submissionUpdates(calls)).toHaveLength(0)
  })

  it('reads the class and spec from the character row, so a plate tank list passes for a Warrior', async () => {
    const warrior = { ...baseFixture().character!, class: { name: 'Warrior' }, spec: { name: 'Protection Warrior' } }
    const { res, calls } = await run({ ...baseFixture(), character: warrior, items: needRows('chest.plate.tank', 50) })
    expect(res.status).toBe(200)
    expect(statusUpdates(calls).map(u => u.updatePayload?.status)).toEqual(['pending'])
  })

  it('reads a one-element array embed the same way as an object', async () => {
    const asArrays = {
      ...baseFixture().character!,
      class: [{ name: 'Mage' }],
      spec: [{ name: 'Mage' }],
    } as unknown as Fixture['character']
    const ok = await run({ ...baseFixture(), character: asArrays, items: needList(TEN_POINT_KEYS) })
    expect(ok.res.status).toBe(200)

    const refused = await run({ ...baseFixture(), character: asArrays, items: needRows('chest.plate.tank', 50) })
    expect(refused.res.status).toBe(422)
    expect(refused.body.code).toBe(NEED_NOT_ELIGIBLE_CODE)
  })

  it('answers NEED_NOT_ELIGIBLE for every need row when the character has no class', async () => {
    const noClass = { ...baseFixture().character!, class: null, spec: null }
    const { res, body, calls } = await run({ ...baseFixture(), character: noClass, items: needList(TEN_POINT_KEYS) })
    expect(res.status).toBe(422)
    expect(body.code).toBe(NEED_NOT_ELIGIBLE_CODE)
    expect(body.ineligible).toHaveLength(15)
    expect(submissionUpdates(calls)).toHaveLength(0)
  })

  it('answers the budget refusal before the eligibility one when both fail', async () => {
    const items = [...needList(ELEVEN_POINT_KEYS), ...needRows('chest.plate.tank', 40)]
    const { body } = await run({ ...baseFixture(), items })
    expect(body.code).toBe(NEED_BUDGET_CODE)
  })

  // GH #357: a tier the guild turned off is not raided and not shown, so its
  // rows never block a raider who cannot see them.
  it('skips need rows of a tier with is_guild_active false in the budget and eligibility checks', async () => {
    const off = (rows: SubmissionItem[]) => rows.map(row => withTier(row, { is_guild_active: false }))
    const overBudget = [
      ...needList(TEN_POINT_KEYS, [0, 1]),
      ...off(needRows('ranged-weapon.spell-damage', 40, [2])),
      ...off(needRows('chest.plate.tank', 39, [2])),
    ]
    // Control: the same rows with the tier left on are refused, so the pass
    // below is the flag at work.
    const control = await run({ ...baseFixture(), items: overBudget.map(row => withTier(row, { is_guild_active: true })) })
    expect(control.res.status).toBe(422)
    const { res, calls } = await run({ ...baseFixture(), items: overBudget })
    expect(res.status).toBe(200)
    expect(statusUpdates(calls).map(u => u.updatePayload?.status)).toEqual(['pending'])
  })

  it('still counts a tier whose flag is missing (fails closed)', async () => {
    const items = needList(ELEVEN_POINT_KEYS).map(row => withTier(row, null))
    const { res, body } = await run({ ...baseFixture(), items })
    expect(res.status).toBe(422)
    expect(body.code).toBe(NEED_BUDGET_CODE)
  })
})

// D-29, D-03 and D-05 on need rows: the copy caps count a need once, officer
// prio never reads needs, and an award lock holds a need's (rank, slot).
describe('POST /api/loot-submissions/submit need rows beside caps, prio and locks', () => {
  const CHEST_NAME = findNeedDefinition('chest.cloth.spell-damage')!.name

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(fetchActiveSlotLocks).mockResolvedValue([])
    vi.mocked(fetchListPrioItems).mockResolvedValue([])
  })

  // regression for D-29: each tier's row is its own copy group, so a need key
  // ranked twice used to answer one line per tier.
  it('answers one copy-limit line for a need key ranked twice across three tiers', async () => {
    const items = [...needRows('chest.cloth.spell-damage', 47), ...needRows('chest.cloth.spell-damage', 46)]
    const { res, body, calls } = await run({ ...baseFixture(), items })
    expect(res.status).toBe(422)
    expect(body.violations).toEqual([
      { bracket: 'Whole list', rule: 'item_copy_limit', detail: `"${CHEST_NAME}" is listed 2 times (max 1)` },
    ])
    expect(statusUpdates(calls)).toHaveLength(0)
  })

  it('keeps one line per different need key that breaks its cap', async () => {
    const items = [
      ...needRows('chest.cloth.spell-damage', 47),
      ...needRows('chest.cloth.spell-damage', 46),
      ...needRows('head.cloth.spell-damage', 45),
      ...needRows('head.cloth.spell-damage', 44),
    ]
    const { body } = await run({ ...baseFixture(), items })
    expect(body.violations).toHaveLength(2)
  })

  it('returns exactly the item-list violations it returned before the need split', async () => {
    const { res, body } = await run({ ...baseFixture(), items: [desecrated(50, 0), desecrated(49, 0)] })
    expect(res.status).toBe(422)
    expect(body.violations).toEqual([
      { bracket: 'Main spec', rule: 'item_copy_limit', detail: '"Desecrated Breastplate" is listed 2 times (max 1)' },
    ])
  })

  it('lists item violations before need violations', async () => {
    const items = [
      desecrated(50, 0),
      desecrated(49, 0),
      ...needRows('chest.cloth.spell-damage', 47),
      ...needRows('chest.cloth.spell-damage', 46),
    ]
    const { body } = await run({ ...baseFixture(), items })
    expect(body.violations.map((v: { detail: string }) => v.detail)).toEqual([
      '"Desecrated Breastplate" is listed 2 times (max 1)',
      `"${CHEST_NAME}" is listed 2 times (max 1)`,
    ])
  })

  // D-03: need rows are never flagged by the officer prio check.
  it('passes the prio step with no prio_violations when the prio set holds only item rows', async () => {
    vi.mocked(fetchListPrioItems).mockResolvedValue([
      { id: 'an-item-row', is_allocated: true, character_spec_type: null, has_primary_only: false },
    ])
    const { res, body, calls } = await run({ ...baseFixture(), items: needList(TEN_POINT_KEYS) })
    expect(res.status).toBe(200)
    expect(body).not.toHaveProperty('prio_violations')
    expect(statusUpdates(calls).map(u => u.updatePayload?.status)).toEqual(['pending'])
  })

  // D-05: a need row's (rank, slot) is locked like an item's.
  describe('award slot locks on need rows', () => {
    const LOCKED_NEED_ID = 'need-row:main-hand-weapon.spell-damage:1'
    const lock = {
      id: 'lock-need-1',
      rank: 50,
      slot: 2,
      loot_item_id: LOCKED_NEED_ID,
      locked_at: '2026-10-24T12:00:00Z',
      item_name: 'Main hand weapon',
    }

    it('keeps the list valid when the locked need stays in its rank and slot', async () => {
      vi.mocked(fetchActiveSlotLocks).mockResolvedValue([lock])
      const { res, calls } = await run({ ...baseFixture(), items: needList(TEN_POINT_KEYS) })
      expect(res.status).toBe(200)
      expect(statusUpdates(calls).map(u => u.updatePayload?.status)).toEqual(['pending'])
    })

    it('answers 422 with locked_ranks when the slot holds a different need', async () => {
      vi.mocked(fetchActiveSlotLocks).mockResolvedValue([lock])
      const moved = needList(TEN_POINT_KEYS).filter(row => !(row.rank === 50 && row.slot === 2))
      const items = [...moved, ...needRows('ring.spell-damage', 50, [1])]
      const { res, body, calls } = await run({ ...baseFixture(), items })
      expect(res.status).toBe(422)
      expect(body.locked_ranks).toEqual([{ rank: 50, slot: 2, item_name: 'Main hand weapon' }])
      expect(statusUpdates(calls)).toHaveLength(0)
    })
  })
})

describe('POST /api/loot-submissions/submit award slot locks (quick task 261028-0gx)', () => {
  const LOCKED_ID = 'bbbbbbbb-0000-0000-0000-0000000000c1'
  const lock = {
    id: 'lock-1',
    rank: 50,
    slot: 1,
    loot_item_id: LOCKED_ID,
    locked_at: '2026-10-24T12:00:00Z',
    item_name: 'Locked Item',
  }
  const lockedRow = (rank: number): SubmissionItem => tokenRow(rank, LOCKED_ID, 'Locked Item', 30001)
  const statusUpdates = (calls: Call[]) => submissionUpdates(calls).filter(c => c.updatePayload && 'status' in c.updatePayload)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(fetchActiveSlotLocks).mockResolvedValue([])
  })

  it('returns 422 with the lock message when the saved rows moved the locked item', async () => {
    vi.mocked(fetchActiveSlotLocks).mockResolvedValue([lock])
    const { res, body, calls } = await run({ ...baseFixture(), items: [lockedRow(48)] })

    expect(res.status).toBe(422)
    expect(body.error).toBe('Rank 50 is locked to Locked Item')
    expect(body.locked_ranks).toEqual([{ rank: 50, slot: 1, item_name: 'Locked Item' }])
    expect(body).not.toHaveProperty('violations')
    expect(statusUpdates(calls)).toHaveLength(0)
    expect(fetchActiveSlotLocks).toHaveBeenCalledWith(expect.anything(), SUBMISSION_ID)
  })

  it('returns 200 when the saved rows keep the locked item at its rank and slot', async () => {
    vi.mocked(fetchActiveSlotLocks).mockResolvedValue([lock])
    const { res, calls } = await run({ ...baseFixture(), items: [lockedRow(50)] })

    expect(res.status).toBe(200)
    expect(statusUpdates(calls).map(u => u.updatePayload?.status)).toEqual(['pending'])
  })

  it('returns 500 when the lock read fails', async () => {
    vi.mocked(fetchActiveSlotLocks).mockRejectedValue(new Error('Failed to read loot list slot locks'))
    const { res, calls } = await run({ ...baseFixture(), items: [lockedRow(50)] })

    expect(res.status).toBe(500)
    expect(statusUpdates(calls)).toHaveLength(0)
  })
})

describe('POST /api/loot-submissions/submit officer prio (#484)', () => {
  const OTHER_ID = 'bbbbbbbb-0000-0000-0000-0000000000e1'
  const OPEN_ID = 'bbbbbbbb-0000-0000-0000-0000000000e2'
  const LC_ID = 'bbbbbbbb-0000-0000-0000-0000000000e3'
  // The character's item set with the flags lib/loot-items-query.ts computes.
  const prioItems = [
    { id: OTHER_ID, is_allocated: true, character_spec_type: null, has_primary_only: false },
    { id: OPEN_ID, is_allocated: false, character_spec_type: null },
    { id: LC_ID, is_loot_council: true, is_allocated: true, character_spec_type: null },
  ]
  // A distinct wowhead_id per row keeps the copy limit (counted per real
  // item) out of these cases, so only prio decides the outcome.
  const row = (rank: number, slot: number, id: string, name: string): SubmissionItem => ({
    rank,
    slot,
    loot_item_id: id,
    loot_item: { id, name, classification: 'Unlimited', item_type: null, item_slot: 'Neck', wowhead_id: 40000 + rank * 10 + slot, allocation_cost: 0 },
  })
  const statusUpdates = (calls: Call[]) => submissionUpdates(calls).filter(c => c.updatePayload && 'status' in c.updatePayload)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(fetchActiveSlotLocks).mockResolvedValue([])
    vi.mocked(fetchListPrioItems).mockResolvedValue(prioItems)
  })

  // regression for #484: a list ranked before an officer moved prio to other
  // classes used to submit with the item still in Brackets 1-4.
  it('returns 400 with PRIO_VIOLATION naming each out-of-prio item and rank, and leaves the status alone', async () => {
    const { res, body, calls } = await run({
      ...baseFixture(),
      items: [row(48, 1, OTHER_ID, 'Test Pendant'), row(30, 2, OTHER_ID, 'Test Pendant'), row(10, 1, OTHER_ID, 'Test Pendant')],
    })

    expect(res.status).toBe(400)
    expect(body.code).toBe('PRIO_VIOLATION')
    expect(body.error).toBe(
      'Officers set prio for these items to other classes: Test Pendant (rank 48), Test Pendant (rank 30). Move them to Off-spec or remove them, then submit again.',
    )
    expect(body.prio_violations).toEqual([
      { loot_item_id: OTHER_ID, rank: 48, slot: 1, zone: 'bracket', item_name: 'Test Pendant' },
      { loot_item_id: OTHER_ID, rank: 30, slot: 2, zone: 'noBracket', item_name: 'Test Pendant' },
    ])
    // The client formats `violations` as bracket rules; prio must not use that key.
    expect(body).not.toHaveProperty('violations')
    expect(statusUpdates(calls)).toHaveLength(0)
  })

  it('checks the items of the list character, expansion and phase', async () => {
    await run({ ...baseFixture(), items: [row(10, 1, OTHER_ID, 'Test Pendant')] })
    expect(fetchListPrioItems).toHaveBeenCalledWith(expect.anything(), {
      character_id: CHARACTER_ID,
      expansion_id: 'bbbbbbbb-0000-0000-0000-000000000006',
      phase: 1,
    })
  })

  it('submits when the out-of-prio item sits in Off-spec', async () => {
    const { res, calls } = await run({ ...baseFixture(), items: [row(10, 1, OTHER_ID, 'Test Pendant'), row(50, 1, OPEN_ID, 'Open Ring')] })
    expect(res.status).toBe(200)
    expect(statusUpdates(calls).map(u => u.updatePayload?.status)).toEqual(['pending'])
  })

  it('never flags a Loot Council item or an item outside the character item set', async () => {
    const UNKNOWN_ID = 'bbbbbbbb-0000-0000-0000-0000000000e4'
    const { res } = await run({ ...baseFixture(), items: [row(50, 1, LC_ID, 'Council Blade'), row(49, 1, UNKNOWN_ID, 'Unknown Item')] })
    expect(res.status).toBe(200)
  })

  // regression for #484: award slot locks are never re-judged by prio.
  it('submits when the out-of-prio item is held by an active award lock at that rank', async () => {
    vi.mocked(fetchActiveSlotLocks).mockResolvedValue([
      { id: 'lock-1', rank: 48, slot: 1, loot_item_id: OTHER_ID, locked_at: '2026-10-24T12:00:00Z', item_name: 'Test Pendant' },
    ])
    const { res, calls } = await run({ ...baseFixture(), items: [row(48, 1, OTHER_ID, 'Test Pendant')] })
    expect(res.status).toBe(200)
    expect(statusUpdates(calls).map(u => u.updatePayload?.status)).toEqual(['pending'])
  })

  it('reports bracket rule violations first, before prio', async () => {
    const { res, body } = await run({
      ...baseFixture(),
      items: [bindings(50, 0), bindings(40, 1), bindings(30, 0), row(45, 1, OTHER_ID, 'Test Pendant')],
    })
    expect(res.status).toBe(422)
    expect(body.violations.map((v: { rule: string }) => v.rule)).toContain('item_copy_limit')
  })

  it('returns 500 and writes nothing when the prio items cannot be read', async () => {
    vi.mocked(fetchListPrioItems).mockRejectedValue(new Error('Failed to read the list raid tiers'))
    const { res, calls } = await run({ ...baseFixture(), items: [row(48, 1, OTHER_ID, 'Test Pendant')] })
    expect(res.status).toBe(500)
    expect(statusUpdates(calls)).toHaveLength(0)
  })
})
