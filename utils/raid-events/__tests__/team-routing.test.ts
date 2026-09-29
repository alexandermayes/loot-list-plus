// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { toRaidNightDate, pickAwardRaidEvent, findAwardRaidEvent } from '../team-routing'

type Call = { table: string; op: string; filters: Array<[string, unknown]> }

interface Fixture {
  raidEvents?: Array<{ id: string; guild_id: string; raid_date: string; raid_team_id: string | null }>
  teamMembers?: Array<{ guild_id: string; character_id: string; raid_team_id: string }>
  raidEventsError?: boolean
}

/** Recording fake for raid_events and raid_team_members (GH #295). */
function makeService(fixture: Fixture) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const call: Call = { table, op: 'select', filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        insert: () => { call.op = 'insert'; return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        then: (resolve: (v: unknown) => unknown) => {
          const filter = (col: string) => call.filters.find(([c]) => c === col)?.[1]
          if (table === 'raid_events') {
            if (fixture.raidEventsError) {
              return Promise.resolve({ data: null, error: { message: 'raid_events boom' } }).then(resolve)
            }
            const rows = (fixture.raidEvents ?? [])
              .filter(e => e.guild_id === filter('guild_id') && e.raid_date === filter('raid_date'))
              .map(e => ({ id: e.id, raid_team_id: e.raid_team_id }))
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          if (table === 'raid_team_members') {
            const rows = (fixture.teamMembers ?? []).filter(m => m.guild_id === filter('guild_id'))
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

const GUILD = 'guild-1'
const OTHER_GUILD = 'guild-2'
const DATE = '2026-09-20'

describe('toRaidNightDate', () => {
  it.each([
    ['2026-09-20', '2026-09-20'],
    ['2026-09-20T23:59:59Z', '2026-09-20'],
    [' 2026-09-20 ', '2026-09-20'],
  ])('%j gives %j', (input, expected) => {
    expect(toRaidNightDate(input)).toBe(expected)
  })

  it.each([
    ['2026-02-30'],
    ['2026-13-01'],
    ['20/09/2026'],
    [''],
    [null],
    [undefined],
    [20260920],
  ])('%j gives null', input => {
    expect(toRaidNightDate(input)).toBeNull()
  })
})

describe('pickAwardRaidEvent', () => {
  it('no events gives no_raid_night', () => {
    expect(pickAwardRaidEvent([], { hasTeams: false, teamId: null })).toEqual({ raidEventId: null, outcome: 'no_raid_night' })
    expect(pickAwardRaidEvent([], { hasTeams: true, teamId: 'team-a' })).toEqual({ raidEventId: null, outcome: 'no_raid_night' })
  })

  describe('no-team guild', () => {
    it('links the null-team night, even when a team-tagged night exists too', () => {
      const events = [{ id: 'ev-team', raid_team_id: 'team-x' }, { id: 'ev-null', raid_team_id: null }]
      expect(pickAwardRaidEvent(events, { hasTeams: false, teamId: null })).toEqual({ raidEventId: 'ev-null', outcome: 'linked' })
    })

    it('links a single team-tagged night when there is no null-team night', () => {
      expect(pickAwardRaidEvent([{ id: 'ev-team', raid_team_id: 'team-x' }], { hasTeams: false, teamId: null }))
        .toEqual({ raidEventId: 'ev-team', outcome: 'linked' })
    })

    it('is ambiguous with several team-tagged nights and no null-team night', () => {
      const events = [{ id: 'ev-1', raid_team_id: 'team-x' }, { id: 'ev-2', raid_team_id: 'team-y' }]
      expect(pickAwardRaidEvent(events, { hasTeams: false, teamId: null })).toEqual({ raidEventId: null, outcome: 'ambiguous' })
    })
  })

  describe('team guild', () => {
    const events = [{ id: 'ev-a', raid_team_id: 'team-a' }, { id: 'ev-b', raid_team_id: 'team-b' }]

    it("links a teamed raider to their team's night", () => {
      expect(pickAwardRaidEvent(events, { hasTeams: true, teamId: 'team-b' })).toEqual({ raidEventId: 'ev-b', outcome: 'linked' })
    })

    it("never links a teamed raider to another team's night", () => {
      expect(pickAwardRaidEvent([{ id: 'ev-a', raid_team_id: 'team-a' }], { hasTeams: true, teamId: 'team-b' }))
        .toEqual({ raidEventId: null, outcome: 'no_raid_night' })
    })

    it('never links a teamed raider to the null-team night', () => {
      expect(pickAwardRaidEvent([{ id: 'ev-null', raid_team_id: null }], { hasTeams: true, teamId: 'team-a' }))
        .toEqual({ raidEventId: null, outcome: 'no_raid_night' })
    })

    it('links an unteamed raider to the only night that date', () => {
      expect(pickAwardRaidEvent([{ id: 'ev-a', raid_team_id: 'team-a' }], { hasTeams: true, teamId: null }))
        .toEqual({ raidEventId: 'ev-a', outcome: 'linked' })
    })

    it('is ambiguous for an unteamed raider with two nights', () => {
      expect(pickAwardRaidEvent(events, { hasTeams: true, teamId: null })).toEqual({ raidEventId: null, outcome: 'ambiguous' })
    })
  })
})

describe('findAwardRaidEvent', () => {
  it('an invalid date gives no_date with zero queries', async () => {
    const { client, calls } = makeService({})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await findAwardRaidEvent(client as any, GUILD, 'not-a-date', 'char-1')
    expect(result).toEqual({ raidEventId: null, outcome: 'no_date' })
    expect(calls).toHaveLength(0)
  })

  it('filters raid_events by guild_id and raid_date, and never picks another guild night on the same date', async () => {
    const { client, calls } = makeService({
      raidEvents: [
        { id: 'ev-other-guild', guild_id: OTHER_GUILD, raid_date: DATE, raid_team_id: null },
        { id: 'ev-mine', guild_id: GUILD, raid_date: DATE, raid_team_id: null },
      ],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await findAwardRaidEvent(client as any, GUILD, `${DATE}T21:00:00Z`, 'char-1')
    expect(result).toEqual({ raidEventId: 'ev-mine', outcome: 'linked' })
    const eventsCall = calls.find(c => c.table === 'raid_events')
    expect(eventsCall?.filters).toEqual([['guild_id', GUILD], ['raid_date', DATE]])
  })

  it('never inserts a raid event', async () => {
    const { client, calls } = makeService({ raidEvents: [] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await findAwardRaidEvent(client as any, GUILD, DATE, 'char-1')
    expect(calls.some(c => c.op === 'insert')).toBe(false)
  })

  it('no rows gives no_raid_night without querying raid_team_members', async () => {
    const { client, calls } = makeService({
      raidEvents: [{ id: 'ev-other', guild_id: OTHER_GUILD, raid_date: DATE, raid_team_id: null }],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await findAwardRaidEvent(client as any, GUILD, DATE, 'char-1')
    expect(result).toEqual({ raidEventId: null, outcome: 'no_raid_night' })
    expect(calls.some(c => c.table === 'raid_team_members')).toBe(false)
  })

  it('throws when the raid_events query errors', async () => {
    const { client } = makeService({ raidEventsError: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(findAwardRaidEvent(client as any, GUILD, DATE, 'char-1')).rejects.toThrow(/raid nights/)
  })

  it("routes a teamed raider to their team's night", async () => {
    const { client } = makeService({
      raidEvents: [
        { id: 'ev-a', guild_id: GUILD, raid_date: DATE, raid_team_id: 'team-a' },
        { id: 'ev-b', guild_id: GUILD, raid_date: DATE, raid_team_id: 'team-b' },
      ],
      teamMembers: [
        { guild_id: GUILD, character_id: 'char-1', raid_team_id: 'team-b' },
        { guild_id: GUILD, character_id: 'char-2', raid_team_id: 'team-a' },
      ],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await findAwardRaidEvent(client as any, GUILD, DATE, 'char-1')
    expect(result).toEqual({ raidEventId: 'ev-b', outcome: 'linked' })
  })

  it('a raider on two teams takes the unteamed rule', async () => {
    const teamMembers = [
      { guild_id: GUILD, character_id: 'char-1', raid_team_id: 'team-a' },
      { guild_id: GUILD, character_id: 'char-1', raid_team_id: 'team-b' },
    ]
    const two = makeService({
      raidEvents: [
        { id: 'ev-a', guild_id: GUILD, raid_date: DATE, raid_team_id: 'team-a' },
        { id: 'ev-b', guild_id: GUILD, raid_date: DATE, raid_team_id: 'team-b' },
      ],
      teamMembers,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await findAwardRaidEvent(two.client as any, GUILD, DATE, 'char-1')).toEqual({ raidEventId: null, outcome: 'ambiguous' })

    const one = makeService({
      raidEvents: [{ id: 'ev-b', guild_id: GUILD, raid_date: DATE, raid_team_id: 'team-b' }],
      teamMembers,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await findAwardRaidEvent(one.client as any, GUILD, DATE, 'char-1')).toEqual({ raidEventId: 'ev-b', outcome: 'linked' })
  })

  it('a null characterId takes the unteamed rule', async () => {
    const { client } = makeService({
      raidEvents: [
        { id: 'ev-a', guild_id: GUILD, raid_date: DATE, raid_team_id: 'team-a' },
        { id: 'ev-b', guild_id: GUILD, raid_date: DATE, raid_team_id: 'team-b' },
      ],
      teamMembers: [{ guild_id: GUILD, character_id: 'char-2', raid_team_id: 'team-a' }],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await findAwardRaidEvent(client as any, GUILD, DATE, null)).toEqual({ raidEventId: null, outcome: 'ambiguous' })
  })
})
