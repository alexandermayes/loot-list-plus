import { describe, it, expect } from 'vitest'
import {
  FOREVER_RULESETS,
  FOREVER_REGION_CODES,
  formatForeverRuleset,
  parseForeverRuleset,
  getRegionForRealm,
  type ForeverRuleset,
  type ForeverRegionCode,
} from '../wow-realms'

// Addendum: Task 4 (WoW Forever picks a ruleset instead of a realm). Blizzard
// ships four rulesets (Normal, PvP, Roleplaying, Hardcore) across four
// regions (US, EU, KR, TW), stored in the existing guilds.realm text column
// as "{Ruleset} ({Region})", e.g. "PvP (US)".
describe('formatForeverRuleset / parseForeverRuleset round-trip', () => {
  it.each(FOREVER_RULESETS.flatMap((ruleset) =>
    FOREVER_REGION_CODES.map((region) => [ruleset, region] as [ForeverRuleset, ForeverRegionCode])
  ))('formats and parses %s / %s', (ruleset, region) => {
    const formatted = formatForeverRuleset(ruleset, region)
    expect(formatted).toBe(`${ruleset} (${region})`)
    expect(parseForeverRuleset(formatted)).toEqual({ ruleset, region })
  })

  it('trims surrounding whitespace before parsing', () => {
    expect(parseForeverRuleset('  PvP (US)  ')).toEqual({ ruleset: 'PvP', region: 'US' })
  })
})

describe('parseForeverRuleset bad input', () => {
  const badInputs: Array<{ value: string | null | undefined; description: string }> = [
    { value: null, description: 'null' },
    { value: undefined, description: 'undefined' },
    { value: '', description: 'empty string' },
    { value: 'Faerlina', description: 'a normal realm name' },
    { value: 'pvp (US)', description: 'lowercase ruleset' },
    { value: 'PvP (us)', description: 'lowercase region' },
    { value: 'PvE (US)', description: 'unsupported ruleset name (PvE, not Normal)' },
    { value: 'PvP (XX)', description: 'unsupported region code' },
    { value: 'PvP(US)', description: 'missing space before parenthesis' },
    { value: 'PvP (US', description: 'unterminated parenthesis' },
    { value: 'PvP (USA)', description: 'three-letter region code' },
    { value: 'Normal', description: 'ruleset with no region at all' },
  ]

  for (const { value, description } of badInputs) {
    it(`returns null for ${description}`, () => {
      expect(parseForeverRuleset(value)).toBeNull()
    })
  }
})

describe('getRegionForRealm on Forever values', () => {
  it.each([
    ['Normal (US)', 'Americas & Oceania'],
    ['PvP (EU)', 'Europe'],
    ['Roleplaying (KR)', 'Korea'],
    ['Hardcore (TW)', 'Taiwan'],
  ])('%s resolves to %s', (value, expectedRegion) => {
    expect(getRegionForRealm(value)).toBe(expectedRegion)
  })

  it('still resolves a normal realm name unchanged', () => {
    expect(getRegionForRealm('Faerlina')).toBe('Americas & Oceania')
  })

  it('returns null for an unknown realm and for a malformed Forever value', () => {
    expect(getRegionForRealm('Not A Real Realm')).toBeNull()
    expect(getRegionForRealm('PvE (US)')).toBeNull()
  })
})
