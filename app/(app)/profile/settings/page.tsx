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
import { HugeiconsIcon } from '@hugeicons/react'
import { EyeIcon, ViewOffIcon, Notification01Icon, Shield01Icon, FloppyDiskIcon, CheckmarkCircle01Icon, RefreshIcon } from '@hugeicons/core-free-icons'
import { useNotification } from '@/app/contexts/NotificationContext'

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
  const supabase = createClient()
  const { showNotification } = useNotification()
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
      showNotification('error', 'Failed to save preferences')
    } else {
      showNotification('success', 'Preferences saved successfully!', 3000)
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

    try {
      const response = await fetch('/api/verify-discord', {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        showNotification(data.verified ? 'success' : 'error', data.message)

        // Reload preferences to get updated verification status
        await loadPreferences()
      } else {
        showNotification('error', data.error || 'Verification failed')
      }
    } catch (error) {
      showNotification('error', 'Failed to verify Discord membership')
    } finally {
      setVerifying(false)
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
        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={EyeIcon} size={20} />
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
                {preferences?.show_email ? <HugeiconsIcon icon={EyeIcon} size={16} /> : <HugeiconsIcon icon={ViewOffIcon} size={16} />}
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
                {preferences?.show_discord_username ? <HugeiconsIcon icon={EyeIcon} size={16} /> : <HugeiconsIcon icon={ViewOffIcon} size={16} />}
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
                {preferences?.show_attendance_stats ? <HugeiconsIcon icon={EyeIcon} size={16} /> : <HugeiconsIcon icon={ViewOffIcon} size={16} />}
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
                {preferences?.show_loot_history ? <HugeiconsIcon icon={EyeIcon} size={16} /> : <HugeiconsIcon icon={ViewOffIcon} size={16} />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={Notification01Icon} size={20} />
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
                {preferences?.notify_loot_deadline ? <HugeiconsIcon icon={Notification01Icon} size={16} /> : <HugeiconsIcon icon={ViewOffIcon} size={16} />}
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
                {preferences?.notify_submission_status ? <HugeiconsIcon icon={Notification01Icon} size={16} /> : <HugeiconsIcon icon={ViewOffIcon} size={16} />}
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
                {preferences?.notify_new_raids ? <HugeiconsIcon icon={Notification01Icon} size={16} /> : <HugeiconsIcon icon={ViewOffIcon} size={16} />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile Customization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={Shield01Icon} size={20} />
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
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} className="text-success" />
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
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} className="mr-1" />
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
              <HugeiconsIcon icon={RefreshIcon} size={16} className={`mr-2 ${verifying ? 'animate-spin' : ''}`} />
              {verifying ? 'Verifying...' : 'Verify Discord Server Membership'}
            </Button>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={savePreferences}
            loading={saving}
            size="lg"
          >
            <HugeiconsIcon icon={FloppyDiskIcon} size={16} />
            Save Preferences
          </Button>
        </div>
      </main>
    </div>
  )
}
