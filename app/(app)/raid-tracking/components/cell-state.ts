import type { AttendanceStatus } from './types'

export type CellState = 'attended' | 'late' | 'standby' | 'no-show' | 'excused' | 'empty'

export function getCellState(status: AttendanceStatus | undefined): CellState {
  if (!status) return 'empty'
  if (status.no_call_no_show) return 'no-show'
  if (status.is_excused) return 'excused'
  if (status.attended && status.was_late) return 'late'
  if (status.was_benched) return 'standby'
  if (status.attended) return 'attended'
  return 'empty'
}

export function getCellStyle(state: CellState): string {
  switch (state) {
    case 'attended':
      return 'bg-background-elevated border border-border border-l-2 border-l-success'
    case 'late':
      return 'bg-background-elevated border border-border border-l-2 border-l-warning'
    case 'standby':
      return 'bg-background-elevated border border-border border-l-2 border-l-orange-500'
    case 'no-show':
      return 'bg-background-elevated border border-border border-l-2 border-l-destructive'
    case 'excused':
      return 'bg-background-elevated border border-border border-l-2 border-l-muted-foreground'
    default:
      return 'bg-background-elevated border border-border'
  }
}
