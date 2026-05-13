'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeletons'

function RedirectSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

export default function JoinGuildPage() {
  return (
    <Suspense fallback={<RedirectSkeleton />}>
      <JoinGuildRedirect />
    </Suspense>
  )
}

/**
 * This page redirects to the login page with the invite code preserved.
 * The login page handles both authenticated and unauthenticated invite flows via a modal.
 */
function JoinGuildRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const nextUrl = code
      ? `/guild-select/join?code=${code}`
      : '/guild-select/join'
    router.replace(`/?next=${encodeURIComponent(nextUrl)}`)
  }, [])

  return <RedirectSkeleton />
}
