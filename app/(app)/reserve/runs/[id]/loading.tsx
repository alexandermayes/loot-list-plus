import { Skeleton } from '@/components/ui/skeletons'

export default function ReserveRunLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-background-elevated border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Share card */}
      <div className="bg-background-elevated border border-border rounded-xl p-5">
        <Skeleton className="h-5 w-24 mb-3" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      {/* Participants */}
      <div className="bg-background-elevated border border-border rounded-xl p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
