import { describe, it, expect } from 'vitest'
import { getExpansionDisplayName, getExpansionVisuals } from '../expansionVisuals'

describe('getExpansionDisplayName', () => {
  it('maps Forever to the WoW Forever display label', () => {
    expect(getExpansionDisplayName('Forever')).toBe('WoW Forever')
  })

  it('leaves unmapped names unchanged', () => {
    expect(getExpansionDisplayName('Mists of Pandaria')).toBe('Mists of Pandaria')
    expect(getExpansionDisplayName('Classic WoW')).toBe('Classic WoW')
  })

  it('returns an empty string for null or undefined', () => {
    expect(getExpansionDisplayName(null)).toBe('')
    expect(getExpansionDisplayName(undefined)).toBe('')
  })
})

describe('getExpansionVisuals', () => {
  it('gives Forever an uncropped local logo', () => {
    const visuals = getExpansionVisuals('Forever')
    expect(visuals.logoUrl).toBe('/images/expansions/ForeverLogo.webp')
    expect(visuals.logoFit).toBe('contain')
  })

  it('leaves logoFit undefined for expansions that keep the default cover fit', () => {
    expect(getExpansionVisuals('Classic').logoFit).toBeUndefined()
  })
})
