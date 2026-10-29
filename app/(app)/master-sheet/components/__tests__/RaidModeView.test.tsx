import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { RaidModeView } from '../RaidModeView'
import type { ItemRankings, LootItem } from '../BossSection'

// A need row has no boss and no Wowhead id (D-13), and a malformed row can
// carry a null boss_name or item_slot. Raid Mode's search must never throw on
// either (T-03-10-03).

vi.mock('@/app/components/ItemLink', () => ({
  default: ({ name }: { name: string }) => <span>{name}</span>,
}))

const ITEM_ROW: LootItem = {
  id: 'item-bindings',
  name: 'Qiraji Bindings of Command',
  boss_name: 'Ragnaros',
  item_slot: 'Wrist',
  wowhead_id: 20928,
}

const NEED_ROW: LootItem = {
  id: 'need-trinket-healing',
  name: 'Trinket, Healing',
  boss_name: 'Needs',
  item_slot: 'Trinket',
  wowhead_id: null,
  kind: 'need',
}

// Cast: the declared type says string, a malformed row says otherwise.
const NULL_FIELDS_ROW = {
  id: 'broken-row',
  name: 'Mystery Piece',
  boss_name: null,
  item_slot: null,
  wowhead_id: null,
} as unknown as LootItem

function tiers(items: ItemRankings[]) {
  return [{ tier: { id: 'tier-1', name: 'Molten Core', phase: 1 }, items }]
}

function search(value: string) {
  fireEvent.change(screen.getByPlaceholderText(/search items/i), { target: { value } })
}

afterEach(cleanup)

describe('RaidModeView need rows', () => {
  it('R1: searching "heal" finds the need by its name', () => {
    render(
      <RaidModeView
        sortedRaidTiers={tiers([
          { item: ITEM_ROW, rankings: [] },
          { item: NEED_ROW, rankings: [] },
        ])}
        onItemClick={() => {}}
      />,
    )

    search('heal')

    expect(screen.getByText('Trinket, Healing')).toBeInTheDocument()
    expect(screen.queryByText('Qiraji Bindings of Command')).toBeNull()
  })

  it('R2: a row with a null boss_name and item_slot does not throw on any search', () => {
    render(
      <RaidModeView
        sortedRaidTiers={tiers([
          { item: ITEM_ROW, rankings: [] },
          { item: NULL_FIELDS_ROW, rankings: [] },
        ])}
        onItemClick={() => {}}
      />,
    )

    expect(() => search('rag')).not.toThrow()
    expect(screen.getByText('Qiraji Bindings of Command')).toBeInTheDocument()
    expect(screen.queryByText('Mystery Piece')).toBeNull()
    expect(() => search('mystery')).not.toThrow()
    expect(screen.getByText('Mystery Piece')).toBeInTheDocument()
  })
})

describe('MasterSheetContent identity-keyed export and modal (source assertions)', () => {
  const source = readFileSync(
    resolve(__dirname, '../MasterSheetContent.tsx'),
    'utf8',
  )

  it('S1: fetchTierRankings reads kind item only (the Gargul import is item-only, D-14)', () => {
    const start = source.indexOf('const fetchTierRankings')
    expect(start).toBeGreaterThan(0)
    expect(source.slice(start, start + 900)).toContain(".eq('kind', 'item')")
  })

  it('S2: the Gargul history map and the candidate modal key by itemIdentityKey', () => {
    const gargul = source.slice(source.indexOf('const handleExportToGargul'))
    expect(gargul).toContain('itemIdentityKey(')
    expect(gargul).toContain('loot_item:loot_items(id, wowhead_id, kind)')
    const modal = source.slice(source.indexOf('const candidateReceivedIds'), source.indexOf('const buildGargulExport'))
    expect(modal).toContain('itemIdentityKey(')
  })
})
