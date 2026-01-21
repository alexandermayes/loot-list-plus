'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Check, ChevronRight, Users2, Swords, Globe, Loader2 } from 'lucide-react'
import Image from 'next/image'
import RealmSelector from '@/app/components/RealmSelector'

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
  { id: 'Classic', name: 'Classic', image: 'https://beta.softres.it/img/editions/classic.big.png' },
  { id: 'The Burning Crusade', name: 'TBC', image: 'https://beta.softres.it/img/editions/tbc.big.png' },
  { id: 'Wrath of the Lich King', name: 'WotLK', image: 'https://beta.softres.it/img/editions/wotlk.big.png' },
  { id: 'Cataclysm', name: 'Cata', image: 'https://beta.softres.it/img/editions/cata.big.png' },
  { id: 'Mists of Pandaria', name: 'MoP', image: 'https://beta.softres.it/img/editions/mop.big.png' },
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
  const [faction, setFaction] = useState<'Alliance' | 'Horde'>('Horde')
  const [expansion, setExpansion] = useState('Classic')

  // Validation state
  const [checkingName, setCheckingName] = useState(false)
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null)
  const [nameError, setNameError] = useState('')
  const [error, setError] = useState('')

  // Load user and Discord servers on open
  useEffect(() => {
    if (isOpen) {
      loadUserData()
      // Reset to first step
      setCurrentStep('discord')
      setError('')
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

      const verified = prefs?.discord_verified || false
      setDiscordVerified(verified)

      if (verified) {
        await loadDiscordServers(currentUser.id)
      }
    } catch (err) {
      console.error('Error loading user data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadDiscordServers = async (userId: string) => {
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

          if (cachedData && Date.now() - cacheTimestamp < fifteenMinutes) {
            setDiscordGuilds(cachedData)
            return
          }
        } catch (err) {
          localStorage.removeItem(cacheKey)
        }
      }

      const response = await fetch('/api/discord-servers')
      if (response.ok) {
        const data = await response.json()
        const guilds = data.guilds || []
        setDiscordGuilds(guilds)
        localStorage.setItem(cacheKey, JSON.stringify({
          data: guilds,
          timestamp: Date.now()
        }))
      } else if (response.status === 429 && cachedData) {
        setDiscordGuilds(cachedData)
      }
    } catch (err) {
      console.error('Error fetching Discord servers:', err)
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
          setNameError('Failed to validate')
          setNameAvailable(null)
        } else if (data && data.length > 0) {
          setNameAvailable(false)
          setNameError('Name already taken')
        } else {
          setNameAvailable(true)
          setNameError('')
        }
      } catch (err) {
        setNameError('Failed to validate')
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
        setError(data.error || 'Failed to create guild')
        setCreating(false)
        return
      }

      // Success!
      onClose()
      onSuccess?.()
      window.location.href = '/dashboard'
    } catch (err) {
      console.error('Error creating guild:', err)
      setError('An error occurred')
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

  if (!isOpen) return null

  const selectedGuild = discordGuilds.find(g => g.id === selectedDiscordServer)

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0d0e11] border border-[#383838] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#383838] bg-[#141519]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#ff8000] to-[#ff6000] rounded-xl flex items-center justify-center">
                <Users2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-[20px] font-bold text-white">Create Your Guild</h3>
                <p className="text-[12px] text-[#a1a1a1]">Set up loot tracking for your team</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#a1a1a1] hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mt-4">
            {(['discord', 'details', 'settings'] as Step[]).map((step, idx) => (
              <div key={step} className="flex items-center">
                <button
                  onClick={() => {
                    if (step === 'discord') setCurrentStep('discord')
                    else if (step === 'details' && canProceedFromDiscord()) setCurrentStep('details')
                    else if (step === 'settings' && canProceedFromDiscord() && canProceedFromDetails()) setCurrentStep('settings')
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium transition ${
                    currentStep === step
                      ? 'bg-white text-black'
                      : (step === 'discord' || (step === 'details' && canProceedFromDiscord()) || (step === 'settings' && canProceedFromDiscord() && canProceedFromDetails()))
                        ? 'bg-[#252525] text-white hover:bg-[#303030]'
                        : 'bg-[#1a1a1a] text-[#505050] cursor-not-allowed'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  {step === 'discord' ? 'Discord' : step === 'details' ? 'Details' : 'Settings'}
                </button>
                {idx < 2 && <ChevronRight className="w-4 h-4 text-[#383838] mx-1" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#ff8000]" />
            </div>
          ) : !discordVerified ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h4 className="text-[18px] font-bold text-white mb-2">Discord Verification Required</h4>
              <p className="text-[#a1a1a1] text-[14px] mb-4">
                You need to verify your Discord account before creating a guild.
              </p>
              <button
                onClick={() => {
                  onClose()
                  router.push('/profile/settings')
                }}
                className="px-6 py-2.5 bg-white hover:bg-gray-100 rounded-[52px] text-black text-[13px] font-medium transition"
              >
                Verify Discord
              </button>
            </div>
          ) : (
            <>
              {/* Step 1: Discord Server */}
              {currentStep === 'discord' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">
                      Select Your Discord Server
                    </label>
                    <p className="text-[12px] text-[#a1a1a1] mb-3">
                      Choose the server where your guild members are
                    </p>

                    {discordGuilds.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2">
                        {discordGuilds.map((guild) => (
                          <button
                            key={guild.id}
                            onClick={() => {
                              setSelectedDiscordServer(guild.id)
                              setShowManualEntry(false)
                              setManualServerId('')
                            }}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                              selectedDiscordServer === guild.id
                                ? 'border-[#ff8000] bg-[#ff8000]/10'
                                : 'border-[#383838] bg-[#151515] hover:border-[#505050]'
                            }`}
                          >
                            {guild.icon ? (
                              <img
                                src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                                alt={guild.name}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold text-[14px]">
                                {guild.name.charAt(0)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium text-[14px] truncate">{guild.name}</p>
                              {guild.owner && (
                                <p className="text-[11px] text-[#a1a1a1]">Owner</p>
                              )}
                            </div>
                            {selectedDiscordServer === guild.id && (
                              <Check className="w-5 h-5 text-[#ff8000]" />
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-[#a1a1a1] text-[13px]">
                        No Discord servers found. Enter your Server ID manually below.
                      </div>
                    )}

                    {/* Manual Entry Toggle */}
                    <button
                      onClick={() => {
                        setShowManualEntry(!showManualEntry)
                        if (!showManualEntry) {
                          setSelectedDiscordServer('')
                        }
                      }}
                      className="mt-3 text-[12px] text-[#ff8000] hover:underline"
                    >
                      {showManualEntry ? 'Select from list instead' : 'Enter Server ID manually'}
                    </button>

                    {showManualEntry && (
                      <div className="mt-3">
                        <input
                          type="text"
                          value={manualServerId}
                          onChange={(e) => setManualServerId(e.target.value)}
                          placeholder="Paste your Discord Server ID"
                          className="w-full px-4 py-2.5 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition"
                        />
                        <p className="text-[11px] text-[#a1a1a1] mt-2">
                          Enable Developer Mode in Discord, then right-click your server → Copy Server ID
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bot Status */}
                  {getActiveServerId() && (
                    <div className={`p-4 rounded-xl border ${
                      checkingBot ? 'border-[#383838] bg-[#151515]' :
                      botInstalled ? 'border-green-600/50 bg-green-950/20' :
                      'border-[#ff8000]/50 bg-[#ff8000]/10'
                    }`}>
                      {checkingBot ? (
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-5 h-5 animate-spin text-[#a1a1a1]" />
                          <p className="text-[13px] text-[#a1a1a1]">Checking bot installation...</p>
                        </div>
                      ) : botInstalled ? (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Check className="w-5 h-5 text-green-400" />
                          </div>
                          <div>
                            <p className="text-[14px] font-medium text-green-400">Bot Connected!</p>
                            <p className="text-[12px] text-green-400/70">LootList+ bot is in your server</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#ff8000]/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-[16px]">🤖</span>
                            </div>
                            <div>
                              <p className="text-[14px] font-medium text-white">Add LootList+ Bot</p>
                              <p className="text-[12px] text-[#a1a1a1]">Required for Discord integration</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => window.open('https://discord.com/oauth2/authorize?client_id=1458757176171560980', '_blank')}
                              className="flex-1 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] rounded-[52px] text-white text-[13px] font-medium transition flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                              </svg>
                              Add Bot
                            </button>
                            <button
                              onClick={checkBotInstallation}
                              className="px-4 py-2 bg-[#252525] hover:bg-[#303030] border border-[#383838] rounded-[52px] text-white text-[13px] font-medium transition"
                            >
                              Recheck
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Guild Details */}
              {currentStep === 'details' && (
                <div className="space-y-5">
                  {/* Guild Name */}
                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">
                      Guild Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={guildName}
                        onChange={(e) => setGuildName(e.target.value)}
                        placeholder="Enter your guild name"
                        className={`w-full px-4 py-2.5 bg-[#151515] border rounded-[52px] text-white text-[13px] focus:outline-none transition pr-10 ${
                          nameAvailable === false ? 'border-red-500' :
                          nameAvailable === true ? 'border-green-500' :
                          'border-[#383838] focus:border-[#ff8000]'
                        }`}
                      />
                      {checkingName && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-[#a1a1a1]" />
                      )}
                      {!checkingName && nameAvailable === true && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                      )}
                    </div>
                    {nameError && <p className="text-[12px] text-red-400 mt-1">{nameError}</p>}
                    {nameAvailable === true && <p className="text-[12px] text-green-400 mt-1">Name is available!</p>}
                  </div>

                  {/* Expansion */}
                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">
                      Starting Expansion
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {EXPANSIONS.map((exp) => (
                        <button
                          key={exp.id}
                          onClick={() => setExpansion(exp.id)}
                          className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition ${
                            expansion === exp.id
                              ? 'border-[#ff8000] ring-2 ring-[#ff8000]/30'
                              : 'border-[#383838] hover:border-[#505050]'
                          }`}
                        >
                          <img src={exp.image} alt={exp.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-white">
                            {exp.name}
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-[#a1a1a1] mt-2">
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
                    <label className="block text-[13px] font-medium text-white mb-2">
                      Realm <span className="text-red-500">*</span>
                    </label>
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
                    <label className="block text-[13px] font-medium text-white mb-3">
                      Faction
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setFaction('Alliance')}
                        className={`p-4 rounded-xl border-2 transition flex items-center justify-center gap-3 ${
                          faction === 'Alliance'
                            ? 'border-blue-500 bg-blue-500/20'
                            : 'border-[#383838] bg-[#151515] hover:border-blue-500/50'
                        }`}
                      >
                        <img
                          src="https://wow.zamimg.com/images/icons/alliance.png"
                          alt="Alliance"
                          className="w-8 h-8"
                        />
                        <span className={`font-medium ${faction === 'Alliance' ? 'text-blue-400' : 'text-white'}`}>
                          Alliance
                        </span>
                      </button>
                      <button
                        onClick={() => setFaction('Horde')}
                        className={`p-4 rounded-xl border-2 transition flex items-center justify-center gap-3 ${
                          faction === 'Horde'
                            ? 'border-red-500 bg-red-500/20'
                            : 'border-[#383838] bg-[#151515] hover:border-red-500/50'
                        }`}
                      >
                        <img
                          src="https://wow.zamimg.com/images/icons/horde.png"
                          alt="Horde"
                          className="w-8 h-8"
                        />
                        <span className={`font-medium ${faction === 'Horde' ? 'text-red-400' : 'text-white'}`}>
                          Horde
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-[#151515] border border-[#383838] rounded-xl">
                    <p className="text-[12px] text-[#a1a1a1] mb-2">Summary</p>
                    <div className="space-y-1">
                      <p className="text-[14px] text-white font-medium">{guildName}</p>
                      <p className="text-[12px] text-[#a1a1a1]">
                        {expansion} • {realm || 'No realm selected'} • {faction}
                      </p>
                      {selectedGuild && (
                        <p className="text-[12px] text-[#a1a1a1]">
                          Discord: {selectedGuild.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-600/50 rounded-xl">
                  <p className="text-[13px] text-red-400">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {discordVerified && !loading && (
          <div className="p-6 border-t border-[#383838] bg-[#141519] flex justify-between">
            <button
              onClick={() => {
                if (currentStep === 'details') setCurrentStep('discord')
                else if (currentStep === 'settings') setCurrentStep('details')
                else onClose()
              }}
              className="px-6 py-2.5 bg-[#151515] hover:bg-[#1a1a1a] border border-[#383838] rounded-[52px] text-white text-[13px] transition"
            >
              {currentStep === 'discord' ? 'Cancel' : 'Back'}
            </button>

            {currentStep === 'settings' ? (
              <button
                onClick={handleSubmit}
                disabled={!canSubmit()}
                className="px-6 py-2.5 bg-white hover:bg-gray-100 rounded-[52px] text-black text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Guild'
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  if (currentStep === 'discord' && canProceedFromDiscord()) setCurrentStep('details')
                  else if (currentStep === 'details' && canProceedFromDetails()) setCurrentStep('settings')
                }}
                disabled={
                  (currentStep === 'discord' && !canProceedFromDiscord()) ||
                  (currentStep === 'details' && !canProceedFromDetails())
                }
                className="px-6 py-2.5 bg-white hover:bg-gray-100 rounded-[52px] text-black text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
