import { describe, it, expect } from 'vitest'
import {
  DISCOVERY_FOREVER_ONLY_REASON,
  KNOWN_SWITCH_BLOCKED_REASON,
  LIST_MODES,
  canSwitchToDiscovery,
  canSwitchToKnown,
  isListMode,
} from '@/domain/loot/list-mode'

const EM_DASH = String.fromCharCode(0x2014)
const EN_DASH = String.fromCharCode(0x2013)

describe('isListMode', () => {
  it('accepts exactly known and discovery', () => {
    expect(LIST_MODES).toEqual(['known', 'discovery'])
    expect(isListMode('known')).toBe(true)
    expect(isListMode('discovery')).toBe(true)
    for (const value of ['Known', 'DISCOVERY', '', null, undefined, 1, 'item']) {
      expect(isListMode(value)).toBe(false)
    }
  })
})

describe('canSwitchToKnown (D-03)', () => {
  it('allows the switch when nobody ranked a need and no need award exists', () => {
    expect(canSwitchToKnown({ rankedNeedCount: 0, needAwardCount: 0 })).toEqual({ allowed: true })
  })

  it('[DISC-01 adjacency] blocks at a count of 1 in either input', () => {
    const blocked = { allowed: false, reason: KNOWN_SWITCH_BLOCKED_REASON }
    expect(canSwitchToKnown({ rankedNeedCount: 1, needAwardCount: 0 })).toEqual(blocked)
    expect(canSwitchToKnown({ rankedNeedCount: 0, needAwardCount: 1 })).toEqual(blocked)
  })

  it('[DISC-01 adjacency] fails closed on negative, fractional and non-number counts', () => {
    const blocked = { allowed: false, reason: KNOWN_SWITCH_BLOCKED_REASON }
    expect(canSwitchToKnown({ rankedNeedCount: -1, needAwardCount: 0 })).toEqual(blocked)
    expect(canSwitchToKnown({ rankedNeedCount: 0.5, needAwardCount: 0 })).toEqual(blocked)
    expect(canSwitchToKnown({ rankedNeedCount: NaN, needAwardCount: 0 })).toEqual(blocked)
    expect(canSwitchToKnown({ rankedNeedCount: 0, needAwardCount: Infinity })).toEqual(blocked)
    expect(
      canSwitchToKnown({ rankedNeedCount: '0' as unknown as number, needAwardCount: 0 }),
    ).toEqual(blocked)
    expect(
      canSwitchToKnown({ rankedNeedCount: 0, needAwardCount: null as unknown as number }),
    ).toEqual(blocked)
  })
})

describe('canSwitchToDiscovery (D-17)', () => {
  it('allows only the exact Forever expansion name', () => {
    expect(canSwitchToDiscovery({ expansionName: 'Forever' })).toEqual({ allowed: true })
  })

  it('blocks every other value, including prototype-shaped ones', () => {
    const blocked = { allowed: false, reason: DISCOVERY_FOREVER_ONLY_REASON }
    for (const expansionName of ['Classic', 'forever', '', 'constructor', undefined]) {
      expect(canSwitchToDiscovery({ expansionName })).toEqual(blocked)
    }
  })
})

describe('switch reasons', () => {
  it('contain no em dash or en dash', () => {
    for (const reason of [KNOWN_SWITCH_BLOCKED_REASON, DISCOVERY_FOREVER_ONLY_REASON]) {
      expect(reason).not.toContain(EM_DASH)
      expect(reason).not.toContain(EN_DASH)
    }
  })
})
