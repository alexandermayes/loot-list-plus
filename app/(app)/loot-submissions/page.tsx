import LootSubmissionsContent from './components/LootSubmissionsContent'
import { Heading } from '@/components/ui/typography'

export default function MasterLootPage() {
  // Server-rendered heading lands in the initial HTML so LCP doesn't wait
  // for the 1574-line client bundle + tier-data waterfall.
  const serverHeading = (
    <div>
      <Heading level={1}>Loot Submissions</Heading>
      <p className="text-muted-foreground mt-1 text-base">
        Review and manage character loot submissions
      </p>
    </div>
  )

  return <LootSubmissionsContent serverHeading={serverHeading} />
}
