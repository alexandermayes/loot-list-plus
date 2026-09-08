import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render } from '@testing-library/react'
import type { Metadata } from 'next'

import LootPriorityListsVsLootCouncil, {
  metadata as lootPriorityListsVsLootCouncilMetadata,
} from '../blog/loot-priority-lists-vs-loot-council/page'
import DkpIsDeadWhatClassicGuildsUseIn2026, {
  metadata as dkpIsDeadWhatClassicGuildsUseIn2026Metadata,
} from '../blog/dkp-is-dead-what-classic-guilds-use-in-2026/page'
import HowToHandleLootDramaWithoutLosingRaiders, {
  metadata as howToHandleLootDramaWithoutLosingRaidersMetadata,
} from '../blog/how-to-handle-loot-drama-without-losing-raiders/page'
import HowToRunLootWithoutASpreadsheet, {
  metadata as howToRunLootWithoutASpreadsheetMetadata,
} from '../blog/how-to-run-loot-without-a-spreadsheet/page'
import WhyAttendanceTrackingMattersMoreThanLootRules, {
  metadata as whyAttendanceTrackingMattersMoreThanLootRulesMetadata,
} from '../blog/why-attendance-tracking-matters-more-than-loot-rules/page'
import HowToSetUpAFairLootSystemForYourWowGuild, {
  metadata as howToSetUpAFairLootSystemForYourWowGuildMetadata,
} from '../blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page'
import GuildRecruitmentGuideFindRaidersWhoStay, {
  metadata as guildRecruitmentGuideFindRaidersWhoStayMetadata,
} from '../blog/guild-recruitment-guide-find-raiders-who-stay/page'
import HowToOnboardNewRaidersWithoutKillingMorale, {
  metadata as howToOnboardNewRaidersWithoutKillingMoraleMetadata,
} from '../blog/how-to-onboard-new-raiders-without-killing-morale/page'
import TheOfficerBurnoutProblemAndHowToFixIt, {
  metadata as theOfficerBurnoutProblemAndHowToFixItMetadata,
} from '../blog/the-officer-burnout-problem-and-how-to-fix-it/page'

import sitemap from '../sitemap'
import { blogPostDate } from '@/lib/content-dates'

// jsdom implements neither matchMedia nor IntersectionObserver; LandingNav,
// LandingCTA and LandingFooter (via framer-motion/parallax) call them.
// Mirrored from app/blog/__tests__/guide-report-links.test.tsx.
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

function getJsonLdObjects(container: HTMLElement): Record<string, unknown>[] {
  return Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((node) =>
    JSON.parse(node.textContent || '{}')
  )
}

function isoDatePart(iso: string): string {
  return iso.slice(0, 10)
}

function openGraphPublishedTime(metadata: Metadata): string | undefined {
  return (metadata.openGraph as { publishedTime?: string } | undefined)?.publishedTime
}

// Every post's default export and metadata export, keyed by slug. Imported
// directly (not read off the sitemap or a rendered route) because the
// assertion below is about what each page actually renders.
const POSTS: Record<string, { Component: React.ComponentType; metadata: Metadata }> = {
  'loot-priority-lists-vs-loot-council': {
    Component: LootPriorityListsVsLootCouncil,
    metadata: lootPriorityListsVsLootCouncilMetadata,
  },
  'dkp-is-dead-what-classic-guilds-use-in-2026': {
    Component: DkpIsDeadWhatClassicGuildsUseIn2026,
    metadata: dkpIsDeadWhatClassicGuildsUseIn2026Metadata,
  },
  'how-to-handle-loot-drama-without-losing-raiders': {
    Component: HowToHandleLootDramaWithoutLosingRaiders,
    metadata: howToHandleLootDramaWithoutLosingRaidersMetadata,
  },
  'how-to-run-loot-without-a-spreadsheet': {
    Component: HowToRunLootWithoutASpreadsheet,
    metadata: howToRunLootWithoutASpreadsheetMetadata,
  },
  'why-attendance-tracking-matters-more-than-loot-rules': {
    Component: WhyAttendanceTrackingMattersMoreThanLootRules,
    metadata: whyAttendanceTrackingMattersMoreThanLootRulesMetadata,
  },
  'how-to-set-up-a-fair-loot-system-for-your-wow-guild': {
    Component: HowToSetUpAFairLootSystemForYourWowGuild,
    metadata: howToSetUpAFairLootSystemForYourWowGuildMetadata,
  },
  'guild-recruitment-guide-find-raiders-who-stay': {
    Component: GuildRecruitmentGuideFindRaidersWhoStay,
    metadata: guildRecruitmentGuideFindRaidersWhoStayMetadata,
  },
  'how-to-onboard-new-raiders-without-killing-morale': {
    Component: HowToOnboardNewRaidersWithoutKillingMorale,
    metadata: howToOnboardNewRaidersWithoutKillingMoraleMetadata,
  },
  'the-officer-burnout-problem-and-how-to-fix-it': {
    Component: TheOfficerBurnoutProblemAndHowToFixIt,
    metadata: theOfficerBurnoutProblemAndHowToFixItMetadata,
  },
}

// The datePublished (and, before this plan, dateModified) every one of the
// nine posts carried before this milestone. Hardcoded from a read of each
// file at authoring time, so a future accidental edit to a post's
// authorship date is caught against a fixed value, not against the file's
// own current content chasing itself.
const ORIGINAL_DATE: Record<string, string> = {
  'loot-priority-lists-vs-loot-council': '2026-04-28',
  'dkp-is-dead-what-classic-guilds-use-in-2026': '2026-04-02',
  'how-to-handle-loot-drama-without-losing-raiders': '2026-05-07',
  'how-to-run-loot-without-a-spreadsheet': '2026-05-07',
  'why-attendance-tracking-matters-more-than-loot-rules': '2026-03-26',
  'how-to-set-up-a-fair-loot-system-for-your-wow-guild': '2026-03-23',
  'guild-recruitment-guide-find-raiders-who-stay': '2026-05-21',
  'how-to-onboard-new-raiders-without-killing-morale': '2026-04-10',
  'the-officer-burnout-problem-and-how-to-fix-it': '2026-04-19',
}

// All six linked guides, now fully bumped to the module's deploy-two date
// (task 1 bumped the first three, task 2 bumps the remaining three below).
// Following the LINKED_GUIDES/UNLINKED_GUIDES split precedent in
// guide-report-links.test.tsx, so the same invariant (every array below
// always names all nine posts combined) held true at every point across
// this two-task plan, not only at the end.
const BUMPED_SLUGS = [
  'loot-priority-lists-vs-loot-council',
  'dkp-is-dead-what-classic-guilds-use-in-2026',
  'how-to-handle-loot-drama-without-losing-raiders',
  'how-to-run-loot-without-a-spreadsheet',
  'why-attendance-tracking-matters-more-than-loot-rules',
  'how-to-set-up-a-fair-loot-system-for-your-wow-guild',
]

// Empty after task 2: every linked guide is now in BUMPED_SLUGS. Kept as a
// named (empty) array, rather than deleted, so ALL_SLUGS's construction and
// the "names exactly nine slugs" assertion below stay unchanged in shape
// across both tasks.
const NOT_YET_BUMPED_SLUGS: string[] = []

// The three guides this milestone's link sweep never touched. Their module
// date should equal ORIGINAL_DATE for the same slug, proving no false
// freshness bump landed on an untouched page.
const EXCLUDED_SLUGS = [
  'guild-recruitment-guide-find-raiders-who-stay',
  'how-to-onboard-new-raiders-without-killing-morale',
  'the-officer-burnout-problem-and-how-to-fix-it',
]

const ALL_SLUGS = [...BUMPED_SLUGS, ...NOT_YET_BUMPED_SLUGS, ...EXCLUDED_SLUGS]

// Slugs whose structured data is expected to already agree with the
// module at this point in the plan: the bumped linked guides plus the
// three excluded guides. NOT_YET_BUMPED_SLUGS join this list in task 2.
const READY_SLUGS = [...BUMPED_SLUGS, ...EXCLUDED_SLUGS]

describe('blog post date parity', () => {
  it('names exactly nine slugs across BUMPED_SLUGS, NOT_YET_BUMPED_SLUGS and EXCLUDED_SLUGS combined', () => {
    expect([...ALL_SLUGS].sort()).toEqual(Object.keys(POSTS).sort())
    expect(new Set(ALL_SLUGS).size).toBe(9)
    expect(ALL_SLUGS).toHaveLength(9)
  })

  it('fails by name, not silently, for a slug missing from the dates module', () => {
    expect(() => blogPostDate('this-slug-does-not-exist')).toThrowError(/this-slug-does-not-exist/)
  })

  describe.each(READY_SLUGS)('%s', (slug) => {
    it('renders a JSON-LD dateModified matching the dates module', () => {
      const { Component } = POSTS[slug]
      const { container } = render(<Component />)
      const objects = getJsonLdObjects(container)
      const withDateModified = objects.find((obj) => typeof obj.dateModified === 'string')
      expect(withDateModified).toBeDefined()
      const expected = isoDatePart(blogPostDate(slug).toISOString())
      expect(isoDatePart(withDateModified!.dateModified as string)).toBe(expected)
    })

    it('has a sitemap entry whose lastModified agrees with the same module value', () => {
      const entries = sitemap()
      const entry = entries.find((e) => e.url === `https://www.getlootlist.com/blog/${slug}`)
      expect(entry).toBeDefined()
      const expected = isoDatePart(blogPostDate(slug).toISOString())
      expect(isoDatePart((entry!.lastModified as Date).toISOString())).toBe(expected)
    })
  })

  describe.each(ALL_SLUGS)('%s', (slug) => {
    it('renders a JSON-LD datePublished unchanged from before this plan', () => {
      const { Component } = POSTS[slug]
      const { container } = render(<Component />)
      const objects = getJsonLdObjects(container)
      const withDatePublished = objects.find((obj) => typeof obj.datePublished === 'string')
      expect(withDatePublished).toBeDefined()
      expect(isoDatePart(withDatePublished!.datePublished as string)).toBe(ORIGINAL_DATE[slug])
    })

    it('keeps metadata.openGraph.publishedTime consistent with the rendered datePublished', () => {
      const { Component, metadata } = POSTS[slug]
      const { container } = render(<Component />)
      const objects = getJsonLdObjects(container)
      const withDatePublished = objects.find((obj) => typeof obj.datePublished === 'string')
      expect(openGraphPublishedTime(metadata)).toBe(withDatePublished!.datePublished as string)
    })
  })

  describe.each(EXCLUDED_SLUGS)('%s (excluded)', (slug) => {
    it('carries the same date in the module as it carried before this milestone', () => {
      const expected = ORIGINAL_DATE[slug]
      const actual = isoDatePart(blogPostDate(slug).toISOString())
      expect(actual).toBe(expected)
    })
  })

  // LINKED_GUIDE_COUNT is the number of guides 05-05-SUMMARY.md recorded as
  // linked to the research report: 6. Task 1's and this describe.each loop
  // above already prove each named post individually agrees with the
  // module; this case proves the module itself did not quietly redate a
  // post that gained nothing. A post presented to crawlers as freshly
  // modified when nothing a reader can see about it changed is a false
  // freshness signal, which is precisely the thing this dates module
  // exists to stop.
  const LINKED_GUIDE_COUNT = 6

  it('the number of posts whose module date differs from their carried-forward value equals the number of linked guides', () => {
    const redated = ALL_SLUGS.filter(
      (slug) => isoDatePart(blogPostDate(slug).toISOString()) !== ORIGINAL_DATE[slug]
    )
    expect(redated).toHaveLength(LINKED_GUIDE_COUNT)
    expect([...redated].sort()).toEqual([...BUMPED_SLUGS].sort())
  })
})
