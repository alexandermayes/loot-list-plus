import MasterSheetContent from './components/MasterSheetContent'
import { Heading } from '@/components/ui/typography'

export default function MasterSheet() {
  // Server-rendered heading lands in the initial HTML so LCP doesn't wait
  // for the 2031-line client bundle + tier-data waterfall. Phase / tier
  // shorthand depends on selectedPhase from URL+state, so the client
  // swaps in the richer heading once data loads.
  const serverHeading = (
    <div>
      <Heading level={1}>Loot Rankings</Heading>
      <p className="text-muted-foreground mt-1 text-base">
        All ranked players for each item
      </p>
    </div>
  )

  return <MasterSheetContent serverHeading={serverHeading} />
}
