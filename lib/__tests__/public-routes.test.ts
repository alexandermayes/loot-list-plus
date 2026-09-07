import { describe, it, expect } from 'vitest'
import { isPublicPathname, exactPublicPaths } from '../public-routes'

// Regression suite for G-04-2: proxy.ts redirected logged-out requests for
// /research and /customers to the landing page instead of serving the page.
// Every previously-public path is asserted here so the extract-and-extend
// refactor in proxy.ts cannot silently drop an entry (T-Q-04). No mocks and
// no vi.mock calls: importing the module proves it stays framework-free.

describe('isPublicPathname', () => {
  it('admits the newly public research and customers routes', () => {
    expect(isPublicPathname('/research/wow-classic-loot-systems-2026')).toBe(true)
    expect(isPublicPathname('/research')).toBe(true)
    expect(isPublicPathname('/customers/example-guild-fixture')).toBe(true)
    expect(isPublicPathname('/customers')).toBe(true)
  })

  it('still admits every path that was public before this change', () => {
    const previouslyPublic = [
      '/',
      '/login',
      '/guild-select',
      '/updates',
      '/dev-login',
      '/compare',
      '/about',
      '/premium',
      '/pricing',
      '/landing',
      ...exactPublicPaths,
      '/legal/privacy-policy',
      '/guild-select/create',
      '/blog/some-post',
      '/changelog',
      '/terms',
      '/privacy',
      '/reserve/abc123',
    ]

    for (const pathname of previouslyPublic) {
      expect(isPublicPathname(pathname)).toBe(true)
    }
  })

  it('still gates protected app routes', () => {
    expect(isPublicPathname('/overview')).toBe(false)
    expect(isPublicPathname('/master-sheet')).toBe(false)
    expect(isPublicPathname('/loot-submissions')).toBe(false)
    expect(isPublicPathname('/settings')).toBe(false)
  })

  it('does not let a lookalike prefix slip past the boundary match', () => {
    expect(isPublicPathname('/researchers')).toBe(false)
    expect(isPublicPathname('/customersecret')).toBe(false)
  })
})
