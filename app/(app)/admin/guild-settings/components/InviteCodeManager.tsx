'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { Copy, X, Plus } from 'lucide-react'

interface InviteCode {
  id: string
  code: string
  share_url: string
  expires_at: string | null
  max_uses: number | null
  current_uses: number
  is_active: boolean
  created_at: string
}

export default function InviteCodeManager() {
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showGenerateForm, setShowGenerateForm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Form state
  const [expiresAt, setExpiresAt] = useState('')
  const [maxUses, setMaxUses] = useState('')

  const supabase = createClient()
  const { activeGuild } = useGuildContext()

  useEffect(() => {
    if (activeGuild) {
      loadInviteCodes()
    }
  }, [activeGuild])

  const loadInviteCodes = async () => {
    if (!activeGuild) return

    setLoading(true)
    try {
      const response = await fetch(`/api/guild-invites?guild_id=${activeGuild.id}`)
      const data = await response.json()

      if (response.ok) {
        setInviteCodes(data.invite_codes || [])
      }
    } catch (error) {
      console.error('Error loading invite codes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateCode = async () => {
    if (!activeGuild) return

    setGenerating(true)
    setMessage(null)

    try {
      const response = await fetch('/api/guild-invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          guild_id: activeGuild.id,
          expires_at: expiresAt || null,
          max_uses: maxUses ? parseInt(maxUses) : null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to generate invite code' })
        return
      }

      setMessage({ type: 'success', text: 'Invite code generated successfully!' })
      setShowGenerateForm(false)
      setExpiresAt('')
      setMaxUses('')
      await loadInviteCodes()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to generate invite code' })
    } finally {
      setGenerating(false)
    }
  }

  const handleDeactivateCode = async (codeId: string) => {
    if (!confirm('Are you sure you want to deactivate this invite code?')) return

    try {
      const { error } = await supabase
        .from('guild_invite_codes')
        .update({ is_active: false })
        .eq('id', codeId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Invite code deactivated' })
      await loadInviteCodes()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to deactivate code' })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setMessage({ type: 'success', text: 'Copied to clipboard!' })
    setTimeout(() => setMessage(null), 2000)
  }

  return (
    <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden">
      <div className="p-6 border-b border-[rgba(255,255,255,0.1)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[24px] font-semibold text-white">Invite Codes</h2>
            <p className="text-[#a1a1a1] text-[13px] mt-1">Generate and manage invite codes for your guild</p>
          </div>
          <button
            onClick={() => setShowGenerateForm(!showGenerateForm)}
            className="px-4 py-2 bg-white hover:bg-gray-100 rounded-[40px] text-black font-medium text-[13px] transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Generate Code
          </button>
        </div>
      </div>
      <div className="p-6 space-y-4">
        {message && (
          <div className={`p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-950/50 border border-green-600/50 text-green-200'
              : 'bg-red-950/50 border border-red-600/50 text-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Generate Form */}
        {showGenerateForm && (
          <div className="p-4 bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-4">
            <h3 className="font-medium text-white text-[14px]">Generate New Invite Code</h3>

            <div className="space-y-2">
              <label htmlFor="expiresAt" className="block text-[13px] font-medium text-white">Expires At (Optional)</label>
              <input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="maxUses" className="block text-[13px] font-medium text-white">Max Uses (Optional)</label>
              <input
                id="maxUses"
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited if empty"
                className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000]"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleGenerateCode}
                disabled={generating}
                className="px-5 py-3 bg-white hover:bg-gray-100 disabled:opacity-50 rounded-[40px] text-black font-medium text-[16px] transition"
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
              <button
                onClick={() => setShowGenerateForm(false)}
                className="px-5 py-3 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[40px] text-white font-medium text-[16px] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Invite Codes List */}
        {loading ? (
          <p className="text-[#a1a1a1] text-center py-4">Loading...</p>
        ) : inviteCodes.length === 0 ? (
          <p className="text-[#a1a1a1] text-center py-4">No invite codes yet</p>
        ) : (
          <div className="space-y-3">
            {inviteCodes.map((code) => {
              const isExpired = code.expires_at && new Date(code.expires_at) < new Date()
              const isMaxedOut = code.max_uses && code.current_uses >= code.max_uses

              return (
                <div
                  key={code.id}
                  className={`p-4 bg-[#0d0e11] rounded-lg border ${
                    !code.is_active || isExpired || isMaxedOut
                      ? 'border-red-600/50 opacity-60'
                      : 'border-[rgba(255,255,255,0.1)]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-[#151515] rounded font-mono text-white text-[13px]">
                          {code.code}
                        </code>
                        {!code.is_active && (
                          <span className="px-2 py-1 bg-red-950/50 text-red-200 text-xs rounded">
                            Deactivated
                          </span>
                        )}
                        {isExpired && (
                          <span className="px-2 py-1 bg-red-950/50 text-red-200 text-xs rounded">
                            Expired
                          </span>
                        )}
                        {isMaxedOut && (
                          <span className="px-2 py-1 bg-red-950/50 text-red-200 text-xs rounded">
                            Max Uses Reached
                          </span>
                        )}
                      </div>

                      <div className="text-[13px] text-[#a1a1a1] space-y-1">
                        <p>
                          Uses: {code.current_uses}
                          {code.max_uses ? ` / ${code.max_uses}` : ' (unlimited)'}
                        </p>
                        {code.expires_at && (
                          <p>Expires: {new Date(code.expires_at).toLocaleString()}</p>
                        )}
                        <p>Created: {new Date(code.created_at).toLocaleString()}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          value={code.share_url}
                          readOnly
                          className="flex-1 px-3 py-2 bg-[#151515] border border-[#383838] rounded-lg text-white text-[13px] font-mono focus:outline-none"
                        />
                        <button
                          onClick={() => copyToClipboard(code.share_url)}
                          className="p-2 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-lg text-white transition"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {code.is_active && !isExpired && !isMaxedOut && (
                      <button
                        onClick={() => handleDeactivateCode(code.id)}
                        className="ml-4 p-2 bg-[#151515] hover:bg-red-950/50 border border-[rgba(255,255,255,0.1)] hover:border-red-600/30 rounded-lg text-red-400 hover:text-red-300 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
