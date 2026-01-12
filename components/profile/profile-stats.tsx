import { Trophy, Calendar, ClipboardCheck, Star } from 'lucide-react'

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
      return 'px-3 py-1 bg-green-900/20 border border-green-600 rounded-full text-green-200 text-[13px]'
    } else if (score >= 4) {
      return 'px-3 py-1 bg-yellow-900/20 border border-yellow-600 rounded-full text-yellow-200 text-[13px]'
    } else {
      return 'px-3 py-1 bg-red-900/20 border border-red-600 rounded-full text-red-200 text-[13px]'
    }
  }

  const getSubmissionBadge = (status: string | null) => {
    if (status === 'approved') {
      return 'px-3 py-1 bg-green-900/20 border border-green-600 rounded-full text-green-200 text-[13px]'
    } else if (status === 'pending') {
      return 'px-3 py-1 bg-yellow-900/20 border border-yellow-600 rounded-full text-yellow-200 text-[13px]'
    } else {
      return 'px-3 py-1 bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded-full text-[#a1a1a1] text-[13px]'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Attendance Stats */}
      {showAttendance && (
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)]">
            <h3 className="text-[18px] font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Raid Attendance
            </h3>
          </div>
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#a1a1a1]">Attendance Score</span>
              <span className={getAttendanceScoreBadge(attendanceScore)}>
                {attendanceScore.toFixed(2)} / 8.00
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#a1a1a1]">Raids Attended (4 weeks)</span>
              <span className="text-white font-medium">{raidsAttended} / {totalRaids}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#a1a1a1]">Attendance Rate</span>
              <span className="text-white font-medium">{attendancePercentage}%</span>
            </div>
            <div className="w-full bg-[#0d0e11] rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  attendancePercentage >= 80 ? 'bg-green-500' :
                  attendancePercentage >= 60 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${attendancePercentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Loot Stats */}
      {showLootHistory && (
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)]">
            <h3 className="text-[18px] font-semibold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Loot & Submissions
            </h3>
          </div>
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#a1a1a1]">Items Received</span>
              <span className="text-white font-medium flex items-center gap-1">
                <Star className="w-4 h-4 text-[#ff8000]" />
                {lootReceived}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#a1a1a1]">Submission Status</span>
              <span className={getSubmissionBadge(submissionStatus)}>
                {submissionStatus ? submissionStatus.replace('_', ' ').toUpperCase() : 'No Submission'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#a1a1a1] flex items-center gap-1">
                <ClipboardCheck className="w-4 h-4" />
                List Complete
              </span>
              <span className={submissionStatus === 'approved' ? 'px-3 py-1 bg-green-900/20 border border-green-600 rounded-full text-green-200 text-[13px]' : 'px-3 py-1 bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded-full text-[#a1a1a1] text-[13px]'}>
                {submissionStatus === 'approved' ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Stats Message */}
      {!showAttendance && !showLootHistory && (
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 md:col-span-2 text-center text-[#a1a1a1]">
          This user has hidden their statistics
        </div>
      )}
    </div>
  )
}
