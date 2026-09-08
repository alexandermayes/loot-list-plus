import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import sitemap from '../sitemap'
import { metadata } from '../research/wow-classic-loot-systems-2026/page'
import { listPublishedSlugs } from '@/data/case-studies'
import { listDatedRoutes, latestBlogDate, latestChangelogDate } from '@/lib/content-dates'
import datesJson from '@/data/content-dates.json'
import { metadata as homepageMetadata } from '../(landing)/landing/page'
import { metadata as aboutMetadata } from '../about/page'
import { metadata as compareMetadata } from '../compare/page'
import { metadata as pricingMetadata } from '../pricing/page'
import { metadata as premiumMetadata } from '../premium/page'
import { metadata as blogIndexMetadata } from '../blog/page'
import { metadata as termsMetadata } from '../terms/page'
import { metadata as privacyMetadata } from '../privacy/page'
import { metadata as dkpMetadata } from '../blog/dkp-is-dead-what-classic-guilds-use-in-2026/page'
import { metadata as recruitmentMetadata } from '../blog/guild-recruitment-guide-find-raiders-who-stay/page'
import { metadata as lootDramaMetadata } from '../blog/how-to-handle-loot-drama-without-losing-raiders/page'
import { metadata as onboardMetadata } from '../blog/how-to-onboard-new-raiders-without-killing-morale/page'
import { metadata as spreadsheetMetadata } from '../blog/how-to-run-loot-without-a-spreadsheet/page'
import { metadata as fairSystemMetadata } from '../blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page'
import { metadata as priorityListsMetadata } from '../blog/loot-priority-lists-vs-loot-council/page'
import { metadata as burnoutMetadata } from '../blog/the-officer-burnout-problem-and-how-to-fix-it/page'
import { metadata as attendanceMetadata } from '../blog/why-attendance-tracking-matters-more-than-loot-rules/page'

// The first test of app/sitemap.ts in this repository (03-06-PLAN.md Task 1).
// The file has a flat array with no de-duplication logic anywhere, so this
// suite is the only guard against a duplicate entry for any URL, not only
// the report page, and against a lingering robots override on the report
// page shipping unindexable (T-03-31, T-03-32).

const REPORT_URL = 'https://www.getlootlist.com/research/wow-classic-loot-systems-2026'

// Holds only while the case study is unpublished (D-06/D-07): the published
// case-study registry is empty this phase, so a production build emits no
// /customers/{slug} route and this fragment must never appear in the
// sitemap. The publish commit replaces this assertion with a
// single-occurrence check per published slug, in the same commit that
// removes the case-study route's interim `robots` directive
// (RESEARCH.md Pitfall 2, Phase 3's atomic publish discipline).
const CUSTOMERS_PATH_FRAGMENT = '/customers/'

describe('app/sitemap.ts', () => {
  it('lists the report URL exactly once', () => {
    const entries = sitemap()
    const matches = entries.filter((entry) => entry.url === REPORT_URL)
    expect(matches).toHaveLength(1)
  })

  it('never duplicates any URL in the whole array', () => {
    const entries = sitemap()
    const urls = entries.map((entry) => entry.url)
    const uniqueUrls = new Set(urls)
    expect(uniqueUrls.size).toBe(urls.length)
  })

  it('gives the report entry a literal, non-drifting lastModified date', () => {
    const first = sitemap().find((entry) => entry.url === REPORT_URL)
    const second = sitemap().find((entry) => entry.url === REPORT_URL)
    expect(first?.lastModified).toBeInstanceOf(Date)
    const firstDate = first?.lastModified as Date
    const secondDate = second?.lastModified as Date
    expect(firstDate.getTime()).toBe(secondDate.getTime())
  })

  it('agrees with the report page\'s own canonical URL rather than restating it', () => {
    const entry = sitemap().find((e) => e.url === REPORT_URL)
    expect(entry?.url).toBe(metadata.alternates?.canonical)
  })

  it('exposes no robots override on the report page metadata', () => {
    expect(metadata.robots).toBeUndefined()
  })

  it('lists every URL as absolute, beginning with the site origin', () => {
    const entries = sitemap()
    for (const entry of entries) {
      expect(entry.url.startsWith('https://www.getlootlist.com')).toBe(true)
    }
  })

  it('contains no /customers/ entry while the case study is unpublished', () => {
    const entries = sitemap()
    const matches = entries.filter((entry) => entry.url.includes(CUSTOMERS_PATH_FRAGMENT))
    expect(matches).toHaveLength(0)
  })

  it('agrees with listPublishedSlugs(): exactly one sitemap entry per published case-study slug', () => {
    const publishedSlugs = listPublishedSlugs()
    // With an empty list (today) this loop holds vacuously; it starts
    // guarding the moment the first case study ships.
    expect(publishedSlugs).toEqual([])
    const entries = sitemap()
    for (const slug of publishedSlugs) {
      const canonical = `https://www.getlootlist.com/customers/${slug}`
      const matches = entries.filter((entry) => entry.url === canonical)
      expect(matches).toHaveLength(1)
    }
  })

  // D-09: the dates module is the only source of truth for every
  // lastModified value. These assertions replace the three former
  // new Date() calls with a fail-loud, module-driven contract.

  it('contains zero occurrences of a zero-argument current-time date constructor, comments stripped', () => {
    const source = fs.readFileSync(path.join(__dirname, '../sitemap.ts'), 'utf8')
    const withoutComments = source
      .split('\n')
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join('\n')
    const matches = withoutComments.match(/new Date\(\)/g) ?? []
    expect(matches).toHaveLength(0)
  })

  it('gives every entry, not only the report, a literal, non-drifting lastModified date', () => {
    const first = sitemap()
    const second = sitemap()
    expect(first).toHaveLength(second.length)
    for (let i = 0; i < first.length; i++) {
      expect(first[i].lastModified).toBeInstanceOf(Date)
      const firstTime = (first[i].lastModified as Date).getTime()
      expect(Number.isNaN(firstTime)).toBe(false)
      expect(firstTime).toBe((second[i].lastModified as Date).getTime())
    }
  })

  it('returns the same URLs in the same order across two consecutive calls', () => {
    const firstUrls = sitemap().map((entry) => entry.url)
    const secondUrls = sitemap().map((entry) => entry.url)
    expect(firstUrls).toEqual(secondUrls)
  })

  it('resolves every URL to a date through the content-dates module', () => {
    const datedRoutes = new Set(listDatedRoutes())
    const derivedRoutes = new Set(['/blog', '/changelog'])
    const blogSlugs = new Set(Object.keys(datesJson.blogPosts))
    const origin = 'https://www.getlootlist.com'
    for (const entry of sitemap()) {
      expect(entry.url.startsWith(origin)).toBe(true)
      const route = entry.url.slice(origin.length) || '/'
      const slug = route.startsWith('/blog/') ? route.slice('/blog/'.length) : null
      const resolves =
        datedRoutes.has(route) || derivedRoutes.has(route) || (slug !== null && blogSlugs.has(slug))
      expect(resolves, `sitemap URL "${entry.url}" does not resolve through the dates module`).toBe(
        true
      )
    }
  })

  it("derives the /blog entry's lastmod from latestBlogDate()", () => {
    const entries = sitemap()
    const blogEntry = entries.find((entry) => entry.url === 'https://www.getlootlist.com/blog')
    expect(blogEntry?.lastModified).toBeInstanceOf(Date)
    expect((blogEntry?.lastModified as Date).getTime()).toBe(latestBlogDate().getTime())
  })

  it("derives the /changelog entry's lastmod from latestChangelogDate()", () => {
    const entries = sitemap()
    const changelogEntry = entries.find((entry) => entry.url === 'https://www.getlootlist.com/changelog')
    expect(changelogEntry?.lastModified).toBeInstanceOf(Date)
    expect((changelogEntry?.lastModified as Date).getTime()).toBe(latestChangelogDate().getTime())
  })

  it('has no two entries whose URL matches another after normalizing a trailing slash', () => {
    const entries = sitemap()
    const normalized = entries.map((entry) => entry.url.replace(/\/$/, ''))
    const unique = new Set(normalized)
    expect(unique.size).toBe(normalized.length)
  })

  it("agrees with every page module's own declared canonical, skipping entries with none by name", () => {
    // /changelog is a client component exporting no metadata and
    // therefore no canonical; it is the only sitemap URL skipped here,
    // named explicitly rather than silently passing.
    const NO_CANONICAL_URLS = new Set(['https://www.getlootlist.com/changelog'])

    const canonicalByUrl: Record<string, string | undefined> = {
      'https://www.getlootlist.com': homepageMetadata.alternates?.canonical as string | undefined,
      'https://www.getlootlist.com/compare': compareMetadata.alternates?.canonical as string | undefined,
      'https://www.getlootlist.com/about': aboutMetadata.alternates?.canonical as string | undefined,
      'https://www.getlootlist.com/pricing': pricingMetadata.alternates?.canonical as string | undefined,
      'https://www.getlootlist.com/premium': premiumMetadata.alternates?.canonical as string | undefined,
      'https://www.getlootlist.com/blog': blogIndexMetadata.alternates?.canonical as string | undefined,
      'https://www.getlootlist.com/blog/guild-recruitment-guide-find-raiders-who-stay':
        recruitmentMetadata.alternates?.canonical as string | undefined,
      'https://www.getlootlist.com/blog/how-to-handle-loot-drama-without-losing-raiders':
        lootDramaMetadata.alternates?.canonical as string | undefined,
      'https://www.getlootlist.com/blog/how-to-run-loot-without-a-spreadsheet':
        spreadsheetMetadata.alternates?.canonical as string | undefined,
      'https://www.getlootlist.com/blog/loot-priority-lists-vs-loot-council':
        priorityListsMetadata.alternates?.canonical as string | undefined,
      'https://www.getlootlist.com/blog/the-officer-burnout-problem-and-how-to-fix-it':
        burnoutMetadata.alternates?.canonical as string | undefined,
      'https://www.getlootlist.com/blog/how-to-onboard-new-raiders-without-killing-morale':
        onboardMetadata.alternates?.canonical as string | undefined,
      'https://www.getlootlist.com/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild':
        fairSystemMetadata.alternates?.canonical as string | undefined,
      'https://www.getlootlist.com/blog/dkp-is-dead-what-classic-guilds-use-in-2026':
        dkpMetadata.alternates?.canonical as string | undefined,
      'https://www.getlootlist.com/blog/why-attendance-tracking-matters-more-than-loot-rules':
        attendanceMetadata.alternates?.canonical as string | undefined,
      'https://www.getlootlist.com/research/wow-classic-loot-systems-2026':
        metadata.alternates?.canonical as string | undefined,
      'https://www.getlootlist.com/terms': termsMetadata.alternates?.canonical as string | undefined,
      'https://www.getlootlist.com/privacy': privacyMetadata.alternates?.canonical as string | undefined,
    }

    const entries = sitemap()
    let checkedCount = 0
    for (const entry of entries) {
      if (NO_CANONICAL_URLS.has(entry.url)) {
        expect(canonicalByUrl[entry.url]).toBeUndefined()
        continue
      }
      const declared = canonicalByUrl[entry.url]
      expect(declared, `no declared canonical mapped in this test for ${entry.url}`).toBeDefined()
      expect(entry.url).toBe(declared)
      checkedCount++
    }
    expect(checkedCount).toBe(entries.length - NO_CANONICAL_URLS.size)
  })

  it('lists exactly 19 entries', () => {
    expect(sitemap()).toHaveLength(19)
  })
})
