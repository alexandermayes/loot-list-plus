import LandingNav from '@/app/components/landing/LandingNav'
import LandingHero from '@/app/components/landing/LandingHero'
import LandingFeatures from '@/app/components/landing/LandingFeatures'
import LandingHowItWorks from '@/app/components/landing/LandingHowItWorks'
import LandingAppPreview from '@/app/components/landing/LandingAppPreview'
import LandingTestimonials from '@/app/components/landing/LandingTestimonials'
import LandingValueProps from '@/app/components/landing/LandingValueProps'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'

export default function AboutPage() {
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
