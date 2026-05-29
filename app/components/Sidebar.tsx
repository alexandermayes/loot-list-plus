'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useGuildContext } from '../contexts/GuildContext'
import Image from 'next/image'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { CharacterSelector } from './CharacterSelector'
import { useSidebar } from '../contexts/SidebarContext'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, Settings01Icon, Notification03Icon, BubbleChatEditIcon } from '@hugeicons/core-free-icons'
import { usePendingSubmissionCount } from '../hooks/usePendingSubmissionCount'
import { trackClientEvent } from '@/utils/analytics/client'
import { hasFeature } from '@/domain/guild/feature-flags'

// Lazy load modals to keep them out of the initial Sidebar chunk.
const CreateGuildModal = dynamic(() => import('./CreateGuildModal').then(mod => ({ default: mod.CreateGuildModal })), {
  loading: () => null
})
const FeedbackModal = dynamic(() => import('./FeedbackModal').then(mod => ({ default: mod.FeedbackModal })), {
  loading: () => null
})
const JoinGuildModal = dynamic(() => import('./JoinGuildModal').then(mod => ({ default: mod.JoinGuildModal })), {
  loading: () => null
})

interface SidebarProps {
  currentView?: string
  onViewChange?: (view: string) => void
  isMobileOverlay?: boolean
  onNavigate?: () => void
}

const MOBILE_SIDEBAR_WIDTH = 280

// Hoisted to module scope so the array identity is stable across renders;
// memoization downstream only fires when the structure actually changes.
const STATIC_NAV_ITEMS: ReadonlyArray<{ name: string; view: string; icon: string }> = [
  { name: 'Overview', view: 'overview', icon: '/icons/dashboard.svg' },
  { name: 'Master Sheet', view: 'master-sheet', icon: '/icons/master-sheet.svg' },
  { name: 'Loot Lists', view: 'loot-list', icon: '/icons/loot-lists.svg' },
  { name: 'Attendance', view: 'attendance', icon: '/icons/attendance.svg' },
  { name: 'Reserve', view: 'reserve', icon: '/icons/reserve.svg' },
]

const NAV_ROUTE_MAP: Record<string, string> = {
  'overview': '/overview',
  'master-sheet': '/master-sheet',
  'loot-list': '/loot-list',
  'attendance': '/attendance',
  'guild-settings': '/guild-settings',
  'loot-submissions': '/loot-submissions',
  'loot-settings': '/loot-management',
  'raid-tracking': '/raid-tracking',
  'raid-teams': '/raid-teams',
  'audit-log': '/audit-log',
  'reserve': '/reserve',
}

export default function Sidebar({ currentView = 'overview', onViewChange, isMobileOverlay = false, onNavigate }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, activeGuild, userGuilds, switchGuild, isOfficer, hasPermission, activeMember, loading } = useGuildContext()
  const { sidebarWidth, setSidebarWidth, isResizing, setIsResizing } = useSidebar()
  const { count: pendingSubmissionCount } = usePendingSubmissionCount(activeGuild?.id ?? null, hasPermission('manage_submissions'))
  const [guildDropdownOpen, setGuildDropdownOpen] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinModalInitialView, setJoinModalInitialView] = useState<'main' | 'discord'>('main')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [showCreateGuildModal, setShowCreateGuildModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)

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

  // Reopen Select guild → Discord view after a reconnect round-trip.
  // The Reconnect button stashes ?openGuildModal=discord on the destination URL.
  const reopenedAfterReconnectRef = useRef(false)
  useEffect(() => {
    if (!user || reopenedAfterReconnectRef.current) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('openGuildModal') !== 'discord') return
    reopenedAfterReconnectRef.current = true

    params.delete('openGuildModal')
    const remaining = params.toString()
    const cleaned = `${window.location.pathname}${remaining ? `?${remaining}` : ''}${window.location.hash}`
    window.history.replaceState(null, '', cleaned)

    // Intentional setState in effect: URL-param-driven modal open. The param
    // is consumed-and-removed so there's no equivalent render-time signal.
    setJoinModalInitialView('discord')
    setShowJoinModal(true)
  }, [user])

  const handleSwitchGuild = useCallback(async (guildId: string) => {
    setGuildDropdownOpen(false)
    trackClientEvent('guild_switched', { guild_id: guildId })
    await switchGuild(guildId)
    router.refresh()
  }, [switchGuild, router])

  // Route map is a const — define once at module scope below the component,
  // referenced inside the callback to keep it stable across renders.
  const handleNavClick = useCallback((view: string) => {
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
      router.push(NAV_ROUTE_MAP[view] || '/overview')
    }

    // Close mobile menu after navigation
    onNavigate?.()
  }, [activeGuild, onViewChange, onNavigate, router])

  // Static nav items — referenced from module-scope constant so the array
  // identity stays stable across renders (cheap React.memo wins downstream).
  const navItems = STATIC_NAV_ITEMS

  // Admin items depend on permissions + guild feature flags. Memoize so the
  // array identity only changes when one of those actually changes.
  const adminItems = useMemo(() => [
    ...(hasPermission('manage_attendance') ? [{ name: 'Raid Tracking', view: 'raid-tracking', icon: '/icons/raid-tracking.svg' }] : []),
    ...(hasPermission('manage_submissions') ? [{ name: 'Loot Submissions', view: 'loot-submissions', icon: '/icons/master-loot.svg' }] : []),
    ...(hasPermission('manage_settings') ? [{ name: 'Loot Management', view: 'loot-settings', icon: '/icons/guild-settings.svg' }] : []),
    ...(hasPermission('manage_roster') && hasFeature(activeGuild, 'raid_teams') ? [{ name: 'Raid Teams', view: 'raid-teams', icon: '/icons/user-multiple.svg' }] : []),
    ...(hasPermission('view_audit_log') && hasFeature(activeGuild, 'audit_log') ? [{ name: 'Audit Log', view: 'audit-log', icon: '/icons/monitor.svg' }] : []),
  ], [hasPermission, activeGuild])

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
      'loot-settings': '/loot-management',
      'raid-tracking': '/raid-tracking',
      'raid-teams': '/raid-teams',
      'audit-log': '/audit-log',
      'reserve': '/reserve',
    }
    return pathname === routeMap[view] || (view === 'reserve' && pathname.startsWith('/reserve'))
  }

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
          ? 'z-50 animate-in slide-in-from-left duration-200 overscroll-contain'
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
      <div className={`flex-1 flex flex-col gap-6 min-h-0 overflow-y-auto overscroll-contain sidebar-scrollable px-2.5 ${
        isMobileOverlay ? 'pt-[60px] pb-6' : 'pt-[88px] pb-[265px]'
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
              {(isOfficer || hasPermission('manage_settings') || hasPermission('manage_members')) && (
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
                  setJoinModalInitialView('main')
                  setShowJoinModal(true)
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
          {/* Fade gradient above bottom section */}
          <div
            className="absolute left-0 right-0 pointer-events-none border-b border-border"
            style={{
              bottom: '100%',
              height: 32,
              background: 'linear-gradient(to top, hsl(var(--background-subtle)) 0%, hsl(var(--background-subtle) / 0) 100%)',
            }}
          />
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
            <span className={`w-5 h-5 flex items-center justify-center shrink-0 overflow-visible ${pathname?.startsWith('/updates') ? 'text-accent' : ''}`}>
              <HugeiconsIcon icon={Notification03Icon} size={24} strokeWidth={1.5} />
            </span>
            <span className="whitespace-nowrap">Updates</span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => setShowFeedbackModal(true)}
            className="w-full px-3.5 py-2 h-auto flex items-center gap-3 rounded-[40px] transition-colors font-poppins font-medium text-[13px] text-foreground hover:bg-muted border-[0.5px] border-transparent justify-start"
          >
            <span className="w-5 h-5 flex items-center justify-center shrink-0 overflow-visible">
              <HugeiconsIcon icon={BubbleChatEditIcon} size={24} strokeWidth={1.5} />
            </span>
            <span className="whitespace-nowrap">Give feedback</span>
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

    <FeedbackModal
      isOpen={showFeedbackModal}
      onClose={() => setShowFeedbackModal(false)}
    />


    <JoinGuildModal
      open={showJoinModal}
      initialView={joinModalInitialView}
      onClose={() => setShowJoinModal(false)}
      onError={showErrorToast}
    />

  </>
  )
}
