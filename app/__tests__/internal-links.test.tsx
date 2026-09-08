import type { ComponentType } from 'react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import LandingLootDecision from '../components/landing/LandingLootDecision'
import AboutPage from '../about/page'
import ComparePage from '../compare/page'
import PricingPage from '../pricing/page'
import { metadata as reportMetadata } from '../research/wow-classic-loot-systems-2026/page'

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
  compare: '84.8% of active guilds have changed their attendance weighting from the defaults',
  pricing: 'the median loot list runs 18 items long',
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

  describe('compare (ComparePage)', () => {
    it('links the approved anchor to the report', () => {
      render(<ComparePage />)
      const link = screen.getByRole('link', { name: APPROVED.compare })
      expect(link).toHaveAttribute('href', REPORT_PATH)
    })

    it('carries exactly one link to the report', () => {
      const { container } = render(<ComparePage />)
      expect(reportLinksIn(container)).toHaveLength(1)
    })

    it('still renders its existing Discord anchor with its original href', () => {
      render(<ComparePage />)
      const discordLink = screen.getByRole('link', { name: 'Tell us on Discord' })
      expect(discordLink).toHaveAttribute('href', 'https://discord.gg/JNJewThYAB')
    })
  })

  describe('pricing (PricingPage)', () => {
    it('links the approved anchor to the report', () => {
      render(<PricingPage />)
      const link = screen.getByRole('link', { name: APPROVED.pricing })
      expect(link).toHaveAttribute('href', REPORT_PATH)
    })

    it('carries exactly one link to the report', () => {
      const { container } = render(<PricingPage />)
      expect(reportLinksIn(container)).toHaveLength(1)
    })

    it('still renders both plan cards and both existing call-to-action anchors', () => {
      render(<PricingPage />)
      expect(screen.getByRole('link', { name: 'Create your guild free' })).toHaveAttribute(
        'href',
        'https://www.lootlistplus.com'
      )
      expect(screen.getByRole('link', { name: 'Start free trial' })).toHaveAttribute('href', '/premium')
    })
  })

  describe('cross-page density and safety checks', () => {
    const pages: Array<{ name: string; Component: ComponentType }> = [
      { name: 'homepage', Component: LandingLootDecision },
      { name: 'about', Component: AboutPage },
      { name: 'compare', Component: ComparePage },
      { name: 'pricing', Component: PricingPage },
    ]

    it.each(pages)('$name carries exactly one report-path anchor', ({ Component }) => {
      const { container } = render(<Component />)
      expect(reportLinksIn(container)).toHaveLength(1)
    })

    it('no anchor across the four renders is a generic click-through invitation or a case-study link', () => {
      pages.forEach(({ Component }) => {
        const { container } = render(<Component />)
        const anchors = Array.from(container.querySelectorAll('a'))
        anchors.forEach((a) => {
          expect(a.textContent || '').not.toMatch(GENERIC_ANCHOR_RE)
          expect(a.getAttribute('href') || '').not.toMatch(/^\/customers\//)
        })
      })
    })

    it("no anchor across the four renders repeats the report page's own title", () => {
      pages.forEach(({ Component }) => {
        const { container } = render(<Component />)
        const anchors = Array.from(container.querySelectorAll('a'))
        anchors.forEach((a) => {
          expect((a.textContent || '').trim()).not.toBe(reportMetadata.title)
        })
      })
    })
  })
})
