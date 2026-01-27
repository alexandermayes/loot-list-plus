import { HugeiconsIcon } from '@hugeicons/react'
import { Award01Icon, Calendar01Icon, CheckListIcon, StarIcon } from '@hugeicons/core-free-icons'
import { StatusBadge, type SubmissionStatus } from '@/components/ui/status-badge'

interface ProfileStatsProps {
  attendanceScore: number
  totalRaids: number
  raidsAttended: number
  lootReceived: number
  submissionStatus: string | null
  showAttendance: boolean
  showLootHistory: boolean
}

export function ProfileStats({
  attendanceScore,
  totalRaids,
  raidsAttended,
  lootReceived,
  submissionStatus,
  showAttendance,
  showLootHistory
}: ProfileStatsProps) {
  const attendancePercentage = totalRaids > 0
    ? Math.round((raidsAttended / totalRaids) * 100)
    : 0

  const getAttendanceScoreBadge = (score: number) => {
    if (score >= 6) {
      return 'px-3 py-1 bg-success/20 border border-success rounded-full text-success text-[13px]'
    } else if (score >= 4) {
      return 'px-3 py-1 bg-warning/20 border border-warning rounded-full text-warning text-[13px]'
    } else {
      return 'px-3 py-1 bg-destructive/20 border border-destructive rounded-full text-destructive text-[13px]'
    }
  }


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Attendance Stats */}
      {showAttendance && (
        <div className="bg-background-elevated border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)]">
            <h3 className="text-[18px] font-semibold text-foreground flex items-center gap-2">
              <HugeiconsIcon icon={Calendar01Icon} size={20} />
              Raid Attendance
            </h3>
          </div>
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">Attendance Score</span>
              <span className={getAttendanceScoreBadge(attendanceScore)}>
                {attendanceScore.toFixed(2)} / 8.00
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">Raids Attended (4 weeks)</span>
              <span className="text-foreground font-medium">{raidsAttended} / {totalRaids}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">Attendance Rate</span>
              <span className="text-foreground font-medium">{attendancePercentage}%</span>
            </div>
            <div className="w-full bg-background-subtle rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  attendancePercentage >= 80 ? 'bg-success' :
                  attendancePercentage >= 60 ? 'bg-warning' :
                  'bg-destructive'
                }`}
                style={{ width: `${attendancePercentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Loot Stats */}
      {showLootHistory && (
        <div className="bg-background-elevated border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)]">
            <h3 className="text-[18px] font-semibold text-foreground flex items-center gap-2">
              <HugeiconsIcon icon={Award01Icon} size={20} />
              Loot & Submissions
            </h3>
          </div>
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">Items Received</span>
              <span className="text-foreground font-medium flex items-center gap-1">
                <HugeiconsIcon icon={StarIcon} size={16} className="text-accent" />
                {lootReceived}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">Submission Status</span>
              {submissionStatus ? (
                <StatusBadge status={submissionStatus as SubmissionStatus} />
              ) : (
                <span className="px-3 py-1 bg-muted border border-border rounded-full text-muted-foreground text-[13px]">
                  No Submission
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground flex items-center gap-1">
                <HugeiconsIcon icon={CheckListIcon} size={16} />
                List Complete
              </span>
              <span className={submissionStatus === 'approved' ? 'px-3 py-1 bg-success/10 border border-success/20 rounded-full text-success text-[13px]' : 'px-3 py-1 bg-muted border border-border rounded-full text-muted-foreground text-[13px]'}>
                {submissionStatus === 'approved' ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Stats Message */}
      {!showAttendance && !showLootHistory && (
        <div className="bg-background-elevated border border-[rgba(255,255,255,0.1)] rounded-xl p-6 md:col-span-2 text-center text-muted-foreground">
          This user has hidden their statistics
        </div>
      )}
    </div>
  )
}
