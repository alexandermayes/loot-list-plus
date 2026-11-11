'use client'

import { useEffect, useRef, useState } from 'react'
import { useNotification } from '@/app/contexts/NotificationContext'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Label } from '@/components/ui/label'
import { SET_YOUR_FIVE_POST_FAILED_ERROR } from '@/domain/loot/set-your-five'

// Client-side double-tap guard after a send (UI-15). The server keeps its own
// 60-minute cooldown; this only stops a second tap while the result is read.
const SEND_COOLDOWN_MS = 60_000

// Statuses whose error sentence comes from the route and is safe to show as
// written (not an officer, no Discovery tier or channel, cooldown).
const ROUTE_REASON_STATUSES = new Set([400, 403, 429])

interface SetYourFiveSendRowProps {
  guildId: string
  hasChannel: boolean
  // The row only exists for guilds whose active expansion has a guild-active
  // Discovery tier (D-23).
  hasDiscoveryTier: boolean
}

// Counts only, never names. Copy signed off 2026-11-11 (04-19).
function describeResult(sent: number, skipped: number): string {
  if (sent <= 0) return 'Posted in the channel. Nobody to message.'
  const sentText = sent === 1 ? 'Sent to 1 member.' : `Sent to ${sent} members.`
  const skippedText = skipped > 0 ? ` ${skipped} skipped.` : ''
  return `Posted in the channel. ${sentText}${skippedText}`
}

export function SetYourFiveSendRow({ guildId, hasChannel, hasDiscoveryTier }: SetYourFiveSendRowProps) {
  const { showNotification } = useNotification()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [coolingDown, setCoolingDown] = useState(false)
  const [result, setResult] = useState('')
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current)
    }
  }, [])

  if (!hasDiscoveryTier) return null

  const send = async () => {
    setSending(true)
    setResult('')
    try {
      const res = await fetch('/api/discord/set-your-five', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: guildId }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        sent?: number
        skipped?: number
        error?: string
      }
      if (!res.ok) {
        const reason = ROUTE_REASON_STATUSES.has(res.status) && typeof data.error === 'string' ? data.error : null
        showNotification('error', reason ?? SET_YOUR_FIVE_POST_FAILED_ERROR)
        return
      }
      const text = describeResult(Number(data.sent) || 0, Number(data.skipped) || 0)
      setResult(text)
      showNotification('success', text)
      setCoolingDown(true)
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current)
      cooldownTimer.current = setTimeout(() => setCoolingDown(false), SEND_COOLDOWN_MS)
    } catch {
      showNotification('error', SET_YOUR_FIVE_POST_FAILED_ERROR)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="pt-2 border-t border-border space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          {/* No htmlFor: a label tied to the button would replace its own name. */}
          <Label>Ask raiders to set their 5</Label>
          <p id="setYourFiveHelp" className="text-muted-foreground text-11">
            Posts a message in the raid summary channel and sends each member a direct message with a link to the picker.
          </p>
          {!hasChannel && (
            <p className="text-muted-foreground text-11">Choose a raid summary channel first.</p>
          )}
        </div>
        <Button
          aria-describedby="setYourFiveHelp"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => setConfirmOpen(true)}
          loading={sending}
          loadingText="Sending..."
          disabled={!hasChannel || coolingDown}
        >
          Send Set your 5
        </Button>
      </div>
      {/* Always mounted so assistive tech announces the text when it appears. */}
      <p role="status" className="text-12 text-foreground-secondary">
        {result}
      </p>
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        // Starts the send and returns at once so the modal closes and the
        // button below shows "Sending..." instead of the modal.
        onConfirm={() => {
          setConfirmOpen(false)
          void send()
        }}
        title="Send Set your 5 to your guild?"
        description="This posts in the raid summary channel and sends a direct message to every active member with Discord linked. Members who have direct messages turned off are skipped quietly."
        confirmLabel="Send Set your 5"
        cancelLabel="Not now"
        variant="default"
      />
    </div>
  )
}
