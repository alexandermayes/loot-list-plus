'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Tick01Icon, UserGroupIcon } from '@hugeicons/core-free-icons'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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
  const [user, setUser] = useState<any>(null)
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
        console.log('User not verified, attempting auto-verification on page load...')
        try {
          const verifyResponse = await fetch('/api/verify-discord', {
            method: 'POST'
          })

          if (verifyResponse.ok) {
            console.log('Auto-verification successful on page load')
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
          setError(data.error || 'Failed to load guilds')
          setLoading(false)
          return
        }

        setAvailableGuilds(data.available_guilds || [])
      } catch (err) {
        console.error('Error loading guilds:', err)
        setError('Failed to load available guilds')
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
        setError(data.error || 'Failed to join guild')
        setJoining(false)
        return
      }

      // Success!
      setSuccess(true)
      setTimeout(() => {
        // If user needs to create a character, redirect with the modal flag
        // The guild is already set in their active state, so dashboard will show it
        if (data.needs_character_creation || data.needs_character_setup) {
          window.location.href = '/dashboard?create_character=true'
        } else {
          // Force a full page reload to refresh guild context
          window.location.href = '/overview'
        }
      }, 1500)
    } catch (err) {
      console.error('Error joining guild:', err)
      setError('An error occurred while joining the guild')
      setJoining(false)
    }
  }

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-600/20 mx-auto">
            <HugeiconsIcon icon={Tick01Icon} size={40} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Successfully Joined!</h2>
          <p className="text-muted-foreground">Redirecting to dashboard...</p>
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (!discordVerified) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        {/* Header */}
        <div className="absolute top-4 left-4">
          <button
            onClick={() => router.push('/guild-select')}
            className="text-muted-foreground hover:text-foreground transition flex items-center gap-2"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
            Back
          </button>
        </div>

        {/* Main Content */}
        <div className="max-w-xl w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-yellow-600/20 mx-auto mb-4">
              <HugeiconsIcon icon={UserGroupIcon} size={32} className="text-yellow-400" />
            </div>
            <h1 className="text-3xl font-bold text-primary">Discord Verification Required</h1>
            <p className="text-muted-foreground">
              You need to verify your Discord account to join guilds automatically
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-4">
                To use the Discord auto-join feature, please verify your Discord account first. This allows LootList+ to check which Discord servers you're in and automatically match them with available guilds.
              </p>
              <Button
                onClick={() => router.push('/profile')}
                className="w-full"
              >
                Go to Profile to Verify Discord
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
        <button
          onClick={() => router.push('/guild-select')}
          className="text-muted-foreground hover:text-foreground transition flex items-center gap-2"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Back
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 mx-auto mb-4">
            <HugeiconsIcon icon={UserGroupIcon} size={32} className="text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-primary">Join via Discord</h1>
          <p className="text-muted-foreground">
            Automatically join guilds based on your Discord server memberships
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-950/50 border border-red-600/50">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Available Guilds */}
        {availableGuilds.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Guilds Found</CardTitle>
              <CardDescription>
                We couldn't find any LootList+ guilds that match your Discord servers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Make sure you're a member of a Discord server that has a LootList+ guild set up. Contact your guild officer to set up Discord integration.
              </p>
              <Button
                onClick={() => router.push('/guild-select')}
                variant="outline"
                className="w-full"
              >
                Back to Guild Selection
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Available Guilds</h2>
            <div className="grid gap-4">
              {availableGuilds.map((guild) => (
                <Card key={guild.id} className="border-border bg-card/80 hover:bg-card transition">
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
                        {joining ? 'Joining...' : 'Join Guild'}
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
              We check which Discord servers you're a member of and match them with LootList+ guilds that have Discord integration enabled. You can only join guilds for Discord servers you're already in.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
