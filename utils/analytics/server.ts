import { getPostHogServerClient } from './posthog-server'

// Event types for type safety
export type AnalyticsEvent =
  | 'loot_submission_created'
  | 'loot_submission_status_changed'
  | 'loot_submission_submitted'
  | 'loot_submission_deleted'
  | 'guild_created'
  | 'guild_joined'
  | 'guild_left'
  | 'character_created'
  | 'character_updated'
  | 'loot_item_awarded'
  | 'loot_awarded_bulk'
  | 'guild_settings_updated'
  | 'member_role_changed'
  | 'attendance_recorded'
  | 'attendance_bulk_recorded'
  | 'character_imported'
  | 'loot_item_imported'
  | 'loot_item_removed_from_list'
  | 'sheet_import_completed'
  | 'api_error'
  | 'reserve_run_created'
  | 'reserve_run_locked'
  | 'reserve_run_unlocked'
  | 'reserve_run_completed'
  | 'reserve_run_deleted'
  | 'reserve_run_duplicated'
  | 'reserve_item_awarded'

interface TrackEventParams {
  event: AnalyticsEvent
  userId: string
  properties?: Record<string, unknown>
  guildId?: string
}

/**
 * Track a server-side analytics event.
 *
 * Pass guildId to associate the event with the guild group in PostHog,
 * enabling per-guild breakdowns in dashboards.
 */
export async function trackEvent({ event, userId, properties = {}, guildId }: TrackEventParams): Promise<void> {
  const client = getPostHogServerClient()
  if (!client) return

  try {
    client.capture({
      distinctId: userId,
      event,
      properties: {
        ...properties,
        $lib: 'posthog-node',
        environment: process.env.NODE_ENV,
      },
      ...(guildId ? { groups: { guild: guildId } } : {}),
    })

    await client.flush()
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error)
  }
}

/**
 * Identify a user with additional properties (server-side)
 */
export async function identifyUser(
  userId: string,
  properties: Record<string, unknown>
): Promise<void> {
  const client = getPostHogServerClient()
  if (!client) return

  try {
    client.identify({
      distinctId: userId,
      properties,
    })

    await client.flush()
  } catch (error) {
    console.error('[Analytics] Failed to identify user:', error)
  }
}

/**
 * Set user properties that only write once (activation milestones).
 * Subsequent calls with the same key are ignored by PostHog.
 */
export async function setUserMilestone(
  userId: string,
  milestone: string,
): Promise<void> {
  const client = getPostHogServerClient()
  if (!client) return

  try {
    client.capture({
      distinctId: userId,
      event: '$identify',
      properties: {
        $set_once: { [milestone]: new Date().toISOString() },
      },
    })
    await client.flush()
  } catch (error) {
    console.error('[Analytics] Failed to set milestone:', error)
  }
}

/**
 * Track an API error for monitoring
 */
export async function trackApiError(
  userId: string,
  endpoint: string,
  error: Error | string,
  additionalContext?: Record<string, unknown>
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
