import { NextResponse, type NextRequest } from 'next/server'
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
const redis = hasUpstashConfig
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

// Different rate limits for different route types
const rateLimiters = redis ? {
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
} : null

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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Only rate limit API routes
  if (!pathname.startsWith('/api') && !pathname.startsWith('/auth')) {
    return NextResponse.next()
  }

  const ip = getClientIp(request)
  const type = getRateLimitType(pathname)
  const identifier = `${type}:${ip}`

  let success: boolean
  let remaining: number

  if (rateLimiters) {
    // Use Upstash rate limiter
    const result = await rateLimiters[type].limit(identifier)
    success = result.success
    remaining = result.remaining
  } else {
    // Use in-memory fallback for development
    const config = rateLimitConfig[type]
    const result = getInMemoryRateLimit(identifier, config.limit, config.windowMs)
    success = result.success
    remaining = result.remaining
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
    // Match all API routes
    '/api/:path*',
    // Match auth callback
    '/auth/:path*',
  ],
}
