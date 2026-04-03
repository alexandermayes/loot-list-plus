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

// Refresh Supabase session cookies on every request so the browser client
// always starts with a valid access token. Without this, tokens expire while
// the tab is open and the browser client fires spurious SIGNED_OUT events,
// especially on a second device where there's no prior session to fall back on.
async function refreshSupabaseSession(request: NextRequest): Promise<{ response: NextResponse; user: unknown }> {
  const response = NextResponse.next({ request })

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

  // getUser() validates the JWT and refreshes expired tokens automatically.
  // The refreshed tokens are written back to cookies via setAll above.
  const { data: { user } } = await supabase.auth.getUser()

  return { response, user }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Refresh Supabase auth cookies on page navigations (not API/auth routes,
  // those are handled by their own auth checks)
  if (!pathname.startsWith('/api') && !pathname.startsWith('/auth')) {
    const { response, user } = await refreshSupabaseSession(request)

    // Protect app routes: redirect unauthenticated users to login
    // Public routes (/, /login, /guild-select, /updates, /legal/*, /dev-login) are excluded
    const isPublicRoute = ['/', '/login', '/guild-select', '/updates', '/dev-login'].includes(pathname)
      || pathname.startsWith('/legal/')
      || pathname.startsWith('/guild-select/')
      || pathname.startsWith('/blog')
      || pathname.startsWith('/changelog')
      || pathname.startsWith('/terms')
      || pathname.startsWith('/privacy')

    if (!isPublicRoute && !user) {
      const loginUrl = new URL('/', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
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
