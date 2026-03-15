'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

// Custom event name for cross-component invalidation
export const SUBMISSION_CHANGED_EVENT = 'lootlist:submission-changed'

/**
 * Dispatch this event after any action that changes submission state
 * (submit, approve, reject, needs_revision) to immediately update the sidebar badge.
 */
export function notifySubmissionChanged() {
  window.dispatchEvent(new Event(SUBMISSION_CHANGED_EVENT))
}

export function usePendingSubmissionCount(guildId: string | null, isOfficer: boolean) {
  const [count, setCount] = useState(0)
  const supabase = createClient()

  const fetchCount = useCallback(async () => {
    if (!guildId || !isOfficer) {
      setCount(0)
      return
    }

    const { count: pendingCount, error } = await supabase
      .from('loot_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('guild_id', guildId)
      .eq('status', 'pending')

    if (!error && pendingCount !== null) {
      setCount(pendingCount)
    }
  }, [guildId, isOfficer])

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
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
