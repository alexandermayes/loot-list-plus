'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useGuildContext } from '../contexts/GuildContext'
import Image from 'next/image'
import { useState, useRef, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/utils/supabase/client'
import { CharacterSelector } from './CharacterSelector'
import { useSidebar } from '../contexts/SidebarContext'
import { Modal, ModalHeader, ModalBody } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, Settings01Icon, Notification03Icon } from '@hugeicons/core-free-icons'
import { usePendingSubmissionCount } from '../hooks/usePendingSubmissionCount'
import { trackClientEvent } from '@/utils/analytics/client'
import { hasFeature } from '@/domain/guild/feature-flags'

// Lazy load modal to reduce initial bundle size
const CreateGuildModal = dynamic(() => import('./CreateGuildModal').then(mod => ({ default: mod.CreateGuildModal })), {
  loading: () => null
})

interface SidebarProps {
  currentView?: string
  onViewChange?: (view: string) => void
  isMobileOverlay?: boolean
  onNavigate?: () => void
}

const MOBILE_SIDEBAR_WIDTH = 280

export default function Sidebar({ currentView = 'overview', onViewChange, isMobileOverlay = false, onNavigate }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, activeGuild, userGuilds, switchGuild, hasMultipleGuilds, isOfficer, activeMember, loading } = useGuildContext()
  const { sidebarWidth, setSidebarWidth, isResizing, setIsResizing, minWidth, maxWidth } = useSidebar()
  const { count: pendingSubmissionCount } = usePendingSubmissionCount(activeGuild?.id ?? null, isOfficer)
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
  const [showCreateGuildModal, setShowCreateGuildModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const supabase = createClient()

  // Handle resize drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [setIsResizing])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = e.clientX
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, setSidebarWidth, setIsResizing])

  const showErrorToast = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 4000)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node

      // Ignore events that don't have a valid target or target is not in the document
      // This prevents closing when mouse leaves the window boundary
      if (!target || !document.body.contains(target)) {
        return
      }

      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setGuildDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (showJoinModal || showCreateGuildModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showJoinModal, showCreateGuildModal])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const handleSwitchGuild = async (guildId: string) => {
    setGuildDropdownOpen(false)
    trackClientEvent('guild_switched', { guild_id: guildId })
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
        showErrorToast(data.error || 'Couldn\'t join guild. Check the invite code and try again.')
        setJoining(false)
        return
      }

      // Success! Redirect to dashboard
      window.location.href = '/overview'
    } catch (err) {
      console.error('Error joining guild:', err)
      showErrorToast('Couldn\'t join guild. Check your connection and try again.')
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

    // If not verified but user logged in with Discord, auto-verify them
    if (!preferences?.discord_verified) {
      try {
        const verifyResponse = await fetch('/api/verify-discord', {
          method: 'POST'
        })

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json()
          setDiscordError(errorData.error || 'Discord verification required. Go to your profile to verify your Discord account.')
          setDiscordLoading(false)
          return
        }

      } catch (err) {
        console.error('Auto-verification failed:', err)
        setDiscordError('Discord verification required. Go to your profile to verify your Discord account.')
        setDiscordLoading(false)
        return
      }
    }

    // Fetch available guilds
    try {
      const response = await fetch('/api/discord-guilds')
      const data = await response.json()

      if (!response.ok) {
        const errorMessage = response.status === 429
          ? 'Discord rate limit reached. Please wait a moment and try again.'
          : data.error || 'Couldn\'t load guilds. Check your connection and try again.'
        setDiscordError(errorMessage)
        setDiscordLoading(false)
        return
      }

      setAvailableGuilds(data.available_guilds || [])
      setDiscordLoading(false)
    } catch (err) {
      console.error('Error loading guilds:', err)
      setDiscordError('Couldn\'t load available guilds. Check your connection and try again.')
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
        setDiscordError(data.error || 'Couldn\'t join guild. Try again.')
        setJoining(false)
        return
      }

      // Success! Redirect to dashboard
      window.location.href = '/overview'
    } catch (err) {
      console.error('Error joining guild:', err)
      setDiscordError('Couldn\'t join guild. Check your connection and try again.')
      setJoining(false)
    }
  }

  const handleNavClick = (view: string) => {
    // If no active guild, clicking logo should go to dashboard (shows WelcomeScreen)
    if (!activeGuild) {
      if (view === 'overview') {
        router.push('/overview')
        onNavigate?.()
      }
      return
    }

    if (onViewChange) {
      // Dashboard mode - use callback
      onViewChange(view)
    } else {
      // Standalone page mode - use router
      const routeMap: Record<string, string> = {
        'overview': '/overview',
        'master-sheet': '/master-sheet',
        'loot-list': '/loot-list',
        'attendance': '/attendance',
        'guild-settings': '/guild-settings',
        'loot-submissions': '/loot-submissions',
        'loot-settings': '/loot-settings',
        'raid-tracking': '/raid-tracking',
        'raid-teams': '/raid-teams',
        'audit-log': '/audit-log',
        'reserve': '/reserve',
      }
      router.push(routeMap[view] || '/overview')
    }

    // Close mobile menu after navigation
    onNavigate?.()
  }

  const navItems = [
    { name: 'Overview', view: 'overview', icon: '/icons/dashboard.svg' },
    { name: 'Master Sheet', view: 'master-sheet', icon: '/icons/master-sheet.svg' },
    { name: 'Loot Lists', view: 'loot-list', icon: '/icons/loot-lists.svg' },
    { name: 'Attendance', view: 'attendance', icon: '/icons/attendance.svg' },
    { name: 'Reserve', view: 'reserve', icon: '/icons/reserve.svg' },
  ]

  const adminItems = isOfficer ? [
    { name: 'Raid Tracking', view: 'raid-tracking', icon: '/icons/raid-tracking.svg' },
    { name: 'Loot Submissions', view: 'loot-submissions', icon: '/icons/master-loot.svg' },
    { name: 'Loot Management', view: 'loot-settings', icon: '/icons/guild-settings.svg' },
    ...(hasFeature(activeGuild, 'raid_teams') ? [{ name: 'Raid Teams', view: 'raid-teams', icon: '/icons/user-multiple.svg' }] : []),
    ...(hasFeature(activeGuild, 'audit_log') ? [{ name: 'Audit Log', view: 'audit-log', icon: '/icons/monitor.svg' }] : []),
  ] : []

  const isActive = (view: string) => {
    // Check currentView prop first (for dashboard mode)
    if (currentView === view) return true

    // Also check pathname for standalone page mode
    const routeMap: Record<string, string> = {
      'overview': '/overview',
      'master-sheet': '/master-sheet',
      'loot-list': '/loot-list',
      'attendance': '/attendance',
      'guild-settings': '/guild-settings',
      'loot-submissions': '/loot-submissions',
      'loot-settings': '/loot-settings',
      'raid-tracking': '/raid-tracking',
      'raid-teams': '/raid-teams',
      'audit-log': '/audit-log',
      'reserve': '/reserve',
    }
    return pathname === routeMap[view] || (view === 'reserve' && pathname.startsWith('/reserve'))
  }

  const currentMembership = userGuilds.find(g => g.guild.id === activeGuild?.id)

  return (
    <>
    {/* Toast Notification */}
    <div
      className={`fixed top-[env(safe-area-inset-top,16px)] left-1/2 -translate-x-1/2 z-[200] transition-[opacity,transform] duration-300 ease-out mt-4 ${
        showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <div className="bg-destructive/95 border border-destructive/50 rounded-[12px] px-[24px] py-[16px] shadow-lg backdrop-blur-sm">
        <p className="font-poppins text-[14px] text-destructive-foreground">{toastMessage}</p>
      </div>
    </div>

    <aside
      ref={sidebarRef}
      className={`fixed left-0 top-0 h-screen bg-background-subtle flex flex-col px-0 pb-0 ${
        isMobileOverlay
          ? 'z-50 animate-in slide-in-from-left duration-200'
          : `z-50 ${isResizing ? '' : 'transition-[width] duration-150'}`
      }`}
      style={{ width: isMobileOverlay ? MOBILE_SIDEBAR_WIDTH : sidebarWidth }}
    >
      {/* Resize Handle - hidden on mobile */}
      {!isMobileOverlay && (
        <div
          onMouseDown={handleMouseDown}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-30 group"
        >
          {/* Visible line */}
          <div className={`absolute right-0 top-0 bottom-0 w-px transition-colors ${isResizing ? 'bg-primary' : 'bg-border group-hover:bg-foreground/30'}`} />
          {/* Wider hit area */}
          <div className="absolute right-[-2px] top-0 bottom-0 w-[5px]" />
        </div>
      )}
      {/* Logo with scroll fade gradient - positioned to overlay scroll content */}
      <div
        className={`absolute top-0 left-0 right-0 flex flex-col items-start justify-center z-10 pointer-events-none ${
          isMobileOverlay ? 'px-4 py-[10px]' : 'px-[10px] py-[36px]'
        }`}
        style={{
          background: 'linear-gradient(to bottom, hsl(var(--background-subtle)) 69.886%, hsl(var(--background-subtle) / 0) 100%)',
          width: isMobileOverlay ? MOBILE_SIDEBAR_WIDTH : sidebarWidth,
        }}
      >
        {/* Close button for mobile overlay - matches hamburger button position */}
        {isMobileOverlay ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onNavigate}
            className="w-10 h-10 pointer-events-auto"
            aria-label="Close menu"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={24} className="text-foreground" />
          </Button>
        ) : (
          <div className="px-[12px] pointer-events-auto">
            <Button
              variant="ghost"
              onClick={() => handleNavClick('overview')}
              className="cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2 p-0 h-auto"
            >
              <Image
                src="/logo.svg"
                alt="LootList+"
                width={102}
                height={16}
                className="logo-adaptive h-4 w-auto"
                priority
              />
              <span className="text-[10px] font-semibold text-accent bg-accent/15 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                Beta
              </span>
            </Button>
          </div>
        )}
      </div>

      {/* Main Navigation - Scrollable (extends to bottom) */}
      <div className={`flex-1 flex flex-col gap-6 min-h-0 overflow-y-auto sidebar-scrollable px-2.5 ${
        isMobileOverlay ? 'pt-[60px] pb-6' : 'pt-[88px] pb-[220px]'
      }`}>
        {/* Guild Selector */}
        <div className="flex flex-col gap-[4px]">
          <div className="px-3">
            <p className="font-poppins font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
              GUILD
            </p>
          </div>

          <div className="relative" ref={dropdownRef}>
          {loading ? (
            /* Loading skeleton for guild selector */
            <div className="w-full bg-background-elevated border border-border rounded-[12px] px-[14px] py-2 flex items-center gap-3 animate-pulse">
              <div className="w-5 h-5 rounded-[4px] bg-border-strong shrink-0 border border-border" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="h-3 bg-border-strong rounded w-24" />
                <div className="h-2 bg-border-strong rounded w-16" />
              </div>
            </div>
          ) : !activeGuild ? (
            <Button
              variant="ghost"
              onClick={() => setShowCreateGuildModal(true)}
              className="w-full border-accent border-[0.5px] rounded-[12px] px-[14px] py-2 h-auto flex items-center gap-3 hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(179.949deg, rgb(255, 128, 0) 0.15%, rgb(153, 77, 0) 113.91%)' }}
            >
              <Image
                src="/icons/add-circle.svg"
                alt="Add"
                width={20}
                height={20}
                className="icon-adaptive w-5 h-5 shrink-0 brightness-0 invert"
              />
              <div className="flex-1 text-left leading-[normal]">
                <p className="font-poppins font-medium text-[13px] text-foreground">
                  Create a guild
                </p>
                <p className="font-poppins font-normal text-[10px] text-foreground/70">
                  Start your own guild
                </p>
              </div>
            </Button>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setGuildDropdownOpen(!guildDropdownOpen)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setGuildDropdownOpen(!guildDropdownOpen) }}
              className="w-full bg-background-elevated border border-muted rounded-xl px-3.5 py-2 flex items-center gap-3 hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {activeGuild.icon_url ? (
                <Image
                  src={activeGuild.icon_url}
                  alt="Guild icon"
                  width={20}
                  height={20}
                  className="w-5 h-5 rounded-[4px] shrink-0 border border-border"
                />
              ) : (
                <div className="w-5 h-5 bg-muted-foreground rounded-[4px] shrink-0 border border-border" />
              )}
              <div className="flex-1 text-left leading-[normal] min-w-0">
                <p className="font-poppins font-medium text-[13px] text-foreground w-full truncate">
                  {activeGuild.name}
                </p>
                <p className="font-poppins font-normal text-[10px] text-muted-foreground w-full truncate">
                  {activeGuild.realm ? `${activeGuild.realm} • ${activeGuild.faction}` : ''}
                </p>
              </div>
              {isOfficer && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNavClick('guild-settings')
                  }}
                  className="h-auto w-auto p-[13px] !rounded-md hover:bg-background-subtle shrink-0"
                  title="Guild Settings"
                  aria-label="Guild settings"
                >
                  <HugeiconsIcon icon={Settings01Icon} size={18} className="text-muted-foreground" />
                </Button>
              )}
              <Image
                src="/icons/arrow-down.svg"
                alt="Toggle"
                width={20}
                height={20}
                className={`icon-adaptive w-5 h-5 shrink-0 transition-transform duration-150 ${guildDropdownOpen ? 'rotate-180' : ''}`}
              />
            </div>
          )}

          {/* Guild Dropdown */}
          {guildDropdownOpen && (
            <div className="absolute top-full mt-2 left-0 w-full bg-background-elevated border border-border rounded-[12px] shadow-lg overflow-hidden overflow-y-auto max-h-[60vh] z-50 py-2">
              {/* Guilds Section */}
              <div className="px-3 pt-2 pb-1">
                <p className="font-poppins font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                  GUILDS
                </p>
              </div>
              {userGuilds.map((g) => {
                const isSelected = g.guild.id === activeGuild?.id
                const isGuildOfficer = g.member.role === 'Officer' || g.member.role === 'Guild Master'
                return (
                  <div key={g.guild.id} className="flex items-center hover:bg-muted transition-colors">
                    <Button
                      variant="ghost"
                      onClick={() => handleSwitchGuild(g.guild.id)}
                      className="flex-1 min-w-0 px-[14px] py-2 h-auto flex items-center gap-3 text-left !rounded-none hover:bg-transparent"
                    >
                      {g.guild.icon_url ? (
                        <Image
                          src={g.guild.icon_url}
                          alt="Guild icon"
                          width={20}
                          height={20}
                          className="w-5 h-5 rounded-[4px] shrink-0 border border-border"
                        />
                      ) : (
                        <div className="w-5 h-5 bg-muted-foreground rounded-[4px] shrink-0 border border-border" />
                      )}
                      <div className="flex-1 leading-[normal] min-w-0">
                        <p className="font-poppins font-medium text-[13px] text-foreground truncate">
                          {g.guild.name}
                        </p>
                        <p className="font-poppins font-normal text-[10px] text-muted-foreground truncate">
                          {g.guild.realm ? `${g.guild.realm} • ${g.guild.faction}` : ''}
                        </p>
                      </div>
                      {isSelected && (
                        <Image
                          src="/icons/tick.svg"
                          alt="Selected"
                          width={16}
                          height={16}
                          className="icon-adaptive w-4 h-4 shrink-0"
                        />
                      )}
                    </Button>
                    {isGuildOfficer && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Switch to this guild first if not active, then navigate to settings
                          if (g.guild.id !== activeGuild?.id) {
                            handleSwitchGuild(g.guild.id)
                          }
                          setGuildDropdownOpen(false)
                          handleNavClick('guild-settings')
                        }}
                        className="p-2 mr-2 rounded-lg hover:bg-background-elevated transition-colors"
                        title="Guild Settings"
                        aria-label="Guild settings"
                      >
                        <HugeiconsIcon icon={Settings01Icon} size={16} className="text-muted-foreground hover:text-foreground" />
                      </Button>
                    )}
                  </div>
                )
              })}

              {/* Divider */}
              <div className="h-px bg-border my-1" />

              {/* Join Guild Option */}
              <Button
                variant="ghost"
                onClick={() => {
                  setGuildDropdownOpen(false)
                  setShowJoinModal(true)
                  setModalView('main')
                  setInviteCode('')
                  setDiscordError('')
                }}
                className="w-full px-[14px] py-2 h-auto flex items-center gap-3 hover:!bg-muted text-left justify-start !rounded-none"
              >
                <Image
                  src="/icons/user-multiple.svg"
                  alt="Join"
                  width={20}
                  height={20}
                  className="icon-adaptive w-5 h-5 shrink-0"
                />
                <p className="font-poppins font-medium text-[13px] text-foreground">
                  Join a guild
                </p>
              </Button>

              {/* Create Guild Option */}
              <Button
                variant="ghost"
                onClick={() => {
                  setGuildDropdownOpen(false)
                  setShowCreateGuildModal(true)
                }}
                className="w-full px-[14px] py-2 h-auto flex items-center gap-3 hover:!bg-muted text-left justify-start !rounded-none"
              >
                <Image
                  src="/icons/add-circle.svg"
                  alt="Create"
                  width={20}
                  height={20}
                  className="icon-adaptive w-5 h-5 shrink-0"
                />
                <p className="font-poppins font-medium text-[13px] text-foreground">
                  Create a guild
                </p>
              </Button>
            </div>
          )}
          </div>
        </div>

        {/* Character Selector */}
        {(loading || activeGuild) && (
          <div className="flex flex-col gap-[4px]">
            <div className="px-3">
              <p className="font-poppins font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                CHARACTER
              </p>
            </div>
            {loading ? (
              /* Loading skeleton for character selector */
              <div className="w-full px-[14px] py-2 bg-background-elevated border border-border rounded-[12px] flex items-center gap-3 animate-pulse">
                <div className="w-5 h-5 rounded-full bg-border-strong flex-shrink-0 border border-border" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="h-3 bg-border-strong rounded w-24" />
                  <div className="h-2 bg-border-strong rounded w-16" />
                </div>
              </div>
            ) : (
              <CharacterSelector />
            )}
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex flex-col gap-[8px]">
          {navItems.map((item) => (
            <Button
              key={item.view}
              variant="ghost"
              onClick={() => handleNavClick(item.view)}
              disabled={!activeGuild}
              className={`w-full px-3.5 py-2.5 h-auto flex items-center gap-3 rounded-[40px] transition-colors font-poppins font-medium text-[13px] border-[0.5px] justify-start ${
                !activeGuild
                  ? 'opacity-20 cursor-not-allowed text-foreground border-transparent'
                  : isActive(item.view)
                  ? 'bg-accent/20 border-accent/20 text-accent hover:bg-accent/30'
                  : 'text-foreground hover:bg-muted border-transparent'
              }`}
            >
              {activeGuild && isActive(item.view) ? (
                <span
                  className="w-5 h-5 shrink-0 icon-accent"
                  style={{ WebkitMaskImage: `url(${item.icon})`, maskImage: `url(${item.icon})` }}
                  aria-hidden="true"
                />
              ) : (
                <Image
                  src={item.icon}
                  alt=""
                  width={20}
                  height={20}
                  className="w-5 h-5 shrink-0 icon-adaptive"
                />
              )}
              <span className="whitespace-nowrap">{item.name}</span>
            </Button>
          ))}
        </div>

        {/* Admin Settings */}
        {adminItems.length > 0 && (
          <div className="flex flex-col gap-[8px]">
            <div className="px-3">
              <p className="font-poppins font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                ADMIN SETTINGS
              </p>
            </div>
            {adminItems.map((item) => (
              <Button
                key={item.view}
                variant="ghost"
                onClick={() => handleNavClick(item.view)}
                className={`w-full px-3.5 py-[10px] h-auto flex items-center gap-3 rounded-[40px] transition-colors font-poppins font-medium text-[13px] text-left border-[0.5px] justify-start ${
                  isActive(item.view)
                    ? 'bg-accent/20 border-accent/20 text-accent hover:bg-accent/30'
                    : 'text-foreground hover:bg-muted border-transparent'
                }`}
              >
                {isActive(item.view) ? (
                  <span
                    className="w-5 h-5 shrink-0 icon-accent"
                    style={{ WebkitMaskImage: `url(${item.icon})`, maskImage: `url(${item.icon})` }}
                    aria-hidden="true"
                  />
                ) : (
                  <Image
                    src={item.icon}
                    alt=""
                    width={20}
                    height={20}
                    className="w-5 h-5 shrink-0 icon-adaptive"
                  />
                )}
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>
                {item.view === 'loot-submissions' && pendingSubmissionCount > 0 && (
                  <span className="ml-auto bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {pendingSubmissionCount > 99 ? '99+' : pendingSubmissionCount}
                  </span>
                )}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Section - Fixed at bottom, overlays scrollable area */}
      {/* Hidden on mobile since Help, Discord, Profile are in the mobile header */}
      {!isMobileOverlay && (
        <div
          className="absolute bottom-0 left-0 right-0 flex flex-col gap-0 z-10 bg-background-subtle border-t border-border p-[10px]"
          style={{ width: sidebarWidth }}
        >
          <Button
            variant="ghost"
            onClick={() => {
              router.push('/help')
              onNavigate?.()
            }}
            className={`w-full px-3.5 py-2 h-auto flex items-center gap-3 rounded-[40px] transition-colors font-poppins font-medium text-[13px] border-[0.5px] justify-start ${
              pathname?.startsWith('/help')
                ? 'bg-accent/20 border-accent/20 text-accent hover:bg-accent/30'
                : 'text-foreground hover:bg-muted border-transparent'
            }`}
          >
            {pathname?.startsWith('/help') ? (
              <span
                className="w-5 h-5 shrink-0 icon-accent"
                style={{ WebkitMaskImage: 'url(/icons/help.svg)', maskImage: 'url(/icons/help.svg)' }}
                aria-hidden="true"
              />
            ) : (
              <Image
                src="/icons/help.svg"
                alt=""
                width={20}
                height={20}
                className="w-5 h-5 icon-adaptive"
              />
            )}
            <span className="whitespace-nowrap">Help</span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              router.push('/updates')
              onNavigate?.()
            }}
            className={`w-full px-3.5 py-2 h-auto flex items-center gap-3 rounded-[40px] transition-colors font-poppins font-medium text-[13px] border-[0.5px] justify-start ${
              pathname?.startsWith('/updates')
                ? 'bg-accent/20 border-accent/20 text-accent hover:bg-accent/30'
                : 'text-foreground hover:bg-muted border-transparent'
            }`}
          >
            <HugeiconsIcon
              icon={Notification03Icon}
              size={20}
              className={`w-5 h-5 ${pathname?.startsWith('/updates') ? 'text-accent' : ''}`}
            />
            <span className="whitespace-nowrap">Updates</span>
          </Button>

          <a
            href="https://discord.gg/JNJewThYAB"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-3.5 py-2 flex items-center gap-3 rounded-[40px] transition-colors font-poppins font-medium text-[13px] text-foreground hover:bg-muted"
          >
            <Image
              src="/icons/discord-large.svg"
              alt="Discord"
              width={20}
              height={20}
              className="icon-adaptive w-5 h-5"
            />
            <span className="whitespace-nowrap">Join Discord</span>
          </a>

          {/* User Profile Card */}
          {loading ? (
            /* Loading skeleton for user profile */
            <div className="w-full bg-background-elevated border border-muted rounded-xl px-3.5 py-2 flex items-center gap-3 mt-2 animate-pulse">
              <div className="w-5 h-5 rounded-full bg-border-strong shrink-0 border border-border" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="h-3 bg-border-strong rounded w-20" />
                <div className="h-2 bg-border-strong rounded w-12" />
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              onClick={() => {
                router.push('/profile')
                onNavigate?.()
              }}
              className="w-full bg-background-elevated border border-muted rounded-xl px-3.5 py-2 h-auto flex items-center gap-3 hover:bg-muted transition-colors mt-2"
            >
              {user?.user_metadata?.avatar_url ? (
                <Image
                  src={user.user_metadata.avatar_url.startsWith('http')
                    ? user.user_metadata.avatar_url
                    : `https://cdn.discordapp.com/avatars/${user.user_metadata.provider_id}/${user.user_metadata.avatar_url}.png`}
                  alt="Avatar"
                  width={20}
                  height={20}
                  className="w-5 h-5 rounded-full shrink-0 border border-border"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'
                  }}
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shrink-0 border border-border" />
              )}
              <div className="flex-1 text-left pb-[2px] pt-0 px-0 leading-[normal] min-w-0">
                <p className="font-poppins font-medium text-[13px] text-foreground w-full truncate">
                  {user?.user_metadata?.custom_claims?.global_name || user?.user_metadata?.full_name || activeMember?.character_name || 'User'}
                </p>
                <p className="font-poppins font-normal text-[10px] text-muted-foreground w-full truncate">
                  {activeMember?.role || 'Member'}
                </p>
              </div>
              <Image
                src="/icons/settings-user.svg"
                alt="Settings"
                width={20}
                height={20}
                className="icon-adaptive w-5 h-5 shrink-0"
              />
            </Button>
          )}
        </div>
      )}
    </aside>

    {/* Create Guild Modal */}
    <CreateGuildModal
      isOpen={showCreateGuildModal}
      onClose={() => setShowCreateGuildModal(false)}
    />

    {/* Join Guild Modal */}
    <Modal
      open={showJoinModal}
      onClose={() => {
        setShowJoinModal(false)
        setModalView('main')
      }}
      size="lg"
      zIndex={100}
      maxHeight="90vh"
      className={modalView === 'main' ? 'h-[480px]' : ''}
    >
      {modalView === 'main' ? (
        /* Main View - Choose Discord or Code */
        <>
          <ModalHeader
            onClose={() => {
              setShowJoinModal(false)
              setModalView('main')
            }}
            showCloseButton={false}
            className="bg-background-elevated"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <img
                  src="https://wow.zamimg.com/images/wow/icons/large/inv_shirt_guildtabard_01.jpg"
                  alt="Guild Tabard"
                  className="w-10 h-10 rounded-lg shadow-md outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                />
                <div>
                  <h3 className="text-[20px] font-bold text-foreground">Join a guild</h3>
                  <p className="text-[12px] text-muted-foreground">Choose how you'd like to join</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowJoinModal(false)
                  setModalView('main')
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </ModalHeader>

          <ModalBody className="flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Join via Discord */}
              <div className="bg-background-elevated border border-border-strong rounded-[24px] p-5 pt-8 flex flex-col items-center">
                <div className="flex flex-col gap-5 items-center w-full flex-1">
                  <Image
                    src="/icons/discord-large.svg"
                    alt="Discord"
                    width={40}
                    height={40}
                    className="icon-adaptive w-10 h-10"
                  />
                  <div className="flex flex-col gap-1 text-center w-full">
                    <h2 className="font-poppins font-bold text-lg text-foreground">
                      Join with Discord
                    </h2>
                    <p className="font-poppins font-normal text-sm text-muted-foreground">
                      If your guild has Discord linked, you're in automatically.
                    </p>
                  </div>
                </div>
                <Button onClick={handleOpenDiscordModal} className="w-full mt-5">
                  Select guild
                </Button>
              </div>

              {/* Join with Code */}
              <div className="bg-background-elevated border border-border-strong rounded-[24px] p-5 pt-8 flex flex-col items-center">
                <div className="flex flex-col gap-5 items-center w-full flex-1">
                  <Image
                    src="/icons/password-validation.svg"
                    alt="Code"
                    width={40}
                    height={40}
                    className="icon-adaptive w-10 h-10"
                  />
                  <div className="flex flex-col gap-1 text-center w-full">
                    <h2 className="font-poppins font-bold text-lg text-foreground">
                      Join with code
                    </h2>
                    <p className="font-poppins font-normal text-sm text-muted-foreground">
                      Paste the code from your guild officer.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 w-full mt-5">
                  <div className="flex gap-2.5 w-full">
                    <Input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="ABC123DEF456"
                      variant="pill"
                      size="lg"
                      className="flex-1 min-w-0 bg-background-subtle font-poppins font-medium"
                      disabled={joining}
                    />
                    <Button
                      onClick={handleJoinWithCode}
                      disabled={!inviteCode.trim()}
                      loading={joining}
                      className="shrink-0"
                    >
                      Join
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="flex flex-col gap-2 items-center mt-6">
              <div className="flex items-center justify-center gap-2">
                <Image
                  src="/icons/help.svg"
                  alt="Help"
                  width={16}
                  height={16}
                  className="icon-adaptive w-4 h-4"
                />
                <p className="font-poppins font-bold text-sm text-foreground">
                  Need help?
                </p>
              </div>
              <p className="font-poppins font-normal text-xs text-muted-foreground text-center">
                Ask your guild officer for an invite code or Discord link.
              </p>
            </div>
          </ModalBody>
        </>
      ) : (
        /* Discord View - Guild List */
        <>
          <ModalHeader
            onClose={() => {
              setShowJoinModal(false)
              setModalView('main')
            }}
            showCloseButton={false}
            className="bg-background-elevated"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setModalView('main')}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Go back"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>
                <div>
                  <h3 className="text-[20px] font-bold text-foreground">Select guild</h3>
                  <p className="text-[12px] text-muted-foreground">Automatically join guilds from your Discord servers</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowJoinModal(false)
                  setModalView('main')
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </ModalHeader>

          <ModalBody>
            {discordLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner text="Loading available guilds..." />
              </div>
            ) : discordError ? (
              <Alert variant="destructive" className="flex flex-col gap-4">
                <AlertDescription>{discordError}</AlertDescription>
                {discordError.includes('verification required') && (
                  <Button
                    onClick={() => {
                      setShowJoinModal(false)
                      setModalView('main')
                      router.push('/profile')
                    }}
                  >
                    Go to profile to verify Discord
                  </Button>
                )}
              </Alert>
            ) : availableGuilds.length === 0 ? (
              <div className="text-center py-8">
                <p className="font-bold text-[18px] text-foreground mb-2">No guilds found</p>
                <p className="text-[14px] text-muted-foreground mb-4">
                  We didn't find any LootList+ guilds linked to your Discord servers.
                </p>
                <div className="bg-background-elevated border border-border-strong rounded-xl p-4 text-left space-y-2">
                  <p className="text-[14px] text-foreground font-medium">Why this might happen:</p>
                  <ul className="text-[13px] text-muted-foreground space-y-1 list-disc list-inside">
                    <li>No servers you're in use LootList+</li>
                    <li>You're already in all matching guilds</li>
                    <li>Discord integration isn't set up yet</li>
                  </ul>
                  <p className="text-[13px] text-muted-foreground mt-3">
                    Use an invite code, or ask a guild officer to enable Discord integration.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-bold text-[16px] text-foreground">Available guilds</h3>
                <div className="space-y-3">
                  {availableGuilds.map((guild) => (
                    <div
                      key={guild.id}
                      className="bg-background-elevated border border-border-strong rounded-xl p-4 hover:border-border-strong transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          {guild.discord_icon && (
                            <img
                              src={`https://cdn.discordapp.com/icons/${guild.discord_server_id}/${guild.discord_icon}.png`}
                              alt={guild.discord_name || guild.name}
                              className="w-10 h-10 rounded-full outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-[14px] text-foreground truncate">{guild.name}</h4>
                            <div className="flex gap-2 text-[12px] text-muted-foreground mt-0.5">
                              {guild.realm && <span>{guild.realm}</span>}
                              {guild.realm && <span>•</span>}
                              <span>{guild.faction}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleJoinDiscordGuild(guild.id)}
                          loading={joining}
                          className="shrink-0"
                        >
                          Join
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ModalBody>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-background-subtle">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="10" cy="10" r="9" />
                <path d="M10 6v4M10 14h.01" strokeLinecap="round" />
              </svg>
              <p className="text-[12px] text-muted-foreground">
                We check which Discord servers you're a member of and match them with LootList+ guilds that have Discord integration enabled.
              </p>
            </div>
          </div>
        </>
      )}
    </Modal>
  </>
  )
}
