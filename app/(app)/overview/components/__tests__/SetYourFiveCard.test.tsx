import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { SetYourFiveCard, discoveryListStatus, shouldShowSetYourFiveCard } from '@/app/(app)/overview/components/SetYourFiveCard'
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

describe('discoveryListStatus', () => {
  const discoveryTiers = [
    { phase: 1, list_mode: 'discovery' },
    { phase: 1, list_mode: 'discovery' },
  ]
  const read = { tiersError: false, submissionsError: false, currentPhase: 1 }

  it('has no Discovery tier for a guild whose tiers are all Known', () => {
    const result = discoveryListStatus({ tiers: [{ phase: 1, list_mode: 'known' }], submissions: [], ...read })

    expect(result.hasDiscoveryTier).toBe(false)
  })

  it('reports no submission when the character has no list in a Discovery phase', () => {
    expect(discoveryListStatus({ tiers: discoveryTiers, submissions: [], ...read })).toEqual({
      hasDiscoveryTier: true,
      statusError: false,
      submissionStatus: null,
    })
  })

  it('reports a draft when the only list in a Discovery phase is a draft', () => {
    const result = discoveryListStatus({ tiers: discoveryTiers, submissions: [{ phase: 1, status: 'draft' }], ...read })

    expect(result.submissionStatus).toBe('draft')
  })

  it('reports the submitted status when a draft sits beside a submitted list', () => {
    const result = discoveryListStatus({
      tiers: discoveryTiers,
      submissions: [
        { phase: 1, status: 'draft' },
        { phase: 1, status: 'pending' },
      ],
      ...read,
    })

    expect(result.submissionStatus).toBe('pending')
  })

  it('ignores lists in phases that have no Discovery tier', () => {
    const result = discoveryListStatus({
      tiers: [...discoveryTiers, { phase: 2, list_mode: 'known' }],
      submissions: [{ phase: 2, status: 'approved' }],
      ...read,
    })

    expect(result.submissionStatus).toBeNull()
  })

  it.each([
    ['the tier read', { tiersError: true, submissionsError: false }],
    ['the submission read', { tiersError: false, submissionsError: true }],
  ])('flags an error when %s failed', (_label, errors) => {
    expect(discoveryListStatus({ tiers: null, submissions: null, currentPhase: 1, ...errors }).statusError).toBe(true)
  })

  // regression for WR-07 (Phase 4 review): the tier read spans every phase,
  // so a Discovery tier in a phase the raider cannot open yet asked for a
  // list that could not exist and linked to the wrong editor.
  describe('locked phases', () => {
    it('does not count a Discovery tier in a phase above the current one', () => {
      const result = discoveryListStatus({
        tiers: [{ phase: 1, list_mode: 'known' }, { phase: 2, list_mode: 'discovery' }],
        submissions: [],
        ...read,
      })

      expect(result).toEqual({ hasDiscoveryTier: false, statusError: false, submissionStatus: null })
    })

    it('counts a Discovery tier once its phase is unlocked', () => {
      const tiers = [{ phase: 1, list_mode: 'known' }, { phase: 2, list_mode: 'discovery' }]

      expect(discoveryListStatus({ tiers, submissions: [], ...read, currentPhase: 2 }).hasDiscoveryTier).toBe(true)
    })

    it('ignores a list in a locked Discovery phase when judging the status', () => {
      const result = discoveryListStatus({
        tiers: [{ phase: 1, list_mode: 'discovery' }, { phase: 2, list_mode: 'discovery' }],
        submissions: [{ phase: 2, status: 'approved' }],
        ...read,
      })

      expect(result).toEqual({ hasDiscoveryTier: true, statusError: false, submissionStatus: null })
    })

    it('reads a missing current phase as phase 1, like the tier list endpoint', () => {
      const tiers = [{ phase: 1, list_mode: 'discovery' }, { phase: 2, list_mode: 'discovery' }]
      const result = discoveryListStatus({ tiers, submissions: [{ phase: 2, status: 'pending' }], ...read, currentPhase: null })

      expect(result).toEqual({ hasDiscoveryTier: true, statusError: false, submissionStatus: null })
    })

    it('never counts a tier without a phase', () => {
      expect(discoveryListStatus({ tiers: [{ phase: null, list_mode: 'discovery' }], submissions: [], ...read }).hasDiscoveryTier).toBe(false)
    })
  })
})
