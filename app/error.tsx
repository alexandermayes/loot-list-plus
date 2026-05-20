'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Heading, Text } from '@/components/ui/typography'
import { useEffect } from 'react'
import posthog from 'posthog-js'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
    try {
      posthog.capture('client_error', {
        error_message: error.message,
        error_digest: error.digest,
        error_boundary: 'root',
        url: window.location.href,
      })
    } catch {
      // PostHog not initialized
    }
  }, [error])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation Header */}
      <header className="border-b border-border/50 bg-background-subtle">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <nav className="flex items-center h-16">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <Image
                src="/logo.svg"
                alt="LootList+"
                width={100}
                height={16}
                className="h-4 w-auto"
                priority
              />
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
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
            <Heading level={1}>Something went wrong</Heading>
            <Text color="muted" size="lg">
              Our gnomish engineers hit a snag. Try again or head back home.
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
      </main>
    </div>
  )
}
