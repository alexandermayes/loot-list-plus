'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import Navigation from '@/app/components/Navigation'

interface GuildSettings {
  id?: string
  guild_id: string
  
  // Attendance Settings
  attendance_type: 'linear' | 'breakpoint'
  rolling_attendance_weeks: number
  use_signups: boolean
  signup_weight: number
  
  // Attendance Bonuses (Breakpoint)
  max_attendance_bonus: number
  max_attendance_threshold: number
  middle_attendance_bonus: number
  middle_attendance_threshold: number
  bottom_attendance_bonus: number
  bottom_attendance_threshold: number
  
  // Bad Luck Prevention
  see_item_bonus: boolean
  see_item_bonus_value: number
  pass_item_bonus: boolean
  pass_item_bonus_value: number
  
  // Rank Modifiers
  rank_modifiers: Record<string, number>
  
  // Raid Days
  raid_days: string[]
  first_raid_week_date: string
}

const DEFAULT_RANK_MODIFIERS = {
  'Pro Yiker': 0,
  'Raid Yiker': 0,
  'Yiker': -1,
  'Alt Yiker': -4,
  'New Yiker': -1
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<GuildSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [guildId, setGuildId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [rankModifiers, setRankModifiers] = useState<Record<string, number>>(DEFAULT_RANK_MODIFIERS)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

      // Check if officer
      const { data: memberData } = await supabase
        .from('guild_members')
        .select('role, guild_id')
        .eq('user_id', user.id)
        .single()

      if (!memberData || memberData.role !== 'Officer') {
        router.push('/dashboard')
        return
      }

      setGuildId(memberData.guild_id)

      // Load settings
      const { data: settingsData } = await supabase
        .from('guild_settings')
        .select('*')
        .eq('guild_id', memberData.guild_id)
        .single()

      if (settingsData) {
        setSettings(settingsData as any)
        if (settingsData.rank_modifiers) {
          setRankModifiers(settingsData.rank_modifiers)
        }
      } else {
        // Create default settings
        const defaultSettings: GuildSettings = {
          guild_id: memberData.guild_id,
          attendance_type: 'linear',
          rolling_attendance_weeks: 4,
          use_signups: true,
          signup_weight: 0.25,
          max_attendance_bonus: 4,
          max_attendance_threshold: 0.9,
          middle_attendance_bonus: 2,
          middle_attendance_threshold: 0.5,
          bottom_attendance_bonus: 1,
          bottom_attendance_threshold: 0.25,
          see_item_bonus: true,
          see_item_bonus_value: 1,
          pass_item_bonus: false,
          pass_item_bonus_value: 0,
          rank_modifiers: DEFAULT_RANK_MODIFIERS,
          raid_days: ['Sunday', 'Monday'],
          first_raid_week_date: '2025-01-14'
        }
        setSettings(defaultSettings)
        setRankModifiers(DEFAULT_RANK_MODIFIERS)
      }

      setLoading(false)
    }

    loadData()
  }, [])

  const handleSave = async () => {
    if (!guildId || !settings) return

    setSaving(true)
    setMessage(null)

    try {
      const settingsToSave = {
        ...settings,
        rank_modifiers: rankModifiers
      }

      if (settings.id) {
        const { error } = await supabase
          .from('guild_settings')
          .update(settingsToSave)
          .eq('id', settings.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('guild_settings')
          .insert(settingsToSave)

        if (error) throw error
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' })
    }

    setSaving(false)
  }

  const updateRankModifier = (rank: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setRankModifiers(prev => ({ ...prev, [rank]: numValue }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!settings) return null

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        user={user}
        showBack
        backUrl="/admin"
        title="Guild Settings"
      />

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-success/20 border border-success text-success-foreground'
              : 'bg-error/20 border border-error text-error-foreground'
          }`}>
            {message.text}
          </div>
        )}

        {/* Attendance Settings */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Attendance Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-foreground mb-2">Attendance Type</label>
              <select
                value={settings.attendance_type}
                onChange={(e) => setSettings({ ...settings, attendance_type: e.target.value as 'linear' | 'breakpoint' })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
              >
                <option value="linear">Linear</option>
                <option value="breakpoint">Breakpoint</option>
              </select>
            </div>

            <div>
              <label className="block text-foreground mb-2">Rolling Attendance Period (weeks)</label>
              <input
                type="number"
                min="1"
                max="12"
                value={settings.rolling_attendance_weeks}
                onChange={(e) => setSettings({ ...settings, rolling_attendance_weeks: parseInt(e.target.value) || 4 })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.use_signups}
                onChange={(e) => setSettings({ ...settings, use_signups: e.target.checked })}
                className="w-5 h-5"
              />
              <label className="text-foreground">Use raid signups for attendance bonus</label>
            </div>

            {settings.use_signups && (
              <div>
                <label className="block text-foreground mb-2">Signup Weight (decimal, e.g., 0.25)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.signup_weight}
                  onChange={(e) => setSettings({ ...settings, signup_weight: parseFloat(e.target.value) || 0.25 })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                />
              </div>
            )}

            {settings.attendance_type === 'breakpoint' && (
              <div className="space-y-3 pt-4 border-t border-border">
                <h3 className="text-foreground font-medium">Attendance Bonuses</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-foreground mb-1 text-sm">Max Bonus</label>
                    <input
                      type="number"
                      value={settings.max_attendance_bonus}
                      onChange={(e) => setSettings({ ...settings, max_attendance_bonus: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-foreground mb-1 text-sm">Threshold (0.0-1.0)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={settings.max_attendance_threshold}
                      onChange={(e) => setSettings({ ...settings, max_attendance_threshold: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-foreground mb-1 text-sm">Middle Bonus</label>
                    <input
                      type="number"
                      value={settings.middle_attendance_bonus}
                      onChange={(e) => setSettings({ ...settings, middle_attendance_bonus: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-foreground mb-1 text-sm">Threshold (0.0-1.0)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={settings.middle_attendance_threshold}
                      onChange={(e) => setSettings({ ...settings, middle_attendance_threshold: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-foreground mb-1 text-sm">Bottom Bonus</label>
                    <input
                      type="number"
                      value={settings.bottom_attendance_bonus}
                      onChange={(e) => setSettings({ ...settings, bottom_attendance_bonus: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-foreground mb-1 text-sm">Threshold (0.0-1.0)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={settings.bottom_attendance_threshold}
                      onChange={(e) => setSettings({ ...settings, bottom_attendance_threshold: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bad Luck Prevention */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Bad Luck Prevention</h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.see_item_bonus}
                onChange={(e) => setSettings({ ...settings, see_item_bonus: e.target.checked })}
                className="w-5 h-5"
              />
              <label className="text-foreground">Permanent bonus for seeing item but not receiving</label>
            </div>
            {settings.see_item_bonus && (
              <div>
                <label className="block text-foreground mb-2">Bonus Value</label>
                <input
                  type="number"
                  value={settings.see_item_bonus_value}
                  onChange={(e) => setSettings({ ...settings, see_item_bonus_value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.pass_item_bonus}
                onChange={(e) => setSettings({ ...settings, pass_item_bonus: e.target.checked })}
                className="w-5 h-5"
              />
              <label className="text-foreground">Bonus for passing an item</label>
            </div>
            {settings.pass_item_bonus && (
              <div>
                <label className="block text-foreground mb-2">Bonus Value</label>
                <input
                  type="number"
                  value={settings.pass_item_bonus_value}
                  onChange={(e) => setSettings({ ...settings, pass_item_bonus_value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                />
              </div>
            )}
          </div>
        </div>

        {/* Rank Modifiers */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Rank Modifiers</h2>
          <p className="text-muted-foreground text-sm mb-4">Set bonus values for each guild rank (can be positive or negative)</p>
          
          <div className="space-y-3">
            {Object.keys(rankModifiers).map(rank => (
              <div key={rank} className="flex items-center gap-4">
                <label className="text-gray-300 w-32">{rank}</label>
                <input
                  type="number"
                  value={rankModifiers[rank]}
                  onChange={(e) => updateRankModifier(rank, e.target.value)}
                  className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Raid Days */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Raid Schedule</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-foreground mb-2">First Raid Week Date</label>
              <input
                type="date"
                value={settings.first_raid_week_date}
                onChange={(e) => setSettings({ ...settings, first_raid_week_date: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => router.push('/admin')}
            className="px-6 py-3 bg-secondary hover:bg-secondary/80 rounded-lg text-foreground font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg text-primary-foreground font-semibold transition"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </main>
    </div>
  )
}
