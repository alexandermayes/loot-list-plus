import { Skeleton } from '@/components/ui/skeletons'

export default function ReserveLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-40 rounded-[52px]" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-9 w-20 rounded-[40px]" />
        <Skeleton className="h-9 w-20 rounded-[40px]" />
        <Skeleton className="h-9 w-24 rounded-[40px]" />
      </div>

      {/* Run cards */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-background-elevated border border-border rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-56" />
                <div className="flex gap-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
