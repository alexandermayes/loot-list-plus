import { Skeleton } from '@/components/ui/skeletons'

export default function HelpLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <Skeleton className="h-8 w-64 mx-auto mb-3" />
        <Skeleton className="h-5 w-80 mx-auto" />
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto mb-10">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>

      {/* Tip */}
      <Skeleton className="h-4 w-72 mx-auto -mt-6 mb-10" />

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-background-elevated border border-border rounded-xl p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20 mt-1" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Popular Articles */}
      <Skeleton className="h-6 w-36 mb-4" />
      <div className="grid gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-background-elevated border border-border rounded-lg p-4">
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-5 w-64 mb-1" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
