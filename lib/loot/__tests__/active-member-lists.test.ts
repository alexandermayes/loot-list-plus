// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { keepListsOfActiveMembers } from '../active-member-lists'

type MembershipRow = { character_id: string; guild_id: string; is_active: boolean | null }
type Call = { table: string; filters: Array<[string, unknown]> }

interface Fixture {
  memberships: MembershipRow[]
  errorOnGuild?: string
}

/**
 * Recording fake client in the style of guild-award-refs.test.ts, scoped to
 * character_guild_memberships only (the only table keepListsOfActiveMembers
 * reads through the real findInvalidCharacterIds).
 */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const call: Call = { table, filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        then: (resolve: (v: unknown) => unknown) => {
          const guildIdFilter = call.filters.find(([col]) => col === 'guild_id')?.[1]
          if (fixture.errorOnGuild !== undefined && guildIdFilter === fixture.errorOnGuild) {
            return Promise.resolve({ data: null, error: { message: 'boom' } }).then(resolve)
          }
          const isActiveFilter = call.filters.find(([col]) => col === 'is_active')?.[1]
          const charIdFilter = (call.filters.find(([col]) => col === 'character_id')?.[1] ?? []) as string[]
          const rows = fixture.memberships.filter(m =>
            m.guild_id === guildIdFilter && m.is_active === isActiveFilter && charIdFilter.includes(m.character_id)
          )
          return Promise.resolve({ data: rows, error: null }).then(resolve)
        },
      }
      return builder
    },
  }
  return { client, calls }
}

const GUILD_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const GUILD_B = 'aaaaaaaa-0000-0000-0000-000000000002'
const CHAR_ACTIVE = 'aaaaaaaa-0000-0000-0000-000000000003'
const CHAR_INACTIVE_FALSE = 'aaaaaaaa-0000-0000-0000-000000000004'
const CHAR_INACTIVE_NULL = 'aaaaaaaa-0000-0000-0000-000000000005'
const CHAR_NO_ROW = 'aaaaaaaa-0000-0000-0000-000000000006'
const CHAR_MOVER = 'aaaaaaaa-0000-0000-0000-000000000007'

function list(overrides: Partial<{ id: string; guild_id: string | null; character_id: string | null }> = {}) {
  return { id: 'list-id', guild_id: GUILD_A, character_id: CHAR_ACTIVE, ...overrides }
}

describe('keepListsOfActiveMembers', () => {
  it('H1: keeps an active member, drops is_active false, is_active null and no-row characters', async () => {
    const { client } = makeClient({
      memberships: [
        { character_id: CHAR_ACTIVE, guild_id: GUILD_A, is_active: true },
        { character_id: CHAR_INACTIVE_FALSE, guild_id: GUILD_A, is_active: false },
        { character_id: CHAR_INACTIVE_NULL, guild_id: GUILD_A, is_active: null },
      ],
    })
    const lists = [
      list({ id: 'kept', character_id: CHAR_ACTIVE }),
      list({ id: 'dropped-false', character_id: CHAR_INACTIVE_FALSE }),
      list({ id: 'dropped-null', character_id: CHAR_INACTIVE_NULL }),
      list({ id: 'dropped-no-row', character_id: CHAR_NO_ROW }),
    ]
    const result = await keepListsOfActiveMembers(client as never, lists)
    expect(result.map(r => r.id)).toEqual(['kept'])
  })

  it('H1: drops a character active only in another guild', async () => {
    const { client } = makeClient({
      memberships: [{ character_id: CHAR_MOVER, guild_id: GUILD_B, is_active: true }],
    })
    const lists = [list({ id: 'a-list', guild_id: GUILD_A, character_id: CHAR_MOVER })]
    const result = await keepListsOfActiveMembers(client as never, lists)
    expect(result).toEqual([])
  })

  it('H2 (D-01): the same character departed from guild A keeps its guild B list', async () => {
    const { client } = makeClient({
      memberships: [{ character_id: CHAR_MOVER, guild_id: GUILD_B, is_active: true }],
    })
    const lists = [
      list({ id: 'a-list', guild_id: GUILD_A, character_id: CHAR_MOVER }),
      list({ id: 'b-list', guild_id: GUILD_B, character_id: CHAR_MOVER }),
    ]
    const result = await keepListsOfActiveMembers(client as never, lists)
    expect(result.map(r => r.id)).toEqual(['b-list'])
  })

  it('H3: one call per distinct guild in first-seen order, with eq guild_id, eq is_active true and in character_id', async () => {
    const { client, calls } = makeClient({
      memberships: [
        { character_id: CHAR_ACTIVE, guild_id: GUILD_A, is_active: true },
        { character_id: CHAR_MOVER, guild_id: GUILD_B, is_active: true },
      ],
    })
    const lists = [
      list({ id: 'b-first', guild_id: GUILD_B, character_id: CHAR_MOVER }),
      list({ id: 'a-second', guild_id: GUILD_A, character_id: CHAR_ACTIVE }),
    ]
    await keepListsOfActiveMembers(client as never, lists)
    const cgmCalls = calls.filter(c => c.table === 'character_guild_memberships')
    expect(cgmCalls).toHaveLength(2)
    expect(cgmCalls[0].filters.find(([col]) => col === 'guild_id')?.[1]).toBe(GUILD_B)
    expect(cgmCalls[1].filters.find(([col]) => col === 'guild_id')?.[1]).toBe(GUILD_A)
    for (const call of cgmCalls) {
      expect(call.filters.find(([col]) => col === 'is_active')?.[1]).toBe(true)
    }
    expect(cgmCalls[0].filters.find(([col]) => col === 'character_id')?.[1]).toEqual([CHAR_MOVER])
    expect(cgmCalls[1].filters.find(([col]) => col === 'character_id')?.[1]).toEqual([CHAR_ACTIVE])
  })

  it('H3: empty input returns [] with no call', async () => {
    const { client, calls } = makeClient({ memberships: [] })
    const result = await keepListsOfActiveMembers(client as never, [])
    expect(result).toEqual([])
    expect(calls).toHaveLength(0)
  })

  it('H4: drops lists with a null or empty guild_id or character_id, and those values never appear in a recorded filter', async () => {
    const { client, calls } = makeClient({
      memberships: [{ character_id: CHAR_ACTIVE, guild_id: GUILD_A, is_active: true }],
    })
    const lists = [
      list({ id: 'kept', guild_id: GUILD_A, character_id: CHAR_ACTIVE }),
      list({ id: 'null-guild', guild_id: null, character_id: CHAR_ACTIVE }),
      list({ id: 'empty-guild', guild_id: '', character_id: CHAR_ACTIVE }),
      list({ id: 'null-char', guild_id: GUILD_A, character_id: null }),
      list({ id: 'empty-char', guild_id: GUILD_A, character_id: '' }),
    ]
    const result = await keepListsOfActiveMembers(client as never, lists)
    expect(result.map(r => r.id)).toEqual(['kept'])
    const cgmCalls = calls.filter(c => c.table === 'character_guild_memberships')
    for (const call of cgmCalls) {
      expect(call.filters.find(([col]) => col === 'guild_id')?.[1]).not.toBeNull()
      expect(call.filters.find(([col]) => col === 'guild_id')?.[1]).not.toBe('')
      const charIds = call.filters.find(([col]) => col === 'character_id')?.[1] as unknown[]
      expect(charIds).not.toContain(null)
      expect(charIds).not.toContain('')
    }
  })

  it('H5: keeps input order, returns the same object references and does not mutate the input array', async () => {
    const { client } = makeClient({
      memberships: [
        { character_id: CHAR_ACTIVE, guild_id: GUILD_A, is_active: true },
        { character_id: CHAR_MOVER, guild_id: GUILD_B, is_active: true },
      ],
    })
    const listA = list({ id: 'a', guild_id: GUILD_A, character_id: CHAR_ACTIVE })
    const listB = list({ id: 'b', guild_id: GUILD_B, character_id: CHAR_MOVER })
    const lists = [listA, listB]
    const before = [...lists]
    const result = await keepListsOfActiveMembers(client as never, lists)
    expect(result).toEqual([listA, listB])
    expect(result[0]).toBe(listA)
    expect(result[1]).toBe(listB)
    expect(lists).toEqual(before)
    expect(lists).toHaveLength(2)
  })

  it('H6: a failing membership read makes the helper reject', async () => {
    const { client } = makeClient({
      memberships: [],
      errorOnGuild: GUILD_A,
    })
    const lists = [list({ guild_id: GUILD_A, character_id: CHAR_ACTIVE })]
    await expect(keepListsOfActiveMembers(client as never, lists)).rejects.toThrow()
  })
})
