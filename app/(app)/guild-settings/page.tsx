'use client'

import dynamic from 'next/dynamic'
import { GuildSettingsContentSkeleton } from '@/components/ui/skeletons'

const GuildSettingsContent = dynamic(
  () => import('./components/GuildSettingsContent'),
  { loading: () => <GuildSettingsContentSkeleton /> }
)

export default function GuildSettingsPage() {
  return <GuildSettingsContent />
}
