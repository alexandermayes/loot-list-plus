'use client'

import { useGuildContext } from '@/app/contexts/GuildContext'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
 *   <ExpansionGuard>
 *     <YourPageContent />
 *   </ExpansionGuard>
 * )
 */
export function ExpansionGuard({ children }: { children: React.ReactNode }) {
  const { activeGuild, isOfficer } = useGuildContext()
  const router = useRouter()

  // If no active expansion is set, show the guard message
  if (!activeGuild?.active_expansion_id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto" />
              <h2 className="text-xl font-semibold text-foreground">
                No Expansion Set
              </h2>
              <p className="text-muted-foreground">
                {isOfficer
                  ? 'Your guild needs to select an expansion before you can use loot features.'
                  : 'Ask an officer to select an expansion in Guild Settings.'}
              </p>
              <div className="flex flex-col gap-2">
                {isOfficer && (
                  <Button onClick={() => router.push('/admin/guild-settings')}>
                    Go to Guild Settings
                  </Button>
                )}
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Expansion is set, render children
  return <>{children}</>
}
