import { describe, it, expect } from 'vitest'
import { getExpansionDisplayName } from '@/utils/expansionVisuals'
import {
  GAME_VERSIONS,
  GAME_VERSION_LABELS,
  FOREVER_EXPANSION_NAME,
  EXPANSION_GAMES,
  isGameVersion,
  getExpansionGame,
  getGuildGame,
  resolveSignupExpansion,
} from '../game'

describe('GAME_VERSIONS', () => {
  it('lists classic then forever', () => {
    expect(GAME_VERSIONS).toEqual(['classic', 'forever'])
  })
})

describe('GAME_VERSION_LABELS', () => {
  it('labels classic as WoW Classic', () => {
    expect(GAME_VERSION_LABELS.classic).toBe('WoW Classic')
  })

  it('labels forever the same as getExpansionDisplayName(Forever)', () => {
    expect(GAME_VERSION_LABELS.forever).toBe(getExpansionDisplayName('Forever'))
  })
})

describe('FOREVER_EXPANSION_NAME', () => {
  it('is the stored expansions.name / seeder registry key', () => {
    expect(FOREVER_EXPANSION_NAME).toBe('Forever')
  })
})

describe('EXPANSION_GAMES', () => {
  it('maps the five Classic-line expansions to classic', () => {
    expect(EXPANSION_GAMES.Classic).toBe('classic')
    expect(EXPANSION_GAMES['The Burning Crusade']).toBe('classic')
    expect(EXPANSION_GAMES['Wrath of the Lich King']).toBe('classic')
    expect(EXPANSION_GAMES.Cataclysm).toBe('classic')
    expect(EXPANSION_GAMES['Mists of Pandaria']).toBe('classic')
  })

  it('maps Forever to forever', () => {
    expect(EXPANSION_GAMES.Forever).toBe('forever')
  })
})

describe('isGameVersion', () => {
  it('is true only for classic and forever', () => {
    expect(isGameVersion('classic')).toBe(true)
    expect(isGameVersion('forever')).toBe(true)
    expect(isGameVersion('retail')).toBe(false)
    expect(isGameVersion('')).toBe(false)
    expect(isGameVersion(undefined)).toBe(false)
    expect(isGameVersion(null)).toBe(false)
    expect(isGameVersion(42)).toBe(false)
  })
})

describe('getExpansionGame', () => {
  it('returns classic for each Classic-line expansion', () => {
    expect(getExpansionGame('Classic')).toBe('classic')
    expect(getExpansionGame('The Burning Crusade')).toBe('classic')
    expect(getExpansionGame('Wrath of the Lich King')).toBe('classic')
    expect(getExpansionGame('Cataclysm')).toBe('classic')
    expect(getExpansionGame('Mists of Pandaria')).toBe('classic')
  })

  it('returns forever for Forever', () => {
    expect(getExpansionGame('Forever')).toBe('forever')
  })

  it('returns null for retail names, legacy names, wrong case, and empty/non-string input', () => {
    expect(getExpansionGame('Legion')).toBeNull()
    expect(getExpansionGame('Classic WoW')).toBeNull()
    expect(getExpansionGame('forever')).toBeNull()
    expect(getExpansionGame('')).toBeNull()
    expect(getExpansionGame(undefined)).toBeNull()
    expect(getExpansionGame(42)).toBeNull()
  })

  it('rejects prototype-pollution-style names', () => {
    expect(getExpansionGame('constructor')).toBeNull()
    expect(getExpansionGame('__proto__')).toBeNull()
    expect(getExpansionGame('toString')).toBeNull()
  })
})

describe('getGuildGame', () => {
  it('is forever only when guild.game is exactly forever', () => {
    expect(getGuildGame({ game: 'forever' })).toBe('forever')
  })

  it('defaults to classic for classic, missing, null, unknown, and no guild', () => {
    expect(getGuildGame({ game: 'classic' })).toBe('classic')
    expect(getGuildGame({})).toBe('classic')
    expect(getGuildGame({ game: null })).toBe('classic')
    expect(getGuildGame({ game: 'retail' })).toBe('classic')
    expect(getGuildGame(null)).toBe('classic')
    expect(getGuildGame(undefined)).toBe('classic')
  })
})

describe('resolveSignupExpansion', () => {
  it('resolves forever to the Forever expansion name regardless of the classic selection', () => {
    expect(resolveSignupExpansion('forever', 'Cataclysm')).toBe('Forever')
  })

  it('resolves classic to the chosen classic expansion unchanged', () => {
    expect(resolveSignupExpansion('classic', 'Cataclysm')).toBe('Cataclysm')
  })
})
