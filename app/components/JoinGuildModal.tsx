'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useGuildContext } from '../contexts/GuildContext'
import { Modal, ModalHeader, ModalBody } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface DiscordGuildEntry {
  id: string
  name: string
  realm?: string | null
  faction?: string | null
  discord_server_id?: string | null
  discord_icon?: string | null
  discord_name?: string | null
}

interface JoinGuildModalProps {
  open: boolean
  initialView?: 'main' | 'discord'
  onClose: () => void
  onError: (message: string) => void
}

export function JoinGuildModal({ open, initialView = 'main', onClose, onError }: JoinGuildModalProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useGuildContext()
  const supabase = createClient()

  const [modalView, setModalView] = useState<'main' | 'discord'>(initialView)
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [discordLoading, setDiscordLoading] = useState(false)
  const [availableGuilds, setAvailableGuilds] = useState<DiscordGuildEntry[]>([])
  const [discordError, setDiscordError] = useState('')

  // Reset to the requested view whenever the modal opens.
  useEffect(() => {
    if (!open) return
    setModalView(initialView)
    setInviteCode('')
    setDiscordError('')
  }, [open, initialView])

  const handleOpenDiscordModal = useCallback(async () => {
    setModalView('discord')
    setDiscordLoading(true)
    setDiscordError('')
    setAvailableGuilds([])

    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('discord_verified')
      .eq('user_id', user?.id)
      .single()

    if (!preferences?.discord_verified) {
      try {
        const verifyResponse = await fetch('/api/verify-discord', { method: 'POST' })
        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json()
          setDiscordError(errorData.error || 'Discord verification required. Go to your profile to verify your Discord account.')
          setDiscordLoading(false)
          return
        }
      } catch (err) {
        console.error('Auto-verification failed:', err)
        setDiscordError('Discord verification required. Go to your profile to verify your Discord account.')
        setDiscordLoading(false)
        return
      }
    }

    try {
      const response = await fetch('/api/discord-guilds')
      const data = await response.json()
      if (!response.ok) {
        const errorMessage = response.status === 429
          ? 'Discord rate limit reached. Please wait a moment and try again.'
          : data.error || "Couldn't load guilds. Check your connection and try again."
        setDiscordError(errorMessage)
        setDiscordLoading(false)
        return
      }
      setAvailableGuilds(data.available_guilds || [])
      setDiscordLoading(false)
    } catch (err) {
      console.error('Error loading guilds:', err)
      setDiscordError("Couldn't load available guilds. Check your connection and try again.")
      setDiscordLoading(false)
    }
  }, [supabase, user?.id])

  // When the modal is asked to open directly in the Discord view (e.g. after
  // the Reconnect Discord OAuth round-trip lands back on the page), kick off
  // the load immediately so the user doesn't see an empty list.
  useEffect(() => {
    if (open && initialView === 'discord') {
      void handleOpenDiscordModal()
    }
  }, [open, initialView, handleOpenDiscordModal])

  const handleJoinWithCode = async () => {
    if (!inviteCode.trim()) {
      onError('Please enter an invite code')
      return
    }
    setJoining(true)
    try {
      const response = await fetch(`/api/guild-invites/${inviteCode.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      if (!response.ok) {
        onError(data.error || "Couldn't join guild. Check the invite code and try again.")
        setJoining(false)
        return
      }
      window.location.href = '/overview'
    } catch (err) {
      console.error('Error joining guild:', err)
      onError("Couldn't join guild. Check your connection and try again.")
      setJoining(false)
    }
  }

  const handleJoinDiscordGuild = async (guildId: string) => {
    setJoining(true)
    setDiscordError('')
    try {
      const response = await fetch('/api/discord-guilds/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: guildId }),
      })
      const data = await response.json()
      if (!response.ok) {
        setDiscordError(data.error || "Couldn't join guild. Try again.")
        setJoining(false)
        return
      }
      window.location.href = '/overview'
    } catch (err) {
      console.error('Error joining guild:', err)
      setDiscordError("Couldn't join guild. Check your connection and try again.")
      setJoining(false)
    }
  }

  const handleClose = () => {
    onClose()
    setModalView('main')
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      zIndex={100}
      maxHeight="90vh"
      className={modalView === 'main' ? 'h-[480px]' : ''}
    >
      {modalView === 'main' ? (
        <>
          <ModalHeader
            onClose={handleClose}
            showCloseButton={false}
            className="bg-background-elevated"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <img
                  src="https://wow.zamimg.com/images/wow/icons/large/inv_shirt_guildtabard_01.jpg"
                  alt="Guild Tabard"
                  className="w-10 h-10 rounded-lg shadow-md outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                />
                <div>
                  <h3 className="text-[20px] font-bold text-foreground">Join a guild</h3>
                  <p className="text-[12px] text-muted-foreground">Choose how you'd like to join</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </ModalHeader>

          <ModalBody className="flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="bg-background-elevated border border-border-strong rounded-[24px] p-5 pt-8 flex flex-col items-center">
                <div className="flex flex-col gap-5 items-center w-full flex-1">
                  <Image
                    src="/icons/discord-large.svg"
                    alt="Discord"
                    width={40}
                    height={40}
                    className="icon-adaptive w-10 h-10"
                  />
                  <div className="flex flex-col gap-1 text-center w-full">
                    <h2 className="font-poppins font-bold text-lg text-foreground">Join with Discord</h2>
                    <p className="font-poppins font-normal text-sm text-muted-foreground">
                      If your guild has Discord linked, you're in automatically.
                    </p>
                  </div>
                </div>
                <Button onClick={handleOpenDiscordModal} className="w-full mt-5">
                  Select guild
                </Button>
              </div>

              <div className="bg-background-elevated border border-border-strong rounded-[24px] p-5 pt-8 flex flex-col items-center">
                <div className="flex flex-col gap-5 items-center w-full flex-1">
                  <Image
                    src="/icons/password-validation.svg"
                    alt="Code"
                    width={40}
                    height={40}
                    className="icon-adaptive w-10 h-10"
                  />
                  <div className="flex flex-col gap-1 text-center w-full">
                    <h2 className="font-poppins font-bold text-lg text-foreground">Join with code</h2>
                    <p className="font-poppins font-normal text-sm text-muted-foreground">
                      Paste the code from your guild officer.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 w-full mt-5">
                  <div className="flex gap-2.5 w-full">
                    <Input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="ABC123DEF456"
                      variant="pill"
                      size="lg"
                      className="flex-1 min-w-0 bg-background-subtle font-poppins font-medium"
                      disabled={joining}
                    />
                    <Button
                      onClick={handleJoinWithCode}
                      disabled={!inviteCode.trim()}
                      loading={joining}
                      className="shrink-0"
                    >
                      Join
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 items-center mt-6">
              <div className="flex items-center justify-center gap-2">
                <Image
                  src="/icons/help.svg"
                  alt="Help"
                  width={16}
                  height={16}
                  className="icon-adaptive w-4 h-4"
                />
                <p className="font-poppins font-bold text-sm text-foreground">Need help?</p>
              </div>
              <p className="font-poppins font-normal text-xs text-muted-foreground text-center">
                Ask your guild officer for an invite code or Discord link.
              </p>
            </div>
          </ModalBody>
        </>
      ) : (
        <>
          <ModalHeader
            onClose={handleClose}
            showCloseButton={false}
            className="bg-background-elevated"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setModalView('main')}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Go back"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>
                <div>
                  <h3 className="text-[20px] font-bold text-foreground">Select guild</h3>
                  <p className="text-[12px] text-muted-foreground">Automatically join guilds from your Discord servers</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
                      handleClose()
                      router.push('/profile')
                    }}
                  >
                    Go to profile to verify Discord
                  </Button>
                )}
                {discordError.includes('connection expired') && (
                  <Button
                    onClick={async () => {
                      const base = pathname || '/overview'
                      const next = `${base}${base.includes('?') ? '&' : '?'}openGuildModal=discord`
                      await supabase.auth.signInWithOAuth({
                        provider: 'discord',
                        options: {
                          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
                          scopes: 'identify guilds',
                        },
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
                      className="bg-background-elevated border border-border-strong rounded-xl p-4 hover:border-border-strong transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          {guild.discord_icon && (
                            <img
                              src={`https://cdn.discordapp.com/icons/${guild.discord_server_id}/${guild.discord_icon}.png`}
                              alt={guild.discord_name || guild.name}
                              className="w-10 h-10 rounded-full outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
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
                          loading={joining}
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

          <div className="p-4 border-t border-border bg-background-subtle">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="10" cy="10" r="9" />
                <path d="M10 6v4M10 14h.01" strokeLinecap="round" />
              </svg>
              <p className="text-[12px] text-muted-foreground">
                We check which Discord servers you're a member of and match them with LootList+ guilds that have Discord integration enabled.
              </p>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
