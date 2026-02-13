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
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, InformationCircleIcon } from '@hugeicons/core-free-icons'

export default function WelcomeScreen() {
  const [inviteCode, setInviteCode] = useState('')
  const [modalInviteCode, setModalInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalView, setModalView] = useState<'main' | 'discord'>('main')
  const [discordLoading, setDiscordLoading] = useState(false)
  const [availableGuilds, setAvailableGuilds] = useState<any[]>([])
  const [discordError, setDiscordError] = useState('')
  const [joiningGuildId, setJoiningGuildId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleCloseModal = () => {
    setShowModal(false)
    setModalView('main')
  }

  const handleOpenDiscordModal = async () => {
    setModalView('discord')
    setDiscordLoading(true)
    setDiscordError('')
    setAvailableGuilds([])

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setDiscordError('Please log in first')
      setDiscordLoading(false)
      return
    }

    // Check Discord verification
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('discord_verified')
      .eq('user_id', user.id)
      .single()

    // If not verified but user logged in with Discord, auto-verify them
    if (!preferences?.discord_verified) {
      try {
        const verifyResponse = await fetch('/api/verify-discord', {
          method: 'POST'
        })

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json()
          setDiscordError(errorData.error || 'Discord verification required. Please go to your Profile to verify your Discord account.')
          setDiscordLoading(false)
          return
        }

      } catch (err) {
        console.error('Auto-verification failed:', err)
        setDiscordError('Discord verification required. Please go to your Profile to verify your Discord account.')
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
          ? 'Discord rate limit reached. Please wait a moment and try again.'
          : data.error || 'Couldn\'t load guilds. Check your connection and try again.'
        setDiscordError(errorMessage)
        setDiscordLoading(false)
        return
      }

      setAvailableGuilds(data.available_guilds || [])
      setDiscordLoading(false)
    } catch (err) {
      console.error('Error loading guilds:', err)
      setDiscordError('Couldn\'t load guilds. Check your connection and try again.')
      setDiscordLoading(false)
    }
  }

  const handleJoinDiscordGuild = async (guildId: string) => {
    setJoiningGuildId(guildId)
    setDiscordError('')

    try {
      const response = await fetch('/api/discord-guilds/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ guild_id: guildId })
      })

      const data = await response.json()

      if (!response.ok) {
        setDiscordError(data.error || 'Couldn\'t join guild. Try again.')
        setJoiningGuildId(null)
        return
      }

      // Success! Redirect to dashboard
      trackClientEvent('onboarding_guild_joined', { join_method: 'discord', guild_id: guildId })
      window.location.href = '/overview'
    } catch (err) {
      console.error('Error joining guild:', err)
      setDiscordError('Couldn\'t join guild. Check your connection and try again.')
      setJoiningGuildId(null)
    }
  }

  const handleCodeJoin = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/guild-invites/${inviteCode.trim()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid invite code')
        setLoading(false)
        return
      }

      // Success! Redirect to dashboard
      trackClientEvent('onboarding_guild_joined', { join_method: 'invite_code' })
      window.location.href = '/overview'
    } catch (err: any) {
      setError(err.message || 'Couldn\'t join guild. Check your connection and try again.')
      setLoading(false)
    }
  }

  const handleModalCodeJoin = async () => {
    if (!modalInviteCode.trim()) {
      return
    }

    setJoiningGuildId('code')

    try {
      const response = await fetch(`/api/guild-invites/${modalInviteCode.trim()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setDiscordError(data.error || 'Invalid invite code')
        setJoiningGuildId(null)
        return
      }

      // Success! Redirect to dashboard
      trackClientEvent('onboarding_guild_joined', { join_method: 'invite_code' })
      window.location.href = '/overview'
    } catch (err: any) {
      setDiscordError(err.message || 'Couldn\'t join guild. Check your connection and try again.')
      setJoiningGuildId(null)
    }
  }

  const handleDiscordJoin = () => {
    setShowModal(true)
    setModalView('main')
    setModalInviteCode('')
    setDiscordError('')
  }

  useEffect(() => {
    trackClientEvent('onboarding_viewed')
  }, [])

  return (
    <>
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 lg:px-[290px]">
        <div className="flex flex-col items-center gap-10 max-w-[817px] w-full">
          {/* Header */}
          <div className="flex flex-col items-center gap-5 text-center w-full">
            <Image
              src="/lootlist-icon.svg"
              alt="LootList+"
              width={33}
              height={44}
              className="w-[33px] h-[44px]"
            />
            <h1 className="font-poppins font-bold text-[42px] leading-[43px] text-foreground">
              Welcome to LootList+
            </h1>
            <p className="font-poppins font-normal text-base text-muted-foreground">
              You're not a member of any guilds yet. Pick an option below to join one.
            </p>
          </div>

          {/* Join Options */}
          <div className="flex flex-col gap-6 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 w-full">
              {/* Join via Discord */}
              <div className="bg-background-elevated border border-border rounded-[40px] p-6 pt-[43px] pb-6 flex flex-col items-center">
                <div className="flex flex-col gap-6 items-center w-full flex-1">
                  <Image
                    src="/icons/discord-large.svg"
                    alt="Discord"
                    width={44}
                    height={44}
                    className="w-11 h-11"
                  />
                  <div className="flex flex-col gap-1 text-center w-full">
                    <h2 className="font-poppins font-bold text-2xl text-foreground">
                      Join with Discord
                    </h2>
                    <p className="font-poppins font-normal text-sm text-muted-foreground">
                      If your guild has Discord linked, you're in automatically.
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
                  Select guild
                </Button>
              </div>

              {/* Join with Code */}
              <div className="bg-background-elevated border border-border rounded-[40px] p-6 pt-[43px] pb-6 flex flex-col items-center">
                <div className="flex flex-col gap-6 items-center w-full flex-1">
                  <Image
                    src="/icons/password-validation.svg"
                    alt="Code"
                    width={44}
                    height={44}
                    className="w-11 h-11"
                  />
                  <div className="flex flex-col gap-1 text-center w-full">
                    <h2 className="font-poppins font-bold text-2xl text-foreground">
                      Join with code
                    </h2>
                    <p className="font-poppins font-normal text-sm text-muted-foreground">
                      Paste the code from your guild officer.
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
            </div>

            {/* Help Section */}
            <div className="flex flex-col gap-2.5 items-center p-6 rounded-[40px] w-full lg:w-[409px] mx-auto">
              <div className="flex items-center justify-center gap-2.5">
                <Image
                  src="/icons/help.svg"
                  alt="Help"
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
                <p className="font-poppins font-bold text-lg text-foreground">
                  Need help?
                </p>
              </div>
              <p className="font-poppins font-normal text-sm text-muted-foreground text-center">
                Ask your guild officer for an invite code or Discord link. Setting up a new guild? You'll become the first officer.
              </p>
            </div>
          </div>
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
            <div className="text-center py-8">
              <p className="font-bold text-[18px] text-foreground mb-2">No guilds found</p>
              <p className="text-[14px] text-muted-foreground mb-4">
                We didn't find any LootList+ guilds linked to your Discord servers.
              </p>
              <div className="bg-background-elevated border border-border-strong rounded-xl p-4 text-left space-y-2">
                <p className="text-[14px] text-foreground font-medium">Why this might happen:</p>
                <ul className="text-[13px] text-muted-foreground space-y-1 list-disc list-inside">
                  <li>No servers you're in use LootList+</li>
                  <li>You're already in all matching guilds</li>
                  <li>Discord integration isn't set up yet</li>
                </ul>
                <p className="text-[13px] text-muted-foreground mt-3">
                  Use an invite code, or ask a guild officer to enable Discord integration.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-bold text-[16px] text-foreground">Available guilds</h3>
              <div className="space-y-3">
                {availableGuilds.map((guild) => (
                  <div
                    key={guild.id}
                    className="bg-background-elevated border border-border-strong rounded-xl p-4 hover:border-foreground-muted transition"
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
                            {guild.realm && <span>•</span>}
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
              We check which Discord servers you're a member of and match them with LootList+ guilds that have Discord integration enabled.
            </p>
          </div>
        </div>
      </Modal>
    </>
  )
}

