import { describe, it, expect } from 'vitest'
import { formatRaidSummaryLootLine } from '../discord-raid-summary'

// Separator is a space, U+2192 right arrow, space (matches the pre-change route line).
const ARROW = ' → '

describe('formatRaidSummaryLootLine', () => {
  it('links a Forever item to wowhead.com/forever', () => {
    expect(
      formatRaidSummaryLootLine({
        itemName: 'Ring',
        wowheadId: 271940,
        characterName: 'Thrall',
        expansionName: 'Forever',
      })
    ).toBe(`[Ring](https://www.wowhead.com/forever/item=271940)${ARROW}Thrall`)
  })

  it('keeps the classic link for a non-Forever expansion', () => {
    expect(
      formatRaidSummaryLootLine({
        itemName: 'Ring',
        wowheadId: 271940,
        characterName: 'Thrall',
        expansionName: 'Mists of Pandaria',
      })
    ).toBe(`[Ring](https://www.wowhead.com/classic/item=271940)${ARROW}Thrall`)
  })

  it('keeps the classic link when the guild has no active expansion', () => {
    expect(
      formatRaidSummaryLootLine({
        itemName: 'Ring',
        wowheadId: 271940,
        characterName: 'Thrall',
        expansionName: null,
      })
    ).toBe(`[Ring](https://www.wowhead.com/classic/item=271940)${ARROW}Thrall`)
  })

  it('renders plain text with no link when the item has no wowhead_id', () => {
    const line = formatRaidSummaryLootLine({
      itemName: 'Mystery Blade',
      wowheadId: null,
      characterName: 'Thrall',
      expansionName: 'Forever',
    })
    expect(line).toBe(`Mystery Blade${ARROW}Thrall`)
    expect(line).not.toContain('wowhead.com')
  })

  it('falls back to Unknown Item when both the name and the id are missing', () => {
    expect(
      formatRaidSummaryLootLine({
        itemName: null,
        wowheadId: null,
        characterName: 'Thrall',
        expansionName: 'Forever',
      })
    ).toBe(`Unknown Item${ARROW}Thrall`)
  })

  it('keeps input order when mapped over several rows', () => {
    const rows = [
      { itemName: 'First', wowheadId: 1, characterName: 'A' },
      { itemName: 'Second', wowheadId: null, characterName: 'B' },
      { itemName: 'Third', wowheadId: 3, characterName: 'C' },
    ]
    const lines = rows.map((row) => formatRaidSummaryLootLine({ ...row, expansionName: 'Forever' }))
    expect(lines).toEqual([
      `[First](https://www.wowhead.com/forever/item=1)${ARROW}A`,
      `Second${ARROW}B`,
      `[Third](https://www.wowhead.com/forever/item=3)${ARROW}C`,
    ])
  })

  // D-15, DISC-06: a need award has no Wowhead id, so the summary line is the
  // plain name with no link (the summary has never bolded item names). The
  // fixture stands past the D-22 hold, which refuses real need rankings in Phase 3.
  it('need row (past the D-22 hold): renders the need name with no wowhead link', () => {
    const needRow = { name: 'Trinket, Healing', kind: 'need', need_key: 'trinket.healing', wowhead_id: null }
    const line = formatRaidSummaryLootLine({
      itemName: needRow.name,
      wowheadId: needRow.wowhead_id,
      characterName: 'Thrall',
      expansionName: 'Forever',
    })
    expect(line).toBe(`Trinket, Healing${ARROW}Thrall`)
    expect(line).not.toContain('wowhead.com')
    expect(line).not.toContain('](')
  })
})
