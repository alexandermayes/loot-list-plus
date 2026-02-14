'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import InviteCodeManager from './components/InviteCodeManager'
import MemberManager from './components/MemberManager'
import RoleManager from './components/RoleManager'
import ExpansionManager from './components/ExpansionManager'
import RealmSelector from '@/app/components/RealmSelector'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { GuildSettingsContentSkeleton } from '@/components/ui/skeletons'
import { EmptyState } from '@/components/ui/empty-state'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useGuildMembers } from '@/app/hooks/use-api'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SecurityLockIcon } from '@hugeicons/core-free-icons'

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

  // Initial values for change detection
  const [initialValues, setInitialValues] = useState({
    guildName: '',
    realm: '',
    faction: 'Alliance' as 'Alliance' | 'Horde',
    discordServerId: ''
  })

  // Check if form has unsaved changes
  const hasChanges =
    guildName !== initialValues.guildName ||
    realm !== initialValues.realm ||
    faction !== initialValues.faction ||
    discordServerId !== initialValues.discordServerId
  const [deleting, setDeleting] = useState(false)
  const [isGuildCreator, setIsGuildCreator] = useState(false)
  const [showRolesModal, setShowRolesModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [roleRefreshKey, setRoleRefreshKey] = useState(0)
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

      try {
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
          return
        }

        // Set form values from active guild
        setGuildName(activeGuild.name)
        setRealm(activeGuild.realm || '')
        setFaction(activeGuild.faction as 'Alliance' | 'Horde')
        setDiscordServerId(activeGuild.discord_server_id || '')
        setGuildIconUrl((activeGuild as any).icon_url || null)

        // Store initial values for change detection
        setInitialValues({
          guildName: activeGuild.name,
          realm: activeGuild.realm || '',
          faction: activeGuild.faction as 'Alliance' | 'Horde',
          discordServerId: activeGuild.discord_server_id || ''
        })

        // Check if user is the guild creator
        setIsGuildCreator(activeGuild.created_by === user.id)
      } catch (error) {
        console.error('Error loading guild settings:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!guildLoading) {
      loadData().catch(console.error)
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
        throw new Error(data.error || 'Couldn\'t update guild information. Try again.')
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

    setDeleting(true)

    try {
      const response = await fetch('/api/guilds', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: activeGuild.id })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Couldn\'t delete guild. Try again.')
      }

      // Force full page reload to guild select page
      window.location.href = '/guild-select'
    } catch (error: any) {
      showNotification('error', error.message || 'Couldn\'t delete guild. Try again.')
      setDeleting(false)
    }
  }

  const deleteConfirmText = activeGuild ? `DELETE ${activeGuild.name}` : ''

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
        throw new Error(data.error || 'Couldn\'t transfer ownership. Try again.')
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
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <EmptyState
          icon={SecurityLockIcon}
          title="Officers only"
          description="Guild settings are only accessible to officers and the guild owner."
          action={{
            label: 'Back to overview',
            onClick: () => router.push('/overview'),
            variant: 'secondary'
          }}
        />
      </div>
    )
  }

  return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-poppins">
        {/* Header - Always visible */}
        <div>
          <Heading level={1}>Guild settings</Heading>
          <p className="text-muted-foreground mt-1 text-base">Manage your guild configuration, members and settings</p>
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
              <h2 className="text-[24px] font-semibold text-foreground">Guild information</h2>
              <p className="text-muted-foreground text-[13px] mt-1">
                {isGuildCreator ? "Update your guild's basic details" : "Only the guild owner can edit these settings"}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guildName">Guild Name</Label>
                <Input
                  id="guildName"
                  value={guildName}
                  onChange={(e) => setGuildName(e.target.value)}
                  placeholder="Enter guild name"
                  disabled={!isGuildCreator || saving}
                  variant="rounded"
                  size="sm"
                  className={!isGuildCreator ? 'opacity-60 cursor-not-allowed' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label>Realm</Label>
                <RealmSelector
                  region={realmRegion}
                  realm={realm}
                  onRegionChange={setRealmRegion}
                  onRealmChange={setRealm}
                  disabled={!isGuildCreator || saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faction">Faction</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
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
                      className="w-6 h-6 rounded border border-border/50 shadow-sm relative z-10"
                    />
                    <span className={`font-medium text-[13px] relative z-10 transition-colors duration-300 ${faction === 'Alliance' ? 'text-blue-400' : isGuildCreator ? 'text-foreground group-hover:text-blue-400' : 'text-foreground'}`}>
                      Alliance
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
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
                      className="w-6 h-6 rounded border border-border/50 shadow-sm relative z-10"
                    />
                    <span className={`font-medium text-[13px] relative z-10 transition-colors duration-300 ${faction === 'Horde' ? 'text-red-400' : isGuildCreator ? 'text-foreground group-hover:text-red-400' : 'text-foreground'}`}>
                      Horde
                    </span>
                  </Button>
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
                  disabled={!guildName.trim() || !hasChanges}
                  loading={saving}
                  className="w-full"
                >
                  Save changes
                </Button>
              )}
            </div>
          </div>

          {/* Current Members - with fixed scroll */}
          <div className="bg-background-elevated border border-border rounded-xl overflow-auto flex flex-col max-h-[400px] sm:max-h-[600px]">
            <div className="p-6 border-b border-border flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[24px] font-semibold text-foreground">Current members</h2>
                  <p className="text-muted-foreground text-[13px] mt-1">Manage guild members and roles</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setShowRolesModal(true)}>
                  Manage roles
                </Button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              <MemberManager key={roleRefreshKey} />
            </div>
          </div>
        </div>

        {/* Expansions */}
        <ExpansionManager />

        {/* Invite Codes */}
        <InviteCodeManager />

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
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-[16px] font-semibold text-warning mb-1">Transfer ownership</h3>
                    <p className="text-[13px] text-muted-foreground">
                      Transfer guild ownership to another member. You will be demoted to Officer and lose owner privileges.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => setShowTransferModal(true)}
                    className="shrink-0 border-warning/50 text-warning hover:bg-warning/10 w-full sm:w-auto"
                  >
                    Transfer
                  </Button>
                </div>
              </div>

              {/* Delete Guild */}
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-[16px] font-semibold text-destructive mb-1">Delete this guild</h3>
                    <p className="text-[13px] text-muted-foreground">
                      Once you delete a guild, there is no going back. This will permanently delete all guild data including members, loot lists, attendance records and settings.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteModal(true)}
                    className="shrink-0 w-full sm:w-auto"
                  >
                    Delete guild
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

            {/* Roles Management Modal */}
            <Modal open={showRolesModal} onClose={() => setShowRolesModal(false)} size="lg">
              <ModalHeader onClose={() => setShowRolesModal(false)}>
                <ModalTitle>Guild roles</ModalTitle>
                <ModalDescription>Create and manage custom roles for your guild members</ModalDescription>
              </ModalHeader>
              <ModalBody className="p-0">
                <RoleManager onRolesChanged={() => setRoleRefreshKey(k => k + 1)} />
              </ModalBody>
            </Modal>

            {/* Delete Guild Confirmation Modal */}
            <Modal open={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteConfirmInput(''); }} size="default">
              <ModalHeader onClose={() => { setShowDeleteModal(false); setDeleteConfirmInput(''); }}>
                <ModalTitle>Delete {activeGuild?.name}?</ModalTitle>
                <ModalDescription>
                  This will permanently delete all guild data including members, loot lists, attendance records and settings. This cannot be undone.
                </ModalDescription>
              </ModalHeader>
              <ModalBody className="space-y-4">
                <Alert variant="destructive">
                  <AlertDescription className="text-muted-foreground">
                    Type <span className="font-mono font-semibold text-destructive">{deleteConfirmText}</span> to confirm.
                  </AlertDescription>
                </Alert>
                <Input
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  placeholder={deleteConfirmText}
                  className="font-mono"
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="secondary"
                  onClick={() => { setShowDeleteModal(false); setDeleteConfirmInput(''); }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteConfirmInput('')
                    handleDeleteGuild()
                  }}
                  disabled={deleteConfirmInput !== deleteConfirmText}
                  loading={deleting}
                >
                  Delete guild
                </Button>
              </ModalFooter>
            </Modal>

            {/* Transfer Ownership Modal */}
            <Modal open={showTransferModal} onClose={() => { setShowTransferModal(false); setSelectedNewOwner(''); }} size="default">
              <ModalHeader onClose={() => { setShowTransferModal(false); setSelectedNewOwner(''); }}>
                <ModalTitle>Transfer guild ownership</ModalTitle>
                <ModalDescription>
                  Select the member who will become the new guild owner. This action cannot be undone.
                </ModalDescription>
              </ModalHeader>
              <ModalBody className="space-y-4">
                <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
                  <p className="text-[13px] text-warning font-medium mb-2">Warning:</p>
                  <ul className="text-[13px] text-muted-foreground space-y-1 list-disc list-inside">
                    <li>The new owner will have full control over the guild</li>
                    <li>You will be demoted to Officer</li>
                    <li>You will lose the ability to delete the guild or transfer ownership</li>
                    <li>This action cannot be undone by you</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Label>Select new owner</Label>
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
                  className="bg-warning hover:bg-warning/90 text-black"
                >
                  Transfer ownership
                </Button>
              </ModalFooter>
            </Modal>
          </>
        )}
      </div>
  )
}
