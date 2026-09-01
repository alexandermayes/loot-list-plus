import { describe, it, expect } from 'vitest'
import { diffPremiumRoleHolders } from '../premium-role-diff'

describe('diffPremiumRoleHolders', () => {
  it('grants every desired id, including ids already present in current', () => {
    const result = diffPremiumRoleHolders(['a', 'b'], ['a'])
    expect(result.toGrant.sort()).toEqual(['a', 'b'])
  })

  it('revokes exactly the current holders absent from desired', () => {
    const result = diffPremiumRoleHolders(['a'], ['a', 'b', 'c'])
    expect(result.toRevoke.sort()).toEqual(['b', 'c'])
  })

  it('returns an empty toRevoke when current is null (listing unavailable)', () => {
    const result = diffPremiumRoleHolders(['a', 'b'], null)
    expect(result.toRevoke).toEqual([])
  })

  it('dedupes repeated desired ids so a two-guild purchaser appears once in toGrant and never in toRevoke', () => {
    const result = diffPremiumRoleHolders(['a', 'a'], ['a'])
    expect(result.toGrant).toEqual(['a'])
    expect(result.toRevoke).toEqual([])
  })

  it('revokes all current holders when desired is empty', () => {
    const result = diffPremiumRoleHolders([], ['a', 'b'])
    expect(result.toGrant).toEqual([])
    expect(result.toRevoke.sort()).toEqual(['a', 'b'])
  })

  it('returns two empty arrays when both desired and current are empty', () => {
    const result = diffPremiumRoleHolders([], [])
    expect(result).toEqual({ toGrant: [], toRevoke: [] })
  })

  it('never returns an id in both toGrant and toRevoke', () => {
    const result = diffPremiumRoleHolders(['a', 'b'], ['b', 'c'])
    const overlap = result.toGrant.filter((id) => result.toRevoke.includes(id))
    expect(overlap).toEqual([])
  })
})
