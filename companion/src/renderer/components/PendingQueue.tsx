interface PendingQueueProps {
  awards: number
  attendance: number
}

export function PendingQueue({ awards, attendance }: PendingQueueProps) {
  const total = awards + attendance

  if (total === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-[#1a1a1d] p-4">
        <p className="text-xs text-gray-500">No pending data to sync.</p>
        <p className="text-xs text-gray-600 mt-1">
          Awards and attendance recorded in-game will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-[#1a1a1d] p-4">
      <h3 className="text-xs font-medium text-gray-400 uppercase mb-3">Pending sync</h3>
      <div className="space-y-2">
        {awards > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Loot awards</span>
            <span className="text-sm text-[#ff8000] font-medium">{awards}</span>
          </div>
        )}
        {attendance > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Attendance records</span>
            <span className="text-sm text-[#ff8000] font-medium">{attendance}</span>
          </div>
        )}
      </div>
    </div>
  )
}
