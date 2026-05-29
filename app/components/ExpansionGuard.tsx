'use client'

import { useGuildContext } from '@/app/contexts/GuildContext'
import { Card, CardContent } from '@/components/ui/card'
import { HugeiconsIcon } from '@hugeicons/react'
import { AlertCircleIcon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { DashboardContentSkeleton } from '@/components/ui/skeletons'
import { useRouter } from 'next/navigation'

/**
 * ExpansionGuard Component
 *
 * A guard component that blocks access to loot-related features if the guild
 * has not selected an active expansion. Shows a helpful message with actions
 * based on whether the user is an officer or not.
 *
 * Usage:
 * Wrap loot-related pages (Loot List, Master Sheet, Loot Items Admin) with this component:
 *
 * return (
 *   <ExpansionGuard serverHeading={serverHeading}>
 *     <YourPageContent />
 *   </ExpansionGuard>
 * )
 *
 * The optional `serverHeading` prop is rendered above the skeleton / no-expansion
 * message during loading states so the page's LCP element lands in the SSR HTML
 * instead of being swallowed by the guard's loading branch.
 */
export function ExpansionGuard({
  children,
  serverHeading,
}: {
  children: React.ReactNode
  serverHeading?: React.ReactNode
}) {
  const { activeGuild, isOfficer, loading } = useGuildContext()
  const router = useRouter()

  // Show loading state while guild data is being fetched. We still render
  // the heading so the LCP element exists in the SSR HTML.
  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 pb-1.5">
        {serverHeading}
        <div className="mt-6">
          <DashboardContentSkeleton />
        </div>
      </div>
    )
  }

  // If no active expansion is set, show the guard message
  if (!activeGuild?.active_expansion_id) {
    return (
      <>
        {serverHeading && (
          <div className="p-4 sm:p-6 lg:p-8 pb-1.5">{serverHeading}</div>
        )}
        <div className="min-h-[60vh] bg-background flex items-center justify-center p-4">
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <HugeiconsIcon icon={AlertCircleIcon} size={48} className="text-warning mx-auto" />
                <h2 className="text-xl font-semibold text-foreground">
                  No expansion set
                </h2>
                <p className="text-muted-foreground">
                  {isOfficer
                    ? 'Your guild needs to select an expansion before you can use loot features.'
                    : 'Ask an officer to select an expansion in Manage Expansions.'}
                </p>
                <div className="flex flex-col gap-2">
                  {isOfficer && (
                    <Button onClick={() => router.push('/expansions')}>
                      Go to manage expansions
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => router.push('/overview')}>
                    Back to dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  // Expansion is set, render children
  return <>{children}</>
}
