/**
 * Public-route allowlist for the Next.js middleware (proxy.ts). Extracted so
 * the routing decision has direct test coverage and so proxy.ts stays a
 * thin orchestrator. This module must stay free of framework imports
 * (no next/server, no @supabase/ssr, no app modules) so it loads cleanly
 * in the jsdom vitest environment with no mocks.
 */

// Paths that must match exactly, not as a prefix. Exported so tests can
// assert over the real list instead of retyping the literals.
export const exactPublicPaths = [
  '/',
  '/login',
  '/guild-select',
  '/updates',
  '/dev-login',
  '/compare',
  '/about',
  '/premium',
  '/pricing',
  '/sitemap.xml',
  '/robots.txt',
  '/landing',
] as const

/**
 * Decide whether a pathname should skip authentication in the middleware.
 *
 * @param pathname - The request pathname (e.g. `request.nextUrl.pathname`).
 * @returns true if the route is public and should bypass the auth gate.
 *
 * Boundary matching, not bare prefix: `/research` and `/customers` are
 * admitted with an exact-or-child check (`=== '/research'` or
 * `startsWith('/research/')`), not `startsWith('/research')`. A bare
 * `startsWith` would also un-gate a lookalike path such as `/researchers`,
 * which must stay behind the auth wall. `/research` and `/customers` are
 * public evidence pages reached from search results by visitors who have
 * no session (G-04-2): the Phase 3 research report and the Phase 4
 * case-study template both need to answer crawlers and logged-out officers
 * directly instead of redirecting to the landing page.
 */
export function isPublicPathname(pathname: string): boolean {
  return (
    (exactPublicPaths as readonly string[]).includes(pathname)
    || pathname.startsWith('/legal/')
    || pathname.startsWith('/guild-select/')
    || pathname.startsWith('/blog')
    || pathname.startsWith('/changelog')
    || pathname.startsWith('/terms')
    || pathname.startsWith('/privacy')
    || pathname.startsWith('/reserve/')
    || pathname === '/research'
    || pathname.startsWith('/research/')
    || pathname === '/customers'
    || pathname.startsWith('/customers/')
  )
}
