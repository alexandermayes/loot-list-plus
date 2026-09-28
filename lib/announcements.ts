/**
 * WoW Forever announcement (D-01, D-02, D-06): shared ids, storage keys,
 * paths and pure decision logic for both the in-app dialog
 * (ForeverAnnouncementModal) and the public marketing bar
 * (ForeverAnnouncementBar). No 'use client' directive and no module-level
 * window access -- FOREVER_BAR_PREPAINT_SCRIPT is a string built at module
 * load time (never executed here), so this file must stay safe to
 * evaluate on the server.
 */

import { getGuildGame } from '@/domain/expansion/game'

export const WOW_FOREVER_ANNOUNCEMENT = 'wow-forever'

export type AnnouncementSurface = 'app_modal' | 'public_bar'

/** The exact analytics payload for every announcement event (D-06): no PII. */
export function announcementEventProps(
  surface: AnnouncementSurface
): { announcement: 'wow-forever'; surface: AnnouncementSurface } {
  return { announcement: WOW_FOREVER_ANNOUNCEMENT, surface }
}

export const FOREVER_CREATE_PATH = '/guild-select/create?game=forever'
export const FOREVER_CREATE_URL = `https://www.lootlistplus.com${FOREVER_CREATE_PATH}`

export const FOREVER_BAR_DISMISSED_KEY = 'llp_announcement_wow-forever_bar_dismissed'
export const FOREVER_BAR_HTML_ATTR = 'data-llp-forever-bar'

/**
 * Mirrors the literal key DashboardContent writes when the user finishes
 * first-run onboarding. The Forever modal only shows to users who have
 * already been through onboarding, so the two features never compete for
 * the user's attention on the same load.
 */
export const ONBOARDING_SEEN_KEY = 'lootlist_onboarding_seen'

export function foreverModalSeenKey(userId: string): string {
  return `llp_announcement_wow-forever_modal_seen_${userId}`
}

/**
 * A safe reference to window.localStorage, or null on the server or when
 * storage is unavailable or throws (private browsing, disabled storage).
 */
export function getBrowserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Writes a key, swallowing any throw (quota exceeded, disabled storage). */
export function safeSetItem(storage: Storage | null, key: string, value: string): boolean {
  if (!storage) {
    return false
  }
  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * Whether the in-app WoW Forever dialog should show for the current guild
 * context (D-01). Every storage read is wrapped so a throwing storage never
 * crashes the render -- it just means the dialog does not show.
 */
export function shouldShowForeverModal(
  input: {
    loading: boolean
    userId: string | null | undefined
    guild: { game?: string | null } | null | undefined
  },
  storage: Pick<Storage, 'getItem'> | null
): boolean {
  const { loading, userId, guild } = input
  if (loading || !userId || !guild) {
    return false
  }
  if (getGuildGame(guild) === 'forever') {
    return false
  }
  if (!storage) {
    return false
  }
  try {
    if (!storage.getItem(ONBOARDING_SEEN_KEY)) {
      return false
    }
    if (storage.getItem(foreverModalSeenKey(userId))) {
      return false
    }
  } catch {
    return false
  }
  return true
}

/**
 * Runs before the body parses (app/layout.tsx renders this as the first
 * head child): if the bar was previously dismissed, mark it on <html>
 * right away so globals.css can hide the bar and its spacer before first
 * paint, with no flash and no layout shift. Wrapped in try/catch so a
 * throwing localStorage (private browsing lockdown) never blocks render.
 */
export const FOREVER_BAR_PREPAINT_SCRIPT = `(function(){try{if(window.localStorage.getItem(${JSON.stringify(
  FOREVER_BAR_DISMISSED_KEY
)})){document.documentElement.setAttribute(${JSON.stringify(
  FOREVER_BAR_HTML_ATTR
)},'dismissed')}}catch(e){}})();`
