'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import InviteCodeManager from './components/InviteCodeManager'
import MemberManager from './components/MemberManager'
import RealmSelector from '@/app/components/RealmSelector'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function GuildSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Form state
  const [guildName, setGuildName] = useState('')
  const [realmRegion, setRealmRegion] = useState('Americas & Oceania')
  const [realm, setRealm] = useState('')
  const [faction, setFaction] = useState<'Alliance' | 'Horde'>('Alliance')
  const [discordServerId, setDiscordServerId] = useState('')
  const [guildIconUrl, setGuildIconUrl] = useState<string | null>(null)
  const [activeExpansion, setActiveExpansion] = useState<string | null>(null)
  const [changingExpansion, setChangingExpansion] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isGuildCreator, setIsGuildCreator] = useState(false)

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, loading: guildLoading, isOfficer, refreshGuilds } = useGuildContext()

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

      // Check if officer using context
      if (!guildLoading && !isOfficer) {
        router.push('/dashboard')
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

      // Load active expansion
      if (activeGuild.active_expansion_id) {
        const loadExpansion = async () => {
          const { data } = await supabase
            .from('expansions')
            .select('name')
            .eq('id', activeGuild.active_expansion_id)
            .single()

          setActiveExpansion(data?.name || null)
        }
        loadExpansion()
      } else {
        setActiveExpansion(null)
      }

      setLoading(false)
    }

    if (!guildLoading) {
      loadData()
    }
  }, [guildLoading, activeGuild, isOfficer])

  const handleSaveBasicInfo = async () => {
    if (!activeGuild) return

    setSaving(true)
    setMessage(null)

    try {
      // Check if Discord Server ID changed and we should auto-fetch the icon
      const serverIdChanged = discordServerId.trim() && discordServerId.trim() !== activeGuild.discord_server_id
      const shouldFetchIcon = discordServerId.trim() && (!guildIconUrl || serverIdChanged)
      let finalIconUrl = guildIconUrl

      // Auto-fetch icon if server ID exists and icon is missing or changed
      if (shouldFetchIcon) {
        setMessage({ type: 'success', text: 'Saving and fetching Discord icon...' })

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
        p_realm: realm.trim() || null,
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

      setMessage({ type: 'success', text: 'Guild information updated successfully' + (shouldFetchIcon && finalIconUrl ? ' (Discord icon fetched!)' : '') })

      // Reload page to show updated guild info in sidebar
      setTimeout(() => {
        window.location.reload()
      }, 800)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update guild information' })
      setSaving(false)
    }
  }

  const handleChangeExpansion = async (newExpansion: string) => {
    if (!activeGuild) return

    if (!confirm(`⚠️ Changing expansion will replace all raid tiers and loot data. This action cannot be undone. Continue?`)) {
      return
    }

    setChangingExpansion(true)
    setMessage(null)

    try {
      const response = await fetch('/api/guilds/change-expansion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: activeGuild.id,
          expansion: newExpansion
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to change expansion')
      }

      setMessage({ type: 'success', text: 'Expansion changed successfully! Reloading...' })
      setTimeout(() => {
        window.location.reload()
      }, 800)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to change expansion' })
      setChangingExpansion(false)
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
    setMessage(null)

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
      setMessage({ type: 'error', text: error.message || 'Failed to delete guild' })
      setDeleting(false)
    }
  }

  if (loading || guildLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!activeGuild || !isOfficer) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Unauthorized</p>
      </div>
    )
  }

  return (
      <div className="p-8 space-y-6 font-poppins">
        {/* Header */}
        <div>
          <h1 className="text-[42px] font-bold text-white leading-tight">Guild Settings</h1>
          <p className="text-[#a1a1a1] mt-1 text-[14px]">Manage your guild configuration, members, and settings</p>
        </div>
        {message && (
          <div className={`p-4 rounded-xl ${
            message.type === 'success'
              ? 'bg-green-950/50 border border-green-600/50 text-green-200'
              : 'bg-red-950/50 border border-red-600/50 text-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden">
          <div className="p-6 border-b border-[rgba(255,255,255,0.1)]">
            <h2 className="text-[24px] font-semibold text-white">Basic Information</h2>
            <p className="text-[#a1a1a1] text-[13px] mt-1">Update your guild's basic details</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="guildName" className="block text-[13px] font-medium text-white">Guild Name</label>
              <input
                id="guildName"
                value={guildName}
                onChange={(e) => setGuildName(e.target.value)}
                placeholder="Enter guild name"
                className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[13px] font-medium text-white">Realm (Optional)</label>
              <RealmSelector
                region={realmRegion}
                realm={realm}
                onRegionChange={setRealmRegion}
                onRealmChange={setRealm}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="faction" className="block text-[13px] font-medium text-white">Faction</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFaction('Alliance')}
                  disabled={saving}
                  className={`p-4 rounded-xl border-2 transition ${
                    faction === 'Alliance'
                      ? 'border-blue-500 bg-blue-500/20 text-blue-200'
                      : 'border-[rgba(255,255,255,0.1)] bg-[#151515] hover:border-blue-500/50 text-white'
                  }`}
                >
                  <p className="font-medium text-[14px]">Alliance</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFaction('Horde')}
                  disabled={saving}
                  className={`p-4 rounded-xl border-2 transition ${
                    faction === 'Horde'
                      ? 'border-red-500 bg-red-500/20 text-red-200'
                      : 'border-[rgba(255,255,255,0.1)] bg-[#151515] hover:border-red-500/50 text-white'
                  }`}
                >
                  <p className="font-medium text-[14px]">Horde</p>
                </button>
              </div>
            </div>

            <button
              onClick={handleSaveBasicInfo}
              disabled={saving || !guildName.trim()}
              className="w-full px-5 py-3 bg-white hover:bg-gray-100 disabled:opacity-50 rounded-[40px] text-black font-medium text-[16px] transition"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Discord Integration */}
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden">
          <div className="p-6 border-b border-[rgba(255,255,255,0.1)]">
            <h2 className="text-[24px] font-semibold text-white">Discord Integration</h2>
            <p className="text-[#a1a1a1] text-[13px] mt-1">
              Connect your Discord server to allow automatic guild joins
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="discordServerId" className="block text-[13px] font-medium text-white">Discord Server ID</label>
              <input
                id="discordServerId"
                value={discordServerId}
                onChange={(e) => setDiscordServerId(e.target.value)}
                placeholder="Enter Discord server ID"
                className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000]"
              />
              <p className="text-xs text-[#a1a1a1]">
                Enable Developer Mode in Discord, right-click your server, and select "Copy Server ID"
              </p>
            </div>

            <button
              onClick={handleSaveBasicInfo}
              disabled={saving}
              className="px-5 py-3 bg-[#151515] hover:bg-[#1a1a1a] disabled:opacity-50 border border-[rgba(255,255,255,0.1)] rounded-[40px] text-white font-medium text-[16px] transition"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Guild Expansion */}
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden">
          <div className="p-6 border-b border-[rgba(255,255,255,0.1)]">
            <h2 className="text-[24px] font-semibold text-white">Guild Expansion</h2>
            <p className="text-[#a1a1a1] text-[13px] mt-1">
              {activeExpansion
                ? `Your guild is currently set to ${activeExpansion}`
                : '⚠️ No expansion set - select one to enable loot features'}
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {['Classic', 'The Burning Crusade', 'Wrath of the Lich King', 'Cataclysm', 'Mists of Pandaria'].map(exp => (
                <button
                  key={exp}
                  type="button"
                  onClick={() => handleChangeExpansion(exp)}
                  disabled={changingExpansion || activeExpansion === exp}
                  className={`relative aspect-video rounded-lg border-2 transition overflow-hidden ${
                    activeExpansion === exp
                      ? 'border-[#ff8000] ring-2 ring-[#ff8000]/50'
                      : 'border-[rgba(255,255,255,0.1)] hover:border-[#ff8000]/50'
                  } ${changingExpansion || activeExpansion === exp ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <img
                    src={`https://beta.softres.it/img/editions/${exp.toLowerCase().replace(/\s+/g, '')}.big.png`}
                    alt={exp}
                    className="w-full h-full object-cover"
                  />
                  {activeExpansion === exp && (
                    <div className="absolute inset-0 bg-[#ff8000]/20 flex items-center justify-center">
                      <span className="text-2xl">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {!activeExpansion && (
              <p className="mt-4 text-[13px] text-yellow-400">
                ⚠️ You must select an expansion before your guild can use loot lists, rankings, or master sheets.
              </p>
            )}

            {changingExpansion && (
              <p className="mt-4 text-[13px] text-[#a1a1a1]">
                Changing expansion... This may take a moment.
              </p>
            )}
          </div>
        </div>

        {/* Invite Codes */}
        <InviteCodeManager />

        {/* Members */}
        <MemberManager />

        {/* Danger Zone - Only visible to guild creator */}
        {isGuildCreator && (
          <div className="bg-[#141519] border border-red-900/50 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-red-900/50">
              <h2 className="text-[24px] font-semibold text-red-400">Danger Zone</h2>
              <p className="text-[#a1a1a1] text-[13px] mt-1">
                Irreversible and destructive actions
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-[16px] font-semibold text-red-400 mb-1">Delete this guild</h3>
                    <p className="text-[13px] text-[#a1a1a1]">
                      Once you delete a guild, there is no going back. This will permanently delete all guild data including members, loot lists, attendance records, and settings.
                    </p>
                  </div>
                  <button
                    onClick={handleDeleteGuild}
                    disabled={deleting}
                    className="shrink-0 px-5 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-[40px] text-white font-medium text-[16px] transition"
                  >
                    {deleting ? 'Deleting...' : 'Delete Guild'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  )
}
