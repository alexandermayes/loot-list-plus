import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Check if Upstash credentials are configured
const hasUpstashConfig = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)

// LOW-01: Log warning if using in-memory fallback in production
if (!hasUpstashConfig && process.env.NODE_ENV === 'production') {
  console.warn(
    '[SECURITY WARNING] Rate limiting using in-memory fallback. ' +
    'This is not suitable for production as it does not persist across serverless invocations. ' +
    'Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for proper rate limiting.'
  )
}

// Create rate limiters only if Redis is configured
let redis: Redis | null = null
let rateLimiters: {
  api: Ratelimit
  auth: Ratelimit
  admin: Ratelimit
  feedback: Ratelimit
} | null = null

try {
  if (hasUpstashConfig) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })

    // Different rate limits for different route types
    rateLimiters = {
      // General API: 60 requests per minute
      api: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        analytics: true,
        prefix: 'ratelimit:api',
      }),
      // Auth endpoints: 10 requests per minute
      auth: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'),
        analytics: true,
        prefix: 'ratelimit:auth',
      }),
      // Admin endpoints: 5 requests per minute
      admin: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 m'),
        analytics: true,
        prefix: 'ratelimit:admin',
      }),
      // Feedback/public: 3 requests per minute
      feedback: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '1 m'),
        analytics: true,
        prefix: 'ratelimit:feedback',
      }),
    }
  }
} catch (error) {
  console.error('[Middleware] Failed to initialize rate limiters:', error)
  redis = null
  rateLimiters = null
}

// In-memory fallback for development
const inMemoryStore = new Map<string, { count: number; resetTime: number }>()

function getInMemoryRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now()
  const record = inMemoryStore.get(identifier)

  if (!record || now > record.resetTime) {
    inMemoryStore.set(identifier, { count: 1, resetTime: now + windowMs })
    return { success: true, remaining: limit - 1 }
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0 }
  }

  record.count++
  return { success: true, remaining: limit - record.count }
}

/**
 * Extract client IP address from request headers.
 *
 * LOW-02: IP Extraction Trust Chain
 * This function trusts the x-forwarded-for and x-real-ip headers which are set
 * by Vercel's edge network. Vercel strips any client-provided values and sets
 * the true client IP. This is safe because:
 * 1. Vercel is our trusted reverse proxy
 * 2. Vercel overwrites these headers with the actual client IP
 * 3. Direct requests to the origin are not possible (Vercel handles all traffic)
 *
 * If deploying to a different platform, verify that the platform properly
 * sanitizes these headers to prevent IP spoofing.
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             '127.0.0.1'
  return ip
}

function getRateLimitType(pathname: string): 'admin' | 'auth' | 'feedback' | 'api' {
  if (pathname.startsWith('/api/admin')) {
    return 'admin'
  }
  if (pathname.startsWith('/auth') || pathname.includes('/verify-discord')) {
    return 'auth'
  }
  if (pathname.startsWith('/api/feedback')) {
    return 'feedback'
  }
  return 'api'
}

const rateLimitConfig = {
  admin: { limit: 5, windowMs: 60000 },
  auth: { limit: 10, windowMs: 60000 },
  feedback: { limit: 3, windowMs: 60000 },
  api: { limit: 60, windowMs: 60000 },
}

// LOW-02: Request body size limits by route type
// Feedback allows 5MB for screenshots, others get 1MB default
const bodySizeLimits: Record<string, number> = {
  feedback: 5 * 1024 * 1024,  // 5MB for feedback (screenshots)
  default: 1024 * 1024,        // 1MB for all other routes
}

// How close to expiry (in seconds) the access token has to be before we
// force a network refresh. 60s is enough headroom for the browser client
// to hit an API with a still-valid token after the navigation lands.
const TOKEN_REFRESH_THRESHOLD_SECONDS = 60

/**
 * Decode a base64url-encoded JWT payload without verifying the signature.
 * Middleware runs on every page navigation and verification would require a
 * network call to Supabase — we only need the `exp` claim to decide whether
 * the token is about to expire.
 */
function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    // base64url → base64
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const json = typeof atob !== 'undefined'
      ? atob(padded)
      : Buffer.from(padded, 'base64').toString('utf-8')
    const claims = JSON.parse(json) as { exp?: number }
    return typeof claims.exp === 'number' ? claims.exp : null
  } catch {
    return null
  }
}

/**
 * Look at the Supabase auth cookies and return the current access token
 * without making a network call. Supabase stores the session as a
 * `sb-<project>-auth-token` cookie (sometimes split into .0/.1 chunks).
 * The cookie value is a JSON-encoded array; index 0 is the access token.
 */
function readAccessTokenFromCookies(request: NextRequest): string | null {
  const cookies = request.cookies.getAll()
  const authCookies = cookies.filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name))
  if (authCookies.length === 0) return null

  // Cookies can be chunked (.0, .1, ...). Sort and concatenate.
  authCookies.sort((a, b) => a.name.localeCompare(b.name))
  const raw = authCookies.map((c) => c.value).join('')
  if (!raw) return null

  try {
    // The value is sometimes prefixed with "base64-" on newer SSR versions.
    const body = raw.startsWith('base64-')
      ? typeof atob !== 'undefined'
        ? atob(raw.slice(7))
        : Buffer.from(raw.slice(7), 'base64').toString('utf-8')
      : raw
    const parsed = JSON.parse(body)
    // Shape 1: { access_token, refresh_token, ... }
    if (parsed && typeof parsed === 'object' && typeof parsed.access_token === 'string') {
      return parsed.access_token
    }
    // Shape 2 (legacy): [access_token, refresh_token, provider_token, ...]
    if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
      return parsed[0]
    }
    return null
  } catch {
    return null
  }
}

// Refresh Supabase session cookies on every request so the browser client
// always starts with a valid access token. Without this, tokens expire while
// the tab is open and the browser client fires spurious SIGNED_OUT events,
// especially on a second device where there's no prior session to fall back on.
//
// Performance: calling supabase.auth.getUser() is a network round-trip to the
// Supabase auth server (200-500ms). Middleware runs on every protected page
// navigation, so this was our TTFB floor. We now inspect the auth cookie
// directly and only call Supabase when the access token is about to expire,
// turning 99% of requests into local cookie reads.
async function refreshSupabaseSession(request: NextRequest): Promise<{ response: NextResponse; user: unknown; debugReason?: string }> {
  const response = NextResponse.next({ request })

  // Fast path: inspect the cookie JWT locally. If it's still valid for at
  // least TOKEN_REFRESH_THRESHOLD_SECONDS, skip the network call entirely.
  const accessToken = readAccessTokenFromCookies(request)
  if (accessToken) {
    const exp = decodeJwtExp(accessToken)
    if (exp !== null) {
      const nowSeconds = Math.floor(Date.now() / 1000)
      const secondsLeft = exp - nowSeconds
      if (secondsLeft > TOKEN_REFRESH_THRESHOLD_SECONDS) {
        // Token is healthy. Return a truthy "user" marker so the route gate
        // lets the request through. We don't actually need the user object
        // in middleware — downstream server components re-read auth.
        return { response, user: { authenticated: true } }
      }
      // Token near expiry — fall through to slow path
    } else {
      // Token found but couldn't decode exp — fall through to slow path
    }
  } else {
    // Check if auth cookies exist but couldn't be parsed locally.
    // If cookies exist, fall through to the slow path and let Supabase
    // SDK parse them (it handles chunked/base64 formats we may not).
    // Only bail early if there are truly no auth cookies at all.
    const cookies = request.cookies.getAll()
    const authCookies = cookies.filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name))
    if (authCookies.length === 0) {
      return { response, user: null, debugReason: 'no_auth_cookies' }
    }
    // Fall through to slow path — cookies exist but local parse failed
  }

  // Slow path: token is missing expiry, close to expiry, or malformed.
  // Fall back to a real Supabase call so the SDK can refresh cookies.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  return { response, user, debugReason: user ? undefined : 'getUser_null' }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Rewrite getlootlist.com/ to the static landing page
  const host = request.headers.get('host')?.split(':')[0] || ''
  const isLandingHost = ['getlootlist.com', 'www.getlootlist.com'].includes(host)
  if (isLandingHost && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/landing'
    return NextResponse.rewrite(url)
  }

  // Page navigations (not API/auth routes — those have their own auth checks)
  if (!pathname.startsWith('/api') && !pathname.startsWith('/auth')) {
    const isPublicRoute = ['/', '/login', '/guild-select', '/updates', '/dev-login', '/compare', '/about', '/sitemap.xml', '/robots.txt', '/landing'].includes(pathname)
      || pathname.startsWith('/legal/')
      || pathname.startsWith('/guild-select/')
      || pathname.startsWith('/blog')
      || pathname.startsWith('/changelog')
      || pathname.startsWith('/terms')
      || pathname.startsWith('/privacy')
      || pathname.startsWith('/reserve/')

    // Public routes: skip the getUser() call entirely to reduce TTFB.
    // The client-side GuildContext will handle session state independently.
    if (isPublicRoute) {
      return NextResponse.next({ request })
    }

    // Protected routes: refresh session cookies and gate on auth
    const { response, user, debugReason } = await refreshSupabaseSession(request)
    if (!user) {
      // Clear stale auth cookies that the middleware can't parse but the
      // server-side Supabase client might partially accept, which would
      // cause page.tsx to think the user is authenticated → redirect to
      // /overview → middleware rejects again → infinite loop.
      const loginUrl = new URL('/', request.url)
      loginUrl.searchParams.set('next', pathname)
      if (debugReason) {
        loginUrl.searchParams.set('_debug', debugReason)
      }
      const redirectResponse = NextResponse.redirect(loginUrl)
      const cookies = request.cookies.getAll()
      for (const cookie of cookies) {
        if (/^sb-.*-auth-token(\.\d+)?$/.test(cookie.name)) {
          redirectResponse.cookies.delete(cookie.name)
        }
      }
      return redirectResponse
    }

    return response
  }

  // Skip rate limiting for Vercel Cron jobs (authenticated via CRON_SECRET)
  if (pathname.startsWith('/api/cron')) {
    return NextResponse.next()
  }

  // LOW-02: Check request body size for POST/PUT/PATCH requests
  const method = request.method.toUpperCase()
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const size = parseInt(contentLength, 10)
      const limit = pathname.startsWith('/api/feedback')
        ? bodySizeLimits.feedback
        : bodySizeLimits.default

      if (!isNaN(size) && size > limit) {
        const limitMB = (limit / (1024 * 1024)).toFixed(0)
        return NextResponse.json(
          { error: `Request body too large. Maximum size is ${limitMB}MB.` },
          { status: 413 }
        )
      }
    }
  }

  const ip = getClientIp(request)
  const type = getRateLimitType(pathname)
  const identifier = `${type}:${ip}`

  let success: boolean = true
  let remaining: number = rateLimitConfig[type].limit

  try {
    if (rateLimiters) {
      // Use Upstash rate limiter
      const result = await rateLimiters[type].limit(identifier)
      success = result.success
      remaining = result.remaining
    } else if (process.env.NODE_ENV === 'production') {
      // MED-01 FIX: Fail secure in production when Redis is unavailable
      // In-memory rate limiting is ineffective in serverless environments
      console.error('[SECURITY] Rate limiting unavailable in production - blocking API request')
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      )
    } else {
      // Use in-memory fallback for development only
      const config = rateLimitConfig[type]
      const result = getInMemoryRateLimit(identifier, config.limit, config.windowMs)
      success = result.success
      remaining = result.remaining
    }
  } catch (error) {
    console.error('[Middleware] Rate limiting error:', error)
    if (process.env.NODE_ENV === 'production') {
      // Fail closed in production: don't allow requests through when rate limiting is broken
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      )
    }
    // In development, allow through so local dev isn't blocked
    success = true
    remaining = rateLimitConfig[type].limit
  }

  // Add rate limit headers to response
  const response = success
    ? NextResponse.next()
    : NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )

  response.headers.set('X-RateLimit-Limit', String(rateLimitConfig[type].limit))
  response.headers.set('X-RateLimit-Remaining', String(remaining))

  return response
}

// Configure which routes use the middleware
export const config = {
  matcher: [
    // Match all page routes for session refresh (excludes static files)
    '/((?!_next/static|_next/image|favicon.ico|site\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|woff|woff2)$).*)',
  ],
}
