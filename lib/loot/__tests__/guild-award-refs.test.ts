// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  normalizeRefId,
  findInvalidRaidEventIds,
  findInvalidCharacterIds,
  formatInvalidAwardRefsError,
} from '../guild-award-refs'

type RaidEventRow = { id: string; guild_id: string }
type MembershipRow = { character_id: string; guild_id: string; is_active: boolean | null }
type Call = { table: string; filters: Array<[string, unknown]> }

interface Fixture {
  raidEvents: RaidEventRow[]
  memberships: MembershipRow[]
  errorOn?: 'raid_events' | 'character_guild_memberships'
}

/**
 * Recording fake client in the style of guild-scoped-lookup.test.ts. Supports
 * raid_events filtered by guild_id eq + id in, and
 * character_guild_memberships filtered by guild_id eq + is_active eq +
 * character_id in, plus an errorOn switch.
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
          if (table === 'raid_events') {
            if (fixture.errorOn === 'raid_events') {
              return Promise.resolve({ data: null, error: { message: 'raid_events boom' } }).then(resolve)
            }
            const guildIdFilter = call.filters.find(([col]) => col === 'guild_id')?.[1]
            const idFilter = (call.filters.find(([col]) => col === 'id')?.[1] ?? []) as string[]
            const rows = fixture.raidEvents.filter(r => r.guild_id === guildIdFilter && idFilter.includes(r.id))
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          if (table === 'character_guild_memberships') {
            if (fixture.errorOn === 'character_guild_memberships') {
              return Promise.resolve({ data: null, error: { message: 'character_guild_memberships boom' } }).then(resolve)
            }
            const guildIdFilter = call.filters.find(([col]) => col === 'guild_id')?.[1]
            const isActiveFilter = call.filters.find(([col]) => col === 'is_active')?.[1]
            const charIdFilter = (call.filters.find(([col]) => col === 'character_id')?.[1] ?? []) as string[]
            const rows = fixture.memberships.filter(m =>
              m.guild_id === guildIdFilter && m.is_active === isActiveFilter && charIdFilter.includes(m.character_id)
            )
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          return Promise.resolve({ data: null, error: null }).then(resolve)
        },
      }
      return builder
    },
  }
  return { client, calls }
}

const GUILD_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const OTHER_GUILD_ID = 'aaaaaaaa-0000-0000-0000-000000000002'
const RAID_EVENT_ID = 'aaaaaaaa-0000-0000-0000-000000000003'
const FOREIGN_RAID_EVENT_ID = 'aaaaaaaa-0000-0000-0000-000000000004'
const CHARACTER_ID = 'aaaaaaaa-0000-0000-0000-000000000005'
const FOREIGN_CHARACTER_ID = 'aaaaaaaa-0000-0000-0000-000000000006'
const INACTIVE_CHARACTER_ID = 'aaaaaaaa-0000-0000-0000-000000000007'

describe('normalizeRefId', () => {
  it('maps null, undefined and empty string to null', () => {
    expect(normalizeRefId(null)).toBeNull()
    expect(normalizeRefId(undefined)).toBeNull()
    expect(normalizeRefId('')).toBeNull()
  })

  it('returns a string value unchanged', () => {
    expect(normalizeRefId(RAID_EVENT_ID)).toBe(RAID_EVENT_ID)
  })

  it('stringifies any other non-string value', () => {
    expect(normalizeRefId(5)).toBe('5')
  })
})

describe('findInvalidRaidEventIds', () => {
  it('returns empty when every id belongs to the guild', async () => {
    const { client, calls } = makeClient({
      raidEvents: [{ id: RAID_EVENT_ID, guild_id: GUILD_ID }],
      memberships: [],
    })
    const result = await findInvalidRaidEventIds(client as never, GUILD_ID, [RAID_EVENT_ID])
    expect(result).toEqual([])
    const call = calls.find(c => c.table === 'raid_events')
    expect(call?.filters).toContainEqual(['guild_id', GUILD_ID])
  })

  it('lists an id belonging to another guild', async () => {
    const { client } = makeClient({
      raidEvents: [{ id: FOREIGN_RAID_EVENT_ID, guild_id: OTHER_GUILD_ID }],
      memberships: [],
    })
    const result = await findInvalidRaidEventIds(client as never, GUILD_ID, [FOREIGN_RAID_EVENT_ID])
    expect(result).toEqual([FOREIGN_RAID_EVENT_ID])
  })

  it('lists a malformed id with no query containing it', async () => {
    const { client, calls } = makeClient({ raidEvents: [], memberships: [] })
    const result = await findInvalidRaidEventIds(client as never, GUILD_ID, ['not-a-uuid'])
    expect(result).toEqual(['not-a-uuid'])
    const call = calls.find(c => c.table === 'raid_events')
    const idFilter = call?.filters.find(([col]) => col === 'id')?.[1] as string[] | undefined
    expect(idFilter ?? []).not.toContain('not-a-uuid')
  })

  it('dedupes ids and lists them once', async () => {
    const { client } = makeClient({
      raidEvents: [{ id: FOREIGN_RAID_EVENT_ID, guild_id: OTHER_GUILD_ID }],
      memberships: [],
    })
    const result = await findInvalidRaidEventIds(client as never, GUILD_ID, [FOREIGN_RAID_EVENT_ID, FOREIGN_RAID_EVENT_ID])
    expect(result).toEqual([FOREIGN_RAID_EVENT_ID])
  })

  it('makes no query for empty input', async () => {
    const { client, calls } = makeClient({ raidEvents: [], memberships: [] })
    const result = await findInvalidRaidEventIds(client as never, GUILD_ID, [])
    expect(result).toEqual([])
    expect(calls.filter(c => c.table === 'raid_events')).toHaveLength(0)
  })

  it('makes 2 chunked queries for 101 ids', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `aaaaaaaa-0000-0000-0001-${String(i).padStart(12, '0')}`)
    const { client, calls } = makeClient({ raidEvents: [], memberships: [] })
    await findInvalidRaidEventIds(client as never, GUILD_ID, ids)
    expect(calls.filter(c => c.table === 'raid_events')).toHaveLength(2)
  })

  it('throws on a query error', async () => {
    const { client } = makeClient({ raidEvents: [], memberships: [], errorOn: 'raid_events' })
    await expect(findInvalidRaidEventIds(client as never, GUILD_ID, [RAID_EVENT_ID])).rejects.toThrow()
  })
})

describe('findInvalidCharacterIds', () => {
  it('returns empty when every id has an active membership in the guild', async () => {
    const { client, calls } = makeClient({
      raidEvents: [],
      memberships: [{ character_id: CHARACTER_ID, guild_id: GUILD_ID, is_active: true }],
    })
    const result = await findInvalidCharacterIds(client as never, GUILD_ID, [CHARACTER_ID])
    expect(result).toEqual([])
    const call = calls.find(c => c.table === 'character_guild_memberships')
    expect(call?.filters).toContainEqual(['guild_id', GUILD_ID])
    expect(call?.filters).toContainEqual(['is_active', true])
  })

  it('lists an id whose only membership is in another guild', async () => {
    const { client } = makeClient({
      raidEvents: [],
      memberships: [{ character_id: FOREIGN_CHARACTER_ID, guild_id: OTHER_GUILD_ID, is_active: true }],
    })
    const result = await findInvalidCharacterIds(client as never, GUILD_ID, [FOREIGN_CHARACTER_ID])
    expect(result).toEqual([FOREIGN_CHARACTER_ID])
  })

  it('lists an id with an inactive membership in the guild', async () => {
    const { client } = makeClient({
      raidEvents: [],
      memberships: [{ character_id: INACTIVE_CHARACTER_ID, guild_id: GUILD_ID, is_active: false }],
    })
    const result = await findInvalidCharacterIds(client as never, GUILD_ID, [INACTIVE_CHARACTER_ID])
    expect(result).toEqual([INACTIVE_CHARACTER_ID])
  })

  it('a null is_active counts as not a member', async () => {
    const { client } = makeClient({
      raidEvents: [],
      memberships: [{ character_id: INACTIVE_CHARACTER_ID, guild_id: GUILD_ID, is_active: null }],
    })
    const result = await findInvalidCharacterIds(client as never, GUILD_ID, [INACTIVE_CHARACTER_ID])
    expect(result).toEqual([INACTIVE_CHARACTER_ID])
  })

  it('makes no query for empty input', async () => {
    const { client, calls } = makeClient({ raidEvents: [], memberships: [] })
    const result = await findInvalidCharacterIds(client as never, GUILD_ID, [])
    expect(result).toEqual([])
    expect(calls.filter(c => c.table === 'character_guild_memberships')).toHaveLength(0)
  })

  it('throws on a query error', async () => {
    const { client } = makeClient({ raidEvents: [], memberships: [], errorOn: 'character_guild_memberships' })
    await expect(findInvalidCharacterIds(client as never, GUILD_ID, [CHARACTER_ID])).rejects.toThrow()
  })
})

describe('formatInvalidAwardRefsError', () => {
  it('returns C-1 when only raid events are invalid', () => {
    const msg = formatInvalidAwardRefsError([FOREIGN_RAID_EVENT_ID], [])
    expect(msg).toBe("Some awards are linked to a raid that isn't in this guild. Refresh the page and try again.")
    expect(msg).not.toContain(FOREIGN_RAID_EVENT_ID)
  })

  it('returns C-2 when only characters are invalid', () => {
    const msg = formatInvalidAwardRefsError([], [FOREIGN_CHARACTER_ID])
    expect(msg).toBe("Some raiders aren't active members of this guild. Check the roster, then try again.")
    expect(msg).not.toContain(FOREIGN_CHARACTER_ID)
  })

  it('returns C-3 when both are invalid', () => {
    const msg = formatInvalidAwardRefsError([FOREIGN_RAID_EVENT_ID], [FOREIGN_CHARACTER_ID])
    expect(msg).toBe("Some awards are linked to a raid or raider that isn't in this guild. Refresh the page, check the roster, then try again.")
    expect(msg).not.toContain(FOREIGN_RAID_EVENT_ID)
    expect(msg).not.toContain(FOREIGN_CHARACTER_ID)
  })
})
