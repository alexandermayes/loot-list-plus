import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveNeedListScope } from '../need-list-scope'

interface TierRow {
  id: string
  list_mode: 'known' | 'discovery' | null
  sort_order: number | null
  is_guild_active: boolean | null
  phase: number | null
}

function tier(id: string, listMode: TierRow['list_mode'], sortOrder: number, active = true): TierRow {
  return { id, list_mode: listMode, sort_order: sortOrder, is_guild_active: active, phase: 1 }
}

/** Recording fake for the one raid_tiers read the helper makes. */
function makeClient(rows: TierRow[] | null, error: { message: string } | null = null) {
  const filters: Array<[string, unknown]> = []
  let selected = ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    select: (columns: string) => { selected = columns; return builder },
    eq: (column: string, value: unknown) => { filters.push([column, value]); return builder },
    in: (column: string, value: unknown) => { filters.push([column, value]); return builder },
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: error ? null : rows, error }).then(resolve),
  }
  const client = { from: (table: string) => { filters.push(['table', table]); return builder } }
  return { client: client as unknown as SupabaseClient, filters, selected: () => selected }
}

const INPUT = { expansionId: 'expansion-1', phases: [1, 2] }

describe('resolveNeedListScope (D-12, D-02 amended)', () => {
  it('serves needs and one slot per Discovery tier, including a turned-off one', async () => {
    const { client } = makeClient([
      tier('t1', 'discovery', 1),
      tier('t2', 'discovery', 2),
      tier('t3', 'discovery', 3, false),
    ])

    const scope = await resolveNeedListScope(client, INPUT)

    expect(scope).toEqual({ includeNeeds: true, tierSlots: { t1: 1, t2: 2, t3: 3 } })
  })

  it('keeps a turned-off tier from moving the slots of the others', async () => {
    const { client } = makeClient([
      tier('t3', 'discovery', 3),
      tier('t1', 'discovery', 1, false),
      tier('t2', 'discovery', 2),
    ])

    const scope = await resolveNeedListScope(client, INPUT)

    expect(scope.tierSlots).toEqual({ t1: 1, t2: 2, t3: 3 })
  })

  it('hides needs for a Known group', async () => {
    const { client } = makeClient([tier('t1', 'known', 1), tier('t2', 'known', 2)])

    expect(await resolveNeedListScope(client, INPUT)).toEqual({ includeNeeds: false, tierSlots: null })
  })

  it('hides needs for a mixed group (one Known and one Discovery active tier)', async () => {
    const { client } = makeClient([tier('t1', 'known', 1), tier('t2', 'discovery', 2)])

    expect(await resolveNeedListScope(client, INPUT)).toEqual({ includeNeeds: false, tierSlots: null })
  })

  it('ignores a turned-off Known tier when deciding the group', async () => {
    const { client } = makeClient([tier('t1', 'known', 1, false), tier('t2', 'discovery', 2)])

    const scope = await resolveNeedListScope(client, INPUT)

    expect(scope.includeNeeds).toBe(true)
    expect(scope.tierSlots).toEqual({ t2: 1 })
  })

  it('treats a tier with a null is_guild_active as not active', async () => {
    const { client } = makeClient([
      { id: 't1', list_mode: 'discovery', sort_order: 1, is_guild_active: null, phase: 1 },
    ])

    expect(await resolveNeedListScope(client, INPUT)).toEqual({ includeNeeds: false, tierSlots: null })
  })

  it('hides needs when no tier is guild-active', async () => {
    const { client } = makeClient([tier('t1', 'discovery', 1, false)])

    expect(await resolveNeedListScope(client, INPUT)).toEqual({ includeNeeds: false, tierSlots: null })
  })

  it('fails closed for nine Discovery tiers (more slots than the column allows)', async () => {
    const rows = Array.from({ length: 9 }, (_, i) => tier(`t${i + 1}`, 'discovery', i + 1))
    const { client } = makeClient(rows)

    expect(await resolveNeedListScope(client, INPUT)).toEqual({ includeNeeds: false, tierSlots: null })
  })

  it('reads raid_tiers for the expansion and phases without an is_guild_active filter', async () => {
    const { client, filters, selected } = makeClient([tier('t1', 'discovery', 1)])

    await resolveNeedListScope(client, INPUT)

    expect(filters).toContainEqual(['table', 'raid_tiers'])
    expect(filters).toContainEqual(['expansion_id', 'expansion-1'])
    expect(filters).toContainEqual(['phase', [1, 2]])
    expect(filters.some(([column]) => column === 'is_guild_active')).toBe(false)
    expect(selected()).toBe('id, list_mode, sort_order, is_guild_active, phase')
  })

  it('throws when the read fails, so the route answers 500 instead of a silent editor', async () => {
    const { client } = makeClient(null, { message: 'boom' })

    await expect(resolveNeedListScope(client, INPUT)).rejects.toThrow(
      'Failed to read raid tiers for the need list',
    )
  })
})
