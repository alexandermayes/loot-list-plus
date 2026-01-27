'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// This page now redirects to /dashboard which shows WelcomeScreen
// when the user has no guild memberships
export default function GuildSelectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/overview')
  }, [router])

  return <LoadingSpinner fullScreen />
}
