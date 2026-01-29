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

// Default TTL in seconds
const DEFAULT_TTL = 30

/**
 * Get a cached value or execute the fetch function
 * @param key - Cache key
 * @param fetchFn - Function to fetch data if not cached
 * @param ttl - Time to live in seconds (default: 30)
 */
export async function getCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  // If Redis isn't configured, just fetch
  if (!redis) {
    return fetchFn()
  }

  try {
    // Try to get from cache
    const cached = await redis.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Fetch fresh data
    const data = await fetchFn()

    // Store in cache (fire and forget)
    redis.set(key, data, { ex: ttl }).catch((err) => {
      console.warn('Cache set failed:', err)
    })

    return data
  } catch (error) {
    // On cache error, fall back to fetch
    console.warn('Cache get failed, fetching directly:', error)
    return fetchFn()
  }
}

/**
 * Invalidate a cache key
 * @param key - Cache key to invalidate
 */
export async function invalidateCache(key: string): Promise<void> {
  if (!redis) return

  try {
    await redis.del(key)
  } catch (error) {
    console.warn('Cache invalidation failed:', error)
  }
}

/**
 * Invalidate multiple cache keys by pattern
 * @param pattern - Key pattern (e.g., "user:*:characters")
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  if (!redis) return

  try {
    // Note: SCAN is not available in Upstash REST API, so we track keys manually
    // For now, we'll just invalidate specific keys
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (error) {
    console.warn('Cache pattern invalidation failed:', error)
  }
}

// Cache key generators
export const cacheKeys = {
  userCharacters: (userId: string) => `cache:characters:${userId}`,
  userGuilds: (userId: string) => `cache:guilds:${userId}`,
  guildMembers: (guildId: string) => `cache:guild-members:${guildId}`,
  prioList: (guildId: string, raidTierId?: string) =>
    raidTierId
      ? `cache:prio-list:${guildId}:${raidTierId}`
      : `cache:prio-list:${guildId}`,
}

// Check if caching is available
export function isCacheEnabled(): boolean {
  return hasUpstashConfig && redis !== null
}
