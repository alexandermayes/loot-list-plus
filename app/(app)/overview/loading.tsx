import { DashboardContentSkeleton } from '@/components/ui/skeletons'

export default function OverviewLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <DashboardContentSkeleton />
    </div>
  )
}
