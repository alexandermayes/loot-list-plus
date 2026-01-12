'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

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

  // Loot List Restrictions
  enforce_slot_restrictions: boolean

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

      setGuildId(activeGuild.id)

      // Load settings
      const { data: settingsData } = await supabase
        .from('guild_settings')
        .select('*')
        .eq('guild_id', activeGuild.id)
        .single()

      if (settingsData) {
        // Ensure enforce_slot_restrictions has a default value for existing guilds
        const loadedSettings = {
          ...settingsData,
          enforce_slot_restrictions: settingsData.enforce_slot_restrictions ?? true
        }
        setSettings(loadedSettings as any)
        if (settingsData.rank_modifiers) {
          setRankModifiers(settingsData.rank_modifiers)
        }
      } else {
        // Create default settings
        const defaultSettings: GuildSettings = {
          guild_id: activeGuild.id,
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
          enforce_slot_restrictions: true,
          rank_modifiers: DEFAULT_RANK_MODIFIERS,
          raid_days: ['Sunday', 'Monday'],
          first_raid_week_date: '2025-01-14'
        }
        setSettings(defaultSettings)
        setRankModifiers(DEFAULT_RANK_MODIFIERS)
      }

      setLoading(false)
    }

    if (!guildLoading) {
      loadData()
    }
  }, [guildLoading, activeGuild, isOfficer])

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
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!settings) return null

  const adminTabs = [
    { name: 'Settings', href: '/admin/settings', icon: '⚙️' },
    { name: 'Raid Tiers', href: '/admin/raid-tiers', icon: '🏰' },
    { name: 'Manage Loot', href: '/admin/loot-items', icon: '✅' },
    { name: 'Import', href: '/admin/import', icon: '📥' },
  ]

  const pathname = usePathname()

  return (
      <div className="p-8 space-y-6 font-poppins">
        {/* Header */}
        <div>
          <h1 className="text-[42px] font-bold text-white leading-tight">Loot Master Settings</h1>
          <p className="text-[#a1a1a1] mt-1 text-[14px]">Configure your guild's loot distribution system</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-[rgba(255,255,255,0.1)] pb-2 overflow-x-auto">
          {adminTabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2 rounded-t-lg whitespace-nowrap text-[13px] font-medium transition-all ${
                pathname === tab.href
                  ? 'bg-[rgba(255,128,0,0.2)] border-[0.5px] border-[rgba(255,128,0,0.2)] text-[#ff8000]'
                  : 'text-[#a1a1a1] hover:text-white hover:bg-[#1a1a1a]'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </Link>
          ))}
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

        {/* Attendance Settings */}
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
          <h2 className="text-[24px] font-bold text-white mb-4">Attendance Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-white mb-2 text-[13px] font-medium">Attendance Type</label>
              <select
                value={settings.attendance_type}
                onChange={(e) => setSettings({ ...settings, attendance_type: e.target.value as 'linear' | 'breakpoint' })}
                className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] cursor-pointer select-custom"
              >
                <option value="linear" className="bg-[#151515] text-white">Linear</option>
                <option value="breakpoint" className="bg-[#151515] text-white">Breakpoint</option>
              </select>
            </div>

            <div>
              <label className="block text-white mb-2 text-[13px] font-medium">Rolling Attendance Period (weeks)</label>
              <input
                type="number"
                min="1"
                max="12"
                value={settings.rolling_attendance_weeks}
                onChange={(e) => setSettings({ ...settings, rolling_attendance_weeks: parseInt(e.target.value) || 4 })}
                className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000]"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.use_signups}
                onChange={(e) => setSettings({ ...settings, use_signups: e.target.checked })}
                className="w-5 h-5 rounded border-[#383838] bg-[#151515] text-[#ff8000] focus:ring-[#ff8000]"
              />
              <label className="text-white text-[13px]">Use raid signups for attendance bonus</label>
            </div>

            {settings.use_signups && (
              <div>
                <label className="block text-white mb-2 text-[13px] font-medium">Signup Weight (decimal, e.g., 0.25)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.signup_weight}
                  onChange={(e) => setSettings({ ...settings, signup_weight: parseFloat(e.target.value) || 0.25 })}
                  className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000]"
                />
              </div>
            )}

            {settings.attendance_type === 'breakpoint' && (
              <div className="space-y-3 pt-4 border-t border-[rgba(255,255,255,0.1)]">
                <h3 className="text-white font-medium text-[14px]">Attendance Bonuses</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white mb-1 text-[10px] font-medium">Max Bonus</label>
                    <input
                      type="number"
                      value={settings.max_attendance_bonus}
                      onChange={(e) => setSettings({ ...settings, max_attendance_bonus: parseFloat(e.target.value) || 0 })}
                      className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                  <div>
                    <label className="block text-white mb-1 text-[10px] font-medium">Threshold (0.0-1.0)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={settings.max_attendance_threshold}
                      onChange={(e) => setSettings({ ...settings, max_attendance_threshold: parseFloat(e.target.value) || 0 })}
                      className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white mb-1 text-[10px] font-medium">Middle Bonus</label>
                    <input
                      type="number"
                      value={settings.middle_attendance_bonus}
                      onChange={(e) => setSettings({ ...settings, middle_attendance_bonus: parseFloat(e.target.value) || 0 })}
                      className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                  <div>
                    <label className="block text-white mb-1 text-[10px] font-medium">Threshold (0.0-1.0)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={settings.middle_attendance_threshold}
                      onChange={(e) => setSettings({ ...settings, middle_attendance_threshold: parseFloat(e.target.value) || 0 })}
                      className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white mb-1 text-[10px] font-medium">Bottom Bonus</label>
                    <input
                      type="number"
                      value={settings.bottom_attendance_bonus}
                      onChange={(e) => setSettings({ ...settings, bottom_attendance_bonus: parseFloat(e.target.value) || 0 })}
                      className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                  <div>
                    <label className="block text-white mb-1 text-[10px] font-medium">Threshold (0.0-1.0)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={settings.bottom_attendance_threshold}
                      onChange={(e) => setSettings({ ...settings, bottom_attendance_threshold: parseFloat(e.target.value) || 0 })}
                      className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bad Luck Prevention */}
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
          <h2 className="text-[24px] font-bold text-white mb-4">Bad Luck Prevention</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.see_item_bonus}
                onChange={(e) => setSettings({ ...settings, see_item_bonus: e.target.checked })}
                className="w-5 h-5 rounded border-[#383838] bg-[#151515] text-[#ff8000] focus:ring-[#ff8000]"
              />
              <label className="text-white text-[13px]">Permanent bonus for seeing item but not receiving</label>
            </div>
            {settings.see_item_bonus && (
              <div>
                <label className="block text-white mb-2 text-[13px] font-medium">Bonus Value</label>
                <input
                  type="number"
                  value={settings.see_item_bonus_value}
                  onChange={(e) => setSettings({ ...settings, see_item_bonus_value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000]"
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.pass_item_bonus}
                onChange={(e) => setSettings({ ...settings, pass_item_bonus: e.target.checked })}
                className="w-5 h-5 rounded border-[#383838] bg-[#151515] text-[#ff8000] focus:ring-[#ff8000]"
              />
              <label className="text-white text-[13px]">Bonus for passing an item</label>
            </div>
            {settings.pass_item_bonus && (
              <div>
                <label className="block text-white mb-2 text-[13px] font-medium">Bonus Value</label>
                <input
                  type="number"
                  value={settings.pass_item_bonus_value}
                  onChange={(e) => setSettings({ ...settings, pass_item_bonus_value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Loot List Restrictions */}
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
          <h2 className="text-[24px] font-bold text-white mb-4">Loot List Restrictions</h2>
          <p className="text-[#a1a1a1] text-[13px] mb-4">Control what items players can select in their loot lists</p>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={settings.enforce_slot_restrictions}
                onChange={(e) => setSettings({ ...settings, enforce_slot_restrictions: e.target.checked })}
                className="w-5 h-5 mt-0.5 rounded border-[#383838] bg-[#151515] text-[#ff8000] focus:ring-[#ff8000]"
              />
              <div>
                <label className="text-white font-medium text-[13px]">Enforce Slot Restrictions</label>
                <p className="text-[#a1a1a1] text-[13px] mt-1">
                  When enabled, players can only select one item per slot type (e.g., 1 ring, 1 weapon, 1 trinket) in each loot bracket.
                  This prevents players from filling brackets with multiple items of the same slot.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rank Modifiers */}
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
          <h2 className="text-[24px] font-bold text-white mb-4">Rank Modifiers</h2>
          <p className="text-[#a1a1a1] text-[13px] mb-4">Set bonus values for each guild rank (can be positive or negative)</p>

          <div className="space-y-3">
            {Object.keys(rankModifiers).map(rank => (
              <div key={rank} className="flex items-center gap-4">
                <label className="text-white w-32 text-[13px]">{rank}</label>
                <input
                  type="number"
                  value={rankModifiers[rank]}
                  onChange={(e) => updateRankModifier(rank, e.target.value)}
                  className="flex-1 px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000]"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Raid Days */}
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
          <h2 className="text-[24px] font-bold text-white mb-4">Raid Schedule</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-white mb-2 text-[13px] font-medium">First Raid Week Date</label>
              <input
                type="date"
                value={settings.first_raid_week_date || ''}
                onChange={(e) => setSettings({ ...settings, first_raid_week_date: e.target.value })}
                className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000]"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => router.push('/admin')}
            className="px-5 py-3 bg-[#151515] hover:bg-[#1a1a1a] rounded-[40px] text-white font-medium text-[16px] transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-3 bg-white hover:bg-gray-100 disabled:opacity-50 rounded-[40px] text-black font-medium text-[16px] transition"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
  )
}
