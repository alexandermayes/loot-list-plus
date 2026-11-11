// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { fetchFilteredLootItems, fetchLootItemsCharacter } from '@/lib/loot-items-query'

vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/lib/loot-items-query', () => ({
  fetchLootItemsCharacter: vi.fn(),
  fetchFilteredLootItems: vi.fn(),
}))

const USER_ID = 'bbbbbbbb-0000-0000-0000-000000000001'
const OTHER_USER_ID = 'bbbbbbbb-0000-0000-0000-000000000002'
const GUILD_ID = 'bbbbbbbb-0000-0000-0000-000000000003'
const CHARACTER_ID = 'bbbbbbbb-0000-0000-0000-000000000004'
const EXPANSION_ID = 'bbbbbbbb-0000-0000-0000-000000000005'
const TIER_ID = 'bbbbbbbb-0000-0000-0000-000000000006'
const SUBMISSION_ID = 'bbbbbbbb-0000-0000-0000-000000000007'
const ITEM_ID = 'bbbbbbbb-0000-0000-0000-000000000008'
const NEED_ID = 'bbbbbbbb-0000-0000-0000-000000000009'
const REMOVED_NEED_ID = 'bbbbbbbb-0000-0000-0000-00000000000a'

// A need row. D-22 holds ranking needs server-side, so no real list holds one
// in Phase 3; this fixture stands past the hold.
const NEED_ROW = {
  id: NEED_ID,
  name: 'Trinket, Healing',
  kind: 'need',
  need_key: 'trinket.healing',
  wowhead_id: null,
  boss_name: 'Needs',
  item_slot: 'Trinket',
  raid_tier_id: TIER_ID,
}

interface TierFixture {
  id: string
  name: string
  is_active: boolean
  is_guild_active: boolean | null
  submission_deadline: string | null
  phase: number | null
  list_mode: 'known' | 'discovery'
  sort_order: number | null
}

interface Fixture {
  characterOwner: string | null
  tiers: TierFixture[]
  submission: { id: string } | null
  submissionItems: Array<{ loot_item_id: string; rank: number; slot: number; removed_at: string | null }>
}

function defaultFixture(): Fixture {
  return {
    characterOwner: USER_ID,
    tiers: [
      { id: TIER_ID, name: 'Barrow Deeps', is_active: true, is_guild_active: true, submission_deadline: null, phase: 1, list_mode: 'known', sort_order: 1 },
    ],
    submission: {
      id: SUBMISSION_ID,
    },
    submissionItems: [
      { loot_item_id: NEED_ROW.id, rank: 50, slot: 1, removed_at: null },
      { loot_item_id: ITEM_ID, rank: 49, slot: 1, removed_at: null },
      { loot_item_id: REMOVED_NEED_ID, rank: 48, slot: 1, removed_at: '2026-10-01T00:00:00Z' },
    ],
  }
}

/**
 * Recording fake for the bootstrap route's reads. Each table answers from the
 * fixture; every chain method returns the builder, and the terminal calls
 * (single, maybeSingle, await) resolve with the table's rows.
 */
function makeClient(fixture: Fixture) {
  return {
    from(table: string) {
      const resolveList = () => {
        if (table === 'raid_tiers') return { data: fixture.tiers, error: null }
        if (table === 'loot_submission_items') return { data: fixture.submissionItems, error: null }
        return { data: [], error: null }
      }
      const resolveOne = () => {
        if (table === 'characters') {
          return fixture.characterOwner === null
            ? { data: null, error: { message: 'not found' } }
            : { data: { user_id: fixture.characterOwner }, error: null }
        }
        if (table === 'expansions') {
          return { data: { current_phase: 1, phase_groups: null }, error: null }
        }
        if (table === 'loot_submissions') {
          return { data: fixture.submission, error: null }
        }
        return { data: null, error: null }
      }
      const builder: Record<string, unknown> = {}
      for (const method of ['select', 'eq', 'order', 'in', 'is', 'limit']) {
        builder[method] = () => builder
      }
      builder.single = () => Promise.resolve(resolveOne())
      builder.maybeSingle = () => Promise.resolve(resolveOne())
      builder.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve(resolveList()).then(onFulfilled, onRejected)
      return builder
    },
  }
}

function request(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/loot-list/bootstrap')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return new NextRequest(url)
}

const FULL_PARAMS = {
  expansion_id: EXPANSION_ID,
  guild_id: GUILD_ID,
  character_id: CHARACTER_ID,
}

const DISCOVERY_TIER_IDS = [
  'bbbbbbbb-0000-0000-0000-0000000000a1',
  'bbbbbbbb-0000-0000-0000-0000000000a2',
  'bbbbbbbb-0000-0000-0000-0000000000a3',
]

/** A three-tier Discovery phase group; the third tier is turned off for the guild. */
function discoveryTiers(): TierFixture[] {
  return DISCOVERY_TIER_IDS.map((id, index) => ({
    id,
    name: `Discovery tier ${index + 1}`,
    is_active: true,
    is_guild_active: index < 2,
    submission_deadline: null,
    phase: 1,
    list_mode: 'discovery' as const,
    sort_order: index + 1,
  }))
}

const CHARACTER = { id: CHARACTER_ID, class_id: 1, spec_id: 1, user_id: USER_ID }

describe('GET /api/loot-list/bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      user: { id: USER_ID },
      error: null,
    } as never)
    vi.mocked(fetchLootItemsCharacter).mockResolvedValue(CHARACTER as never)
    vi.mocked(fetchFilteredLootItems).mockResolvedValue([{ id: ITEM_ID, kind: 'item' }])
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('answers 401 without a user', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: null, error: null } as never)
    const response = await GET(request(FULL_PARAMS))
    expect(response.status).toBe(401)
  })

  it('answers 400 without expansion_id', async () => {
    const response = await GET(request({ guild_id: GUILD_ID, character_id: CHARACTER_ID }))
    expect(response.status).toBe(400)
  })

  it('answers 403 when the character belongs to another user', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(
      makeClient({ ...defaultFixture(), characterOwner: OTHER_USER_ID }) as never
    )
    const response = await GET(request(FULL_PARAMS))
    expect(response.status).toBe(403)
    expect(fetchFilteredLootItems).not.toHaveBeenCalled()
  })

  it('[D-12] a Known group gets the default: needs hidden and need_tier_slots null', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(makeClient(defaultFixture()) as never)

    const response = await GET(request(FULL_PARAMS))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(fetchFilteredLootItems).toHaveBeenCalledTimes(1)
    const args = vi.mocked(fetchFilteredLootItems).mock.calls[0]
    expect(args).toHaveLength(4)
    expect(args[1]).toBe(CHARACTER)
    expect(args[2]).toEqual([TIER_ID])
    expect(args[3]).toEqual({ includeNeeds: false })
    expect(body.need_tier_slots).toBeNull()
  })

  it('[D-12, D-02 amended] a Forever group gets its need rows and a slot per Discovery tier, the turned-off one included', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(
      makeClient({ ...defaultFixture(), tiers: discoveryTiers() }) as never
    )

    const response = await GET(request(FULL_PARAMS))
    const body = await response.json()

    expect(response.status).toBe(200)
    const args = vi.mocked(fetchFilteredLootItems).mock.calls[0]
    expect(args[3]).toEqual({ includeNeeds: true })
    expect(Object.keys(body.need_tier_slots)).toHaveLength(3)
    expect(body.need_tier_slots).toEqual({
      [DISCOVERY_TIER_IDS[0]]: 1,
      [DISCOVERY_TIER_IDS[1]]: 2,
      [DISCOVERY_TIER_IDS[2]]: 3,
    })
  })

  it('[D-12] a mixed group (one Known and one Discovery active tier) keeps needs hidden', async () => {
    const [first, second] = discoveryTiers()
    vi.mocked(createServiceRoleClient).mockReturnValue(
      makeClient({
        ...defaultFixture(),
        tiers: [{ ...first, list_mode: 'known' }, { ...second, is_guild_active: true }],
      }) as never
    )

    const response = await GET(request(FULL_PARAMS))
    const body = await response.json()

    expect(vi.mocked(fetchFilteredLootItems).mock.calls[0][3]).toEqual({ includeNeeds: false })
    expect(body.need_tier_slots).toBeNull()
  })

  it('[D-02 amended] every tier in the payload carries list_mode and sort_order', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(
      makeClient({ ...defaultFixture(), tiers: discoveryTiers() }) as never
    )

    const body = await (await GET(request(FULL_PARAMS))).json()

    expect(body.tiers).toHaveLength(3)
    for (const tier of body.tiers) {
      expect(tier.list_mode).toBe('discovery')
      expect(typeof tier.sort_order).toBe('number')
    }
  })

  it('answers 500, never an empty picker, when the raid tier read for the need scope fails', async () => {
    const fixture = defaultFixture()
    const client = makeClient(fixture)
    let tierReads = 0
    const from = client.from.bind(client)
    // The first raid_tiers read is the tiers payload; the second is the scope.
    client.from = (table: string) => {
      if (table !== 'raid_tiers') return from(table)
      tierReads += 1
      if (tierReads === 1) return from(table)
      const failing: Record<string, unknown> = {}
      for (const method of ['select', 'eq', 'in']) failing[method] = () => failing
      failing.then = (onFulfilled: (v: unknown) => unknown) =>
        Promise.resolve({ data: null, error: { message: 'boom' } }).then(onFulfilled)
      return failing as ReturnType<typeof from>
    }
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const response = await GET(request(FULL_PARAMS))

    expect(response.status).toBe(500)
    expect(fetchFilteredLootItems).not.toHaveBeenCalled()
  })

  it("carries a saved need ranking by id like an item id (kind: 'need')", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(makeClient(defaultFixture()) as never)

    const response = await GET(request(FULL_PARAMS))
    const body = await response.json()

    expect(NEED_ROW.kind).toBe('need')
    expect(body.rankings['50-1']).toBe(NEED_ID)
    expect(body.rankings['49-1']).toBe(ITEM_ID)
    expect(body.removedItems).toEqual([{ loot_item_id: REMOVED_NEED_ID, rank: 48, slot: 1 }])
    // The picker payload holds only what fetchFilteredLootItems returned.
    expect(body.items).toEqual([{ id: ITEM_ID, kind: 'item' }])
  })

  it('returns the existing empty payload when no tier is visible', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(
      makeClient({ ...defaultFixture(), tiers: [] }) as never
    )

    const response = await GET(request(FULL_PARAMS))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      tiers: [],
      selected_phase: null,
      selected_phases: [],
      items: [],
      submission: null,
      rankings: {},
      removedItems: [],
      need_tier_slots: null,
    })
    expect(fetchFilteredLootItems).not.toHaveBeenCalled()
  })
})
