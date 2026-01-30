'use client'

import { LootListProvider } from '@/app/contexts/LootListContext'

export default function LootListLayout({ children }: { children: React.ReactNode }) {
  return <LootListProvider>{children}</LootListProvider>
}
