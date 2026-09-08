import dates from '@/data/content-dates.json'
import { updates } from '@/lib/updates-data'

// ---------------------------------------------------------------------------
// The single committed source of last-content-change dates.
//
// See lib/CONTENT-DATES.md for the rule this module enforces: any visible
// content change bumps a date; a code refactor, a test change, or a
// metadata-only tweak does not. app/sitemap.ts reads every lastModified
// value from here and restates no date of its own.
// ---------------------------------------------------------------------------

export interface ContentDates {
  routes: Record<string, string>
  blogPosts: Record<string, string>
}

const DATES = dates as ContentDates

const DERIVED_ROUTE_HELPERS: Record<string, string> = {
  '/blog': 'latestBlogDate()',
  '/changelog': 'latestChangelogDate()',
}

/**
 * Returns the last-content-change date for an ordinary route.
 *
 * Throws rather than falling back to a current-time value: a missing
 * route is a data gap the build should fail loudly on, not something
 * this function should paper over. '/blog' and '/changelog' are derived
 * from their newest item and always throw here, naming the helper to
 * call instead.
 *
 * @param route - a site-relative route key matching a key in
 *   data/content-dates.json's `routes` map, e.g. '/about'
 * @returns the parsed content-change date
 */
export function contentDate(route: string): Date {
  const derivedHelper = DERIVED_ROUTE_HELPERS[route]
  if (derivedHelper) {
    throw new Error(`contentDate("${route}") is derived: call ${derivedHelper} instead`)
  }
  const iso = DATES.routes[route]
  if (!iso) {
    throw new Error(`No content-dates entry for route "${route}"`)
  }
  return new Date(iso)
}

/**
 * Returns the last-content-change date for a single blog post.
 *
 * @param slug - a key in data/content-dates.json's `blogPosts` map
 * @returns the parsed content-change date
 */
export function blogPostDate(slug: string): Date {
  const iso = DATES.blogPosts[slug]
  if (!iso) {
    throw new Error(`No content-dates entry for blog post slug "${slug}"`)
  }
  return new Date(iso)
}

/**
 * Returns the newest date in a map of ISO date strings, computed as a
 * maximum over the values rather than by reading a first or last key,
 * so the result cannot depend on key insertion order in the source.
 *
 * Exported so the order-independence guarantee is directly testable
 * against a small fixture map, not only against today's real data.
 *
 * @param isoMap - a record whose values are ISO YYYY-MM-DD strings
 * @returns the parsed maximum date
 */
export function maxIsoDate(isoMap: Record<string, string>): Date {
  const values = Object.values(isoMap)
  if (values.length === 0) {
    throw new Error('maxIsoDate(): received no dates')
  }
  const times = values.map((iso) => new Date(iso).getTime())
  return new Date(Math.max(...times))
}

/**
 * Returns the newest date among a list of entries carrying a
 * human-readable `date` field, computed as a maximum over parsed
 * timestamps rather than by reading the first or last entry, so the
 * result cannot depend on array order.
 *
 * Throws on an entry whose date does not parse, rather than silently
 * producing an invalid date.
 *
 * @param entries - objects carrying a `date` field, e.g. lib/updates-data.ts's `updates`
 * @returns the parsed maximum date
 */
export function maxEntryDate(entries: { date: string }[]): Date {
  if (entries.length === 0) {
    throw new Error('maxEntryDate(): received no entries')
  }
  const times = entries.map((entry) => {
    const time = new Date(entry.date).getTime()
    if (Number.isNaN(time)) {
      throw new Error(`maxEntryDate(): could not parse date "${entry.date}"`)
    }
    return time
  })
  return new Date(Math.max(...times))
}

/**
 * The `/blog` entry's lastmod: the newest date across every entry in
 * `blogPosts`. Never hand-maintained.
 */
export function latestBlogDate(): Date {
  return maxIsoDate(DATES.blogPosts)
}

/**
 * The `/changelog` entry's lastmod: the newest entry date in
 * lib/updates-data.ts. Never hand-maintained and never build time.
 */
export function latestChangelogDate(): Date {
  return maxEntryDate(updates)
}

/**
 * Returns every route key in the `routes` map, so a caller (like the
 * sitemap coverage test) can assert every published URL resolves to a
 * date without reaching into the JSON shape directly.
 */
export function listDatedRoutes(): string[] {
  return Object.keys(DATES.routes)
}
