'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeletons'

function ProfileSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  )
}

const ProfileContent = dynamic(
  () => import('./components/ProfileContent'),
  { loading: () => <ProfileSkeleton /> }
)

export default function ProfilePage() {
  return <ProfileContent />
}
