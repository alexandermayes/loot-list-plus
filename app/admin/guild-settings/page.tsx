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

        {/* Invite Codes */}
        <InviteCodeManager />

        {/* Members */}
        <MemberManager />
      </main>
    </div>
  )
}
