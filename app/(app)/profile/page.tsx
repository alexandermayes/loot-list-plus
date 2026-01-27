'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
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
  Notification01Icon,
  Mail01Icon,
  LinkSquare02Icon,
  Delete02Icon,
  Calendar01Icon,
  CheckmarkCircle01Icon
} from '@hugeicons/core-free-icons'
import { useTheme } from 'next-themes'

type TabId = 'account' | 'preferences' | 'guilds'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [allGuilds, setAllGuilds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('account')
  const [leaveGuildId, setLeaveGuildId] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { theme, setTheme } = useTheme()
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    document.title = 'LootList+ • Profile'
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
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
        alert(data.error || 'Failed to leave guild')
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
      alert('An error occurred while leaving the guild')
      setLeaving(false)
    }
  }

  const handleDisconnectDiscord = async () => {
    const confirmed = confirm(
      'Are you sure you want to disconnect your Discord account? You will be logged out and need to sign in again to continue using LootList+.'
    )
    if (!confirmed) return

    setDisconnecting(true)
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (err) {
      console.error('Error disconnecting:', err)
      setDisconnecting(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmText = 'DELETE MY ACCOUNT'
    const userInput = prompt(
      `⚠️ DANGER: This will permanently delete your account and ALL associated data including characters, loot lists, and guild memberships.\n\nThis action CANNOT be undone.\n\nType "${confirmText}" to confirm:`
    )

    if (userInput !== confirmText) return

    setDeleting(true)
    try {
      // TODO: Implement account deletion API
      alert('Account deletion is not yet implemented. Please contact support.')
      setDeleting(false)
    } catch (err) {
      console.error('Error deleting account:', err)
      alert('An error occurred while deleting your account')
      setDeleting(false)
    }
  }

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

      // Get all guild memberships from character-based system
      const { data: userCharacters } = await supabase
        .from('characters')
        .select('id')
        .eq('user_id', user.id)

      let derivedMemberships: any[] = []

      if (userCharacters && userCharacters.length > 0) {
        const characterIds = userCharacters.map(c => c.id)
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
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
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
    { id: 'guilds', label: 'My Guilds', icon: Shield01Icon },
  ]

  return (
    <div className="p-8 space-y-6 font-poppins">
      {/* Header */}
      <div className="bg-background-elevated border border-border rounded-xl p-6">
        <div className="flex items-center gap-6">
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-20 h-20 rounded-full border-4 border-border"
          />
          <div className="flex-1">
            <h1 className="text-[28px] font-bold text-foreground">{displayName}</h1>
            <div className="flex items-center gap-4 mt-1 text-[13px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Calendar01Icon} size={14} />
                <span>Member since {new Date(user?.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} className="text-green-400" />
                <span>Discord Connected</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-background-elevated hover:bg-muted border border-border rounded-[52px] text-foreground font-medium text-base transition whitespace-nowrap flex items-center gap-2"
          >
            <HugeiconsIcon icon={Logout01Icon} size={16} />
            Log Out
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-[40px] whitespace-nowrap text-[13px] font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-accent/20 border-[0.5px] border-accent/20 text-accent'
                : 'bg-background-elevated border border-border text-foreground hover:bg-muted'
            }`}
          >
            <HugeiconsIcon icon={tab.icon} size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* Email Settings - Coming Soon */}
          <div className="bg-background-elevated border border-border rounded-xl overflow-hidden opacity-60">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[18px] font-semibold text-foreground">Email Settings</h2>
                  <p className="text-muted-foreground text-[13px] mt-1">Manage your email address for notifications</p>
                </div>
                <span className="px-3 py-1 bg-muted border border-border rounded-full text-muted-foreground text-[12px]">
                  Coming Soon
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 rounded-full bg-muted p-3">
                  <HugeiconsIcon icon={Mail01Icon} size={24} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Email settings coming soon</h3>
                <p className="text-sm text-muted-foreground max-w-sm">You'll be able to add and verify an email address for receiving notifications.</p>
              </div>
            </div>
          </div>

          {/* Notifications - Coming Soon */}
          <div className="bg-background-elevated border border-border rounded-xl overflow-hidden opacity-60">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[18px] font-semibold text-foreground">Notifications</h2>
                  <p className="text-muted-foreground text-[13px] mt-1">Control what notifications you receive</p>
                </div>
                <span className="px-3 py-1 bg-muted border border-border rounded-full text-muted-foreground text-[12px]">
                  Coming Soon
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 rounded-full bg-muted p-3">
                  <HugeiconsIcon icon={Notification01Icon} size={24} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Notification preferences coming soon</h3>
                <p className="text-sm text-muted-foreground max-w-sm">You'll be able to customize notifications for loot deadlines, submission reviews, and more.</p>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-background-elevated border border-red-900/50 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-red-900/50">
              <h2 className="text-[18px] font-semibold text-red-400">Danger Zone</h2>
              <p className="text-muted-foreground text-[13px] mt-1">Irreversible and destructive actions</p>
            </div>
            <div className="p-6 space-y-4">
              {/* Disconnect Discord */}
              <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <HugeiconsIcon icon={LinkSquare02Icon} size={18} className="text-red-400" />
                      <h3 className="text-[16px] font-semibold text-red-400">Disconnect Discord</h3>
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      Disconnect your Discord account from LootList+. You will be logged out and can sign in again with a different Discord account.
                    </p>
                  </div>
                  <button
                    onClick={handleDisconnectDiscord}
                    disabled={disconnecting}
                    className="shrink-0 px-5 py-2.5 bg-red-900/30 hover:bg-red-900/50 border border-red-600 disabled:opacity-50 rounded-[40px] text-red-200 font-medium text-[14px] transition"
                  >
                    {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </div>
              </div>

              {/* Delete Account */}
              <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <HugeiconsIcon icon={Delete02Icon} size={18} className="text-red-400" />
                      <h3 className="text-[16px] font-semibold text-red-400">Delete Account</h3>
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      Permanently delete your account and all associated data. This includes your characters, loot lists, attendance records, and guild memberships. This action cannot be undone.
                    </p>
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="shrink-0 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-[40px] text-white font-medium text-[14px] transition"
                  >
                    {deleting ? 'Deleting...' : 'Delete Account'}
                  </button>
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
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-[18px] font-semibold text-foreground">Appearance</h2>
              <p className="text-muted-foreground text-[13px] mt-1">Customize how LootList+ looks</p>
            </div>
            <div className="p-6 space-y-6">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-background-subtle border border-border rounded-lg flex items-center justify-center">
                    <HugeiconsIcon icon={theme === 'dark' ? Moon02Icon : theme === 'light' ? Sun03Icon : ComputerIcon} size={20} />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">Theme</p>
                    <p className="text-[13px] text-muted-foreground">Choose your preferred appearance</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-background-subtle border border-border rounded-full p-1">
                  <button
                    onClick={() => setTheme('system')}
                    className={`px-3 py-2 rounded-full text-[13px] font-medium transition-all ${
                      theme === 'system'
                        ? 'bg-accent/20 text-accent'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="System"
                  >
                    <HugeiconsIcon icon={ComputerIcon} size={16} />
                  </button>
                  <button
                    onClick={() => setTheme('light')}
                    className={`px-3 py-2 rounded-full text-[13px] font-medium transition-all ${
                      theme === 'light'
                        ? 'bg-accent/20 text-accent'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Light"
                  >
                    <HugeiconsIcon icon={Sun03Icon} size={16} />
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`px-3 py-2 rounded-full text-[13px] font-medium transition-all ${
                      theme === 'dark'
                        ? 'bg-accent/20 text-accent'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Dark"
                  >
                    <HugeiconsIcon icon={Moon02Icon} size={16} />
                  </button>
                </div>
              </div>

              {/* Accent Color - Coming Soon */}
              <div className="flex items-center justify-between opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-background-subtle border border-border rounded-lg flex items-center justify-center">
                    <HugeiconsIcon icon={PaintBoardIcon} size={20} />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">Accent Color</p>
                    <p className="text-[13px] text-muted-foreground">Choose your preferred accent color</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-[#ff8000] border-2 border-[#ff8000]/30" title="Legendary" />
                    <div className="w-6 h-6 rounded-full bg-[#a335ee] border-2 border-[#a335ee]/30 opacity-50" title="Epic" />
                    <div className="w-6 h-6 rounded-full bg-[#0070dd] border-2 border-[#0070dd]/30 opacity-50" title="Rare" />
                  </div>
                  <span className="px-3 py-1 bg-muted border border-border rounded-full text-muted-foreground text-[12px]">
                    Coming Soon
                  </span>
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
              <h2 className="text-[18px] font-semibold text-foreground">My Guilds</h2>
              <p className="text-muted-foreground text-[13px] mt-1">Guilds you're a member of</p>
            </div>
            <div className="p-6">
              {allGuilds.length > 0 ? (
                <div className="space-y-3">
                  {allGuilds.map((membership) => {
                    const isCreator = membership.guild.created_by === user?.id
                    const isGuildMaster = membership.role === 'Guild Master'
                    return (
                      <div
                        key={membership.guild.id}
                        className="flex items-center justify-between p-4 bg-background-inset border border-border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          {membership.guild.icon_url ? (
                            <img
                              src={membership.guild.icon_url}
                              alt={membership.guild.name}
                              className="w-12 h-12 rounded-full border border-border"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-accent/30 to-accent/10 rounded-full flex items-center justify-center border border-border">
                              <span className="text-accent font-bold text-lg">{membership.guild.name.charAt(0)}</span>
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{membership.guild.name}</p>
                              {isCreator && (
                                <span className="px-2 py-0.5 bg-accent/20 border border-accent/30 rounded text-accent text-xs">Creator</span>
                              )}
                            </div>
                            <p className="text-[13px] text-muted-foreground">
                              {membership.guild.realm} • {membership.guild.faction}
                            </p>
                            <span className="inline-block mt-1 px-2 py-0.5 bg-background-elevated border border-border rounded text-muted-foreground text-xs">
                              {membership.role}
                            </span>
                          </div>
                        </div>
                        {isGuildMaster ? (
                          <div className="text-right">
                            <p className="text-[13px] text-muted-foreground mb-1">
                              Guild Masters cannot leave
                            </p>
                            <button
                              onClick={() => router.push('/admin/guild-settings')}
                              className="text-accent text-[13px] hover:underline"
                            >
                              Go to Guild Settings
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setLeaveGuildId(membership.guild.id)}
                            disabled={leaving}
                            className="px-4 py-2 bg-red-900/20 hover:bg-red-900/30 border border-red-600 rounded-[52px] text-red-200 text-[13px] font-medium transition flex items-center gap-2 disabled:opacity-50"
                          >
                            <HugeiconsIcon icon={Logout01Icon} size={16} />
                            Leave Guild
                          </button>
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
                  <h3 className="text-lg font-semibold text-foreground mb-1">No guilds</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-4">You're not a member of any guilds yet.</p>
                  <button
                    onClick={() => router.push('/guild-select')}
                    className="px-5 py-2.5 bg-background-elevated hover:bg-muted border border-border rounded-[52px] text-foreground text-[13px] font-medium transition"
                  >
                    Join a Guild
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave Guild Confirmation Modal */}
      {leaveGuildId && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !leaving && setLeaveGuildId(null)}
        >
          <div
            className="bg-background-elevated border border-border rounded-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[20px] font-bold text-foreground mb-2">Leave guild?</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to leave this guild? Your characters will be removed from this guild and you'll lose access to guild features.
              {allGuilds.length === 1 && (
                <span className="block mt-2 text-red-400 font-medium">
                  This is your only guild. You'll need to join another guild to continue using LootList+.
                </span>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setLeaveGuildId(null)}
                disabled={leaving}
                className="px-5 py-2.5 bg-background-elevated hover:bg-muted border border-border rounded-[52px] text-foreground text-[13px] font-medium transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleLeaveGuild(leaveGuildId)
                  setLeaveGuildId(null)
                }}
                disabled={leaving}
                className="px-5 py-2.5 bg-red-900/20 hover:bg-red-900/30 border border-red-600 rounded-[52px] text-red-200 text-[13px] font-medium transition disabled:opacity-50"
              >
                {leaving ? 'Leaving...' : 'Leave Guild'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
