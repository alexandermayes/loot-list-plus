import posthog from 'posthog-js'

/**
 * Client-side analytics events for feature adoption and activation tracking.
 *
 * These complement the server-side events in ./server.ts and focus on
 * client-only interactions (modals, exports, UI features).
 */

type ClientEvent =
  // Activation funnel
  | 'onboarding_viewed'
  | 'onboarding_guild_joined'
  // Feature adoption
  | 'bis_import_completed'
  | 'wowsims_gear_imported'
  | 'gargul_export_completed'
  | 'score_breakdown_viewed'
  | 'score_comparison_viewed'
  | 'loot_list_saved'
  | 'loot_list_submitted'
  | 'master_sheet_viewed'
  // Engagement
  | 'accent_color_changed'
  | 'feedback_submitted'
  | 'account_deleted'
  | 'guild_creation_started'
  | 'guild_creation_completed'
  // Growth & conversion
  | 'sign_in_clicked'
  | 'invite_code_created'

export function trackClientEvent(event: ClientEvent, properties?: Record<string, any>): void {
  try {
    posthog.capture(event, properties)
  } catch {
    // Don't let analytics break the app
  }
}
