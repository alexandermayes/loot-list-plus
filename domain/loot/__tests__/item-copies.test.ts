import { describe, it, expect } from 'vitest'
import {
  copyGroupKey,
  copyGroupRule,
  copyLimitState,
  specGroupForRank,
  validateItemCopyLimits,
  COPY_LIMIT_MAIN_SPEC_LABEL,
  COPY_LIMIT_OFF_SPEC_LABEL,
  COPY_LIMIT_WHOLE_LIST_LABEL,
  type CopyLimitItem,
} from '../item-copies'

// Two loot_items rows of one real item, as the catalog has them when more
// than one boss drops it (GH #293).
const BINDINGS_A: CopyLimitItem = { id: 'bind-a', name: 'Qiraji Bindings of Command', item_slot: 'Token', wowhead_id: 20928 }
const BINDINGS_B: CopyLimitItem = { id: 'bind-b', name: 'Qiraji Bindings of Command', item_slot: 'Token', wowhead_id: 20928 }
const DESECRATED_A: CopyLimitItem = { id: 'des-a', name: 'Desecrated Breastplate', item_slot: 'Token', wowhead_id: 22349 }
const DESECRATED_B: CopyLimitItem = { id: 'des-b', name: 'Desecrated Breastplate', item_slot: 'Token', wowhead_id: 22349 }
// Non-unique ring already in data/item-unique.ts (GH #181).
const BAND: CopyLimitItem = { id: 'band', name: 'Band of Devastation', item_slot: 'Finger', wowhead_id: 32526 }
const SPECTRAL: CopyLimitItem = { id: 'spectral', name: 'Spectral Band of Innervation', item_slot: 'Finger', wowhead_id: 28510 }
const NO_WOWHEAD: CopyLimitItem = { id: 'no-wh', name: 'Mystery Helm', item_slot: 'Head', wowhead_id: null }

const CATALOG = [BINDINGS_A, BINDINGS_B, DESECRATED_A, DESECRATED_B, BAND, SPECTRAL, NO_WOWHEAD]

function listed(...pairs: [number, string][]) {
  return pairs.map(([rank, itemId]) => ({ rank, itemId }))
}

function entries(...pairs: [number, CopyLimitItem][]) {
  return pairs.map(([rank, item]) => ({ rank, item }))
}

describe('copyGroupKey', () => {
  it('groups by wowhead_id, falling back to the loot_items id', () => {
    expect(copyGroupKey(BINDINGS_A)).toBe('w:20928')
    expect(copyGroupKey(BINDINGS_B)).toBe('w:20928')
    expect(copyGroupKey(NO_WOWHEAD)).toBe('id:no-wh')
  })
})

describe('specGroupForRank', () => {
  it('puts Brackets 1-4 and No Bracket in main spec and ranks 24-1 in off-spec', () => {
    for (const rank of [50, 39, 38, 25]) expect(specGroupForRank(rank)).toBe('main')
    for (const rank of [24, 1]) expect(specGroupForRank(rank)).toBe('off')
  })
})

describe('copyLimitState', () => {
  it('allows Qiraji Bindings twice in main spec, from two bosses', () => {
    const state = copyLimitState(listed([48, 'bind-a'], [30, 'bind-b']), CATALOG)
    expect(state.overLimit.size).toBe(0)
    expect(state.mainSpecAtLimit.has('bind-a')).toBe(true)
    expect(state.mainSpecAtLimit.has('bind-b')).toBe(true)
    expect(state.offSpecAtLimit.has('bind-a')).toBe(false)
    expect(state.offSpecAtLimit.has('bind-b')).toBe(false)
  })

  it('allows Bindings twice in main spec plus twice in off-spec', () => {
    const state = copyLimitState(
      listed([48, 'bind-a'], [30, 'bind-b'], [20, 'bind-a'], [5, 'bind-b']),
      CATALOG,
    )
    expect(state.overLimit.size).toBe(0)
    for (const id of ['bind-a', 'bind-b']) {
      expect(state.mainSpecAtLimit.has(id)).toBe(true)
      expect(state.offSpecAtLimit.has(id)).toBe(true)
    }
  })

  it('flags a third Bindings copy in main spec, leaving off-spec copies alone', () => {
    const state = copyLimitState(
      listed([48, 'bind-a'], [40, 'bind-b'], [30, 'bind-a'], [10, 'bind-b']),
      CATALOG,
    )
    // overLimit is by item id, so both ids are flagged; the off-spec bucket
    // itself is within its limit.
    expect(state.overLimit).toEqual(new Set(['bind-a', 'bind-b']))
    expect(state.offSpecAtLimit.has('bind-a')).toBe(false)
  })

  it('does not flag off-spec Bindings when only the main spec group is over', () => {
    const state = copyLimitState(
      listed([48, 'bind-a'], [40, 'bind-a'], [30, 'bind-a'], [10, 'bind-b']),
      CATALOG,
    )
    expect(state.overLimit.has('bind-a')).toBe(true)
    expect(state.overLimit.has('bind-b')).toBe(false)
  })

  it('allows a single-slot token once in main spec and once in off-spec', () => {
    const state = copyLimitState(listed([45, 'des-a'], [10, 'des-b']), CATALOG)
    expect(state.overLimit.size).toBe(0)
    expect(state.mainSpecAtLimit.has('des-a')).toBe(true)
    expect(state.offSpecAtLimit.has('des-b')).toBe(true)
  })

  it('flags a single-slot token listed in Brackets 1-4 and in No Bracket', () => {
    const state = copyLimitState(listed([45, 'des-a'], [30, 'des-b']), CATALOG)
    expect(state.overLimit).toEqual(new Set(['des-a', 'des-b']))
  })

  it('counts a non-unique ring across every section, up to two copies', () => {
    const atLimit = copyLimitState(listed([45, 'band'], [10, 'band']), CATALOG)
    expect(atLimit.overLimit.size).toBe(0)
    expect(atLimit.mainSpecAtLimit.has('band')).toBe(true)
    expect(atLimit.offSpecAtLimit.has('band')).toBe(true)

    const over = copyLimitState(listed([45, 'band'], [30, 'band'], [10, 'band']), CATALOG)
    expect(over.overLimit).toEqual(new Set(['band']))
  })

  it('counts a unique ring in main spec and off-spec together', () => {
    const state = copyLimitState(listed([45, 'spectral'], [10, 'spectral']), CATALOG)
    expect(state.overLimit).toEqual(new Set(['spectral']))
  })

  it('groups a row with no wowhead_id by its own id and ignores unknown ids', () => {
    const state = copyLimitState(listed([45, 'no-wh'], [44, 'missing'], [43, 'missing']), CATALOG)
    expect(state.overLimit.size).toBe(0)
    expect(state.mainSpecAtLimit.has('no-wh')).toBe(true)
    expect(state.mainSpecAtLimit.has('missing')).toBe(false)
  })

  it('puts every catalog id of a full group in the at-limit sets', () => {
    const state = copyLimitState(listed([45, 'des-a']), CATALOG)
    expect(state.mainSpecAtLimit.has('des-b')).toBe(true)
    expect(state.offSpecAtLimit.has('des-b')).toBe(false)
  })
})

describe('mixed token group (one wowhead_id in a Token row and a Quest row)', () => {
  const MIX_TOKEN: CopyLimitItem = { id: 'mix-token', name: 'Qiraji Bindings of Command', item_slot: 'Token', wowhead_id: 20928 }
  const MIX_QUEST: CopyLimitItem = { id: 'mix-quest', name: 'Qiraji Bindings of Command', item_slot: 'Quest', wowhead_id: 20928 }
  const catalog = [MIX_TOKEN, MIX_QUEST]

  it('treats the group as a token group with the token limit, on client and server', () => {
    expect(copyGroupRule([MIX_QUEST, MIX_TOKEN])).toEqual({ isToken: true, limit: 2 })

    const within = copyLimitState(listed([45, 'mix-quest'], [30, 'mix-token']), catalog)
    expect(within.overLimit.size).toBe(0)
    expect(validateItemCopyLimits(entries([45, MIX_QUEST], [30, MIX_TOKEN]))).toEqual([])

    const over = copyLimitState(listed([45, 'mix-quest'], [40, 'mix-token'], [30, 'mix-token']), catalog)
    expect(over.overLimit).toEqual(new Set(['mix-quest', 'mix-token']))
    const violations = validateItemCopyLimits(entries([45, MIX_QUEST], [40, MIX_TOKEN], [30, MIX_TOKEN]))
    expect(violations).toHaveLength(1)
    expect(violations[0].bracket).toBe('Main spec')
  })
})

describe('validateItemCopyLimits', () => {
  it('uses the signed-off labels', () => {
    expect(COPY_LIMIT_MAIN_SPEC_LABEL).toBe('Main spec')
    expect(COPY_LIMIT_OFF_SPEC_LABEL).toBe('Off-spec')
    expect(COPY_LIMIT_WHOLE_LIST_LABEL).toBe('Whole list')
  })

  it('labels three Bindings in main spec "Main spec"', () => {
    const violations = validateItemCopyLimits(entries([48, BINDINGS_A], [40, BINDINGS_B], [30, BINDINGS_A]))
    expect(violations).toEqual([{
      bracket: 'Main spec',
      rule: 'item_copy_limit',
      detail: '"Qiraji Bindings of Command" is listed 3 times (max 2)',
    }])
  })

  it('labels three Bindings in off-spec "Off-spec"', () => {
    const violations = validateItemCopyLimits(entries([20, BINDINGS_A], [10, BINDINGS_B], [5, BINDINGS_A]))
    expect(violations).toEqual([{
      bracket: 'Off-spec',
      rule: 'item_copy_limit',
      detail: '"Qiraji Bindings of Command" is listed 3 times (max 2)',
    }])
  })

  it('reports main spec then off-spec when both groups are over', () => {
    const violations = validateItemCopyLimits(entries(
      [48, BINDINGS_A], [40, BINDINGS_B], [30, BINDINGS_A],
      [20, BINDINGS_A], [10, BINDINGS_B], [5, BINDINGS_A],
    ))
    expect(violations.map(v => v.bracket)).toEqual(['Main spec', 'Off-spec'])
  })

  it('labels non-token groups "Whole list"', () => {
    expect(validateItemCopyLimits(entries([45, BAND], [30, BAND], [10, BAND]))).toEqual([{
      bracket: 'Whole list',
      rule: 'item_copy_limit',
      detail: '"Band of Devastation" is listed 3 times (max 2)',
    }])
    expect(validateItemCopyLimits(entries([45, SPECTRAL], [10, SPECTRAL]))).toEqual([{
      bracket: 'Whole list',
      rule: 'item_copy_limit',
      detail: '"Spectral Band of Innervation" is listed 2 times (max 1)',
    }])
  })

  it('falls back to "Unknown" for an item with no name', () => {
    const nameless: CopyLimitItem = { id: 'x', item_slot: 'Head', wowhead_id: 1 }
    const violations = validateItemCopyLimits(entries([45, nameless], [10, nameless]))
    expect(violations[0].detail).toBe('"Unknown" is listed 2 times (max 1)')
  })

  it('returns nothing for lists within the limits', () => {
    expect(validateItemCopyLimits(entries([45, BAND], [10, BAND], [44, SPECTRAL]))).toEqual([])
    expect(validateItemCopyLimits(entries(
      [48, BINDINGS_A], [30, BINDINGS_B], [20, BINDINGS_A], [5, BINDINGS_B],
    ))).toEqual([])
  })
})
