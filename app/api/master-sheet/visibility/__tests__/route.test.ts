// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'

// Deliberately NOT mocked: the real findInvalidCharacterIds must run against
// the fake client below, so this test proves the route calls the actual
// award-check definition rather than a reimplementation of it (GH #314).
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))

const GUILD = 'aaaaaaaa-0000-0000-0000-000000000001'
const USER_ID = 'aaaaaaaa-0000-0000-0000-000000000002'
const CALLER_CHAR = 'aaaaaaaa-0000-0000-0000-000000000003'
const ACTIVE_CHAR = 'aaaaaaaa-0000-0000-0000-000000000004'
const DEPARTED_CHAR = 'aaaaaaaa-0000-0000-0000-000000000005'
const ITEM = 'aaaaaaaa-0000-0000-0000-000000000006'
const SUB_ACTIVE = 'aaaaaaaa-0000-0000-0000-000000000007'
const SUB_DEPARTED = 'aaaaaaaa-0000-0000-0000-000000000008'

type Row = Record<string, unknown>
type FilterOp =
  | { type: 'eq'; col: string; val: unknown }
  | { type: 'in'; col: string; val: unknown[] }
  | { type: 'is'; col: string; val: null }

interface RecordedCall {
  table: string
  select: string
  filters: FilterOp[]
  range?: [number, number]
}

/**
 * Generic in-memory recording fake. Every from(table) call records its
 * select string and filters; eq/in/is filters apply generically against
 * whatever rows the fixture put in `tables[table]`. options.failCgmSelect
 * makes a character_guild_memberships call whose select string matches fail
 * with an error, simulating a lookup failure (D-03).
 */
function makeClient(tables: Record<string, Row[]>, options?: { failCgmSelect?: string }) {
  const calls: RecordedCall[] = []

  function applyFilters(rows: Row[], filters: FilterOp[]): Row[] {
    return rows.filter(row =>
      filters.every(f => {
        if (f.type === 'eq') return row[f.col] === f.val
        if (f.type === 'in') return (f.val as unknown[]).includes(row[f.col])
        if (f.type === 'is') return row[f.col] === null || row[f.col] === undefined
        return true
      }),
    )
  }

  function shouldFail(call: RecordedCall): boolean {
    return (
      call.table === 'character_guild_memberships' &&
      options?.failCgmSelect !== undefined &&
      call.select === options.failCgmSelect
    )
  }

  function from(table: string) {
    const call: RecordedCall = { table, select: '', filters: [] }
    calls.push(call)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select(cols: string) {
        call.select = cols
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
      is(col: string, val: null) {
        call.filters.push({ type: 'is', col, val })
        return builder
      },
      order() {
        return builder
      },
      range(start: number, end: number) {
        call.range = [start, end]
        return builder
      },
      single() {
        if (shouldFail(call)) {
          return Promise.resolve({ data: null, error: { message: 'boom' } })
        }
        const rows = applyFilters(tables[table] ?? [], call.filters)
        if (rows.length === 0) return Promise.resolve({ data: null, error: { message: 'not found' } })
        return Promise.resolve({ data: rows[0], error: null })
      },
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
        if (shouldFail(call)) {
          return Promise.resolve({ data: null, error: { message: 'boom' } }).then(resolve, reject)
        }
        let rows = applyFilters(tables[table] ?? [], call.filters)
        if (call.range) rows = rows.slice(call.range[0], call.range[1] + 1)
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
      },
    }
    return builder
  }

  return { client: { from }, calls }
}

function request(body: unknown) {
  return new Request('http://localhost/api/master-sheet/visibility', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

/**
 * Base fixture: GUILD's caller is its creator and owns CALLER_CHAR with an
 * active membership. ACTIVE_CHAR has an approved list ranking ITEM with an
 * active membership; DEPARTED_CHAR has an approved list ranking ITEM but its
 * membership is inactive (GH #314 — must be left out of every array).
 */
function baseTables(overrides: Partial<Record<string, Row[]>> = {}): Record<string, Row[]> {
  return {
    guilds: [{ id: GUILD, created_by: USER_ID }],
    characters: [
      { id: CALLER_CHAR, user_id: USER_ID, name: 'Caller', spec_id: null },
      { id: ACTIVE_CHAR, user_id: 'other-user-1', name: 'Active', spec_id: null },
      { id: DEPARTED_CHAR, user_id: 'other-user-2', name: 'Departed', spec_id: null },
    ],
    character_guild_memberships: [
      { character_id: CALLER_CHAR, guild_id: GUILD, role: 'Guild Master', membership_status: 'active', is_active: true },
      { character_id: ACTIVE_CHAR, guild_id: GUILD, role: 'Member', membership_status: 'active', is_active: true },
      { character_id: DEPARTED_CHAR, guild_id: GUILD, role: 'Member', membership_status: 'inactive', is_active: false },
    ],
    loot_submission_items: [
      { id: 'r1', rank: 1, slot: 1, submission_id: SUB_ACTIVE, loot_item_id: ITEM, removed_at: null },
      { id: 'r2', rank: 2, slot: 1, submission_id: SUB_DEPARTED, loot_item_id: ITEM, removed_at: null },
    ],
    loot_submissions: [
      { id: SUB_ACTIVE, status: 'approved', character_id: ACTIVE_CHAR, guild_id: GUILD },
      { id: SUB_DEPARTED, status: 'approved', character_id: DEPARTED_CHAR, guild_id: GUILD },
    ],
    ...overrides,
  }
}

describe('POST /api/master-sheet/visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as never)
  })

  it('GH #314: a departed raider with an approved list is absent from every array; an active raider is present', async () => {
    const { client } = makeClient(baseTables())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD, item_ids: [ITEM] }))
    const body = await res.json()

    expect(res.status).toBe(200)

    const submissionIds = body.submissions.map((s: { id: string }) => s.id)
    const characterIds = body.characters.map((c: { id: string }) => c.id)
    const membershipCharacterIds = body.memberships.map((m: { character_id: string }) => m.character_id)
    const rankingSubmissionIds = body.rankings.map((r: { submission_id: string }) => r.submission_id)

    expect(submissionIds).toContain(SUB_ACTIVE)
    expect(submissionIds).not.toContain(SUB_DEPARTED)

    expect(characterIds).toContain(ACTIVE_CHAR)
    expect(characterIds).not.toContain(DEPARTED_CHAR)

    expect(membershipCharacterIds).toContain(ACTIVE_CHAR)
    expect(membershipCharacterIds).not.toContain(DEPARTED_CHAR)

    expect(rankingSubmissionIds).toContain(SUB_ACTIVE)
    expect(rankingSubmissionIds).not.toContain(SUB_DEPARTED)
  })
})
