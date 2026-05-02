'use client'

import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/typography'
import { HugeiconsIcon } from '@hugeicons/react'
import { LockIcon, CheckmarkCircle01Icon, ArrowRight02Icon, Settings01Icon } from '@hugeicons/core-free-icons'
import Link from 'next/link'

interface ManagementToolbarProps {
  runId: string
  status: string
  actionLoading: boolean
  onLock: () => void
  onUnlock: () => void
  onComplete: () => void
}

export default function ManagementToolbar({
  runId,
  status,
  actionLoading,
  onLock,
  onUnlock,
  onComplete,
}: ManagementToolbarProps) {
  return (
    <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Settings01Icon} size={16} className="text-accent" />
          <Text size="sm" color="accent" className="font-medium">Managing this run</Text>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {status === 'open' && (
            <Button
              variant="primary"
              size="sm"
              onClick={onLock}
              loading={actionLoading}
            >
              <HugeiconsIcon icon={LockIcon} size={16} />
              Lock reserves
            </Button>
          )}
          {status === 'locked' && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={onComplete}
                loading={actionLoading}
              >
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} />
                Complete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onUnlock}
                loading={actionLoading}
              >
                <HugeiconsIcon icon={LockIcon} size={16} />
                Unlock
              </Button>
            </>
          )}
          <Link href={`/reserve/runs/${runId}`}>
            <Button variant="ghost" size="sm">
              Awards, exports, audit log
              <HugeiconsIcon icon={ArrowRight02Icon} size={16} />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
