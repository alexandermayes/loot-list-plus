'use client'

import dynamic from 'next/dynamic'

const LandingLootDecision = dynamic(() => import('./LandingLootDecision'))
const LandingAppPreview = dynamic(() => import('./LandingAppPreview'))
const LandingFeatures = dynamic(() => import('./LandingFeatures'))
const LandingCompare = dynamic(() => import('./LandingCompare'))
const LandingHowItWorks = dynamic(() => import('./LandingHowItWorks'))
const LandingValueProps = dynamic(() => import('./LandingValueProps'))
const LandingCTA = dynamic(() => import('./LandingCTA'))
const LandingFooter = dynamic(() => import('./LandingFooter'))

export default function LandingBelowFold() {
  return (
    <>
      <LandingLootDecision />
      <LandingAppPreview />
      <LandingFeatures />
      <LandingCompare />
      <LandingHowItWorks />
      <LandingValueProps />
      <LandingCTA />
      <LandingFooter />
    </>
  )
}
