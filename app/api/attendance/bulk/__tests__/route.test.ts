// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, PATCH, DELETE } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'
import { logAudit } from '@/utils/audit/log'
import { revalidateCharacterAttendance } from '@/lib/cache/dashboard-attendance'
import { recomputeBlpForEvents } from '@/utils/blp/recompute'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({
  verifyPermission: vi.fn(),
  verifyOfficerPermissions: vi.fn(),
  verifyGuildMasterPermissions: vi.fn(),
}))
vi.mock('@/utils/audit/log', () => ({ logAudit: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), trackApiError: vi.fn() }))
vi.mock('@/utils/analytics/funnel', () => ({ evaluateGuildFunnel: vi.fn() }))
vi.mock('@/lib/cache/dashboard-attendance', () => ({ revalidateCharacterAttendance: vi.fn() }))
vi.mock('@/utils/blp/recompute', () => ({ recomputeBlpForEvents: vi.fn() }))

// Shared mutable state the routing mock pushes onto, so the marker it
// records interleaves correctly with the fake client's own calls (both are
// reset and read from the SAME array per test, via run()/routingState).
const routingState = vi.hoisted(() => ({ calls: [] as unknown[] }))
vi.mock('@/utils/raid-events/team-routing', () => ({
  routeRecordsToTeamEvents: vi.fn((_service: unknown, _guildId: string, records: unknown[]) => {
    routingState.calls.push({ table: 'routing', op: 'select', filters: [] })
    return Promise.resolve(records)
  }),
}))
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (fn: () => unknown) => fn(),
}))

// ─── Fixture ids (valid UUIDs) ──────────────────────────────

const GUILD_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const GUILD_B = 'aaaaaaaa-0000-0000-0000-000000000002'
const EA = 'bbbbbbbb-0000-0000-0000-000000000001'
const EA2 = 'bbbbbbbb-0000-0000-0000-000000000002'
const EB = 'bbbbbbbb-0000-0000-0000-000000000003'
const UNKNOWN_EVENT_ID = 'bbbbbbbb-0000-0000-0000-000000000099'
const CA1 = 'cccccccc-0000-0000-0000-000000000001'
const CA2 = 'cccccccc-0000-0000-0000-000000000002'
const CGONE = 'cccccccc-0000-0000-0000-000000000003'
const CB = 'cccccccc-0000-0000-0000-000000000004'
const RA1 = 'dddddddd-0000-0000-0000-000000000001'
const RA2 = 'dddddddd-0000-0000-0000-000000000002'
const RB1 = 'dddddddd-0000-0000-0000-000000000003'
const R_NULL_EVENT = 'dddddddd-0000-0000-0000-000000000004'
const RPUG = 'dddddddd-0000-0000-0000-000000000005'
const UNKNOWN_ROW_ID = 'dddddddd-0000-0000-0000-000000000099'
const OFFICER_USER_ID = 'eeeeeeee-0000-0000-0000-000000000001'

const bulkCharId = (n: number) => `ffffffff-0000-0000-0000-${String(n).padStart(12, '0')}`
const bulkRowId = (n: number) => `99999999-0000-0000-0000-${String(n).padStart(12, '0')}`

// Must match ATTENDANCE_FLAG_COLUMNS in ../route.ts exactly, so the fake
// client can tell the merged-status flag read apart from a plain id lookup.
const ATTENDANCE_FLAG_COLUMNS = 'id, signed_up, attended, no_call_no_show, was_late, was_benched, is_excused'

// ─── Recording fake client ──────────────────────────────────

type Op = 'select' | 'insert' | 'upsert' | 'update' | 'delete'
type FilterKind = 'eq' | 'in' | 'is'
type Filter = [FilterKind, string, unknown]
interface Call {
  table: string
  op: Op
  filters: Filter[]
  selectCols?: string
  payload?: unknown
  upsertOptions?: { onConflict?: string }
}

interface RaidEventRow { id: string; guild_id: string }
interface MembershipRow { character_id: string; guild_id: string; is_active: boolean }
interface AttendanceRow {
  id: string
  raid_event_id: string | null
  character_id?: string | null
  character_name?: string | null
  signed_up?: boolean
  attended?: boolean
  no_call_no_show?: boolean
  was_late?: boolean
  was_benched?: boolean
  is_excused?: boolean
}

interface Fixture {
  raidEvents: RaidEventRow[]
  memberships: MembershipRow[]
  attendanceRows: AttendanceRow[]
  // Blanket error for every call to `${table}:${op}`.
  errors?: Partial<Record<string, string>>
}

function baseFixture(): Fixture {
  return {
    raidEvents: [
      { id: EA, guild_id: GUILD_A },
      { id: EA2, guild_id: GUILD_A },
      { id: EB, guild_id: GUILD_B },
    ],
    memberships: [
      { character_id: CA1, guild_id: GUILD_A, is_active: true },
      { character_id: CA2, guild_id: GUILD_A, is_active: true },
      { character_id: CGONE, guild_id: GUILD_A, is_active: false },
      { character_id: CB, guild_id: GUILD_B, is_active: true },
    ],
    attendanceRows: [
      { id: RA1, raid_event_id: EA, character_id: CA1, attended: true },
      { id: RA2, raid_event_id: EA, character_id: CA2 },
      { id: RB1, raid_event_id: EB, character_id: CB },
      { id: R_NULL_EVENT, raid_event_id: null },
      { id: RPUG, raid_event_id: EA, character_id: null, character_name: 'Pugname' },
    ],
  }
}

/**
 * Recording fake for the Supabase service-role client. Every from() call is
 * pushed onto `calls` (shared with the routing mock so ordering between the
 * two is preserved); resolveQuery below answers each table/op combination
 * the three handlers and the guard module need. Deletes mutate a working
 * copy of fixture.attendanceRows so a second chunk sees the first chunk's
 * removals.
 */
function makeClient(fixture: Fixture, calls: Call[]) {
  const attendanceRows = fixture.attendanceRows.map(r => ({ ...r }))

  function resolveQuery(call: Call): { data: unknown; error: { message: string } | null } {
    const key = `${call.table}:${call.op}`
    const configuredError = fixture.errors?.[key]
    if (configuredError) {
      return { data: null, error: { message: configuredError } }
    }

    if (call.table === 'raid_events' && call.op === 'select') {
      const guildVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'guild_id')?.[2]
      const idVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'id')?.[2]
      const inIds = call.filters.find(f => f[0] === 'in' && f[1] === 'id')?.[2] as string[] | undefined
      if (inIds) {
        const matched = fixture.raidEvents.filter(r => r.guild_id === guildVal && inIds.includes(r.id))
        return { data: matched.map(r => ({ id: r.id })), error: null }
      }
      if (idVal) {
        const matched = fixture.raidEvents.find(r => r.id === idVal && (guildVal === undefined || r.guild_id === guildVal))
        return { data: matched ? { updated_at: undefined } : null, error: null }
      }
      return { data: [], error: null }
    }

    if (call.table === 'raid_events' && call.op === 'update') {
      return { data: null, error: null }
    }

    if (call.table === 'character_guild_memberships' && call.op === 'select') {
      const guildVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'guild_id')?.[2]
      const inIds = call.filters.find(f => f[0] === 'in' && f[1] === 'character_id')?.[2] as string[] | undefined
      const matched = fixture.memberships.filter(m => m.guild_id === guildVal && (!inIds || inIds.includes(m.character_id)))
      return { data: matched.map(m => ({ character_id: m.character_id })), error: null }
    }

    if (call.table === 'attendance_records' && call.op === 'select') {
      const inIds = call.filters.find(f => f[0] === 'in' && f[1] === 'id')?.[2] as string[] | undefined
      const isFlagSelect = call.selectCols === ATTENDANCE_FLAG_COLUMNS
      const shapeRow = (r: AttendanceRow) => isFlagSelect
        ? {
            id: r.id,
            signed_up: r.signed_up,
            attended: r.attended,
            no_call_no_show: r.no_call_no_show,
            was_late: r.was_late,
            was_benched: r.was_benched,
            is_excused: r.is_excused,
          }
        : { id: r.id, raid_event_id: r.raid_event_id }
      if (inIds) {
        const matched = attendanceRows.filter(r => inIds.includes(r.id))
        return { data: matched.map(shapeRow), error: null }
      }
      const raidEventVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'raid_event_id')?.[2]
      if (raidEventVal !== undefined) {
        const charIdsVal = call.filters.find(f => f[0] === 'in' && f[1] === 'character_id')?.[2] as string[] | undefined
        const matched = attendanceRows.filter(r =>
          r.raid_event_id === raidEventVal && (!charIdsVal || charIdsVal.includes(r.character_id ?? '')))
        return { data: matched.map(shapeRow), error: null }
      }
      return { data: [], error: null }
    }

    if (call.table === 'attendance_records' && (call.op === 'upsert' || call.op === 'insert')) {
      const payload = call.payload as unknown[]
      return { data: payload, error: null }
    }

    if (call.table === 'attendance_records' && call.op === 'update') {
      return { data: null, error: null }
    }

    if (call.table === 'attendance_records' && call.op === 'delete') {
      const inIds = call.filters.find(f => f[0] === 'in' && f[1] === 'id')?.[2] as string[] | undefined
      if (inIds) {
        for (const idToRemove of inIds) {
          const idx = attendanceRows.findIndex(r => r.id === idToRemove)
          if (idx !== -1) attendanceRows.splice(idx, 1)
        }
      } else {
        const raidEventVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'raid_event_id')?.[2]
        const characterVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'character_id')?.[2]
        const isNullCharacter = call.filters.some(f => f[0] === 'is' && f[1] === 'character_id' && f[2] === null)
        const namesVal = call.filters.find(f => f[0] === 'in' && f[1] === 'character_name')?.[2] as string[] | undefined
        for (let i = attendanceRows.length - 1; i >= 0; i--) {
          const row = attendanceRows[i]
          if (raidEventVal !== undefined && row.raid_event_id !== raidEventVal) continue
          if (characterVal !== undefined && row.character_id !== characterVal) continue
          if (isNullCharacter && row.character_id) continue
          if (namesVal && !namesVal.includes(row.character_name ?? '')) continue
          attendanceRows.splice(i, 1)
        }
      }
      return { data: null, error: null }
    }

    return { data: null, error: null }
  }

  const client = {
    from(table: string) {
      const call: Call = { table, op: 'select', filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (cols?: string) => { call.selectCols = cols; return builder },
        insert: (payload: unknown) => { call.op = 'insert'; call.payload = payload; return builder },
        upsert: (payload: unknown, options?: { onConflict?: string }) => {
          call.op = 'upsert'; call.payload = payload; call.upsertOptions = options; return builder
        },
        update: (payload: unknown) => { call.op = 'update'; call.payload = payload; return builder },
        delete: () => { call.op = 'delete'; return builder },
        eq: (col: string, val: unknown) => { call.filters.push(['eq', col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push(['in', col, val]); return builder },
        is: (col: string, val: unknown) => { call.filters.push(['is', col, val]); return builder },
        maybeSingle: () => Promise.resolve(resolveQuery(call)),
        single: () => Promise.resolve(resolveQuery(call)),
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(resolveQuery(call)).then(resolve, reject),
      }
      return builder
    },
  }
  return { client }
}

function request(method: 'POST' | 'PATCH' | 'DELETE', body: unknown) {
  return new Request('http://localhost/api/attendance/bulk', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

async function run(
  handler: typeof POST,
  method: 'POST' | 'PATCH' | 'DELETE',
  fixture: Fixture,
  body: Record<string, unknown>,
  hasPermission = true,
) {
  routingState.calls.length = 0
  const { client } = makeClient(fixture, routingState.calls as Call[])
  vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)
  vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: OFFICER_USER_ID }, error: null } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>)
  vi.mocked(verifyPermission).mockResolvedValue({ hasPermission } as unknown as Awaited<ReturnType<typeof verifyPermission>>)
  const res = await handler(request(method, { guild_id: GUILD_A, ...body }), {})
  const json = await res.json()
  return { res, json, calls: routingState.calls as Call[] }
}

const writeCalls = (calls: Call[]) => calls.filter(c => c.table === 'attendance_records' && (c.op === 'upsert' || c.op === 'insert'))
const updateCalls = (calls: Call[]) => calls.filter(c => c.table === 'attendance_records' && c.op === 'update')
const deleteCalls = (calls: Call[]) => calls.filter(c => c.table === 'attendance_records' && c.op === 'delete')
const raidEventLookups = (calls: Call[]) => calls.filter(c => c.table === 'raid_events' && c.op === 'select' && c.filters.some(f => f[0] === 'in'))
const raidEventTouches = (calls: Call[]) => calls.filter(c => c.table === 'raid_events' && c.op === 'update')
const membershipLookups = (calls: Call[]) => calls.filter(c => c.table === 'character_guild_memberships' && c.op === 'select')
const routingMarkers = (calls: Call[]) => calls.filter(c => c.table === 'routing')

describe('attendance bulk route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('POST /api/attendance/bulk', () => {
    it('P-1: upserts a linked and a name-only record, checks the guild first, then routes, then writes', async () => {
      const { res, json, calls } = await run(POST, 'POST', baseFixture(), {
        action: 'upsert',
        onConflict: 'raid_event_id,character_id',
        records: [
          { raid_event_id: EA, character_id: CA1, user_id: OFFICER_USER_ID, attended: true },
          { raid_event_id: EA, character_name: 'Pugname' },
        ],
      })

      expect(res.status).toBe(200)
      expect(json).toEqual({ success: true, count: 2 })

      const writes = writeCalls(calls)
      expect(writes).toHaveLength(1)
      expect(writes[0].op).toBe('upsert')
      expect(writes[0].upsertOptions).toEqual({ onConflict: 'raid_event_id,character_id' })
      const payload = writes[0].payload as Record<string, unknown>[]
      expect(Object.keys(payload[0]).sort()).toEqual(['attended', 'character_id', 'modified_by', 'raid_event_id', 'status', 'user_id'].sort())
      expect(Object.keys(payload[1]).sort()).toEqual(['character_name', 'modified_by', 'raid_event_id', 'status'].sort())

      const eventLookups = raidEventLookups(calls)
      expect(eventLookups).toHaveLength(1)
      expect(eventLookups[0].filters).toEqual(expect.arrayContaining([
        ['eq', 'guild_id', GUILD_A],
        ['in', 'id', [EA]],
      ]))

      const memberLookups = membershipLookups(calls)
      expect(memberLookups).toHaveLength(1)
      expect(memberLookups[0].filters).toEqual(expect.arrayContaining([
        ['eq', 'guild_id', GUILD_A],
        ['in', 'character_id', [CA1]],
      ]))
      expect(memberLookups[0].filters.some(f => f[1] === 'is_active')).toBe(false)

      const eventLookupIndex = calls.indexOf(eventLookups[0])
      const memberLookupIndex = calls.indexOf(memberLookups[0])
      const routingIndex = calls.indexOf(routingMarkers(calls)[0])
      expect(eventLookupIndex).toBeLessThan(routingIndex)
      expect(memberLookupIndex).toBeLessThan(routingIndex)

      expect(recomputeBlpForEvents).toHaveBeenCalledWith(expect.anything(), GUILD_A, [EA])
      expect(revalidateCharacterAttendance).toHaveBeenCalledWith(CA1)
    })

    it("P-2: refuses another guild's raid event with C-1 and makes no write", async () => {
      const { res, json, calls } = await run(POST, 'POST', baseFixture(), {
        action: 'upsert',
        records: [{ raid_event_id: EB, character_id: CA1 }],
      })
      expect(res.status).toBe(400)
      expect(json).toEqual({ error: "This attendance belongs to a raid that isn't in this guild. Refresh the page, then try again.", invalid_raid_event_ids: [EB] })
      expect(writeCalls(calls)).toHaveLength(0)
      expect(routingMarkers(calls)).toHaveLength(0)
    })

    it('P-2: an unknown raid_event_id gives the same 400', async () => {
      const { res, json, calls } = await run(POST, 'POST', baseFixture(), {
        action: 'upsert',
        records: [{ raid_event_id: UNKNOWN_EVENT_ID, character_id: CA1 }],
      })
      expect(res.status).toBe(400)
      expect(json.error).toBe("This attendance belongs to a raid that isn't in this guild. Refresh the page, then try again.")
      expect(json.invalid_raid_event_ids).toEqual([UNKNOWN_EVENT_ID])
      expect(writeCalls(calls)).toHaveLength(0)
    })

    it('P-3: a character never in the guild returns 400 with C-2 and makes no write', async () => {
      const { res, json, calls } = await run(POST, 'POST', baseFixture(), {
        action: 'upsert',
        records: [{ raid_event_id: EA, character_id: CB }],
      })
      expect(res.status).toBe(400)
      expect(json).toEqual({ error: 'One or more raiders were never members of this guild. Refresh the page, then try again.', invalid_character_ids: [CB] })
      expect(writeCalls(calls)).toHaveLength(0)
      expect(routingMarkers(calls)).toHaveLength(0)
    })

    it('P-3: a character with an inactive membership still passes', async () => {
      const { res, json } = await run(POST, 'POST', baseFixture(), {
        action: 'upsert',
        records: [{ raid_event_id: EA, character_id: CGONE }],
      })
      expect(res.status).toBe(200)
      expect(json).toEqual({ success: true, count: 1 })
    })

    it('P-4: action insert with two name-only records makes one insert and returns count 2', async () => {
      const { res, json, calls } = await run(POST, 'POST', baseFixture(), {
        action: 'insert',
        records: [
          { raid_event_id: EA, character_name: 'Pug1' },
          { raid_event_id: EA, character_name: 'Pug2' },
        ],
      })
      expect(res.status).toBe(200)
      expect(json).toEqual({ success: true, count: 2 })
      const writes = writeCalls(calls)
      expect(writes).toHaveLength(1)
      expect(writes[0].op).toBe('insert')
    })

    it.each([
      ['a record with an id key', [{ id: 'x', raid_event_id: EA, character_id: CA1 }]],
      ['a record with a status key', [{ status: 'attended', raid_event_id: EA, character_id: CA1 }]],
      ['a non-UUID raid_event_id', [{ raid_event_id: 'not-a-uuid', character_id: CA1 }]],
      ['neither character_id nor character_name', [{ raid_event_id: EA }]],
      ['character_name of spaces only', [{ raid_event_id: EA, character_name: '   ' }]],
      ['a flag sent as a string', [{ raid_event_id: EA, character_id: CA1, attended: 'true' }]],
      ['1001 records', Array.from({ length: 1001 }, () => ({ raid_event_id: EA, character_id: CA1 }))],
    ])('P-5 (C-3): %s gives 400 with no lookup and no write', async (_label, records) => {
      const { res, json, calls } = await run(POST, 'POST', baseFixture(), { action: 'upsert', records })
      expect(res.status).toBe(400)
      expect(json.error).toBe('This page is out of date. Refresh it, then try again.')
      expect(raidEventLookups(calls)).toHaveLength(0)
      expect(membershipLookups(calls)).toHaveLength(0)
      expect(writeCalls(calls)).toHaveLength(0)
    })

    it.each([
      ['action missing', undefined, undefined],
      ['action delete', 'delete', undefined],
      ['onConflict id', 'upsert', 'id'],
    ])('P-5 (C-3): %s gives 400 with no lookup and no write', async (_label, action, onConflict) => {
      const { res, json, calls } = await run(POST, 'POST', baseFixture(), {
        action,
        onConflict,
        records: [{ raid_event_id: EA, character_id: CA1 }],
      })
      expect(res.status).toBe(400)
      expect(json.error).toBe('This page is out of date. Refresh it, then try again.')
      expect(raidEventLookups(calls)).toHaveLength(0)
      expect(writeCalls(calls)).toHaveLength(0)
    })

    it.each([
      ['records missing', {}],
      ['records not an array', { records: 'nope' }],
      ['records empty', { records: [] }],
    ])('keeps the existing 400 text when %s', async (_label, body) => {
      const { res, json } = await run(POST, 'POST', baseFixture(), body)
      expect(res.status).toBe(400)
      expect(json.error).toBe('guild_id and records array are required')
    })

    it('P-6: a raid_events lookup error returns 500 with no write', async () => {
      const fixture = { ...baseFixture(), errors: { 'raid_events:select': 'db down' } }
      const { res, json, calls } = await run(POST, 'POST', fixture, {
        action: 'upsert',
        records: [{ raid_event_id: EA, character_id: CA1 }],
      })
      expect(res.status).toBe(500)
      expect(json.error).toBe('Internal server error')
      expect(writeCalls(calls)).toHaveLength(0)
    })

    it('P-6: a membership lookup error returns 500 with no write', async () => {
      const fixture = { ...baseFixture(), errors: { 'character_guild_memberships:select': 'db down' } }
      const { res, json, calls } = await run(POST, 'POST', fixture, {
        action: 'upsert',
        records: [{ raid_event_id: EA, character_id: CA1 }],
      })
      expect(res.status).toBe(500)
      expect(json.error).toBe('Internal server error')
      expect(writeCalls(calls)).toHaveLength(0)
    })

    it('P-7: 150 distinct linked characters make two membership lookups of 100 and 50 ids', async () => {
      const characterIds = Array.from({ length: 150 }, (_, i) => bulkCharId(i))
      const fixture = {
        ...baseFixture(),
        memberships: [
          ...baseFixture().memberships,
          ...characterIds.map(cid => ({ character_id: cid, guild_id: GUILD_A, is_active: true })),
        ],
      }
      const records = characterIds.map(cid => ({ raid_event_id: EA, character_id: cid }))
      const { res, calls } = await run(POST, 'POST', fixture, { action: 'upsert', records })
      expect(res.status).toBe(200)
      const memberLookups = membershipLookups(calls)
      expect(memberLookups).toHaveLength(2)
      expect((memberLookups[0].filters.find(f => f[1] === 'character_id')?.[2] as string[])).toHaveLength(100)
      expect((memberLookups[1].filters.find(f => f[1] === 'character_id')?.[2] as string[])).toHaveLength(50)
    })

    it('P-8: a non-officer gets 403 and no lookup or write is recorded', async () => {
      const { res, json, calls } = await run(POST, 'POST', baseFixture(), {
        action: 'upsert',
        records: [{ raid_event_id: EA, character_id: CA1 }],
      }, false)
      expect(res.status).toBe(403)
      expect(json.error).toBe('Insufficient permissions')
      expect(raidEventLookups(calls)).toHaveLength(0)
      expect(membershipLookups(calls)).toHaveLength(0)
      expect(writeCalls(calls)).toHaveLength(0)
    })

    it('P-8: a write error on the upsert returns 500 with the database message', async () => {
      const fixture = { ...baseFixture(), errors: { 'attendance_records:upsert': 'constraint violation' } }
      const { res, json } = await run(POST, 'POST', fixture, {
        action: 'upsert',
        records: [{ raid_event_id: EA, character_id: CA1 }],
      })
      expect(res.status).toBe(500)
      expect(json.error).toBe('constraint violation')
    })
  })

  describe('PATCH /api/attendance/bulk', () => {
    it('Q-1: updates signed_up for two fresh rows, scoped by raid_event_id and character_ids', async () => {
      const fixture = {
        ...baseFixture(),
        attendanceRows: [
          { id: RA1, raid_event_id: EA, character_id: CA1 },
          { id: RA2, raid_event_id: EA, character_id: CA2 },
        ],
      }
      const { res, json, calls } = await run(PATCH, 'PATCH', fixture, {
        updates: { signed_up: true },
        filters: { raid_event_id: EA, character_ids: [CA1, CA2] },
      })
      expect(res.status).toBe(200)
      expect(json).toEqual({ success: true })

      const updates = updateCalls(calls)
      expect(updates).toHaveLength(1)
      expect(updates[0].filters).toEqual(expect.arrayContaining([
        ['eq', 'raid_event_id', EA],
        ['in', 'character_id', [CA1, CA2]],
      ]))
      expect(updates[0].filters.some(f => f[1] === 'id')).toBe(false)
      const payload = updates[0].payload as Record<string, unknown>
      expect(payload).toEqual({ signed_up: true, modified_by: OFFICER_USER_ID, status: 'signed_up' })

      const touches = raidEventTouches(calls)
      expect(touches).toHaveLength(1)
      expect(touches[0].filters).toEqual(expect.arrayContaining([
        ['eq', 'id', EA],
        ['eq', 'guild_id', GUILD_A],
      ]))

      expect(recomputeBlpForEvents).toHaveBeenCalledWith(expect.anything(), GUILD_A, [EA])
    })

    it("Q-2/A1: filters by id keeps an attended row's status attended when only signed_up changes", async () => {
      const { res, json, calls } = await run(PATCH, 'PATCH', baseFixture(), {
        updates: { signed_up: true },
        filters: { id: RA1 },
      })
      expect(res.status).toBe(200)
      expect(json).toEqual({ success: true })

      const updates = updateCalls(calls)
      expect(updates).toHaveLength(1)
      expect(updates[0].filters).toEqual(expect.arrayContaining([
        ['in', 'id', [RA1]],
        ['in', 'raid_event_id', [EA]],
      ]))
      expect(updates[0].payload).toEqual({ signed_up: true, modified_by: OFFICER_USER_ID, status: 'attended' })
      expect(recomputeBlpForEvents).toHaveBeenCalledWith(expect.anything(), GUILD_A, [EA])
    })

    it('A1: clearing attended on an attended row moves status by the merged flags', async () => {
      const { res, calls } = await run(PATCH, 'PATCH', baseFixture(), {
        updates: { attended: false },
        filters: { id: RA1 },
      })
      expect(res.status).toBe(200)
      const updates = updateCalls(calls)
      expect(updates).toHaveLength(1)
      expect(updates[0].payload).toEqual({ attended: false, modified_by: OFFICER_USER_ID, status: 'absent' })
    })

    it.each([
      ['raid_event_id EB', { raid_event_id: EB }, 'invalid_raid_event_ids', [EB]],
      ['id RB1', { id: RB1 }, 'invalid_ids', [RB1]],
      ['ids [RA1, RB1]', { ids: [RA1, RB1] }, 'invalid_ids', [RB1]],
      ['id R_NULL_EVENT', { id: R_NULL_EVENT }, 'invalid_ids', [R_NULL_EVENT]],
    ])('Q-3: filters %s gives 400 C-1 and makes no update', async (_label, filters, key, expected) => {
      const { res, json, calls } = await run(PATCH, 'PATCH', baseFixture(), {
        updates: { signed_up: true },
        filters,
      })
      expect(res.status).toBe(400)
      expect(json.error).toBe("This attendance belongs to a raid that isn't in this guild. Refresh the page, then try again.")
      expect(json[key]).toEqual(expected)
      expect(updateCalls(calls)).toHaveLength(0)
    })

    it('Q-4: filters by an unknown id returns 200 with no update call', async () => {
      const { res, json, calls } = await run(PATCH, 'PATCH', baseFixture(), {
        updates: { signed_up: true },
        filters: { id: UNKNOWN_ROW_ID },
      })
      expect(res.status).toBe(200)
      expect(json).toEqual({ success: true })
      expect(updateCalls(calls)).toHaveLength(0)
    })

    it.each([
      ['empty filters', { signed_up: true }, {}],
      ['character_ids alone', { signed_up: true }, { character_ids: [CA1] }],
      ['an unknown filter key', { signed_up: true }, { raid_event_id: EA, bogus: true }],
      ['empty ids', { signed_up: true }, { ids: [] }],
      ['empty updates', {}, { raid_event_id: EA }],
      ['updates with raid_event_id', { raid_event_id: EB }, { raid_event_id: EA }],
      ['updates with character_id', { character_id: CB }, { raid_event_id: EA }],
      ['updates with an unknown key', { notes: 'x' }, { raid_event_id: EA }],
      ['a non-boolean flag', { signed_up: 'true' }, { raid_event_id: EA }],
    ])('Q-5 (C-3): %s gives 400 with no lookup and no write', async (_label, updates, filters) => {
      const { res, json, calls } = await run(PATCH, 'PATCH', baseFixture(), { updates, filters })
      expect(res.status).toBe(400)
      expect(json.error).toBe('This page is out of date. Refresh it, then try again.')
      expect(raidEventLookups(calls)).toHaveLength(0)
      expect(updateCalls(calls)).toHaveLength(0)
    })

    it.each([
      ['updates missing', { filters: { raid_event_id: EA } }],
      ['filters missing', { updates: { signed_up: true } }],
    ])('keeps the existing 400 text when %s', async (_label, body) => {
      const { res, json } = await run(PATCH, 'PATCH', baseFixture(), body)
      expect(res.status).toBe(400)
      expect(json.error).toBe('guild_id, updates, and filters are required')
    })

    it('Q-6: an attendance_records lookup error returns 500 with no update', async () => {
      const fixture = { ...baseFixture(), errors: { 'attendance_records:select': 'db down' } }
      const { res, json, calls } = await run(PATCH, 'PATCH', fixture, {
        updates: { signed_up: true },
        filters: { id: RA1 },
      })
      expect(res.status).toBe(500)
      expect(json.error).toBe('Internal server error')
      expect(updateCalls(calls)).toHaveLength(0)
    })

    it('Q-6: a raid_events lookup error returns 500 with no update', async () => {
      const fixture = { ...baseFixture(), errors: { 'raid_events:select': 'db down' } }
      const { res, json, calls } = await run(PATCH, 'PATCH', fixture, {
        updates: { signed_up: true },
        filters: { raid_event_id: EA },
      })
      expect(res.status).toBe(500)
      expect(json.error).toBe('Internal server error')
      expect(updateCalls(calls)).toHaveLength(0)
    })
  })

  describe('DELETE /api/attendance/bulk', () => {
    it('D-1: deletes by raid_event_id and character_id', async () => {
      const { res, json, calls } = await run(DELETE, 'DELETE', baseFixture(), {
        raid_event_id: EA,
        character_id: CA1,
      })
      expect(res.status).toBe(200)
      expect(json).toEqual({ success: true })
      const deletes = deleteCalls(calls)
      expect(deletes).toHaveLength(1)
      expect(deletes[0].filters).toEqual(expect.arrayContaining([
        ['eq', 'raid_event_id', EA],
        ['eq', 'character_id', CA1],
      ]))
      expect(recomputeBlpForEvents).toHaveBeenCalledWith(expect.anything(), GUILD_A, [EA])
    })

    it('D-1: deletes unlinked rows by character_id_is_null and character_names', async () => {
      const { res, calls } = await run(DELETE, 'DELETE', baseFixture(), {
        raid_event_id: EA,
        character_id_is_null: true,
        character_names: ['Pugname'],
      })
      expect(res.status).toBe(200)
      const deletes = deleteCalls(calls)
      expect(deletes).toHaveLength(1)
      expect(deletes[0].filters).toEqual(expect.arrayContaining([
        ['eq', 'raid_event_id', EA],
        ['is', 'character_id', null],
        ['in', 'character_name', ['Pugname']],
      ]))
    })

    it('D-2: deletes by ids, scoped to the resolved raid events', async () => {
      const { res, json, calls } = await run(DELETE, 'DELETE', baseFixture(), { ids: [RA1, RA2] })
      expect(res.status).toBe(200)
      expect(json).toEqual({ success: true })
      const deletes = deleteCalls(calls)
      expect(deletes).toHaveLength(1)
      expect(deletes[0].filters).toEqual(expect.arrayContaining([
        ['in', 'id', [RA1, RA2]],
        ['in', 'raid_event_id', [EA]],
      ]))
      expect(recomputeBlpForEvents).toHaveBeenCalledWith(expect.anything(), GUILD_A, [EA])
    })

    it('D-3: ids including another guild\'s row give 400 C-1 and make no delete', async () => {
      const { res, json, calls } = await run(DELETE, 'DELETE', baseFixture(), { ids: [RA1, RB1] })
      expect(res.status).toBe(400)
      expect(json.error).toBe("This attendance belongs to a raid that isn't in this guild. Refresh the page, then try again.")
      expect(json.invalid_ids).toEqual([RB1])
      expect(deleteCalls(calls)).toHaveLength(0)
    })

    it("D-3: another guild's raid_event_id gives 400 C-1 and makes no delete", async () => {
      const { res, json, calls } = await run(DELETE, 'DELETE', baseFixture(), { raid_event_id: EB })
      expect(res.status).toBe(400)
      expect(json.error).toBe("This attendance belongs to a raid that isn't in this guild. Refresh the page, then try again.")
      expect(json.invalid_raid_event_ids).toEqual([EB])
      expect(deleteCalls(calls)).toHaveLength(0)
    })

    it('D-3: an unknown id returns 200 with no delete, audit or recompute', async () => {
      const { res, json, calls } = await run(DELETE, 'DELETE', baseFixture(), { ids: [UNKNOWN_ROW_ID] })
      expect(res.status).toBe(200)
      expect(json).toEqual({ success: true })
      expect(deleteCalls(calls)).toHaveLength(0)
      expect(logAudit).not.toHaveBeenCalled()
      expect(recomputeBlpForEvents).not.toHaveBeenCalled()
    })

    it.each([
      ['empty ids', { ids: [] }],
      ['a non-UUID id', { ids: ['x'] }],
      ['an empty character name', { raid_event_id: EA, character_names: [''] }],
      ['an unknown key', { raid_event_id: EA, bogus: true }],
      ['a non-boolean character_id_is_null', { raid_event_id: EA, character_id_is_null: 'yes' }],
    ])('D-4 (C-3): %s gives 400 with no delete', async (_label, body) => {
      const { res, json, calls } = await run(DELETE, 'DELETE', baseFixture(), body)
      expect(res.status).toBe(400)
      expect(json.error).toBe('This page is out of date. Refresh it, then try again.')
      expect(deleteCalls(calls)).toHaveLength(0)
    })

    it('keeps the existing 400 text when neither ids nor raid_event_id is sent', async () => {
      const { res, json } = await run(DELETE, 'DELETE', baseFixture(), {})
      expect(res.status).toBe(400)
      expect(json.error).toBe('raid_event_id or ids required')
    })

    it('D-5: 150 ids of guild A rows make two row lookups and two deletes', async () => {
      const rowIds = Array.from({ length: 150 }, (_, i) => bulkRowId(i))
      const fixture = {
        ...baseFixture(),
        attendanceRows: [
          ...baseFixture().attendanceRows,
          ...rowIds.map(rid => ({ id: rid, raid_event_id: EA, character_id: CA1 })),
        ],
      }
      const { res, calls } = await run(DELETE, 'DELETE', fixture, { ids: rowIds })
      expect(res.status).toBe(200)
      const lookups = calls.filter(c => c.table === 'attendance_records' && c.op === 'select' && c.filters.some(f => f[0] === 'in' && f[1] === 'id'))
      expect(lookups).toHaveLength(2)
      const deletes = deleteCalls(calls)
      expect(deletes).toHaveLength(2)
      expect((deletes[0].filters.find(f => f[1] === 'id')?.[2] as string[])).toHaveLength(100)
      expect((deletes[1].filters.find(f => f[1] === 'id')?.[2] as string[])).toHaveLength(50)
    })

    it('D-5: a row lookup error returns 500 with no delete', async () => {
      const fixture = { ...baseFixture(), errors: { 'attendance_records:select': 'db down' } }
      const { res, json, calls } = await run(DELETE, 'DELETE', fixture, { ids: [RA1] })
      expect(res.status).toBe(500)
      expect(json.error).toBe('Internal server error')
      expect(deleteCalls(calls)).toHaveLength(0)
    })

    it('D-5: a delete error returns 500 with the database message', async () => {
      const fixture = { ...baseFixture(), errors: { 'attendance_records:delete': 'constraint violation' } }
      const { res, json } = await run(DELETE, 'DELETE', fixture, { raid_event_id: EA, character_id: CA1 })
      expect(res.status).toBe(500)
      expect(json.error).toBe('constraint violation')
    })
  })
})
