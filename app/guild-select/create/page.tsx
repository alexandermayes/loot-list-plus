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
  const [successMessage, setSuccessMessage] = useState('')

  // Form state
  const [guildName, setGuildName] = useState('')
  const [selectedDiscordServer, setSelectedDiscordServer] = useState('')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualServerId, setManualServerId] = useState('')
  const [realmRegion, setRealmRegion] = useState('All')
  const [realm, setRealm] = useState('')
  const [faction, setFaction] = useState<'Alliance' | 'Horde'>('Alliance')
  const [expansion, setExpansion] = useState('Classic')

  // Guild name validation state
  const [checkingName, setCheckingName] = useState(false)
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null)
  const [nameError, setNameError] = useState('')

  // Bot installation state
  const [botInstalled, setBotInstalled] = useState<boolean | null>(null)
  const [checkingBot, setCheckingBot] = useState(false)

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

            if (response.status === 429) {
              console.error('Discord rate limit:', errorData)
              setError('Discord rate limit reached. Please wait a minute and refresh the page.')
            } else if (response.status === 400) {
              // Missing provider token - user needs to re-authenticate
              console.warn('Discord provider token missing. User can still use manual server ID entry.')
              // Don't show error, they can use manual entry
            } else {
              console.error('Failed to fetch Discord servers:', response.status, errorData)
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

  // Check if bot is installed when Discord server is selected
  const checkBotInstallation = async () => {
    // Get the active server ID
    let activeServerId = ''
    if (showManualEntry) {
      activeServerId = manualServerId.trim()
    } else {
      activeServerId = selectedDiscordServer
    }

    if (!activeServerId || activeServerId === 'manual') {
      setBotInstalled(null)
      return
    }

    setCheckingBot(true)
    try {
      const response = await fetch(`/api/discord/check-bot?serverId=${activeServerId}`)
      if (response.ok) {
        const data = await response.json()
        setBotInstalled(data.installed)
      } else {
        // If check fails, assume not installed to be safe
        setBotInstalled(false)
      }
    } catch (error) {
      console.error('Error checking bot installation:', error)
      setBotInstalled(false)
    } finally {
      setCheckingBot(false)
    }
  }

  useEffect(() => {
    checkBotInstallation()
  }, [selectedDiscordServer, manualServerId, showManualEntry])

  // Check guild name uniqueness with debounce
  useEffect(() => {
    if (!guildName.trim()) {
      setNameAvailable(null)
      setNameError('')
      return
    }

    const checkNameUniqueness = async () => {
      setCheckingName(true)
      setNameError('')

      try {
        const { data, error } = await supabase
          .from('guilds')
          .select('id, name')
          .ilike('name', guildName.trim())
          .limit(1)

        if (error) {
          console.error('Error checking guild name:', error)
          setNameError('Failed to validate guild name')
          setNameAvailable(null)
        } else if (data && data.length > 0) {
          setNameAvailable(false)
          setNameError(`Guild name "${guildName.trim()}" is already taken`)
        } else {
          setNameAvailable(true)
          setNameError('')
        }
      } catch (err) {
        console.error('Error checking guild name:', err)
        setNameError('Failed to validate guild name')
        setNameAvailable(null)
      } finally {
        setCheckingName(false)
      }
    }

    // Debounce the check by 500ms
    const timeoutId = setTimeout(() => {
      checkNameUniqueness()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [guildName])

  // Pre-fill guild name when Discord server is selected
  useEffect(() => {
    if (selectedDiscordServer && selectedDiscordServer !== 'manual') {
      const selectedGuild = discordGuilds.find(g => g.id === selectedDiscordServer)
      if (selectedGuild) {
        setGuildName(selectedGuild.name)
      }
    }
  }, [selectedDiscordServer, discordGuilds])

  // Re-check bot installation when user returns to the page (after adding bot in another tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const hasServerId = showManualEntry ? manualServerId.trim() : selectedDiscordServer
      if (document.visibilityState === 'visible' && hasServerId && hasServerId !== 'manual') {
        // Only recheck if bot was previously not installed
        if (botInstalled === false) {
          console.log('Page became visible, rechecking bot installation...')
          checkBotInstallation()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [selectedDiscordServer, manualServerId, botInstalled, showManualEntry])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!discordVerified) {
      setError('Discord verification required')
      return
    }

    if (!guildName.trim()) {
      setError('Guild name is required')
      return
    }

    // Check if name is available
    if (nameAvailable === false) {
      setError('Guild name is already taken. Please choose a different name.')
      return
    }

    // Wait for name check to complete if still checking
    if (checkingName) {
      setError('Please wait while we verify the guild name')
      return
    }

    // Get the Discord server ID
    const discordServerId = showManualEntry ? manualServerId.trim() : selectedDiscordServer

    if (!discordServerId || discordServerId === 'manual') {
      setError('Discord server is required')
      return
    }

    if (!realm.trim()) {
      setError('Realm is required')
      return
    }

    if (botInstalled === false) {
      setError('You must add the LootList+ bot to your Discord server before creating a guild')
      return
    }

    if (botInstalled === null || checkingBot) {
      setError('Please wait while we verify bot installation')
      return
    }

    // Final check: Verify bot is still installed right before creating guild
    setCreating(true)
    try {
      const botCheckResponse = await fetch(`/api/discord/check-bot?serverId=${discordServerId}`)
      if (botCheckResponse.ok) {
        const botCheckData = await botCheckResponse.json()
        if (!botCheckData.installed) {
          setError('The LootList+ bot is no longer in your Discord server. Please add it again.')
          setBotInstalled(false)
          setCreating(false)
          return
        }
      } else {
        setError('Unable to verify bot installation. Please try again.')
        setCreating(false)
        return
      }
    } catch (error) {
      console.error('Error verifying bot before guild creation:', error)
      setError('Unable to verify bot installation. Please try again.')
      setCreating(false)
      return
    }

    try {
      const response = await fetch('/api/guilds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: guildName.trim(),
          realm: realm.trim(),
          faction,
          discord_server_id: discordServerId || null,
          expansion
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create guild')
        setCreating(false)
        return
      }

      // Show success message
      setSuccessMessage(`Successfully created guild "${guildName.trim()}"!`)

      // Wait a moment to show the success message, then redirect
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1500)
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
            LootList+ requires a Discord server connection for automatic guild icon fetching and member management features.
          </p>

          <div className="space-y-2">
            <p className="text-foreground font-medium">Required Steps:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Select your Discord server (or enter Server ID manually)</li>
              <li>Add the LootList+ bot to your server when prompted</li>
              <li>Complete the guild registration form</li>
            </ol>
          </div>

          <p className="text-muted-foreground">
            After registration, invite guild members by sharing invite codes or using Discord auto-join.
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
              Guild Name <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="guildName"
                type="text"
                placeholder="must be unique"
                value={guildName}
                onChange={(e) => setGuildName(e.target.value)}
                required
                disabled={creating}
                className={`text-base pr-10 ${
                  nameAvailable === false ? 'border-red-500' :
                  nameAvailable === true ? 'border-green-500' : ''
                }`}
              />
              {checkingName && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="w-5 h-5 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                  </svg>
                </div>
              )}
              {!checkingName && nameAvailable === true && guildName.trim() && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
              )}
              {!checkingName && nameAvailable === false && guildName.trim() && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </div>
              )}
            </div>
            {nameError && (
              <p className="text-sm text-red-500">{nameError}</p>
            )}
            {!checkingName && nameAvailable === true && guildName.trim() && (
              <p className="text-sm text-green-500">Guild name is available!</p>
            )}
          </div>

          {/* Discord Server Selection */}
          <div className="space-y-2">
            <Label htmlFor="discordServer" className="flex items-center gap-2 text-base">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Discord Server <span className="text-red-500">*</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              {discordGuilds.length > 0
                ? 'Select from servers where you have admin permissions'
                : 'Enter your Discord Server ID manually'
              }
            </p>
            <select
              id="discordServer"
              value={showManualEntry ? 'manual' : selectedDiscordServer}
              onChange={(e) => {
                if (e.target.value === 'manual') {
                  setShowManualEntry(true)
                  setSelectedDiscordServer('')
                  setBotInstalled(null)
                } else {
                  setShowManualEntry(false)
                  setSelectedDiscordServer(e.target.value)
                  setManualServerId('')
                  setBotInstalled(null)
                }
              }}
              disabled={creating}
              className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] cursor-pointer select-custom disabled:opacity-50"
            >
              <option value="" className="bg-[#151515] text-white">Select a server...</option>
              {discordGuilds.length > 0 && discordGuilds.map((guild) => (
                <option key={guild.id} value={guild.id} className="bg-[#151515] text-white">
                  {guild.name}
                </option>
              ))}
              <option value="manual" className="bg-[#151515] text-white">Manually enter Server ID</option>
            </select>
          </div>

          {/* Manual Discord Server ID Input (shown when manual option selected) */}
          {showManualEntry && (
            <div className="space-y-2">
              <Label htmlFor="manualServerId" className="flex items-center gap-2 text-base">
                Discord Server ID <span className="text-red-500">*</span>
                <a href="https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID"
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-primary hover:underline text-sm">
                  (how to find)
                </a>
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                Enable Developer Mode in Discord, then right-click your server → Copy Server ID
              </p>
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
          )}

          {/* Bot Status - Show when server is selected */}
          {((selectedDiscordServer && selectedDiscordServer !== 'manual') || (showManualEntry && manualServerId.trim())) && (
            <>
              {/* Checking bot status */}
              {checkingBot && (
                <div className="bg-muted/50 border border-border rounded-lg p-6">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 animate-spin text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                    </svg>
                    <div>
                      <p className="text-foreground font-medium">Verifying Bot Installation</p>
                      <p className="text-sm text-muted-foreground">Checking if LootList+ bot is in your Discord server...</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bot is installed - Success message */}
              {!checkingBot && botInstalled === true && (
                <div className="bg-green-950/20 border border-green-600/50 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <div className="text-green-500 text-2xl">✅</div>
                    <div className="flex-1">
                      <p className="font-semibold text-green-200 text-lg">Bot is Installed!</p>
                      <p className="text-sm text-green-300/80 mt-1">
                        The LootList+ bot is active in your Discord server. You're all set!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bot is NOT installed - Show add button */}
              {!checkingBot && botInstalled === false && (
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="text-primary text-2xl">🤖</div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-foreground font-semibold text-lg">Add LootList+ Bot to Your Discord</p>
                        <p className="text-muted-foreground text-sm mt-1">
                          Required for automatic guild icon fetching and Discord integration features.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => {
                            window.open('https://discord.com/oauth2/authorize?client_id=1458757176171560980', '_blank')
                          }}
                          className="flex-1 sm:flex-none"
                        >
                          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                          </svg>
                          Add Bot to Discord Server
                        </Button>

                        <Button
                          type="button"
                          onClick={() => checkBotInstallation()}
                          variant="outline"
                          className="flex-1 sm:flex-none"
                        >
                          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                          </svg>
                          Recheck
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        You'll need admin permissions on your Discord server to add the bot. After adding, return here and click "Recheck" or the page will automatically verify.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

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
              Realm <span className="text-red-500">*</span>
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

          {successMessage && (
            <div className="p-4 rounded-lg bg-green-950/50 border border-green-600/50">
              <p className="text-sm text-green-200">{successMessage}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full py-6 text-lg"
            disabled={
              creating ||
              !discordVerified ||
              !guildName.trim() ||
              checkingName ||
              nameAvailable === false ||
              !realm.trim() ||
              (showManualEntry ? !manualServerId.trim() : (!selectedDiscordServer || selectedDiscordServer === 'manual')) ||
              botInstalled === false ||
              botInstalled === null ||
              checkingBot
            }
          >
            {creating ? 'Creating Guild...' :
             checkingBot ? 'Checking Bot...' :
             checkingName ? 'Checking Name...' :
             'Create Guild'}
          </Button>

          {/* Helper text for button state */}
          {!discordVerified && (
            <p className="text-sm text-muted-foreground text-center -mt-3">
              Discord verification required
            </p>
          )}
          {discordVerified && (showManualEntry ? !manualServerId.trim() : (!selectedDiscordServer || selectedDiscordServer === 'manual')) && (
            <p className="text-sm text-muted-foreground text-center -mt-3">
              {showManualEntry ? 'Enter your Discord Server ID' : 'Select a Discord server to continue'}
            </p>
          )}
          {discordVerified && ((selectedDiscordServer && selectedDiscordServer !== 'manual') || (showManualEntry && manualServerId.trim())) && botInstalled === false && (
            <p className="text-sm text-yellow-400 text-center -mt-3">
              Add the bot to your Discord server to continue
            </p>
          )}
          {discordVerified && ((selectedDiscordServer && selectedDiscordServer !== 'manual') || (showManualEntry && manualServerId.trim())) && checkingBot && (
            <p className="text-sm text-muted-foreground text-center -mt-3">
              Verifying bot installation...
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
