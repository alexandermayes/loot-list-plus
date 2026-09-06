import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import CaseStudyPage, { generateMetadata, generateStaticParams, Eyebrow } from '../page'
import { ProofStrip, NarrativePanels, buildBylineMeta } from '../sections'
import { exampleGuildFixture } from '@/data/case-studies/example-guild-fixture'
import {
  publishedCaseStudies,
  requireCaseStudy,
  CASE_STUDY_SLUG_PATTERN,
} from '@/data/case-studies'

// jsdom implements neither matchMedia nor IntersectionObserver; LandingNav,
// LandingCTA, and QuoteCard's parent chrome all use them via framer-motion.
// Scoped to this test file per the LandingValueProps.test.tsx and
// wow-classic-loot-systems-2026 report test convention, not global setup.
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

vi.mock('@/utils/analytics/client', () => ({
  trackClientEvent: () => {},
  trackMarketingPageView: () => {},
  trackMarketingCta: () => {},
  getFirstTouchLandingPage: () => null,
}))

function getJsonLdObjects(container: HTMLElement) {
  return Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((node) =>
    JSON.parse(node.textContent || '{}')
  )
}

// Reproduced here, not imported from page.tsx, so this suite proves the
// rendered output independently of the page module's own implementation
// (mirrors the report test's independence convention).
const APPROVED: Record<string, string> = {
  'page.h1-preferred': `How {guild} Cut Weekly Loot Admin from {before_admin_time} to {after_admin_time}`,
  'page.h1-fallback': `How {guild} Made Every Loot Decision Explainable`,
  'page.meta-description': `How {guild}, a {size}-player {expansion_tier} guild, replaced {old_process} with ranked lists, attendance-weighted scores, and visible loot decisions.`,
  'page.lead': `{guild} is a {size}-player {expansion_tier} guild. Before LootList+, its officers used {old_process}. The system took {old_process_cost} and created {old_process_failure}. After {time_period} with LootList+, the guild {verified_result}.`,
}

function resolveTokens(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    if (!(key in tokens)) throw new Error(`Test fixture missing token {${key}}`)
    return tokens[key]
  })
}

// Derived from the imported fixture entry alone -- never a literal -- so a
// page that hardcodes a value fails these assertions.
const FIXTURE_TOKENS: Record<string, string> = {
  guild: exampleGuildFixture.guild,
  size: exampleGuildFixture.size,
  expansion_tier: exampleGuildFixture.expansionTier,
  old_process: exampleGuildFixture.oldProcess,
  old_process_cost: exampleGuildFixture.oldProcessCost,
  old_process_failure: exampleGuildFixture.oldProcessFailure,
  time_period: exampleGuildFixture.timePeriod,
  verified_result: exampleGuildFixture.verifiedResult,
  before_admin_time: exampleGuildFixture.title.variant === 'preferred' ? exampleGuildFixture.title.beforeAdminTime : '',
  after_admin_time: exampleGuildFixture.title.variant === 'preferred' ? exampleGuildFixture.title.afterAdminTime : '',
}

const FIXTURE_H1_KEY = exampleGuildFixture.title.variant === 'preferred' ? 'page.h1-preferred' : 'page.h1-fallback'
const EXPECTED_H1 = resolveTokens(APPROVED[FIXTURE_H1_KEY], FIXTURE_TOKENS)
const EXPECTED_LEAD = resolveTokens(APPROVED['page.lead'], FIXTURE_TOKENS)
const EXPECTED_META_DESCRIPTION = resolveTokens(APPROVED['page.meta-description'], FIXTURE_TOKENS)
const FIXTURE_SLUG = exampleGuildFixture.slug
const EXPECTED_CANONICAL = `https://www.getlootlist.com/customers/${FIXTURE_SLUG}`

async function renderFixturePage() {
  const jsx = await CaseStudyPage({ params: Promise.resolve({ slug: FIXTURE_SLUG }) })
  return render(jsx)
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('app/customers/[slug]/page.tsx', () => {
  it('renders exactly one level-1 heading, equal to the resolved page.h1 value for the fixture title variant', async () => {
    await renderFixturePage()
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0].textContent).toBe(EXPECTED_H1)
  })

  it('renders the resolved page.lead sentence with every value substituted from the fixture entry', async () => {
    const { container } = await renderFixturePage()
    expect(container.textContent).toContain(EXPECTED_LEAD)
  })

  it("renders the fixture's quote text and author name", async () => {
    const { container } = await renderFixturePage()
    expect(container.textContent).toContain(exampleGuildFixture.quote)
    expect(screen.getByText(exampleGuildFixture.author.name)).toBeInTheDocument()
  })

  it('renders the correct verification treatment for whichever variant the fixture actually uses', async () => {
    const { container } = await renderFixturePage()
    const verification = exampleGuildFixture.author.verification

    if (verification?.type === 'wcl_link') {
      const link = screen.getByRole('link', { name: exampleGuildFixture.author.guild })
      expect(link).toHaveAttribute('href', verification.url)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    } else if (verification?.type === 'verified_customer_dated') {
      expect(container.textContent).toContain(`Verified LootList+ customer`)
      expect(container.textContent).toContain(verification.monthYear)
    } else {
      expect(container.textContent).toContain('Verified LootList+ customer')
    }
  })

  it('generateMetadata for the fixture slug returns the canonical URL, resolved title, description, and interim robots directive', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: FIXTURE_SLUG }) })
    expect(metadata.alternates?.canonical).toBe(EXPECTED_CANONICAL)
    expect(metadata.title).toBe(EXPECTED_H1)
    expect(metadata.description).toBe(EXPECTED_META_DESCRIPTION)
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })

  it('emits exactly two JSON-LD objects, Article and BreadcrumbList, with headline matching the rendered H1 and the shared Person author id', async () => {
    const { container } = await renderFixturePage()
    const objects = getJsonLdObjects(container)
    expect(objects).toHaveLength(2)

    const article = objects.find((o) => o['@type'] === 'Article')
    expect(article).toBeDefined()
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(article.headline).toBe(h1.textContent)
    expect(article.author['@id']).toBe('https://www.getlootlist.com/about#creator')

    const breadcrumb = objects.find((o) => o['@type'] === 'BreadcrumbList')
    expect(breadcrumb).toBeDefined()
  })

  it('never emits Review or AggregateRating structured data, at any depth', async () => {
    const { container } = await renderFixturePage()
    const objects = getJsonLdObjects(container)

    function assertNoRatingSchema(value: unknown): void {
      if (value === null || typeof value !== 'object') return
      if (Array.isArray(value)) {
        for (const item of value) assertNoRatingSchema(item)
        return
      }
      const record = value as Record<string, unknown>
      expect(record['@type']).not.toBe('Review')
      expect(record['@type']).not.toBe('AggregateRating')
      expect(record).not.toHaveProperty('aggregateRating')
      expect(record).not.toHaveProperty('review')
      for (const key of Object.keys(record)) {
        assertNoRatingSchema(record[key])
      }
    }

    for (const obj of objects) {
      assertNoRatingSchema(obj)
    }
  })

  it('generateStaticParams() returns exactly the fixture slug under the test environment', async () => {
    const params = await generateStaticParams()
    expect(params).toEqual([{ slug: FIXTURE_SLUG }])
  })

  it('generateStaticParams() returns an empty array when NODE_ENV is production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const params = await generateStaticParams()
    expect(params).toEqual([])
  })

  it('requireCaseStudy throws for a slug that is not in the routable registry', () => {
    expect(() => requireCaseStudy('not-a-real-guild')).toThrow()
  })

  it('every slug in both registries matches the required charset pattern', () => {
    const allSlugs = [...publishedCaseStudies, exampleGuildFixture].map((entry) => entry.slug)
    expect(allSlugs.length).toBeGreaterThan(0)
    for (const slug of allSlugs) {
      expect(CASE_STUDY_SLUG_PATTERN.test(slug)).toBe(true)
    }
  })

  // Restated here as the publish-race guard (T-04-05), not only as a
  // metadata shape check: the interim directive must hold for the fixture
  // slug specifically, so a regression that flips it on for one slug but
  // not another is still caught.
  it('generateMetadata never returns an indexable robots directive for the fixture slug (publish-race guard)', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: FIXTURE_SLUG }) })
    const robots = metadata.robots as { index?: boolean; follow?: boolean } | undefined
    expect(robots?.index).toBe(false)
    expect(robots?.follow).toBe(false)
  })

  describe('slug resolution is exact ASCII equality, not case-folded or percent-decoded', () => {
    it('requireCaseStudy throws for the empty string', () => {
      expect(() => requireCaseStudy('')).toThrow()
    })

    it('requireCaseStudy throws for a slug differing only by letter case from the fixture slug', () => {
      const caseVariant = FIXTURE_SLUG.replace(/^./, (c) => c.toUpperCase())
      expect(caseVariant).not.toBe(FIXTURE_SLUG)
      expect(() => requireCaseStudy(caseVariant)).toThrow()
    })

    it('requireCaseStudy throws for a percent-encoded form of the fixture slug', () => {
      const percentEncoded = FIXTURE_SLUG.replace('-', '%2D')
      expect(percentEncoded).not.toBe(FIXTURE_SLUG)
      expect(() => requireCaseStudy(percentEncoded)).toThrow()
    })

    it('requireCaseStudy throws, and the message names the offending slug, for every rejection case', () => {
      const cases = [
        'not-a-real-guild',
        '',
        FIXTURE_SLUG.replace(/^./, (c) => c.toUpperCase()),
        FIXTURE_SLUG.replace('-', '%2D'),
      ]
      for (const slug of cases) {
        expect(() => requireCaseStudy(slug)).toThrowError(new RegExp(slug.length > 0 ? slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '.*'))
      }
    })
  })

  describe('CASE_STUDY_SLUG_PATTERN rejects malformed slugs', () => {
    it('rejects an uppercase slug', () => {
      expect(CASE_STUDY_SLUG_PATTERN.test('Example-Guild')).toBe(false)
    })

    it('rejects a slug with a leading or trailing hyphen', () => {
      expect(CASE_STUDY_SLUG_PATTERN.test('-example-guild')).toBe(false)
      expect(CASE_STUDY_SLUG_PATTERN.test('example-guild-')).toBe(false)
    })

    it('rejects a slug containing a slash or a dot', () => {
      expect(CASE_STUDY_SLUG_PATTERN.test('example/guild')).toBe(false)
      expect(CASE_STUDY_SLUG_PATTERN.test('example.guild')).toBe(false)
    })

    it('rejects a slug containing a non-ASCII character that normalizes to an ASCII letter', () => {
      // U+00E9 (e with acute accent) NFKD-normalizes to a plain "e", but the
      // pattern is applied before any such normalization could occur, so
      // this raw form is rejected outright.
      expect(CASE_STUDY_SLUG_PATTERN.test('examplé-guild')).toBe(false)
    })
  })

  describe('ProofStrip (T-04-13 omit rule)', () => {
    // Test-local caption strings, not the approved copy: ProofStrip is
    // tested here as a generic presentational component, independent of
    // which strings the page ultimately resolves for it. The full-page
    // suite below proves those approved strings actually reach the DOM.
    const captions = {
      roster: 'Roster size',
      expansion: 'Expansion and tier',
      metric: 'Weekly admin time saved',
      tenure: 'Months using LootList+',
    }

    it('renders exactly four blocks, in the contract order, when all four stats are present', () => {
      const { container } = render(<ProofStrip stats={exampleGuildFixture.proofStrip} captions={captions} />)
      const figures = container.querySelectorAll('.text-5xl')
      expect(figures).toHaveLength(4)
      expect(Array.from(figures).map((el) => el.textContent)).toEqual([
        exampleGuildFixture.proofStrip.rosterSize,
        exampleGuildFixture.proofStrip.expansionTier,
        exampleGuildFixture.proofStrip.adminTimeDelta,
        exampleGuildFixture.proofStrip.monthsUsing,
      ])
    })

    it('each figure element carries the 42px size token and the accent colour token, and each block carries its caption', () => {
      const { container } = render(<ProofStrip stats={exampleGuildFixture.proofStrip} captions={captions} />)
      const figure = container.querySelector('.text-5xl')
      expect(figure).not.toBeNull()
      expect(figure?.className).toContain('text-5xl')
      expect(figure?.className).toContain('text-accent')
      expect(container.textContent).toContain(captions.roster)
      expect(container.textContent).toContain(captions.tenure)
    })

    it('omits the tenure block cleanly when its figure is absent, with no not-applicable marker, dash, ellipsis, or empty block', () => {
      const stats = { ...exampleGuildFixture.proofStrip, monthsUsing: undefined }
      const { container } = render(<ProofStrip stats={stats} captions={captions} />)
      const figures = container.querySelectorAll('.text-5xl')
      expect(figures).toHaveLength(3)
      expect(container.textContent).not.toContain('N/A')
      expect(container.textContent).not.toContain('n/a')
      expect(container.textContent).not.toContain('...')
      for (const figure of figures) {
        const text = figure.textContent?.trim()
        expect(text).not.toBe('')
        expect(text).not.toBe('-')
      }
    })

    it('omits the roster block cleanly when its figure is absent, proving the omit rule is positional-independent', () => {
      const stats = { ...exampleGuildFixture.proofStrip, rosterSize: undefined }
      const { container } = render(<ProofStrip stats={stats} captions={captions} />)
      const figures = container.querySelectorAll('.text-5xl')
      expect(figures).toHaveLength(3)
      expect(container.textContent).not.toContain(captions.roster)
      for (const figure of figures) {
        expect(figure.textContent?.trim()).not.toBe('')
      }
    })

    it('the container carries the mobile gap-4 and desktop gap-6 spacing tokens, with no clipping utility class inside it', () => {
      const { container } = render(<ProofStrip stats={exampleGuildFixture.proofStrip} captions={captions} />)
      const grid = container.firstElementChild
      expect(grid?.className).toContain('gap-4')
      expect(grid?.className).toContain('md:gap-6')
      expect(container.innerHTML).not.toMatch(/truncate|line-clamp/)
    })
  })

  describe('NarrativePanels', () => {
    it('renders exactly two panels carrying the approved labels and the entry narratives, with no accent colour on either body', () => {
      const { container } = render(
        <NarrativePanels
          beforeLabel="Before LootList+"
          afterLabel="After LootList+"
          beforeNarrative={exampleGuildFixture.beforeNarrative}
          afterNarrative={exampleGuildFixture.afterNarrative}
        />
      )
      const headings = container.querySelectorAll('.text-2xl.font-bold')
      expect(headings).toHaveLength(2)
      expect(headings[0].textContent).toBe('Before LootList+')
      expect(headings[1].textContent).toBe('After LootList+')
      expect(container.textContent).toContain(exampleGuildFixture.beforeNarrative)
      expect(container.textContent).toContain(exampleGuildFixture.afterNarrative)
      const bodies = container.querySelectorAll('p')
      for (const body of bodies) {
        expect(body.className).not.toContain('text-accent')
      }
    })
  })

  describe('Full page: proof strip and narrative panels wired in', () => {
    it('renders the four-block proof strip and both narrative panels, and the page still has exactly one H1 matching the Article headline', async () => {
      const { container } = await renderFixturePage()
      const figures = container.querySelectorAll('.text-5xl')
      expect(figures).toHaveLength(4)

      const panelHeadings = Array.from(container.querySelectorAll('.text-2xl.font-bold')).map((el) => el.textContent)
      expect(panelHeadings).toEqual(expect.arrayContaining(['Before LootList+', 'After LootList+']))

      const h1 = screen.getByRole('heading', { level: 1 })
      const objects = getJsonLdObjects(container)
      const article = objects.find((o) => o['@type'] === 'Article')
      expect(article.headline).toBe(h1.textContent)
    })

    it('contains no element with a clipping utility class anywhere on the page', async () => {
      const { container } = await renderFixturePage()
      expect(container.innerHTML).not.toMatch(/truncate|line-clamp/)
    })
  })

  describe('buildBylineMeta', () => {
    it('returns both items, interviewed-then-expansion, when both are present', () => {
      const items = buildBylineMeta({
        interviewedMonthYear: 'March 2026',
        expansionTier: 'Cataclysm Classic Tier 11',
      })
      expect(items).toEqual([
        { key: 'interviewed', value: 'March 2026' },
        { key: 'expansion-tier', value: 'Cataclysm Classic Tier 11' },
      ])
    })

    it('drops an absent item with no empty entry and no stranded separator to render', () => {
      const items = buildBylineMeta({ interviewedMonthYear: 'March 2026' })
      expect(items).toHaveLength(1)
      expect(items[0].value).toBe('March 2026')
      expect(items.some((item) => item.value === '')).toBe(false)
    })
  })

  describe('Eyebrow', () => {
    it('renders the eyebrow element when its value is non-empty', () => {
      const { container } = render(<Eyebrow value="Case Study" />)
      expect(container.textContent).toBe('Case Study')
      expect(container.firstElementChild).not.toBeNull()
    })

    it('renders no eyebrow element and no residual spacing element when its value is empty', () => {
      const { container } = render(<Eyebrow value="" />)
      expect(container.firstElementChild).toBeNull()
      expect(container.textContent).toBe('')
    })
  })

  describe('Full page: header chrome (breadcrumb, eyebrow, byline)', () => {
    it('renders the approved breadcrumb label as the second segment, after a Home link to /', async () => {
      const { container } = await renderFixturePage()
      const homeLink = screen.getByRole('link', { name: 'Home' })
      expect(homeLink).toHaveAttribute('href', '/')
      expect(container.textContent).toContain('Customers')
    })

    it('renders the approved byline with Zev linked to /about', async () => {
      const { container } = await renderFixturePage()
      expect(container.textContent).toContain('By Zev, creator of LootList+')
      const zevLink = screen.getByRole('link', { name: 'Zev' })
      expect(zevLink).toHaveAttribute('href', '/about')
    })

    it('renders the byline meta row with the interview month/year and expansion/tier, separated by middots', async () => {
      const { container } = await renderFixturePage()
      expect(container.textContent).toContain(exampleGuildFixture.interviewedMonthYear)
      expect(container.textContent).toContain(exampleGuildFixture.expansionTier)
      expect(container.textContent).toContain('·')
    })

    it('renders the eyebrow above the H1 since the approved value is non-empty', async () => {
      const { container } = await renderFixturePage()
      expect(container.textContent).toContain('Case Study')
    })
  })

  describe('Full page: credible limitation and contextual CTA', () => {
    it('renders one limitation section with the approved heading and the entry limitation text, with no accent and no destructive colour anywhere', async () => {
      const { container } = await renderFixturePage()
      expect(container.textContent).toContain('What still needs work')
      expect(container.textContent).toContain(exampleGuildFixture.limitation)
      const headings = Array.from(container.querySelectorAll('.text-2xl.font-bold')).filter(
        (el) => el.textContent === 'What still needs work'
      )
      expect(headings).toHaveLength(1)
      expect(headings[0].closest('div')?.className).not.toContain('text-accent')
      expect(container.innerHTML).not.toMatch(/text-destructive|bg-destructive/)
    })

    it('renders exactly one anchor to lootlistplus.com inside the article, carrying the approved button label alongside the approved heading and body', async () => {
      const { container } = await renderFixturePage()
      const article = container.querySelector('article')
      expect(article).not.toBeNull()
      const links = Array.from(article?.querySelectorAll('a') ?? []).filter((a) => {
        try {
          return new URL(a.getAttribute('href') || '').hostname === 'www.lootlistplus.com'
        } catch {
          return false
        }
      })
      expect(links).toHaveLength(1)
      expect(links[0].textContent).toBe('Create your guild free')
      expect(container.textContent).toContain('See how the same rules work with your roster.')
      expect(container.textContent).toContain(
        'Create a free guild, import your raiders, and compare the priority order before your next raid night.'
      )
    })

    it('the Article headline still equals the rendered H1 and no rating or testimonial-score schema appears', async () => {
      const { container } = await renderFixturePage()
      const h1 = screen.getByRole('heading', { level: 1 })
      const objects = getJsonLdObjects(container)
      const article = objects.find((o) => o['@type'] === 'Article')
      expect(article.headline).toBe(h1.textContent)
      for (const obj of objects) {
        expect(JSON.stringify(obj)).not.toMatch(/Rating|testimonial/i)
      }
    })
  })

  describe('Copy-fidelity parity: every APPROVED-STRING in 04-COPY-DRAFT.md ships in page.tsx', () => {
    it('every approved value (literal segments around any token) appears verbatim in the page source', () => {
      const draftPath = join(
        process.cwd(),
        '.planning/phases/04-verified-guild-case-study/04-COPY-DRAFT.md'
      )
      const draft = readFileSync(draftPath, 'utf8')
      const pageSourcePath = join(process.cwd(), 'app/customers/[slug]/page.tsx')
      const pageSource = readFileSync(pageSourcePath, 'utf8')

      const lines = draft.split('\n').filter((line) => line.startsWith('APPROVED-STRING: '))
      expect(lines.length).toBeGreaterThan(0)

      const missing: string[] = []
      for (const line of lines) {
        const rest = line.slice('APPROVED-STRING: '.length)
        const eqIndex = rest.indexOf(' = ')
        const key = rest.slice(0, eqIndex)
        const value = rest.slice(eqIndex + 3)
        if (value.includes('{')) {
          // Token-bearing template: check the literal segment before the
          // first token, the same treatment the plan's own automated gate
          // applies, since a resolved value for the untaken title variant
          // never reaches the DOM for this fixture.
          const literalPrefix = value.split('{')[0]
          if (literalPrefix.length >= 8 && !pageSource.includes(literalPrefix)) {
            missing.push(key)
          }
        } else if (value.length > 0 && !pageSource.includes(value)) {
          missing.push(key)
        }
      }
      expect(missing).toEqual([])
    })
  })
})
