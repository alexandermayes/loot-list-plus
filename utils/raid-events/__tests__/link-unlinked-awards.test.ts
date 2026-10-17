// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { awardCopyKey, linkUnlinkedAddonAwards, planAwardLinks } from '../link-unlinked-awards'

const GUILD = 'guild-1'
const DATE = '2026-09-20'
const ITEM = 'item-1'
const OTHER_ITEM = 'item-2'

type Call = {
  table: string
  op: 'select' | 'update'
  columns?: string
  filters: Array<[string, unknown]>
  updatePayload?: Record<string, unknown>
}

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
  history?: HistoryRow[]
  raidEvents?: Array<{ id: string; guild_id: string; raid_date: string; raid_team_id: string | null }>
  teamMembers?: Array<{ guild_id: string; character_id: string; raid_team_id: string }>
  /** The first loot_history select fails. */
  selectError?: boolean
  /** Updates on these row ids answer with a 23505. */
  uniqueViolationOn?: string[]
}

function matches(row: Record<string, unknown>, filters: Array<[string, unknown]>): boolean {
  return filters.every(([col, val]) => {
    if (col.startsWith('is:')) return row[col.slice(3)] === null
    return Array.isArray(val) ? val.includes(row[col]) : row[col] === val
  })
}

/** Recording fake for loot_history, raid_events and raid_team_members (GH #321). */
function makeService(fixture: Fixture) {
  const calls: Call[] = []
  const history = fixture.history ?? []
  const service = {
    from(table: string) {
      const call: Call = { table, op: 'select', filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (columns?: string) => { call.columns = columns; return builder },
        update: (payload: Record<string, unknown>) => { call.op = 'update'; call.updatePayload = payload; return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        is: (col: string, val: unknown) => { call.filters.push([`is:${col}`, val]); return builder },
        then: (resolve: (v: unknown) => unknown) => {
          const filter = (col: string) => call.filters.find(([c]) => c === col)?.[1]
          if (table === 'loot_history' && call.op === 'update') {
            const id = filter('id') as string
            if (fixture.uniqueViolationOn?.includes(id)) {
              return Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key' } }).then(resolve)
            }
            for (const row of history.filter(r => matches(r, call.filters))) Object.assign(row, call.updatePayload)
            return Promise.resolve({ data: null, error: null }).then(resolve)
          }
          if (table === 'loot_history') {
            if (fixture.selectError) {
              return Promise.resolve({ data: null, error: { message: 'loot_history boom' } }).then(resolve)
            }
            return Promise.resolve({ data: history.filter(r => matches(r, call.filters)), error: null }).then(resolve)
          }
          if (table === 'raid_events') {
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
  return { service, calls, history }
}

function unlinked(id: string, extra: Partial<HistoryRow> = {}): HistoryRow {
  return {
    id,
    guild_id: GUILD,
    source: 'addon',
    loot_item_id: ITEM,
    character_id: 'char-1',
    raid_event_id: null,
    awarded_date: DATE,
    award_copy: 1,
    ...extra,
  }
}

const nullNight = { id: 'ev-null', guild_id: GUILD, raid_date: DATE, raid_team_id: null }
const teamANight = { id: 'ev-a', guild_id: GUILD, raid_date: DATE, raid_team_id: 'team-a' }
const teamBNight = { id: 'ev-b', guild_id: GUILD, raid_date: DATE, raid_team_id: 'team-b' }

describe('planAwardLinks (GH #321)', () => {
  const noTeams = { charTeam: new Map<string, string>(), hasTeams: false }
  const row = (id: string, characterId: string | null = 'char-1', itemId = ITEM) => ({
    id,
    character_id: characterId,
    loot_item_id: itemId,
  })

  it('P1 a no-team guild links to the null-team night with copy 1', () => {
    const plan = planAwardLinks([row('h1')], [nullNight], noTeams, new Map())
    expect(plan).toEqual({ links: [{ id: 'h1', raidEventId: 'ev-null', awardCopy: 1 }], skipped: [] })
  })

  it('P2 a team guild links a teamed raider to the team night and leaves an unassigned raider unlinked when two nights exist', () => {
    const routing = { charTeam: new Map([['char-1', 'team-a']]), hasTeams: true }
    const plan = planAwardLinks([row('h1', 'char-1'), row('h2', 'char-9')], [teamANight, teamBNight], routing, new Map())
    expect(plan.links).toEqual([{ id: 'h1', raidEventId: 'ev-a', awardCopy: 1 }])
    expect(plan.skipped).toEqual([{ id: 'h2', reason: 'ambiguous' }])
  })

  it('P3 a second copy of an item for the same raider takes copy 2 when copy 1 is already on the night', () => {
    const existing = new Map([[awardCopyKey(ITEM, 'char-1', 'ev-null'), 1]])
    const plan = planAwardLinks([row('h1')], [nullNight], noTeams, existing)
    expect(plan.links).toEqual([{ id: 'h1', raidEventId: 'ev-null', awardCopy: 2 }])
  })

  it('P4 two unlinked copies in the same plan take copies 2 and 3', () => {
    const existing = new Map([[awardCopyKey(ITEM, 'char-1', 'ev-null'), 1]])
    const plan = planAwardLinks([row('h1'), row('h2')], [nullNight], noTeams, existing)
    expect(plan.links.map(l => l.awardCopy)).toEqual([2, 3])
  })

  it('P5 copy 11 is skipped with a reason and the other item still links', () => {
    const existing = new Map([[awardCopyKey(ITEM, 'char-1', 'ev-null'), 10]])
    const plan = planAwardLinks([row('h1'), row('h2', 'char-1', OTHER_ITEM)], [nullNight], noTeams, existing)
    expect(plan.links).toEqual([{ id: 'h2', raidEventId: 'ev-null', awardCopy: 1 }])
    expect(plan.skipped).toHaveLength(1)
    expect(plan.skipped[0].id).toBe('h1')
    expect(plan.skipped[0].reason).toContain('10 copies')
  })

  it('P6 a row with no character_id links with copy 1 and no collision check', () => {
    const existing = new Map([[awardCopyKey(ITEM, 'char-1', 'ev-null'), 10]])
    const plan = planAwardLinks([row('h1', null)], [nullNight], noTeams, existing)
    expect(plan.links).toEqual([{ id: 'h1', raidEventId: 'ev-null', awardCopy: 1 }])
  })

  it('P7 no night that date skips every row', () => {
    const plan = planAwardLinks([row('h1')], [], noTeams, new Map())
    expect(plan.links).toEqual([])
    expect(plan.skipped).toEqual([{ id: 'h1', reason: 'no_raid_night' }])
  })
})

describe('linkUnlinkedAddonAwards (GH #321)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  const updates = (calls: Call[]) => calls.filter(c => c.table === 'loot_history' && c.op === 'update')

  it('L1 no unlinked rows means exactly one query', async () => {
    const { service, calls } = makeService({ history: [unlinked('h1', { raid_event_id: 'ev-null' })], raidEvents: [nullNight] })

    const result = await linkUnlinkedAddonAwards(service as never, GUILD, DATE)

    expect(result).toEqual({ linked: [], itemIds: [], skipped: [] })
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('loot_history')
    expect(calls[0].filters).toEqual([
      ['guild_id', GUILD],
      ['source', 'addon'],
      ['is:raid_event_id', null],
      ['awarded_date', DATE],
    ])
  })

  it('L2 a link issues one guarded update with raid_event_id and award_copy', async () => {
    const { service, calls, history } = makeService({ history: [unlinked('h1')], raidEvents: [nullNight] })

    const result = await linkUnlinkedAddonAwards(service as never, GUILD, DATE)

    expect(result).toEqual({ linked: ['h1'], itemIds: [ITEM], skipped: [] })
    const [update] = updates(calls)
    expect(update.updatePayload).toEqual({ raid_event_id: 'ev-null', award_copy: 1 })
    expect(update.filters).toEqual([['id', 'h1'], ['guild_id', GUILD], ['is:raid_event_id', null]])
    expect(history[0].raid_event_id).toBe('ev-null')
  })

  it('L3 the next copy comes from the rows already on the night', async () => {
    const onNight = unlinked('h0', { raid_event_id: 'ev-null', award_copy: 2 })
    const { service, calls } = makeService({ history: [onNight, unlinked('h1')], raidEvents: [nullNight] })

    await linkUnlinkedAddonAwards(service as never, GUILD, DATE)

    expect(updates(calls)[0].updatePayload).toEqual({ raid_event_id: 'ev-null', award_copy: 3 })
  })

  it('L4 only rows of this guild, source addon and this date are read', async () => {
    const { service, calls } = makeService({
      history: [
        unlinked('h-other-guild', { guild_id: 'guild-2' }),
        unlinked('h-web', { source: 'web' }),
        unlinked('h-other-date', { awarded_date: '2026-09-21' }),
      ],
      raidEvents: [nullNight],
    })

    const result = await linkUnlinkedAddonAwards(service as never, GUILD, DATE)

    expect(result.linked).toEqual([])
    expect(updates(calls)).toHaveLength(0)
  })

  it('L5 a 23505 on one update skips that row and the rest still link', async () => {
    const { service, calls } = makeService({
      history: [unlinked('h1'), unlinked('h2', { character_id: 'char-2' })],
      raidEvents: [nullNight],
      uniqueViolationOn: ['h1'],
    })

    const result = await linkUnlinkedAddonAwards(service as never, GUILD, DATE)

    expect(result.linked).toEqual(['h2'])
    expect(result.itemIds).toEqual([ITEM])
    expect(result.skipped).toEqual([{ id: 'h1', reason: 'award copy already taken' }])
    expect(updates(calls)).toHaveLength(2)
  })

  it('L6 a team guild routes each raider to their team night; an unassigned raider stays unlinked', async () => {
    const { service, history } = makeService({
      history: [unlinked('h1', { character_id: 'char-a' }), unlinked('h2', { character_id: 'char-b' }), unlinked('h3', { character_id: 'char-z' })],
      raidEvents: [teamANight, teamBNight],
      teamMembers: [
        { guild_id: GUILD, character_id: 'char-a', raid_team_id: 'team-a' },
        { guild_id: GUILD, character_id: 'char-b', raid_team_id: 'team-b' },
      ],
    })

    const result = await linkUnlinkedAddonAwards(service as never, GUILD, DATE)

    expect(result.linked).toEqual(['h1', 'h2'])
    expect(history.find(r => r.id === 'h1')?.raid_event_id).toBe('ev-a')
    expect(history.find(r => r.id === 'h2')?.raid_event_id).toBe('ev-b')
    expect(history.find(r => r.id === 'h3')?.raid_event_id).toBeNull()
    expect(result.skipped).toEqual([{ id: 'h3', reason: 'ambiguous' }])
  })

  it('L7 no night that date reads no routing and updates nothing', async () => {
    const { service, calls } = makeService({ history: [unlinked('h1')], raidEvents: [] })

    const result = await linkUnlinkedAddonAwards(service as never, GUILD, DATE)

    expect(result.linked).toEqual([])
    expect(result.skipped).toEqual([{ id: 'h1', reason: 'no_raid_night' }])
    expect(calls.map(c => c.table)).toEqual(['loot_history', 'raid_events'])
  })

  it('L8 a select error throws', async () => {
    const { service } = makeService({ selectError: true })

    await expect(linkUnlinkedAddonAwards(service as never, GUILD, DATE)).rejects.toThrow('Failed to read unlinked addon awards')
  })
})
