import { describe, it, expect } from 'vitest'
import { isActiveCompetitor, buildItemCompetition } from '../item-competition'

const VIEWER = 'viewer-1'
const ACTIVE_A = 'active-a'
const DEPARTED_D = 'departed-d'
const ITEM_X = 'item-x'

describe('isActiveCompetitor', () => {
  it('returns true for the viewer\'s own character id even when it is in the inactive set', () => {
    expect(isActiveCompetitor(VIEWER, new Set([VIEWER]), VIEWER)).toBe(true)
  })

  it('returns false for null, undefined and empty string', () => {
    expect(isActiveCompetitor(null, new Set(), VIEWER)).toBe(false)
    expect(isActiveCompetitor(undefined, new Set(), VIEWER)).toBe(false)
    expect(isActiveCompetitor('', new Set(), VIEWER)).toBe(false)
  })

  it('returns false for an id in the inactive set', () => {
    expect(isActiveCompetitor(DEPARTED_D, new Set([DEPARTED_D]), VIEWER)).toBe(false)
  })

  it('returns true for any other id', () => {
    expect(isActiveCompetitor(ACTIVE_A, new Set([DEPARTED_D]), VIEWER)).toBe(true)
  })
})

describe('buildItemCompetition', () => {
  it('leaves a departed raider out of totalWanting and userRank', () => {
    const entries = [
      { loot_item_id: ITEM_X, character_id: VIEWER, rank: 30 },
      { loot_item_id: ITEM_X, character_id: ACTIVE_A, rank: 40 },
      { loot_item_id: ITEM_X, character_id: DEPARTED_D, rank: 45 },
    ]

    const withDepartedFiltered = buildItemCompetition(entries, VIEWER, [DEPARTED_D])
    expect(withDepartedFiltered[ITEM_X]).toEqual({ totalWanting: 1, userRank: 2 })

    const withoutFilter = buildItemCompetition(entries, VIEWER, [])
    expect(withoutFilter[ITEM_X]).toEqual({ totalWanting: 2, userRank: 3 })
  })

  it('does not count an entry with a null or empty character id', () => {
    const entries = [
      { loot_item_id: ITEM_X, character_id: VIEWER, rank: 10 },
      { loot_item_id: ITEM_X, character_id: null, rank: 20 },
      { loot_item_id: ITEM_X, character_id: '', rank: 25 },
    ]

    const result = buildItemCompetition(entries, VIEWER, [])
    expect(result[ITEM_X]).toEqual({ totalWanting: 0, userRank: 1 })
  })

  it('GH #58 kept: the viewer listing an item twice (main spec and off spec) never counts as a competitor above themselves', () => {
    const OTHER = 'other-raider'
    const entries = [
      { loot_item_id: ITEM_X, character_id: VIEWER, rank: 40 },
      { loot_item_id: ITEM_X, character_id: VIEWER, rank: 10 },
      { loot_item_id: ITEM_X, character_id: OTHER, rank: 20 },
    ]

    const result = buildItemCompetition(entries, VIEWER, [])
    expect(result[ITEM_X]).toEqual({ totalWanting: 1, userRank: 1 })
  })

  it('when the viewer has no entry on an item, userRank equals the number of active listers and totalWanting counts them', () => {
    const OTHER_1 = 'other-1'
    const OTHER_2 = 'other-2'
    const entries = [
      { loot_item_id: ITEM_X, character_id: OTHER_1, rank: 15 },
      { loot_item_id: ITEM_X, character_id: OTHER_2, rank: 5 },
      { loot_item_id: ITEM_X, character_id: DEPARTED_D, rank: 1 },
    ]

    const result = buildItemCompetition(entries, VIEWER, [DEPARTED_D])
    expect(result[ITEM_X]).toEqual({ totalWanting: 2, userRank: 2 })
  })

  it('an array or a Set of inactive ids gives the same result, and the input entries array is not mutated', () => {
    const entries = [
      { loot_item_id: ITEM_X, character_id: VIEWER, rank: 30 },
      { loot_item_id: ITEM_X, character_id: ACTIVE_A, rank: 40 },
      { loot_item_id: ITEM_X, character_id: DEPARTED_D, rank: 45 },
    ]
    const snapshot = JSON.parse(JSON.stringify(entries))

    const viaArray = buildItemCompetition(entries, VIEWER, [DEPARTED_D])
    const viaSet = buildItemCompetition(entries, VIEWER, new Set([DEPARTED_D]))

    expect(viaArray).toEqual(viaSet)
    expect(entries).toEqual(snapshot)
  })
})
