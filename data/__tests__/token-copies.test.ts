import { describe, it, expect } from 'vitest'
import { TOKEN_MAX_COPIES } from '../token-copies'
import { classicRaids } from '../classic-wow-raids'
import { tbcRaids } from '../tbc-raids'
import { wrathRaids } from '../wrath-raids'
import { cataRaids } from '../cata-raids'
import { mopRaids } from '../mop-raids'

// Transcribed from the Wowhead item pages of every catalog token (GH #331),
// independently of the generator: the number of distinct gear slots each
// token can be turned in for. Every other token turns into one slot.
const EXPECTED: Record<number, number> = {
  20928: 2, // Qiraji Bindings of Command: Shoulder, Feet
  20932: 2, // Qiraji Bindings of Dominance: Shoulder, Feet
  21232: 3, // Imperial Qiraji Armaments: One-Hand, Shield, Ranged
  21237: 2, // Imperial Qiraji Regalia: Two-Hand, One-Hand
  47242: 5, // Trophy of the Crusade
  47557: 5, // Regalia of the Grand Conqueror
  47558: 5, // Regalia of the Grand Protector
  47559: 5, // Regalia of the Grand Vanquisher
  52025: 5, // Marks of Sanctification (normal and heroic)
  52026: 5,
  52027: 5,
  52028: 5,
  52029: 5,
  52030: 5,
  105857: 5, // Essences of the Cursed (normal and heroic)
  105858: 5,
  105859: 5,
  105866: 5,
  105867: 5,
  105868: 5,
}

describe('TOKEN_MAX_COPIES', () => {
  it('holds exactly the verified multi-slot tokens', () => {
    expect(TOKEN_MAX_COPIES).toEqual(EXPECTED)
  })

  it('only lists items that are tokens in the raid data', () => {
    const tokenIds = new Set<number>()
    for (const raid of [...classicRaids, ...tbcRaids, ...wrathRaids, ...cataRaids, ...mopRaids]) {
      for (const boss of raid.bosses) {
        for (const item of boss.items) {
          if (item.slot === 'Token') tokenIds.add(item.wowhead_id)
        }
      }
    }
    for (const id of Object.keys(TOKEN_MAX_COPIES)) {
      expect(tokenIds.has(Number(id))).toBe(true)
    }
  })

  it('gives every listed token between 2 and 5 copies', () => {
    for (const copies of Object.values(TOKEN_MAX_COPIES)) {
      expect(Number.isInteger(copies)).toBe(true)
      expect(copies).toBeGreaterThanOrEqual(2)
      expect(copies).toBeLessThanOrEqual(5)
    }
  })
})
