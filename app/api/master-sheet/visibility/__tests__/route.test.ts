// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { findInvalidCharacterIds } from '@/lib/loot/guild-award-refs'

// Deliberately NOT mocked: the real findInvalidCharacterIds must run against
// the fake client below, so this test proves the route calls the actual
// award-check definition rather than a reimplementation of it (GH #314).
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))

const GUILD = 'aaaaaaaa-0000-0000-0000-000000000001'
const OTHER_GUILD = 'bbbbbbbb-0000-0000-0000-000000000001'
const USER_ID = 'aaaaaaaa-0000-0000-0000-000000000002'
const CALLER_CHAR = 'aaaaaaaa-0000-0000-0000-000000000003'
const ACTIVE_CHAR = 'aaaaaaaa-0000-0000-0000-000000000004'
const DEPARTED_CHAR = 'aaaaaaaa-0000-0000-0000-000000000005'
const ITEM = 'aaaaaaaa-0000-0000-0000-000000000006'
const SUB_ACTIVE = 'aaaaaaaa-0000-0000-0000-000000000007'
const SUB_DEPARTED = 'aaaaaaaa-0000-0000-0000-000000000008'
const NULL_CHAR = 'aaaaaaaa-0000-0000-0000-000000000009'
const SUB_NULL = 'aaaaaaaa-0000-0000-0000-00000000000a'
const OTHERGUILD_CHAR = 'aaaaaaaa-0000-0000-0000-00000000000b'
const SUB_OTHERGUILD_CHAR = 'aaaaaaaa-0000-0000-0000-00000000000c'
const FOREIGN_SUB = 'aaaaaaaa-0000-0000-0000-00000000000d'
const FOREIGN_CHAR = 'aaaaaaaa-0000-0000-0000-00000000000e'
const OTHER_USER = 'aaaaaaaa-0000-0000-0000-00000000000f'
const EXP_ID = 'aaaaaaaa-0000-0000-0000-000000000010'
const TIER_ID = 'aaaaaaaa-0000-0000-0000-000000000011'
const NO_ROW_CHAR = 'aaaaaaaa-0000-0000-0000-000000000012'
const SUB_NO_ROW = 'aaaaaaaa-0000-0000-0000-000000000013'

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
 * membership is inactive (GH #314: must be left out of every array).
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

  it('D-02: a character whose CGM is_active is NULL is left out, same as the award check', async () => {
    const tables = baseTables({
      characters: [
        { id: CALLER_CHAR, user_id: USER_ID, name: 'Caller', spec_id: null },
        { id: ACTIVE_CHAR, user_id: 'other-user-1', name: 'Active', spec_id: null },
        { id: NULL_CHAR, user_id: 'other-user-3', name: 'NullActive', spec_id: null },
      ],
      character_guild_memberships: [
        { character_id: CALLER_CHAR, guild_id: GUILD, role: 'Guild Master', membership_status: 'active', is_active: true },
        { character_id: ACTIVE_CHAR, guild_id: GUILD, role: 'Member', membership_status: 'active', is_active: true },
        { character_id: NULL_CHAR, guild_id: GUILD, role: 'Member', membership_status: 'inactive', is_active: null },
      ],
      loot_submission_items: [
        { id: 'r1', rank: 1, slot: 1, submission_id: SUB_ACTIVE, loot_item_id: ITEM, removed_at: null },
        { id: 'r2', rank: 2, slot: 1, submission_id: SUB_NULL, loot_item_id: ITEM, removed_at: null },
      ],
      loot_submissions: [
        { id: SUB_ACTIVE, status: 'approved', character_id: ACTIVE_CHAR, guild_id: GUILD },
        { id: SUB_NULL, status: 'approved', character_id: NULL_CHAR, guild_id: GUILD },
      ],
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD, item_ids: [ITEM] }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.characters.map((c: { id: string }) => c.id)).toEqual([ACTIVE_CHAR])
  })

  it('leaves out a character with no CGM row in this guild even when it has an active row in ANOTHER guild', async () => {
    const tables = baseTables({
      characters: [
        { id: CALLER_CHAR, user_id: USER_ID, name: 'Caller', spec_id: null },
        { id: ACTIVE_CHAR, user_id: 'other-user-1', name: 'Active', spec_id: null },
        { id: OTHERGUILD_CHAR, user_id: 'other-user-4', name: 'Elsewhere', spec_id: null },
      ],
      character_guild_memberships: [
        { character_id: CALLER_CHAR, guild_id: GUILD, role: 'Guild Master', membership_status: 'active', is_active: true },
        { character_id: ACTIVE_CHAR, guild_id: GUILD, role: 'Member', membership_status: 'active', is_active: true },
        { character_id: OTHERGUILD_CHAR, guild_id: OTHER_GUILD, role: 'Member', membership_status: 'active', is_active: true },
      ],
      loot_submission_items: [
        { id: 'r1', rank: 1, slot: 1, submission_id: SUB_ACTIVE, loot_item_id: ITEM, removed_at: null },
        { id: 'r2', rank: 2, slot: 1, submission_id: SUB_OTHERGUILD_CHAR, loot_item_id: ITEM, removed_at: null },
      ],
      loot_submissions: [
        { id: SUB_ACTIVE, status: 'approved', character_id: ACTIVE_CHAR, guild_id: GUILD },
        { id: SUB_OTHERGUILD_CHAR, status: 'approved', character_id: OTHERGUILD_CHAR, guild_id: GUILD },
      ],
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD, item_ids: [ITEM] }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.characters.map((c: { id: string }) => c.id)).toEqual([ACTIVE_CHAR])
  })

  it('returns 200 with four empty arrays when every candidate is departed', async () => {
    const tables = baseTables({
      characters: [
        { id: CALLER_CHAR, user_id: USER_ID, name: 'Caller', spec_id: null },
        { id: DEPARTED_CHAR, user_id: 'other-user-2', name: 'Departed', spec_id: null },
      ],
      loot_submission_items: [
        { id: 'r2', rank: 1, slot: 1, submission_id: SUB_DEPARTED, loot_item_id: ITEM, removed_at: null },
      ],
      loot_submissions: [
        { id: SUB_DEPARTED, status: 'approved', character_id: DEPARTED_CHAR, guild_id: GUILD },
      ],
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD, item_ids: [ITEM] }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ rankings: [], submissions: [], characters: [], memberships: [] })
  })

  it('an approved submission in another guild never appears (existing guard still holds)', async () => {
    const tables = baseTables({
      loot_submission_items: [
        { id: 'r1', rank: 1, slot: 1, submission_id: SUB_ACTIVE, loot_item_id: ITEM, removed_at: null },
        { id: 'r3', rank: 3, slot: 1, submission_id: FOREIGN_SUB, loot_item_id: ITEM, removed_at: null },
      ],
      loot_submissions: [
        { id: SUB_ACTIVE, status: 'approved', character_id: ACTIVE_CHAR, guild_id: GUILD },
        { id: FOREIGN_SUB, status: 'approved', character_id: FOREIGN_CHAR, guild_id: OTHER_GUILD },
      ],
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD, item_ids: [ITEM] }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.submissions.map((s: { id: string }) => s.id)).toEqual([SUB_ACTIVE])
    expect(body.characters.map((c: { id: string }) => c.id)).not.toContain(FOREIGN_CHAR)
  })

  it('D-03: a membership lookup error returns 500 and never falls back to unfiltered or empty data', async () => {
    const { client } = makeClient(baseTables(), { failCgmSelect: 'character_id' })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD, item_ids: [ITEM] }))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body).toEqual({ error: 'Internal server error' })
  })

  it('records the membership lookup with eq guild_id and eq is_active true, and sends only kept ids downstream', async () => {
    const { client, calls } = makeClient(baseTables())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    await POST(request({ guild_id: GUILD, item_ids: [ITEM] }))

    const lookupCall = calls.find(c => c.table === 'character_guild_memberships' && c.select === 'character_id')
    expect(lookupCall).toBeDefined()
    expect(lookupCall!.filters).toContainEqual({ type: 'eq', col: 'guild_id', val: GUILD })
    expect(lookupCall!.filters).toContainEqual({ type: 'eq', col: 'is_active', val: true })

    const finalCharactersCall = calls.find(
      c => c.table === 'characters' && c.filters.some(f => f.type === 'in' && f.col === 'id'),
    )
    const finalCharactersIdFilter = finalCharactersCall!.filters.find(f => f.type === 'in' && f.col === 'id') as
      | { type: 'in'; col: string; val: unknown[] }
      | undefined
    expect(finalCharactersIdFilter!.val).toEqual([ACTIVE_CHAR])

    const finalMembershipsCall = calls.find(
      c => c.table === 'character_guild_memberships' && !c.filters.some(f => f.col === 'is_active'),
    )
    const finalMembershipsIdFilter = finalMembershipsCall!.filters.find(f => f.type === 'in' && f.col === 'character_id') as
      | { type: 'in'; col: string; val: unknown[] }
      | undefined
    expect(finalMembershipsIdFilter!.val).toEqual([ACTIVE_CHAR])
  })

  it('raider path: a non-bypass caller with an approved list for the phase also gets the departed raider left out', async () => {
    const tables = baseTables({
      guilds: [{ id: GUILD, created_by: OTHER_USER }],
      characters: [
        { id: CALLER_CHAR, user_id: USER_ID, name: 'Caller', spec_id: null },
        { id: ACTIVE_CHAR, user_id: 'other-user-1', name: 'Active', spec_id: null },
        { id: DEPARTED_CHAR, user_id: 'other-user-2', name: 'Departed', spec_id: null },
      ],
      character_guild_memberships: [
        { character_id: CALLER_CHAR, guild_id: GUILD, role: 'Member', membership_status: 'active', is_active: true },
        { character_id: ACTIVE_CHAR, guild_id: GUILD, role: 'Member', membership_status: 'active', is_active: true },
        { character_id: DEPARTED_CHAR, guild_id: GUILD, role: 'Member', membership_status: 'inactive', is_active: false },
      ],
      guild_roles: [{ guild_id: GUILD, name: 'Member', position: 0, permissions: [] }],
      loot_items: [{ id: ITEM, raid_tier_id: TIER_ID }],
      raid_tiers: [{ id: TIER_ID, phase: 1, master_sheet_visible: true, expansion_id: EXP_ID }],
      expansions: [{ id: EXP_ID, phase_groups: null }],
      loot_submission_items: [
        { id: 'r1', rank: 1, slot: 1, submission_id: SUB_ACTIVE, loot_item_id: ITEM, removed_at: null },
        { id: 'r2', rank: 2, slot: 1, submission_id: SUB_DEPARTED, loot_item_id: ITEM, removed_at: null },
      ],
      loot_submissions: [
        { id: SUB_ACTIVE, status: 'approved', character_id: ACTIVE_CHAR, guild_id: GUILD, phase: 1, expansion_id: EXP_ID },
        { id: SUB_DEPARTED, status: 'approved', character_id: DEPARTED_CHAR, guild_id: GUILD, phase: 1, expansion_id: EXP_ID },
        // The caller's own approved list is what unlocks phase 1 (GH #202).
        { id: 'sub-caller', status: 'approved', character_id: CALLER_CHAR, guild_id: GUILD, phase: 1, expansion_id: EXP_ID },
      ],
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD, item_ids: [ITEM] }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.characters.map((c: { id: string }) => c.id)).toEqual([ACTIVE_CHAR])
  })

  it('D-02 contract: the sheet\'s character set equals the complement of findInvalidCharacterIds run on the same fixture', async () => {
    const allCharacterIds = [ACTIVE_CHAR, DEPARTED_CHAR, NULL_CHAR, OTHERGUILD_CHAR, NO_ROW_CHAR]
    const tables = baseTables({
      characters: [
        { id: CALLER_CHAR, user_id: USER_ID, name: 'Caller', spec_id: null },
        { id: ACTIVE_CHAR, user_id: 'other-user-1', name: 'Active', spec_id: null },
        { id: DEPARTED_CHAR, user_id: 'other-user-2', name: 'Departed', spec_id: null },
        { id: NULL_CHAR, user_id: 'other-user-3', name: 'NullActive', spec_id: null },
        { id: OTHERGUILD_CHAR, user_id: 'other-user-4', name: 'Elsewhere', spec_id: null },
        { id: NO_ROW_CHAR, user_id: 'other-user-5', name: 'NoRow', spec_id: null },
      ],
      character_guild_memberships: [
        { character_id: CALLER_CHAR, guild_id: GUILD, role: 'Guild Master', membership_status: 'active', is_active: true },
        { character_id: ACTIVE_CHAR, guild_id: GUILD, role: 'Member', membership_status: 'active', is_active: true },
        { character_id: DEPARTED_CHAR, guild_id: GUILD, role: 'Member', membership_status: 'inactive', is_active: false },
        { character_id: NULL_CHAR, guild_id: GUILD, role: 'Member', membership_status: 'inactive', is_active: null },
        { character_id: OTHERGUILD_CHAR, guild_id: OTHER_GUILD, role: 'Member', membership_status: 'active', is_active: true },
        // NO_ROW_CHAR intentionally has no character_guild_memberships row at all.
      ],
      loot_submission_items: [
        { id: 'r1', rank: 1, slot: 1, submission_id: SUB_ACTIVE, loot_item_id: ITEM, removed_at: null },
        { id: 'r2', rank: 2, slot: 1, submission_id: SUB_DEPARTED, loot_item_id: ITEM, removed_at: null },
        { id: 'r3', rank: 3, slot: 1, submission_id: SUB_NULL, loot_item_id: ITEM, removed_at: null },
        { id: 'r4', rank: 4, slot: 1, submission_id: SUB_OTHERGUILD_CHAR, loot_item_id: ITEM, removed_at: null },
        { id: 'r5', rank: 5, slot: 1, submission_id: SUB_NO_ROW, loot_item_id: ITEM, removed_at: null },
      ],
      loot_submissions: [
        { id: SUB_ACTIVE, status: 'approved', character_id: ACTIVE_CHAR, guild_id: GUILD },
        { id: SUB_DEPARTED, status: 'approved', character_id: DEPARTED_CHAR, guild_id: GUILD },
        { id: SUB_NULL, status: 'approved', character_id: NULL_CHAR, guild_id: GUILD },
        { id: SUB_OTHERGUILD_CHAR, status: 'approved', character_id: OTHERGUILD_CHAR, guild_id: GUILD },
        { id: SUB_NO_ROW, status: 'approved', character_id: NO_ROW_CHAR, guild_id: GUILD },
      ],
    })

    // Same fixture data, two independent fake client instances so call logs
    // don't mix between the direct award-check call and the route call.
    const { client: awardCheckClient } = makeClient(tables)
    const invalidIds = await findInvalidCharacterIds(awardCheckClient as never, GUILD, allCharacterIds)
    const expectedKept = new Set(allCharacterIds.filter(id => !invalidIds.includes(id)))

    const { client: routeClient } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(routeClient as never)
    const res = await POST(request({ guild_id: GUILD, item_ids: [ITEM] }))
    const body = await res.json()

    expect(res.status).toBe(200)
    const actualKept = new Set(body.characters.map((c: { id: string }) => c.id))
    expect(actualKept).toEqual(expectedKept)
    expect(actualKept.size).toBeGreaterThan(0)
  })
})

describe("GH #326: the phase gate counts only the caller's active characters", () => {
  const CALLER_ALT = 'aaaaaaaa-0000-0000-0000-000000000014'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as never)
  })

  /**
   * Raider path (not the guild creator). CALLER_CHAR has NO approved list of
   * its own; only its alt, CALLER_ALT, has an approved phase 1 list in GUILD.
   * CALLER_ALT's membership row is varied per test. ACTIVE_CHAR has an
   * approved phase 1 list ranking ITEM, so its ranking is what the gate
   * would reveal once a phase is unlocked.
   */
  function altTables(
    callerAltMembership: Row,
    overrides: Partial<Record<string, Row[]>> = {},
  ): Record<string, Row[]> {
    return baseTables({
      guilds: [{ id: GUILD, created_by: OTHER_USER }],
      characters: [
        { id: CALLER_CHAR, user_id: USER_ID, name: 'Caller', spec_id: null },
        { id: CALLER_ALT, user_id: USER_ID, name: 'CallerAlt', spec_id: null },
        { id: ACTIVE_CHAR, user_id: 'other-user-1', name: 'Active', spec_id: null },
      ],
      character_guild_memberships: [
        { character_id: CALLER_CHAR, guild_id: GUILD, role: 'Member', membership_status: 'active', is_active: true },
        callerAltMembership,
        { character_id: ACTIVE_CHAR, guild_id: GUILD, role: 'Member', membership_status: 'active', is_active: true },
      ],
      guild_roles: [{ guild_id: GUILD, name: 'Member', position: 0, permissions: [] }],
      loot_items: [{ id: ITEM, raid_tier_id: TIER_ID }],
      raid_tiers: [{ id: TIER_ID, phase: 1, master_sheet_visible: true, expansion_id: EXP_ID }],
      expansions: [{ id: EXP_ID, phase_groups: null }],
      loot_submission_items: [
        { id: 'r1', rank: 1, slot: 1, submission_id: SUB_ACTIVE, loot_item_id: ITEM, removed_at: null },
      ],
      loot_submissions: [
        { id: SUB_ACTIVE, status: 'approved', character_id: ACTIVE_CHAR, guild_id: GUILD, phase: 1, expansion_id: EXP_ID },
        { id: 'sub-alt', status: 'approved', character_id: CALLER_ALT, guild_id: GUILD, phase: 1, expansion_id: EXP_ID },
      ],
      ...overrides,
    })
  }

  it('G1 (tracer): a departed alt (is_active false) does not unlock the phase; the answer is four empty arrays', async () => {
    const tables = altTables({
      character_id: CALLER_ALT,
      guild_id: GUILD,
      role: 'Member',
      membership_status: 'inactive',
      is_active: false,
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD, item_ids: [ITEM] }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ rankings: [], submissions: [], characters: [], memberships: [] })
  })

  it('G2: an active alt (is_active true) still unlocks the phase', async () => {
    const tables = altTables({
      character_id: CALLER_ALT,
      guild_id: GUILD,
      role: 'Member',
      membership_status: 'active',
      is_active: true,
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD, item_ids: [ITEM] }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.characters.map((c: { id: string }) => c.id)).toEqual([ACTIVE_CHAR])
  })

  it('G3: an alt whose membership is_active is NULL does not unlock the phase', async () => {
    const tables = altTables({
      character_id: CALLER_ALT,
      guild_id: GUILD,
      role: 'Member',
      membership_status: 'inactive',
      is_active: null,
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD, item_ids: [ITEM] }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ rankings: [], submissions: [], characters: [], memberships: [] })
  })

  it('G4: an alt with no membership row in this guild, only an active row in ANOTHER guild, does not unlock the phase', async () => {
    const tables = altTables({
      character_id: CALLER_ALT,
      guild_id: OTHER_GUILD,
      role: 'Member',
      membership_status: 'active',
      is_active: true,
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD, item_ids: [ITEM] }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ rankings: [], submissions: [], characters: [], memberships: [] })
  })

  it('G5: the membership lookup runs with both caller characters before the approved-list read, which then only carries the active one', async () => {
    const tables = altTables({
      character_id: CALLER_ALT,
      guild_id: GUILD,
      role: 'Member',
      membership_status: 'inactive',
      is_active: false,
    })
    const { client, calls } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    await POST(request({ guild_id: GUILD, item_ids: [ITEM] }))

    const lookupIndex = calls.findIndex(
      c => c.table === 'character_guild_memberships' && c.select === 'character_id',
    )
    expect(lookupIndex).toBeGreaterThanOrEqual(0)
    const lookupCall = calls[lookupIndex]
    expect(lookupCall.filters).toContainEqual({ type: 'eq', col: 'guild_id', val: GUILD })
    expect(lookupCall.filters).toContainEqual({ type: 'eq', col: 'is_active', val: true })
    const lookupIdFilter = lookupCall.filters.find(f => f.type === 'in' && f.col === 'character_id') as
      | { type: 'in'; col: string; val: unknown[] }
      | undefined
    expect(lookupIdFilter!.val).toEqual(expect.arrayContaining([CALLER_CHAR, CALLER_ALT]))

    const approvedListIndex = calls.findIndex(
      c => c.table === 'loot_submissions' && c.select === 'phase, expansion_id',
    )
    expect(approvedListIndex).toBeGreaterThan(lookupIndex)
    const approvedListCall = calls[approvedListIndex]
    const approvedListIdFilter = approvedListCall.filters.find(f => f.type === 'in' && f.col === 'character_id') as
      | { type: 'in'; col: string; val: unknown[] }
      | undefined
    expect(approvedListIdFilter!.val).toEqual([CALLER_CHAR])
  })

  it('G6: a membership lookup error answers 500 rather than unlocking or denying silently', async () => {
    const tables = altTables({
      character_id: CALLER_ALT,
      guild_id: GUILD,
      role: 'Member',
      membership_status: 'inactive',
      is_active: false,
    })
    const { client } = makeClient(tables, { failCgmSelect: 'character_id' })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(request({ guild_id: GUILD, item_ids: [ITEM] }))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body).toEqual({ error: 'Internal server error' })
    consoleErrorSpy.mockRestore()
  })

  it('G7: the creator path (an existing bypass) never calls the per-phase approved-list read', async () => {
    const { client, calls } = makeClient(baseTables())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD, item_ids: [ITEM] }))
    expect(res.status).toBe(200)

    const approvedListCall = calls.find(
      c => c.table === 'loot_submissions' && c.select === 'phase, expansion_id',
    )
    expect(approvedListCall).toBeUndefined()
  })
})
