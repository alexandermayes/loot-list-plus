/**
 * Centralized Wowhead Integration Utilities
 *
 * Provides debounced tooltip refresh to prevent excessive API calls.
 * All components should use this instead of calling $WowheadPower.refreshLinks() directly.
 */

let refreshTimeout: ReturnType<typeof setTimeout> | null = null
let lastRefreshTime = 0
const DEBOUNCE_MS = 500 // Wait 500ms after last request before refreshing
const MIN_INTERVAL_MS = 1000 // Don't refresh more than once per second

/**
 * Debounced Wowhead tooltip refresh.
 * Coalesces multiple rapid calls into a single refresh.
 *
 * @param immediate - If true, bypasses debounce (use sparingly, e.g., initial page load)
 */
export function refreshWowheadTooltips(immediate = false): void {
  if (typeof window === 'undefined') return

  const wowhead = (window as Window & { $WowheadPower?: { refreshLinks: () => void } }).$WowheadPower
  if (!wowhead) return

  const now = Date.now()

  // Clear any pending refresh
  if (refreshTimeout) {
    clearTimeout(refreshTimeout)
    refreshTimeout = null
  }

  // If immediate and we haven't refreshed recently, do it now
  if (immediate && now - lastRefreshTime >= MIN_INTERVAL_MS) {
    try {
      wowhead.refreshLinks()
      lastRefreshTime = now
    } catch (e) {
      // Silently fail if Wowhead not fully loaded
    }
    return
  }

  // Otherwise debounce
  refreshTimeout = setTimeout(() => {
    // Check interval again in case other refreshes happened
    if (Date.now() - lastRefreshTime >= MIN_INTERVAL_MS) {
      try {
        wowhead.refreshLinks()
        lastRefreshTime = Date.now()
      } catch (e) {
        // Silently fail if Wowhead not fully loaded
      }
    }
    refreshTimeout = null
  }, DEBOUNCE_MS)
}

/**
 * Check if Wowhead script is loaded
 */
export function isWowheadLoaded(): boolean {
  return typeof window !== 'undefined' && !!(window as Window & { $WowheadPower?: unknown }).$WowheadPower
}
