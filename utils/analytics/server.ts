import { PostHog } from 'posthog-node'

// Singleton PostHog client for server-side analytics
let posthogClient: PostHog | null = null

function getPostHogClient(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return null
  }

  if (!posthogClient) {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 1, // Flush immediately in serverless environment
      flushInterval: 0,
    })
  }

  return posthogClient
}

// Event types for type safety
export type AnalyticsEvent =
  | 'loot_submission_created'
  | 'loot_submission_status_changed'
  | 'loot_submission_deleted'
  | 'guild_created'
  | 'guild_joined'
  | 'guild_left'
  | 'character_created'
  | 'character_updated'
  | 'loot_item_awarded'
  | 'guild_settings_updated'
  | 'member_role_changed'
  | 'attendance_recorded'
  | 'character_imported'
  | 'loot_item_imported'
  | 'loot_item_removed_from_list'
  | 'api_error'

interface TrackEventParams {
  event: AnalyticsEvent
  userId: string
  properties?: Record<string, any>
}

/**
 * Track a server-side analytics event
 *
 * Usage:
 * ```
 * await trackEvent({
 *   event: 'loot_submission_status_changed',
 *   userId: user.id,
 *   properties: {
 *     submission_id: submission.id,
 *     old_status: 'pending',
 *     new_status: 'approved',
 *     guild_id: guildId,
 *   }
 * })
 * ```
 */
export async function trackEvent({ event, userId, properties = {} }: TrackEventParams): Promise<void> {
  const client = getPostHogClient()

  if (!client) {
    // PostHog not configured, skip silently
    return
  }

  try {
    client.capture({
      distinctId: userId,
      event,
      properties: {
        ...properties,
        $lib: 'posthog-node',
        environment: process.env.NODE_ENV,
      },
    })

    // Ensure event is sent before serverless function ends
    await client.shutdown()
  } catch (error) {
    // Don't let analytics errors break the application
    console.error('[Analytics] Failed to track event:', error)
  }
}

/**
 * Identify a user with additional properties (server-side)
 */
export async function identifyUser(
  userId: string,
  properties: Record<string, any>
): Promise<void> {
  const client = getPostHogClient()

  if (!client) {
    return
  }

  try {
    client.identify({
      distinctId: userId,
      properties,
    })

    await client.shutdown()
  } catch (error) {
    console.error('[Analytics] Failed to identify user:', error)
  }
}

/**
 * Track an API error for monitoring
 */
export async function trackApiError(
  userId: string,
  endpoint: string,
  error: Error | string,
  additionalContext?: Record<string, any>
): Promise<void> {
  await trackEvent({
    event: 'api_error',
    userId,
    properties: {
      endpoint,
      error_message: typeof error === 'string' ? error : error.message,
      error_stack: typeof error === 'string' ? undefined : error.stack,
      ...additionalContext,
    },
  })
}
