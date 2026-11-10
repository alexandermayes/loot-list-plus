import { describe, it, expect } from 'vitest'
import { canRankInZone, type PrioZoneItem } from '@/domain/loot/prio-zones'

function zones(item: PrioZoneItem) {
  return {
    bracket: canRankInZone(item, 'bracket'),
    noBracket: canRankInZone(item, 'noBracket'),
    offSpec: canRankInZone(item, 'offSpec'),
  }
}

describe('canRankInZone', () => {
  it('lets a primary item go in every zone', () => {
    expect(zones({ is_allocated: true, character_spec_type: 'primary' })).toEqual({
      bracket: true,
      noBracket: true,
      offSpec: true,
    })
  })

  it('keeps a secondary item out of Brackets 1-4', () => {
    expect(
      zones({ is_allocated: true, character_spec_type: 'secondary', has_primary_only: false })
    ).toEqual({ bracket: false, noBracket: true, offSpec: true })
  })

  it('lets an unallocated item go in every zone', () => {
    const open = { bracket: true, noBracket: true, offSpec: true }
    expect(zones({ is_allocated: false, character_spec_type: null })).toEqual(open)
    expect(zones({ is_allocated: undefined, character_spec_type: null })).toEqual(open)
    expect(zones({})).toEqual(open)
  })

  it('treats primary-only prio with no secondary as open in No Bracket only', () => {
    expect(
      zones({ is_allocated: true, character_spec_type: null, has_primary_only: true })
    ).toEqual({ bracket: false, noBracket: true, offSpec: true })
  })

  it('keeps an item allocated to other classes to Off-spec', () => {
    expect(
      zones({ is_allocated: true, character_spec_type: null, has_primary_only: false })
    ).toEqual({ bracket: false, noBracket: false, offSpec: true })
  })

  it('never ranks Loot Council items', () => {
    const none = { bracket: false, noBracket: false, offSpec: false }
    expect(zones({ is_loot_council: true, character_spec_type: 'primary', is_allocated: true })).toEqual(none)
    expect(zones({ is_loot_council: true, is_allocated: false })).toEqual(none)
  })

  // The pre-#484 pool filters from LootListContent, copied here as the
  // reference so editor pool membership cannot drift from the shared rule.
  const oldBracket14 = (item: PrioZoneItem) =>
    !item.is_loot_council && (item.character_spec_type === 'primary' || !item.is_allocated)
  const oldNoBracket = (item: PrioZoneItem) =>
    !item.is_loot_council && (
      item.character_spec_type === 'primary' ||
      item.character_spec_type === 'secondary' ||
      !item.is_allocated ||
      item.has_primary_only === true
    )
  const oldOffSpec = (item: PrioZoneItem) => !item.is_loot_council

  it('matches the pre-fix editor pool predicates for every flag combination', () => {
    const lcValues = [true, false, undefined]
    const specValues: PrioZoneItem['character_spec_type'][] = ['primary', 'secondary', null, undefined]
    const allocatedValues = [true, false, undefined]
    const primaryOnlyValues = [true, false, undefined]

    let combos = 0
    for (const is_loot_council of lcValues) {
      for (const character_spec_type of specValues) {
        for (const is_allocated of allocatedValues) {
          for (const has_primary_only of primaryOnlyValues) {
            const item = { is_loot_council, character_spec_type, is_allocated, has_primary_only }
            expect(canRankInZone(item, 'bracket'), JSON.stringify(item)).toBe(oldBracket14(item))
            expect(canRankInZone(item, 'noBracket'), JSON.stringify(item)).toBe(oldNoBracket(item))
            expect(canRankInZone(item, 'offSpec'), JSON.stringify(item)).toBe(oldOffSpec(item))
            combos++
          }
        }
      }
    }
    expect(combos).toBe(108)
  })
})
