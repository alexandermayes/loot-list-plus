import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Card, CardContent } from '../card'

// D-06/D-10/D-11: Card's base radius moves from the 8px step (rounded-lg)
// to the 12px step (rounded-xl), and a third variant, "nested", is added
// alongside "default" and "unified". "nested" paints only the app's
// existing divider idiom (border-t border-border) -- no fill, no all-sides
// border, no radius -- with padding passing through via className exactly
// like every other variant, and no sub-component gains a nested-specific
// branch.
describe('Card', () => {
  it('renders the base surface classes with no variant prop: 12px radius, border, border-color token, background token and foreground token', () => {
    const { container } = render(<Card>content</Card>)
    const el = container.firstElementChild as HTMLElement
    expect(el).toHaveClass(
      'rounded-xl',
      'border',
      'border-border',
      'bg-card',
      'text-card-foreground'
    )
  })

  it('variant="unified" renders the same base surface classes plus its existing responsive padding, unchanged from today', () => {
    const { container } = render(<Card variant="unified">content</Card>)
    const el = container.firstElementChild as HTMLElement
    expect(el).toHaveClass(
      'rounded-xl',
      'border',
      'border-border',
      'bg-card',
      'text-card-foreground',
      'p-4',
      'sm:p-6'
    )
  })

  it('variant="nested" renders the top-divider utility and the border-color token, with none of a background utility, a radius utility, or an all-sides border utility', () => {
    const { container } = render(<Card variant="nested">content</Card>)
    const el = container.firstElementChild as HTMLElement
    expect(el).toHaveClass('border-t', 'border-border')
    expect(el.className).not.toMatch(/\bbg-card\b/)
    expect(el.className).not.toMatch(/rounded-/)
    expect(el.className.split(/\s+/)).not.toContain('border')
  })

  it('variant="nested" renders a first-child divider modifier so the parent primitive suppresses its own top divider when nested is the first child, while variant="default" renders no such modifier', () => {
    const { container: nestedContainer } = render(<Card variant="nested">content</Card>)
    const nestedEl = nestedContainer.firstElementChild as HTMLElement
    expect(nestedEl).toHaveClass('first:border-t-0')

    const { container: defaultContainer } = render(<Card>content</Card>)
    const defaultEl = defaultContainer.firstElementChild as HTMLElement
    expect(defaultEl.className.split(/\s+/)).not.toContain('first:border-t-0')
  })

  it('variant="nested" with a className of padding utilities renders those padding utilities, proving padding passes through and the variant imposes none of its own', () => {
    const { container } = render(
      <Card variant="nested" className="p-4 sm:p-6">
        content
      </Card>
    )
    const el = container.firstElementChild as HTMLElement
    expect(el).toHaveClass('p-4', 'sm:p-6')
  })

  it('CardContent inside a variant="nested" parent renders the same classes it renders inside a variant="unified" parent, proving no sub-component gained a nested-specific branch', () => {
    const { container: unifiedContainer } = render(
      <Card variant="unified">
        <CardContent>content</CardContent>
      </Card>
    )
    const { container: nestedContainer } = render(
      <Card variant="nested">
        <CardContent>content</CardContent>
      </Card>
    )
    const unifiedContent = unifiedContainer.firstElementChild
      ?.firstElementChild as HTMLElement
    const nestedContent = nestedContainer.firstElementChild
      ?.firstElementChild as HTMLElement
    expect(nestedContent.className).toBe(unifiedContent.className)
  })
})
