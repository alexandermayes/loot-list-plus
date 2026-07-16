import { describe, it, expect } from 'vitest'
import { blacktemple, mounthyjal } from '../tbc-raids'

// Regression guard for #171: Black Temple and Hyjal Summit were seeded with
// no "Trash" boss group, so their trash loot never showed in Loot Management.
describe('TBC trash loot (#171)', () => {
  it.each([
    ['Black Temple', blacktemple],
    ['Hyjal Summit', mounthyjal],
  ])('%s has a non-empty Trash group', (_label, raid) => {
    const trash = raid.bosses.find(b => b.name === 'Trash')
    expect(trash).toBeDefined()
    expect(trash!.items.length).toBeGreaterThan(0)
  })

  it.each([
    ['Black Temple', blacktemple],
    ['Hyjal Summit', mounthyjal],
  ])('%s trash items do not duplicate a wowhead_id used elsewhere in the raid', (_label, raid) => {
    const allIds = raid.bosses.flatMap(b => b.items.map(i => i.wowhead_id))
    const trash = raid.bosses.find(b => b.name === 'Trash')!
    for (const item of trash.items) {
      expect(allIds.filter(id => id === item.wowhead_id)).toHaveLength(1)
    }
  })
})
