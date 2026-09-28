import { describe, it, expect, vi } from 'vitest'
import {
  FACTION_ITEM_ALIASES,
  wowheadIdCandidates,
  findByWowheadId,
  resolveByWowheadId,
  FACTION_ITEM_VARIANTS,
  factionVariantIds,
  withFactionVariants,
} from '../faction-item-aliases'

describe('FACTION_ITEM_ALIASES', () => {
  it('maps exactly the two Classic faction-variant quest heads (GH #277)', () => {
    expect(FACTION_ITEM_ALIASES).toEqual({ 18422: 18423, 19002: 19003 })
  })

  it('is frozen', () => {
    expect(Object.isFrozen(FACTION_ITEM_ALIASES)).toBe(true)
  })
})

describe('wowheadIdCandidates', () => {
  it('returns the Horde id then its Alliance alias', () => {
    expect(wowheadIdCandidates(19002)).toEqual([19002, 19003])
    expect(wowheadIdCandidates(18422)).toEqual([18422, 18423])
  })

  it('returns only the given id for an Alliance catalog id — aliases never point back', () => {
    expect(wowheadIdCandidates(19003)).toEqual([19003])
    expect(wowheadIdCandidates(18423)).toEqual([18423])
  })

  it('returns only the given id for an unrelated id', () => {
    expect(wowheadIdCandidates(12345)).toEqual([12345])
  })
})

describe('findByWowheadId', () => {
  it('returns the aliased row when only the Alliance row is present', () => {
    const rows = [{ wowhead_id: 19003, name: 'Head of Nefarian' }]
    expect(findByWowheadId(rows, 19002)).toBe(rows[0])
  })

  it('prefers the exact id when both rows are present', () => {
    const rows = [
      { wowhead_id: 19003, name: 'Alliance' },
      { wowhead_id: 19002, name: 'Horde' },
    ]
    expect(findByWowheadId(rows, 19002)).toBe(rows[1])
  })

  it('returns undefined on no match', () => {
    const rows = [{ wowhead_id: 19003, name: 'Head of Nefarian' }]
    expect(findByWowheadId(rows, 99999)).toBeUndefined()
  })

  it('ignores rows whose wowhead_id is null', () => {
    const rows = [{ wowhead_id: null, name: 'No wowhead id' }]
    expect(findByWowheadId(rows, 19002)).toBeUndefined()
  })
})

describe('resolveByWowheadId', () => {
  it('tries the exact id then the alias, returning the alias hit', async () => {
    const lookup = vi.fn(async (candidate: number) => (candidate === 19003 ? { id: 'item-19003' } : null))
    const result = await resolveByWowheadId(19002, lookup)
    expect(result).toEqual({ id: 'item-19003' })
    expect(lookup).toHaveBeenNthCalledWith(1, 19002)
    expect(lookup).toHaveBeenNthCalledWith(2, 19003)
    expect(lookup).toHaveBeenCalledTimes(2)
  })

  it('calls lookup exactly once when the exact id hits', async () => {
    const lookup = vi.fn(async (candidate: number) => (candidate === 19002 ? { id: 'item-19002' } : null))
    const result = await resolveByWowheadId(19002, lookup)
    expect(result).toEqual({ id: 'item-19002' })
    expect(lookup).toHaveBeenCalledTimes(1)
  })

  it('calls lookup exactly once for a non-alias id', async () => {
    const lookup = vi.fn(async () => null)
    const result = await resolveByWowheadId(99999, lookup)
    expect(result).toBeNull()
    expect(lookup).toHaveBeenCalledTimes(1)
  })

  it('returns null when every candidate misses', async () => {
    const lookup = vi.fn(async () => null)
    const result = await resolveByWowheadId(19002, lookup)
    expect(result).toBeNull()
    expect(lookup).toHaveBeenCalledTimes(2)
  })
})

describe('FACTION_ITEM_VARIANTS (GH #290)', () => {
  it('deep-equals the bidirectional map derived from FACTION_ITEM_ALIASES', () => {
    expect(FACTION_ITEM_VARIANTS).toEqual({
      18422: [18423],
      18423: [18422],
      19002: [19003],
      19003: [19002],
    })
  })

  it('is frozen, including the value arrays', () => {
    expect(Object.isFrozen(FACTION_ITEM_VARIANTS)).toBe(true)
    expect(Object.isFrozen(FACTION_ITEM_VARIANTS[19003])).toBe(true)
  })
})

describe('factionVariantIds (GH #290)', () => {
  it('returns the sibling id for every known faction-variant id, both directions', () => {
    expect(factionVariantIds(19003)).toEqual([19002])
    expect(factionVariantIds(19002)).toEqual([19003])
    expect(factionVariantIds(18423)).toEqual([18422])
    expect(factionVariantIds(18422)).toEqual([18423])
  })

  it('returns an empty array for an unrelated id', () => {
    expect(factionVariantIds(16921)).toEqual([])
  })
})

describe('withFactionVariants (GH #290)', () => {
  it('mirrors every alias pair in both directions, from Object.entries(FACTION_ITEM_ALIASES)', () => {
    for (const [hordeStr, allianceId] of Object.entries(FACTION_ITEM_ALIASES)) {
      const hordeId = Number(hordeStr)

      const allianceOnly = [{ wowhead_id: allianceId, name: 'alliance-row' }]
      const allianceResult = withFactionVariants(allianceOnly)
      expect(allianceResult.map(r => r.wowhead_id)).toEqual([allianceId, hordeId])
      expect(allianceResult[1]).toEqual({ ...allianceOnly[0], wowhead_id: hordeId })

      const hordeOnly = [{ wowhead_id: hordeId, name: 'horde-row' }]
      const hordeResult = withFactionVariants(hordeOnly)
      expect(hordeResult.map(r => r.wowhead_id)).toEqual([hordeId, allianceId])
      expect(hordeResult[1]).toEqual({ ...hordeOnly[0], wowhead_id: allianceId })
    }
  })

  it('adds nothing when both ids of a pair are already present', () => {
    const rows = [
      { wowhead_id: 19003, name: 'alliance' },
      { wowhead_id: 19002, name: 'horde' },
    ]
    expect(withFactionVariants(rows)).toEqual(rows)
  })

  it('passes through unrelated ids and null wowhead_id rows unchanged', () => {
    const rows = [
      { wowhead_id: 16921, name: 'unrelated' },
      { wowhead_id: null, name: 'no wowhead id' },
    ]
    expect(withFactionVariants(rows)).toEqual(rows)
  })

  it('does not mutate a frozen input array of frozen rows, and returns a new array', () => {
    const rows = Object.freeze([
      Object.freeze({ wowhead_id: 19003, name: 'alliance' }),
    ])
    const result = withFactionVariants(rows)
    expect(result).not.toBe(rows)
    expect(rows).toHaveLength(1)
    expect(result).toHaveLength(2)
  })

  it('mirrors every occurrence of a repeated row; a last-wins Map by wowhead_id agrees between the id and its mirror', () => {
    const rows = [
      { wowhead_id: 19003, rank: 10 },
      { wowhead_id: 16921, rank: 3 },
      { wowhead_id: 19003, rank: 12 },
    ]
    const result = withFactionVariants(rows)
    expect(result).toEqual([
      { wowhead_id: 19003, rank: 10 },
      { wowhead_id: 19002, rank: 10 },
      { wowhead_id: 16921, rank: 3 },
      { wowhead_id: 19003, rank: 12 },
      { wowhead_id: 19002, rank: 12 },
    ])

    const lastWins = new Map<number, number>()
    for (const row of result) lastWins.set(row.wowhead_id, row.rank)
    expect(lastWins.get(19002)).toBe(12)
    expect(lastWins.get(19003)).toBe(12)
  })
})
