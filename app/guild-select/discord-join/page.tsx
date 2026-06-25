'use client'

import { createClient } from '@/utils/supabase/client'
import type { User } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Tick01Icon, UserGroupIcon } from '@hugeicons/core-free-icons'
import { Skeleton } from '@/components/ui/skeletons'
import { Spinner } from '@/components/ui/loading-spinner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/typography'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AvailableGuild {
  id: string
  name: string
  realm: string | null
  faction: string
  discord_server_id: string
  discord_name: string | null
  discord_icon: string | null
}

export default function DiscordJoinPage() {
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [availableGuilds, setAvailableGuilds] = useState<AvailableGuild[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [discordVerified, setDiscordVerified] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      // Check if logged in
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push('/')
        return
      }
      setUser(currentUser)

      // Check Discord verification
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('discord_verified')
        .eq('user_id', currentUser.id)
        .single()

      // Auto-verify if user logged in with Discord but not verified yet
      if (!preferences?.discord_verified) {
        try {
          const verifyResponse = await fetch('/api/verify-discord', {
            method: 'POST'
          })

          if (verifyResponse.ok) {
            setDiscordVerified(true)
          } else {
            setDiscordVerified(false)
            setLoading(false)
            return
          }
        } catch (err) {
          console.error('Auto-verification failed on page load:', err)
          setDiscordVerified(false)
          setLoading(false)
          return
        }
      } else {
        setDiscordVerified(true)
      }

      // Fetch available guilds
      try {
        const response = await fetch('/api/discord-guilds')
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Couldn\'t load guilds. Check your connection and try again.')
          setLoading(false)
          return
        }

        setAvailableGuilds(data.available_guilds || [])
      } catch (err) {
        console.error('Error loading guilds:', err)
        setError('Couldn\'t load available guilds. Check your connection and try again.')
      }

      setLoading(false)
    }

    loadData()
  }, [])

  const handleJoinGuild = async (guildId: string) => {
    setJoining(true)
    setError('')

    try {
      const response = await fetch('/api/discord-guilds/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ guild_id: guildId })
      })

      const data = await response.json()

      if (!response.ok && !data.success) {
        setError(data.error || 'Couldn\'t join guild. Check your connection and try again.')
        setJoining(false)
        return
      }

      // Success!
      setSuccess(true)
      setTimeout(() => {
        // If user needs to create a character, redirect with the modal flag
        // The guild is already set in their active state, so dashboard will show it
        if (data.needs_character_creation || data.needs_character_setup) {
          window.location.href = '/overview?create_character=true'
        } else {
          // Force a full page reload to refresh guild context
          window.location.href = '/overview'
        }
      }, 1500)
    } catch (err) {
      console.error('Error joining guild:', err)
      setError('Couldn\'t join guild. Check your connection and try again.')
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-64 w-full max-w-md rounded-xl" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-success/20 mx-auto">
            <HugeiconsIcon icon={Tick01Icon} size={40} className="text-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Successfully joined</h2>
          <p className="text-muted-foreground">Redirecting...</p>
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (!discordVerified) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        {/* Header */}
        <div className="absolute top-4 left-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/guild-select')}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
            Back
          </Button>
        </div>

        {/* Main Content */}
        <div className="max-w-xl w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-warning/20 mx-auto mb-4">
              <HugeiconsIcon icon={UserGroupIcon} size={32} className="text-warning" />
            </div>
            <Heading level={1} className="text-3xl text-primary">Discord verification required</Heading>
            <p className="text-muted-foreground">
              You need to verify your Discord account to join guilds automatically
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-4">
                To use the Discord auto-join feature, please verify your Discord account first. This allows LootList+ to check which Discord servers you&apos;re in and automatically match them with available guilds.
              </p>
              <Button
                onClick={() => router.push('/profile')}
                className="w-full"
              >
                Go to profile to verify Discord
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="absolute top-4 left-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/guild-select')}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Back
        </Button>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 mx-auto mb-4">
            <HugeiconsIcon icon={UserGroupIcon} size={32} className="text-blue-400" />
          </div>
          <Heading level={1} className="text-3xl text-primary">Join via Discord</Heading>
          <p className="text-muted-foreground">
            Automatically join guilds based on your Discord server memberships
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="space-y-3">
            <AlertDescription>{error}</AlertDescription>
            {error.includes('connection expired') && (
              <Button
                size="sm"
                onClick={async () => {
                  await supabase.auth.signInWithOAuth({
                    provider: 'discord',
                    options: {
                      redirectTo: `${window.location.origin}/auth/callback?next=/guild-select/discord-join`,
                      scopes: 'identify guilds'
                    }
                  })
                }}
              >
                Reconnect Discord
              </Button>
            )}
          </Alert>
        )}

        {/* Available Guilds */}
        {availableGuilds.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No guilds found</CardTitle>
              <CardDescription>
                We couldn&apos;t find any LootList+ guilds that match your Discord servers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Make sure you&apos;re a member of a Discord server that has a LootList+ guild set up. Contact your guild officer to set up Discord integration.
              </p>
              <Button
                onClick={() => router.push('/guild-select')}
                variant="outline"
                className="w-full"
              >
                Back to guild selection
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Available guilds</h2>
            <div className="grid gap-4">
              {availableGuilds.map((guild) => (
                <Card key={guild.id} className="border-border bg-card/80 hover:bg-card transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          {guild.discord_icon && (
                            <img
                              src={`https://cdn.discordapp.com/icons/${guild.discord_server_id}/${guild.discord_icon}.png`}
                              alt={guild.discord_name || guild.name}
                              className="w-12 h-12 rounded-full"
                            />
                          )}
                          <div>
                            <h3 className="text-lg font-bold text-foreground">{guild.name}</h3>
                            {guild.discord_name && guild.discord_name !== guild.name && (
                              <p className="text-sm text-muted-foreground">Discord: {guild.discord_name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          {guild.realm && (
                            <span>Realm: {guild.realm}</span>
                          )}
                          <span>Faction: {guild.faction}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleJoinGuild(guild.id)}
                        disabled={joining}
                        className="ml-4"
                      >
                        {joining ? 'Joining...' : 'Join guild'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Help Card */}
        <Card className="bg-card/50">
          <CardContent className="pt-6">
            <h3 className="font-medium text-foreground mb-2">How does this work?</h3>
            <p className="text-sm text-muted-foreground">
              We check which Discord servers you&apos;re a member of and match them with LootList+ guilds that have Discord integration enabled. You can only join guilds for Discord servers you&apos;re already in.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
