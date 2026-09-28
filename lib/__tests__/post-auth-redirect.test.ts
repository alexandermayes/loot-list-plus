import { describe, it, expect } from 'vitest'
import { isSafeNextPath, resolvePostAuthRedirect, buildSignInPath } from '../post-auth-redirect'

describe('isSafeNextPath', () => {
  it('is true for same-origin relative paths', () => {
    expect(isSafeNextPath('/overview')).toBe(true)
    expect(isSafeNextPath('/guild-select/create?game=forever')).toBe(true)
    expect(isSafeNextPath('/loot-list#x')).toBe(true)
  })

  it('is false for missing, empty, non-string and non-rooted values', () => {
    expect(isSafeNextPath(null)).toBe(false)
    expect(isSafeNextPath(undefined)).toBe(false)
    expect(isSafeNextPath('')).toBe(false)
    expect(isSafeNextPath('overview')).toBe(false)
    expect(isSafeNextPath(42)).toBe(false)
  })

  it('is false for protocol-relative, backslash, and host-smuggling forms', () => {
    expect(isSafeNextPath('//evil.com')).toBe(false)
    expect(isSafeNextPath('/\\evil.com')).toBe(false)
    expect(isSafeNextPath('/foo\\bar')).toBe(false)
    expect(isSafeNextPath('@evil.com')).toBe(false)
    expect(isSafeNextPath('.evil.com')).toBe(false)
    expect(isSafeNextPath('https://evil.com')).toBe(false)
  })

  it('is false for a path containing CRLF or other control characters', () => {
    expect(isSafeNextPath('/ok\r\nLocation: x')).toBe(false)
  })
})

describe('resolvePostAuthRedirect', () => {
  it('honors a safe next when memberships are true or unknown', () => {
    expect(resolvePostAuthRedirect({ next: '/loot-list', hasMemberships: true })).toBe('/loot-list')
    expect(resolvePostAuthRedirect({ next: '/loot-list', hasMemberships: null })).toBe('/loot-list')
  })

  it('falls back to /overview when next is unsafe and memberships are true or unknown', () => {
    expect(resolvePostAuthRedirect({ next: '@evil.com', hasMemberships: true })).toBe('/overview')
    expect(resolvePostAuthRedirect({ next: '//evil.com', hasMemberships: null })).toBe('/overview')
    expect(resolvePostAuthRedirect({ next: null, hasMemberships: null })).toBe('/overview')
  })

  it('honors next only when it is safe and points at /guild-select/create, with no memberships', () => {
    expect(
      resolvePostAuthRedirect({ next: '/guild-select/create?game=forever', hasMemberships: false })
    ).toBe('/guild-select/create?game=forever')
  })

  it('falls back to /guild-select for any other next, with no memberships', () => {
    expect(resolvePostAuthRedirect({ next: '/overview', hasMemberships: false })).toBe('/guild-select')
    expect(resolvePostAuthRedirect({ next: null, hasMemberships: false })).toBe('/guild-select')
    expect(resolvePostAuthRedirect({ next: '@evil.com', hasMemberships: false })).toBe('/guild-select')
  })
})

describe('buildSignInPath', () => {
  it('encodes a safe path as the next query param', () => {
    expect(buildSignInPath('/guild-select/create?game=forever')).toBe(
      '/?next=%2Fguild-select%2Fcreate%3Fgame%3Dforever'
    )
  })

  it('falls back to the bare sign-in path for an unsafe input', () => {
    expect(buildSignInPath('//evil.com')).toBe('/')
    expect(buildSignInPath('@evil.com')).toBe('/')
  })
})
