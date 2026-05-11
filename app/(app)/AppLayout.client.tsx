'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Sidebar from '@/app/components/Sidebar'
import { MobileMenuButton } from '@/app/components/MobileMenuButton'
import { Skeleton } from '@/components/ui/skeletons'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import { Notification03Icon } from '@hugeicons/core-free-icons'
import { SidebarProvider, useSidebar } from '@/app/contexts/SidebarContext'
import { AccentColorProvider } from '@/app/contexts/AccentColorContext'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { DeploymentCheck } from '@/app/components/DeploymentCheck'
import { KonamiEasterEgg } from '@/app/components/KonamiEasterEgg'

function AppLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user, loading, activeGuild, activeCharacter } = useGuildContext()
  const { sidebarWidth, isResizing, isMobile, isMobileMenuOpen, closeMobileMenu } = useSidebar()

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobile && isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobile, isMobileMenuOpen])

  // Map pathname to currentView for sidebar highlighting
  const getCurrentView = () => {
    if (pathname === '/overview') return 'overview'
    if (pathname === '/master-sheet') return 'master-sheet'
    if (pathname === '/loot-list') return 'loot-list'
    if (pathname === '/attendance') return 'attendance'
    if (pathname === '/guild-settings') return 'guild-settings'
    if (pathname === '/expansions') return 'expansions'
    if (pathname === '/loot-submissions') return 'loot-submissions'
    if (pathname === '/loot-settings') return 'loot-settings'
    if (pathname === '/raid-tracking') return 'raid-tracking'
    if (pathname.startsWith('/reserve')) return 'reserve'
    if (pathname === '/updates') return 'updates'
    // Return empty string for profile and other pages that shouldn't highlight nav items
    return ''
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-elevated">
        {/* Sidebar skeleton - desktop only */}
        {!isMobile && (
          <aside
            className="fixed left-0 top-0 h-screen bg-background-subtle flex flex-col px-2.5 z-50"
            style={{ width: sidebarWidth }}
          >
            {/* Logo area */}
            <div className="px-3 pt-9 pb-6">
              <Skeleton className="h-4 w-[102px]" />
            </div>

            {/* Guild selector skeleton */}
            <div className="flex flex-col gap-1 mb-6">
              <div className="px-3">
                <Skeleton className="h-2.5 w-10 mb-1" />
              </div>
              <div className="bg-background-elevated border border-border rounded-xl px-3.5 py-2 flex items-center gap-3">
                <Skeleton className="w-5 h-5 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 w-16" />
                </div>
              </div>
            </div>

            {/* Character selector skeleton */}
            <div className="flex flex-col gap-1 mb-6">
              <div className="px-3">
                <Skeleton className="h-2.5 w-16 mb-1" />
              </div>
              <div className="bg-background-elevated border border-border rounded-xl px-3.5 py-2 flex items-center gap-3">
                <Skeleton className="w-5 h-5 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2 w-14" />
                </div>
              </div>
            </div>

            {/* Nav items skeleton */}
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-[88px] rounded-[40px]" />
              <Skeleton className="h-10 w-[108px] rounded-[40px]" />
              <Skeleton className="h-10 w-[80px] rounded-[40px]" />
              <Skeleton className="h-10 w-[96px] rounded-[40px]" />
            </div>
          </aside>
        )}

        {/* Mobile header skeleton */}
        {isMobile && (
          <header className="fixed top-0 left-0 right-0 h-14 bg-background-elevated border-b border-border z-30 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <Skeleton className="h-4 w-[102px]" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="w-8 h-8 rounded-full" />
            </div>
          </header>
        )}

        {/* Content area skeleton */}
        <main
          className="min-h-screen bg-background"
          style={{ marginLeft: isMobile ? 0 : sidebarWidth }}
        >
          <div className={`w-full ${isMobile ? 'pt-14' : ''}`}>
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
              {/* Page header */}
              <div>
                <Skeleton className="h-[52px] w-[55%] max-w-2xl rounded-md" />
                <Skeleton className="h-5 w-[42%] max-w-md mt-2 rounded-md" />
                <div className="flex items-center gap-2 flex-wrap mt-4">
                  <Skeleton className="h-7 w-28 rounded-full" />
                  <Skeleton className="h-7 w-64 rounded-full" />
                  <Skeleton className="h-7 w-64 rounded-full" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                </div>
              </div>
              {/* Insights row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="bg-background-elevated border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Skeleton className="w-5 h-5 rounded" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                    <div className="space-y-2.5">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
              {/* Loot priority and received items */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[0, 1].map(i => (
                  <div key={i} className="bg-background-elevated border border-border rounded-xl p-6">
                    <div className="flex items-center gap-4 mb-6">
                      <Skeleton className="w-8 h-8 rounded" />
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[0, 1, 2].map(j => (
                        <div key={j} className="bg-background-inset border border-border rounded-xl p-4">
                          <div className="flex items-center gap-4">
                            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-40" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-elevated">
      {/* Desktop Sidebar - hidden on mobile/tablet */}
      {!isMobile && (
        <Sidebar currentView={getCurrentView()} />
      )}

      {/* Mobile/Tablet Sidebar Overlay */}
      {isMobile && isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          {/* Sidebar */}
          <Sidebar currentView={getCurrentView()} isMobileOverlay onNavigate={closeMobileMenu} />
        </>
      )}

      {/* Mobile Header */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 h-14 bg-background-elevated border-b border-border z-30 flex items-center justify-between px-4">
          {/* Left side: Menu + Logo */}
          <div className="flex items-center gap-3">
            <MobileMenuButton />
            <Image
              src="/logo.svg"
              alt="LootList+"
              width={102}
              height={16}
              className="logo-adaptive h-4 w-auto"
              priority
            />
          </div>

          {/* Right side: Help, Discord, Profile */}
          <div className="flex items-center gap-1">
            <Link
              href="/help"
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Help"
            >
              <Image
                src="/icons/help.svg"
                alt="Help"
                width={20}
                height={20}
                className="w-5 h-5 icon-adaptive"
              />
            </Link>
            <a
              href="https://discord.gg/JNJewThYAB"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Join Discord"
            >
              <Image
                src="/icons/discord-large.svg"
                alt="Discord"
                width={20}
                height={20}
                className="w-5 h-5 icon-adaptive"
              />
            </a>
            <Link
              href="/updates"
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Updates"
            >
              <HugeiconsIcon icon={Notification03Icon} size={20} />
            </Link>
            <Link
              href="/profile"
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Profile"
            >
              {user?.user_metadata?.avatar_url ? (
                <Image
                  src={user.user_metadata.avatar_url.startsWith('http')
                    ? user.user_metadata.avatar_url
                    : `https://cdn.discordapp.com/avatars/${user.user_metadata.provider_id}/${user.user_metadata.avatar_url}.png`}
                  alt="Profile"
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full border border-border"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'
                  }}
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border border-border" />
              )}
            </Link>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main
        className={`min-h-screen bg-background ${isResizing ? '' : 'transition-[margin-left] duration-150'}`}
        style={{ marginLeft: isMobile ? 0 : sidebarWidth }}
      >
        {/* Max-width container for content */}
        <div className={`w-full ${isMobile ? 'pt-14' : ''}`}>
          <div className="max-w-7xl mx-auto" key={`${activeGuild?.id || 'no-guild'}-${activeCharacter?.id || 'no-char'}`}>
            {children}
          </div>
        </div>
      </main>

    </div>
  )
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AccentColorProvider>
      <SidebarProvider>
        <DeploymentCheck />
        <KonamiEasterEgg />
        <AppLayoutContent>{children}</AppLayoutContent>
      </SidebarProvider>
    </AccentColorProvider>
  )
}
