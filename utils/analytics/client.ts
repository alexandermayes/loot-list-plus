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
  // Acquisition funnel (search & AI visibility sprint)
  | 'marketing_page_viewed'
  | 'marketing_cta_clicked'
  | 'discord_oauth_started'
  | 'discord_oauth_completed'
  // Landing page
  | 'landing_cta_clicked'
  | 'landing_nav_clicked'
  | 'landing_section_viewed'
  // Welcome screen
  | 'welcome_discord_clicked'
  | 'welcome_code_entered'
  | 'welcome_create_clicked'
  | 'welcome_discord_no_guilds'
  | 'welcome_discord_error'
  // Blog engagement
  | 'blog_post_viewed'
  | 'blog_scroll_depth'
  | 'blog_time_on_page'
  | 'blog_cta_clicked'
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
  // Reserve
  | 'reserve_page_viewed'
  | 'reserve_run_created'
  | 'reserve_run_viewed'
  | 'reserve_share_link_copied'
  | 'reserve_gargul_exported'
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

export function trackClientEvent(event: ClientEvent, properties?: Record<string, unknown>): void {
  try {
    posthog.capture(event, properties)
  } catch {
    // Don't let analytics break the app
  }
}

/** First-touch marketing landing page, persisted for attribution at OAuth time. */
const LANDING_PAGE_KEY = 'll_landing_page'

export function getFirstTouchLandingPage(): string | null {
  try {
    return localStorage.getItem(LANDING_PAGE_KEY)
  } catch {
    return null
  }
}

/**
 * Fire on marketing page mount: records the standardized acquisition event
 * (sprint funnel) and captures the first-touch landing page.
 */
export function trackMarketingPageView(): void {
  try {
    if (!localStorage.getItem(LANDING_PAGE_KEY)) {
      localStorage.setItem(LANDING_PAGE_KEY, window.location.pathname)
    }
  } catch {
    // localStorage unavailable — attribution degrades, event still fires
  }
  const params = new URLSearchParams(window.location.search)
  trackClientEvent('marketing_page_viewed', {
    page_path: window.location.pathname,
    referrer: document.referrer || null,
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    landing_page: getFirstTouchLandingPage() ?? window.location.pathname,
    device_type: window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop',
  })
}

/** Standardized CTA click for the acquisition funnel dashboards. */
export function trackMarketingCta(props: { cta_text: string; cta_placement: string; destination: string }): void {
  trackClientEvent('marketing_cta_clicked', {
    page_path: window.location.pathname,
    landing_page: getFirstTouchLandingPage(),
    ...props,
  })
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
