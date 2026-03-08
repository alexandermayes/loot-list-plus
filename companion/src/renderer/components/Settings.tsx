import { useState, useEffect } from 'react'

interface SettingsProps {
  onLogout: () => void
}

export function Settings({ onLogout }: SettingsProps) {
  const [wowPath, setWowPath] = useState<string | null>(null)
  const [wowVersions, setWowVersions] = useState<Array<{ name: string; path: string }>>([])
  const [syncInterval, setSyncInterval] = useState(5)
  const [isDetecting, setIsDetecting] = useState(false)

  useEffect(() => {
    detectWoW()
  }, [])

  const detectWoW = async () => {
    setIsDetecting(true)
    const result = await window.companion.wow.detect()
    if (result) {
      setWowPath(result.basePath)
      setWowVersions(result.versions)
    }
    setIsDetecting(false)
  }

  return (
    <div className="space-y-6">
      {/* WoW Path */}
      <div>
        <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">WoW installation</h3>
        <div className="rounded-lg border border-gray-800 bg-[#1a1a1d] p-4 space-y-3">
          {wowPath ? (
            <>
              <p className="text-sm text-gray-300 font-mono text-xs break-all">{wowPath}</p>
              {wowVersions.map((v) => (
                <div key={v.name} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-400">{v.name}</span>
                </div>
              ))}
            </>
          ) : (
            <p className="text-xs text-gray-500">
              {isDetecting ? 'Detecting...' : 'WoW installation not found.'}
            </p>
          )}
          <button
            className="px-3 py-1 text-xs rounded border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
            onClick={detectWoW}
            disabled={isDetecting}
          >
            {wowPath ? 'Re-detect' : 'Detect'}
          </button>
        </div>
      </div>

      {/* Sync Interval */}
      <div>
        <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">Sync interval</h3>
        <div className="rounded-lg border border-gray-800 bg-[#1a1a1d] p-4">
          <div className="flex items-center gap-3">
            <select
              value={syncInterval}
              onChange={(e) => setSyncInterval(Number(e.target.value))}
              className="bg-[#141416] border border-gray-700 rounded px-2 py-1 text-sm text-gray-300"
            >
              <option value={1}>Every 1 minute</option>
              <option value={2}>Every 2 minutes</option>
              <option value={5}>Every 5 minutes</option>
              <option value={10}>Every 10 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
            </select>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            How often to check for new data from the web app.
            File changes from the addon are detected instantly.
          </p>
        </div>
      </div>

      {/* Account */}
      <div>
        <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">Account</h3>
        <div className="rounded-lg border border-gray-800 bg-[#1a1a1d] p-4">
          <button
            className="px-3 py-1 text-xs rounded border border-red-800 text-red-400 hover:bg-red-900/30 transition-colors"
            onClick={onLogout}
          >
            Log out
          </button>
        </div>
      </div>

      {/* Version */}
      <p className="text-xs text-gray-600 text-center">
        LootList+ Companion v1.0.0
      </p>
    </div>
  )
}
