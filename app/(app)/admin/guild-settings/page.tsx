'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import InviteCodeManager from './components/InviteCodeManager'
import MemberManager from './components/MemberManager'
import RoleManager from './components/RoleManager'
import RealmSelector from '@/app/components/RealmSelector'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { GuildSettingsContentSkeleton } from '@/components/ui/skeletons'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/typography'

export default function GuildSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Form state
  const [guildName, setGuildName] = useState('')
  const [realmRegion, setRealmRegion] = useState('Americas & Oceania')
  const [realm, setRealm] = useState('')
  const [faction, setFaction] = useState<'Alliance' | 'Horde'>('Alliance')
  const [discordServerId, setDiscordServerId] = useState('')
  const [guildIconUrl, setGuildIconUrl] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [isGuildCreator, setIsGuildCreator] = useState(false)
  const [showRolesModal, setShowRolesModal] = useState(false)

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, loading: guildLoading, isOfficer, refreshGuilds } = useGuildContext()
  const { showNotification } = useNotification()

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Guild Settings'
  }, [])

  useEffect(() => {
    const loadData = async () => {
      // Wait for guild context to finish loading
      if (guildLoading) {
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

      // Check if officer using context
      if (!isOfficer) {
        router.push('/overview')
        return
      }

      if (!activeGuild) {
        setLoading(false)
        return
      }

      // Set form values from active guild
      setGuildName(activeGuild.name)
      setRealm(activeGuild.realm || '')
      setFaction(activeGuild.faction as 'Alliance' | 'Horde')
      setDiscordServerId(activeGuild.discord_server_id || '')
      setGuildIconUrl((activeGuild as any).icon_url || null)

      // Check if user is the guild creator
      setIsGuildCreator(activeGuild.created_by === user.id)

      setLoading(false)
    }

    if (!guildLoading) {
      loadData()
    }
  }, [guildLoading, activeGuild])

  const handleSaveBasicInfo = async () => {
    if (!activeGuild) return

    // Validate required fields
    if (!realm.trim()) {
      showNotification('error', 'Please select a realm')
      return
    }

    setSaving(true)

    try {
      // Check if Discord Server ID changed and we should auto-fetch the icon
      const serverIdChanged = discordServerId.trim() && discordServerId.trim() !== activeGuild.discord_server_id
      const shouldFetchIcon = discordServerId.trim() && (!guildIconUrl || serverIdChanged)
      let finalIconUrl = guildIconUrl

      // Auto-fetch icon if server ID exists and icon is missing or changed
      if (shouldFetchIcon) {
        showNotification('info', 'Saving and fetching Discord icon...')

        try {
          const response = await fetch(`/api/discord/guild-icon?serverId=${discordServerId.trim()}`)

          if (response.ok) {
            const data = await response.json()
            if (data.iconUrl) {
              finalIconUrl = data.iconUrl
              setGuildIconUrl(data.iconUrl)
            }
          }
          // Don't fail the save if icon fetch fails, just continue
        } catch (iconError) {
          console.error('Failed to auto-fetch icon:', iconError)
        }
      }

      // Update basic guild info using RPC (bypasses RLS)
      const { error } = await supabase.rpc('update_guild_info', {
        p_guild_id: activeGuild.id,
        p_name: guildName.trim(),
        p_realm: realm.trim(), // Required field
        p_faction: faction,
        p_discord_server_id: discordServerId.trim() || null
      })

      if (error) throw error

      // Update icon separately using RPC (bypasses RLS)
      if (finalIconUrl) {
        const { error: iconError } = await supabase.rpc('update_guild_icon', {
          p_guild_id: activeGuild.id,
          p_icon_url: finalIconUrl
        })

        if (iconError) {
          console.error('Failed to update icon:', iconError)
          // Don't fail the whole save if just the icon update fails
        }
      }

      showNotification('success', 'Guild information updated successfully' + (shouldFetchIcon && finalIconUrl ? ' (Discord icon fetched!)' : ''))

      // Reload page to show updated guild info in sidebar
      setTimeout(() => {
        window.location.reload()
      }, 800)
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to update guild information')
      setSaving(false)
    }
  }

  const handleDeleteGuild = async () => {
    if (!activeGuild) return

    const confirmText = `DELETE ${activeGuild.name}`
    const userInput = prompt(
      `⚠️ DANGER: This will permanently delete "${activeGuild.name}" and ALL associated data including loot lists, attendance, and settings.\n\nThis action CANNOT be undone.\n\nType "${confirmText}" to confirm:`
    )

    if (userInput !== confirmText) {
      return
    }

    setDeleting(true)

    try {
      const response = await fetch('/api/guilds', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: activeGuild.id })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete guild')
      }

      // Force full page reload to guild select page
      window.location.href = '/guild-select'
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to delete guild')
      setDeleting(false)
    }
  }

  // Show unauthorized message if not officer (after loading completes)
  if (!loading && !guildLoading && (!activeGuild || !isOfficer)) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Unauthorized</p>
      </div>
    )
  }

  return (
      <div className="p-8 space-y-6 font-poppins">
        {/* Header - Always visible */}
        <div>
          <Heading level={1}>Guild Settings</Heading>
          <p className="text-muted-foreground mt-1 text-base">Manage your guild configuration, members, and settings</p>
        </div>

        {/* Show skeleton while loading */}
        {(loading || guildLoading) ? (
          <GuildSettingsContentSkeleton />
        ) : (
          <>
        {/* Guild Information and Members - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-[24px] font-semibold text-foreground">Guild Information</h2>
              <p className="text-muted-foreground text-[13px] mt-1">Update your guild's basic details</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="guildName" className="block text-[13px] font-medium text-foreground">Guild Name</label>
                <input
                  id="guildName"
                  value={guildName}
                  onChange={(e) => setGuildName(e.target.value)}
                  placeholder="Enter guild name"
                  className="w-full px-5 py-3 bg-background-elevated border border-border-strong rounded-[52px] text-foreground text-[13px] focus:outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[13px] font-medium text-foreground">Realm</label>
                <RealmSelector
                  region={realmRegion}
                  realm={realm}
                  onRegionChange={setRealmRegion}
                  onRealmChange={setRealm}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="faction" className="block text-[13px] font-medium text-foreground">Faction</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFaction('Alliance')}
                    disabled={saving}
                    className={`alliance-btn group relative px-3 py-2.5 rounded-lg border transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden ${
                      faction === 'Alliance'
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-border-strong bg-background-elevated hover:bg-muted'
                    }`}
                  >
                    <img
                      src="https://wow.zamimg.com/images/wow/icons/large/inv_bannerpvp_02.jpg"
                      alt="Alliance"
                      className={`w-6 h-6 rounded border border-border/50 shadow-sm relative z-10 transition-transform duration-300 ${faction === 'Alliance' ? 'scale-110' : 'group-hover:scale-110'}`}
                    />
                    <span className={`font-medium text-[13px] relative z-10 transition-colors duration-300 ${faction === 'Alliance' ? 'text-blue-400' : 'text-foreground group-hover:text-blue-400'}`}>
                      Alliance
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFaction('Horde')}
                    disabled={saving}
                    className={`horde-btn group relative px-3 py-2.5 rounded-lg border transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden ${
                      faction === 'Horde'
                        ? 'border-red-500 bg-red-500/20'
                        : 'border-border-strong bg-background-elevated hover:bg-muted'
                    }`}
                  >
                    <img
                      src="https://wow.zamimg.com/images/wow/icons/large/inv_bannerpvp_01.jpg"
                      alt="Horde"
                      className={`w-6 h-6 rounded border border-border/50 shadow-sm relative z-10 transition-transform duration-300 ${faction === 'Horde' ? 'scale-110' : 'group-hover:scale-110'}`}
                    />
                    <span className={`font-medium text-[13px] relative z-10 transition-colors duration-300 ${faction === 'Horde' ? 'text-red-400' : 'text-foreground group-hover:text-red-400'}`}>
                      Horde
                    </span>
                  </button>
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

              <Button
                onClick={handleSaveBasicInfo}
                disabled={!guildName.trim()}
                loading={saving}
                className="w-full"
              >
                Save Changes
              </Button>
            </div>
          </div>

          {/* Current Members - with fixed scroll */}
          <div className="bg-background-elevated border border-border rounded-xl overflow-hidden flex flex-col" style={{ maxHeight: '600px' }}>
            <div className="p-6 border-b border-border flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[24px] font-semibold text-foreground">Current Members</h2>
                  <p className="text-muted-foreground text-[13px] mt-1">Manage guild members and roles</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setShowRolesModal(true)}>
                  Manage Roles
                </Button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              <MemberManager />
            </div>
          </div>
        </div>

        {/* Invite Codes */}
        <InviteCodeManager />

        {/* Discord Integration */}
        <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-[24px] font-semibold text-foreground">Discord Integration</h2>
            <p className="text-muted-foreground text-[13px] mt-1">
              Connect your Discord server to allow automatic guild joins
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="discordServerId" className="block text-[13px] font-medium text-foreground">Discord Server ID</label>
              <input
                id="discordServerId"
                value={discordServerId}
                onChange={(e) => setDiscordServerId(e.target.value)}
                placeholder="Enter Discord server ID"
                className="w-full px-5 py-3 bg-background-elevated border border-border-strong rounded-[52px] text-foreground text-[13px] focus:outline-none focus:border-accent"
              />
              <p className="text-xs text-muted-foreground">
                Enable Developer Mode in Discord, right-click your server, and select "Copy Server ID"
              </p>
            </div>

            <Button variant="secondary" onClick={handleSaveBasicInfo} loading={saving}>
              Save Changes
            </Button>
          </div>
        </div>

        {/* Danger Zone - Only visible to guild creator */}
        {isGuildCreator && (
          <div className="bg-background-elevated border border-destructive/30 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-destructive/30">
              <h2 className="text-[24px] font-semibold text-destructive">Danger Zone</h2>
              <p className="text-muted-foreground text-[13px] mt-1">
                Irreversible and destructive actions
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-[16px] font-semibold text-destructive mb-1">Delete this guild</h3>
                    <p className="text-[13px] text-muted-foreground">
                      Once you delete a guild, there is no going back. This will permanently delete all guild data including members, loot lists, attendance records, and settings.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteGuild}
                    loading={deleting}
                    className="shrink-0"
                  >
                    Delete Guild
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

            {/* Roles Management Modal */}
            <Modal open={showRolesModal} onClose={() => setShowRolesModal(false)} size="lg">
              <ModalHeader onClose={() => setShowRolesModal(false)}>
                <ModalTitle>Guild Roles</ModalTitle>
                <ModalDescription>Create and manage custom roles for your guild members</ModalDescription>
              </ModalHeader>
              <ModalBody className="p-0">
                <RoleManager />
              </ModalBody>
            </Modal>
          </>
        )}
      </div>
  )
}
