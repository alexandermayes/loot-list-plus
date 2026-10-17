interface PendingQueueProps {
  awards: number
  attendance: number
  /** Entries the companion has stopped resending (GH #320 follow-up). */
  parkedAwards: number
  parkedAttendance: number
  onClearStuck: () => void
  clearDisabled: boolean
}

export function PendingQueue({ awards, attendance, parkedAwards, parkedAttendance, onClearStuck, clearDisabled }: PendingQueueProps) {
  const total = awards + attendance
  const parked = parkedAwards + parkedAttendance

  if (total + parked === 0) {
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
    <>
      {total > 0 && (
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
      )}

      {/* The attempt limit is deliberately not written here: the renderer
          cannot value-import src/main, so a number would drift from
          MAX_PERMANENT_ATTEMPTS. The status sentence above carries it. */}
      {parked > 0 && (
        <div className="rounded-lg border border-gray-800 bg-[#1a1a1d] p-4">
          <h3 className="text-xs font-medium text-gray-400 uppercase mb-3">Will not be retried</h3>
          <div className="space-y-2">
            {parkedAwards > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Loot awards</span>
                <span className="text-sm text-red-400 font-medium">{parkedAwards}</span>
              </div>
            )}
            {parkedAttendance > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Attendance records</span>
                <span className="text-sm text-red-400 font-medium">{parkedAttendance}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            The server rejected these every time, so the companion has stopped resending them. Clearing removes them from the addon file. Do it while WoW is closed, because the game writes its own copy back at logout.
          </p>
          <button
            className="mt-3 px-3 py-1 text-xs rounded border border-red-800 text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50"
            onClick={onClearStuck}
            disabled={clearDisabled}
          >
            Clear stuck entries
          </button>
        </div>
      )}
    </>
  )
}
