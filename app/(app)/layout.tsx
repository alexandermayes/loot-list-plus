'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Map pathname to currentView for sidebar highlighting
  const getCurrentView = () => {
    if (pathname === '/dashboard') return 'overview'
    if (pathname === '/master-sheet') return 'master-sheet'
    if (pathname === '/loot-list') return 'loot-list'
    if (pathname === '/attendance') return 'attendance'
    if (pathname === '/admin/guild-settings') return 'guild-settings'
    if (pathname === '/admin') return 'master-loot'
    if (pathname === '/admin/raid-tracking') return 'raid-tracking'
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
      <main className="ml-[208px] min-h-screen bg-[#09090c] border-l border-[rgba(255,255,255,0.1)]">
        {children}
      </main>
    </div>
  )
}
