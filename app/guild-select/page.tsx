'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Key, Users, LogOut } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function GuildSelectPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [discordVerified, setDiscordVerified] = useState(false)
  const [hasGuilds, setHasGuilds] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      // Check if logged in
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push('/')
        return
      }
      setUser(currentUser)

      // Check if user already has guilds
      const { data: memberships } = await supabase
        .from('guild_members')
        .select('id')
        .eq('user_id', currentUser.id)
        .limit(1)

      if (memberships && memberships.length > 0) {
        setHasGuilds(true)
        // User has guilds, redirect to dashboard
        router.push('/dashboard')
        return
      }

      // Check Discord verification status
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('discord_verified')
        .eq('user_id', currentUser.id)
        .single()

      setDiscordVerified(prefs?.discord_verified || false)
      setLoading(false)
    }

    checkUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="absolute top-4 right-4">
        <button
          onClick={handleLogout}
          className="text-muted-foreground hover:text-foreground transition flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl w-full space-y-6">
        {/* Welcome Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary">Welcome to LootList+</h1>
          <p className="text-lg text-muted-foreground">
            {user?.user_metadata?.full_name || user?.email}
          </p>
          <p className="text-muted-foreground">
            You're not a member of any guilds yet. Choose an option below to get started.
          </p>
        </div>

        {/* Discord Verification Banner (if not verified) */}
        {!discordVerified && (
          <Card className="border-yellow-600/50 bg-yellow-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="text-yellow-500">⚠️</div>
                <div className="flex-1">
                  <p className="font-medium text-yellow-200">Discord Verification Required to Create Guilds</p>
                  <p className="text-sm text-yellow-300/80 mt-1">
                    You need to verify your Discord account before you can create a new guild. You can still join existing guilds via invite code or Discord verification.
                  </p>
                  <Button
                    onClick={() => router.push('/profile/settings')}
                    variant="outline"
                    className="mt-3 border-yellow-600 text-yellow-200 hover:bg-yellow-950/40"
                  >
                    Verify Discord
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Create New Guild */}
          <Card
            className={`cursor-pointer transition hover:border-primary ${
              !discordVerified ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => discordVerified && router.push('/guild-select/create')}
          >
            <CardHeader>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 mb-4">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Create New Guild</CardTitle>
              <CardDescription>
                Start your own guild and become the first officer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Perfect if you're setting up LootList+ for your raid team for the first time.
              </p>
              {!discordVerified && (
                <p className="text-xs text-yellow-500 mt-2">
                  Requires Discord verification
                </p>
              )}
            </CardContent>
          </Card>

          {/* Join via Invite Code */}
          <Card
            className="cursor-pointer transition hover:border-primary"
            onClick={() => router.push('/guild-select/join')}
          >
            <CardHeader>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-600/20 mb-4">
                <Key className="w-6 h-6 text-green-400" />
              </div>
              <CardTitle>Join via Invite Code</CardTitle>
              <CardDescription>
                Enter an invite code shared by your guild officer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                If your guild officer gave you an invite code, use it here to join.
              </p>
            </CardContent>
          </Card>

          {/* Auto-Join via Discord */}
          <Card
            className="cursor-pointer transition hover:border-primary"
            onClick={() => router.push('/guild-select/discord-join')}
          >
            <CardHeader>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600/20 mb-4">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <CardTitle>Auto-Join via Discord</CardTitle>
              <CardDescription>
                Automatically join guilds from your Discord servers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                If your guild has Discord integration set up, you can join automatically.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Help Text */}
        <Card className="bg-card/50">
          <CardContent className="pt-6">
            <h3 className="font-medium text-foreground mb-2">Need Help?</h3>
            <p className="text-sm text-muted-foreground">
              Contact your guild officer to get an invite code, or ask them to set up Discord integration for automatic joining.
              If you're setting up a guild for the first time, create a new guild and you'll become the first officer.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
