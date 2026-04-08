import { Skeleton } from '@/components/ui/skeletons'

export default function UpdatesLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-7 w-28 mb-1" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>

        {/* Timeline entries */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="relative pl-8 pb-8 last:pb-0">
            {/* Timeline line */}
            <div className="absolute left-[7px] top-2 bottom-0 w-px bg-border" />
            {/* Timeline dot */}
            <Skeleton className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full" />

            <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background-subtle">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-14 rounded" />
              </div>

              {/* Items */}
              <div className="px-5 divide-y divide-border">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex gap-3 py-3">
                    <Skeleton className="h-4 w-[90px]" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3.5 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
