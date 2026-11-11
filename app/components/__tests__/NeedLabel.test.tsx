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

  // UI-SPEC section 6: a clickable need label must read as clickable without
  // looking like an item link.
  it('gives the button hover, focus and alignment classes', () => {
    render(<NeedLabel name="Ring, Physical" onClick={() => {}} />)

    const classes = screen.getByRole('button', { name: 'Ring, Physical' }).className.split(/\s+/)
    for (const expected of [
      'hover:underline',
      'underline-offset-2',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'rounded-sm',
      'text-left',
    ]) {
      expect(classes).toContain(expected)
    }
  })

  it('keeps the span free of hover and focus styling', () => {
    const { container } = render(<NeedLabel name="Ring, Physical" />)

    const span = container.querySelector('[data-need-label]') as HTMLElement
    expect(span.tagName).toBe('SPAN')
    for (const unexpected of ['hover:underline', 'underline-offset-2', 'focus-visible:ring-2', 'text-left']) {
      expect(span.className).not.toContain(unexpected)
    }
  })

  it('never renders an anchor or a Wowhead attribute, with or without onClick', () => {
    const { container } = render(
      <>
        <NeedLabel name="Trinket, Healing" onClick={() => {}} />
        <NeedLabel name="Trinket, Healing" />
      </>,
    )

    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelector('[href]')).toBeNull()
    expect(container.querySelector('[data-wowhead]')).toBeNull()
  })

  it('keeps the name on one line with an ellipsis class, and the icon aria-hidden', () => {
    const { container } = render(<NeedLabel name="Shoulders, Leather, Spell damage" onClick={() => {}} />)

    const name = screen.getByText('Shoulders, Leather, Spell damage')
    expect(name.className).toContain('truncate')
    expect(name.className).toContain('min-w-0')
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders no em dash', () => {
    render(<NeedLabel name="Chest, Plate, Strength" />)

    expect(document.body.textContent).not.toContain(String.fromCharCode(0x2014))
  })
})
