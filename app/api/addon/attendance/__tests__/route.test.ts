// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'
import { recomputeBlpForEvents, recomputeBlpForItems } from '@/utils/blp/recompute'
import { importAttendanceByTeam } from '@/utils/raid-events/team-routing'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyOfficerPermissions: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), trackApiError: vi.fn() }))
vi.mock('@/utils/blp/recompute', () => ({ recomputeBlpForItems: vi.fn(), recomputeBlpForEvents: vi.fn() }))
// pickAwardRaidEvent and getGuildTeamRouting stay real: the GH #321 linker
// (link-unlinked-awards.ts) runs for real against the fake tables below.
vi.mock('@/utils/raid-events/team-routing', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/utils/raid-events/team-routing')>()
  return {
    pickAwardRaidEvent: original.pickAwardRaidEvent,
    getGuildTeamRouting: original.getGuildTeamRouting,
    importAttendanceByTeam: vi.fn(),
  }
})
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (fn: () => unknown) => fn(),
}))

const GUILD_ID = 'guild-1'

type Call = {
  table: string
  columns?: string
  filters: Array<[string, unknown]>
  updatePayload?: Record<string, unknown>
}

/** A loot_history row in the fake's store (GH #321 back-linking). */
type HistoryRow = {
  id: string
  guild_id: string
  source: string
  loot_item_id: string
  character_id: string | null
  raid_event_id: string | null
  awarded_date: string
  award_copy: number
}

interface Fixture {
  characters?: Array<{ character_id: string; characters: { id: string; name: string } }>
  /** The active expansion's timezone; null or absent means no active expansion. */
  raidTimeZone?: string | null
  raidTimeZoneError?: boolean
  /** GH #321: existing loot_history rows the linker reads and updates. */
  history?: HistoryRow[]
  /** GH #321: the date's raid nights. */
  raidEvents?: Array<{ id: string; raid_date: string; raid_team_id: string | null }>
  /** GH #321: every loot_history read fails. */
  historyError?: boolean
}

function matchesFilters(row: Record<string, unknown>, filters: Array<[string, unknown]>): boolean {
  return filters.every(([col, val]) => {
    if (col.startsWith('is:')) return row[col.slice(3)] === null
    return Array.isArray(val) ? val.includes(row[col]) : row[col] === val
  })
}

/**
 * Recording fake for the attendance route: character_guild_memberships and
 * the guilds time zone read are answered from the fixture, every call is
 * recorded so a test can assert whether the time zone was read at all.
 * loot_history, raid_events and raid_team_members serve the GH #321 linker.
 */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []
  const history = fixture.history ?? []
  const client = {
    from(table: string) {
      const call: Call = { table, filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (columns?: string) => { call.columns = columns; return builder },
        update: (payload: Record<string, unknown>) => { call.updatePayload = payload; return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        is: (col: string, val: unknown) => { call.filters.push([`is:${col}`, val]); return builder },
        maybeSingle: () => {
          if (table === 'guilds') {
            if (fixture.raidTimeZoneError) {
              return Promise.resolve({ data: null, error: { message: 'guilds boom' } })
            }
            return Promise.resolve({
              data: {
                active_expansion_id: 'exp-1',
                expansions: fixture.raidTimeZone == null ? null : { timezone: fixture.raidTimeZone },
              },
              error: null,
            })
          }
          return Promise.resolve({ data: null, error: null })
        },
        then: (resolve: (v: unknown) => unknown) => {
          if (table === 'character_guild_memberships') {
            return Promise.resolve({ data: fixture.characters ?? [], error: null }).then(resolve)
          }
          if (table === 'loot_history') {
            if (fixture.historyError) {
              return Promise.resolve({ data: null, error: { message: 'loot_history boom' } }).then(resolve)
            }
            const rows = history.filter(r => matchesFilters(r, call.filters))
            if (call.updatePayload) for (const r of rows) Object.assign(r, call.updatePayload)
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          if (table === 'raid_events') {
            const date = call.filters.find(([col]) => col === 'raid_date')?.[1]
            const rows = (fixture.raidEvents ?? []).filter(e => e.raid_date === date).map(e => ({ id: e.id, raid_team_id: e.raid_team_id }))
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          return Promise.resolve({ data: null, error: null }).then(resolve)
        },
      }
      return builder
    },
  }
  return { client, calls, history }
}

function request(body: unknown) {
  return new Request('http://localhost/api/addon/attendance', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

const timeZoneReads = (calls: Call[]) =>
  calls.filter(c => c.table === 'guilds' && c.columns?.includes('timezone'))

const BASE = { guild_id: GUILD_ID, raid_name: 'Naxxramas', attended: ['Thrall'] }

describe('POST /api/addon/attendance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'user-1' }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)
    vi.mocked(importAttendanceByTeam).mockResolvedValue({
      eventIds: ['ev-1'],
      attendedCount: 1,
      absentCount: 0,
    } as never)
  })

  describe('GH #355: raid night in the guild time zone', () => {
    it('A1 picks the night from start_time in the guild time zone', async () => {
      const { client } = makeClient({ raidTimeZone: 'America/New_York' })
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({ ...BASE, raid_date: '2026-10-14', start_time: '2026-10-14T02:30:00Z' }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(vi.mocked(importAttendanceByTeam).mock.calls[0][2]).toBe('2026-10-13')
      expect(body.data.raid_date).toBe('2026-10-13')
    })

    it('A2 keeps raid_date and reads no time zone when start_time is absent', async () => {
      const { client, calls } = makeClient({ raidTimeZone: 'America/New_York' })
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({ ...BASE, raid_date: '2026-10-14' }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(vi.mocked(importAttendanceByTeam).mock.calls[0][2]).toBe('2026-10-14')
      expect(body.data.raid_date).toBe('2026-10-14')
      expect(calls.some(c => c.table === 'guilds')).toBe(false)
    })

    it.each(['19:00', 12345])('A3 keeps raid_date for a malformed start_time (%s)', async (startTime) => {
      const { client, calls } = makeClient({ raidTimeZone: 'America/New_York' })
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({ ...BASE, raid_date: '2026-10-14', start_time: startTime }))

      expect(res.status).toBe(200)
      expect(vi.mocked(importAttendanceByTeam).mock.calls[0][2]).toBe('2026-10-14')
      expect(calls.some(c => c.table === 'guilds')).toBe(false)
    })

    it('A4 carries on with raid_date when the time zone read fails', async () => {
      const { client, calls } = makeClient({ raidTimeZoneError: true })
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
      vi.spyOn(console, 'error').mockImplementation(() => {})

      const res = await POST(request({ ...BASE, raid_date: '2026-10-14', start_time: '2026-10-14T02:30:00Z' }))

      expect(res.status).toBe(200)
      expect(timeZoneReads(calls)).toHaveLength(1)
      expect(vi.mocked(importAttendanceByTeam).mock.calls[0][2]).toBe('2026-10-14')
      expect(trackApiError).toHaveBeenCalledTimes(1)
    })

    it('A5 still rejects a missing raid_date with the existing message', async () => {
      const { client } = makeClient({})
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({ ...BASE, start_time: '2026-10-14T02:30:00Z' }))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe('guild_id, raid_date, raid_name, and attended are required')
      expect(importAttendanceByTeam).not.toHaveBeenCalled()
    })
  })

  describe('GH #321: awards that arrived before the night', () => {
    const unlinkedAward = (extra: Partial<HistoryRow> = {}): HistoryRow => ({
      id: 'hist-1',
      guild_id: GUILD_ID,
      source: 'addon',
      loot_item_id: 'item-1',
      character_id: 'char-1',
      raid_event_id: null,
      awarded_date: '2026-10-14',
      award_copy: 1,
      ...extra,
    })
    const night = { id: 'ev-1', raid_date: '2026-10-14', raid_team_id: null }
    const historyUpdates = (calls: Call[]) => calls.filter(c => c.table === 'loot_history' && c.updatePayload)

    it("B1 links the guild's unlinked addon award from that date to the night and recomputes BLP for the event and the item", async () => {
      const { client, calls, history } = makeClient({ history: [unlinkedAward()], raidEvents: [night] })
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({ ...BASE, raid_date: '2026-10-14' }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.records_created).toBe(1)
      // after() runs the callback without awaiting it; the linker and the
      // recompute finish just after the response.
      await vi.waitFor(() => expect(recomputeBlpForItems).toHaveBeenCalled())
      expect(historyUpdates(calls)).toHaveLength(1)
      expect(historyUpdates(calls)[0].updatePayload).toEqual({ raid_event_id: 'ev-1', award_copy: 1 })
      expect(historyUpdates(calls)[0].filters).toEqual([['id', 'hist-1'], ['guild_id', GUILD_ID], ['is:raid_event_id', null]])
      expect(history[0].raid_event_id).toBe('ev-1')
      expect(recomputeBlpForEvents).toHaveBeenCalledWith(client, GUILD_ID, ['ev-1'])
      expect(recomputeBlpForItems).toHaveBeenCalledWith(client, GUILD_ID, ['item-1'])
    })

    it('B2 a linking failure still returns 200 with the attendance counts, tracks the error and recomputes the events', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const { client } = makeClient({ history: [unlinkedAward()], raidEvents: [night], historyError: true })
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({ ...BASE, raid_date: '2026-10-14' }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data).toMatchObject({ raid_event_ids: ['ev-1'], records_created: 1, records_updated: 0 })
      await vi.waitFor(() => expect(recomputeBlpForEvents).toHaveBeenCalledWith(client, GUILD_ID, ['ev-1']))
      expect(trackApiError).toHaveBeenCalledWith('unknown', 'POST /api/addon/attendance', expect.any(Error))
      expect(recomputeBlpForItems).not.toHaveBeenCalled()
    })

    it('B3 looks for unlinked awards dated the zoned night, not the UTC raid_date', async () => {
      const { client, calls } = makeClient({ raidTimeZone: 'America/New_York', raidEvents: [{ ...night, raid_date: '2026-10-13' }] })
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({ ...BASE, raid_date: '2026-10-14', start_time: '2026-10-14T02:30:00Z' }))

      expect(res.status).toBe(200)
      await vi.waitFor(() => expect(recomputeBlpForEvents).toHaveBeenCalled())
      const unlinkedRead = calls.find(c => c.table === 'loot_history')
      expect(unlinkedRead?.filters).toEqual([
        ['guild_id', GUILD_ID],
        ['source', 'addon'],
        ['is:raid_event_id', null],
        ['awarded_date', '2026-10-13'],
      ])
      expect(historyUpdates(calls)).toHaveLength(0)
    })
  })
})
