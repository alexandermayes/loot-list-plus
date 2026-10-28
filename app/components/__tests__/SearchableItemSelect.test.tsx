import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchableItemSelect from '../SearchableItemSelect'

// Isolate the select from the wowhead tooltip side-effect and the
// icon-loading ItemLink (which needs ExpansionDataContext).
vi.mock('@/lib/wowhead', () => ({ refreshWowheadTooltips: () => {} }))
vi.mock('../ItemLink', () => ({
  default: ({ name }: { name: string }) => <span>{name}</span>,
}))

const ITEMS = [
  { id: 'i1', name: 'Locked Item', boss_name: 'Test Boss', wowhead_id: 1 },
  { id: 'i2', name: 'Other Item', boss_name: 'Test Boss', wowhead_id: 2 },
]

const TITLE = 'Awarded from this rank on Oct 24, 2026. Locked for this tier.'

describe('SearchableItemSelect lockedTitle', () => {
  it('renders no remove or clear button and shows the lock icon with the title', () => {
    render(<SearchableItemSelect items={ITEMS} value="i1" onChange={vi.fn()} readOnly onRemove={vi.fn()} lockedTitle={TITLE} />)

    expect(screen.queryByRole('button', { name: 'Remove from list' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Clear selection' })).toBeNull()
    const icon = screen.getByRole('img', { name: 'Locked rank' })
    expect(icon.getAttribute('title')).toBe(TITLE)
  })

  it('opens no listbox when the locked cell is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SearchableItemSelect items={ITEMS} value="i1" onChange={onChange} lockedTitle={TITLE} />)

    await user.click(screen.getByRole('combobox'))

    expect(screen.queryByRole('listbox')).toBeNull()
    expect(screen.getByRole('combobox').getAttribute('aria-expanded')).toBe('false')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps the Remove from list button for readOnly with onRemove when no lock title is set', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<SearchableItemSelect items={ITEMS} value="i1" onChange={vi.fn()} readOnly onRemove={onRemove} />)

    await user.click(screen.getByRole('button', { name: 'Remove from list' }))

    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('img', { name: 'Locked rank' })).toBeNull()
  })
})
