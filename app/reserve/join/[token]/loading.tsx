import { Skeleton } from '@/components/ui/skeletons'

export default function ReserveJoinLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background-elevated">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="bg-background-elevated border border-border rounded-xl p-5 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-64" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-6 w-36 rounded-full" />
        </div>
        <div className="bg-background-elevated border border-border rounded-xl p-5 space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-11 rounded-xl" />
            <Skeleton className="h-11 rounded-xl" />
          </div>
          <Skeleton className="h-11 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-11 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
