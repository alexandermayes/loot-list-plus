'use client'

import dynamic from 'next/dynamic'
import { AttendanceStatsSkeleton, TableSkeleton } from '@/components/ui/skeletons'

const AttendanceContent = dynamic(
  () => import('./components/AttendanceContent'),
  { loading: () => (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <AttendanceStatsSkeleton />
      <TableSkeleton rows={8} cols={5} />
    </div>
  )}
)

export default function AttendancePage() {
  return <AttendanceContent />
}
