'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import { InformationCircleIcon, Cancel01Icon } from '@hugeicons/core-free-icons'
import { useNotification } from '@/app/contexts/NotificationContext'

interface Member {
  id: string
  name: string
}

interface GuardianConversionBannerProps {
  guildId: string
}

export default function GuardianConversionBanner({ guildId }: GuardianConversionBannerProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [guardianSpecId, setGuardianSpecId] = useState<string | null>(null)
  const [classColor, setClassColor] = useState<string>('#ff7c0a')
  const [dismissed, setDismissed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const { showNotification } = useNotification()

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/feral-conversion-count`)
      if (!res.ok) return
      const data = await res.json()
      setMembers(data.members || [])
      setGuardianSpecId(data.guardianSpecId || null)
      if (data.classColor) setClassColor(data.classColor)
    } catch {
      // Silently fail
    } finally {
      setLoaded(true)
    }
  }, [guildId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  async function updateSpec(characterId: string, characterName: string, toGuardian: boolean) {
    setUpdatingId(characterId)
    try {
      const res = await fetch(`/api/guilds/${guildId}/feral-conversion-count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId,
          specId: toGuardian ? guardianSpecId : undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to update')

      const action = toGuardian ? 'Guardian (Tank)' : 'Feral (DPS)'
      showNotification('success', `${characterName} set to ${action}.`)

      // Remove from local list
      setMembers(prev => prev.filter(m => m.id !== characterId))
    } catch {
      showNotification('error', 'Something went wrong. Try again.')
    } finally {
      setUpdatingId(null)
    }
  }

  // Auto-clear: don't render if no members left
  if (!loaded || members.length === 0 || dismissed) return null

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <HugeiconsIcon icon={InformationCircleIcon} size={16} className="text-accent shrink-0" />
        <p className="flex-1 text-sm text-foreground">
          {members.length} guild {members.length === 1 ? 'member hasn\'t' : 'members haven\'t'} chosen between Feral (DPS) and Guardian (Tank).{' '}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-accent hover:underline font-medium"
          >
            {expanded ? 'Hide' : 'Show members'}
          </button>
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={16} />
        </button>
      </div>

      {/* Expandable member list */}
      {expanded && (
        <div className="mt-3 space-y-2 pl-7">
          {members.map(member => (
            <div key={member.id} className="flex items-center gap-3">
              <span
                className="text-sm font-medium min-w-[100px]"
                style={{ color: classColor }}
              >
                {member.name}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateSpec(member.id, member.name, false)}
                  loading={updatingId === member.id}
                  disabled={updatingId !== null}
                >
                  Keep Feral
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => updateSpec(member.id, member.name, true)}
                  loading={updatingId === member.id}
                  disabled={updatingId !== null}
                >
                  Switch to Guardian
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
