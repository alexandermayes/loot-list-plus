'use client'

import dynamic from 'next/dynamic'
import { SubmissionsListSkeleton } from '@/components/ui/skeletons'

const LootSubmissionsContent = dynamic(
  () => import('./components/LootSubmissionsContent'),
  { loading: () => (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <SubmissionsListSkeleton />
    </div>
  )}
)

export default function MasterLootPage() {
  return <LootSubmissionsContent />
}
