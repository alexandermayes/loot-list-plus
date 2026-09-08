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

// LINKED_GUIDES: all six approved guides from 05-COPY-DRAFT.md's D-03 guide
// subset, each carrying exactly one report anchor with the approved anchor
// text (copied character for character from the sign-off table).
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
  {
    slug: 'how-to-run-loot-without-a-spreadsheet',
    anchor: '84.8% of active guilds run attendance settings that differ from the defaults',
  },
  {
    slug: 'why-attendance-tracking-matters-more-than-loot-rules',
    anchor: 'how 84.8% of active guilds tune their attendance weighting',
  },
  {
    slug: 'how-to-set-up-a-fair-loot-system-for-your-wow-guild',
    anchor: 'raiders rank lists that run a median of 18 items long',
  },
]

// UNLINKED_GUIDES: the three guides 05-COPY-DRAFT.md's D-03 guide subset
// permanently excludes -- recruitment and onboarding content, plus the
// officer-burnout guide the sign-off confirmed no-link. These render zero
// report anchors and never move into LINKED_GUIDES.
const UNLINKED_GUIDES: string[] = [
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

  // Split per-slug (rather than one test looping over all nine renders) so
  // a single slow render under CPU load times out its own small test
  // instead of the default 5000ms budget being spent across all nine.
  it.each(Object.keys(POSTS))('%s renders no generic click-through anchor', (slug) => {
    const Post = POSTS[slug]
    const { container } = render(<Post />)
    const links = within(container).getAllByRole('link')
    for (const link of links) {
      expect((link.textContent ?? '').toLowerCase()).not.toMatch(/learn more|read more/)
    }
  })

  it.each(Object.keys(POSTS))('%s renders no anchor pointing at a case-study URL', (slug) => {
    const Post = POSTS[slug]
    const { container } = render(<Post />)
    const links = within(container).getAllByRole('link')
    for (const link of links) {
      expect(link.getAttribute('href') ?? '').not.toMatch(/^\/customers\//)
    }
  })

  it('every approved guide anchor string is non-empty and carries no em dash or curly quote', () => {
    for (const { anchor } of LINKED_GUIDES) {
      expect(anchor.length).toBeGreaterThan(0)
      expect(anchor).not.toMatch(/—/)
      expect(anchor).not.toMatch(/[‘’“”]/)
    }
  })

  // Task 2's per-slug cases (above) prove each named guide is right. This
  // proves no unnamed guide slipped in, which a per-slug loop cannot see:
  // count every post that renders a report anchor and require it to equal
  // LINKED_GUIDES.length exactly, no more and no less. Explicit timeout
  // (rather than the 5000ms default) since this renders all nine posts in
  // one test.
  it(
    'the number of posts carrying a report link equals LINKED_GUIDES.length exactly',
    () => {
      const linkedCount = Object.entries(POSTS).filter(([, Post]) => {
        const { container } = render(<Post />)
        return reportLinksIn(container).length > 0
      }).length
      expect(linkedCount).toBe(LINKED_GUIDES.length)
    },
    15000
  )
})
