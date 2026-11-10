// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackApiError: vi.fn() }))

const USER_ID = 'cccccccc-0000-0000-0000-000000000001'
const OTHER_USER_ID = 'cccccccc-0000-0000-0000-000000000002'
const GUILD_ID = 'cccccccc-0000-0000-0000-000000000003'
const CHARACTER_ID = 'cccccccc-0000-0000-0000-000000000004'
const TIER_ID = 'cccccccc-0000-0000-0000-000000000005'
const SUBMISSION_ID = 'cccccccc-0000-0000-0000-000000000006'
const ITEM_ID = 'cccccccc-0000-0000-0000-000000000007'
const NEED_ID = 'cccccccc-0000-0000-0000-000000000008'
const REMOVED_NEED_ID = 'cccccccc-0000-0000-0000-000000000009'

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

interface Fixture {
  characterOwner: string | null
  submission: { id: string; status: string } | null
  submissionItems: Array<{ loot_item_id: string; rank: number; slot: number; removed_at: string | null }>
}

function defaultFixture(): Fixture {
  return {
    characterOwner: USER_ID,
    submission: { id: SUBMISSION_ID, status: 'draft' },
    submissionItems: [
      { loot_item_id: NEED_ROW.id, rank: 50, slot: 1, removed_at: null },
      { loot_item_id: ITEM_ID, rank: 49, slot: 1, removed_at: null },
      { loot_item_id: REMOVED_NEED_ID, rank: 48, slot: 1, removed_at: '2026-10-01T00:00:00Z' },
    ],
  }
}

/** Recording fake for the three reads the route makes. */
function makeClient(fixture: Fixture) {
  return {
    from(table: string) {
      const builder: Record<string, unknown> = {}
      for (const method of ['select', 'eq']) {
        builder[method] = () => builder
      }
      builder.single = () =>
        Promise.resolve(
          fixture.characterOwner === null
            ? { data: null, error: { message: 'not found' } }
            : { data: { user_id: fixture.characterOwner }, error: null }
        )
      builder.maybeSingle = () => Promise.resolve({ data: table === 'loot_submissions' ? fixture.submission : null, error: null })
      builder.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve({
          data: table === 'loot_submission_items' ? fixture.submissionItems : [],
          error: null,
        }).then(onFulfilled, onRejected)
      return builder
    },
  }
}

function request(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/loot-submissions')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return new NextRequest(url)
}

const FULL_PARAMS = { character_id: CHARACTER_ID, guild_id: GUILD_ID, tier_id: TIER_ID }

describe('GET /api/loot-submissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      user: { id: USER_ID },
      error: null,
    } as never)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('answers 401 without a user', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: null, error: null } as never)
    const response = await GET(request(FULL_PARAMS))
    expect(response.status).toBe(401)
  })

  it('answers 400 without character_id', async () => {
    const response = await GET(request({ guild_id: GUILD_ID, tier_id: TIER_ID }))
    expect(response.status).toBe(400)
  })

  it("answers 403 for another user's character", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(
      makeClient({ ...defaultFixture(), characterOwner: OTHER_USER_ID }) as never
    )
    const response = await GET(request(FULL_PARAMS))
    expect(response.status).toBe(403)
  })

  it("returns a need row id in rankings and removedItems like an item id (kind: 'need')", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(makeClient(defaultFixture()) as never)

    const response = await GET(request(FULL_PARAMS))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(NEED_ROW.kind).toBe('need')
    expect(body.submission).toEqual({ id: SUBMISSION_ID, status: 'draft' })
    expect(body.rankings).toEqual({ '50-1': NEED_ID, '49-1': ITEM_ID })
    expect(body.removedItems).toEqual([{ loot_item_id: REMOVED_NEED_ID, rank: 48, slot: 1 }])
  })

  it('returns null and empty rankings when there is no submission', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(
      makeClient({ ...defaultFixture(), submission: null }) as never
    )

    const response = await GET(request(FULL_PARAMS))
    const body = await response.json()

    expect(body).toEqual({ submission: null, rankings: {}, locks: [] })
  })
})
