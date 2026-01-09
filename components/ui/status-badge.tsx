import { Badge } from './badge'
import { cn } from '@/lib/utils'

type Status = 'approved' | 'pending' | 'needs_revision' | 'rejected' | 'draft'

interface StatusBadgeProps {
  status: Status
  className?: string
}

const statusConfig = {
  approved: {
    label: 'Approved',
    className: 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'
  },
  pending: {
    label: 'Pending Review',
    className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20'
  },
  needs_revision: {
    label: 'Needs Revision',
    className: 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20'
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
  },
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground border-border hover:bg-muted'
  }
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
