import { Badge } from './badge'
import { cn } from '@/lib/utils'

/**
 * StatusBadge Component - LootList+ Design System
 *
 * Submission statuses: approved, pending, needs_revision, rejected, draft
 * Attendance statuses: attended, late, benched, no_show, signed_up, excused
 */

type SubmissionStatus = 'approved' | 'pending' | 'needs_revision' | 'rejected' | 'draft'
type AttendanceStatus = 'attended' | 'late' | 'benched' | 'no_show' | 'signed_up' | 'excused'
type Status = SubmissionStatus | AttendanceStatus

interface StatusBadgeProps {
  status: Status
  className?: string
  /** Override the default label */
  label?: string
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  // Submission statuses
  approved: {
    label: 'Approved',
    className: 'bg-success/10 text-success border-success/20 hover:bg-success/20'
  },
  pending: {
    label: 'Pending',
    className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20'
  },
  needs_revision: {
    label: 'Needs Revision',
    className: 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20'
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
  },
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground border-border hover:bg-muted'
  },
  // Attendance statuses
  attended: {
    label: 'Attended',
    className: 'bg-success/10 text-success border-success/20 hover:bg-success/20'
  },
  late: {
    label: 'Late',
    className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20'
  },
  benched: {
    label: 'Benched',
    className: 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20'
  },
  no_show: {
    label: 'No Show',
    className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
  },
  signed_up: {
    label: 'Signed Up',
    className: 'bg-accent/10 text-accent border-accent/20 hover:bg-accent/20'
  },
  excused: {
    label: 'Excused',
    className: 'bg-muted text-muted-foreground border-border hover:bg-muted'
  },
}

export function StatusBadge({ status, className, label }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {label || config.label}
    </Badge>
  )
}

export type { Status, SubmissionStatus, AttendanceStatus }
