import { Skeleton } from '@/components/ui/skeletons'
import { Card } from '@/components/ui/card'

export default function ReserveRunLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
        </div>
      </Card>

      {/* Share card */}
      <Card className="p-5">
        <Skeleton className="h-5 w-24 mb-3" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </Card>

      {/* Participants */}
      <Card className="p-5">
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
      </Card>
    </div>
  )
}
