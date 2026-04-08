'use client'

import dynamic from 'next/dynamic'
import { TierTabsSkeleton, MasterSheetContentSkeleton } from '@/components/ui/skeletons'

const MasterSheetContent = dynamic(
  () => import('./components/MasterSheetContent'),
  { loading: () => (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <TierTabsSkeleton />
      <MasterSheetContentSkeleton />
    </div>
  )}
)

export default function MasterSheet() {
  return <MasterSheetContent />
}
