import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import ReserveItemPicker from '../ReserveItemPicker'

// Isolate the picker's selection logic from the wowhead tooltip side-effect
// and the icon-loading ItemLink (which needs ExpansionDataContext).
vi.mock('@/lib/wowhead', () => ({ refreshWowheadTooltips: () => {} }))
vi.mock('../ItemLink', () => ({
  default: ({ name }: { name: string }) => <span>{name}</span>,
}))

const ITEMS = [
  { id: 'i1', name: 'Ashbringer', boss_name: 'Kel Thuzad', item_slot: 'Two-Hand', wowhead_id: 1 },
  { id: 'i2', name: 'Atiesh', boss_name: 'Kel Thuzad', item_slot: 'Main Hand', wowhead_id: 2 },
]

function Harness({
  allowDuplicates,
  max = 5,
  initial = [] as string[],
}: {
  allowDuplicates: boolean
  max?: number
  initial?: string[]
}) {
  const [ids, setIds] = useState<string[]>(initial)
  return (
    <ReserveItemPicker
      items={ITEMS}
      selectedIds={ids}
      onChange={setIds}
      maxSelections={max}
      allowDuplicates={allowDuplicates}
    />
  )
}

// Dropdown rows are role="button" divs that carry aria-disabled; that attribute
// distinguishes them from the badge "Remove" buttons.
function getRow(name: string) {
  const rows = screen
    .getAllByRole('button')
    .filter((el) => el.getAttribute('aria-disabled') !== null)
  const row = rows.find((r) => within(r).queryByText(name))
  if (!row) throw new Error(`No dropdown row found for "${name}"`)
  return row
}

describe('ReserveItemPicker — duplicates', () => {
  it('adds another copy on a second click when duplicates are allowed (regression for #120)', async () => {
    const user = userEvent.setup()
    render(<Harness allowDuplicates />)

    await user.click(getRow('Ashbringer'))
    expect(screen.getByText('1/5 reserves selected')).toBeInTheDocument()

    // Second click must ADD a copy, not toggle the item off.
    await user.click(getRow('Ashbringer'))
    expect(screen.getByText('2/5 reserves selected')).toBeInTheDocument()
    expect(screen.getAllByText('×2').length).toBeGreaterThan(0)
  })

  it('removes a single copy from the badge, leaving the rest', async () => {
    const user = userEvent.setup()
    render(<Harness allowDuplicates initial={['i1', 'i1']} />)
    expect(screen.getByText('2/5 reserves selected')).toBeInTheDocument()

    // With 2 copies the badge label is "Remove one ...".
    await user.click(screen.getByRole('button', { name: /remove one ashbringer/i }))
    expect(screen.getByText('1/5 reserves selected')).toBeInTheDocument()
    expect(screen.queryByText('×2')).not.toBeInTheDocument()
  })

  it('blocks adding past the cap', async () => {
    const user = userEvent.setup()
    render(<Harness allowDuplicates max={1} />)

    await user.click(getRow('Ashbringer'))
    expect(screen.getByText('1/1 reserves selected')).toBeInTheDocument()

    // At the cap every row is disabled — clicking does nothing.
    await user.click(getRow('Ashbringer'))
    expect(screen.getByText('1/1 reserves selected')).toBeInTheDocument()
  })

  it('still toggles off on a second click when duplicates are NOT allowed', async () => {
    const user = userEvent.setup()
    render(<Harness allowDuplicates={false} />)

    await user.click(getRow('Ashbringer'))
    expect(screen.getByText('1/5 reserves selected')).toBeInTheDocument()

    await user.click(getRow('Ashbringer'))
    expect(screen.getByText('0/5 reserves selected')).toBeInTheDocument()
  })
})
