'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { trackClientEvent } from '@/utils/analytics/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ProfileContentSkeleton } from '@/components/ui/skeletons'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
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
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useConfirm } from '@/components/ui/confirm-modal'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  UserIcon,
  Logout01Icon,
  Settings01Icon,
  Shield01Icon,
  Moon02Icon,
  Sun03Icon,
  ComputerIcon,
  PaintBoardIcon,
  LinkSquare02Icon,
  Delete02Icon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  RefreshIcon,
} from '@hugeicons/core-free-icons'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useAccentColor, ACCENT_COLORS, DEFAULT_ACCENT_COLOR } from '@/app/contexts/AccentColorContext'

type TabId = 'account' | 'preferences' | 'guilds'

export default function ProfilePage() {
  const [allGuilds, setAllGuilds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('account')
  const [leaveGuildId, setLeaveGuildId] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnectingBattlenet, setDisconnectingBattlenet] = useState(false)
  const [battlenetAccount, setBattlenetAccount] = useState<{
    battletag: string | null
    region: string
    updated_at: string
  } | null>(null)
  const [battlenetRegion, setBattlenetRegion] = useState('us')
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)

  // Notification preferences
  const [notifySubmissionStatus, setNotifySubmissionStatus] = useState(true)

  const { theme, setTheme } = useTheme()
  const { accentColor, setAccentColor, saveAccentColor } = useAccentColor()

  // Only sync theme on initial mount, not on every theme change
  useEffect(() => {
    setMounted(true)
    if (theme && selectedTheme === null) {
      setSelectedTheme(theme)
    }
  }, [theme, selectedTheme])
  const { switchGuild, user } = useGuildContext()
  const { showNotification } = useNotification()
  const { confirm, ConfirmDialog } = useConfirm()
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    document.title = 'LootList+ • Profile'

    // Handle Battle.net OAuth callback status
    const battlenetStatus = searchParams.get('battlenet')
    if (battlenetStatus === 'connected') {
      showNotification('success', 'Battle.net account connected')
      // Clean up URL params
      router.replace('/profile', { scroll: false })
    } else if (battlenetStatus === 'denied') {
      showNotification('warning', 'Battle.net connection was cancelled')
      router.replace('/profile', { scroll: false })
    } else if (battlenetStatus === 'error') {
      const reason = searchParams.get('reason')
      const messages: Record<string, string> = {
        missing_params: 'Missing OAuth parameters. Try connecting again.',
        invalid_state: 'Session expired. Try connecting again.',
        save_failed: 'Couldn\'t save Battle.net account. Try again.',
        unexpected: 'Something went wrong. Try connecting again.',
      }
      showNotification('error', messages[reason || ''] || 'Couldn\'t connect Battle.net. Try again.')
      router.replace('/profile', { scroll: false })
    }
  }, [])

  const loadBattlenetAccount = async () => {
    if (!user) return

    const { data } = await supabase
      .from('battlenet_accounts')
      .select('battletag, region, updated_at')
      .eq('user_id', user.id)
      .single()

    if (data) {
      setBattlenetAccount(data)
    }
  }

  const loadNotificationPrefs = async () => {
    if (!user) return

    const { data } = await supabase
      .from('user_preferences')
      .select('notify_submission_status')
      .eq('user_id', user.id)
      .single()

    if (data) {
      setNotifySubmissionStatus(data.notify_submission_status ?? true)
    }
  }

  const toggleSubmissionStatus = async () => {
    if (!user) return
    const newValue = !notifySubmissionStatus
    setNotifySubmissionStatus(newValue)

    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: user.id,
          notify_submission_status: newValue,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      setNotifySubmissionStatus(!newValue)
      showNotification('error', 'Couldn\'t update preference. Try again.')
    } else {
      showNotification('success', newValue ? 'Review notifications enabled.' : 'Review notifications disabled.')
    }
  }

  const disconnectBattlenet = async () => {
    setDisconnectingBattlenet(true)

    try {
      const response = await fetch('/api/battlenet/disconnect', { method: 'POST' })

      if (!response.ok) {
        showNotification('error', 'Couldn\'t disconnect Battle.net. Try again.')
      } else {
        setBattlenetAccount(null)
        showNotification('success', 'Battle.net account disconnected')
      }
    } catch {
      showNotification('error', 'Couldn\'t disconnect Battle.net. Check your connection.')
    } finally {
      setDisconnectingBattlenet(false)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const handleLeaveGuild = async (guildId: string) => {
    setLeaving(true)
    try {
      const response = await fetch('/api/guilds/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: guildId })
      })

      const data = await response.json()

      if (!response.ok) {
        showNotification('error', data.error || 'Couldn\'t leave guild. Try again or contact an officer.')
        setLeaving(false)
        return
      }

      if (!data.has_other_guilds) {
        window.location.href = '/guild-select'
        return
      }

      window.location.reload()
    } catch (err) {
      console.error('Error leaving guild:', err)
      showNotification('error', 'Couldn\'t leave guild. Check your connection and try again.')
      setLeaving(false)
    }
  }

  const handleDisconnectDiscord = () => {
    confirm({
      title: 'Disconnect Discord',
      description: 'Are you sure you want to disconnect your Discord account? You will be logged out and need to sign in again to continue using LootList+.',
      confirmLabel: 'Disconnect',
      variant: 'warning',
      onConfirm: async () => {
        setDisconnecting(true)
        try {
          await supabase.auth.signOut()
          window.location.href = '/'
        } catch (err) {
          console.error('Error disconnecting:', err)
          showNotification('error', 'Couldn\'t disconnect Discord. Check your connection and try again.')
          setDisconnecting(false)
        }
      }
    })
  }

  const deleteConfirmText = 'DELETE MY ACCOUNT'

  const handleDeleteAccount = async () => {
    setShowDeleteModal(false)
    setDeleteConfirmInput('')
    setDeleting(true)
    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.owned_guilds) {
          showNotification('error', `${data.message} Go to Admin > Guild Settings to delete or transfer these guilds first.`)
        } else {
          showNotification('error', data.error || 'Couldn\'t delete account. Try again or contact support.')
        }
        setDeleting(false)
        return
      }

      // Account deleted successfully - redirect to home
      trackClientEvent('account_deleted')
      window.location.href = '/'
    } catch (err) {
      console.error('Error deleting account:', err)
      showNotification('error', 'Couldn\'t delete account. Check your connection and try again.')
      setDeleting(false)
    }
  }

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return

      // Get all guild memberships from character-based system
      const { data: userCharacters } = await supabase
        .from('characters')
        .select('id')
        .eq('user_id', user.id)

      let derivedMemberships: any[] = []

      if (userCharacters && userCharacters.length > 0) {
        const characterIds = userCharacters.map((c: { id: string }) => c.id)
        const { data: charMemberships } = await supabase
          .from('character_guild_memberships')
          .select(`
            id,
            role,
            joined_at,
            character:characters(id, name, is_main),
            guild:guilds(id, name, realm, faction, created_by, icon_url)
          `)
          .in('character_id', characterIds)
          .eq('is_active', true)

        if (charMemberships && charMemberships.length > 0) {
          // Group by guild and pick the main character for each
          const guildMap = new Map<string, any>()
          for (const m of charMemberships) {
            const guild = Array.isArray(m.guild) ? m.guild[0] : m.guild
            const char = Array.isArray(m.character) ? m.character[0] : m.character
            if (!guild) continue

            const existing = guildMap.get(guild.id)
            if (!existing || (char?.is_main && !existing.character?.is_main)) {
              guildMap.set(guild.id, {
                ...m,
                guild,
                character: char,
                guild_id: guild.id,
                user_id: user.id
              })
            }
          }
          derivedMemberships = Array.from(guildMap.values())
        }
      }

      setAllGuilds(derivedMemberships)
      setLoading(false)
    }

    loadProfile()
    loadBattlenetAccount()
    loadNotificationPrefs()
  }, [])

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-poppins">
        {/* Header skeleton shown during load */}
        <ProfileContentSkeleton />
      </div>
    )
  }

  const avatarUrl = user?.user_metadata?.avatar_url
    ? (user.user_metadata.avatar_url.startsWith('http')
        ? user.user_metadata.avatar_url.replace('.gif', '.png') + '?size=256'
        : `https://cdn.discordapp.com/avatars/${user.user_metadata.provider_id}/${user.user_metadata.avatar_url}.png?size=256`)
    : 'https://cdn.discordapp.com/embed/avatars/0.png'

  const displayName = user?.user_metadata?.custom_claims?.global_name || user?.user_metadata?.full_name || 'User'

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'account', label: 'Account', icon: UserIcon },
    { id: 'preferences', label: 'Preferences', icon: Settings01Icon },
    { id: 'guilds', label: 'My guilds', icon: Shield01Icon },
  ]

  return (
    <>
      {/* Full-screen overlay during logout to prevent flash */}
      {loggingOut && (
        <div className="fixed inset-0 bg-background z-[9999] flex items-center justify-center">
          <LoadingSpinner text="Logging out..." />
        </div>
      )}

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-poppins">
      {/* Header */}
      <div className="bg-background-elevated border border-border rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <Image
            src={avatarUrl}
            alt="Avatar"
            width={80}
            height={80}
            priority
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-border/50 shadow-md"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-[28px] font-bold text-foreground">{displayName}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-[13px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Calendar01Icon} size={14} />
                <span>Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} className="text-success" />
                <span>Discord connected</span>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} loading={loggingOut} className="w-full sm:w-auto">
            <HugeiconsIcon icon={Logout01Icon} size={16} />
            Log Out
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'accent-subtle' : 'outline'}
            onClick={() => setActiveTab(tab.id)}
            className="px-5 py-2.5 rounded-[40px] whitespace-nowrap text-[13px] font-medium"
          >
            <HugeiconsIcon icon={tab.icon} size={16} />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-[18px] font-semibold text-foreground">Discord notifications</h2>
              <p className="text-muted-foreground text-[13px] mt-1">Control what Discord DMs you receive from the LootList+ bot</p>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[14px] font-medium text-foreground">Loot list review updates</p>
                  <p className="text-[13px] text-muted-foreground">Get a DM when your loot list is approved, rejected or needs revision</p>
                </div>
                <Switch
                  checked={notifySubmissionStatus}
                  onCheckedChange={toggleSubmissionStatus}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[14px] font-medium text-foreground">New submission alerts</p>
                  <p className="text-[13px] text-muted-foreground">Officers and guild masters get a DM when a raider submits their loot list</p>
                </div>
                <span className="text-[12px] text-muted-foreground whitespace-nowrap">Always on</span>
              </div>
            </div>
          </div>

          {/* Battle.net Connection */}
          <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[18px] font-semibold text-foreground">Battle.net account</h2>
                  <p className="text-muted-foreground text-[13px] mt-1">Link your Battle.net to import characters and sync gear</p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {battlenetAccount ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#0074E0]/10 border border-[#0074E0]/30 rounded-lg flex items-center justify-center">
                        <Image src="/icons/battlenet.svg" alt="Battle.net" width={22} height={22} className="w-[22px] h-[22px]" style={{ filter: 'brightness(0) saturate(100%) invert(30%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(97%) contrast(101%)' }} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{battlenetAccount.battletag || 'Connected'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[11px]">{battlenetAccount.region.toUpperCase()}</Badge>
                          <span className="text-[12px] text-muted-foreground">
                            Connected {new Date(battlenetAccount.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.location.href = `/api/auth/battlenet?region=${battlenetAccount.region}`
                        }}
                        className="flex-1 sm:flex-none"
                      >
                        <HugeiconsIcon icon={RefreshIcon} size={14} />
                        Reconnect
                      </Button>
                      <Button
                        variant="destructive-outline"
                        size="sm"
                        onClick={disconnectBattlenet}
                        loading={disconnectingBattlenet}
                        className="flex-1 sm:flex-none"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} size={14} />
                        Disconnect
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[13px] text-muted-foreground">
                    Connect your Battle.net account to import characters directly with their equipped gear.
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="bnet-region" className="text-[13px] shrink-0">Region</Label>
                      <Select
                        id="bnet-region"
                        variant="rounded"
                        size="sm"
                        value={battlenetRegion}
                        onChange={(e) => setBattlenetRegion(e.target.value)}
                        className="w-24"
                      >
                        <option value="us">US</option>
                        <option value="eu">EU</option>
                      </Select>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        window.location.href = `/api/auth/battlenet?region=${battlenetRegion}`
                      }}
                    >
                      <Image src="/icons/battlenet.svg" alt="" width={16} height={16} className="w-4 h-4 brightness-0 dark:invert" />
                      Connect Battle.net
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-background-elevated border border-destructive/30 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-destructive/30">
              <h2 className="text-[18px] font-semibold text-destructive">Danger zone</h2>
              <p className="text-muted-foreground text-[13px] mt-1">Irreversible and destructive actions</p>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {/* Disconnect Discord */}
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <HugeiconsIcon icon={LinkSquare02Icon} size={18} className="text-destructive" />
                      <h3 className="text-[16px] font-semibold text-destructive">Disconnect Discord</h3>
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      Disconnect your Discord account from LootList+. You will be logged out and can sign in again with a different Discord account.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleDisconnectDiscord}
                    loading={disconnecting}
                    className="shrink-0 w-full sm:w-auto"
                  >
                    Disconnect Discord
                  </Button>
                </div>
              </div>

              {/* Delete Account */}
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <HugeiconsIcon icon={Delete02Icon} size={18} className="text-destructive" />
                      <h3 className="text-[16px] font-semibold text-destructive">Delete account</h3>
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      Permanently delete your account and all associated data. This includes your characters, loot lists, attendance records and guild memberships. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteModal(true)}
                    loading={deleting}
                    className="shrink-0 w-full sm:w-auto"
                  >
                    Delete account
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'preferences' && (
        <div className="space-y-6">
          {/* Appearance */}
          <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-border">
              <h2 className="text-[18px] font-semibold text-foreground">Appearance</h2>
              <p className="text-muted-foreground text-[13px] mt-1">Customize how LootList+ looks</p>
            </div>
            <div className="p-4 sm:p-6 space-y-6">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-background-subtle border border-border rounded-lg flex items-center justify-center">
                    <HugeiconsIcon icon={(selectedTheme || theme) === 'dark' ? Moon02Icon : (selectedTheme || theme) === 'light' ? Sun03Icon : ComputerIcon} size={20} />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">Theme</p>
                    <p className="text-[13px] text-muted-foreground">Choose your preferred appearance</p>
                  </div>
                </div>
                <div className="relative flex items-center bg-background-subtle border border-border rounded-full p-1">
                  {/* Animated background indicator */}
                  <div
                    className={`absolute top-1 left-1 h-8 w-10 bg-accent/20 rounded-full ${mounted ? 'opacity-100' : 'opacity-0'}`}
                    style={{
                      transform: `translateX(${(selectedTheme || theme) === 'light' ? '40px' : (selectedTheme || theme) === 'dark' ? '80px' : '0px'})`,
                      transitionProperty: 'transform',
                      transitionDuration: '300ms',
                      transitionTimingFunction: 'ease-out'
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedTheme('system')
                      setTheme('system')
                    }}
                    className={`relative z-10 w-10 h-8 rounded-full ${
                      (selectedTheme || theme) === 'system'
                        ? 'text-accent'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="System"
                  >
                    <HugeiconsIcon icon={ComputerIcon} size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedTheme('light')
                      setTheme('light')
                    }}
                    className={`relative z-10 w-10 h-8 rounded-full ${
                      (selectedTheme || theme) === 'light'
                        ? 'text-accent'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Light"
                  >
                    <HugeiconsIcon icon={Sun03Icon} size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedTheme('dark')
                      setTheme('dark')
                    }}
                    className={`relative z-10 w-10 h-8 rounded-full ${
                      (selectedTheme || theme) === 'dark'
                        ? 'text-accent'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Dark"
                  >
                    <HugeiconsIcon icon={Moon02Icon} size={16} />
                  </Button>
                </div>
              </div>

              {/* Accent Color */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-background-subtle border border-border rounded-lg flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={PaintBoardIcon} size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground font-medium">Accent Color</p>
                    <p className="text-[13px] text-muted-foreground hidden sm:block">Choose your preferred accent color</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-1.5">
                  {ACCENT_COLORS.map((color) => {
                    const isSelected = accentColor === color.value
                    return (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => {
                          setAccentColor(color.value)
                          saveAccentColor(color.value)
                        }}
                        className={`w-8 h-8 sm:w-6 sm:h-6 rounded-full transition-all ${
                          isSelected
                            ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                            : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                        aria-label={`Set accent color to ${color.name}`}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'guilds' && (
        <div className="space-y-6">
          <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-[18px] font-semibold text-foreground">My guilds</h2>
              <p className="text-muted-foreground text-[13px] mt-1">Guilds you're a member of</p>
            </div>
            <div className="p-4 sm:p-6">
              {allGuilds.length > 0 ? (
                <div className="space-y-3">
                  {allGuilds.map((membership) => {
                    const isCreator = membership.guild.created_by === user?.id
                    const isGuildMaster = membership.role === 'Guild Master'
                    return (
                      <div
                        key={membership.guild.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-background-inset border border-border rounded-lg"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          {membership.guild.icon_url ? (
                            <Image
                              src={membership.guild.icon_url}
                              alt={membership.guild.name}
                              width={48}
                              height={48}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border border-border/50 shadow-sm shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-accent/30 to-accent/10 rounded-lg flex items-center justify-center border border-border/50 shadow-sm shrink-0">
                              <span className="text-accent font-bold text-base sm:text-lg">{membership.guild.name.charAt(0)}</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-foreground truncate">{membership.guild.name}</p>
                              {isCreator && (
                                <span className="px-2 py-0.5 bg-accent/20 border border-accent/30 rounded text-accent text-xs shrink-0">Creator</span>
                              )}
                            </div>
                            <p className="text-[13px] text-muted-foreground truncate">
                              {membership.guild.realm} • {membership.guild.faction}
                            </p>
                            <span className="inline-block mt-1 px-2 py-0.5 bg-background-elevated border border-border rounded text-muted-foreground text-xs">
                              {membership.role}
                            </span>
                          </div>
                        </div>
                        {isGuildMaster ? (
                          <div className="sm:text-right shrink-0">
                            <p className="text-[13px] text-muted-foreground mb-1">
                              Guild Masters cannot leave
                            </p>
                            <Button
                              variant="link"
                              onClick={async () => {
                                await switchGuild(membership.guild.id)
                                router.push('/admin/guild-settings')
                              }}
                              className="text-accent text-[13px] p-0 h-auto"
                            >
                              Go to Guild Settings
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setLeaveGuildId(membership.guild.id)}
                            disabled={leaving}
                            className="w-full sm:w-auto shrink-0"
                          >
                            <HugeiconsIcon icon={Logout01Icon} size={16} />
                            Leave guild
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-4 rounded-full bg-muted p-3">
                    <HugeiconsIcon icon={Shield01Icon} size={24} className="text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">No guilds yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-4">Join a guild to start tracking loot with your team.</p>
                  <Button variant="outline" onClick={() => router.push('/guild-select')}>
                    Find a guild
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave Guild Confirmation Modal */}
      {/* Leave Guild Confirmation Modal */}
      <Modal open={!!leaveGuildId} onClose={() => !leaving && setLeaveGuildId(null)} size="sm">
        <ModalHeader>
          <ModalTitle>Leave guild?</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className="text-muted-foreground">
            Are you sure you want to leave this guild? Your characters will be removed from this guild and you'll lose access to guild features.
            {allGuilds.length === 1 && (
              <span className="block mt-2 text-destructive font-medium">
                This is your only guild. You'll need to join another guild to continue using LootList+.
              </span>
            )}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setLeaveGuildId(null)}
            disabled={leaving}
          >
            Stay in guild
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (leaveGuildId) {
                handleLeaveGuild(leaveGuildId)
                setLeaveGuildId(null)
              }
            }}
            disabled={leaving}
            loading={leaving}
          >
            Leave guild
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal open={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteConfirmInput(''); }} size="default">
        <ModalHeader onClose={() => { setShowDeleteModal(false); setDeleteConfirmInput(''); }}>
          <ModalTitle>Delete your account?</ModalTitle>
          <ModalDescription>
            This will permanently delete your account and all associated data including your characters, loot lists, attendance records and guild memberships. This cannot be undone.
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
            variant="outline"
            onClick={() => { setShowDeleteModal(false); setDeleteConfirmInput(''); }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={deleteConfirmInput !== deleteConfirmText}
            loading={deleting}
          >
            Delete account
          </Button>
        </ModalFooter>
      </Modal>

      {ConfirmDialog}
    </div>
    </>
  )
}
