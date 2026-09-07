import type { CaseStudy } from './types'
import { exampleGuildFixture } from './example-guild-fixture'

// Every registered slug, in both the published and fixture registries, must
// match this pattern: lowercase ASCII letters and digits, hyphen-separated,
// no leading or trailing hyphen, no repeated hyphen. This is the V5 guard
// (04-RESEARCH.md Security Domain table): it makes slug resolution exact
// ASCII equality with no case-folding, Unicode-normalization, or
// percent-decoding ambiguity possible.
export const CASE_STUDY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Every registered entry's size must be a bare digit-only count. The
// approved lead and meta-description templates append the "-player" unit
// after the token themselves (app/customers/[slug]/page.tsx), so a value
// that already carries its own unit renders a doubled unit. See the doc
// comment on CaseStudy.size in data/case-studies/types.ts.
export const CASE_STUDY_SIZE_PATTERN = /^[0-9]+$/

// The published registry stays empty until the interview clears (D-06).
// Adding the first entry, once a guild's written approval is on file, is
// the publish plan's job, not this plan's. A production build with an empty
// array here emits zero reachable /customers/{slug} URLs, because
// generateStaticParams() below reads this array directly and
// dynamicParams is false in app/customers/[slug]/page.tsx.
//
// Three properties this registry guards, enforced by tests rather than by
// this comment alone:
// 1. The published array is empty, so a production build emits no
//    /customers/{slug} route at all (app/customers/[slug]/__tests__/page.test.tsx).
// 2. The fixture never enters this array, so it can never enter the
//    sitemap regardless of environment (app/__tests__/sitemap.test.ts).
// 3. The route's interim `robots` directive and the sitemap entry are a
//    matched pair: they change together in one commit at publish time,
//    never independently (RESEARCH.md Pitfall 2).
export const publishedCaseStudies: CaseStudy[] = []

// The fixture is never in publishedCaseStudies. It only ever resolves
// through listRoutableCaseStudies() below, and only while
// isFixtureRouteEnabled() is true, so a production build can never render
// or list it. Kept as a module-local array (not exported) so nothing
// outside this module can accidentally treat it as published content.
const fixtureCaseStudies: CaseStudy[] = [exampleGuildFixture]

for (const entry of [...publishedCaseStudies, ...fixtureCaseStudies]) {
  if (!CASE_STUDY_SLUG_PATTERN.test(entry.slug)) {
    throw new Error(`Case-study slug "${entry.slug}" does not match CASE_STUDY_SLUG_PATTERN`)
  }
  if (!CASE_STUDY_SIZE_PATTERN.test(entry.size)) {
    throw new Error(
      `Case-study size "${entry.size}" for slug "${entry.slug}" does not match CASE_STUDY_SIZE_PATTERN`
    )
  }
}

/**
 * Reads `NODE_ENV` at call time rather than capturing it in a module-level
 * constant, so a test can stub it (e.g. via `vi.stubEnv`) and observe the
 * change without re-importing the module.
 */
export function isFixtureRouteEnabled(): boolean {
  return process.env.NODE_ENV !== 'production'
}

/**
 * The published entries, plus the fixture entries only while the fixture
 * route is enabled. This is what generateStaticParams() reads: a
 * production build (isFixtureRouteEnabled() === false) never includes the
 * fixture slug in its output.
 */
export function listRoutableCaseStudies(): CaseStudy[] {
  return isFixtureRouteEnabled() ? [...publishedCaseStudies, ...fixtureCaseStudies] : [...publishedCaseStudies]
}

/**
 * Published slugs alone, never the fixture. This is what app/sitemap.ts
 * reads at publish time, so the fixture can never enter the sitemap
 * regardless of environment.
 */
export function listPublishedSlugs(): string[] {
  return publishedCaseStudies.map((entry) => entry.slug)
}

/**
 * Looks up a slug in the currently routable list by exact string equality,
 * mirroring requireFinding's throwing-accessor shape in the research report
 * page. Throws for any slug not in the routable list, including a slug
 * differing only by case or encoding from a real one (params.slug is
 * attacker-controlled input resolved against a committed list).
 */
export function requireCaseStudy(slug: string): CaseStudy {
  const entry = listRoutableCaseStudies().find((candidate) => candidate.slug === slug)
  if (!entry) {
    throw new Error(`No routable case study found for slug "${slug}"`)
  }
  return entry
}
