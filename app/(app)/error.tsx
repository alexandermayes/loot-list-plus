'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Heading, Text } from '@/components/ui/typography'
import { useEffect } from 'react'
import posthog from 'posthog-js'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
    try {
      posthog.capture('client_error', {
        error_message: error.message,
        error_digest: error.digest,
        error_boundary: 'app',
        url: window.location.href,
      })
    } catch {
      // PostHog not initialized
    }
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center px-8 py-16">
      <div className="max-w-2xl w-full text-center">
        {/* Gnome Image */}
        <div className="mb-8">
          <img
            src="/images/404-gnome.webp"
            alt="Gnome engineer looking confused at a broken contraption"
            className="w-full max-w-md mx-auto"
            draggable={false}
          />
        </div>

        {/* Message */}
        <div className="space-y-3">
          <Heading level={1}>Something broke</Heading>
          <Text color="muted" size="lg">
            Our gnomish engineers hit a snag. Try again or head back to the overview.
          </Text>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="primary" size="lg" onClick={reset}>
            Try again
          </Button>
          <Link href="/overview">
            <Button variant="outline" size="lg">
              <img
                src="/images/hearthstone-icon.png"
                alt=""
                className="w-5 h-5"
              />
              Go to overview
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
