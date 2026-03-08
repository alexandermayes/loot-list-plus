import { useState } from 'react'

interface AuthViewProps {
  onLogin: (apiUrl: string) => Promise<{ success: boolean; error?: string }>
}

export function AuthView({ onLogin }: AuthViewProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    setIsLoading(true)
    setError(null)

    // Default to production URL
    const apiUrl = 'https://lootlistplus.com'
    const result = await onLogin(apiUrl)

    if (!result.success) {
      setError(result.error || 'Login failed')
    }
    setIsLoading(false)
  }

  return (
    <div className="h-screen bg-[#141416] flex items-center justify-center">
      <div className="text-center space-y-6 max-w-xs">
        <div>
          <h1 className="text-xl font-bold text-[#ff8000]">LootList+</h1>
          <p className="text-xs text-gray-500 mt-1">Companion App</p>
        </div>

        <p className="text-sm text-gray-400">
          Connect your LootList+ account to sync guild data with the WoW addon automatically.
        </p>

        <button
          className="w-full px-4 py-2.5 rounded-lg bg-[#ff8000] text-black font-medium text-sm hover:bg-[#cc6600] transition-colors disabled:opacity-50"
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? 'Connecting...' : 'Log in with LootList+'}
        </button>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        <p className="text-xs text-gray-600">
          Requires an officer account on LootList+.
        </p>
      </div>
    </div>
  )
}
