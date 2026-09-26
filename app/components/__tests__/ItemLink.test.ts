import { describe, it, expect } from 'vitest'
import { getWowheadDomain } from '../ItemLink'

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
