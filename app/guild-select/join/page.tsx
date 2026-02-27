'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function JoinGuildPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
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

  return <LoadingSpinner fullScreen />
}
