'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useGuildContext } from '../contexts/GuildContext'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

interface SidebarProps {
  user?: any
  currentView?: string
  onViewChange?: (view: string) => void
}

export default function Sidebar({ user, currentView = 'overview', onViewChange }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { activeGuild, userGuilds, switchGuild, hasMultipleGuilds, isOfficer, activeMember } = useGuildContext()
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
    <aside className="fixed left-0 top-0 h-screen w-[208px] bg-[#0d0e11] flex flex-col gap-12 px-2.5 pt-9 pb-2.5 z-50">
      {/* Logo */}
      <div className="px-3">
        <button
          onClick={() => handleNavClick('overview')}
          className="cursor-pointer hover:opacity-80 transition"
        >
          <Image
            src="/logo.svg"
            alt="LootList+"
            width={102}
            height={16}
            className="h-4 w-auto"
            priority
          />
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 flex flex-col gap-6 min-h-0">
        {/* Guild Selector */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-[4px]">
            <div className="px-3">
              <p className="font-poppins font-medium text-[10px] text-[#a1a1a1] uppercase tracking-wide">
                CURRENT GUILD
              </p>
            </div>

            <div className="relative" ref={dropdownRef}>
            {!activeGuild ? (
              <button
                onClick={() => router.push('/guild-select/create')}
                className="w-full border-[#ff8000] border-[0.5px] rounded-[12px] px-3.5 py-2 flex items-center gap-3 hover:opacity-90 transition"
                style={{ background: 'linear-gradient(179.949deg, rgb(255, 128, 0) 0.15%, rgb(153, 77, 0) 113.91%)' }}
              >
                <Image
                  src="/icons/add-circle.svg"
                  alt="Add"
                  width={20}
                  height={20}
                  className="w-5 h-5 shrink-0 brightness-0 invert"
                />
                <div className="flex-1 text-left leading-[normal]">
                  <p className="font-poppins font-medium text-[13px] text-white">
                    Create a guild
                  </p>
                  <p className="font-poppins font-normal text-[10px] text-[rgba(255,255,255,0.7)]">
                    Start your own guild
                  </p>
                </div>
              </button>
            ) : (
              <button
                onClick={() => setGuildDropdownOpen(!guildDropdownOpen)}
                className="w-full bg-[#141519] border border-[#1a1a1a] rounded-xl px-3.5 py-2 flex items-center gap-3 hover:bg-[#1a1a1a] transition"
              >
                {activeGuild.icon_url ? (
                  <Image
                    src={activeGuild.icon_url}
                    alt="Guild icon"
                    width={20}
                    height={20}
                    className="w-5 h-5 rounded-[4px] shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 bg-[#d9d9d9] rounded-[4px] shrink-0" />
                )}
                <div className="flex-1 text-left pb-[2px] pt-0 px-0 leading-[normal] min-w-0">
                  <p className="font-poppins font-medium text-[13px] text-white w-full truncate">
                    {activeGuild.name}
                  </p>
                  <p className="font-poppins font-normal text-[10px] text-[#a1a1a1] w-full truncate">
                    {activeGuild.realm ? `${activeGuild.realm} • ${activeGuild.faction}` : ''}
                  </p>
                </div>
                <Image
                  src="/icons/arrow-down.svg"
                  alt="Toggle"
                  width={20}
                  height={20}
                  className={`w-5 h-5 shrink-0 transition-transform ${guildDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
            )}

            {/* Guild Dropdown */}
            {guildDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl shadow-lg overflow-hidden z-50">
                {hasMultipleGuilds && userGuilds.map((g) => (
                  <button
                    key={g.guild.id}
                    onClick={() => handleSwitchGuild(g.guild.id)}
                    className="w-full px-3.5 py-2 flex items-center gap-3 hover:bg-[#252525] transition text-left"
                  >
                    {g.guild.icon_url ? (
                      <Image
                        src={g.guild.icon_url}
                        alt="Guild icon"
                        width={20}
                        height={20}
                        className="w-5 h-5 rounded-[4px] shrink-0"
                      />
                    ) : (
                      <div className="w-5 h-5 bg-[#d9d9d9] rounded-[4px] shrink-0" />
                    )}
                    <div className="flex-1 pb-[2px] pt-0 px-0 leading-[normal] min-w-0">
                      <p className="font-poppins font-medium text-[13px] text-white w-full truncate">
                        {g.guild.name}
                      </p>
                      <p className="font-poppins font-normal text-[10px] text-[#a1a1a1] w-full truncate">
                        {g.guild.realm ? `${g.guild.realm} • ${g.guild.faction}` : ''}
                      </p>
                    </div>
                    {activeGuild?.id === g.guild.id && (
                      <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
                    )}
                  </button>
                ))}

                {/* Join Guild Option */}
                <button
                  onClick={() => {
                    setGuildDropdownOpen(false)
                    router.push('/guild-select')
                  }}
                  className={`w-full px-3.5 py-2 flex items-center gap-3 hover:bg-[#252525] transition text-left ${hasMultipleGuilds ? 'border-t border-[#2a2a2a]' : ''}`}
                >
                  <Image
                    src="/icons/add-circle.svg"
                    alt="Join"
                    width={20}
                    height={20}
                    className="w-5 h-5 shrink-0 brightness-0 invert"
                  />
                  <div className="flex-1">
                    <p className="font-poppins font-medium text-[13px] text-white">
                      Join another guild
                    </p>
                  </div>
                </button>

                {/* Create Guild Option */}
                <button
                  onClick={() => {
                    setGuildDropdownOpen(false)
                    router.push('/guild-select/create')
                  }}
                  className="w-full px-3.5 py-2 flex items-center gap-3 hover:bg-[#252525] transition text-left"
                >
                  <Image
                    src="/icons/add-circle.svg"
                    alt="Create"
                    width={20}
                    height={20}
                    className="w-5 h-5 shrink-0 brightness-0 invert"
                  />
                  <div className="flex-1">
                    <p className="font-poppins font-medium text-[13px] text-white">
                      Create a guild
                    </p>
                  </div>
                </button>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex flex-col gap-[8px]">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => handleNavClick(item.view)}
              disabled={!activeGuild}
              className={`w-full px-3.5 py-2.5 flex items-center gap-3 rounded-[40px] transition font-poppins font-medium text-[13px] ${
                !activeGuild
                  ? 'opacity-20 cursor-not-allowed text-white'
                  : isActive(item.view)
                  ? 'bg-[rgba(255,128,0,0.2)] border-[0.5px] border-[rgba(255,128,0,0.2)] text-[#ff8000]'
                  : 'text-white hover:bg-[#1a1a1a]'
              }`}
            >
              <Image
                src={item.icon}
                alt={item.name}
                width={20}
                height={20}
                className={`w-5 h-5 shrink-0 ${
                  activeGuild && isActive(item.view) ? 'brightness-0 saturate-100' : ''
                }`}
                style={activeGuild && isActive(item.view) ? { filter: 'invert(55%) sepia(89%) saturate(2274%) hue-rotate(1deg) brightness(101%) contrast(105%)' } : undefined}
              />
              <span>{item.name}</span>
            </button>
          ))}
        </div>

        {/* Admin Settings */}
        {adminItems.length > 0 && (
          <div className="flex flex-col gap-[8px]">
            <div className="px-3">
              <p className="font-poppins font-medium text-[10px] text-[#a1a1a1] uppercase tracking-wide">
                ADMIN SETTINGS
              </p>
            </div>
            {adminItems.map((item) => (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                className={`w-full px-3.5 py-[10px] flex items-center gap-3 rounded-[40px] transition font-poppins font-medium text-[13px] ${
                  isActive(item.view)
                    ? 'bg-[rgba(255,128,0,0.2)] border-[0.5px] border-[rgba(255,128,0,0.2)] text-[#ff8000]'
                    : 'text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <Image
                  src={item.icon}
                  alt={item.name}
                  width={20}
                  height={20}
                  className={`w-5 h-5 shrink-0 ${
                    isActive(item.view) ? 'brightness-0 saturate-100' : ''
                  }`}
                  style={isActive(item.view) ? { filter: 'invert(55%) sepia(89%) saturate(2274%) hue-rotate(1deg) brightness(101%) contrast(105%)' } : undefined}
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
          className="w-full bg-[#141519] border border-[#1a1a1a] rounded-xl px-3.5 py-2 flex items-center gap-3 hover:bg-[#1a1a1a] transition mt-2"
        >
          {user?.user_metadata?.avatar_url ? (
            <Image
              src={user.user_metadata.avatar_url.startsWith('http')
                ? user.user_metadata.avatar_url
                : `https://cdn.discordapp.com/avatars/${user.user_metadata.provider_id}/${user.user_metadata.avatar_url}.png`}
              alt="Avatar"
              width={20}
              height={20}
              className="w-5 h-5 rounded-full shrink-0 border border-[rgba(255,255,255,0.1)]"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'
              }}
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shrink-0 border border-[rgba(255,255,255,0.1)]" />
          )}
          <div className="flex-1 text-left pb-[2px] pt-0 px-0 leading-[normal] min-w-0">
            <p className="font-poppins font-medium text-[13px] text-white w-full truncate">
              {user?.user_metadata?.custom_claims?.global_name || user?.user_metadata?.full_name || activeMember?.character_name || 'User'}
            </p>
            <p className="font-poppins font-normal text-[10px] text-[#a1a1a1] w-full truncate">
              {activeMember?.role || 'Member'}
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
