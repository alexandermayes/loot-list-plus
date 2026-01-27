'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Sidebar from '@/app/components/Sidebar'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Bug } from 'lucide-react'
import { SidebarProvider, useSidebar } from '@/app/contexts/SidebarContext'

const FeedbackModal = dynamic(() => import('@/app/components/FeedbackModal').then(mod => ({ default: mod.FeedbackModal })), {
  loading: () => null
})

function AppLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const supabase = createClient()
  const { sidebarWidth, isResizing } = useSidebar()

  // Map pathname to currentView for sidebar highlighting
  const getCurrentView = () => {
    if (pathname === '/dashboard') return 'overview'
    if (pathname === '/master-sheet') return 'master-sheet'
    if (pathname === '/loot-list') return 'loot-list'
    if (pathname === '/attendance') return 'attendance'
    if (pathname === '/admin/guild-settings') return 'guild-settings'
    if (pathname === '/admin/expansions') return 'expansions'
    if (pathname === '/loot-submissions') return 'loot-submissions'
    if (pathname === '/loot-settings') return 'loot-settings'
    if (pathname === '/admin/raid-tracking') return 'raid-tracking'
    if (pathname === '/admin/prio-list') return 'prio-list'
    // Return empty string for profile and other pages that shouldn't highlight nav items
    return ''
  }

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)
      setLoading(false)
    }
    checkAuth()
  }, [router, supabase])

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <div className="min-h-screen bg-[#151515]">
      <Sidebar user={user} currentView={getCurrentView()} />

      {/* Main Content */}
      <main
        className={`min-h-screen bg-[#09090c] ${isResizing ? '' : 'transition-[margin-left] duration-150'}`}
        style={{ marginLeft: sidebarWidth }}
      >
        {children}
      </main>

      {/* Floating Bug Report Button */}
      <button
        onClick={() => setShowFeedbackModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#141519] hover:bg-[#1a1a1a] border border-[#383838] rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-40"
        title="Report a Bug"
      >
        <Bug className="w-6 h-6 text-[#a1a1a1]" />
      </button>

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
    <SidebarProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SidebarProvider>
  )
}
