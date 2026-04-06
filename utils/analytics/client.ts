import posthog from 'posthog-js'
import { useRef, useEffect } from 'react'

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
  | 'item_candidate_modal_viewed'
  | 'loot_list_saved'
  | 'loot_list_submitted'
  | 'master_sheet_viewed'
  // Engagement
  | 'accent_color_changed'
  | 'feedback_submitted'
  | 'account_deleted'
  | 'guild_creation_started'
  | 'guild_creation_completed'
  | 'guild_switched'
  // Growth & conversion
  | 'sign_in_clicked'
  | 'invite_code_created'
  | 'invite_code_copied'
  // Monetization
  | 'pro_upgrade_clicked'
  | 'pro_modal_viewed'
  // Landing page
  | 'landing_cta_clicked'
  | 'landing_nav_clicked'
  | 'landing_section_viewed'
  // Page views
  | 'overview_page_viewed'
  | 'loot_list_page_viewed'
  | 'attendance_page_viewed'
  | 'master_loot_page_viewed'
  | 'characters_manage_page_viewed'
  | 'admin_pending_submissions_viewed'
  | 'admin_raid_tracking_viewed'
  | 'settings_page_viewed'
  | 'guild_settings_page_viewed'
  | 'profile_page_viewed'
  | 'raid_teams_page_viewed'
  | 'loot_management_page_viewed'
  | 'updates_page_viewed'
  | 'audit_log_page_viewed'
  | 'sheet_import_page_viewed'
  | 'expansion_settings_page_viewed'
  | 'admin_analytics_page_viewed'
  // Officer actions
  | 'submission_reviewed'
  | 'pending_submission_approved'
  | 'pending_submission_rejected'
  | 'loot_item_imported'
  | 'master_loot_awarded'
  // Member actions
  | 'attendance_tab_changed'
  | 'character_created'
  | 'character_deleted'

export function trackClientEvent(event: ClientEvent, properties?: Record<string, any>): void {
  try {
    posthog.capture(event, properties)
  } catch {
    // Don't let analytics break the app
  }
}

/**
 * Track page load performance. Measures time from component mount to when
 * loading completes (loading transitions from true to false).
 *
 * Usage in a page component:
 *   usePagePerf('master_sheet', loading)
 */
export function usePagePerf(page: string, loading: boolean): void {
  const startRef = useRef(performance.now())
  const trackedRef = useRef(false)

  useEffect(() => {
    if (!loading && !trackedRef.current) {
      trackedRef.current = true
      const duration = Math.round(performance.now() - startRef.current)
      try {
        posthog.capture('page_load_time', { page, duration_ms: duration })
      } catch {
        // PostHog not initialized
      }
    }
  }, [loading, page])
}
