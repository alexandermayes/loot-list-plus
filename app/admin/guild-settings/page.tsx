'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import InviteCodeManager from './components/InviteCodeManager'
import MemberManager from './components/MemberManager'
import RealmSelector from '@/app/components/RealmSelector'

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!activeGuild || !isOfficer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Unauthorized</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#151515]">
      <Sidebar user={user} currentView="guild-settings" />

      <main className="ml-[208px] min-h-screen bg-[#09090c] border-l border-[rgba(255,255,255,0.1)] p-6">
        <h1 className="text-3xl font-bold text-foreground mb-6">Guild Settings</h1>

        <div className="max-w-6xl mx-auto space-y-6">
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-950/50 border border-green-600/50 text-green-200'
              : 'bg-red-950/50 border border-red-600/50 text-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Update your guild's basic details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guildName">Guild Name</Label>
              <Input
                id="guildName"
                value={guildName}
                onChange={(e) => setGuildName(e.target.value)}
                placeholder="Enter guild name"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base">Realm (Optional)</Label>
              <RealmSelector
                region={realmRegion}
                realm={realm}
                onRegionChange={setRealmRegion}
                onRealmChange={setRealm}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="faction" className="text-base">Faction</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFaction('Alliance')}
                  disabled={saving}
                  className={`p-4 rounded-lg border-2 transition ${
                    faction === 'Alliance'
                      ? 'border-blue-500 bg-blue-500/20 text-blue-200'
                      : 'border-border bg-card hover:border-blue-500/50'
                  }`}
                >
                  <p className="font-medium">Alliance</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFaction('Horde')}
                  disabled={saving}
                  className={`p-4 rounded-lg border-2 transition ${
                    faction === 'Horde'
                      ? 'border-red-500 bg-red-500/20 text-red-200'
                      : 'border-border bg-card hover:border-red-500/50'
                  }`}
                >
                  <p className="font-medium">Horde</p>
                </button>
              </div>
            </div>

            <Button
              onClick={handleSaveBasicInfo}
              disabled={saving || !guildName.trim()}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Discord Integration */}
        <Card>
          <CardHeader>
            <CardTitle>Discord Integration</CardTitle>
            <CardDescription>
              Connect your Discord server to allow automatic guild joins
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discordServerId">Discord Server ID</Label>
              <Input
                id="discordServerId"
                value={discordServerId}
                onChange={(e) => setDiscordServerId(e.target.value)}
                placeholder="Enter Discord server ID"
              />
              <p className="text-xs text-muted-foreground">
                Enable Developer Mode in Discord, right-click your server, and select "Copy Server ID"
              </p>
            </div>

            <Button
              onClick={handleSaveBasicInfo}
              disabled={saving}
              variant="outline"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Guild Expansion */}
        <Card>
          <CardHeader>
            <CardTitle>Guild Expansion</CardTitle>
            <CardDescription>
              {activeExpansion
                ? `Your guild is currently set to ${activeExpansion}`
                : '⚠️ No expansion set - select one to enable loot features'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {['Classic', 'The Burning Crusade', 'Wrath of the Lich King', 'Cataclysm', 'Mists of Pandaria'].map(exp => (
                <button
                  key={exp}
                  type="button"
                  onClick={() => handleChangeExpansion(exp)}
                  disabled={changingExpansion || activeExpansion === exp}
                  className={`relative aspect-video rounded-lg border-2 transition overflow-hidden ${
                    activeExpansion === exp
                      ? 'border-primary ring-2 ring-primary/50'
                      : 'border-border hover:border-primary/50'
                  } ${changingExpansion || activeExpansion === exp ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <img
                    src={`https://beta.softres.it/img/editions/${exp.toLowerCase().replace(/\s+/g, '')}.big.png`}
                    alt={exp}
                    className="w-full h-full object-cover"
                  />
                  {activeExpansion === exp && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <span className="text-2xl">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {!activeExpansion && (
              <p className="mt-4 text-sm text-yellow-400">
                ⚠️ You must select an expansion before your guild can use loot lists, rankings, or master sheets.
              </p>
            )}

            {changingExpansion && (
              <p className="mt-4 text-sm text-muted-foreground">
                Changing expansion... This may take a moment.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Invite Codes */}
        <InviteCodeManager />

        {/* Members */}
        <MemberManager />

        {/* Danger Zone - Only visible to guild creator */}
        {isGuildCreator && (
          <Card className="border-red-900/50">
            <CardHeader>
              <CardTitle className="text-red-400">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-red-400 mb-1">Delete this guild</h3>
                    <p className="text-sm text-muted-foreground">
                      Once you delete a guild, there is no going back. This will permanently delete all guild data including members, loot lists, attendance records, and settings.
                    </p>
                  </div>
                  <Button
                    onClick={handleDeleteGuild}
                    disabled={deleting}
                    variant="destructive"
                    className="shrink-0"
                  >
                    {deleting ? 'Deleting...' : 'Delete Guild'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </main>
    </div>
  )
}
