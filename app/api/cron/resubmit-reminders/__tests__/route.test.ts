// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { discordFetch } from '@/lib/discord'
import { NEEDS_RESUBMISSION_OR_FILTER, needsResubmission } from '@/domain/loot/resubmit'

// Deliberately NOT mocked: the real keepListsOfActiveMembers and
// findInvalidCharacterIds must run against the fake client below, so these
// tests prove the cron calls the actual membership check rather than a
// reimplementation of it.
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/lib/discord', () => ({ discordFetch: vi.fn() }))

type Row = Record<string, unknown>
type FilterOp =
  | { type: 'eq'; col: string; val: unknown }
  | { type: 'in'; col: string; val: unknown[] }
  | { type: 'lt'; col: string; val: unknown }

interface RecordedCall {
  table: string
  kind?: 'select' | 'update'
  selectCols?: string
  filters: FilterOp[]
  orStrings: string[]
  range?: [number, number]
  updateValues?: Record<string, unknown>
}

interface ClientOptions {
  failCgm?: boolean
  failCandidateRead?: boolean
  failStampIds?: Set<string>
}

/**
 * Generic in-memory recording fake, modeled on
 * app/api/master-sheet/visibility/__tests__/route.test.ts and
 * lib/loot/__tests__/guild-award-refs.test.ts. Supports the cron's reads
 * (loot_submissions, characters, user_preferences, guilds,
 * character_guild_memberships) and its update back to loot_submissions.
 */
function makeClient(tables: Record<string, Row[]>, options: ClientOptions = {}) {
  const calls: RecordedCall[] = []

  function applyFilters(rows: Row[], filters: FilterOp[]): Row[] {
    return rows.filter((row) =>
      filters.every((f) => {
        if (f.type === 'eq') return row[f.col] === f.val
        if (f.type === 'in') return (f.val as unknown[]).includes(row[f.col])
        if (f.type === 'lt') return (row[f.col] as number) < (f.val as number)
        return true
      }),
    )
  }

  function resolveCall(call: RecordedCall): Promise<{ data: unknown; error: { message: string } | null }> {
    if (call.table === 'character_guild_memberships' && options.failCgm) {
      return Promise.resolve({ data: null, error: { message: 'cgm boom' } })
    }
    if (call.kind === 'update') {
      if (call.table === 'loot_submissions') {
        const idFilter = (call.filters.find((f) => f.type === 'in' && f.col === 'id')?.val ?? []) as string[]
        if (options.failStampIds && idFilter.some((id) => options.failStampIds!.has(id))) {
          return Promise.resolve({ data: null, error: { message: 'stamp boom' } })
        }
        const rows = tables[call.table] ?? []
        for (const row of rows) {
          if (idFilter.includes(row.id as string)) Object.assign(row, call.updateValues)
        }
      }
      return Promise.resolve({ data: null, error: null })
    }
    if (call.table === 'loot_submissions' && call.kind === 'select' && options.failCandidateRead) {
      return Promise.resolve({ data: null, error: { message: 'candidate boom' } })
    }
    let rows = applyFilters(tables[call.table] ?? [], call.filters)
    if (call.orStrings.includes(NEEDS_RESUBMISSION_OR_FILTER)) {
      rows = rows.filter((r) => needsResubmission(r as never))
    }
    if (call.range) rows = rows.slice(call.range[0], call.range[1] + 1)
    return Promise.resolve({ data: rows, error: null })
  }

  function from(table: string) {
    const call: RecordedCall = { table, filters: [], orStrings: [] }
    calls.push(call)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select(cols: string) {
        call.kind = 'select'
        call.selectCols = cols
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
      lt(col: string, val: unknown) {
        call.filters.push({ type: 'lt', col, val })
        return builder
      },
      or(str: string) {
        call.orStrings.push(str)
        return builder
      },
      order() {
        return builder
      },
      range(start: number, end: number) {
        call.range = [start, end]
        return builder
      },
      update(values: Record<string, unknown>) {
        call.kind = 'update'
        call.updateValues = values
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

const GUILD_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const GUILD_B = 'aaaaaaaa-0000-0000-0000-000000000002'

const DEPARTED = 'bbbbbbbb-0000-0000-0000-000000000001'
const ACTIVE = 'bbbbbbbb-0000-0000-0000-000000000002'
const MAIN = 'bbbbbbbb-0000-0000-0000-000000000003'
const ALT_DEPARTED = 'bbbbbbbb-0000-0000-0000-000000000004'
const MOVER = 'bbbbbbbb-0000-0000-0000-000000000005'
const NULL_ACTIVE = 'bbbbbbbb-0000-0000-0000-000000000006'
const NO_ROW = 'bbbbbbbb-0000-0000-0000-000000000007'
const OPTED_OUT = 'bbbbbbbb-0000-0000-0000-000000000008'
const TWO_LISTS = 'bbbbbbbb-0000-0000-0000-000000000009'

const USER_DEPARTED = 'cccccccc-0000-0000-0000-000000000001'
const USER_ACTIVE = 'cccccccc-0000-0000-0000-000000000002'
const USER_MAIN_ALT = 'cccccccc-0000-0000-0000-000000000003'
const USER_MOVER = 'cccccccc-0000-0000-0000-000000000004'
const USER_OPTED_OUT = 'cccccccc-0000-0000-0000-000000000006'
const USER_TWO_LISTS = 'cccccccc-0000-0000-0000-000000000007'

let discordCalls: Array<{ url: string; init?: RequestInit }>

function request(authorization = 'Bearer test-secret') {
  return new Request('http://localhost/api/cron/resubmit-reminders', {
    headers: { authorization },
  }) as unknown as Parameters<typeof GET>[0]
}

function sub(overrides: Partial<{ id: string; guild_id: string | null; character_id: string | null; status: string; submitted_at: string | null; resubmit_reminder_count: number }> = {}) {
  return {
    id: 'sub-id',
    guild_id: GUILD_A,
    character_id: ACTIVE,
    status: 'rejected',
    submitted_at: '2026-01-01T00:00:00Z',
    resubmit_reminder_count: 0,
    ...overrides,
  }
}

function char(id: string, userId: string | null, name = 'Raider') {
  return { id, user_id: userId, name }
}

function pref(userId: string, discordId: string | null, notify: boolean | null = true) {
  return { user_id: userId, discord_id: discordId, notify_resubmit_reminder: notify }
}

function cgm(characterId: string, guildId: string, isActive: boolean | null) {
  return { character_id: characterId, guild_id: guildId, is_active: isActive }
}

function messageBody() {
  const call = discordCalls.find((c) => c.url.includes('/messages'))
  return call ? JSON.parse(call.init!.body as string) : null
}

describe('GET /api/cron/resubmit-reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', 'test-secret')
    vi.stubEnv('DISCORD_BOT_TOKEN', 'bot-token')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.test')
    discordCalls = []
    ;(discordFetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (url: string, init?: RequestInit) => {
      discordCalls.push({ url, init })
      if (url.endsWith('/users/@me/channels')) {
        const body = JSON.parse(init?.body as string)
        return { ok: true, json: async () => ({ id: `dm-${body.recipient_id}` }) } as Response
      }
      return { ok: true, json: async () => ({}) } as Response
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  function setClient(tables: Record<string, Row[]>, options: ClientOptions = {}) {
    const { client, calls } = makeClient(tables, options)
    ;(createServiceRoleClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(client)
    return calls
  }

  it('R1 (tracer): a departed character gets no DM and no stamp', async () => {
    setClient({
      loot_submissions: [sub({ id: 'sub-departed', guild_id: GUILD_A, character_id: DEPARTED })],
      characters: [char(DEPARTED, USER_DEPARTED)],
      user_preferences: [pref(USER_DEPARTED, 'discord-departed')],
      guilds: [{ id: GUILD_A, name: 'Alpha' }],
      character_guild_memberships: [cgm(DEPARTED, GUILD_A, false)],
    })
    const res = await GET(request())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ reminded: 0, submissions: 0 })
    expect(discordFetch).not.toHaveBeenCalled()
  })

  it('R2 (control): an active character gets one DM and one stamp', async () => {
    const calls = setClient({
      loot_submissions: [sub({ id: 'sub-active', guild_id: GUILD_A, character_id: ACTIVE })],
      characters: [char(ACTIVE, USER_ACTIVE)],
      user_preferences: [pref(USER_ACTIVE, 'discord-active')],
      guilds: [{ id: GUILD_A, name: 'Alpha' }],
      character_guild_memberships: [cgm(ACTIVE, GUILD_A, true)],
    })
    const res = await GET(request())
    expect(await res.json()).toEqual({ reminded: 1, submissions: 1 })
    expect(messageBody().embeds[0].description).toContain("1 loot list that isn't submitted in Alpha")
    const updateCall = calls.find((c) => c.kind === 'update')
    expect(updateCall?.filters.find((f) => f.type === 'in')?.val).toEqual(['sub-active'])
    expect(updateCall?.updateValues?.resubmit_reminder_count).toBe(1)
  })

  it('R3 (D-01, same guild): only the still-active character in the pair is reminded and stamped', async () => {
    const calls = setClient({
      loot_submissions: [
        sub({ id: 'sub-main', guild_id: GUILD_A, character_id: MAIN }),
        sub({ id: 'sub-alt-rejected', guild_id: GUILD_A, character_id: ALT_DEPARTED }),
        sub({ id: 'sub-alt-draft', guild_id: GUILD_A, character_id: ALT_DEPARTED, status: 'draft', submitted_at: '2026-01-01T00:00:00Z' }),
      ],
      characters: [char(MAIN, USER_MAIN_ALT), char(ALT_DEPARTED, USER_MAIN_ALT)],
      user_preferences: [pref(USER_MAIN_ALT, 'discord-main-alt')],
      guilds: [{ id: GUILD_A, name: 'Alpha' }],
      character_guild_memberships: [cgm(MAIN, GUILD_A, true), cgm(ALT_DEPARTED, GUILD_A, false)],
    })
    const res = await GET(request())
    expect(await res.json()).toEqual({ reminded: 1, submissions: 1 })
    expect(messageBody().embeds[0].description).toContain('1 loot list')
    const updateCall = calls.find((c) => c.kind === 'update')
    expect(updateCall?.filters.find((f) => f.type === 'in')?.val).toEqual(['sub-main'])
  })

  it('R4 (D-01, other guild): only the guild B list is reminded, and the departed guild name is absent', async () => {
    const calls = setClient({
      loot_submissions: [
        sub({ id: 'sub-mover-a', guild_id: GUILD_A, character_id: MOVER }),
        sub({ id: 'sub-mover-b', guild_id: GUILD_B, character_id: MOVER }),
      ],
      characters: [char(MOVER, USER_MOVER)],
      user_preferences: [pref(USER_MOVER, 'discord-mover')],
      guilds: [{ id: GUILD_A, name: 'Alpha' }, { id: GUILD_B, name: 'Bravo' }],
      character_guild_memberships: [cgm(MOVER, GUILD_A, false), cgm(MOVER, GUILD_B, true)],
    })
    const res = await GET(request())
    expect(await res.json()).toEqual({ reminded: 1, submissions: 1 })
    expect(messageBody().embeds[0].description).toContain('in Bravo')
    expect(messageBody().embeds[0].description).not.toContain('Alpha')
    const updateCall = calls.find((c) => c.kind === 'update')
    expect(updateCall?.filters.find((f) => f.type === 'in')?.val).toEqual(['sub-mover-b'])
  })

  it('R5: null is_active and no-row-but-active-elsewhere both get no DM', async () => {
    setClient({
      loot_submissions: [
        sub({ id: 'sub-null-active', guild_id: GUILD_A, character_id: NULL_ACTIVE }),
        sub({ id: 'sub-no-row', guild_id: GUILD_A, character_id: NO_ROW }),
      ],
      characters: [char(NULL_ACTIVE, USER_DEPARTED), char(NO_ROW, USER_DEPARTED)],
      user_preferences: [pref(USER_DEPARTED, 'discord-departed')],
      guilds: [{ id: GUILD_A, name: 'Alpha' }, { id: GUILD_B, name: 'Bravo' }],
      character_guild_memberships: [cgm(NULL_ACTIVE, GUILD_A, null), cgm(NO_ROW, GUILD_B, true)],
    })
    const res = await GET(request())
    expect(await res.json()).toEqual({ reminded: 0, submissions: 0 })
    expect(discordFetch).not.toHaveBeenCalled()
  })

  it('R6: a null guild_id and a null character_id both get no DM and no stamp', async () => {
    setClient({
      loot_submissions: [
        sub({ id: 'sub-null-guild', guild_id: null, character_id: ACTIVE }),
        sub({ id: 'sub-null-char', guild_id: GUILD_A, character_id: null }),
      ],
      characters: [char(ACTIVE, USER_ACTIVE)],
      user_preferences: [pref(USER_ACTIVE, 'discord-active')],
      guilds: [{ id: GUILD_A, name: 'Alpha' }],
      character_guild_memberships: [cgm(ACTIVE, GUILD_A, true)],
    })
    const res = await GET(request())
    expect(await res.json()).toEqual({ reminded: 0, submissions: 0 })
    expect(discordFetch).not.toHaveBeenCalled()
  })

  it('R7 (D-04): a failing membership read answers 500 with nothing sent or stamped', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const calls = setClient(
      {
        loot_submissions: [sub({ id: 'sub-active', guild_id: GUILD_A, character_id: ACTIVE })],
        characters: [char(ACTIVE, USER_ACTIVE)],
        user_preferences: [pref(USER_ACTIVE, 'discord-active')],
        guilds: [{ id: GUILD_A, name: 'Alpha' }],
        character_guild_memberships: [],
      },
      { failCgm: true },
    )
    const res = await GET(request())
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal server error' })
    expect(discordFetch).not.toHaveBeenCalled()
    expect(calls.some((c) => c.kind === 'update')).toBe(false)
    expect(errSpy).toHaveBeenCalledWith('[resubmit-reminders] membership check failed:', expect.anything())
  })

  it('R8: membership reads happen before the characters call, which gets only kept ids', async () => {
    const calls = setClient({
      loot_submissions: [
        sub({ id: 'sub-active', guild_id: GUILD_A, character_id: ACTIVE }),
        sub({ id: 'sub-departed', guild_id: GUILD_A, character_id: DEPARTED }),
      ],
      characters: [char(ACTIVE, USER_ACTIVE), char(DEPARTED, USER_DEPARTED)],
      user_preferences: [pref(USER_ACTIVE, 'discord-active'), pref(USER_DEPARTED, 'discord-departed')],
      guilds: [{ id: GUILD_A, name: 'Alpha' }],
      character_guild_memberships: [cgm(ACTIVE, GUILD_A, true), cgm(DEPARTED, GUILD_A, false)],
    })
    await GET(request())
    const cgmIndex = calls.findIndex((c) => c.table === 'character_guild_memberships')
    const charsIndex = calls.findIndex((c) => c.table === 'characters')
    expect(cgmIndex).toBeGreaterThanOrEqual(0)
    expect(cgmIndex).toBeLessThan(charsIndex)
    const cgmCall = calls[cgmIndex]
    expect(cgmCall.filters.find((f) => f.type === 'eq' && f.col === 'guild_id')?.val).toBe(GUILD_A)
    expect(cgmCall.filters.find((f) => f.type === 'eq' && f.col === 'is_active')?.val).toBe(true)
    const charsCall = calls[charsIndex]
    expect(charsCall.filters.find((f) => f.type === 'in' && f.col === 'id')?.val).toEqual([ACTIVE])
    const guildsCall = calls.find((c) => c.table === 'guilds')
    expect(guildsCall?.filters.find((f) => f.type === 'in' && f.col === 'id')?.val).toEqual([GUILD_A])
  })

  it('R9a: a wrong bearer answers 401 with no table call', async () => {
    const calls = setClient({ loot_submissions: [] })
    const res = await GET(request('Bearer wrong-secret'))
    expect(res.status).toBe(401)
    expect(calls).toHaveLength(0)
  })

  it('R9b: an opted-out active raider gets no DM', async () => {
    setClient({
      loot_submissions: [sub({ id: 'sub-opted-out', guild_id: GUILD_A, character_id: OPTED_OUT })],
      characters: [char(OPTED_OUT, USER_OPTED_OUT)],
      user_preferences: [pref(USER_OPTED_OUT, 'discord-opted-out', false)],
      guilds: [{ id: GUILD_A, name: 'Alpha' }],
      character_guild_memberships: [cgm(OPTED_OUT, GUILD_A, true)],
    })
    const res = await GET(request())
    expect(await res.json()).toEqual({ reminded: 0, submissions: 0 })
    expect(discordFetch).not.toHaveBeenCalled()
  })

  it('R9c: an active raider with two needs-resubmit lists gets one DM and both are stamped', async () => {
    const calls = setClient({
      loot_submissions: [
        sub({ id: 'sub-two-a', guild_id: GUILD_A, character_id: TWO_LISTS }),
        sub({ id: 'sub-two-b', guild_id: GUILD_A, character_id: TWO_LISTS, status: 'draft', submitted_at: '2026-01-01T00:00:00Z' }),
      ],
      characters: [char(TWO_LISTS, USER_TWO_LISTS)],
      user_preferences: [pref(USER_TWO_LISTS, 'discord-two-lists')],
      guilds: [{ id: GUILD_A, name: 'Alpha' }],
      character_guild_memberships: [cgm(TWO_LISTS, GUILD_A, true)],
    })
    const res = await GET(request())
    expect(await res.json()).toEqual({ reminded: 1, submissions: 2 })
    expect(messageBody().embeds[0].description).toContain('2 loot lists')
    const updateCall = calls.find((c) => c.kind === 'update')
    expect((updateCall?.filters.find((f) => f.type === 'in')?.val as string[]).sort()).toEqual(['sub-two-a', 'sub-two-b'])
  })

  it('R10: the candidate call records the status filter, the cooldown filter and the reminder-count cap', async () => {
    const calls = setClient({
      loot_submissions: [sub({ id: 'sub-active', guild_id: GUILD_A, character_id: ACTIVE })],
      characters: [char(ACTIVE, USER_ACTIVE)],
      user_preferences: [pref(USER_ACTIVE, 'discord-active')],
      guilds: [{ id: GUILD_A, name: 'Alpha' }],
      character_guild_memberships: [cgm(ACTIVE, GUILD_A, true)],
    })
    await GET(request())
    const candidateCall = calls.find((c) => c.table === 'loot_submissions' && c.kind === 'select')
    expect(candidateCall?.orStrings[0]).toBe(NEEDS_RESUBMISSION_OR_FILTER)
    expect(candidateCall?.orStrings[1]).toMatch(/^resubmit_reminded_at\.is\.null,/)
    expect(candidateCall?.filters).toContainEqual({ type: 'lt', col: 'resubmit_reminder_count', val: 3 })
  })

  it('A2: a failing candidate read answers 500 before any DM', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const calls = setClient({ loot_submissions: [] }, { failCandidateRead: true })
    const res = await GET(request())
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal server error' })
    expect(discordFetch).not.toHaveBeenCalled()
    expect(calls.some((c) => c.kind === 'update')).toBe(false)
    expect(errSpy).toHaveBeenCalledWith('[resubmit-reminders] candidate read failed:', expect.anything())
  })

  it('A2: a failed stamp is logged, excluded from the count, and the run continues', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setClient(
      {
        loot_submissions: [
          sub({ id: 'sub-ok', guild_id: GUILD_A, character_id: ACTIVE, resubmit_reminder_count: 0 }),
          sub({ id: 'sub-fail', guild_id: GUILD_A, character_id: ACTIVE, resubmit_reminder_count: 1 }),
        ],
        characters: [char(ACTIVE, USER_ACTIVE)],
        user_preferences: [pref(USER_ACTIVE, 'discord-active')],
        guilds: [{ id: GUILD_A, name: 'Alpha' }],
        character_guild_memberships: [cgm(ACTIVE, GUILD_A, true)],
      },
      { failStampIds: new Set(['sub-fail']) },
    )
    const res = await GET(request())
    expect(await res.json()).toEqual({ reminded: 1, submissions: 1 })
    expect(errSpy).toHaveBeenCalledWith('[resubmit-reminders] reminder stamp failed:', expect.anything())
  })

  it('A3: the fallback app URL is https://www.getlootlist.com when NEXT_PUBLIC_APP_URL is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    setClient({
      loot_submissions: [sub({ id: 'sub-active', guild_id: GUILD_A, character_id: ACTIVE })],
      characters: [char(ACTIVE, USER_ACTIVE)],
      user_preferences: [pref(USER_ACTIVE, 'discord-active')],
      guilds: [{ id: GUILD_A, name: 'Alpha' }],
      character_guild_memberships: [cgm(ACTIVE, GUILD_A, true)],
    })
    await GET(request())
    expect(messageBody().embeds[0].description).toContain('https://www.getlootlist.com/loot-list')
  })
})
