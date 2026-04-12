import { SubmissionsListSkeleton } from '@/components/ui/skeletons'

export default function LootSubmissionsLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <SubmissionsListSkeleton />
    </div>
  )
}
