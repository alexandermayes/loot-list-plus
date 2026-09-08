import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import LandingLootDecision from '../components/landing/LandingLootDecision'
import AboutPage from '../about/page'

// jsdom implements neither matchMedia nor IntersectionObserver. This file's
// sibling parallax decoration (ParallaxItem -> useMouseParallax) and framer-motion's
// useInView (used by this component itself) call them respectively; without a stub,
// mounting the component throws before any assertion runs. Scoped to this test file,
// not global setup, since no other test in the repo currently mounts this component.
beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }
  if (!('IntersectionObserver' in window)) {
    class MockIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
    ;(window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver
    ;(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver
  }
})

// LandingNav and BlogTracker fire client-side analytics effects; mock the
// client so its effects do not attempt a real network/PostHog call under
// jsdom.
vi.mock('@/utils/analytics/client', () => ({
  trackClientEvent: () => {},
  trackMarketingPageView: () => {},
  trackMarketingCta: () => {},
  getFirstTouchLandingPage: () => null,
}))

const REPORT_PATH = '/research/wow-classic-loot-systems-2026'

// Copied character for character from the APPROVED-STRING lines in
// 05-COPY-DRAFT.md. Hardcoded rather than read from .planning/ at test
// time: a shipped test that reads .planning/ breaks the moment a
// completed milestone's phase directory is archived.
const APPROVED = {
  homepage: '45.5% of active guilds turn on bad-luck protection',
  about: '29.5% of awarded items went to a top-priority-bracket pick',
} as const

const GENERIC_ANCHOR_RE = /learn more|read more/i

function reportLinksIn(container: HTMLElement) {
  return Array.from(container.querySelectorAll('a')).filter(
    (a) => a.getAttribute('href') === REPORT_PATH
  )
}

describe('marketing page contextual links to the research report', () => {
  it('has every approved anchor string non-empty, with no em dash and no curly quotation mark', () => {
    Object.values(APPROVED).forEach((value) => {
      expect(value.length).toBeGreaterThan(0)
      expect(value).not.toContain('—') // em dash
      expect(value).not.toMatch(/[‘’“”]/) // curly quotes
    })
  })

  describe('homepage (LandingLootDecision)', () => {
    it('links the approved anchor to the report', () => {
      render(<LandingLootDecision />)
      const link = screen.getByRole('link', { name: APPROVED.homepage })
      expect(link).toHaveAttribute('href', REPORT_PATH)
    })

    it('carries exactly one link to the report', () => {
      const { container } = render(<LandingLootDecision />)
      expect(reportLinksIn(container)).toHaveLength(1)
    })

    it('still renders its existing heading and three candidate rows', () => {
      const { container } = render(<LandingLootDecision />)
      expect(container.textContent).toContain('When an item drops, the decision is already')
      expect(container.textContent).toContain('explainable')
      expect(screen.getByText('Thorgrim')).toBeTruthy()
      expect(screen.getByText('Kregor')).toBeTruthy()
      expect(screen.getByText('Sylvara')).toBeTruthy()
    })

    it('adds no generic click-through anchor and no case-study link', () => {
      const { container } = render(<LandingLootDecision />)
      const anchors = Array.from(container.querySelectorAll('a'))
      anchors.forEach((a) => {
        expect(a.textContent || '').not.toMatch(GENERIC_ANCHOR_RE)
        expect(a.getAttribute('href') || '').not.toMatch(/^\/customers\//)
      })
    })
  })

  describe('about (AboutPage)', () => {
    it('links the approved anchor to the report', () => {
      render(<AboutPage />)
      const link = screen.getByRole('link', { name: APPROVED.about })
      expect(link).toHaveAttribute('href', REPORT_PATH)
    })

    it('carries exactly one link to the report', () => {
      const { container } = render(<AboutPage />)
      expect(reportLinksIn(container)).toHaveLength(1)
    })

    it('still renders its level-1 heading exactly once', () => {
      render(<AboutPage />)
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    })

    it('adds no generic click-through anchor and no case-study link', () => {
      const { container } = render(<AboutPage />)
      const anchors = Array.from(container.querySelectorAll('a'))
      anchors.forEach((a) => {
        expect(a.textContent || '').not.toMatch(GENERIC_ANCHOR_RE)
        expect(a.getAttribute('href') || '').not.toMatch(/^\/customers\//)
      })
    })
  })
})
