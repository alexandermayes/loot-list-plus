'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

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

  return { count }
}
