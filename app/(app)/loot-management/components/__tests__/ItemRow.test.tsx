import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemRow } from '../ItemRow'
import type { LootItem } from '../types'

// ItemRow is the per-item row in the loot-management items table. The whole
// reason it's its own component is so React.memo can skip re-renders for
// items whose props didn't change — verified by the "memo prop stability"
// test at the bottom of this file.
//
// Tests focus on:
// - Per-row interactions: availability + loot-council checkboxes,
//   classification select, notes button
// - Display: item name, boss, slot, tier name
// - Notes button affordance (different aria/style when a note is set)
// - LootCouncil checkbox disabled when item is not available
// - memo behavior: same props (referentially) → same DOM, no extra re-render
//
// We don't drive the primary/secondary MultiSelectDropdown internals —
// that's tested separately. Here we only verify that the right callbacks
// are reachable from the parent's perspective (i.e. that ItemRow forwards
// them through to its children).

const baseItem: LootItem = {
  id: 'item-1',
  name: 'Sulfuras, Hand of Ragnaros',
  boss_name: 'Ragnaros',
  item_slot: 'Two-Hand',
  wowhead_id: 17182,
  classification: 'Reserved',
  item_type: 'Weapon',
  allocation_cost: 1,
  is_available: true,
  is_loot_council: false,
  roles: [],
  raid_tier: { name: 'Molten Core' },
}

const baseProps = {
  item: baseItem,
  specs: undefined,
  note: '',
  classSpecOptions: [],
  onToggleAvailability: () => {},
  onToggleLootCouncil: () => {},
  onUpdateClassification: () => {},
  onAddSpec: () => {},
  onRemoveSpec: () => {},
  onRemoveAllSpecs: () => {},
  onOpenNotes: () => {},
  getSpecName: () => '',
  getSpecColor: () => undefined,
  getConsolidatedSpecNames: () => [],
  isRoleGroupSelected: () => false,
}

/**
 * A row is a `<tr>` — wrap in table/tbody to satisfy HTML validity (and
 * silence Testing Library's nesting warning).
 */
function renderRow(overrides: Partial<typeof baseProps> = {}) {
  return render(
    <table>
      <tbody>
        <ItemRow {...baseProps} {...overrides} />
      </tbody>
    </table>
  )
}

describe('ItemRow', () => {
  // ─── Display ──────────────────────────────────────────

  it('renders the item name, boss, slot, and tier', () => {
    renderRow()
    expect(screen.getByText('Sulfuras, Hand of Ragnaros')).toBeInTheDocument()
    expect(screen.getByText('Ragnaros')).toBeInTheDocument()
    expect(screen.getByText('Two-Hand')).toBeInTheDocument()
    expect(screen.getByText('Molten Core')).toBeInTheDocument()
  })

  // ─── Availability checkbox ────────────────────────────

  it('availability checkbox reflects is_available', () => {
    renderRow({ item: { ...baseItem, is_available: true } })
    const availability = screen.getByRole('checkbox', { name: /Toggle availability/ })
    expect(availability).toBeChecked()
  })

  it('availability checkbox is unchecked when is_available is false', () => {
    renderRow({ item: { ...baseItem, is_available: false } })
    const availability = screen.getByRole('checkbox', { name: /Toggle availability/ })
    expect(availability).not.toBeChecked()
  })

  it('clicking availability calls onToggleAvailability(id, current)', async () => {
    const user = userEvent.setup()
    const onToggleAvailability = vi.fn()
    renderRow({ onToggleAvailability })

    await user.click(screen.getByRole('checkbox', { name: /Toggle availability/ }))
    expect(onToggleAvailability).toHaveBeenCalledExactlyOnceWith('item-1', true)
  })

  // ─── Loot Council checkbox ────────────────────────────

  it('loot-council checkbox reflects is_loot_council', () => {
    renderRow({ item: { ...baseItem, is_loot_council: true } })
    const lc = screen.getByRole('checkbox', { name: /Toggle Loot Council/ })
    expect(lc).toBeChecked()
  })

  it('loot-council checkbox is disabled when item is not available (no point setting LC on a disabled item)', () => {
    renderRow({ item: { ...baseItem, is_available: false } })
    const lc = screen.getByRole('checkbox', { name: /Toggle Loot Council/ })
    expect(lc).toBeDisabled()
  })

  it('clicking loot-council calls onToggleLootCouncil(id, current)', async () => {
    const user = userEvent.setup()
    const onToggleLootCouncil = vi.fn()
    renderRow({ item: { ...baseItem, is_loot_council: false }, onToggleLootCouncil })

    await user.click(screen.getByRole('checkbox', { name: /Toggle Loot Council/ }))
    expect(onToggleLootCouncil).toHaveBeenCalledExactlyOnceWith('item-1', false)
  })

  // ─── Classification select ────────────────────────────

  it('classification select reflects the current value', () => {
    renderRow({ item: { ...baseItem, classification: 'Limited' } })
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('Limited')
  })

  it('changing classification calls onUpdateClassification(id, newValue)', async () => {
    const user = userEvent.setup()
    const onUpdateClassification = vi.fn()
    renderRow({ onUpdateClassification })

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'Unlimited')
    expect(onUpdateClassification).toHaveBeenCalledExactlyOnceWith('item-1', 'Unlimited')
  })

  // ─── Notes button ─────────────────────────────────────

  it('notes button has affordance "Add note" when note is empty', () => {
    renderRow({ note: '' })
    // The button's title attribute carries the note (or "Add note") — assert
    // via the accessible name.
    const btn = screen.getByRole('button', { name: 'Add note' })
    expect(btn).toBeInTheDocument()
  })

  it('notes button surfaces the existing note text as its title when one is set', () => {
    renderRow({ note: 'Save for prog' })
    const btn = screen.getByRole('button', { name: 'Save for prog' })
    expect(btn).toBeInTheDocument()
  })

  it('clicking notes calls onOpenNotes(item, currentNote)', async () => {
    const user = userEvent.setup()
    const onOpenNotes = vi.fn()
    renderRow({ note: 'Existing note', onOpenNotes })

    await user.click(screen.getByRole('button', { name: 'Existing note' }))
    expect(onOpenNotes).toHaveBeenCalledExactlyOnceWith(baseItem, 'Existing note')
  })

  // ─── memo prop stability ──────────────────────────────
  //
  // ItemRow is wrapped in React.memo, which the loot-management refactor
  // relies on so that a single spec edit doesn't re-render every row. The
  // contract: if the same prop references are passed in, the component
  // body should NOT execute again.
  //
  // We verify by counting calls to a sentinel callback (getSpecName) that
  // the body invokes once per render. Two renders with the same props →
  // body should run once. Changing the `note` prop → body re-runs.

  it('does not re-render when all prop references are unchanged', () => {
    // Drive a callback (getConsolidatedSpecNames) that the body invokes via
    // MultiSelectDropdown when specs have content. If memo holds, the second
    // render reuses the prior output and the callback isn't fired again.
    const getConsolidatedSpecNames = vi.fn(() => [{ name: 'Holy Paladin' }])
    const stableProps = {
      ...baseProps,
      specs: { primary: new Set(['paladin-holy']), secondary: new Set<string>() },
      getConsolidatedSpecNames,
    }
    const { rerender } = render(
      <table>
        <tbody>
          <ItemRow {...stableProps} />
        </tbody>
      </table>
    )
    const initialCalls = getConsolidatedSpecNames.mock.calls.length
    expect(initialCalls).toBeGreaterThan(0)

    rerender(
      <table>
        <tbody>
          <ItemRow {...stableProps} />
        </tbody>
      </table>
    )

    // memo skipped the body — same call count.
    expect(getConsolidatedSpecNames.mock.calls.length).toBe(initialCalls)
  })

  it('does re-render when an actual prop value changes (e.g. note string)', () => {
    // ItemRow displays the current note as the button's accessible name —
    // observing the DOM is more robust than counting callback invocations
    // (the row's render doesn't directly invoke any of the function props).
    const { rerender } = render(
      <table>
        <tbody>
          <ItemRow {...baseProps} note="first" />
        </tbody>
      </table>
    )
    expect(screen.getByRole('button', { name: 'first' })).toBeInTheDocument()

    rerender(
      <table>
        <tbody>
          <ItemRow {...baseProps} note="updated" />
        </tbody>
      </table>
    )
    expect(screen.getByRole('button', { name: 'updated' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'first' })).not.toBeInTheDocument()
  })
})
