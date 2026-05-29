'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// Custom event name for cross-component invalidation
export const SUBMISSION_CHANGED_EVENT = 'lootlist:submission-changed'

/**
 * Dispatch this event after any action that changes submission state
 * (submit, approve, reject, needs_revision) to immediately update the sidebar badge.
 */
export function notifySubmissionChanged() {
  window.dispatchEvent(new Event(SUBMISSION_CHANGED_EVENT))
}

/**
 * Tracks the pending-submissions count for the sidebar badge.
 *
 * Backed by /api/loot-submissions/pending-count which is cached per guild
 * with tag invalidation on writes. Polls every 60s as a backstop for
 * cross-officer updates; the server's tag invalidation makes those polls
 * effectively free at the database layer (in-memory cache hit).
 */
export function usePendingSubmissionCount(guildId: string | null, canManageLoot: boolean) {
  const [count, setCount] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const fetchCount = useCallback(async () => {
    if (!guildId || !canManageLoot) {
      setCount(0)
      return
    }
    // Cancel any in-flight request so a slow response can't overwrite a
    // newer one (e.g. user switches guild quickly).
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const res = await fetch(
        `/api/loot-submissions/pending-count?guild_id=${encodeURIComponent(guildId)}`,
        { signal: controller.signal },
      )
      if (!res.ok) return
      const data = await res.json()
      if (typeof data?.count === 'number') {
        setCount(data.count)
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return
      // Silent failure — the badge is a nice-to-have, not load-bearing.
    }
  }, [guildId, canManageLoot])

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 60_000)
    return () => {
      clearInterval(interval)
      abortRef.current?.abort()
    }
  }, [fetchCount])

  // Refresh on window focus (officer returns to tab after raider submitted)
  useEffect(() => {
    const handleFocus = () => fetchCount()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchCount])

  // Refresh immediately when a submission action occurs anywhere in the app
  useEffect(() => {
    const handleSubmissionChanged = () => fetchCount()
    window.addEventListener(SUBMISSION_CHANGED_EVENT, handleSubmissionChanged)
    return () => window.removeEventListener(SUBMISSION_CHANGED_EVENT, handleSubmissionChanged)
  }, [fetchCount])

  return { count, refresh: fetchCount }
}
