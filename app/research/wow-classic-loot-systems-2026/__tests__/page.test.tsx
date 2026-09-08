import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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

// Mirrors page.tsx's own token map: every value is read off the imported
// artifact, never a hand-typed numeral, so a page that hardcodes a value
// (rather than binding it to the artifact) fails these assertions.
const TOKENS: Record<string, string> = {
  window_start: formatWindowDate(aggregates.window.start),
  window_end: formatWindowDate(aggregates.window.end),
  sample_active_guilds: aggregates.sample.active_guilds.toLocaleString('en-US'),
  sample_raid_events: aggregates.sample.raid_events.toLocaleString('en-US'),
  sample_loot_awards: aggregates.sample.loot_awards.toLocaleString('en-US'),
  sample_raiders: aggregates.sample.raiders_with_approved_lists.toLocaleString('en-US'),
  guild_floor: aggregates.guild_floor.toLocaleString('en-US'),
  finding_median_list_length_value: aggregates.findings[0].display,
  finding_median_list_length_denominator: aggregates.findings[0].denominator.toLocaleString('en-US'),
  finding_attendance_weighting_value: aggregates.findings[1].display,
  finding_attendance_weighting_denominator: aggregates.findings[1].denominator.toLocaleString('en-US'),
  finding_blp_usage_value: aggregates.findings[2].display,
  finding_blp_usage_denominator: aggregates.findings[2].denominator.toLocaleString('en-US'),
  finding_top_priority_bracket_value: aggregates.findings[3].display,
  finding_top_priority_bracket_denominator: aggregates.findings[3].denominator.toLocaleString('en-US'),
}

function resolveTokens(template: string): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    if (!(key in TOKENS)) throw new Error(`Test fixture missing token {${key}}`)
    return TOKENS[key]
  })
}

// The 03-COPY-DRAFT.md APPROVED-STRING values this test asserts against,
// reproduced here (not imported from page.tsx) so this suite proves the
// rendered output independently of how the page module happens to be
// implemented internally. Byte-for-byte parity against the actual .md file
// is separately enforced by the plan's own gate-2 grep script, run outside
// vitest.
const APPROVED: Record<string, string> = {
  'page.title': 'How WoW Classic Guilds Actually Run Loot in 2026: Data from {sample_active_guilds} Guilds',
  'page.h1': 'How WoW Classic Guilds Actually Run Loot: Data from {sample_active_guilds} Guilds',
  'page.eyebrow': 'Research',
  'page.standfirst':
    'An inside look at how {sample_active_guilds} World of Warcraft Classic guilds actually run loot: what raiders rank, how guilds weight attendance, how often bad-luck protection is on, and how often the top of the list wins the item.',
  'page.breadcrumb-label': 'Research',
  'page.byline': 'By Zev, creator of LootList+',
  'page.read-time': '7 min read',
  'opening.paragraph-1':
    'Between {window_start} and {window_end}, {sample_active_guilds} active guilds used LootList+ to manage {sample_raid_events} raid events and {sample_loot_awards} loot awards across {sample_raiders} raiders with approved lists. We looked at aggregated, anonymized activity to see how these guilds balance wishlist rank, attendance, bad-luck protection, and officer judgment. No player or guild names are included in the dataset.',
  'opening.paragraph-2':
    'This is product usage data, not a survey of every WoW guild. It shows how guilds using a transparent, list-based system behave in practice.',
  'methodology.h2': 'Methodology',
  'methodology.window':
    'This report uses a fixed calendar window, {window_start} through {window_end}, not a window that moves forward with the calendar. The dates are locked in place, and the data page states when its numbers were generated. A list that an officer reviews again after the window closes moves out of the window under the definition above, so a fresh run reflects the data as it stands at run time.',
  'methodology.active-guild':
    "A guild counts as active in this window if it had at least one raid event that was not marked skipped, or at least one loot award, or at least five approved loot lists. A raid marked skipped in the scheduler does not count toward activity. A loot list counts as approved as of whichever timestamp exists: an officer's review, or, if no review was ever logged, the raider's own submission time.",
  'methodology.raider':
    'Raiders are counted as distinct characters holding an approved loot list in the window. This is a character count, not a person count: a player who raids on two characters, each with an approved list, is counted twice.',
  'methodology.expansion':
    'Where a guild had qualifying activity in more than one expansion during the window, it is counted in every expansion it was active in, not just one. That means an expansion-by-expansion breakdown can add up to more than the whole, by design, and the report says so wherever such a breakdown appears.',
  'methodology.floor':
    'Every number in this report represents at least {guild_floor} guilds. Where a segment would fall under that floor on its own, it is folded into an "Other" row rather than published on its own, so no individual guild can be identified by process of elimination.',
  'methodology.rounding': 'Percentages and medians in this report are rounded to one decimal place, rounding half up.',
  'methodology.absences':
    'This report does not publish four measures the original plan recommended. A breakdown of active guilds by expansion is withheld because even after merging small segments into an "Other" row, that merged row itself falls under our guild-privacy floor, so it cannot be published without risking identifying a specific guild. Median time from guild creation to a qualified setup, and median time from a qualified setup to activation, are both withheld because the timestamps needed to measure them only started being recorded shortly before this window closed, leaving almost no guild in the window with a reliable timestamp for either milestone. A self-reported measure of officer time saved per week is not published because no survey of that kind has ever been run; the original plan calls for self-reported figures to be kept separate from behavioral data, and we have none to report. No other candidate metric was declined: every measure that could be computed accurately and safely within this window was published above.',
  'downloads.h2': 'Get the data',
  'downloads.csv-label': 'Download the aggregates as CSV',
  'downloads.json-label': 'Download the aggregates as JSON',
  'cta.heading': 'See how the same rules work with your roster.',
  'cta.body': 'Create a free guild, import your raiders, and compare the priority order before your next raid night.',
  'cta.button': 'Create your guild free',
}

const FINDING_APPROVED: Record<string, Record<string, string>> = {
  'median-list-length': {
    h2: 'Raiders keep long, ranked wishlists, not short top-five picks',
    'number-sentence':
      'The median approved loot list held {finding_median_list_length_value} items, measured across {finding_median_list_length_denominator} approved lists in the window.',
    'officer-meaning':
      'If you are used to thinking of a raider\'s list as "their five or six BiS items," this is bigger than that. A typical approved list ranks well past the obvious wishlist items, which means loot decisions for an officer are rarely a two-item choice. Knowing the fuller list matters for items well outside anyone\'s top pick.',
    limits:
      'This counts only the items still on a list at the end of the window, not everything a raider ever typed in. A raider who ranked forty items and later trimmed the list down keeps the length they ended up with, not the length they started with, so this number reflects a maintained list, not a first draft.',
    'callout-label': 'median items per approved list',
  },
  'attendance-weighting': {
    h2: "Most guilds don't leave attendance scoring on the default settings",
    'number-sentence':
      '{finding_attendance_weighting_value}% of the {finding_attendance_weighting_denominator} active guilds measured had changed at least one attendance-scoring setting away from what LootList+ ships by default.',
    'officer-meaning':
      "Attendance scoring is on for every guild out of the box, so the interesting question isn't whether guilds track attendance, it's whether the default weighting fits how a specific guild actually runs raids. Most guilds we measured went in and adjusted it, which suggests the shipped defaults are a reasonable starting point for a new guild, not a setting most officers should assume is already tuned for them.",
    limits:
      "This does not measure whether a guild tracks attendance. Attendance scoring is on by default for every guild, with a nonzero bonus, so a simple presence check would say nearly everyone tracks it and would tell you nothing useful. What this measures instead is whether a guild's attendance configuration differs from the shipped defaults on at least one setting, which is a narrower and more honest question about active tuning, not passive presence.",
    'callout-label': 'of active guilds tuned attendance away from the default',
  },
  'blp-usage': {
    h2: 'Bad-luck protection is common, but far from universal',
    'number-sentence': '{finding_blp_usage_value}% of the {finding_blp_usage_denominator} active guilds measured had bad-luck protection turned on.',
    'officer-meaning':
      'Roughly half of active guilds run without bad-luck protection at all, so if your guild has been debating whether to turn it on, you are not choosing between "everyone does this" and "no one does this." Either choice puts you alongside a large, normal group of other guilds.',
    limits:
      'This only tells you whether the setting is switched on, not how any guild has it tuned, and it says nothing about how often bad-luck protection actually changed who won an item during the window. A guild with the setting on and a guild with it off could both be running loot fairly; this number describes a configuration choice, not an outcome.',
    'callout-label': 'of active guilds using bad-luck protection',
  },
  'top-priority-bracket': {
    h2: 'About three in ten drops go to someone whose list already had it at the top',
    'number-sentence':
      '{finding_top_priority_bracket_value}% of the {finding_top_priority_bracket_denominator} awarded items with a determinable prior rank went to a raider whose list already ranked that item in the top priority bracket.',
    'officer-meaning':
      "A meaningful share of loot decisions land exactly where the list said they should: at the top. That is a useful gut-check for an officer weighing a close call between two raiders. It does not mean every award goes to the top of someone's list, so this number is a baseline for \"how often does the list agree with the outcome,\" not a claim that the system always hands the item to the top-ranked raider.",
    limits:
      'This share only covers awards where the winner had a usable snapshot of their list from before the raid, and where the awarded item could be found on that snapshot with a determinable rank. An award without a usable prior snapshot or without a determinable rank is left out of both the numerator and the denominator here, it is not counted as a miss. "Top priority bracket" is a fixed rank range built into LootList+ itself, the same for every guild; it is not a setting any guild configures.',
    'callout-label': 'of ranked awards landed in the top bracket',
  },
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

  describe('page frame and opening copy (approved strings)', () => {
    it('renders the approved H1 with the guild-count token resolved, and it differs from the approved title', () => {
      render(<ResearchReportPage />)
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1.textContent).toBe(resolveTokens(APPROVED['page.h1']))
      expect(metadata.title).toBe(resolveTokens(APPROVED['page.title']))
      expect(h1.textContent).not.toBe(metadata.title)
    })

    it('renders the approved eyebrow, standfirst, byline, and read-time', () => {
      const { container } = render(<ResearchReportPage />)
      expect(container.textContent).toContain(APPROVED['page.eyebrow'])
      expect(container.textContent).toContain(resolveTokens(APPROVED['page.standfirst']))
      expect(container.textContent).toContain(APPROVED['page.byline'])
      expect(container.textContent).toContain(APPROVED['page.read-time'])
    })

    it('links the byline "Zev" to /about', () => {
      render(<ResearchReportPage />)
      const zevLink = screen.getByRole('link', { name: 'Zev' })
      expect(zevLink).toHaveAttribute('href', '/about')
    })

    it('renders the approved opening paragraphs with every token resolved', () => {
      const { container } = render(<ResearchReportPage />)
      expect(container.textContent).toContain(resolveTokens(APPROVED['opening.paragraph-1']))
      expect(container.textContent).toContain(resolveTokens(APPROVED['opening.paragraph-2']))
    })
  })

  describe('findings', () => {
    it('renders one H2 per finding, and the article H2 count equals findings + methodology + downloads', () => {
      const { container } = render(<ResearchReportPage />)
      // Scoped to <article>: the generic bottom LandingCTA marketing
      // section (outside the article, unrelated to this report) carries
      // its own H2 ("A better way to run loot.") that this count must not
      // include.
      const article = container.querySelector('article') as HTMLElement
      const h2s = within(article).getAllByRole('heading', { level: 2 })
      expect(h2s).toHaveLength(aggregates.findings.length + 2)
      for (const finding of aggregates.findings) {
        const expectedH2 = FINDING_APPROVED[finding.metric_id].h2
        expect(h2s.some((h) => h.textContent === expectedH2)).toBe(true)
      }
    })

    it('renders all four parts of every finding: number sentence, officer-meaning, limits', () => {
      const { container } = render(<ResearchReportPage />)
      for (const finding of aggregates.findings) {
        const copy = FINDING_APPROVED[finding.metric_id]
        expect(container.textContent).toContain(resolveTokens(copy['number-sentence']))
        expect(container.textContent).toContain(copy['officer-meaning'])
        expect(container.textContent).toContain(copy.limits)
      }
    })

    it('renders a stat callout with the display value and the approved callout label for every finding', () => {
      const { container } = render(<ResearchReportPage />)
      for (const finding of aggregates.findings) {
        expect(container.textContent).toContain(finding.display)
        expect(container.textContent).toContain(FINDING_APPROVED[finding.metric_id]['callout-label'])
      }
    })

    it('renders a table with one row per segment for every breakdown finding, in artifact order', () => {
      const { container } = render(<ResearchReportPage />)
      const breakdowns = aggregates.findings.filter((f) => (f.segments ?? []).length > 0)
      // The current artifact publishes zero breakdown findings (all four
      // selected findings carry `segments: []`); this loop is written to
      // hold for a future artifact that does, without asserting anything
      // false about today's data.
      for (const finding of breakdowns) {
        const table = container.querySelector(`table`)
        expect(table).not.toBeNull()
        const rows = within(table as HTMLTableElement).getAllByRole('row').slice(1)
        expect(rows).toHaveLength(finding.segments.length)
      }
    })

    it('renders every "Other" segment row with the same class list as a sibling row, no asterisk or footnote', () => {
      const { container } = render(<ResearchReportPage />)
      const breakdowns = aggregates.findings.filter((f) => (f.segments ?? []).length > 0)
      for (const finding of breakdowns) {
        const otherIndex = finding.segments.findIndex((s: { segment: string }) => s.segment === 'Other')
        if (otherIndex === -1) continue
        const table = container.querySelector('table') as HTMLTableElement
        const rows = within(table).getAllByRole('row').slice(1)
        const otherRow = rows[otherIndex]
        const siblingRow = rows[otherIndex === 0 ? 1 : 0]
        expect(otherRow.className).toBe(siblingRow.className)
        expect(otherRow.textContent).not.toMatch(/[*†]/)
      }
    })

    it('wraps every table in a horizontally scrollable overflow-x-auto container', () => {
      const { container } = render(<ResearchReportPage />)
      const tables = container.querySelectorAll('table')
      tables.forEach((table) => {
        expect(table.closest('.overflow-x-auto')).not.toBeNull()
      })
    })

    it('never truncates or line-clamps any rendered element', () => {
      const { container } = render(<ResearchReportPage />)
      expect(container.querySelectorAll('[class*="line-clamp"]').length).toBe(0)
      expect(container.querySelectorAll('[class*="truncate"]').length).toBe(0)
    })
  })

  describe('methodology, downloads, and the contextual CTA', () => {
    it('renders every approved methodology string with tokens resolved', () => {
      const { container } = render(<ResearchReportPage />)
      const keys = [
        'methodology.h2',
        'methodology.window',
        'methodology.active-guild',
        'methodology.raider',
        'methodology.expansion',
        'methodology.floor',
        'methodology.rounding',
        'methodology.absences',
      ]
      for (const key of keys) {
        expect(container.textContent).toContain(resolveTokens(APPROVED[key]))
      }
    })

    it('renders the methodology window dates and guild floor from the imported artifact', () => {
      const { container } = render(<ResearchReportPage />)
      expect(container.textContent).toContain(formatWindowDate(aggregates.window.start))
      expect(container.textContent).toContain(formatWindowDate(aggregates.window.end))
      expect(container.textContent).toContain(String(aggregates.guild_floor))
    })

    it('names every withheld metric from the artifact unavailable array, with its reason', () => {
      const { container } = render(<ResearchReportPage />)
      for (const item of aggregates.unavailable) {
        expect(container.textContent).toContain(item.label)
        expect(container.textContent).toContain(item.reason)
      }
    })

    it('links to the saved-queries directory on GitHub', () => {
      const { container } = render(<ResearchReportPage />)
      const link = container.querySelector(
        'a[href="https://github.com/alexandermayes/loot-list-plus/tree/main/scripts/analytics/queries/wow-classic-loot-systems-2026"]'
      )
      expect(link).not.toBeNull()
    })

    it('offers exactly two download links, CSV and JSON, with the approved labels', () => {
      render(<ResearchReportPage />)
      const csvLink = screen.getByRole('link', { name: APPROVED['downloads.csv-label'] })
      const jsonLink = screen.getByRole('link', { name: APPROVED['downloads.json-label'] })
      expect(csvLink).toHaveAttribute('href', '/research/wow-classic-loot-systems-2026-aggregates.csv')
      expect(jsonLink).toHaveAttribute('href', `/research/${aggregates.report_slug}-aggregates.json`)
    })

    it('renders exactly one contextual CTA anchor to the signup domain, inside the article', () => {
      const { container } = render(<ResearchReportPage />)
      const article = container.querySelector('article') as HTMLElement
      const ctaLink = within(article).getByRole('link', { name: APPROVED['cta.button'] })
      expect(ctaLink).toHaveAttribute('href', 'https://www.lootlistplus.com')
      expect(container.textContent).toContain(APPROVED['cta.heading'])
      expect(container.textContent).toContain(APPROVED['cta.body'])
    })
  })

  // Phase 5 (05-COPY-DRAFT.md Links 5 and 6): outbound connective text to
  // /compare and /pricing. These anchor strings are approved in
  // 05-COPY-DRAFT.md, not 03-COPY-DRAFT.md, so they are reproduced here as
  // independent literals rather than pulled from the APPROVED record above.
  const COMPARE_CONNECTIVE_ANCHOR = 'how LootList+ compares to TMB, DKP, EPGP and loot council'
  const PRICING_CONNECTIVE_ANCHOR = 'the free core plan and Premium pricing'

  describe('outbound connective links (Phase 5)', () => {
    it('links to /compare exactly once, inside the article, with the approved anchor text', () => {
      const { container } = render(<ResearchReportPage />)
      const article = container.querySelector('article') as HTMLElement
      const compareLinks = within(article).getAllByRole('link', { name: COMPARE_CONNECTIVE_ANCHOR })
      expect(compareLinks).toHaveLength(1)
      expect(compareLinks[0]).toHaveAttribute('href', '/compare')
    })

    it('links to /pricing exactly once, inside the article, with the approved anchor text', () => {
      const { container } = render(<ResearchReportPage />)
      const article = container.querySelector('article') as HTMLElement
      const pricingLinks = within(article).getAllByRole('link', { name: PRICING_CONNECTIVE_ANCHOR })
      expect(pricingLinks).toHaveLength(1)
      expect(pricingLinks[0]).toHaveAttribute('href', '/pricing')
    })

    it('keeps the level-2 heading count at findings + 2 and the level-1 heading count at 1', () => {
      const { container } = render(<ResearchReportPage />)
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
      const article = container.querySelector('article') as HTMLElement
      const h2s = within(article).getAllByRole('heading', { level: 2 })
      expect(h2s).toHaveLength(aggregates.findings.length + 2)
    })

    it('keeps the app-host contextual CTA link count at exactly one, unchanged', () => {
      const { container } = render(<ResearchReportPage />)
      const article = container.querySelector('article') as HTMLElement
      const ctaLink = within(article).getByRole('link', { name: APPROVED['cta.button'] })
      expect(ctaLink).toHaveAttribute('href', 'https://www.lootlistplus.com')
    })

    it('renders every existing approved string unaltered', () => {
      const { container } = render(<ResearchReportPage />)
      // page.title and page.meta-description are metadata-only (rendered
      // into <head>, not the article body); render() here does not include
      // <head>, so those two keys are excluded from this body-text check.
      const bodyRenderedKeys = Object.keys(APPROVED).filter(
        (key) => key !== 'page.title' && key !== 'page.meta-description'
      )
      for (const key of bodyRenderedKeys) {
        expect(container.textContent).toContain(resolveTokens(APPROVED[key]))
      }
      for (const finding of aggregates.findings) {
        const copy = FINDING_APPROVED[finding.metric_id]
        expect(container.textContent).toContain(resolveTokens(copy['number-sentence']))
      }
    })

    it('contains no anchor pointing at a case-study URL', () => {
      const { container } = render(<ResearchReportPage />)
      const links = within(container).getAllByRole('link') as HTMLAnchorElement[]
      for (const link of links) {
        expect(link.getAttribute('href') ?? '').not.toMatch(/^\/customers\//)
      }
    })

    it('emits no new structured-data type: still exactly Article and BreadcrumbList', () => {
      const { container } = render(<ResearchReportPage />)
      const objects = getJsonLdObjects(container)
      expect(objects).toHaveLength(2)
      const types = objects.map((o) => o['@type']).sort()
      expect(types).toEqual(['Article', 'BreadcrumbList'])
    })
  })
})
