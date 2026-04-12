'use client'

import dynamic from 'next/dynamic'
import { TierTabsSkeleton, LootListContentSkeleton } from '@/components/ui/skeletons'

const LootListContent = dynamic(
  () => import('./components/LootListContent'),
  { loading: () => (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <TierTabsSkeleton />
      <LootListContentSkeleton />
    </div>
  )}
)

export default function LootList() {
  return <LootListContent />
}
