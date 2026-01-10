'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/app/components/Navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import InviteCodeManager from './components/InviteCodeManager'
import MemberManager from './components/MemberManager'

export default function GuildSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Form state
  const [guildName, setGuildName] = useState('')
  const [realm, setRealm] = useState('')
  const [faction, setFaction] = useState<'Alliance' | 'Horde'>('Alliance')
  const [discordServerId, setDiscordServerId] = useState('')
  const [activeExpansion, setActiveExpansion] = useState<string | null>(null)
  const [changingExpansion, setChangingExpansion] = useState(false)

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, loading: guildLoading, isOfficer } = useGuildContext()

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
      const { error } = await supabase
        .from('guilds')
        .update({
          name: guildName.trim(),
          realm: realm.trim() || null,
          faction,
          discord_server_id: discordServerId.trim() || null
        })
        .eq('id', activeGuild.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Guild information updated successfully' })

      // Refresh guild context
      window.location.reload()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update guild information' })
    } finally {
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
      setTimeout(() => window.location.reload(), 1500)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to change expansion' })
      setChangingExpansion(false)
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
    <div className="min-h-screen bg-background">
      <Navigation
        user={user}
        showBack
        backUrl="/admin"
        title="Guild Settings"
      />

      <main className="max-w-6xl mx-auto p-6 space-y-6">
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
              <Label htmlFor="realm">Realm (Optional)</Label>
              <Input
                id="realm"
                value={realm}
                onChange={(e) => setRealm(e.target.value)}
                placeholder="e.g., Faerlina, Whitemane"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="faction">Faction</Label>
              <select
                id="faction"
                value={faction}
                onChange={(e) => setFaction(e.target.value as 'Alliance' | 'Horde')}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground"
              >
                <option value="Alliance">Alliance</option>
                <option value="Horde">Horde</option>
              </select>
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
              {saving ? 'Saving...' : 'Update Discord Server'}
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
      </main>
    </div>
  )
}
