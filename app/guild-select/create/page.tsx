'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import RealmSelector from '@/app/components/RealmSelector'

interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
}

export default function CreateGuildPage() {
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [discordVerified, setDiscordVerified] = useState(false)
  const [discordGuilds, setDiscordGuilds] = useState<DiscordGuild[]>([])
  const [error, setError] = useState('')

  // Form state
  const [guildName, setGuildName] = useState('')
  const [selectedDiscordServer, setSelectedDiscordServer] = useState('')
  const [manualServerId, setManualServerId] = useState('')
  const [realmRegion, setRealmRegion] = useState('All')
  const [realm, setRealm] = useState('')
  const [faction, setFaction] = useState<'Alliance' | 'Horde'>('Alliance')
  const [expansion, setExpansion] = useState('Cataclysm')

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push('/')
        return
      }
      setUser(currentUser)

      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('discord_verified')
        .eq('user_id', currentUser.id)
        .single()

      const verified = prefs?.discord_verified || false
      setDiscordVerified(verified)

      if (!verified) {
        setError('You must verify your Discord account before creating a guild.')
      }

      // Fetch Discord servers from API (uses provider token to get servers from Discord)
      if (verified) {
        try {
          // Check cache first (15 minute cache to reduce rate limiting)
          const cacheKey = `discord_servers_${currentUser.id}`
          const cached = localStorage.getItem(cacheKey)

          if (cached) {
            try {
              const { data, timestamp } = JSON.parse(cached)
              const fifteenMinutes = 15 * 60 * 1000

              if (Date.now() - timestamp < fifteenMinutes) {
                console.log('Using cached Discord servers:', data.length)
                setDiscordGuilds(data)
                setLoading(false)
                return
              }
            } catch (err) {
              // Invalid cache, clear it
              localStorage.removeItem(cacheKey)
            }
          }

          const response = await fetch('/api/discord-servers')
          if (response.ok) {
            const data = await response.json()
            const guilds = data.guilds || []
            console.log('Received Discord servers:', guilds.length, guilds)
            setDiscordGuilds(guilds)

            // Cache the results
            localStorage.setItem(cacheKey, JSON.stringify({
              data: guilds,
              timestamp: Date.now()
            }))
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            console.error('Failed to fetch Discord servers:', errorData)

            if (response.status === 429) {
              setError('Discord rate limit reached. Please wait a minute and refresh the page.')
            } else if (errorData.error) {
              console.warn('Discord API error:', errorData.error)
            }
            // Don't set error for non-429 errors, just log and continue without Discord servers
          }
        } catch (err) {
          console.error('Error fetching Discord servers:', err)
          // Don't show error to user, they can still use manual server ID input
        }
      }

      setLoading(false)
    }

    checkUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!discordVerified) {
      setError('Discord verification required')
      return
    }

    if (!guildName.trim()) {
      setError('Guild name is required')
      return
    }

    setCreating(true)

    // Use dropdown selection first, fallback to manual input
    const discordServerId = selectedDiscordServer || manualServerId.trim()

    try {
      const response = await fetch('/api/guilds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: guildName.trim(),
          realm: realm.trim() || null,
          faction,
          discord_server_id: discordServerId || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create guild')
        setCreating(false)
        return
      }

      // Force a full page reload to refresh guild context
      window.location.href = '/dashboard'
    } catch (err) {
      console.error('Error creating guild:', err)
      setError('An error occurred while creating the guild')
      setCreating(false)
    }
  }

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <div className="min-h-screen bg-background flex flex-col p-4">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/guild-select')}
          className="text-muted-foreground hover:text-foreground transition flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto w-full space-y-8">
        {/* Title */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Users2 className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Register a Guild</h1>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-card/50 border border-border rounded-lg p-6 space-y-4">
          <p className="text-foreground">
            This website uses your guild's Discord server to help manage member access through Discord auto-join.
          </p>

          <div className="space-y-2">
            <p className="text-foreground font-medium">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Select your Discord server from the dropdown (optional)</li>
              <li>Fill out the form below</li>
            </ol>
          </div>

          <p className="text-muted-foreground">
            Once registered, invite your guild members by sharing invite codes or using Discord auto-join.
          </p>
        </div>

        {/* Discord Verification Warning */}
        {!discordVerified && (
          <div className="bg-yellow-950/20 border border-yellow-600/50 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="text-yellow-500 text-xl">⚠️</div>
              <div className="flex-1">
                <p className="font-medium text-yellow-200">Discord Verification Required</p>
                <p className="text-sm text-yellow-300/80 mt-1">
                  You need to verify your Discord account before creating a guild.
                </p>
                <Button
                  onClick={() => router.push('/profile/settings')}
                  variant="outline"
                  className="mt-3 border-yellow-600 text-yellow-200 hover:bg-yellow-950/40"
                >
                  Verify Discord Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Create Guild Form */}
        <form onSubmit={handleSubmit} className={`space-y-6 ${!discordVerified ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Guild Name */}
          <div className="space-y-2">
            <Label htmlFor="guildName" className="flex items-center gap-2 text-base">
              <Users2 className="w-5 h-5" />
              Guild Name
            </Label>
            <Input
              id="guildName"
              type="text"
              placeholder="must be unique"
              value={guildName}
              onChange={(e) => setGuildName(e.target.value)}
              required
              disabled={creating}
              className="text-base"
            />
          </div>

          {/* Discord Server Dropdown (if available) */}
          {discordGuilds.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="discordServer" className="flex items-center gap-2 text-base">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Discord Server
              </Label>
              <p className="text-sm text-muted-foreground">ones you have admin permissions on</p>
              <select
                id="discordServer"
                value={selectedDiscordServer}
                onChange={(e) => setSelectedDiscordServer(e.target.value)}
                disabled={creating}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-base text-foreground"
              >
                <option value="">—</option>
                {discordGuilds.map((guild) => (
                  <option key={guild.id} value={guild.id}>
                    {guild.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Manual Discord Server ID (optional or fallback) */}
          <div className="space-y-2">
            <Label htmlFor="manualServerId" className="flex items-center gap-2 text-base">
              {discordGuilds.length > 0 ? (
                <>
                  (optional){' '}
                  <a href="https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID"
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-primary hover:underline">
                    instructions
                  </a>{' '}
                  for finding a server ID
                </>
              ) : (
                <>
                  Discord Server ID (Optional)
                </>
              )}
            </Label>
            {discordGuilds.length === 0 && (
              <p className="text-sm text-muted-foreground mb-2">
                For automatic member joining. Enable Developer Mode in Discord, then right-click your server → Copy Server ID
              </p>
            )}
            <Input
              id="manualServerId"
              type="text"
              placeholder="paste your guild's server ID"
              value={manualServerId}
              onChange={(e) => setManualServerId(e.target.value)}
              disabled={creating}
              className="text-base"
            />
          </div>

          {/* Expansion */}
          <div className="space-y-2">
            <Label className="text-base">Expansion</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <button
                type="button"
                onClick={() => setExpansion('Classic')}
                disabled={creating}
                className={`relative aspect-video rounded-lg border-2 transition overflow-hidden ${
                  expansion === 'Classic'
                    ? 'border-primary ring-2 ring-primary/50'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <img
                  src="https://beta.softres.it/img/editions/classic.big.png"
                  alt="Classic"
                  className="w-full h-full object-cover"
                />
              </button>
              <button
                type="button"
                onClick={() => setExpansion('The Burning Crusade')}
                disabled={creating}
                className={`relative aspect-video rounded-lg border-2 transition overflow-hidden ${
                  expansion === 'The Burning Crusade'
                    ? 'border-primary ring-2 ring-primary/50'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <img
                  src="https://beta.softres.it/img/editions/tbc.big.png"
                  alt="The Burning Crusade"
                  className="w-full h-full object-cover"
                />
              </button>
              <button
                type="button"
                onClick={() => setExpansion('Wrath of the Lich King')}
                disabled={creating}
                className={`relative aspect-video rounded-lg border-2 transition overflow-hidden ${
                  expansion === 'Wrath of the Lich King'
                    ? 'border-primary ring-2 ring-primary/50'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <img
                  src="https://beta.softres.it/img/editions/wotlk.big.png"
                  alt="Wrath of the Lich King"
                  className="w-full h-full object-cover"
                />
              </button>
              <button
                type="button"
                onClick={() => setExpansion('Cataclysm')}
                disabled={creating}
                className={`relative aspect-video rounded-lg border-2 transition overflow-hidden ${
                  expansion === 'Cataclysm'
                    ? 'border-primary ring-2 ring-primary/50'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <img
                  src="https://beta.softres.it/img/editions/cata.big.png"
                  alt="Cataclysm"
                  className="w-full h-full object-cover"
                />
              </button>
              <button
                type="button"
                onClick={() => setExpansion('Mists of Pandaria')}
                disabled={creating}
                className={`relative aspect-video rounded-lg border-2 transition overflow-hidden ${
                  expansion === 'Mists of Pandaria'
                    ? 'border-primary ring-2 ring-primary/50'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <img
                  src="https://beta.softres.it/img/editions/mop.big.png"
                  alt="Mists of Pandaria"
                  className="w-full h-full object-cover"
                />
              </button>
            </div>
          </div>

          {/* Region & Realm */}
          <div className="space-y-2">
            <Label className="text-base">
              Realm (Optional)
            </Label>
            <RealmSelector
              region={realmRegion}
              realm={realm}
              onRegionChange={setRealmRegion}
              onRealmChange={setRealm}
              disabled={creating}
            />
          </div>

          {/* Faction */}
          <div className="space-y-2">
            <Label htmlFor="faction" className="text-base">Faction</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFaction('Alliance')}
                disabled={creating}
                className={`p-4 rounded-lg border-2 transition ${
                  faction === 'Alliance'
                    ? 'border-blue-500 bg-blue-500/20 text-blue-200'
                    : 'border-border bg-card hover:border-blue-500/50'
                }`}
              >
                <p className="font-medium">Alliance</p>
              </button>
              <button
                type="button"
                onClick={() => setFaction('Horde')}
                disabled={creating}
                className={`p-4 rounded-lg border-2 transition ${
                  faction === 'Horde'
                    ? 'border-red-500 bg-red-500/20 text-red-200'
                    : 'border-border bg-card hover:border-red-500/50'
                }`}
              >
                <p className="font-medium">Horde</p>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-lg bg-red-950/50 border border-red-600/50">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full py-6 text-lg"
            disabled={creating || !discordVerified}
          >
            {creating ? 'Creating Guild...' : 'Create Guild'}
          </Button>
        </form>
      </div>
    </div>
  )
}
