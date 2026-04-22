'use client'

import dynamic from 'next/dynamic'
import { LootSettingsPageSkeleton } from '@/components/ui/skeletons'

const LootSettingsContent = dynamic(
  () => import('./components/LootSettingsContent'),
  { loading: () => <LootSettingsPageSkeleton /> }
)

export default function LootSettingsPage() {
  return <LootSettingsContent />
}
