import { useState, useEffect, useCallback } from 'react'
import { SyncStatus } from './components/SyncStatus'
import { PendingQueue } from './components/PendingQueue'
import { Settings } from './components/Settings'
import { AuthView } from './components/Auth'

interface SyncStatusData {
  state: 'idle' | 'syncing' | 'watching' | 'error'
  lastSync: string | null
  lastError: string | null
  pendingAwards: number
  pendingAttendance: number
}

declare global {
  interface Window {
    companion: {
      auth: {
        login: (apiUrl: string) => Promise<{ success: boolean; error?: string }>
        getToken: () => Promise<{ token: string; guildId: string; guildName: string; expiresAt: string } | null>
        logout: () => Promise<void>
      }
      wow: {
        detect: () => Promise<{ basePath: string; versions: Array<{ name: string; path: string; savedVarsPath: string | null }> } | null>
        setPath: (path: string) => Promise<{ basePath: string; versions: Array<{ name: string; path: string }> } | null>
      }
      sync: {
        start: (config: { apiUrl: string; guildId: string; wowPath: string; interval: number }) => Promise<boolean>
        stop: () => Promise<boolean>
        now: () => Promise<boolean>
        getStatus: () => Promise<SyncStatusData>
        onStatus: (callback: (status: SyncStatusData) => void) => () => void
      }
    }
  }
}

type View = 'status' | 'settings'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [guildName, setGuildName] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatusData | null>(null)
  const [view, setView] = useState<View>('status')

  useEffect(() => {
    // Check auth state on load
    window.companion.auth.getToken().then((token) => {
      if (token) {
        setIsAuthenticated(true)
        setGuildName(token.guildName)
      }
    })

    // Listen for sync status updates
    const unsubscribe = window.companion.sync.onStatus((status) => {
      setSyncStatus(status)
    })

    return () => unsubscribe()
  }, [])

  const handleLogin = useCallback(async (apiUrl: string) => {
    const result = await window.companion.auth.login(apiUrl)
    if (result.success) {
      const token = await window.companion.auth.getToken()
      if (token) {
        setIsAuthenticated(true)
        setGuildName(token.guildName)
      }
    }
    return result
  }, [])

  const handleLogout = useCallback(async () => {
    await window.companion.auth.logout()
    setIsAuthenticated(false)
    setGuildName(null)
    setSyncStatus(null)
  }, [])

  if (!isAuthenticated) {
    return <AuthView onLogin={handleLogin} />
  }

  return (
    <div className="h-screen bg-[#141416] text-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0"
           style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className="flex items-center gap-2">
          <span className="text-[#ff8000] font-bold text-sm">LootList+</span>
          <span className="text-gray-500 text-xs">Companion</span>
        </div>
        {guildName && (
          <span className="text-gray-400 text-xs">{guildName}</span>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-800 shrink-0">
        <button
          className={`px-4 py-2 text-xs font-medium transition-colors ${
            view === 'status'
              ? 'text-[#ff8000] border-b-2 border-[#ff8000]'
              : 'text-gray-500 hover:text-gray-300'
          }`}
          onClick={() => setView('status')}
        >
          Sync status
        </button>
        <button
          className={`px-4 py-2 text-xs font-medium transition-colors ${
            view === 'settings'
              ? 'text-[#ff8000] border-b-2 border-[#ff8000]'
              : 'text-gray-500 hover:text-gray-300'
          }`}
          onClick={() => setView('settings')}
        >
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {view === 'status' && (
          <div className="space-y-4">
            <SyncStatus status={syncStatus} onSyncNow={() => window.companion.sync.now()} />
            <PendingQueue
              awards={syncStatus?.pendingAwards || 0}
              attendance={syncStatus?.pendingAttendance || 0}
            />
          </div>
        )}
        {view === 'settings' && (
          <Settings onLogout={handleLogout} />
        )}
      </div>
    </div>
  )
}
