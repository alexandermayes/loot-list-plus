/**
 * Recovery for stale-client chunk load failures.
 *
 * After a deploy, clients still running the old bundle request
 * /_next/static/chunks/* URLs that no longer exist and crash with chunk load
 * errors (the most recurrent production error class). DeploymentCheck handles
 * the proactive case (new build detected on navigation); this handles the
 * reactive one — the chunk fetch already failed — by forcing one full reload
 * so the browser picks up the new bundle.
 */

const RELOAD_KEY = 'chunk-error-reloaded-at'
const RELOAD_COOLDOWN_MS = 60_000

const CHUNK_ERROR_RE =
  /ChunkLoadError|Loading chunk .+ failed|Failed to load chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i

export function isChunkLoadError(message: string | null | undefined): boolean {
  return !!message && CHUNK_ERROR_RE.test(message)
}

/**
 * Reload the page once to recover from a stale chunk. Returns true if a
 * reload was triggered. A sessionStorage cooldown ensures a client that
 * still fails after reloading (e.g. offline) doesn't reload-loop.
 */
export function reloadOnceForStaleChunk(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) || 0)
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return false
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    // sessionStorage unavailable — without loop protection, don't auto-reload.
    return false
  }
  window.location.reload()
  return true
}
