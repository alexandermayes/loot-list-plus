'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Eye, EyeOff, Bell, Shield, Save, CheckCircle, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface UserPreferences {
  show_email: boolean
  show_discord_username: boolean
  show_attendance_stats: boolean
  show_loot_history: boolean
  notify_loot_deadline: boolean
  notify_submission_status: boolean
  notify_new_raids: boolean
  preferred_display_name: string | null
  bio: string | null
  discord_verified: boolean
  discord_guild_member: boolean
  last_verified_at?: string | null
}

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
      return
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (data) {
      setPreferences(data)
    } else if (error?.code === 'PGRST116') {
      // No preferences yet, create default
      const defaultPrefs: Partial<UserPreferences> = {
        show_email: false,
        show_discord_username: true,
        show_attendance_stats: true,
        show_loot_history: true,
        notify_loot_deadline: true,
        notify_submission_status: true,
        notify_new_raids: true,
        preferred_display_name: null,
        bio: null,
      }
      setPreferences(defaultPrefs as UserPreferences)
    }

    setLoading(false)
  }

  const savePreferences = async () => {
    if (!preferences) return

    setSaving(true)
    setMessage(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        ...preferences,
        updated_at: new Date().toISOString()
      })

    if (error) {
      setMessage({ type: 'error', text: 'Failed to save preferences' })
    } else {
      setMessage({ type: 'success', text: 'Preferences saved successfully!' })
      setTimeout(() => setMessage(null), 3000)
    }

    setSaving(false)
  }

  const updatePreference = (key: keyof UserPreferences, value: any) => {
    if (preferences) {
      setPreferences({ ...preferences, [key]: value })
    }
  }

  const verifyDiscord = async () => {
    setVerifying(true)
    setMessage(null)

    try {
      const response = await fetch('/api/verify-discord', {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: data.verified ? 'success' : 'error',
          text: data.message
        })

        // Reload preferences to get updated verification status
        await loadPreferences()
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Verification failed'
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to verify Discord membership'
      })
    } finally {
      setVerifying(false)
      setTimeout(() => setMessage(null), 5000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Profile Settings"
        showBack
        backUrl="/profile"
      />

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {message && (
          <Alert className={message.type === 'success' ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}>
            <AlertDescription className={message.type === 'success' ? 'text-green-500' : 'text-red-500'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Privacy Settings
            </CardTitle>
            <CardDescription>Control what information is visible to other members</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Show Email Address</Label>
                <p className="text-sm text-muted-foreground">Display your email on your profile</p>
              </div>
              <Button
                variant={preferences?.show_email ? "default" : "outline"}
                size="sm"
                onClick={() => updatePreference('show_email', !preferences?.show_email)}
              >
                {preferences?.show_email ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Show Discord Username</Label>
                <p className="text-sm text-muted-foreground">Display your Discord username publicly</p>
              </div>
              <Button
                variant={preferences?.show_discord_username ? "default" : "outline"}
                size="sm"
                onClick={() => updatePreference('show_discord_username', !preferences?.show_discord_username)}
              >
                {preferences?.show_discord_username ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Show Attendance Stats</Label>
                <p className="text-sm text-muted-foreground">Display your raid attendance statistics</p>
              </div>
              <Button
                variant={preferences?.show_attendance_stats ? "default" : "outline"}
                size="sm"
                onClick={() => updatePreference('show_attendance_stats', !preferences?.show_attendance_stats)}
              >
                {preferences?.show_attendance_stats ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Show Loot History</Label>
                <p className="text-sm text-muted-foreground">Display items you've received</p>
              </div>
              <Button
                variant={preferences?.show_loot_history ? "default" : "outline"}
                size="sm"
                onClick={() => updatePreference('show_loot_history', !preferences?.show_loot_history)}
              >
                {preferences?.show_loot_history ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>Choose what notifications you want to receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Loot Deadline Reminders</Label>
                <p className="text-sm text-muted-foreground">Get notified before submission deadlines</p>
              </div>
              <Button
                variant={preferences?.notify_loot_deadline ? "default" : "outline"}
                size="sm"
                onClick={() => updatePreference('notify_loot_deadline', !preferences?.notify_loot_deadline)}
              >
                {preferences?.notify_loot_deadline ? <Bell className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Submission Status Updates</Label>
                <p className="text-sm text-muted-foreground">Notify when your submission is reviewed</p>
              </div>
              <Button
                variant={preferences?.notify_submission_status ? "default" : "outline"}
                size="sm"
                onClick={() => updatePreference('notify_submission_status', !preferences?.notify_submission_status)}
              >
                {preferences?.notify_submission_status ? <Bell className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>New Raid Events</Label>
                <p className="text-sm text-muted-foreground">Get notified when new raids are scheduled</p>
              </div>
              <Button
                variant={preferences?.notify_new_raids ? "default" : "outline"}
                size="sm"
                onClick={() => updatePreference('notify_new_raids', !preferences?.notify_new_raids)}
              >
                {preferences?.notify_new_raids ? <Bell className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile Customization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Profile Customization
            </CardTitle>
            <CardDescription>Personalize your profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Preferred Display Name (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-2">Override your Discord name</p>
              <input
                type="text"
                value={preferences?.preferred_display_name || ''}
                onChange={(e) => updatePreference('preferred_display_name', e.target.value || null)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground"
                placeholder="Leave blank to use Discord name"
              />
            </div>

            <div>
              <Label>Bio</Label>
              <p className="text-sm text-muted-foreground mb-2">Tell others about yourself</p>
              <Textarea
                value={preferences?.bio || ''}
                onChange={(e) => updatePreference('bio', e.target.value || null)}
                className="w-full min-h-[100px]"
                placeholder="Your bio..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Discord Verification Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Discord Server Verification
            </CardTitle>
            <CardDescription>
              Verify you're a member of the guild's Discord server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {preferences?.discord_verified && preferences?.discord_guild_member ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Guild Member Verified
                  </Badge>
                  {preferences.last_verified_at && (
                    <p className="text-xs text-muted-foreground">
                      Last verified: {new Date(preferences.last_verified_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  You are verified as a member of the guild's Discord server.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Badge variant="outline">Not Verified</Badge>
                <p className="text-sm text-muted-foreground">
                  Click the button below to verify your Discord server membership.
                </p>
              </div>
            )}
            <Button
              onClick={verifyDiscord}
              disabled={verifying}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${verifying ? 'animate-spin' : ''}`} />
              {verifying ? 'Verifying...' : 'Verify Discord Server Membership'}
            </Button>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={savePreferences}
            disabled={saving}
            size="lg"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </main>
    </div>
  )
}
