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
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [modalView, setModalView] = useState<'main' | 'discord'>('main')
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [discordLoading, setDiscordLoading] = useState(false)
  const [availableGuilds, setAvailableGuilds] = useState<any[]>([])
  const [discordError, setDiscordError] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const showErrorToast = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 4000)
  }

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

  const handleJoinWithCode = async () => {
    if (!inviteCode.trim()) {
      showErrorToast('Please enter an invite code')
      return
    }

    setJoining(true)

    try {
      const response = await fetch(`/api/guild-invites/${inviteCode.trim()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        showErrorToast(data.error || 'Failed to join guild')
        setJoining(false)
        return
      }

      // Success! Redirect to dashboard
      window.location.href = '/dashboard'
    } catch (err) {
      console.error('Error joining guild:', err)
      showErrorToast('An error occurred while joining the guild')
      setJoining(false)
    }
  }

  const handleOpenDiscordModal = async () => {
    setModalView('discord')
    setDiscordLoading(true)
    setDiscordError('')
    setAvailableGuilds([])

    // Check Discord verification
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('discord_verified')
      .eq('user_id', user?.id)
      .single()

    if (!preferences?.discord_verified) {
      setDiscordError('Discord verification required')
      setDiscordLoading(false)
      return
    }

    // Fetch available guilds
    try {
      const response = await fetch('/api/discord-guilds')
      const data = await response.json()

      if (!response.ok) {
        const errorMessage = response.status === 429
          ? 'Discord rate limit reached. Please wait a moment and try again.'
          : data.error || 'Failed to load guilds'
        setDiscordError(errorMessage)
        setDiscordLoading(false)
        return
      }

      setAvailableGuilds(data.available_guilds || [])
      setDiscordLoading(false)
    } catch (err) {
      console.error('Error loading guilds:', err)
      setDiscordError('Failed to load available guilds')
      setDiscordLoading(false)
    }
  }

  const handleJoinDiscordGuild = async (guildId: string) => {
    setJoining(true)
    setDiscordError('')

    try {
      const response = await fetch('/api/discord-guilds/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ guild_id: guildId })
      })

      const data = await response.json()

      if (!response.ok) {
        setDiscordError(data.error || 'Failed to join guild')
        setJoining(false)
        return
      }

      // Success! Redirect to dashboard
      window.location.href = '/dashboard'
    } catch (err) {
      console.error('Error joining guild:', err)
      setDiscordError('An error occurred while joining the guild')
      setJoining(false)
    }
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
    <>
    {/* Toast Notification */}
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 ease-out ${
        showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <div className="bg-red-950/95 border border-red-600/50 rounded-[12px] px-[24px] py-[16px] shadow-lg backdrop-blur-sm">
        <p className="font-poppins text-[14px] text-red-200">{toastMessage}</p>
      </div>
    </div>

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
                    setShowJoinModal(true)
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
      <div className="flex flex-col gap-0 relative z-10 bg-[#0d0e11] pt-3 -mx-2.5 px-2.5 -mb-2.5 pb-2.5 border-t border-[rgba(255,255,255,0.1)]">
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

    {/* Join Guild Modal */}
    {showJoinModal && (
      <>
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => {
            setShowJoinModal(false)
            setModalView('main')
          }}
        >
          <div
            className="bg-[#0a0b0e] border border-[rgba(255,255,255,0.1)] rounded-[40px] max-w-[817px] w-full px-[60px] py-[60px] relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => {
                setShowJoinModal(false)
                setModalView('main')
              }}
              className="absolute top-6 right-6 text-white hover:opacity-80 transition z-10"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>

            {/* Back Button (only show in Discord view) */}
            {modalView === 'discord' && (
              <button
                onClick={() => setModalView('main')}
                className="absolute top-6 left-6 text-white hover:opacity-80 transition z-10 flex items-center gap-2"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}

            {/* Content */}
            {modalView === 'main' ? (
              <div className="flex flex-col gap-[40px] items-center w-full">
                {/* Header */}
                <div className="flex flex-col gap-[20px] items-center justify-center w-full text-center">
                  <h2 className="font-poppins font-bold text-[42px] leading-[43px] text-white">
                    Join a guild
                  </h2>
                  <p className="font-poppins font-normal text-[16px] leading-[normal] text-[#a1a1a1]">
                    Choose how you'd like to join.
                  </p>
                </div>

              {/* Buttons Section */}
              <div className="flex flex-col gap-[24px] items-center w-full">
                {/* Join Options */}
                <div className="flex flex-col lg:flex-row gap-[12px] items-stretch w-full">
                  {/* Join with Discord */}
                  <div className="flex-1 bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded-[40px] px-[24px] pt-[43px] pb-[24px] flex flex-col gap-[24px] items-center">
                    <div className="flex flex-col gap-[24px] items-center w-full">
                      <svg className="w-[44px] h-[44px]" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g clipPath="url(#clip0-discord)">
                          <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="white"/>
                        </g>
                        <defs>
                          <clipPath id="clip0-discord">
                            <rect width="71" height="55" fill="white"/>
                          </clipPath>
                        </defs>
                      </svg>

                      <div className="flex flex-col gap-[4px] items-center text-center w-full">
                        <p className="font-poppins font-bold text-[24px] text-white leading-[normal]">
                          Join via Discord
                        </p>
                        <p className="font-poppins font-normal text-[14px] text-[#a1a1a1] leading-[normal]">
                          If your guild has Discord linked, you're in automatically.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleOpenDiscordModal}
                      className="bg-[#5865f2] border border-[#383838] rounded-[52px] px-[20px] py-[12px] flex gap-[12px] items-center justify-center w-full hover:opacity-90 transition"
                    >
                      <svg className="w-[24px] h-[24px]" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g clipPath="url(#clip0-discord-btn)">
                          <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="white"/>
                        </g>
                        <defs>
                          <clipPath id="clip0-discord-btn">
                            <rect width="71" height="55" fill="white"/>
                          </clipPath>
                        </defs>
                      </svg>
                      <span className="font-poppins font-medium text-[16px] text-white leading-[normal]">
                        Join with Discord
                      </span>
                    </button>
                  </div>

                  {/* Join with Code */}
                  <div className="flex-1 bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded-[40px] px-[24px] pt-[43px] pb-[24px] flex flex-col gap-[24px] items-center justify-end">
                    <div className="flex flex-col gap-[24px] items-center w-full">
                      <svg className="w-[44px] h-[44px]" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M24.5817 30.5574C24.5817 30.5574 25.7275 30.5574 26.8733 33.0018C26.8733 33.0018 30.513 26.8907 33.7483 25.6685" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M31.0629 12.8351H31.0794" stroke="white" strokeWidth="3.33333" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21.8962 12.8351H21.9127" stroke="white" strokeWidth="3.33333" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12.7295 12.8351H12.746" stroke="white" strokeWidth="3.33333" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14.4685 21.9413H9.18212C6.136 21.9413 3.66663 19.479 3.66663 16.4414V9.16309C3.66663 6.12551 6.136 3.66309 9.18212 3.66309H34.8179C37.864 3.66309 40.3333 6.12551 40.3333 9.16309V16.7364" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M40.3326 29.3352C40.3326 23.2601 35.3937 18.3352 29.3016 18.3352C23.2094 18.3352 18.2706 23.2601 18.2706 29.3352C18.2706 35.4103 23.2094 40.3352 29.3016 40.3352C35.3937 40.3352 40.3326 35.4103 40.3326 29.3352Z" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>

                      <div className="flex flex-col gap-[4px] items-center text-center w-full">
                        <p className="font-poppins font-bold text-[24px] text-white leading-[normal]">
                          Join with Code
                        </p>
                        <p className="font-poppins font-normal text-[14px] text-[#a1a1a1] leading-[normal]">
                          Paste the code from your guild officer.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-[10px] items-stretch w-full">
                      <input
                        type="text"
                        placeholder="ABC123DEF456"
                        value={inviteCode}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase()
                          setInviteCode(value.slice(0, 12))
                        }}
                        disabled={joining}
                        className="flex-1 bg-[#151515] border border-[#383838] rounded-[52px] px-[20px] py-[12px] font-poppins font-medium text-[16px] text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#ff8000] transition uppercase leading-[normal]"
                        maxLength={12}
                      />
                      <button
                        onClick={handleJoinWithCode}
                        disabled={!inviteCode.trim() || joining}
                        className="bg-white border border-[#383838] rounded-[52px] px-[20px] py-[12px] font-poppins font-medium text-[16px] text-black hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed leading-[normal] w-[100px] shrink-0"
                      >
                        {joining ? 'Joining...' : 'Join'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Need Help Section */}
                <div className="flex flex-col gap-[10px] items-center px-[24px] w-full">
                  <div className="flex gap-[10px] items-center justify-center w-full">
                    <svg className="w-[20px] h-[20px]" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 18.3334C14.6024 18.3334 18.3333 14.6024 18.3333 10C18.3333 5.39765 14.6024 1.66669 10 1.66669C5.39763 1.66669 1.66667 5.39765 1.66667 10C1.66667 14.6024 5.39763 18.3334 10 18.3334Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7.57501 7.50002C7.77093 6.94308 8.15768 6.47344 8.66658 6.17427C9.17548 5.8751 9.77403 5.76579 10.3559 5.86561C10.9378 5.96543 11.4656 6.26792 11.8458 6.71963C12.2261 7.17134 12.4342 7.74297 12.4333 8.33335C12.4333 10 9.93334 10.8334 9.93334 10.8334" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 14.1667H10.0083" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p className="font-poppins font-bold text-[18px] text-white leading-[normal]">
                      Need Help?
                    </p>
                  </div>
                  <p className="font-poppins font-normal text-[14px] text-[#a1a1a1] text-center w-full leading-[normal]">
                    Ask your guild officer for an invite code or Discord link.<br />
                    Setting up a new guild? You'll become the first officer.
                  </p>
                </div>
              </div>
              </div>
            ) : (
              /* Discord View */
              <div className="flex flex-col gap-[20px] items-center w-full">
                {/* Header */}
                <div className="flex flex-col gap-[10px] items-center justify-center w-full text-center">
                  <h2 className="font-poppins font-bold text-[42px] leading-[43px] text-white">
                    Join via Discord
                  </h2>
                  <p className="font-poppins font-normal text-[16px] leading-[normal] text-[#a1a1a1]">
                    Automatically join guilds based on your Discord server memberships
                  </p>
                </div>

                {/* Content */}
                <div className="w-full">
                  {discordLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                      <p className="font-poppins text-[14px] text-[#a1a1a1] mt-4">Loading available guilds...</p>
                    </div>
                  ) : discordError ? (
                    <div className="flex flex-col gap-4 px-[20px] py-[16px] rounded-[12px] bg-red-950/50 border border-red-600/50">
                      <p className="font-poppins text-[14px] text-red-200">{discordError}</p>
                      {discordError === 'Discord verification required' && (
                        <button
                          onClick={() => {
                            setShowJoinModal(false)
                            setModalView('main')
                            router.push('/profile')
                          }}
                          className="bg-white border border-[#383838] rounded-[52px] px-[20px] py-[12px] font-poppins font-medium text-[14px] text-black hover:bg-gray-100 transition"
                        >
                          Go to Profile to Verify Discord
                        </button>
                      )}
                    </div>
                  ) : availableGuilds.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="font-poppins font-bold text-[18px] text-white mb-2">No Available Guilds</p>
                      <p className="font-poppins text-[14px] text-[#a1a1a1] mb-4">
                        We couldn't find any LootList+ guilds that match your Discord servers.
                      </p>
                      <div className="bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] rounded-[12px] px-[20px] py-[16px] text-left space-y-2">
                        <p className="font-poppins text-[14px] text-white font-medium">Possible reasons:</p>
                        <ul className="font-poppins text-[13px] text-[#a1a1a1] space-y-1 list-disc list-inside">
                          <li>You're not in any Discord servers with LootList+ integration</li>
                          <li>You're already a member of all matching guilds</li>
                          <li>Your guild officer hasn't set up Discord integration yet</li>
                        </ul>
                        <p className="font-poppins text-[13px] text-[#a1a1a1] mt-3">
                          Try using an invite code instead, or ask your guild officer to set up Discord integration.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="font-poppins font-bold text-[18px] text-white">Available Guilds</h3>
                      <div className="space-y-3">
                        {availableGuilds.map((guild) => (
                          <div
                            key={guild.id}
                            className="bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] rounded-[16px] px-[20px] py-[16px] hover:border-[rgba(255,255,255,0.2)] transition"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1">
                                {guild.discord_icon && (
                                  <img
                                    src={`https://cdn.discordapp.com/icons/${guild.discord_server_id}/${guild.discord_icon}.png`}
                                    alt={guild.discord_name || guild.name}
                                    className="w-12 h-12 rounded-full"
                                  />
                                )}
                                <div className="flex-1">
                                  <h4 className="font-poppins font-bold text-[16px] text-white">{guild.name}</h4>
                                  {guild.discord_name && guild.discord_name !== guild.name && (
                                    <p className="font-poppins text-[12px] text-[#a1a1a1]">Discord: {guild.discord_name}</p>
                                  )}
                                  <div className="flex gap-3 text-[12px] text-[#a1a1a1] mt-1">
                                    {guild.realm && <span>Realm: {guild.realm}</span>}
                                    <span>Faction: {guild.faction}</span>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleJoinDiscordGuild(guild.id)}
                                disabled={joining}
                                className="bg-white border border-[#383838] rounded-[52px] px-[20px] py-[10px] font-poppins font-medium text-[14px] text-black hover:bg-gray-100 h-auto disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {joining ? 'Joining...' : 'Join'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Info */}
                <div className="flex items-start gap-2 px-[20px] py-[16px] rounded-[12px] bg-[#0d0e11]/50 border border-[rgba(255,255,255,0.1)] w-full">
                  <svg className="w-5 h-5 text-[#a1a1a1] shrink-0 mt-0.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="10" cy="10" r="9" />
                    <path d="M10 6v4M10 14h.01" strokeLinecap="round" />
                  </svg>
                  <p className="font-poppins text-[12px] text-[#a1a1a1]">
                    We check which Discord servers you're a member of and match them with LootList+ guilds that have Discord integration enabled.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    )}
  </>
  )
}
