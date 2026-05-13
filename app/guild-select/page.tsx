'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeletons'

// This page now redirects to /dashboard which shows WelcomeScreen
// when the user has no guild memberships
export default function GuildSelectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/overview')
  }, [router])

  return (
    <div className="p-8 space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}
