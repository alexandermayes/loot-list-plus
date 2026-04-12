import { AttendanceStatsSkeleton, TableSkeleton } from '@/components/ui/skeletons'

export default function AttendanceLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <AttendanceStatsSkeleton />
      <TableSkeleton rows={8} cols={5} />
    </div>
  )
}
