import { describe, it, expect } from 'vitest'
import sitemap from '@/app/sitemap'
import { updates } from '@/lib/updates-data'
import datesJson from '@/data/content-dates.json'
import {
  contentDate,
  blogPostDate,
  latestBlogDate,
  latestChangelogDate,
  listDatedRoutes,
  maxIsoDate,
  maxEntryDate,
} from '@/lib/content-dates'

// This suite proves lib/content-dates.ts is the single honest source
// app/sitemap.ts reads from (D-09): every accessor is fail-loud on a
// missing key, the two derived routes ('/blog', '/changelog') can never
// be answered from the routes map, and the maximum-based derivation
// helpers are provably independent of source key/array order rather than
// merely correct against today's data.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

describe('lib/content-dates.ts', () => {
  describe('contentDate', () => {
    it('returns a Date for every route key present in the JSON, deterministically', () => {
      for (const route of Object.keys(datesJson.routes)) {
        const first = contentDate(route)
        const second = contentDate(route)
        expect(first).toBeInstanceOf(Date)
        expect(Number.isNaN(first.getTime())).toBe(false)
        expect(first.getTime()).toBe(second.getTime())
      }
    })

    it('throws an Error naming the route when the route is absent from the JSON', () => {
      expect(() => contentDate('/this-route-does-not-exist')).toThrowError(
        /this-route-does-not-exist/
      )
    })

    it('throws for /blog because it is derived and never answerable from the routes map', () => {
      expect(() => contentDate('/blog')).toThrowError(/blog/)
    })

    it('throws for /changelog because it is derived and never answerable from the routes map', () => {
      expect(() => contentDate('/changelog')).toThrowError(/changelog/)
    })
  })

  describe('blogPostDate', () => {
    it('returns a Date for every slug in blogPosts', () => {
      for (const slug of Object.keys(datesJson.blogPosts)) {
        expect(blogPostDate(slug)).toBeInstanceOf(Date)
      }
    })

    it('throws a named Error for an unknown slug', () => {
      expect(() => blogPostDate('not-a-real-slug')).toThrowError(/not-a-real-slug/)
    })
  })

  describe('maxIsoDate (the algorithm behind latestBlogDate)', () => {
    it('computes the maximum over values rather than reading a first or last key', () => {
      const forward = { a: '2026-01-01', b: '2026-06-15', c: '2026-03-10' }
      const reversed = { c: '2026-03-10', b: '2026-06-15', a: '2026-01-01' }
      // Confirm the two fixtures really do have different key insertion
      // order, so this test would catch a first/last-entry regression.
      expect(Object.keys(forward)).not.toEqual(Object.keys(reversed))
      const forwardResult = maxIsoDate(forward)
      const reversedResult = maxIsoDate(reversed)
      expect(forwardResult.getTime()).toBe(reversedResult.getTime())
      expect(forwardResult.getTime()).toBe(new Date('2026-06-15').getTime())
    })

    it('throws on an empty map rather than returning an invalid date', () => {
      expect(() => maxIsoDate({})).toThrow()
    })
  })

  describe('maxEntryDate (the algorithm behind latestChangelogDate)', () => {
    it('computes the maximum over parsed entry dates rather than reading a first or last entry', () => {
      const forward = [
        { date: 'January 1, 2026' },
        { date: 'June 15, 2026' },
        { date: 'March 10, 2026' },
      ]
      const shuffled = [
        { date: 'March 10, 2026' },
        { date: 'June 15, 2026' },
        { date: 'January 1, 2026' },
      ]
      const forwardResult = maxEntryDate(forward)
      const shuffledResult = maxEntryDate(shuffled)
      expect(forwardResult.getTime()).toBe(shuffledResult.getTime())
      expect(forwardResult.getTime()).toBe(new Date('June 15, 2026').getTime())
    })

    it('throws on an empty array rather than returning an invalid date', () => {
      expect(() => maxEntryDate([])).toThrow()
    })

    it('throws on an entry whose date does not parse', () => {
      expect(() => maxEntryDate([{ date: 'not a date' }])).toThrow()
    })
  })

  describe('latestBlogDate', () => {
    it('equals the maximum of every value in blogPosts', () => {
      const isoValues = Object.values(datesJson.blogPosts)
      const expectedMax = Math.max(...isoValues.map((iso) => new Date(iso).getTime()))
      expect(latestBlogDate().getTime()).toBe(expectedMax)
    })
  })

  describe('latestChangelogDate', () => {
    it('equals the maximum entry date parsed from lib/updates-data.ts', () => {
      const expectedMax = Math.max(...updates.map((entry) => new Date(entry.date).getTime()))
      expect(latestChangelogDate().getTime()).toBe(expectedMax)
    })
  })

  describe('data/content-dates.json shape', () => {
    it('has exactly two top-level keys: routes and blogPosts', () => {
      expect(Object.keys(datesJson).sort()).toEqual(['blogPosts', 'routes'])
    })

    it('has exactly 9 entries under blogPosts', () => {
      expect(Object.keys(datesJson.blogPosts)).toHaveLength(9)
    })

    it('has no /blog or /changelog key under routes', () => {
      expect(datesJson.routes).not.toHaveProperty('/blog')
      expect(datesJson.routes).not.toHaveProperty('/changelog')
    })

    it('matches YYYY-MM-DD for every date string in both maps, and every value parses to a valid date', () => {
      for (const [section, map] of Object.entries(datesJson) as [string, Record<string, string>][]) {
        for (const [key, value] of Object.entries(map)) {
          expect(ISO_DATE.test(value), `${section}.${key} = "${value}" is not YYYY-MM-DD`).toBe(true)
          expect(
            Number.isNaN(new Date(value).getTime()),
            `${section}.${key} = "${value}" did not parse to a valid date`
          ).toBe(false)
        }
      }
    })
  })

  describe('listDatedRoutes', () => {
    it('returns every key in routes', () => {
      expect(listDatedRoutes().sort()).toEqual(Object.keys(datesJson.routes).sort())
    })

    it('plus the derived and blog-post routes, covers every URL in sitemap()', () => {
      const datedRoutes = new Set(listDatedRoutes())
      const derivedRoutes = new Set(['/blog', '/changelog'])
      const blogSlugs = new Set(Object.keys(datesJson.blogPosts))
      const origin = 'https://www.getlootlist.com'

      for (const entry of sitemap()) {
        expect(entry.url.startsWith(origin)).toBe(true)
        const route = entry.url.slice(origin.length) || '/'
        const isBlogPost = route.startsWith('/blog/')
        const slug = isBlogPost ? route.slice('/blog/'.length) : null
        const covered =
          datedRoutes.has(route) || derivedRoutes.has(route) || (slug !== null && blogSlugs.has(slug))
        expect(covered, `sitemap URL "${entry.url}" does not resolve through the dates module`).toBe(
          true
        )
      }
    })
  })
})
