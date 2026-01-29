'use client'

import { SWRConfig } from 'swr'
import { swrConfig } from '@/app/hooks/use-api'

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  )
}
