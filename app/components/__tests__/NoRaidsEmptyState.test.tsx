import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NoRaidsEmptyState } from '../NoRaidsEmptyState'

describe('NoRaidsEmptyState', () => {
  it('renders the approved title and description, with no em dash', () => {
    render(<NoRaidsEmptyState />)

    expect(screen.getByText('No raids yet')).toBeInTheDocument()
    expect(
      screen.getByText('This expansion has no raids open yet. Loot lists and rankings show up here once raids open.')
    ).toBeInTheDocument()

    expect(document.body.textContent).not.toMatch(/—/)
  })

  it('renders no action button', () => {
    render(<NoRaidsEmptyState />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('accepts a size prop and passes it through', () => {
    render(<NoRaidsEmptyState size="lg" />)

    expect(screen.getByText('No raids yet').className).toContain('text-lg')
  })

  it('renders the Classic description when game is explicitly classic', () => {
    render(<NoRaidsEmptyState game="classic" />)

    expect(screen.getByText('No raids yet')).toBeInTheDocument()
    expect(
      screen.getByText('This expansion has no raids open yet. Loot lists and rankings show up here once raids open.')
    ).toBeInTheDocument()
  })

  it('renders the Forever wording for game forever, with no "expansion" and no em dash', () => {
    render(<NoRaidsEmptyState game="forever" />)

    expect(screen.getByText('No raids yet')).toBeInTheDocument()
    expect(
      screen.getByText('WoW Forever has no raids open yet. Loot lists and rankings show up here once raids open.')
    ).toBeInTheDocument()

    expect(document.body.textContent?.toLowerCase()).not.toMatch(/expansion/)
    expect(document.body.textContent).not.toMatch(/—/)
  })
})
