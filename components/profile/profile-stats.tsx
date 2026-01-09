import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Attendance Stats */}
      {showAttendance && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Raid Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Attendance Score</span>
              <Badge variant={attendanceScore >= 6 ? "default" : attendanceScore >= 4 ? "secondary" : "destructive"}>
                {attendanceScore.toFixed(2)} / 8.00
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Raids Attended (4 weeks)</span>
              <span className="text-foreground font-medium">{raidsAttended} / {totalRaids}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Attendance Rate</span>
              <span className="text-foreground font-medium">{attendancePercentage}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  attendancePercentage >= 80 ? 'bg-green-500' :
                  attendancePercentage >= 60 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${attendancePercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loot Stats */}
      {showLootHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Loot & Submissions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Items Received</span>
              <span className="text-foreground font-medium flex items-center gap-1">
                <Star className="w-4 h-4 text-primary" />
                {lootReceived}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Submission Status</span>
              <Badge variant={
                submissionStatus === 'approved' ? 'default' :
                submissionStatus === 'pending' ? 'secondary' :
                'outline'
              }>
                {submissionStatus ? submissionStatus.replace('_', ' ').toUpperCase() : 'No Submission'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                <ClipboardCheck className="w-4 h-4 inline mr-1" />
                List Complete
              </span>
              <Badge variant={submissionStatus === 'approved' ? 'default' : 'outline'}>
                {submissionStatus === 'approved' ? 'Yes' : 'No'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden Stats Message */}
      {!showAttendance && !showLootHistory && (
        <Card className="md:col-span-2">
          <CardContent className="pt-6 text-center text-muted-foreground">
            This user has hidden their statistics
          </CardContent>
        </Card>
      )}
    </div>
  )
}
