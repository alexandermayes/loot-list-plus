import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LootItemSelectionModal } from '../LootItemSelectionModal'
import type { LootItem } from '../types'

const sulfuras: LootItem = {
  id: 'item-1',
  name: 'Sulfuras, Hand of Ragnaros',
  wowhead_id: 17182,
  boss_name: 'Ragnaros',
  raid_tier_id: 'tier-mc',
}
const thunderfury: LootItem = {
  id: 'item-2',
  name: 'Thunderfury, Blessed Blade of the Windseeker',
  wowhead_id: 19019,
  boss_name: 'Garr',
  raid_tier_id: 'tier-mc',
}

const baseProps = {
  target: { index: 0, itemId: 99999, characterName: 'Alice' },
  searchQuery: '',
  filteredItems: [sulfuras, thunderfury],
  onSearchQueryChange: () => {},
  onSelect: () => {},
  onSkip: () => {},
}

describe('LootItemSelectionModal', () => {
  it('does not render when target is null', () => {
    render(<LootItemSelectionModal {...baseProps} target={null} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the unmatched item id and character name in the description', () => {
    render(<LootItemSelectionModal {...baseProps} />)
    expect(screen.getByText('[99999]')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('renders one button per filtered item with name + boss + id', () => {
    render(<LootItemSelectionModal {...baseProps} />)
    expect(screen.getByText('Sulfuras, Hand of Ragnaros')).toBeInTheDocument()
    expect(screen.getByText('Thunderfury, Blessed Blade of the Windseeker')).toBeInTheDocument()
    expect(screen.getByText(/Ragnaros • ID: 17182/)).toBeInTheDocument()
    expect(screen.getByText(/Garr • ID: 19019/)).toBeInTheDocument()
  })

  it('caps the visible items at 20 (UI guard against huge result sets)', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
      wowhead_id: 1000 + i,
      boss_name: 'Boss',
      raid_tier_id: 'tier-x',
    }))
    render(<LootItemSelectionModal {...baseProps} filteredItems={items} />)
    // Items 0..19 are rendered; 20+ are not.
    expect(screen.getByText('Item 0')).toBeInTheDocument()
    expect(screen.getByText('Item 19')).toBeInTheDocument()
    expect(screen.queryByText('Item 20')).not.toBeInTheDocument()
  })

  it('renders empty state when filteredItems is empty', () => {
    render(<LootItemSelectionModal {...baseProps} filteredItems={[]} />)
    expect(screen.getByText('No items found')).toBeInTheDocument()
  })

  it('typing in search fires onSearchQueryChange (controlled input)', async () => {
    const user = userEvent.setup()
    const onSearchQueryChange = vi.fn()
    render(<LootItemSelectionModal {...baseProps} onSearchQueryChange={onSearchQueryChange} />)
    await user.type(screen.getByPlaceholderText(/Search loot tables/), 's')
    expect(onSearchQueryChange).toHaveBeenCalledExactlyOnceWith('s')
  })

  it('clicking an item fires onSelect(item)', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<LootItemSelectionModal {...baseProps} onSelect={onSelect} />)
    await user.click(screen.getByText('Sulfuras, Hand of Ragnaros'))
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(sulfuras)
  })

  it('"Skip this item" button fires onSkip', async () => {
    const user = userEvent.setup()
    const onSkip = vi.fn()
    render(<LootItemSelectionModal {...baseProps} onSkip={onSkip} />)
    await user.click(screen.getByRole('button', { name: 'Skip this item' }))
    expect(onSkip).toHaveBeenCalledOnce()
  })
})
