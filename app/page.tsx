'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import { Loading01Icon } from '@hugeicons/core-free-icons'

// Landing sections
import LandingNav from '@/app/components/landing/LandingNav'
import LandingHero from '@/app/components/landing/LandingHero'
import LandingFeatures from '@/app/components/landing/LandingFeatures'
import LandingHowItWorks from '@/app/components/landing/LandingHowItWorks'
import LandingAppPreview from '@/app/components/landing/LandingAppPreview'
import LandingTestimonials from '@/app/components/landing/LandingTestimonials'
import LandingValueProps from '@/app/components/landing/LandingValueProps'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <HugeiconsIcon icon={Loading01Icon} size={32} className="animate-spin text-accent" />
      </div>
    )
  }

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
