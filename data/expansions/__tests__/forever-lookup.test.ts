// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { findManifestRaid, foreverRaidsForTierNames } from '../forever/lookup'
import { FOREVER_MANIFEST } from '../forever/manifest'
import type { ManifestRaid } from '@/domain/expansion/manifest-schema'

describe('findManifestRaid', () => {
  it('resolves an exact name via "name"', () => {
    const match = findManifestRaid('Barrow Deeps')
    expect(match?.raid.name).toBe('Barrow Deeps')
    expect(match?.index).toBe(0)
    expect(match?.via).toBe('name')
  })

  it.each([
    ['curly apostrophe', 'Onyxia’s Lair'],
    ['left curly apostrophe', 'Onyxia‘s Lair'],
    ['lowercase', "onyxia's lair"],
    ['uppercase', "ONYXIA'S LAIR"],
    ['surrounding and doubled spaces', "  Onyxia's   Lair  "],
  ])('resolves a %s variant to Onyxia\'s Lair', (_label, input) => {
    const match = findManifestRaid(input)
    expect(match?.raid.name).toBe("Onyxia's Lair")
    expect(match?.index).toBe(2)
    expect(match?.via).toBe('name')
  })

  it.each([
    ['Molten Core'],
    [42],
    [null],
    [undefined],
    [''],
    ['   '],
    ['constructor'],
    ['__proto__'],
  ])('resolves %j to null', input => {
    expect(findManifestRaid(input)).toBeNull()
  })

  it('resolves a previousNames alias with via "alias"', () => {
    const raids: ManifestRaid[] = FOREVER_MANIFEST.raids.map(raid =>
      raid.name === 'Hyjal Summit' ? { ...raid, previousNames: ['Mount Hyjal'] } : raid
    )

    const match = findManifestRaid('  mount   hyjal ', raids)

    expect(match?.raid.name).toBe('Hyjal Summit')
    expect(match?.index).toBe(1)
    expect(match?.via).toBe('alias')
  })

  it('lets the first raid in manifest order win on a shared name', () => {
    const [first, second] = FOREVER_MANIFEST.raids
    const raids: ManifestRaid[] = [
      { ...first, previousNames: ['Shared'] },
      { ...second, previousNames: ['Shared'] },
    ]

    expect(findManifestRaid('shared', raids)?.index).toBe(0)
  })
})

describe('foreverRaidsForTierNames', () => {
  it('returns unique matches in manifest order and skips misses', () => {
    const result = foreverRaidsForTierNames(["Onyxia's Lair", 'Barrow Deeps', 'Nope', 'barrow deeps'])

    expect(result.map(entry => entry.raid.name)).toEqual(['Barrow Deeps', "Onyxia's Lair"])
    expect(result.map(entry => entry.index)).toEqual([0, 2])
  })

  it('returns an empty list for no names or no matches', () => {
    expect(foreverRaidsForTierNames([])).toEqual([])
    expect(foreverRaidsForTierNames(['Custom Raid', null, 7])).toEqual([])
  })
})
