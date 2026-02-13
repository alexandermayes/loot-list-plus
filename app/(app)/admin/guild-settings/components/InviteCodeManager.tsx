'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HugeiconsIcon } from '@hugeicons/react'
import { Copy01Icon, Cancel01Icon, Add01Icon } from '@hugeicons/core-free-icons'
import { trackClientEvent } from '@/utils/analytics/client'

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

  // Form state
  const [expiresAt, setExpiresAt] = useState('')
  const [maxUses, setMaxUses] = useState('')

  const supabase = createClient()
  const { activeGuild } = useGuildContext()
  const { showNotification } = useNotification()
  const { confirm, ConfirmDialog } = useConfirm()

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
      showNotification('error', 'Couldn\'t load invite codes. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateCode = async () => {
    if (!activeGuild) return

    setGenerating(true)

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
        showNotification('error', data.error || 'Couldn\'t generate invite code. Try again.')
        return
      }

      showNotification('success', 'Invite code created')
      trackClientEvent('invite_code_created')
      setShowGenerateForm(false)
      setExpiresAt('')
      setMaxUses('')
      await loadInviteCodes()
    } catch (error: any) {
      showNotification('error', error.message || 'Couldn\'t generate invite code. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleDeactivateCode = (codeId: string) => {
    confirm({
      title: 'Deactivate invite code',
      description: 'Are you sure you want to deactivate this invite code? It will no longer be usable.',
      confirmLabel: 'Deactivate',
      variant: 'warning',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('guild_invite_codes')
            .update({ is_active: false })
            .eq('id', codeId)

          if (error) throw error

          showNotification('success', 'Invite code deactivated')
          await loadInviteCodes()
        } catch (error: any) {
          showNotification('error', error.message || 'Couldn\'t deactivate code. Try again.')
        }
      }
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showNotification('success', 'Copied to clipboard', 2000)
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
        {/* Generate Form */}
        {showGenerateForm && (
          <div className="p-4 bg-background-subtle border border-border rounded-lg space-y-4">
            <h3 className="font-medium text-foreground text-[14px]">Generate new invite code</h3>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires At (Optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                variant="rounded"
                size="sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxUses">Max Uses (Optional)</Label>
              <Input
                id="maxUses"
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited if empty"
                variant="rounded"
                size="sm"
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
                        <Input
                          value={code.share_url}
                          readOnly
                          variant="rounded"
                          size="sm"
                          className="flex-1 font-mono"
                        />
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => copyToClipboard(code.share_url)}
                        >
                          <HugeiconsIcon icon={Copy01Icon} size={16} />
                        </Button>
                      </div>
                    </div>

                    {code.is_active && !isExpired && !isMaxedOut && (
                      <Button
                        variant="destructive-outline"
                        size="icon"
                        onClick={() => handleDeactivateCode(code.id)}
                        className="ml-4"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {ConfirmDialog}
    </div>
  )
}
