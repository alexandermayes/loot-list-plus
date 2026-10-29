import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// The real module is a 190KB icon map; the lazy import only needs to resolve.
vi.mock('@/data/item-icons', () => ({
  getItemIconUrl: () => null,
}))

import ItemLink from '../ItemLink'

describe('ItemLink render', () => {
  it('renders a need row (null wowheadId) as a label with no link or Wowhead attribute', () => {
    const { container } = render(<ItemLink name="Chest, Plate, Strength" wowheadId={null} />)

    expect(screen.getByText('Chest, Plate, Strength')).toBeInTheDocument()
    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelector('[data-wowhead]')).toBeNull()
    expect(container.innerHTML.toLowerCase()).not.toContain('wowhead')
    expect(container.innerHTML).not.toContain('item=null')
  })

  it('treats an undefined wowheadId like a need row', () => {
    const { container } = render(
      // A caller reading a nullable DB column can hand over undefined at runtime.
      <ItemLink name="Ring, Tank" wowheadId={undefined as unknown as null} />
    )

    expect(screen.getByText('Ring, Tank')).toBeInTheDocument()
    expect(container.querySelector('a')).toBeNull()
  })

  it('keeps the click handler on a need row', () => {
    const onClick = vi.fn()
    render(<ItemLink name="Ring, Tank" wowheadId={null} onClick={onClick} />)

    fireEvent.click(screen.getByRole('button', { name: 'Ring, Tank' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders a real item exactly as the Wowhead anchor it always was', () => {
    const { container } = render(<ItemLink name="Some Sword" wowheadId={19019} domain="classic" />)

    const anchor = container.querySelector('a')
    expect(anchor).not.toBeNull()
    expect(anchor!.getAttribute('href')).toBe('https://www.wowhead.com/classic/item=19019')
    expect(anchor!.getAttribute('data-wowhead')).toBe('item=19019&domain=classic')
    expect(anchor!.getAttribute('target')).toBe('_blank')
    expect(anchor!.getAttribute('rel')).toBe('noopener noreferrer')
    expect(anchor).toHaveTextContent('Some Sword')
  })

  it('calls onClick for a real item and prevents navigation', () => {
    const onClick = vi.fn()
    const { container } = render(<ItemLink name="Some Sword" wowheadId={19019} domain="classic" onClick={onClick} />)

    fireEvent.click(container.querySelector('a')!)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders no em dash for a need row', () => {
    render(<ItemLink name="Trinket, Healing" wowheadId={null} />)

    expect(document.body.textContent).not.toContain(String.fromCharCode(0x2014))
  })
})
