'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import Sidebar from '@/app/components/Sidebar'
import { MobileMenuButton } from '@/app/components/MobileMenuButton'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import { Bug01Icon, Notification03Icon } from '@hugeicons/core-free-icons'
import { SidebarProvider, useSidebar } from '@/app/contexts/SidebarContext'
import { AccentColorProvider } from '@/app/contexts/AccentColorContext'
import { useGuildContext } from '@/app/contexts/GuildContext'

const FeedbackModal = dynamic(() => import('@/app/components/FeedbackModal').then(mod => ({ default: mod.FeedbackModal })), {
  loading: () => null
})

function AppLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user, loading } = useGuildContext()
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const { sidebarWidth, isResizing, isMobile, isMobileMenuOpen, closeMobileMenu } = useSidebar()

  // Map pathname to currentView for sidebar highlighting
  const getCurrentView = () => {
    if (pathname === '/overview') return 'overview'
    if (pathname === '/master-sheet') return 'master-sheet'
    if (pathname === '/loot-list') return 'loot-list'
    if (pathname === '/attendance') return 'attendance'
    if (pathname === '/admin/guild-settings') return 'guild-settings'
    if (pathname === '/admin/expansions') return 'expansions'
    if (pathname === '/loot-submissions') return 'loot-submissions'
    if (pathname === '/loot-settings') return 'loot-settings'
    if (pathname === '/admin/raid-tracking') return 'raid-tracking'
    if (pathname === '/admin/prio-list') return 'prio-list'
    if (pathname === '/updates') return 'updates'
    // Return empty string for profile and other pages that shouldn't highlight nav items
    return ''
  }

  if (loading) {
    return <LoadingSpinner fullScreen />
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
              href="https://discord.gg/WWaUQZMz9M"
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
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* Floating Bug Report Button */}
      <Button
        variant="primary"
        size="icon"
        onClick={() => setShowFeedbackModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-40"
        title="Report a bug"
        aria-label="Report a bug"
      >
        <HugeiconsIcon icon={Bug01Icon} size={24} />
      </Button>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
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
        <AppLayoutContent>{children}</AppLayoutContent>
      </SidebarProvider>
    </AccentColorProvider>
  )
}
