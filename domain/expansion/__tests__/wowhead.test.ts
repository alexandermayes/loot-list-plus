import { describe, it, expect } from 'vitest'
import { getWowheadDomain, wowheadItemUrl } from '../wowhead'

describe('getWowheadDomain', () => {
  it('maps Forever to the forever Wowhead domain', () => {
    expect(getWowheadDomain('Forever')).toBe('forever')
  })

  it('leaves existing expansion domains unchanged', () => {
    expect(getWowheadDomain('Mists of Pandaria')).toBe('mop-classic')
    expect(getWowheadDomain('Classic')).toBe('classic')
  })

  it('returns null for null, undefined or unknown expansions', () => {
    expect(getWowheadDomain(null)).toBeNull()
    expect(getWowheadDomain(undefined)).toBeNull()
    expect(getWowheadDomain('Some Future Thing')).toBeNull()
  })
})

describe('wowheadItemUrl', () => {
  it('links Forever items to the forever domain', () => {
    expect(wowheadItemUrl('Forever', 271940)).toBe('https://www.wowhead.com/forever/item=271940')
  })

  it('keeps the forever domain even when the caller passes a non-Forever domain', () => {
    expect(wowheadItemUrl('Forever', 271940, 'classic')).toBe(
      'https://www.wowhead.com/forever/item=271940'
    )
  })

  it('keeps the retail link for non-Forever expansions when no domain is passed', () => {
    expect(wowheadItemUrl('Mists of Pandaria', 1001)).toBe('https://www.wowhead.com/item=1001')
    expect(wowheadItemUrl('The War Within', 1001)).toBe('https://www.wowhead.com/item=1001')
  })

  it('uses the caller domain for non-Forever or unknown expansions', () => {
    expect(wowheadItemUrl('Classic', 1001, 'classic')).toBe('https://www.wowhead.com/classic/item=1001')
    expect(wowheadItemUrl(null, 1001, 'classic')).toBe('https://www.wowhead.com/classic/item=1001')
  })

  it('falls back to the retail link for null, undefined and near-miss expansion names', () => {
    expect(wowheadItemUrl(null, 1)).toBe('https://www.wowhead.com/item=1')
    expect(wowheadItemUrl(undefined, 1)).toBe('https://www.wowhead.com/item=1')
    expect(wowheadItemUrl('forever', 1)).toBe('https://www.wowhead.com/item=1')
    expect(wowheadItemUrl('WoW Forever', 1)).toBe('https://www.wowhead.com/item=1')
  })

  it('keeps the caller domain for near-miss Forever names', () => {
    expect(wowheadItemUrl('forever', 1, 'classic')).toBe('https://www.wowhead.com/classic/item=1')
    expect(wowheadItemUrl('WoW Forever', 1, 'classic')).toBe('https://www.wowhead.com/classic/item=1')
  })
})
