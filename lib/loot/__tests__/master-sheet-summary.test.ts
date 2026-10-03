import { describe, it, expect } from 'vitest'
import { loadMasterSheetSummary } from '@/lib/loot/master-sheet-summary'
import { findInvalidCharacterIds } from '@/lib/loot/guild-award-refs'

// Deliberately NOT mocked: findInvalidCharacterIds and splitCandidatesByMembership
// run for real against the fake client below, proving the Summary loader
// leaves out departed raiders using the actual award-check definition
// (GH #326), not a reimplementation of it.

const GUILD = 'aaaaaaaa-0000-0000-0000-000000000001'
const OTHER_GUILD = 'bbbbbbbb-0000-0000-0000-000000000001'
const TIER = 'aaaaaaaa-0000-0000-0000-000000000002'
const ITEM = 'aaaaaaaa-0000-0000-0000-000000000003'
const ACTIVE = 'aaaaaaaa-0000-0000-0000-000000000004'
const DEPARTED = 'aaaaaaaa-0000-0000-0000-000000000005'
const NULL_CHAR = 'aaaaaaaa-0000-0000-0000-000000000006'
const OTHERGUILD_CHAR = 'aaaaaaaa-0000-0000-0000-000000000007'
const TEAM_A = 'aaaaaaaa-0000-0000-0000-000000000008'
const TEAM_B = 'aaaaaaaa-0000-0000-0000-000000000009'
const TEAM_B_RAIDER = 'aaaaaaaa-0000-0000-0000-00000000000b'
const NO_TEAM_RAIDER = 'aaaaaaaa-0000-0000-0000-00000000000c'

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
 * Generic in-memory recording fake, in the style of the visibility route
 * test's makeClient. options.fail marks a { table, select } pair as a
 * lookup failure (data: null, error set), so a membership read error can be
 * simulated without a bespoke flag.
 */
function makeClient(tables: Record<string, Row[]>, options?: { fail?: Array<{ table: string; select: string }> }) {
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
    return !!options?.fail?.some(f => f.table === call.table && f.select === call.select)
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
        if (shouldFail(call)) {
          return Promise.resolve({ data: null, error: { message: 'boom' } })
        }
        const rows = applyFilters(tables[table] ?? [], call.filters).slice(start, end + 1)
        return Promise.resolve({ data: rows, error: null })
      },
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
        if (shouldFail(call)) {
          return Promise.resolve({ data: null, error: { message: 'boom' } }).then(resolve, reject)
        }
        const rows = applyFilters(tables[table] ?? [], call.filters)
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
      },
    }
    return builder
  }

  return { client: { from }, calls }
}

/**
 * Base fixture: one item (ITEM) in TIER. ACTIVE has an active membership and
 * an approved list ranking ITEM at rank 5. DEPARTED has an approved list
 * ranking ITEM at rank 10 but its membership is inactive (GH #326: must be
 * left out of players, total_lists and average_rank).
 */
function baseTables(overrides: Partial<Record<string, Row[]>> = {}): Record<string, Row[]> {
  return {
    loot_items: [
      { id: ITEM, name: 'Test Item', boss_name: 'Test Boss', item_slot: 'Chest', wowhead_id: 1001, classification: 'epic', raid_tier_id: TIER, is_available: true, is_loot_council: false },
    ],
    loot_submission_items: [
      { loot_item_id: ITEM, rank: 5, slot: 1, submission_id: 'sub-active', removed_at: null },
      { loot_item_id: ITEM, rank: 10, slot: 1, submission_id: 'sub-departed', removed_at: null },
    ],
    loot_submissions: [
      { id: 'sub-active', character_id: ACTIVE, status: 'approved' },
      { id: 'sub-departed', character_id: DEPARTED, status: 'approved' },
    ],
    character_guild_memberships: [
      { character_id: ACTIVE, guild_id: GUILD, is_active: true },
      { character_id: DEPARTED, guild_id: GUILD, is_active: false },
    ],
    characters: [
      { id: ACTIVE, name: 'Active', class: { name: 'Warrior', color_hex: '#C79C6E' } },
      { id: DEPARTED, name: 'Departed', class: { name: 'Mage', color_hex: '#69CCF0' } },
    ],
    raid_team_members: [],
    loot_history: [],
    ...overrides,
  }
}

describe('loadMasterSheetSummary', () => {
  it('S1: a departed lister is absent; the active lister is kept with total_lists 1 and average_rank equal to their rank', async () => {
    const { client } = makeClient(baseTables())
    const result = await loadMasterSheetSummary(client as never, { guildId: GUILD, activeTierIds: [TIER], activeTeamId: null })

    expect(result).toHaveLength(1)
    const item = result[0]
    expect(item.players.map(p => p.character_id)).toEqual([ACTIVE])
    expect(item.total_lists).toBe(1)
    expect(item.average_rank).toBe(5)
  })

  it('S2: a NULL-active lister, a lister active only in another guild, and a null character_id submission are all absent', async () => {
    const tables = baseTables({
      loot_submission_items: [
        { loot_item_id: ITEM, rank: 5, slot: 1, submission_id: 'sub-active', removed_at: null },
        { loot_item_id: ITEM, rank: 8, slot: 1, submission_id: 'sub-null', removed_at: null },
        { loot_item_id: ITEM, rank: 9, slot: 1, submission_id: 'sub-otherguild', removed_at: null },
        { loot_item_id: ITEM, rank: 11, slot: 1, submission_id: 'sub-nullchar', removed_at: null },
      ],
      loot_submissions: [
        { id: 'sub-active', character_id: ACTIVE, status: 'approved' },
        { id: 'sub-null', character_id: NULL_CHAR, status: 'approved' },
        { id: 'sub-otherguild', character_id: OTHERGUILD_CHAR, status: 'approved' },
        { id: 'sub-nullchar', character_id: null, status: 'approved' },
      ],
      character_guild_memberships: [
        { character_id: ACTIVE, guild_id: GUILD, is_active: true },
        { character_id: NULL_CHAR, guild_id: GUILD, is_active: null },
        { character_id: OTHERGUILD_CHAR, guild_id: OTHER_GUILD, is_active: true },
      ],
    })
    const { client } = makeClient(tables)
    const result = await loadMasterSheetSummary(client as never, { guildId: GUILD, activeTierIds: [TIER], activeTeamId: null })

    expect(result).toHaveLength(1)
    expect(result[0].players.map(p => p.character_id)).toEqual([ACTIVE])
  })

  it('S3: when every lister has left, the result is []', async () => {
    const tables = baseTables({
      loot_submission_items: [
        { loot_item_id: ITEM, rank: 10, slot: 1, submission_id: 'sub-departed', removed_at: null },
      ],
      loot_submissions: [
        { id: 'sub-departed', character_id: DEPARTED, status: 'approved' },
      ],
    })
    const { client } = makeClient(tables)
    const result = await loadMasterSheetSummary(client as never, { guildId: GUILD, activeTierIds: [TIER], activeTeamId: null })

    expect(result).toEqual([])
  })

  it('S4: draft, pending and rejected lists and removed rows never count', async () => {
    const tables = baseTables({
      loot_submission_items: [
        { loot_item_id: ITEM, rank: 5, slot: 1, submission_id: 'sub-active', removed_at: null },
        { loot_item_id: ITEM, rank: 1, slot: 1, submission_id: 'sub-draft', removed_at: null },
        { loot_item_id: ITEM, rank: 2, slot: 1, submission_id: 'sub-pending', removed_at: null },
        { loot_item_id: ITEM, rank: 3, slot: 1, submission_id: 'sub-rejected', removed_at: null },
        { loot_item_id: ITEM, rank: 4, slot: 1, submission_id: 'sub-removed', removed_at: '2026-01-01T00:00:00Z' },
      ],
      loot_submissions: [
        { id: 'sub-active', character_id: ACTIVE, status: 'approved' },
        { id: 'sub-draft', character_id: 'aaaaaaaa-0000-0000-0000-00000000000d', status: 'draft' },
        { id: 'sub-pending', character_id: 'aaaaaaaa-0000-0000-0000-00000000000e', status: 'pending' },
        { id: 'sub-rejected', character_id: 'aaaaaaaa-0000-0000-0000-00000000000f', status: 'rejected' },
        { id: 'sub-removed', character_id: ACTIVE, status: 'approved' },
      ],
    })
    const { client } = makeClient(tables)
    const result = await loadMasterSheetSummary(client as never, { guildId: GUILD, activeTierIds: [TIER], activeTeamId: null })

    expect(result).toHaveLength(1)
    expect(result[0].players.map(p => p.character_id)).toEqual([ACTIVE])
    expect(result[0].total_lists).toBe(1)
  })

  it('S5: the membership read carries every approved lister; the characters read only carries the active ones', async () => {
    const { client, calls } = makeClient(baseTables())
    await loadMasterSheetSummary(client as never, { guildId: GUILD, activeTierIds: [TIER], activeTeamId: null })

    const membershipCall = calls.find(c => c.table === 'character_guild_memberships' && c.select === 'character_id')
    expect(membershipCall).toBeDefined()
    expect(membershipCall!.filters).toContainEqual({ type: 'eq', col: 'guild_id', val: GUILD })
    expect(membershipCall!.filters).toContainEqual({ type: 'eq', col: 'is_active', val: true })
    const membershipIdFilter = membershipCall!.filters.find(f => f.type === 'in' && f.col === 'character_id') as
      | { type: 'in'; col: string; val: unknown[] }
      | undefined
    expect(membershipIdFilter!.val).toEqual(expect.arrayContaining([ACTIVE, DEPARTED]))

    const charactersCall = calls.find(c => c.table === 'characters')
    const charactersIdFilter = charactersCall!.filters.find(f => f.type === 'in' && f.col === 'id') as
      | { type: 'in'; col: string; val: unknown[] }
      | undefined
    expect(charactersIdFilter!.val).toEqual([ACTIVE])
  })

  it('S6: a loot_history award of the item to the departed raider still counts in already_awarded', async () => {
    const tables = baseTables({
      loot_history: [{ guild_id: GUILD, loot_item: { wowhead_id: 1001 } }],
    })
    const { client } = makeClient(tables)
    const result = await loadMasterSheetSummary(client as never, { guildId: GUILD, activeTierIds: [TIER], activeTeamId: null })

    expect(result).toHaveLength(1)
    expect(result[0].already_awarded).toBe(1)
    // Demand is still filtered: the departed raider's own rank never appears.
    expect(result[0].players.map(p => p.character_id)).toEqual([ACTIVE])
  })

  it('S7: with an active team, a raider on another team is absent and an unassigned raider is kept', async () => {
    const tables = baseTables({
      loot_submission_items: [
        { loot_item_id: ITEM, rank: 5, slot: 1, submission_id: 'sub-active', removed_at: null },
        { loot_item_id: ITEM, rank: 6, slot: 1, submission_id: 'sub-teamb', removed_at: null },
        { loot_item_id: ITEM, rank: 7, slot: 1, submission_id: 'sub-noteam', removed_at: null },
      ],
      loot_submissions: [
        { id: 'sub-active', character_id: ACTIVE, status: 'approved' },
        { id: 'sub-teamb', character_id: TEAM_B_RAIDER, status: 'approved' },
        { id: 'sub-noteam', character_id: NO_TEAM_RAIDER, status: 'approved' },
      ],
      character_guild_memberships: [
        { character_id: ACTIVE, guild_id: GUILD, is_active: true },
        { character_id: DEPARTED, guild_id: GUILD, is_active: false },
        { character_id: TEAM_B_RAIDER, guild_id: GUILD, is_active: true },
        { character_id: NO_TEAM_RAIDER, guild_id: GUILD, is_active: true },
      ],
      characters: [
        { id: ACTIVE, name: 'Active', class: { name: 'Warrior', color_hex: '#C79C6E' } },
        { id: DEPARTED, name: 'Departed', class: { name: 'Mage', color_hex: '#69CCF0' } },
        { id: TEAM_B_RAIDER, name: 'TeamBRaider', class: { name: 'Rogue', color_hex: '#FFF569' } },
        { id: NO_TEAM_RAIDER, name: 'NoTeamRaider', class: { name: 'Priest', color_hex: '#FFFFFF' } },
      ],
      raid_team_members: [
        { character_id: ACTIVE, raid_team_id: TEAM_A, guild_id: GUILD },
        { character_id: TEAM_B_RAIDER, raid_team_id: TEAM_B, guild_id: GUILD },
      ],
    })
    const { client } = makeClient(tables)
    const result = await loadMasterSheetSummary(client as never, { guildId: GUILD, activeTierIds: [TIER], activeTeamId: TEAM_A })

    expect(result).toHaveLength(1)
    const playerIds = result[0].players.map(p => p.character_id)
    expect(playerIds).toContain(ACTIVE)
    expect(playerIds).toContain(NO_TEAM_RAIDER)
    expect(playerIds).not.toContain(TEAM_B_RAIDER)
  })

  it('S8: the player character-id set equals the approved listers minus findInvalidCharacterIds on the same fixture', async () => {
    const allListerIds = [ACTIVE, DEPARTED]
    const tables = baseTables()

    const { client: awardCheckClient } = makeClient(tables)
    const invalidIds = await findInvalidCharacterIds(awardCheckClient as never, GUILD, allListerIds)
    const expectedKept = new Set(allListerIds.filter(id => !invalidIds.includes(id)))

    const { client: loaderClient } = makeClient(tables)
    const result = await loadMasterSheetSummary(loaderClient as never, { guildId: GUILD, activeTierIds: [TIER], activeTeamId: null })

    const actualKept = new Set(result[0].players.map(p => p.character_id))
    expect(actualKept).toEqual(expectedKept)
    expect(actualKept.size).toBeGreaterThan(0)
  })

  it('S9: a failing membership read makes loadMasterSheetSummary reject, with no characters read after it', async () => {
    const { client, calls } = makeClient(baseTables(), { fail: [{ table: 'character_guild_memberships', select: 'character_id' }] })

    await expect(
      loadMasterSheetSummary(client as never, { guildId: GUILD, activeTierIds: [TIER], activeTeamId: null }),
    ).rejects.toThrow()

    expect(calls.some(c => c.table === 'characters')).toBe(false)
  })
})
