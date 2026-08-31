import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginPage from '../LoginPage'

// Isolate the rendered copy from real OAuth/analytics side effects.
// createBrowserClient throws without NEXT_PUBLIC_SUPABASE_* env vars in this
// test environment, so createClient is mocked to a no-op stub.
vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: () => Promise.resolve({ data: null, error: null }),
    },
  }),
}))

vi.mock('@/utils/analytics/client', () => ({
  trackClientEvent: () => {},
  getFirstTouchLandingPage: () => null,
}))

// Approved copy from 02-COPY-DRAFT.md, Section A, "Approved" subsection.
// Copied verbatim (byte for byte) at execution time, do not reword here.
const APPROVED = {
  h1: 'Fair loot decisions, out of the spreadsheet.',
  body: 'Connect with Discord to create your guild or join one you have already been invited to. Core features are free.',
  cta: 'Continue with Discord',
  secondaryText: 'See how it works',
  secondaryHref: 'https://www.getlootlist.com/#how-it-works',
}

describe('LoginPage, approved signup copy (COPY-01)', () => {
  it('renders the approved H1', () => {
    render(<LoginPage />)
    expect(screen.getByRole('heading', { level: 1, name: APPROVED.h1 })).toBeInTheDocument()
  })

  it('renders the approved body copy', () => {
    render(<LoginPage />)
    expect(screen.getByText(APPROVED.body)).toBeInTheDocument()
  })

  it('renders the approved primary CTA', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: new RegExp(APPROVED.cta) })).toBeInTheDocument()
  })

  it('renders the approved secondary link text pointing at the absolute cross-domain href', () => {
    render(<LoginPage />)
    const link = screen.getByRole('link', { name: APPROVED.secondaryText })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', APPROVED.secondaryHref)
  })

  it('never regresses the secondary link to a relative path (D-08)', () => {
    render(<LoginPage />)
    const link = screen.getByRole('link', { name: APPROVED.secondaryText })
    expect(link.getAttribute('href')).toMatch(/^https:\/\//)
  })
})
