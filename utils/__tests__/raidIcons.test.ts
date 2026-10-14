// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { getExpansionGame } from '@/domain/expansion/game'
import {
  FOREVER_RAID_ICON,
  getRaidIcon,
  getRaidIconLarge,
  getRaidShorthand,
} from '@/utils/raidIcons'

/**
 * Raid icons resolve by game plus name (D-04 as amended 2026-10-14). Forever
 * raid names collide with Classic and TBC raid names ("Onyxia's Lair",
 * "Hyjal Summit"), so a name-only lookup would show a Forever tier with Classic
 * or TBC art. The owner moved this work out of plan 02-11 into its own PR so
 * the copy sign-off on 02-11 can never hold it back and no deployed Forever
 * tier ever shows the wrong art.
 */

const MEDIUM = 'https://wow.zamimg.com/images/wow/icons/medium/'
const LARGE = 'https://wow.zamimg.com/images/wow/icons/large/'

describe('getRaidIcon and getRaidIconLarge: Forever scoping', () => {
  it('exports the neutral Forever icon constant', () => {
    expect(FOREVER_RAID_ICON).toBe('inv_misc_questionmark')
  })

  it("never resolves a Forever Onyxia's Lair to the Classic Onyxia icon", () => {
    const url = getRaidIcon("Onyxia's Lair", 'forever')
    expect(url).not.toContain('achievement_boss_onyxia')
    expect(url).toBe(`${MEDIUM}${FOREVER_RAID_ICON}.jpg`)
  })

  it('never resolves a Forever Hyjal Summit to the TBC Archimonde icon', () => {
    const url = getRaidIcon('Hyjal Summit', 'forever')
    expect(url).not.toContain('achievement_boss_archimonde')
    expect(url).toBe(`${MEDIUM}${FOREVER_RAID_ICON}.jpg`)
  })

  it('gives a Forever raid that is in no name map the neutral icon', () => {
    expect(getRaidIcon('Barrow Deeps', 'forever')).toBe(`${MEDIUM}${FOREVER_RAID_ICON}.jpg`)
  })

  it('returns the large neutral URL from getRaidIconLarge for Forever', () => {
    expect(getRaidIconLarge("Onyxia's Lair", 'forever')).toBe(
      `${LARGE}${FOREVER_RAID_ICON}.jpg`,
    )
    expect(getRaidIconLarge('Hyjal Summit', 'forever')).not.toContain(
      'achievement_boss_archimonde',
    )
  })

  it('never reads the name map on the Forever path (prototype-pollution names)', () => {
    for (const name of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      expect(getRaidIcon(name, 'forever')).toBe(`${MEDIUM}${FOREVER_RAID_ICON}.jpg`)
      expect(getRaidIconLarge(name, 'forever')).toBe(`${LARGE}${FOREVER_RAID_ICON}.jpg`)
    }
  })
})

describe('getRaidIcon and getRaidIconLarge: Classic line is unchanged', () => {
  it("keeps the Classic Onyxia icon with the game omitted or 'classic'", () => {
    expect(getRaidIcon("Onyxia's Lair")).toContain('achievement_boss_onyxia')
    expect(getRaidIcon("Onyxia's Lair", 'classic')).toContain('achievement_boss_onyxia')
    expect(getRaidIconLarge("Onyxia's Lair", 'classic')).toContain('achievement_boss_onyxia')
  })

  it("keeps the TBC Archimonde icon for Hyjal Summit with the game omitted or 'classic'", () => {
    expect(getRaidIcon('Hyjal Summit')).toContain('achievement_boss_archimonde-')
    expect(getRaidIcon('Hyjal Summit', 'classic')).toContain('achievement_boss_archimonde-')
  })

  it("resolves a name the same with 'classic' as with no game", () => {
    for (const name of ['Molten Core', 'Karazhan', 'Naxxramas', 'Siege of Orgrimmar']) {
      expect(getRaidIcon(name, 'classic')).toBe(getRaidIcon(name))
      expect(getRaidIconLarge(name, 'classic')).toBe(getRaidIconLarge(name))
    }
  })

  it('still falls back to the question-mark icon for an unknown name', () => {
    expect(getRaidIcon('Not A Raid')).toBe(`${MEDIUM}inv_misc_questionmark.jpg`)
    expect(getRaidIcon('Not A Raid', 'classic')).toBe(`${MEDIUM}inv_misc_questionmark.jpg`)
    expect(getRaidIconLarge('Not A Raid')).toBe(`${LARGE}inv_misc_questionmark.jpg`)
  })
})

describe('run payload composition (plan 02-13 usage)', () => {
  it("gives a Forever expansion name the neutral icon and a null expansion the Classic icon", () => {
    expect(getRaidIcon("Onyxia's Lair", getExpansionGame('Forever') ?? 'classic')).toBe(
      `${MEDIUM}${FOREVER_RAID_ICON}.jpg`,
    )
    expect(getRaidIcon("Onyxia's Lair", getExpansionGame(null) ?? 'classic')).toContain(
      'achievement_boss_onyxia',
    )
  })
})

describe('getRaidShorthand', () => {
  it('is unchanged: labels carry no art and are right for the Forever raids too', () => {
    expect(getRaidShorthand("Onyxia's Lair")).toBe('Onyxia')
    expect(getRaidShorthand('Hyjal Summit')).toBe('Hyjal')
  })
})
