interface SyncStatusData {
  state: 'idle' | 'syncing' | 'watching' | 'error'
  lastSync: string | null
  lastError: string | null
  pendingAwards: number
  pendingAttendance: number
}

interface SyncStatusProps {
  status: SyncStatusData | null
  onSyncNow: () => void
}

export function SyncStatus({ status, onSyncNow }: SyncStatusProps) {
  const stateColors: Record<string, string> = {
    idle: '#666',
    syncing: '#ff8000',
    watching: '#33cc66',
    error: '#e64c4c',
  }

  const stateLabels: Record<string, string> = {
    idle: 'Idle',
    syncing: 'Syncing...',
    watching: 'Connected',
    error: 'Error',
  }

  const state = status?.state || 'idle'

  return (
    <div className="rounded-lg border border-gray-800 bg-[#1a1a1d] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: stateColors[state] }}
          />
          <span className="text-sm font-medium">{stateLabels[state]}</span>
        </div>
        <button
          className="px-3 py-1 text-xs rounded bg-[#ff8000] text-black font-medium hover:bg-[#cc6600] transition-colors disabled:opacity-50"
          onClick={onSyncNow}
          disabled={state === 'syncing'}
        >
          Sync now
        </button>
      </div>

      {status?.lastSync && (
        <p className="text-xs text-gray-500">
          Last sync: {new Date(status.lastSync).toLocaleTimeString()}
        </p>
      )}

      {status?.lastError && (
        <p className="text-xs text-red-400 mt-1">
          {status.lastError}
        </p>
      )}
    </div>
  )
}
