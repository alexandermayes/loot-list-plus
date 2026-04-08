'use client'

import dynamic from 'next/dynamic'
import { DashboardContentSkeleton } from '@/components/ui/skeletons'

const DashboardContent = dynamic(
  () => import('./components/DashboardContent'),
  { loading: () => <DashboardContentSkeleton /> }
)

export default function Dashboard() {
  return <DashboardContent />
}
