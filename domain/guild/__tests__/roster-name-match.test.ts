import { describe, it, expect } from 'vitest'
import {
  parseRosterNames,
  createRosterMatcher,
  matchRosterNames,
  countRosterMatches,
  nameSimilarity,
  type RosterAlias,
} from '../roster-name-match'

interface Raider { id: string; name: string }

const ZEV: Raider = { id: 'id-zev', name: 'Zev' }
const DENY: Raider = { id: 'id-deny', name: 'Deny' }
const ALIASES: RosterAlias[] = [{ alias_name: 'denny', character_id: 'id-deny' }]

function matcherFor(roster: Raider[], aliases: RosterAlias[] = ALIASES) {
  return createRosterMatcher(roster, aliases, r => r.id, r => r.name)
}

describe('parseRosterNames', () => {
  it('splits on newlines, commas and semicolons and trims', () => {
    expect(parseRosterNames('Zev\n Deny ,Check;Alpha\n\n')).toEqual(['Zev', 'Deny', 'Check', 'Alpha'])
  })

  it('drops MRT header lines with a date or " - "', () => {
    expect(parseRosterNames('21/01/2026 01:58:11 - Throne of Thunder6\nZev\nSome - Thing')).toEqual(['Zev'])
  })

  it('strips a trailing x marker', () => {
    expect(parseRosterNames('Alphafold    x\nBrewenjoyer x\nMax')).toEqual(['Alphafold', 'Brewenjoyer', 'Max'])
  })

  it('drops empty names and names over 50 characters, and does not dedupe', () => {
    expect(parseRosterNames(`Zev,,zev,${'a'.repeat(51)},${'b'.repeat(50)}`)).toEqual(['Zev', 'zev', 'b'.repeat(50)])
  })
})

describe('createRosterMatcher', () => {
  it('matches a name case-insensitively', () => {
    expect(matcherFor([ZEV, DENY]).resolve('zEV')).toEqual({ member: ZEV, id: 'id-zev', via: 'name' })
  })

  it('matches through a lowercase alias', () => {
    expect(matcherFor([ZEV, DENY]).resolve('Denny')).toEqual({ member: DENY, id: 'id-deny', via: 'alias' })
  })

  it('prefers a direct name over an alias', () => {
    const denny: Raider = { id: 'id-denny', name: 'Denny' }
    expect(matcherFor([ZEV, DENY, denny]).resolve('Denny')).toEqual({ member: denny, id: 'id-denny', via: 'name' })
  })

  it('ignores an alias whose character is not in the roster', () => {
    expect(matcherFor([ZEV]).resolve('Denny')).toBeNull()
    expect(matcherFor([ZEV]).resolve('Nobody')).toBeNull()
  })

  it('uses the first roster member when names repeat', () => {
    const otherZev: Raider = { id: 'id-zev-2', name: 'zev' }
    expect(matcherFor([ZEV, otherZev]).resolve('Zev')?.id).toBe('id-zev')
  })

  it('uses the first alias when an alias name repeats', () => {
    const aliases = [{ alias_name: 'denny', character_id: 'id-deny' }, { alias_name: 'denny', character_id: 'id-zev' }]
    expect(matcherFor([ZEV, DENY], aliases).resolve('denny')?.id).toBe('id-deny')
  })
})

describe('matchRosterNames', () => {
  it('dedupes by name and by character and keeps the first unmatched spelling', () => {
    const names = parseRosterNames('Zev, zev, Denny, Nobody, nobody')
    const result = matchRosterNames(names, matcherFor([ZEV, DENY]))
    expect(result).toEqual({
      matched: [
        { name: 'Zev', member: ZEV, id: 'id-zev', via: 'name' },
        { name: 'Denny', member: DENY, id: 'id-deny', via: 'alias' },
      ],
      unmatched: ['Nobody'],
      repeatedCount: 2,
    })
  })

  it('counts a second name for the same character as repeated', () => {
    const result = matchRosterNames(['Deny', 'Denny'], matcherFor([ZEV, DENY]))
    expect(result.matched.map(m => m.id)).toEqual(['id-deny'])
    expect(result.repeatedCount).toBe(1)
  })
})

// The raid-tracking import preview counts every pasted name (no dedupe).
describe('countRosterMatches', () => {
  it('counts each name, so total equals names.length', () => {
    const names = ['Zev', 'zev', 'Denny', 'Nobody', 'nobody']
    expect(countRosterMatches(names, matcherFor([ZEV, DENY]))).toEqual({
      total: 5,
      matched: 2,
      aliasMatched: 1,
      unmatched: 2,
    })
  })

  it('returns zeros for no names', () => {
    expect(countRosterMatches([], matcherFor([ZEV]))).toEqual({ total: 0, matched: 0, aliasMatched: 0, unmatched: 0 })
  })
})

describe('nameSimilarity', () => {
  it('scores by longest common substring', () => {
    expect(nameSimilarity('Zev', 'Zev')).toBe(1)
    expect(nameSimilarity('Zev', 'Zevv')).toBe(0.75)
    expect(nameSimilarity('Zev', 'zev')).toBe(1)
  })
})
