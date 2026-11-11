import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { SetYourFiveCard, shouldShowSetYourFiveCard } from '@/app/(app)/overview/components/SetYourFiveCard'
import { SET_YOUR_FIVE_BODY, SET_YOUR_FIVE_CTA, SET_YOUR_FIVE_TITLE } from '@/domain/loot/set-your-five'

describe('SetYourFiveCard', () => {
  it('shows the shared title and body and a primary link to the picker', () => {
    render(<SetYourFiveCard />)

    expect(screen.getByRole('heading', { name: SET_YOUR_FIVE_TITLE })).toBeInTheDocument()
    expect(screen.getByText(SET_YOUR_FIVE_BODY)).toBeInTheDocument()

    const link = screen.getByRole('link', { name: SET_YOUR_FIVE_CTA })
    expect(link).toHaveAttribute('href', '/loot-list?picker=1')
    expect(link.className).toContain('bg-primary')
  })

  it('takes a different href when one is passed', () => {
    render(<SetYourFiveCard href="/loot-list?picker=1&guild=x" />)

    expect(screen.getByRole('link', { name: SET_YOUR_FIVE_CTA })).toHaveAttribute('href', '/loot-list?picker=1&guild=x')
  })

  it('has no dismiss control: the only interactive element is the link', () => {
    render(<SetYourFiveCard />)

    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('stacks the chip, text and button on a phone and puts them in a row from 640px', () => {
    const { container } = render(<SetYourFiveCard />)

    const row = container.querySelector('.sm\\:flex-row')
    expect(row).not.toBeNull()
    expect(row?.className).toContain('flex-col')
    const link = screen.getByRole('link', { name: SET_YOUR_FIVE_CTA })
    expect(link.className).toContain('w-full')
    expect(link.className).toContain('sm:w-auto')
  })

  it('marks the decorative chip icon as hidden from assistive tech', () => {
    const { container } = render(<SetYourFiveCard />)

    const chip = container.querySelector('.bg-accent\\/10')
    expect(chip).not.toBeNull()
    expect(chip?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('shouldShowSetYourFiveCard', () => {
  const base = { hasDiscoveryTier: true, statusLoaded: true, statusError: false }

  it.each([
    ['no submission', null],
    ['only a draft', 'draft'],
  ])('shows the card for %s', (_label, submissionStatus) => {
    expect(shouldShowSetYourFiveCard({ ...base, submissionStatus })).toBe(true)
  })

  it.each(['pending', 'approved', 'needs_revision', 'rejected'])('hides the card once the list is %s', (submissionStatus) => {
    expect(shouldShowSetYourFiveCard({ ...base, submissionStatus })).toBe(false)
  })

  it('hides the card for a guild with no guild-active Discovery tier', () => {
    expect(shouldShowSetYourFiveCard({ ...base, hasDiscoveryTier: false, submissionStatus: null })).toBe(false)
  })

  it('renders nothing before the list status has loaded, so there is no loading flash', () => {
    expect(shouldShowSetYourFiveCard({ ...base, statusLoaded: false, submissionStatus: null })).toBe(false)
  })

  it('renders nothing when the status read failed', () => {
    expect(shouldShowSetYourFiveCard({ ...base, statusError: true, submissionStatus: null })).toBe(false)
  })

  it('treats an unknown status as already submitted rather than nagging', () => {
    expect(shouldShowSetYourFiveCard({ ...base, submissionStatus: 'something_new' })).toBe(false)
  })
})
