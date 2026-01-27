import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Check if Upstash credentials are configured
const hasUpstashConfig = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)

// Create Redis client only if credentials are available
const redis = hasUpstashConfig
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

// Rate limiter for general API routes (60 requests per minute)
export const apiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: true,
      prefix: 'ratelimit:api',
    })
  : null

// Rate limiter for authentication routes (10 requests per minute)
export const authRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'ratelimit:auth',
    })
  : null

// Rate limiter for sensitive/admin routes (5 requests per minute)
export const adminRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
      prefix: 'ratelimit:admin',
    })
  : null

// Rate limiter for feedback/public endpoints (3 requests per minute)
export const feedbackRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 m'),
      analytics: true,
      prefix: 'ratelimit:feedback',
    })
  : null

// In-memory fallback for development (simple token bucket)
const inMemoryStore = new Map<string, { count: number; resetTime: number }>()

export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null,
  fallbackLimit = 60,
  fallbackWindowMs = 60000
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // Use Upstash if available
  if (limiter) {
    const result = await limiter.limit(identifier)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  }

  // Fallback to in-memory rate limiting for development
  const now = Date.now()
  const key = identifier
  const record = inMemoryStore.get(key)

  if (!record || now > record.resetTime) {
    inMemoryStore.set(key, { count: 1, resetTime: now + fallbackWindowMs })
    return {
      success: true,
      limit: fallbackLimit,
      remaining: fallbackLimit - 1,
      reset: now + fallbackWindowMs,
    }
  }

  if (record.count >= fallbackLimit) {
    return {
      success: false,
      limit: fallbackLimit,
      remaining: 0,
      reset: record.resetTime,
    }
  }

  record.count++
  return {
    success: true,
    limit: fallbackLimit,
    remaining: fallbackLimit - record.count,
    reset: record.resetTime,
  }
}

// Helper to get identifier from request (IP or user ID)
export function getIdentifier(
  request: Request,
  userId?: string
): string {
  // Prefer user ID if authenticated
  if (userId) {
    return `user:${userId}`
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             'unknown'

  return `ip:${ip}`
}
