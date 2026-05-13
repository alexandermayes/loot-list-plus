import { Skeleton, TableSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>
      <TableSkeleton rows={8} cols={5} />
    </div>
  )
}
