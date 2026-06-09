'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { SUBMISSION_CHANGED_EVENT } from './usePendingSubmissionCount'

/**
 * Tracks how many of the signed-in raider's own lists need to be (re)submitted,
 * for the sidebar / dashboard badge.
 *
 * Backed by /api/loot-submissions/needs-resubmit-count (scoped server-side to
 * the user's own characters). Refreshes on the shared submission-changed event
 * (so submitting clears the badge immediately) and on window focus; polls as a
 * lightweight backstop.
 */
export function useResubmitCount(guildId: string | null) {
  const [count, setCount] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const fetchCount = useCallback(async () => {
    if (!guildId) {
      setCount(0)
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const res = await fetch(
        `/api/loot-submissions/needs-resubmit-count?guild_id=${encodeURIComponent(guildId)}`,
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
  }, [guildId])

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 60_000)
    return () => {
      clearInterval(interval)
      abortRef.current?.abort()
    }
  }, [fetchCount])

  useEffect(() => {
    const handleFocus = () => fetchCount()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchCount])

  useEffect(() => {
    const handleChanged = () => fetchCount()
    window.addEventListener(SUBMISSION_CHANGED_EVENT, handleChanged)
    return () => window.removeEventListener(SUBMISSION_CHANGED_EVENT, handleChanged)
  }, [fetchCount])

  return { count, refresh: fetchCount }
}
