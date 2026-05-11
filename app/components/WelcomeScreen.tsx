'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  Modal,
  ModalHeader,
  ModalBody,
} from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { trackClientEvent } from '@/utils/analytics/client'
import { CreateGuildModal } from '@/app/components/CreateGuildModal'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, InformationCircleIcon } from '@hugeicons/core-free-icons'

export default function WelcomeScreen() {
  const [inviteCode, setInviteCode] = useState('')
  const [modalInviteCode, setModalInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [discordLoading, setDiscordLoading] = useState(false)
  const [availableGuilds, setAvailableGuilds] = useState<any[]>([])
  const [discordError, setDiscordError] = useState('')
  const [joiningGuildId, setJoiningGuildId] = useState<string | null>(null)
  const [showCreateGuild, setShowCreateGuild] = useState(false)
  // Pre-fill data for guild creation from Discord flow
  const [createPreselectedServer, setCreatePreselectedServer] = useState<string | undefined>()
  const [createSuggestedName, setCreateSuggestedName] = useState<string | undefined>()
  // Cached Discord servers for pre-fill
  const [discordServers, setDiscordServers] = useState<{ id: string; name: string; owner: boolean }[]>([])
  const router = useRouter()
  const supabase = createClient()

  const handleCloseModal = () => {
    setShowModal(false)
  }

  const handleOpenDiscordModal = async () => {
    trackClientEvent('welcome_discord_clicked')
    setDiscordLoading(true)
    setDiscordError('')
    setAvailableGuilds([])

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setDiscordError('Please log in first')
      setDiscordLoading(false)
      return
    }

    // Auto-verify Discord if needed
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('discord_verified')
      .eq('user_id', user.id)
      .single()

    if (!preferences?.discord_verified) {
      try {
        const verifyResponse = await fetch('/api/verify-discord', { method: 'POST' })
        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json()
          setDiscordError(errorData.error || 'Discord verification required. Go to your Profile to verify.')
          trackClientEvent('welcome_discord_error')
          setDiscordLoading(false)
          return
        }
      } catch {
        setDiscordError('Discord verification required. Go to your Profile to verify.')
        trackClientEvent('welcome_discord_error')
        setDiscordLoading(false)
        return
      }
    }

    // Fetch available guilds
    try {
      const response = await fetch('/api/discord-guilds')
      const data = await response.json()

      if (!response.ok) {
        const errorMessage = response.status === 429
          ? 'Discord rate limit reached. Wait a moment and try again.'
          : data.error || 'Couldn\'t load guilds. Check your connection.'
        setDiscordError(errorMessage)
        trackClientEvent('welcome_discord_error')
        setDiscordLoading(false)
        return
      }

      const guilds = data.available_guilds || []
      setAvailableGuilds(guilds)

      if (guilds.length === 0) {
        trackClientEvent('welcome_discord_no_guilds')
        // Also fetch user's Discord servers for pre-fill
        try {
          const serversRes = await fetch('/api/discord-servers')
          if (serversRes.ok) {
            const serversData = await serversRes.json()
            setDiscordServers(serversData.guilds || [])
          }
        } catch { /* ignore */ }
      }

      setDiscordLoading(false)
    } catch {
      setDiscordError('Couldn\'t load guilds. Check your connection.')
      trackClientEvent('welcome_discord_error')
      setDiscordLoading(false)
    }
  }

  const handleJoinDiscordGuild = async (guildId: string) => {
    setJoiningGuildId(guildId)
    setDiscordError('')

    try {
      const response = await fetch('/api/discord-guilds/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: guildId })
      })

      const data = await response.json()

      if (!response.ok) {
        setDiscordError(data.error || 'Couldn\'t join guild. Try again.')
        setJoiningGuildId(null)
        return
      }

      trackClientEvent('onboarding_guild_joined', { join_method: 'discord', guild_id: guildId })
      window.location.href = '/overview'
    } catch {
      setDiscordError('Couldn\'t join guild. Check your connection.')
      setJoiningGuildId(null)
    }
  }

  const handleCodeJoin = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code')
      return
    }

    trackClientEvent('welcome_code_entered')
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/guild-invites/${inviteCode.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid invite code')
        setLoading(false)
        return
      }

      trackClientEvent('onboarding_guild_joined', { join_method: 'invite_code' })
      window.location.href = '/overview'
    } catch (err: any) {
      setError(err.message || 'Couldn\'t join guild. Check your connection.')
      setLoading(false)
    }
  }

  const handleModalCodeJoin = async () => {
    if (!modalInviteCode.trim()) return
    setJoiningGuildId('code')

    try {
      const response = await fetch(`/api/guild-invites/${modalInviteCode.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (!response.ok) {
        setDiscordError(data.error || 'Invalid invite code')
        setJoiningGuildId(null)
        return
      }

      trackClientEvent('onboarding_guild_joined', { join_method: 'invite_code' })
      window.location.href = '/overview'
    } catch (err: any) {
      setDiscordError(err.message || 'Couldn\'t join guild. Check your connection.')
      setJoiningGuildId(null)
    }
  }

  const handleCreateFromDiscord = () => {
    // Pre-fill with the user's owned server if available
    const ownedServer = discordServers.find(s => s.owner)
    setCreatePreselectedServer(ownedServer?.id)
    setCreateSuggestedName(ownedServer?.name)
    handleCloseModal()
    setShowCreateGuild(true)
  }

  useEffect(() => {
    trackClientEvent('onboarding_viewed')
  }, [])

  return (
    <>
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 lg:px-12">
        <div className="flex flex-col items-center gap-10 w-full max-w-5xl">
          {/* Header */}
          <div className="flex flex-col items-center gap-5 text-center w-full">
            <Image
              src="/lootlist-icon.svg"
              alt="LootList+"
              width={33}
              height={44}
              className="w-[33px] h-[44px]"
            />
            <h1 className="font-poppins font-bold text-[42px] leading-[43px] text-foreground text-balance">
              Welcome to LootList+
            </h1>
            <p className="font-poppins font-normal text-base text-muted-foreground text-pretty">
              You're not in any guilds yet. Join an existing guild or start a new one.
            </p>
          </div>

          {/* 3 Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            {/* Join via Discord */}
            <div className="bg-background-elevated border border-border rounded-[24px] sm:rounded-[40px] p-4 pt-6 sm:p-6 sm:pt-[43px] pb-4 sm:pb-6 flex flex-col items-center">
              <div className="flex flex-col gap-6 items-center w-full flex-1">
                <Image
                  src="/icons/discord-large.svg"
                  alt="Discord"
                  width={44}
                  height={44}
                  className="w-11 h-11"
                />
                <div className="flex flex-col gap-1 text-center w-full">
                  <h2 className="font-poppins font-bold text-xl text-foreground">
                    Join with Discord
                  </h2>
                  <p className="font-poppins font-normal text-sm text-muted-foreground text-pretty">
                    Auto-join if your guild has Discord linked.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setShowModal(true)
                  handleOpenDiscordModal()
                }}
                className="w-full mt-6"
              >
                Find my guild
              </Button>
            </div>

            {/* Join with Code */}
            <div className="bg-background-elevated border border-border rounded-[24px] sm:rounded-[40px] p-4 pt-6 sm:p-6 sm:pt-[43px] pb-4 sm:pb-6 flex flex-col items-center">
              <div className="flex flex-col gap-6 items-center w-full flex-1">
                <Image
                  src="/icons/password-validation.svg"
                  alt="Code"
                  width={44}
                  height={44}
                  className="w-11 h-11"
                />
                <div className="flex flex-col gap-1 text-center w-full">
                  <h2 className="font-poppins font-bold text-xl text-foreground">
                    Join with code
                  </h2>
                  <p className="font-poppins font-normal text-sm text-muted-foreground text-pretty">
                    Paste the invite code from your officer.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 w-full mt-6">
                <div className="flex gap-2.5 w-full">
                  <Input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="ABC123DEF456"
                    variant="pill"
                    className="flex-1 min-w-0 font-poppins font-medium"
                    disabled={loading}
                  />
                  <Button
                    onClick={handleCodeJoin}
                    disabled={!inviteCode.trim()}
                    loading={loading}
                    className="shrink-0"
                  >
                    Join
                  </Button>
                </div>
                {error && (
                  <p className="text-destructive text-sm font-poppins text-center">{error}</p>
                )}
              </div>
            </div>

            {/* Create a Guild */}
            <div className="bg-background-elevated border border-border rounded-[24px] sm:rounded-[40px] p-4 pt-6 sm:p-6 sm:pt-[43px] pb-4 sm:pb-6 flex flex-col items-center">
              <div className="flex flex-col gap-6 items-center w-full flex-1">
                <Image
                  src="/icons/crown.svg"
                  alt="Create"
                  width={44}
                  height={44}
                  className="w-11 h-11"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/lootlist-icon.svg' }}
                />
                <div className="flex flex-col gap-1 text-center w-full">
                  <h2 className="font-poppins font-bold text-xl text-foreground">
                    Start a guild
                  </h2>
                  <p className="font-poppins font-normal text-sm text-muted-foreground text-pretty">
                    Set up your guild and invite your raiders.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  trackClientEvent('welcome_create_clicked')
                  setShowCreateGuild(true)
                }}
                className="w-full mt-6"
              >
                Create guild
              </Button>
            </div>
          </div>

          {/* Help text */}
          <p className="font-poppins font-normal text-xs text-muted-foreground text-center">
            Not sure which to pick? Ask your guild officer for an invite code, or create a guild if you're the leader.
          </p>
        </div>
      </div>

      {/* Join via Discord Modal */}
      <Modal open={showModal} onClose={handleCloseModal} size="default" zIndex={100}>
        <ModalHeader onClose={handleCloseModal} showCloseButton={false} className="bg-background-elevated">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <img
                src="https://wow.zamimg.com/images/wow/icons/large/inv_shirt_guildtabard_01.jpg"
                alt="Guild Tabard"
                className="w-10 h-10 rounded-lg border-2 border-border/50 shadow-md"
              />
              <div>
                <h3 className="text-[20px] font-bold text-foreground">Select guild</h3>
                <p className="text-[12px] text-muted-foreground">Automatically join guilds from your Discord servers</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseModal}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={24} />
            </Button>
          </div>
        </ModalHeader>

        <ModalBody>
          {discordLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner text="Loading available guilds..." />
            </div>
          ) : discordError ? (
            <Alert variant="destructive" className="flex flex-col gap-4">
              <AlertDescription>{discordError}</AlertDescription>
              {discordError.includes('verification required') && (
                <Button
                  onClick={() => {
                    handleCloseModal()
                    router.push('/profile')
                  }}
                >
                  Go to profile to verify Discord
                </Button>
              )}
              {discordError.includes('connection expired') && (
                <Button
                  onClick={async () => {
                    await supabase.auth.signInWithOAuth({
                      provider: 'discord',
                      options: {
                        redirectTo: `${window.location.origin}/auth/callback?next=/overview`,
                        scopes: 'identify guilds'
                      }
                    })
                  }}
                >
                  Reconnect Discord
                </Button>
              )}
            </Alert>
          ) : availableGuilds.length === 0 ? (
            // Improved empty state: CTA to create + inline code input
            <div className="space-y-6 py-4">
              <div className="text-center">
                <p className="font-bold text-[18px] text-foreground mb-2">Your guild isn't on LootList+ yet</p>
                <p className="text-[14px] text-muted-foreground">
                  None of your Discord servers match a LootList+ guild. You can create one or join with a code.
                </p>
              </div>

              {/* Create guild CTA */}
              <Button
                onClick={handleCreateFromDiscord}
                className="w-full"
              >
                Create your guild
              </Button>

              {/* Or join with code */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background-elevated px-3 text-[12px] text-muted-foreground">or join with a code</span>
                </div>
              </div>

              <div className="flex gap-2.5">
                <Input
                  type="text"
                  value={modalInviteCode}
                  onChange={(e) => setModalInviteCode(e.target.value.toUpperCase())}
                  placeholder="Invite code"
                  variant="pill"
                  className="flex-1 font-poppins font-medium"
                />
                <Button
                  onClick={handleModalCodeJoin}
                  disabled={!modalInviteCode.trim()}
                  loading={joiningGuildId === 'code'}
                  className="shrink-0"
                >
                  Join
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-bold text-[16px] text-foreground">Available guilds</h3>
              <div className="space-y-3">
                {availableGuilds.map((guild) => (
                  <div
                    key={guild.id}
                    className="bg-background-elevated border border-border-strong rounded-xl p-4 hover:border-foreground-muted transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        {guild.discord_icon && (
                          <img
                            src={`https://cdn.discordapp.com/icons/${guild.discord_server_id}/${guild.discord_icon}.png`}
                            alt={guild.discord_name || guild.name}
                            className="w-10 h-10 rounded-full"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-[14px] text-foreground truncate">{guild.name}</h4>
                          <div className="flex gap-2 text-[12px] text-muted-foreground mt-0.5">
                            {guild.realm && <span>{guild.realm}</span>}
                            {guild.realm && <span>&middot;</span>}
                            <span>{guild.faction}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleJoinDiscordGuild(guild.id)}
                        loading={joiningGuildId === guild.id}
                        disabled={joiningGuildId !== null && joiningGuildId !== guild.id}
                        className="shrink-0"
                      >
                        Join
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ModalBody>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-background-subtle">
          <div className="flex items-start gap-2">
            <HugeiconsIcon icon={InformationCircleIcon} size={16} className="text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[12px] text-muted-foreground">
              We check which Discord servers you're in and match them with LootList+ guilds.
            </p>
          </div>
        </div>
      </Modal>

      {/* Create Guild Modal */}
      <CreateGuildModal
        isOpen={showCreateGuild}
        onClose={() => setShowCreateGuild(false)}
        onSuccess={() => {
          setShowCreateGuild(false)
          router.refresh()
        }}
        preselectedServerId={createPreselectedServer}
        suggestedName={createSuggestedName}
      />
    </>
  )
}
