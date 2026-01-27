'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import { Copy01Icon, Cancel01Icon, Add01Icon } from '@hugeicons/core-free-icons'

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
    <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[24px] font-semibold text-foreground">Invite Codes</h2>
            <p className="text-muted-foreground text-[13px] mt-1">Generate and manage invite codes for your guild</p>
          </div>
          <Button size="sm" onClick={() => setShowGenerateForm(!showGenerateForm)}>
            <HugeiconsIcon icon={Add01Icon} size={16} />
            Generate Code
          </Button>
        </div>
      </div>
      <div className="p-6 space-y-4">
        {message && (
          <div className={`p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-success/10 border border-success/50 text-success'
              : 'bg-destructive/10 border border-destructive/50 text-destructive'
          }`}>
            {message.text}
          </div>
        )}

        {/* Generate Form */}
        {showGenerateForm && (
          <div className="p-4 bg-background-subtle border border-border rounded-lg space-y-4">
            <h3 className="font-medium text-foreground text-[14px]">Generate New Invite Code</h3>

            <div className="space-y-2">
              <label htmlFor="expiresAt" className="block text-[13px] font-medium text-foreground">Expires At (Optional)</label>
              <input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-5 py-3 bg-background-elevated border border-border-strong rounded-[52px] text-foreground text-[13px] focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="maxUses" className="block text-[13px] font-medium text-foreground">Max Uses (Optional)</label>
              <input
                id="maxUses"
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited if empty"
                className="w-full px-5 py-3 bg-background-elevated border border-border-strong rounded-[52px] text-foreground text-[13px] focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleGenerateCode} loading={generating}>
                Generate
              </Button>
              <Button variant="secondary" onClick={() => setShowGenerateForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Invite Codes List */}
        {loading ? (
          <p className="text-muted-foreground text-center py-4">Loading...</p>
        ) : inviteCodes.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No invite codes yet</p>
        ) : (
          <div className="space-y-3">
            {inviteCodes.map((code) => {
              const isExpired = code.expires_at && new Date(code.expires_at) < new Date()
              const isMaxedOut = code.max_uses && code.current_uses >= code.max_uses

              return (
                <div
                  key={code.id}
                  className={`p-4 bg-background-subtle rounded-lg border ${
                    !code.is_active || isExpired || isMaxedOut
                      ? 'border-destructive/50 opacity-60'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-background-elevated rounded font-mono text-foreground text-[13px]">
                          {code.code}
                        </code>
                        {!code.is_active && (
                          <span className="px-2 py-1 bg-destructive/20 text-destructive text-xs rounded">
                            Deactivated
                          </span>
                        )}
                        {isExpired && (
                          <span className="px-2 py-1 bg-destructive/20 text-destructive text-xs rounded">
                            Expired
                          </span>
                        )}
                        {isMaxedOut && (
                          <span className="px-2 py-1 bg-destructive/20 text-destructive text-xs rounded">
                            Max Uses Reached
                          </span>
                        )}
                      </div>

                      <div className="text-[13px] text-muted-foreground space-y-1">
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
                          className="flex-1 px-3 py-2 bg-background-elevated border border-border-strong rounded-lg text-foreground text-[13px] font-mono focus:outline-none"
                        />
                        <button
                          onClick={() => copyToClipboard(code.share_url)}
                          className="p-2 bg-background-elevated hover:bg-muted border border-border rounded-lg text-foreground transition"
                        >
                          <HugeiconsIcon icon={Copy01Icon} size={16} />
                        </button>
                      </div>
                    </div>

                    {code.is_active && !isExpired && !isMaxedOut && (
                      <button
                        onClick={() => handleDeactivateCode(code.id)}
                        className="ml-4 p-2 bg-background-elevated hover:bg-destructive/10 border border-border hover:border-destructive/30 rounded-lg text-destructive hover:text-destructive transition"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} size={16} />
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
