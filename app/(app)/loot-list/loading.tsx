import { TierTabsSkeleton, LootListContentSkeleton } from '@/components/ui/skeletons'

export default function LootListLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <TierTabsSkeleton />
      <LootListContentSkeleton />
    </div>
  )
}
