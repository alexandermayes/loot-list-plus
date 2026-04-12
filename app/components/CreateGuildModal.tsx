'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { HugeiconsIcon } from '@hugeicons/react'
import { Tick01Icon, ArrowRight01Icon, Link01Icon, File01Icon, Settings01Icon } from '@hugeicons/core-free-icons'
import { Spinner, LoadingSpinner } from '@/components/ui/loading-spinner'
import Image from 'next/image'
import RealmSelector from '@/app/components/RealmSelector'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { trackClientEvent } from '@/utils/analytics/client'

interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
}

interface CreateGuildModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

type Step = 'discord' | 'details' | 'settings'

const EXPANSIONS = [
  { id: 'Classic', name: 'Classic', image: '/images/expansions/WoWlogo.webp', available: true },
  { id: 'The Burning Crusade', name: 'TBC', image: '/images/expansions/TBCLogo.webp', available: true },
  { id: 'Wrath of the Lich King', name: 'WotLK', image: '/images/expansions/WrathLogo.webp', available: true },
  { id: 'Cataclysm', name: 'Cata', image: '/images/expansions/Cataclysmlogo.webp', available: true },
  { id: 'Mists of Pandaria', name: 'MoP', image: '/images/expansions/MoPlogo.webp', available: true },
]

export function CreateGuildModal({ isOpen, onClose, onSuccess }: CreateGuildModalProps) {
  const router = useRouter()
  const supabase = createClient()

  // Step state
  const [currentStep, setCurrentStep] = useState<Step>('discord')

  // Loading states
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // User state
  const [user, setUser] = useState<any>(null)
  const [discordVerified, setDiscordVerified] = useState(false)

  // Discord state
  const [discordGuilds, setDiscordGuilds] = useState<DiscordGuild[]>([])
  const [selectedDiscordServer, setSelectedDiscordServer] = useState('')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualServerId, setManualServerId] = useState('')
  const [botInstalled, setBotInstalled] = useState<boolean | null>(null)
  const [checkingBot, setCheckingBot] = useState(false)

  // Form state
  const [guildName, setGuildName] = useState('')
  const [realmRegion, setRealmRegion] = useState('All')
  const [realm, setRealm] = useState('')
  const [faction, setFaction] = useState<'Alliance' | 'Horde'>('Alliance')
  const [expansion, setExpansion] = useState('Classic')

  // Validation state
  const [checkingName, setCheckingName] = useState(false)
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null)
  const [nameError, setNameError] = useState('')
  const [error, setError] = useState('')
  const [discordError, setDiscordError] = useState('')

  // Load user and Discord servers on open
  useEffect(() => {
    if (isOpen) {
      trackClientEvent('guild_creation_started')
      loadUserData()
      // Reset to first step
      setCurrentStep('discord')
      setError('')
      setDiscordError('')
      setDiscordGuilds([])
      setSelectedDiscordServer('')
      setShowManualEntry(false)
      setManualServerId('')
    }
  }, [isOpen])

  const loadUserData = async () => {
    setLoading(true)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        onClose()
        router.push('/')
        return
      }
      setUser(currentUser)

      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('discord_verified')
        .eq('user_id', currentUser.id)
        .single()

      let verified = prefs?.discord_verified || false

      // Auto-verify if user logged in with Discord but not verified yet
      if (!verified) {
        try {
          const verifyResponse = await fetch('/api/verify-discord', {
            method: 'POST'
          })

          if (verifyResponse.ok) {
            verified = true
          }
        } catch (err) {
          console.error('Auto-verify failed:', err)
        }
      }

      setDiscordVerified(verified)

      if (verified) {
        await loadDiscordServers(currentUser.id)
      }
    } catch (err) {
      console.error('Error loading user data:', err)
      setError('Couldn\'t load your account data. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadDiscordServers = async (userId: string) => {
    setDiscordError('')
    try {
      const cacheKey = `discord_servers_${userId}`
      const cached = localStorage.getItem(cacheKey)
      let cachedData: any[] | null = null

      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          cachedData = parsed.data
          const cacheTimestamp = parsed.timestamp
          const fifteenMinutes = 15 * 60 * 1000

          if (cachedData && cachedData.length > 0 && Date.now() - cacheTimestamp < fifteenMinutes) {
            setDiscordGuilds(cachedData)
            return
          }
        } catch (err) {
          localStorage.removeItem(cacheKey)
        }
      }

      const response = await fetch('/api/discord-servers')
      const data = await response.json()

      if (response.ok) {
        const guilds = data.guilds || []
        setDiscordGuilds(guilds)
        localStorage.setItem(cacheKey, JSON.stringify({
          data: guilds,
          timestamp: Date.now()
        }))
      } else if (response.status === 429 && cachedData) {
        setDiscordGuilds(cachedData)
      } else {
        // Clear cache on error
        localStorage.removeItem(cacheKey)
        setDiscordError(data.error || 'Couldn\'t load Discord servers. Check your connection and try again.')
      }
    } catch (err) {
      console.error('Error fetching Discord servers:', err)
      setDiscordError('Couldn\'t connect to Discord. Check your connection and try again.')
    }
  }

  // Check bot installation
  const checkBotInstallation = async () => {
    const activeServerId = showManualEntry ? manualServerId.trim() : selectedDiscordServer
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
        setBotInstalled(false)
      }
    } catch (error) {
      setBotInstalled(false)
    } finally {
      setCheckingBot(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      checkBotInstallation()
    }
  }, [selectedDiscordServer, manualServerId, showManualEntry, isOpen])

  // Pre-fill guild name from Discord server
  useEffect(() => {
    if (selectedDiscordServer && selectedDiscordServer !== 'manual') {
      const selectedGuild = discordGuilds.find(g => g.id === selectedDiscordServer)
      if (selectedGuild && !guildName) {
        setGuildName(selectedGuild.name)
      }
    }
  }, [selectedDiscordServer, discordGuilds])

  // Check guild name uniqueness
  useEffect(() => {
    if (!guildName.trim()) {
      setNameAvailable(null)
      setNameError('')
      return
    }

    const checkName = async () => {
      setCheckingName(true)
      try {
        const { data, error } = await supabase
          .from('guilds')
          .select('id')
          .ilike('name', guildName.trim())
          .limit(1)

        if (error) {
          setNameError('Couldn\'t validate name. Try again.')
          setNameAvailable(null)
        } else if (data && data.length > 0) {
          setNameAvailable(false)
          setNameError('Name already taken')
        } else {
          setNameAvailable(true)
          setNameError('')
        }
      } catch (err) {
        setNameError('Couldn\'t validate name. Try again.')
        setNameAvailable(null)
      } finally {
        setCheckingName(false)
      }
    }

    const timeout = setTimeout(checkName, 500)
    return () => clearTimeout(timeout)
  }, [guildName])

  // Re-check bot when returning to page
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && botInstalled === false) {
        checkBotInstallation()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [botInstalled, selectedDiscordServer, manualServerId])

  const handleSubmit = async () => {
    setError('')

    if (!guildName.trim()) {
      setError('Guild name is required')
      return
    }

    if (nameAvailable === false) {
      setError('Guild name is already taken')
      return
    }

    const discordServerId = showManualEntry ? manualServerId.trim() : selectedDiscordServer
    if (!discordServerId) {
      setError('Discord server is required')
      return
    }

    if (!realm.trim()) {
      setError('Realm is required')
      return
    }

    if (botInstalled !== true) {
      setError('Bot must be installed in your Discord server')
      return
    }

    setCreating(true)

    try {
      // Final bot check
      const botCheck = await fetch(`/api/discord/check-bot?serverId=${discordServerId}`)
      if (botCheck.ok) {
        const botData = await botCheck.json()
        if (!botData.installed) {
          setError('Bot is no longer in your Discord server')
          setBotInstalled(false)
          setCreating(false)
          return
        }
      }

      const response = await fetch('/api/guilds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: guildName.trim(),
          realm: realm.trim(),
          faction,
          discord_server_id: discordServerId,
          expansion
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Couldn\'t create guild. Try again.')
        setCreating(false)
        return
      }

      // Success!
      trackClientEvent('guild_creation_completed', { guild_name: guildName.trim(), expansion, faction, realm: realm.trim() })
      onClose()
      onSuccess?.()
      window.location.href = '/overview'
    } catch (err) {
      console.error('Error creating guild:', err)
      setError('Couldn\'t create guild. Check your connection and try again.')
      setCreating(false)
    }
  }

  const getActiveServerId = () => showManualEntry ? manualServerId.trim() : selectedDiscordServer
  const canProceedFromDiscord = () => {
    const serverId = getActiveServerId()
    return serverId && serverId !== 'manual' && botInstalled === true
  }

  const canProceedFromDetails = () => {
    return guildName.trim() && nameAvailable === true && !checkingName
  }

  const canSubmit = () => {
    return canProceedFromDiscord() && canProceedFromDetails() && realm.trim() && !creating
  }

  const selectedGuild = discordGuilds.find(g => g.id === selectedDiscordServer)

  return (
    <Modal open={isOpen} onClose={onClose} size="lg" maxHeight="90vh" className="h-[600px]">
      {/* Header */}
      <ModalHeader onClose={onClose} className="pb-4">
        <div className="flex items-center gap-3">
          <img
            src="https://wow.zamimg.com/images/wow/icons/large/inv_scroll_15.jpg"
            alt="Guild Charter"
            className="w-10 h-10 rounded-lg border-2 border-border/50 shadow-md"
          />
          <div>
            <ModalTitle>Create a guild</ModalTitle>
            <ModalDescription>Link your Discord server to get started</ModalDescription>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center mt-4">
            {(['discord', 'details', 'settings'] as Step[]).map((step, idx) => {
              const stepIndex = idx
              const currentIndex = currentStep === 'discord' ? 0 : currentStep === 'details' ? 1 : 2
              const isCompleted = stepIndex < currentIndex
              const isCurrent = stepIndex === currentIndex
              const canAccess = step === 'discord' || (step === 'details' && canProceedFromDiscord()) || (step === 'settings' && canProceedFromDiscord() && canProceedFromDetails())

              return (
                <div key={step} className={`flex items-center ${idx < 2 ? 'flex-1' : ''}`}>
                  {/* Step Pill */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (step === 'discord') setCurrentStep('discord')
                      else if (step === 'details' && canProceedFromDiscord()) setCurrentStep('details')
                      else if (step === 'settings' && canProceedFromDiscord() && canProceedFromDetails()) setCurrentStep('settings')
                    }}
                    disabled={!canAccess}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium transition shrink-0 ${
                      isCompleted
                        ? 'bg-accent text-foreground'
                        : isCurrent
                          ? 'bg-primary text-primary-foreground'
                          : canAccess
                            ? 'bg-muted text-foreground hover:bg-border'
                            : 'bg-border text-foreground-muted cursor-not-allowed'
                    }`}
                  >
                    {isCompleted ? (
                      <HugeiconsIcon icon={Tick01Icon} size={16} />
                    ) : step === 'discord' ? (
                      <HugeiconsIcon icon={Link01Icon} size={16} />
                    ) : step === 'details' ? (
                      <HugeiconsIcon icon={File01Icon} size={16} />
                    ) : (
                      <HugeiconsIcon icon={Settings01Icon} size={16} />
                    )}
                    {step === 'discord' ? 'Connect Discord' : step === 'details' ? 'Add guild details' : 'Finalize settings'}
                  </Button>

                  {/* Connecting Line */}
                  {idx < 2 && (
                    <div className={`flex-1 h-0.5 mx-2 transition ${
                      stepIndex < currentIndex ? 'bg-accent' : 'bg-border-strong'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </ModalHeader>

        {/* Content */}
        <ModalBody className="flex-1 flex flex-col min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="sm" />
            </div>
          ) : !discordVerified ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h4 className="text-[18px] font-bold text-foreground mb-2">Discord verification required</h4>
              <p className="text-muted-foreground text-[14px] mb-4">
                You need to verify your Discord account before creating a guild.
              </p>
              <Button
                onClick={() => {
                  onClose()
                  router.push('/profile')
                }}
              >
                Verify Discord
              </Button>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Step 1: Discord Server */}
              {currentStep === 'discord' && (
                <div className="relative flex flex-col flex-1 min-h-0 -mt-6 -mx-6">
                  {/* Scrollable Server Selection */}
                  <div className={`flex-1 overflow-y-auto min-h-0 px-6 pt-6 ${getActiveServerId() ? (botInstalled ? 'pb-24' : 'pb-36') : 'pb-6'}`}>
                    <Label className="mb-3">Select your Discord server</Label>

                    {discordError ? (
                      <div className="p-4 bg-warning/10 border border-warning/50 rounded-xl">
                        <p className="text-warning text-[13px] mb-2">{discordError}</p>
                        {discordError.includes('log out') && (
                          <p className="text-warning/70 text-[12px]">
                            Your Discord session may have expired. Try logging out and back in, or use the manual entry below.
                          </p>
                        )}
                      </div>
                    ) : discordGuilds.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pr-2">
                        {discordGuilds.map((guild) => (
                          <Button
                            key={guild.id}
                            variant="ghost"
                            onClick={() => {
                              setSelectedDiscordServer(guild.id)
                              setShowManualEntry(false)
                              setManualServerId('')
                            }}
                            className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition text-center h-auto ${
                              selectedDiscordServer === guild.id
                                ? 'border-accent bg-accent/10'
                                : 'border-border-strong bg-background-elevated hover:border-foreground-muted'
                            }`}
                          >
                            {selectedDiscordServer === guild.id && (
                              <div className="absolute top-2 right-2">
                                <HugeiconsIcon icon={Tick01Icon} size={16} className="text-accent" />
                              </div>
                            )}
                            {guild.icon ? (
                              <img
                                src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                                alt={guild.name}
                                className="w-12 h-12 rounded-full"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-discord flex items-center justify-center text-foreground font-bold text-[16px]">
                                {guild.name.charAt(0)}
                              </div>
                            )}
                            <div className="w-full min-w-0">
                              <p className="text-foreground font-medium text-[12px] truncate">{guild.name}</p>
                              <p className="text-[10px] text-muted-foreground">{guild.owner ? 'Owner' : 'Admin'}</p>
                            </div>
                          </Button>
                        ))}
                        {/* Manual Entry Card */}
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setShowManualEntry(true)
                            setSelectedDiscordServer('')
                          }}
                          className={`relative flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition text-center h-auto ${
                            showManualEntry
                              ? 'border-accent bg-accent/10'
                              : 'border-border-strong bg-background-elevated hover:border-foreground-muted'
                          }`}
                        >
                          {showManualEntry && (
                            <div className="absolute top-2 right-2">
                              <HugeiconsIcon icon={Tick01Icon} size={16} className="text-accent" />
                            </div>
                          )}
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </div>
                          <div className="w-full min-w-0">
                            <p className="text-foreground font-medium text-[12px]">Enter ID</p>
                            <p className="text-[10px] text-muted-foreground">Manually</p>
                          </div>
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {/* Manual Entry Card - shown when no guilds */}
                        <Button
                          variant="ghost"
                          onClick={() => setShowManualEntry(true)}
                          className={`relative flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition text-center h-auto ${
                            showManualEntry
                              ? 'border-accent bg-accent/10'
                              : 'border-border-strong bg-background-elevated hover:border-foreground-muted'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </div>
                          <div className="w-full min-w-0">
                            <p className="text-foreground font-medium text-[12px]">Enter ID</p>
                            <p className="text-[10px] text-muted-foreground">Manually</p>
                          </div>
                        </Button>
                      </div>
                    )}

                    {showManualEntry && (
                      <div className="mt-3">
                        <Input
                          type="text"
                          value={manualServerId}
                          onChange={(e) => setManualServerId(e.target.value)}
                          placeholder="Paste your Discord Server ID"
                          variant="rounded"
                        />
                        <p className="text-[11px] text-muted-foreground mt-2">
                          Enable Developer Mode in Discord, right-click your server → Copy Server ID
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bot Status - Floating toast at bottom */}
                  {getActiveServerId() && (
                    <div className="absolute bottom-0 left-0 right-0 pointer-events-none px-6 pt-0">
                      <div className="bg-gradient-to-t from-background-subtle via-background-subtle/95 to-transparent pt-8">
                        <div className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-sm ${
                          checkingBot ? 'border-border-strong bg-background-elevated/90' :
                          botInstalled ? 'border-success/50 bg-background-elevated/90' :
                          'border-accent/50 bg-background-elevated/90'
                        }`}>
                          {checkingBot ? (
                            <div className="flex items-center gap-3">
                              <Spinner size="lg" className="text-muted-foreground" />
                              <p className="text-[13px] text-muted-foreground">Checking bot installation...</p>
                            </div>
                          ) : botInstalled ? (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                                <HugeiconsIcon icon={Tick01Icon} size={20} className="text-success" />
                              </div>
                              <div>
                                <p className="text-[14px] font-medium text-success">Bot connected</p>
                                <p className="text-[12px] text-success/70">LootList+ bot is in your server</p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                                  <span className="text-[16px]">🤖</span>
                                </div>
                                <div>
                                  <p className="text-[14px] font-medium text-foreground">Add LootList+ bot</p>
                                  <p className="text-[12px] text-muted-foreground">Required for Discord integration</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => window.open('https://discord.com/oauth2/authorize?client_id=1458757176171560980', '_blank')}
                                  className="flex-1 bg-discord hover:bg-discord/80 text-discord-foreground"
                                >
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                                  </svg>
                                  Add Bot
                                </Button>
                                <Button variant="outline" size="sm" onClick={checkBotInstallation}>
                                  Recheck
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Guild Details */}
              {currentStep === 'details' && (
                <div className="space-y-5">
                  {/* Guild Name */}
                  <div>
                    <Label className="mb-2">
                      Guild Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={guildName}
                        onChange={(e) => setGuildName(e.target.value)}
                        placeholder="Enter your guild name"
                        className={`pr-10 ${
                          nameAvailable === false ? 'border-destructive' :
                          nameAvailable === true ? 'border-success' :
                          ''
                        }`}
                      />
                      {checkingName && (
                        <Spinner size="lg" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      )}
                      {!checkingName && nameAvailable === true && (
                        <HugeiconsIcon icon={Tick01Icon} size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-success" />
                      )}
                    </div>
                    {nameError && <p className="text-[12px] text-destructive mt-1">{nameError}</p>}
                    {nameAvailable === true && <p className="text-[12px] text-success mt-1">Name is available</p>}
                  </div>

                  {/* Expansion */}
                  <div>
                    <Label className="mb-2">Starting expansion</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {EXPANSIONS.map((exp) => (
                        <div key={exp.id} className="relative group">
                          <Button
                            variant="ghost"
                            onClick={() => exp.available && setExpansion(exp.id)}
                            disabled={!exp.available}
                            className={`flex flex-col items-center gap-1 w-full h-auto p-0 !ring-0 !outline-none ${!exp.available ? 'cursor-not-allowed' : ''}`}
                          >
                            <div className={`relative aspect-square w-full rounded-lg overflow-hidden border-2 transition ${
                              !exp.available
                                ? 'border-border opacity-40'
                                : expansion === exp.id
                                  ? 'border-accent ring-2 ring-accent/30'
                                  : 'border-border-strong hover:border-foreground-muted'
                            }`}>
                              <img src={exp.image} alt={exp.name} className="w-full h-full object-contain p-2" />
                            </div>
                            <span className={`text-[10px] font-medium transition ${
                              !exp.available
                                ? 'text-foreground-muted'
                                : expansion === exp.id ? 'text-accent' : 'text-muted-foreground'
                            }`}>
                              {exp.name}
                            </span>
                          </Button>
                          {/* Coming Soon Tooltip */}
                          {!exp.available && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-muted border border-border-strong rounded-lg text-[10px] text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              Coming Soon
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border-strong" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      You can add more expansions from Admin settings later
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Server Settings */}
              {currentStep === 'settings' && (
                <div className="space-y-5">
                  {/* Realm */}
                  <div>
                    <Label className="mb-2">
                      Realm <span className="text-destructive">*</span>
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
                  <div>
                    <Label className="mb-2">Faction</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setFaction('Alliance')}
                        className={`alliance-btn group relative px-3 py-2.5 rounded-lg border transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden h-auto ${
                          faction === 'Alliance'
                            ? 'border-blue-500 bg-blue-500/20'
                            : 'border-border-strong bg-background-elevated hover:bg-muted'
                        }`}
                      >
                        <img
                          src="https://wow.zamimg.com/images/wow/icons/large/inv_bannerpvp_02.jpg"
                          alt="Alliance"
                          className="w-6 h-6 rounded border border-border/50 shadow-sm relative z-10"
                        />
                        <span className={`font-medium text-[13px] relative z-10 transition-colors duration-300 ${faction === 'Alliance' ? 'text-blue-400' : 'text-foreground group-hover:text-blue-400'}`}>
                          Alliance
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setFaction('Horde')}
                        className={`horde-btn group relative px-3 py-2.5 rounded-lg border transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden h-auto ${
                          faction === 'Horde'
                            ? 'border-red-500 bg-red-500/20'
                            : 'border-border-strong bg-background-elevated hover:bg-muted'
                        }`}
                      >
                        <img
                          src="https://wow.zamimg.com/images/wow/icons/large/inv_bannerpvp_01.jpg"
                          alt="Horde"
                          className="w-6 h-6 rounded border border-border/50 shadow-sm relative z-10"
                        />
                        <span className={`font-medium text-[13px] relative z-10 transition-colors duration-300 ${faction === 'Horde' ? 'text-red-400' : 'text-foreground group-hover:text-red-400'}`}>
                          Horde
                        </span>
                      </Button>
                    </div>
                    <style jsx>{`
                      .alliance-btn:hover {
                        border-color: rgb(59, 130, 246);
                        box-shadow: 0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.2);
                        background: rgba(59, 130, 246, 0.15);
                      }
                      .horde-btn:hover {
                        border-color: rgb(239, 68, 68);
                        box-shadow: 0 0 20px rgba(239, 68, 68, 0.5), 0 0 40px rgba(239, 68, 68, 0.2);
                        background: rgba(239, 68, 68, 0.15);
                      }
                    `}</style>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-background-elevated border border-border-strong rounded-xl">
                    <p className="text-[12px] text-muted-foreground mb-2">Summary</p>
                    <div className="space-y-1">
                      <p className="text-[14px] text-foreground font-medium">{guildName}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {expansion} • {realm || 'No realm selected'} • {faction}
                      </p>
                      {selectedGuild && (
                        <p className="text-[12px] text-muted-foreground">
                          Discord: {selectedGuild.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </ModalBody>

        {/* Footer */}
        {discordVerified && !loading && (
          <ModalFooter className="justify-between">
            <Button
              variant="outline"
              onClick={() => {
                if (currentStep === 'details') setCurrentStep('discord')
                else if (currentStep === 'settings') setCurrentStep('details')
                else onClose()
              }}
            >
              {currentStep === 'discord' ? 'Cancel' : 'Back'}
            </Button>

            {currentStep === 'settings' ? (
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!canSubmit()}
              >
                {creating ? (
                  <>
                    <Spinner />
                    Creating...
                  </>
                ) : (
                  'Create guild'
                )}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => {
                  if (currentStep === 'discord' && canProceedFromDiscord()) setCurrentStep('details')
                  else if (currentStep === 'details' && canProceedFromDetails()) setCurrentStep('settings')
                }}
                disabled={
                  (currentStep === 'discord' && !canProceedFromDiscord()) ||
                  (currentStep === 'details' && !canProceedFromDetails())
                }
              >
                Continue
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
              </Button>
            )}
          </ModalFooter>
        )}
    </Modal>
  )
}
