'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// Landing sections (for getlootlist.com)
import LandingNav from '@/app/components/landing/LandingNav'
import LandingHero from '@/app/components/landing/LandingHero'
import LandingFeatures from '@/app/components/landing/LandingFeatures'
import LandingHowItWorks from '@/app/components/landing/LandingHowItWorks'
import LandingAppPreview from '@/app/components/landing/LandingAppPreview'
import LandingTestimonials from '@/app/components/landing/LandingTestimonials'
import LandingValueProps from '@/app/components/landing/LandingValueProps'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'

// Login page (for lootlistplus.com)
import LoginPage from '@/app/components/LoginPage'

// Hostnames that should show the marketing landing page
const LANDING_PAGE_HOSTS = [
  'getlootlist.com',
  'www.getlootlist.com',
]

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [showLandingPage, setShowLandingPage] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // Determine which page to show based on hostname
    const hostname = window.location.hostname
    const isLandingHost = LANDING_PAGE_HOSTS.includes(hostname)
    setShowLandingPage(isLandingHost)

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/overview')
      } else {
        setLoading(false)
      }
    }
    checkUser()
  }, [])

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  // Show marketing landing page on getlootlist.com
  if (showLandingPage) {
    return (
      <main className="bg-background overflow-x-hidden">
        <LandingNav />
        <LandingHero />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingAppPreview />
        <LandingTestimonials />
        <LandingValueProps />
        <LandingCTA />
        <LandingFooter />
      </main>
    )
  }

  // Show login page on lootlistplus.com (and localhost/other domains)
  return <LoginPage />
}
