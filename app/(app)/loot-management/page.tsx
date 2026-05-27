import { Suspense } from 'react'
import LootSettingsContent from './components/LootSettingsContent'
import { LootSettingsPageSkeleton } from '@/components/ui/skeletons'
import { Heading } from '@/components/ui/typography'

export default function LootSettingsPage() {
  // Server-rendered heading lands in the initial HTML so LCP doesn't wait
  // for the 2871-line client bundle + data waterfall. Subtitle uses the
  // default viewMode ('items'); the client overrides as the user navigates.
  const serverHeading = (
    <div>
      <Heading level={1}>Loot Management</Heading>
      <p className="text-muted-foreground mt-1 text-base">
        Manage loot items and configure classifications
      </p>
    </div>
  )

  return (
    <Suspense fallback={<LootSettingsPageSkeleton />}>
      <LootSettingsContent serverHeading={serverHeading} />
    </Suspense>
  )
}
