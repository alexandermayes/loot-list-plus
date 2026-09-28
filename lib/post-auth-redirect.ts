/**
 * Post-auth redirect safety (D-03).
 *
 * app/auth/callback/route.js used to build its redirect Location as
 * `origin + (next || '/overview')` with no validation on `next`, which is
 * read straight from the request's query string. A value like '@evil.com'
 * or '//evil.com' changes the effective host when concatenated onto
 * `origin`, producing an open redirect: the browser is sent to a different
 * origin entirely after a successful sign-in. isSafeNextPath closes that by
 * only accepting a same-origin relative path that starts with a single
 * '/', has no second leading slash or backslash, contains no backslash or
 * control character anywhere, and still resolves to the placeholder origin
 * when parsed as a URL (so no scheme, no encoded host change, and no
 * '@'/'.' host trick can smuggle a different destination through).
 *
 * This file must import nothing: it runs in both the server route handler
 * and the client-side create page.
 */

const PLACEHOLDER_ORIGIN = 'https://placeholder.invalid'

/**
 * True only for a same-origin relative path: starts with exactly one '/',
 * contains no backslash anywhere, contains no ASCII control character
 * anywhere, and still has PLACEHOLDER_ORIGIN as its origin once parsed
 * relative to it (guards against scheme tricks, '//host' protocol-relative
 * URLs, and any other origin-changing form).
 */
export function isSafeNextPath(next: unknown): next is string {
  if (typeof next !== 'string' || next.length === 0) {
    return false
  }
  if (next[0] !== '/') {
    return false
  }
  if (next[1] === '/' || next[1] === '\\') {
    return false
  }
  if (next.includes('\\')) {
    return false
  }
  for (let i = 0; i < next.length; i++) {
    const code = next.charCodeAt(i)
    if (code < 0x20 || code === 0x7f) {
      return false
    }
  }

  let parsed: URL
  try {
    parsed = new URL(next, PLACEHOLDER_ORIGIN)
  } catch {
    return false
  }
  return parsed.origin === PLACEHOLDER_ORIGIN
}

/**
 * Resolve where the post-auth callback should send the user (D-03). A safe
 * `next` is honored whenever memberships are known-true or not yet known
 * (`null`, the callback's initial pre-check value). Once memberships are
 * known to be false, `next` is honored only when it is safe AND points at
 * exactly '/guild-select/create' (a brand-new user's signup CTA); any other
 * next -- safe or not -- sends a member-less user to '/guild-select'
 * instead, since every other destination assumes a guild already exists.
 */
export function resolvePostAuthRedirect(args: {
  next: string | null
  hasMemberships: boolean | null
}): string {
  const { next, hasMemberships } = args
  const safeNext = isSafeNextPath(next) ? next : null

  if (hasMemberships === false) {
    if (safeNext) {
      const pathname = new URL(safeNext, PLACEHOLDER_ORIGIN).pathname
      if (pathname === '/guild-select/create') {
        return safeNext
      }
    }
    return '/guild-select'
  }

  return safeNext ?? '/overview'
}

/**
 * Build the sign-in path for a given post-sign-in destination, encoding it
 * as the `next` query param. An unsafe input falls back to the bare sign-in
 * path so the encoded value can never smuggle an unsafe redirect through
 * the sign-in page.
 */
export function buildSignInPath(pathWithSearch: string): string {
  if (!isSafeNextPath(pathWithSearch)) {
    return '/'
  }
  return `/?next=${encodeURIComponent(pathWithSearch)}`
}
