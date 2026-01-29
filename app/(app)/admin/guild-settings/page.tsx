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
  ModalFooter,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/typography'
import { useGuildMembers } from '@/app/hooks/use-api'
import { Select } from '@/components/ui/select'

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
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>('')

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, loading: guildLoading, isOfficer, refreshGuilds } = useGuildContext()
  const { showNotification } = useNotification()

  // Fetch guild members for ownership transfer
  const { data: membersData } = useGuildMembers(activeGuild?.id || null)
  const guildMembers = membersData?.members || []
  // Filter out current user from potential new owners
  const eligibleNewOwners = guildMembers.filter((m: any) => m.user_id !== user?.id)

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

    // Only guild creator can update basic info
    if (!isGuildCreator) {
      showNotification('error', 'Only the guild owner can modify guild information')
      return
    }

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

      // Update guild info via API (requires Guild Master permissions)
      const response = await fetch('/api/guilds/info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: activeGuild.id,
          name: guildName.trim(),
          realm: realm.trim(),
          faction,
          discord_server_id: discordServerId.trim() || null,
          icon_url: finalIconUrl
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update guild information')
      }

      showNotification('success', 'Guild settings saved' + (shouldFetchIcon && finalIconUrl ? '. Discord icon updated.' : ''))

      // Reload page to show updated guild info in sidebar
      setTimeout(() => {
        window.location.reload()
      }, 800)
    } catch (error: any) {
      showNotification('error', error.message || 'Couldn\'t update guild. Try again.')
      setSaving(false)
    }
  }

  const handleDeleteGuild = async () => {
    if (!activeGuild) return

    const confirmText = `DELETE ${activeGuild.name}`
    const userInput = prompt(
      `This will permanently delete "${activeGuild.name}" and all associated data including loot lists, attendance, and settings.\n\nThis cannot be undone.\n\nType "${confirmText}" to confirm:`
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
      showNotification('error', error.message || 'Couldn\'t delete guild. Try again.')
      setDeleting(false)
    }
  }

  const handleTransferOwnership = async () => {
    if (!activeGuild || !selectedNewOwner) return

    setTransferring(true)

    try {
      const response = await fetch('/api/guilds/transfer-ownership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: activeGuild.id,
          new_owner_user_id: selectedNewOwner
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to transfer ownership')
      }

      showNotification('success', 'Ownership transferred. You are now an Officer.')
      setShowTransferModal(false)

      // Reload to reflect the changes
      setTimeout(() => {
        window.location.reload()
      }, 800)
    } catch (error: any) {
      showNotification('error', error.message || 'Couldn\'t transfer ownership. Try again.')
      setTransferring(false)
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
              <p className="text-muted-foreground text-[13px] mt-1">
                {isGuildCreator ? "Update your guild's basic details" : "Only the guild owner can edit these settings"}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="guildName" className="block text-[13px] font-medium text-foreground">Guild Name</label>
                <input
                  id="guildName"
                  value={guildName}
                  onChange={(e) => setGuildName(e.target.value)}
                  placeholder="Enter guild name"
                  disabled={!isGuildCreator || saving}
                  className={`w-full px-5 py-3 bg-background-elevated border border-border-strong rounded-[52px] text-foreground text-[13px] focus:outline-none focus:border-accent ${!isGuildCreator ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[13px] font-medium text-foreground">Realm</label>
                <RealmSelector
                  region={realmRegion}
                  realm={realm}
                  onRegionChange={setRealmRegion}
                  onRealmChange={setRealm}
                  disabled={!isGuildCreator || saving}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="faction" className="block text-[13px] font-medium text-foreground">Faction</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => isGuildCreator && setFaction('Alliance')}
                    disabled={!isGuildCreator || saving}
                    className={`alliance-btn group relative px-3 py-2.5 rounded-lg border transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden ${
                      faction === 'Alliance'
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-border-strong bg-background-elevated hover:bg-muted'
                    } ${!isGuildCreator ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <img
                      src="https://wow.zamimg.com/images/wow/icons/large/inv_bannerpvp_02.jpg"
                      alt="Alliance"
                      className={`w-6 h-6 rounded border border-border/50 shadow-sm relative z-10 transition-transform duration-300 ${faction === 'Alliance' ? 'scale-110' : isGuildCreator ? 'group-hover:scale-110' : ''}`}
                    />
                    <span className={`font-medium text-[13px] relative z-10 transition-colors duration-300 ${faction === 'Alliance' ? 'text-blue-400' : isGuildCreator ? 'text-foreground group-hover:text-blue-400' : 'text-foreground'}`}>
                      Alliance
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => isGuildCreator && setFaction('Horde')}
                    disabled={!isGuildCreator || saving}
                    className={`horde-btn group relative px-3 py-2.5 rounded-lg border transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden ${
                      faction === 'Horde'
                        ? 'border-red-500 bg-red-500/20'
                        : 'border-border-strong bg-background-elevated hover:bg-muted'
                    } ${!isGuildCreator ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <img
                      src="https://wow.zamimg.com/images/wow/icons/large/inv_bannerpvp_01.jpg"
                      alt="Horde"
                      className={`w-6 h-6 rounded border border-border/50 shadow-sm relative z-10 transition-transform duration-300 ${faction === 'Horde' ? 'scale-110' : isGuildCreator ? 'group-hover:scale-110' : ''}`}
                    />
                    <span className={`font-medium text-[13px] relative z-10 transition-colors duration-300 ${faction === 'Horde' ? 'text-red-400' : isGuildCreator ? 'text-foreground group-hover:text-red-400' : 'text-foreground'}`}>
                      Horde
                    </span>
                  </button>
                </div>
                {isGuildCreator && (
                  <style jsx>{`
                    .alliance-btn:hover:not(:disabled) {
                      border-color: rgb(59, 130, 246);
                      box-shadow: 0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.2);
                      background: rgba(59, 130, 246, 0.15);
                    }
                    .horde-btn:hover:not(:disabled) {
                      border-color: rgb(239, 68, 68);
                      box-shadow: 0 0 20px rgba(239, 68, 68, 0.5), 0 0 40px rgba(239, 68, 68, 0.2);
                      background: rgba(239, 68, 68, 0.15);
                    }
                  `}</style>
                )}
              </div>

              {isGuildCreator && (
                <Button
                  onClick={handleSaveBasicInfo}
                  disabled={!guildName.trim()}
                  loading={saving}
                  className="w-full"
                >
                  Save Changes
                </Button>
              )}
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
              {isGuildCreator ? 'Connect your Discord server to allow automatic guild joins' : 'Only the guild owner can modify Discord settings'}
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
                disabled={!isGuildCreator || saving}
                className={`w-full px-5 py-3 bg-background-elevated border border-border-strong rounded-[52px] text-foreground text-[13px] focus:outline-none focus:border-accent ${!isGuildCreator ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
              <p className="text-xs text-muted-foreground">
                Enable Developer Mode in Discord, right-click your server, and select "Copy Server ID"
              </p>
            </div>

            {isGuildCreator && (
              <Button variant="secondary" onClick={handleSaveBasicInfo} loading={saving}>
                Save Changes
              </Button>
            )}
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
              {/* Transfer Ownership */}
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-[16px] font-semibold text-yellow-500 mb-1">Transfer Ownership</h3>
                    <p className="text-[13px] text-muted-foreground">
                      Transfer guild ownership to another member. You will be demoted to Officer and lose owner privileges.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => setShowTransferModal(true)}
                    className="shrink-0 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                  >
                    Transfer
                  </Button>
                </div>
              </div>

              {/* Delete Guild */}
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

            {/* Transfer Ownership Modal */}
            <Modal open={showTransferModal} onClose={() => { setShowTransferModal(false); setSelectedNewOwner(''); }} size="default">
              <ModalHeader onClose={() => { setShowTransferModal(false); setSelectedNewOwner(''); }}>
                <ModalTitle>Transfer Guild Ownership</ModalTitle>
                <ModalDescription>
                  Select the member who will become the new guild owner. This action cannot be undone.
                </ModalDescription>
              </ModalHeader>
              <ModalBody className="space-y-4">
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                  <p className="text-[13px] text-yellow-500 font-medium mb-2">Warning:</p>
                  <ul className="text-[13px] text-muted-foreground space-y-1 list-disc list-inside">
                    <li>The new owner will have full control over the guild</li>
                    <li>You will be demoted to Officer</li>
                    <li>You will lose the ability to delete the guild or transfer ownership</li>
                    <li>This action cannot be undone by you</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <label className="block text-[13px] font-medium text-foreground">Select New Owner</label>
                  {eligibleNewOwners.length > 0 ? (
                    <Select
                      value={selectedNewOwner}
                      onChange={(e) => setSelectedNewOwner(e.target.value)}
                      className="w-full"
                    >
                      <option value="">Select a member...</option>
                      {eligibleNewOwners.map((member: any) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.mainCharacter?.name || member.discordName} ({member.role})
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <p className="text-[13px] text-muted-foreground">No other members available to transfer ownership to.</p>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="secondary"
                  onClick={() => { setShowTransferModal(false); setSelectedNewOwner(''); }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleTransferOwnership}
                  disabled={!selectedNewOwner}
                  loading={transferring}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black"
                >
                  Transfer Ownership
                </Button>
              </ModalFooter>
            </Modal>
          </>
        )}
      </div>
  )
}
