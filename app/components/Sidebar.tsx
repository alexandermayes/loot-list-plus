'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useGuildContext } from '../contexts/GuildContext'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

interface SidebarProps {
  user: any
  currentView?: string
  onViewChange?: (view: string) => void
}

export default function Sidebar({ user, currentView = 'overview', onViewChange }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { activeGuild, userGuilds, switchGuild, hasMultipleGuilds, isOfficer } = useGuildContext()
  const [guildDropdownOpen, setGuildDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setGuildDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleSwitchGuild = async (guildId: string) => {
    setGuildDropdownOpen(false)
    await switchGuild(guildId)
    router.refresh()
  }

  const handleNavClick = (view: string) => {
    if (!activeGuild) return

    if (onViewChange) {
      // Dashboard mode - use callback
      onViewChange(view)
    } else {
      // Standalone page mode - use router
      const routeMap: Record<string, string> = {
        'overview': '/dashboard',
        'master-sheet': '/master-sheet',
        'loot-list': '/loot-list',
        'attendance': '/attendance',
        'guild-settings': '/admin/guild-settings',
        'master-loot': '/admin',
        'raid-tracking': '/admin/raid-tracking',
      }
      router.push(routeMap[view] || '/dashboard')
    }
  }

  const navItems = [
    { name: 'Overview', view: 'overview', icon: '/icons/dashboard.svg' },
    { name: 'Master Sheet', view: 'master-sheet', icon: '/icons/master-sheet.svg' },
    { name: 'Loot Lists', view: 'loot-list', icon: '/icons/loot-lists.svg' },
    { name: 'Attendance', view: 'attendance', icon: '/icons/attendance.svg' },
  ]

  const adminItems = isOfficer ? [
    { name: 'Guild Settings', view: 'guild-settings', icon: '/icons/guild-settings.svg' },
    { name: 'Master Loot', view: 'master-loot', icon: '/icons/master-loot.svg' },
    { name: 'Raid Tracking', view: 'raid-tracking', icon: '/icons/raid-tracking.svg' },
  ] : []

  const isActive = (view: string) => currentView === view

  const currentMembership = userGuilds.find(g => g.guild.id === activeGuild?.id)

  return (
    <aside className="fixed left-0 top-0 h-screen w-[208px] bg-[#151515] flex flex-col gap-12 px-2.5 pt-9 pb-2.5 z-50">
      {/* Logo */}
      <div className="px-3">
        <Image
          src="/logo.svg"
          alt="LootList+"
          width={102}
          height={16}
          className="h-4 w-auto"
          priority
        />
      </div>

      {/* Main Navigation */}
      <div className="flex-1 flex flex-col gap-6 min-h-0">
        {/* Guild Selector */}
        <div className="flex flex-col gap-3">
          <div className="px-3">
            <p className="font-poppins font-medium text-[10px] text-[#a1a1a1] uppercase tracking-wide">
              CURRENT GUILD
            </p>
          </div>

          <div className="relative" ref={dropdownRef}>
            {!activeGuild ? (
              <button
                onClick={() => router.push('/guild-select')}
                className="w-full bg-white border border-[#1a1a1a] rounded-xl px-3.5 py-2 flex items-center gap-3 hover:bg-gray-100 transition"
              >
                <Image
                  src="/icons/add-circle.svg"
                  alt="Add"
                  width={20}
                  height={20}
                  className="w-5 h-5 shrink-0"
                />
                <div className="flex-1 text-left">
                  <p className="font-poppins font-medium text-[13px] text-black leading-tight">
                    Create a guild
                  </p>
                  <p className="font-poppins font-normal text-[8px] text-[#636363] leading-tight">
                    Start your own guild
                  </p>
                </div>
              </button>
            ) : (
              <button
                onClick={() => hasMultipleGuilds && setGuildDropdownOpen(!guildDropdownOpen)}
                className="w-full bg-black border border-[#1a1a1a] rounded-xl px-3.5 py-2 flex items-center gap-3 hover:bg-[#0a0a0a] transition"
              >
                <div className="w-5 h-5 bg-[#d9d9d9] rounded-[4px] shrink-0" />
                <div className="flex-1 text-left">
                  <p className="font-poppins font-medium text-[13px] text-white leading-tight">
                    {activeGuild.name}
                  </p>
                  <p className="font-poppins font-normal text-[8px] text-[#a1a1a1] leading-tight">
                    {activeGuild.realm ? `${activeGuild.realm} • ${activeGuild.faction}` : ''}
                  </p>
                </div>
                {hasMultipleGuilds && (
                  <Image
                    src="/icons/arrow-down.svg"
                    alt="Toggle"
                    width={20}
                    height={20}
                    className="w-5 h-5 shrink-0"
                  />
                )}
              </button>
            )}

            {/* Guild Dropdown */}
            {guildDropdownOpen && hasMultipleGuilds && (
              <div className="absolute top-full mt-2 left-0 w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl shadow-lg overflow-hidden z-50">
                {userGuilds.map((g) => (
                  <button
                    key={g.guild.id}
                    onClick={() => handleSwitchGuild(g.guild.id)}
                    className="w-full px-3.5 py-2 flex items-center gap-3 hover:bg-[#252525] transition text-left"
                  >
                    <div className="w-5 h-5 bg-[#d9d9d9] rounded-[4px] shrink-0" />
                    <div className="flex-1">
                      <p className="font-poppins font-medium text-[13px] text-white leading-tight">
                        {g.guild.name}
                      </p>
                      <p className="font-poppins font-normal text-[8px] text-[#a1a1a1] leading-tight">
                        {g.guild.realm ? `${g.guild.realm} • ${g.guild.faction}` : ''}
                      </p>
                    </div>
                    {activeGuild?.id === g.guild.id && (
                      <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex flex-col gap-3">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => handleNavClick(item.view)}
              disabled={!activeGuild}
              className={`w-full px-3.5 py-2 flex items-center gap-3 rounded-[40px] transition font-poppins font-medium text-[13px] ${
                !activeGuild
                  ? 'opacity-20 cursor-not-allowed text-white'
                  : isActive(item.view)
                  ? 'bg-[#131313] border border-[rgba(255,255,255,0.05)] text-white'
                  : 'text-white hover:bg-[#1a1a1a]'
              }`}
            >
              <Image
                src={item.icon}
                alt={item.name}
                width={20}
                height={20}
                className="w-5 h-5 shrink-0"
              />
              <span>{item.name}</span>
            </button>
          ))}
        </div>

        {/* Admin Settings */}
        {adminItems.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="px-3">
              <p className="font-poppins font-medium text-[10px] text-[#a1a1a1] uppercase tracking-wide">
                ADMIN SETTINGS
              </p>
            </div>
            {adminItems.map((item) => (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                className={`w-full px-3.5 py-2 flex items-center gap-3 rounded-[40px] transition font-poppins font-medium text-[13px] ${
                  isActive(item.view)
                    ? 'bg-[#131313] border border-[rgba(255,255,255,0.05)] text-white'
                    : 'text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <Image
                  src={item.icon}
                  alt={item.name}
                  width={20}
                  height={20}
                  className="w-5 h-5 shrink-0"
                />
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-0">
        <button className="w-full px-3.5 py-2 flex items-center gap-3 rounded-[40px] hover:bg-[#1a1a1a] transition font-poppins font-medium text-[13px] text-white">
          <Image
            src="/icons/help.svg"
            alt="Help"
            width={20}
            height={20}
            className="w-5 h-5"
          />
          <span>Help</span>
        </button>

        <button className="w-full px-3.5 py-2 flex items-center gap-3 rounded-[40px] hover:bg-[#1a1a1a] transition font-poppins font-medium text-[13px] text-white">
          <Image
            src="/icons/moon.svg"
            alt="Dark mode"
            width={20}
            height={20}
            className="w-5 h-5"
          />
          <span>Dark mode</span>
        </button>

        {/* User Profile Card */}
        <button
          onClick={() => router.push('/profile')}
          className="w-full bg-[#1e1e1e] border border-[#1a1a1a] rounded-xl px-3.5 py-2 flex items-center gap-3 hover:bg-[#252525] transition mt-2"
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shrink-0" />
          <div className="flex-1 text-left">
            <p className="font-poppins font-medium text-[13px] text-white leading-tight">
              {user?.user_metadata?.custom_claims?.global_name || user?.user_metadata?.full_name || currentMembership?.character_name || 'User'}
            </p>
            <p className="font-poppins font-normal text-[8px] text-[#a1a1a1] leading-tight">
              {currentMembership?.role || 'Member'}
            </p>
          </div>
          <Image
            src="/icons/settings-user.svg"
            alt="Settings"
            width={20}
            height={20}
            className="w-5 h-5 shrink-0"
          />
        </button>
      </div>
    </aside>
  )
}
