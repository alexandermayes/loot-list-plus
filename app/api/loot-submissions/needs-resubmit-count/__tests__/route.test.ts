// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { NEEDS_RESUBMISSION_OR_FILTER, needsResubmission } from '@/domain/loot/resubmit'

// Deliberately NOT mocked: the real findInvalidCharacterIds must run against
// the fake client below, so these tests prove the route calls the actual
// membership check rather than a reimplementation of it.
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))

type Row = Record<string, unknown>
type FilterOp =
  | { type: 'eq'; col: string; val: unknown }
  | { type: 'in'; col: string; val: unknown[] }

interface RecordedCall {
  table: string
  selectCols?: string
  selectOpts?: { count?: string; head?: boolean }
  filters: FilterOp[]
  orStrings: string[]
}

interface ClientOptions {
  failCgm?: boolean
  failCharactersRead?: boolean
}

function makeClient(tables: Record<string, Row[]>, options: ClientOptions = {}) {
  const calls: RecordedCall[] = []

  function applyFilters(rows: Row[], filters: FilterOp[]): Row[] {
    return rows.filter((row) =>
      filters.every((f) => {
        if (f.type === 'eq') return row[f.col] === f.val
        if (f.type === 'in') return (f.val as unknown[]).includes(row[f.col])
        return true
      }),
    )
  }

  function resolveCall(call: RecordedCall): Promise<{ data: unknown; count?: number; error: { message: string } | null }> {
    if (call.table === 'characters' && options.failCharactersRead) {
      return Promise.resolve({ data: null, error: { message: 'chars boom' } })
    }
    if (call.table === 'character_guild_memberships' && options.failCgm) {
      return Promise.resolve({ data: null, error: { message: 'cgm boom' } })
    }
    let rows = applyFilters(tables[call.table] ?? [], call.filters)
    if (call.orStrings.includes(NEEDS_RESUBMISSION_OR_FILTER)) {
      rows = rows.filter((r) => needsResubmission(r as never))
    }
    if (call.selectOpts?.head) {
      return Promise.resolve({ data: null, count: rows.length, error: null })
    }
    return Promise.resolve({ data: rows, error: null })
  }

  function from(table: string) {
    const call: RecordedCall = { table, filters: [], orStrings: [] }
    calls.push(call)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select(cols: string, opts?: { count?: string; head?: boolean }) {
        call.selectCols = cols
        call.selectOpts = opts
        return builder
      },
      eq(col: string, val: unknown) {
        call.filters.push({ type: 'eq', col, val })
        return builder
      },
      in(col: string, val: unknown[]) {
        call.filters.push({ type: 'in', col, val })
        return builder
      },
      or(str: string) {
        call.orStrings.push(str)
        return builder
      },
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
        return resolveCall(call).then(resolve, reject)
      },
    }
    return builder
  }

  return { client: { from }, calls }
}

const USER_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const GUILD = 'aaaaaaaa-0000-0000-0000-000000000002'
const OTHER_GUILD = 'aaaaaaaa-0000-0000-0000-000000000003'
const MAIN = 'aaaaaaaa-0000-0000-0000-000000000004'
const ALT_DEPARTED = 'aaaaaaaa-0000-0000-0000-000000000005'
const ALT_NULL_ACTIVE = 'aaaaaaaa-0000-0000-0000-000000000006'
const ALT_NO_ROW = 'aaaaaaaa-0000-0000-0000-000000000007'
const ALT_OTHER_GUILD_ONLY = 'aaaaaaaa-0000-0000-0000-000000000008'

function sub(overrides: Partial<{ id: string; guild_id: string; character_id: string; status: string; submitted_at: string | null }> = {}) {
  return {
    id: 'sub-id',
    guild_id: GUILD,
    character_id: MAIN,
    status: 'rejected',
    submitted_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function cgm(characterId: string, guildId: string, isActive: boolean | null) {
  return { character_id: characterId, guild_id: guildId, is_active: isActive }
}

function setClient(tables: Record<string, Row[]>, options: ClientOptions = {}) {
  const { client, calls } = makeClient(tables, options)
  ;(createServiceRoleClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(client)
  return calls
}

function request(guildId: string | null = GUILD) {
  const url = guildId
    ? `http://localhost/api/loot-submissions/needs-resubmit-count?guild_id=${guildId}`
    : 'http://localhost/api/loot-submissions/needs-resubmit-count'
  return new NextRequest(url)
}

describe('GET /api/loot-submissions/needs-resubmit-count', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getAuthenticatedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: USER_ID }, error: null })
  })

  it('B1 (D-03): a departed alt is excluded, only the active main is counted', async () => {
    setClient({
      characters: [{ id: MAIN, user_id: USER_ID }, { id: ALT_DEPARTED, user_id: USER_ID }],
      character_guild_memberships: [cgm(MAIN, GUILD, true), cgm(ALT_DEPARTED, GUILD, false)],
      loot_submissions: [
        sub({ id: 'sub-main', character_id: MAIN }),
        sub({ id: 'sub-alt-rejected', character_id: ALT_DEPARTED }),
        sub({ id: 'sub-alt-draft', character_id: ALT_DEPARTED, status: 'draft', submitted_at: '2026-01-01T00:00:00Z' }),
      ],
    })
    const res = await GET(request())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ count: 1 })
    expect(res.headers.get('Cache-Control')).toBe('private, max-age=30, stale-while-revalidate=60')
  })

  it('B2: the membership call and count call filters are correct and ordered', async () => {
    const calls = setClient({
      characters: [{ id: MAIN, user_id: USER_ID }, { id: ALT_DEPARTED, user_id: USER_ID }],
      character_guild_memberships: [cgm(MAIN, GUILD, true), cgm(ALT_DEPARTED, GUILD, false)],
      loot_submissions: [sub({ id: 'sub-main', character_id: MAIN })],
    })
    await GET(request())
    const cgmIndex = calls.findIndex((c) => c.table === 'character_guild_memberships')
    const countIndex = calls.findIndex((c) => c.table === 'loot_submissions')
    expect(cgmIndex).toBeGreaterThanOrEqual(0)
    expect(countIndex).toBeGreaterThan(cgmIndex)
    const cgmCall = calls[cgmIndex]
    expect(cgmCall.selectCols).toBe('character_id')
    expect(cgmCall.filters.find((f) => f.type === 'eq' && f.col === 'guild_id')?.val).toBe(GUILD)
    expect(cgmCall.filters.find((f) => f.type === 'eq' && f.col === 'is_active')?.val).toBe(true)
    expect((cgmCall.filters.find((f) => f.type === 'in' && f.col === 'character_id')?.val as string[]).sort()).toEqual(
      [MAIN, ALT_DEPARTED].sort(),
    )
    const countCall = calls[countIndex]
    expect(countCall.filters.find((f) => f.type === 'eq' && f.col === 'guild_id')?.val).toBe(GUILD)
    expect(countCall.filters.find((f) => f.type === 'in' && f.col === 'character_id')?.val).toEqual([MAIN])
    expect(countCall.orStrings).toContain(NEEDS_RESUBMISSION_OR_FILTER)
  })

  it('B3: every character out of the guild answers count 0 with no loot_submissions call', async () => {
    const calls = setClient({
      characters: [
        { id: ALT_DEPARTED, user_id: USER_ID },
        { id: ALT_NULL_ACTIVE, user_id: USER_ID },
        { id: ALT_NO_ROW, user_id: USER_ID },
        { id: ALT_OTHER_GUILD_ONLY, user_id: USER_ID },
      ],
      character_guild_memberships: [
        cgm(ALT_DEPARTED, GUILD, false),
        cgm(ALT_NULL_ACTIVE, GUILD, null),
        cgm(ALT_OTHER_GUILD_ONLY, OTHER_GUILD, true),
      ],
      loot_submissions: [],
    })
    const res = await GET(request())
    expect(await res.json()).toEqual({ count: 0 })
    expect(calls.some((c) => c.table === 'loot_submissions')).toBe(false)
  })

  it('B4: a failing membership read answers 500 with the standard message', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setClient(
      {
        characters: [{ id: MAIN, user_id: USER_ID }],
        character_guild_memberships: [],
        loot_submissions: [],
      },
      { failCgm: true },
    )
    const res = await GET(request())
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal server error' })
    expect(errSpy).toHaveBeenCalledWith('Error in GET /api/loot-submissions/needs-resubmit-count:', expect.anything())
  })

  it('B5: an active character needs-resubmit list in another guild, and non-needs-resubmit statuses, are not counted', async () => {
    setClient({
      characters: [{ id: MAIN, user_id: USER_ID }],
      character_guild_memberships: [cgm(MAIN, GUILD, true), cgm(MAIN, OTHER_GUILD, true)],
      loot_submissions: [
        sub({ id: 'sub-other-guild', guild_id: OTHER_GUILD, character_id: MAIN }),
        sub({ id: 'sub-approved', character_id: MAIN, status: 'approved', submitted_at: '2026-01-01T00:00:00Z' }),
        sub({ id: 'sub-pending', character_id: MAIN, status: 'pending', submitted_at: '2026-01-01T00:00:00Z' }),
        sub({ id: 'sub-never-submitted-draft', character_id: MAIN, status: 'draft', submitted_at: null }),
      ],
    })
    const res = await GET(request())
    expect(await res.json()).toEqual({ count: 0 })
  })

  it('B6: no authenticated user answers 401', async () => {
    ;(getAuthenticatedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: null, error: { message: 'no session' } })
    setClient({ characters: [], character_guild_memberships: [], loot_submissions: [] })
    const res = await GET(request())
    expect(res.status).toBe(401)
  })

  it('B6: no guild_id answers 400', async () => {
    setClient({ characters: [], character_guild_memberships: [], loot_submissions: [] })
    const res = await GET(request(null))
    expect(res.status).toBe(400)
  })

  it('B6: a user with no characters answers count 0 with no membership call recorded', async () => {
    const calls = setClient({ characters: [], character_guild_memberships: [], loot_submissions: [] })
    const res = await GET(request())
    expect(await res.json()).toEqual({ count: 0 })
    expect(calls.some((c) => c.table === 'character_guild_memberships')).toBe(false)
  })

  it('A1: a failing characters read answers 500 instead of an unfiltered count', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setClient(
      {
        characters: [{ id: MAIN, user_id: USER_ID }],
        character_guild_memberships: [cgm(MAIN, GUILD, true)],
        loot_submissions: [sub({ id: 'sub-main', character_id: MAIN })],
      },
      { failCharactersRead: true },
    )
    const res = await GET(request())
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal server error' })
    expect(errSpy).toHaveBeenCalledWith('Error in GET /api/loot-submissions/needs-resubmit-count:', expect.anything())
  })
})
