import { Suspense } from 'react'
import GuildSettingsContent from './components/GuildSettingsContent'
import { GuildSettingsContentSkeleton } from '@/components/ui/skeletons'

export default function GuildSettingsPage() {
  return (
    <Suspense fallback={<GuildSettingsContentSkeleton />}>
      <GuildSettingsContent />
    </Suspense>
  )
}
