import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NeedLabel } from '../NeedLabel'

describe('NeedLabel', () => {
  it('renders the need name with no link, no tooltip attribute and no Wowhead reference', () => {
    const { container } = render(<NeedLabel name="Trinket, Healing" />)

    expect(screen.getByText('Trinket, Healing')).toBeInTheDocument()
    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelector('[href]')).toBeNull()
    expect(container.querySelector('[data-wowhead]')).toBeNull()
    expect(container.innerHTML.toLowerCase()).not.toContain('wowhead')
  })

  it('renders a button that calls the handler once when given an onClick', () => {
    const onClick = vi.fn()
    render(<NeedLabel name="Ring, Physical" onClick={onClick} />)

    const button = screen.getByRole('button', { name: 'Ring, Physical' })
    fireEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders no button without an onClick', () => {
    render(<NeedLabel name="Ring, Physical" />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders no em dash', () => {
    render(<NeedLabel name="Chest, Plate, Strength" />)

    expect(document.body.textContent).not.toContain(String.fromCharCode(0x2014))
  })
})
