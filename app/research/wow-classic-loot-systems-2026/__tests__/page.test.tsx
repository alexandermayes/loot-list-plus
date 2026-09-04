import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import ResearchReportPage, { metadata } from '../page'
import aggregates from '@/public/research/wow-classic-loot-systems-2026-aggregates.json'

// jsdom implements neither matchMedia nor IntersectionObserver; some
// landing components used on this page (via framer-motion/parallax) call
// them. Scoped to this test file per the LandingValueProps.test.tsx
// convention, not global setup.
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

// BlogTracker and LandingNav fire client-side analytics effects; mock the
// client so its effects do not attempt a real network/PostHog call under
// jsdom.
vi.mock('@/utils/analytics/client', () => ({
  trackClientEvent: () => {},
  trackMarketingPageView: () => {},
  trackMarketingCta: () => {},
  getFirstTouchLandingPage: () => null,
}))

function formatWindowDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function getJsonLdObjects(container: HTMLElement) {
  return Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((node) =>
    JSON.parse(node.textContent || '{}')
  )
}

describe('ResearchReportPage', () => {
  it('renders the active_guilds sample number from the committed artifact, not a hardcoded value', () => {
    const { container } = render(<ResearchReportPage />)
    expect(container.textContent).toContain(aggregates.sample.active_guilds.toLocaleString('en-US'))
  })

  it('renders the raid_events, loot_awards, and raiders_with_approved_lists sample numbers', () => {
    const { container } = render(<ResearchReportPage />)
    expect(container.textContent).toContain(aggregates.sample.raid_events.toLocaleString('en-US'))
    expect(container.textContent).toContain(aggregates.sample.loot_awards.toLocaleString('en-US'))
    expect(container.textContent).toContain(aggregates.sample.raiders_with_approved_lists.toLocaleString('en-US'))
  })

  it('renders the window dates as prose and the honest-framing sentence', () => {
    const { container } = render(<ResearchReportPage />)
    expect(container.textContent).toContain(formatWindowDate(aggregates.window.start))
    expect(container.textContent).toContain(formatWindowDate(aggregates.window.end))
    expect(container.textContent).toContain('This is product usage data, not a survey of every WoW guild.')
  })

  it('renders exactly one level-1 heading', () => {
    render(<ResearchReportPage />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('exports a self-canonical metadata URL', () => {
    expect(metadata.alternates?.canonical).toBe('https://www.getlootlist.com/research/wow-classic-loot-systems-2026')
  })

  it('emits Article JSON-LD with the shared Person author id, and a BreadcrumbList', () => {
    const { container } = render(<ResearchReportPage />)
    const objects = getJsonLdObjects(container)

    const article = objects.find((o) => o['@type'] === 'Article')
    expect(article).toBeDefined()
    expect(article.author['@id']).toBe('https://www.getlootlist.com/about#creator')

    const breadcrumb = objects.find((o) => o['@type'] === 'BreadcrumbList')
    expect(breadcrumb).toBeDefined()
  })

  it('never emits Review or AggregateRating structured data', () => {
    const { container } = render(<ResearchReportPage />)
    const objects = getJsonLdObjects(container)

    for (const obj of objects) {
      expect(obj['@type']).not.toBe('Review')
      expect(obj['@type']).not.toBe('AggregateRating')
      expect(obj).not.toHaveProperty('aggregateRating')
    }
  })

  it('the Article JSON-LD headline equals the rendered H1 text', () => {
    const { container } = render(<ResearchReportPage />)
    const objects = getJsonLdObjects(container)
    const article = objects.find((o) => o['@type'] === 'Article')
    const h1 = screen.getByRole('heading', { level: 1 })

    expect(article.headline).toBe(h1.textContent)
  })
})
