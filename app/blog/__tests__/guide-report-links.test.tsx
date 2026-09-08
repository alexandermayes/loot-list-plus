import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, within } from '@testing-library/react'

import LootPriorityListsVsLootCouncil from '../loot-priority-lists-vs-loot-council/page'
import DkpIsDeadWhatClassicGuildsUseIn2026 from '../dkp-is-dead-what-classic-guilds-use-in-2026/page'
import HowToHandleLootDramaWithoutLosingRaiders from '../how-to-handle-loot-drama-without-losing-raiders/page'
import HowToRunLootWithoutASpreadsheet from '../how-to-run-loot-without-a-spreadsheet/page'
import WhyAttendanceTrackingMattersMoreThanLootRules from '../why-attendance-tracking-matters-more-than-loot-rules/page'
import HowToSetUpAFairLootSystemForYourWowGuild from '../how-to-set-up-a-fair-loot-system-for-your-wow-guild/page'
import GuildRecruitmentGuideFindRaidersWhoStay from '../guild-recruitment-guide-find-raiders-who-stay/page'
import HowToOnboardNewRaidersWithoutKillingMorale from '../how-to-onboard-new-raiders-without-killing-morale/page'
import TheOfficerBurnoutProblemAndHowToFixIt from '../the-officer-burnout-problem-and-how-to-fix-it/page'

// jsdom implements neither matchMedia nor IntersectionObserver; LandingNav,
// LandingCTA and LandingFooter (via framer-motion/parallax) call them.
// Mirrored from app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx.
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

const REPORT_PATH = '/research/wow-classic-loot-systems-2026'

// Every post's default export, keyed by slug. Imported directly (not read
// off the sitemap, the post registry, or a rendered route) because the
// assertion below is about what each page actually renders.
const POSTS: Record<string, React.ComponentType> = {
  'loot-priority-lists-vs-loot-council': LootPriorityListsVsLootCouncil,
  'dkp-is-dead-what-classic-guilds-use-in-2026': DkpIsDeadWhatClassicGuildsUseIn2026,
  'how-to-handle-loot-drama-without-losing-raiders': HowToHandleLootDramaWithoutLosingRaiders,
  'how-to-run-loot-without-a-spreadsheet': HowToRunLootWithoutASpreadsheet,
  'why-attendance-tracking-matters-more-than-loot-rules': WhyAttendanceTrackingMattersMoreThanLootRules,
  'how-to-set-up-a-fair-loot-system-for-your-wow-guild': HowToSetUpAFairLootSystemForYourWowGuild,
  'guild-recruitment-guide-find-raiders-who-stay': GuildRecruitmentGuideFindRaidersWhoStay,
  'how-to-onboard-new-raiders-without-killing-morale': HowToOnboardNewRaidersWithoutKillingMorale,
  'the-officer-burnout-problem-and-how-to-fix-it': TheOfficerBurnoutProblemAndHowToFixIt,
}

// LINKED_GUIDES: guides that carry a report link at THIS point in the plan.
// Task 2 (this task) wires the first three, in 05-COPY-DRAFT.md's sign-off
// row order. Task 3 moves the remaining three approved guides here as it
// wires them, so this array grows without the negative list ever
// double-counting a slug.
const LINKED_GUIDES: { slug: string; anchor: string }[] = [
  {
    slug: 'loot-priority-lists-vs-loot-council',
    anchor: 'the median loot list runs 18 items long',
  },
  {
    slug: 'dkp-is-dead-what-classic-guilds-use-in-2026',
    anchor: '29.5% of awarded items go to a top-priority-bracket rank',
  },
  {
    slug: 'how-to-handle-loot-drama-without-losing-raiders',
    anchor: '45.5% turn on bad-luck protection for exactly this reason',
  },
]

// UNLINKED_GUIDES: every guide that renders zero report anchors right now.
// Three of these (the-officer-burnout-problem-and-how-to-fix-it,
// guild-recruitment-guide-find-raiders-who-stay,
// how-to-onboard-new-raiders-without-killing-morale) are permanently
// excluded per 05-COPY-DRAFT.md's D-03 guide subset and never move. The
// other three are approved but not yet wired -- task 3 moves them into
// LINKED_GUIDES.
const UNLINKED_GUIDES: string[] = [
  'how-to-run-loot-without-a-spreadsheet',
  'why-attendance-tracking-matters-more-than-loot-rules',
  'how-to-set-up-a-fair-loot-system-for-your-wow-guild',
  'guild-recruitment-guide-find-raiders-who-stay',
  'how-to-onboard-new-raiders-without-killing-morale',
  'the-officer-burnout-problem-and-how-to-fix-it',
]

function reportLinksIn(container: HTMLElement) {
  return within(container)
    .getAllByRole('link')
    .filter((link) => link.getAttribute('href') === REPORT_PATH)
}

describe('guide-to-report links', () => {
  it('LINKED_GUIDES and UNLINKED_GUIDES together name every one of the nine blog posts', () => {
    const linkedSlugs = LINKED_GUIDES.map((g) => g.slug)
    const combined = [...linkedSlugs, ...UNLINKED_GUIDES].sort()
    expect(combined).toEqual(Object.keys(POSTS).sort())
    expect(new Set(combined).size).toBe(9)
  })

  describe.each(LINKED_GUIDES)('$slug (linked)', ({ slug, anchor }) => {
    it('renders exactly one anchor to the report, with the approved anchor text', () => {
      const Post = POSTS[slug]
      const { container } = render(<Post />)
      const links = reportLinksIn(container)
      expect(links).toHaveLength(1)
      expect(links[0]).toHaveAccessibleName(anchor)
    })

    it('still renders the BlogRelatedPosts cross-linking block', () => {
      const Post = POSTS[slug]
      const { container } = render(<Post />)
      expect(
        within(container).getByRole('heading', { name: 'Keep reading' })
      ).toBeInTheDocument()
    })
  })

  describe.each(UNLINKED_GUIDES)('%s (unlinked)', (slug) => {
    it('renders zero anchors pointing at the report path', () => {
      const Post = POSTS[slug]
      const { container } = render(<Post />)
      expect(reportLinksIn(container)).toHaveLength(0)
    })
  })

  it('no rendered guide contains a generic click-through anchor', () => {
    for (const slug of Object.keys(POSTS)) {
      const Post = POSTS[slug]
      const { container } = render(<Post />)
      const links = within(container).getAllByRole('link')
      for (const link of links) {
        expect((link.textContent ?? '').toLowerCase()).not.toMatch(/learn more|read more/)
      }
    }
  })

  it('no rendered guide contains an anchor pointing at a case-study URL', () => {
    for (const slug of Object.keys(POSTS)) {
      const Post = POSTS[slug]
      const { container } = render(<Post />)
      const links = within(container).getAllByRole('link')
      for (const link of links) {
        expect(link.getAttribute('href') ?? '').not.toMatch(/^\/customers\//)
      }
    }
  })

  it('every approved guide anchor string is non-empty and carries no em dash or curly quote', () => {
    for (const { anchor } of LINKED_GUIDES) {
      expect(anchor.length).toBeGreaterThan(0)
      expect(anchor).not.toMatch(/—/)
      expect(anchor).not.toMatch(/[‘’“”]/)
    }
  })
})
