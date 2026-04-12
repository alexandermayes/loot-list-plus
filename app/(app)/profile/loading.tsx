import { Skeleton } from '@/components/ui/skeletons'

export default function ProfileLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header card */}
      <div className="bg-background-elevated border border-border rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-full" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-7 w-48" />
            <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-10 w-full sm:w-24 rounded-[52px]" />
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-28 rounded-[40px]" />
        <Skeleton className="h-10 w-32 rounded-[40px]" />
        <Skeleton className="h-10 w-28 rounded-[40px]" />
      </div>

      {/* Content cards */}
      <div className="space-y-6">
        <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3.5 w-72" />
              </div>
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3.5 w-80" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>

        <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-56 mt-2" />
          </div>
          <div className="p-4 sm:p-6">
            <Skeleton className="h-4 w-72 mb-4" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-24 rounded-[52px]" />
              <Skeleton className="h-9 w-36 rounded-[52px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
