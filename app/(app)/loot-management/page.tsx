import { Suspense } from 'react'
import LootSettingsContent from './components/LootSettingsContent'
import { LootSettingsPageSkeleton } from '@/components/ui/skeletons'

export default function LootSettingsPage() {
  return (
    <Suspense fallback={<LootSettingsPageSkeleton />}>
      <LootSettingsContent />
    </Suspense>
  )
}
