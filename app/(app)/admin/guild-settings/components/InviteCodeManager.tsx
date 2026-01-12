'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Invite Codes</CardTitle>
            <CardDescription>Generate and manage invite codes for your guild</CardDescription>
          </div>
          <Button
            onClick={() => setShowGenerateForm(!showGenerateForm)}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate Code
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <div className="p-4 bg-secondary rounded-lg space-y-4">
            <h3 className="font-medium text-foreground">Generate New Invite Code</h3>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires At (Optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxUses">Max Uses (Optional)</Label>
              <Input
                id="maxUses"
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited if empty"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleGenerateCode}
                disabled={generating}
              >
                {generating ? 'Generating...' : 'Generate'}
              </Button>
              <Button
                onClick={() => setShowGenerateForm(false)}
                variant="outline"
              >
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
                  className={`p-4 bg-secondary rounded-lg border ${
                    !code.is_active || isExpired || isMaxedOut
                      ? 'border-red-600/50 opacity-60'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-background rounded font-mono text-primary">
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

                      <div className="text-sm text-muted-foreground space-y-1">
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
                        <Input
                          value={code.share_url}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          onClick={() => copyToClipboard(code.share_url)}
                          size="sm"
                          variant="outline"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {code.is_active && !isExpired && !isMaxedOut && (
                      <Button
                        onClick={() => handleDeactivateCode(code.id)}
                        size="sm"
                        variant="outline"
                        className="ml-4"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
