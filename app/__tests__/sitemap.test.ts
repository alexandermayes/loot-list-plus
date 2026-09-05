import { describe, it, expect } from 'vitest'
import sitemap from '../sitemap'
import { metadata } from '../research/wow-classic-loot-systems-2026/page'

// The first test of app/sitemap.ts in this repository (03-06-PLAN.md Task 1).
// The file has a flat array with no de-duplication logic anywhere, so this
// suite is the only guard against a duplicate entry for any URL, not only
// the report page, and against a lingering robots override on the report
// page shipping unindexable (T-03-31, T-03-32).

const REPORT_URL = 'https://www.getlootlist.com/research/wow-classic-loot-systems-2026'

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
})
