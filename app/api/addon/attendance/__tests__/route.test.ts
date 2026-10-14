// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'
import { importAttendanceByTeam } from '@/utils/raid-events/team-routing'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyOfficerPermissions: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), trackApiError: vi.fn() }))
vi.mock('@/utils/blp/recompute', () => ({ recomputeBlpForItems: vi.fn(), recomputeBlpForEvents: vi.fn() }))
vi.mock('@/utils/raid-events/team-routing', () => ({
  importAttendanceByTeam: vi.fn(),
}))
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (fn: () => unknown) => fn(),
}))

const GUILD_ID = 'guild-1'

type Call = { table: string; columns?: string; filters: Array<[string, unknown]> }

interface Fixture {
  characters?: Array<{ character_id: string; characters: { id: string; name: string } }>
  /** The active expansion's timezone; null or absent means no active expansion. */
  raidTimeZone?: string | null
  raidTimeZoneError?: boolean
}

/**
 * Recording fake for the attendance route: character_guild_memberships and
 * the guilds time zone read are answered from the fixture, every call is
 * recorded so a test can assert whether the time zone was read at all.
 */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const call: Call = { table, filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (columns?: string) => { call.columns = columns; return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
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
          return Promise.resolve({ data: null, error: null }).then(resolve)
        },
      }
      return builder
    },
  }
  return { client, calls }
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
})
