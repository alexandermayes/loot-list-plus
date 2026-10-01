'use client'

// Add one timed bonus for a pasted list of raiders (#329).
// Name parsing and matching come from the same module as the raid-tracking
// import, so a paste matches the same raiders in both places.

import { useId, useMemo, useState } from 'react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import { SegmentedControl } from '@/components/ui/segmented-control'
import {
  parseRosterNames,
  createRosterMatcher,
  matchRosterNames,
  nameSimilarity,
  type RosterAlias,
} from '@/domain/guild/roster-name-match'
import {
  getCurrentResetWeekEnd,
  resolveBonusWindow,
  formatBonusDate,
  RAIDER_BONUS_LABEL_MAX,
  type BonusWindowMode,
} from '@/domain/scoring'

export interface BulkRaiderBonusDraft {
  characterIds: string[]
  amount: number
  label: string | null
  starts_at: string | null
  expires_at: string
  aliasesToSave: RosterAlias[]
}

export interface BulkRaiderBonusRosterEntry {
  id: string
  name: string
  classColor?: string | null
}

interface BulkRaiderBonusModalProps {
  open: boolean
  onClose: () => void
  roster: BulkRaiderBonusRosterEntry[]
  aliases: RosterAlias[]
  /** Local YYYY-MM-DD. */
  today: string
  weekResetDay: number | null
  saving: boolean
  onSave: (draft: BulkRaiderBonusDraft) => void
}

const DURATION_OPTIONS: { value: BonusWindowMode; label: string }[] = [
  { value: 'this-week', label: 'This week' },
  { value: 'next-week', label: 'Next week' },
  { value: 'custom', label: 'Custom dates' },
]

const NAMES_PLACEHOLDER = 'Paste character names (one per line, comma, or semicolon separated)\n\nZev\nDeny\nCheck'

function raiders(n: number): string {
  return n === 1 ? '1 raider' : `${n} raiders`
}

function NameChip({ name, classColor }: { name: string; classColor?: string | null }) {
  return (
    <span
      className={`text-12 font-medium${classColor ? '' : ' text-foreground'}`}
      style={classColor ? { color: classColor } : undefined}
    >
      {name}
    </span>
  )
}

export function BulkRaiderBonusModal({
  open,
  onClose,
  roster,
  aliases,
  today,
  weekResetDay,
  saving,
  onSave,
}: BulkRaiderBonusModalProps) {
  const ids = useId()
  const [namesText, setNamesText] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [mode, setMode] = useState<BonusWindowMode>('next-week')
  const [customStart, setCustomStart] = useState(today)
  const [customEnd, setCustomEnd] = useState(() => getCurrentResetWeekEnd(today, weekResetDay))
  // Keyed by the lowercased unmatched name.
  const [picks, setPicks] = useState<Map<string, { characterId: string; remember: boolean }>>(() => new Map())

  const matcher = useMemo(
    () => createRosterMatcher(roster, aliases, r => r.id, r => r.name),
    [roster, aliases],
  )

  const match = useMemo(
    () => matchRosterNames(parseRosterNames(namesText), matcher),
    [namesText, matcher],
  )
  const hasNames = match.matched.length + match.unmatched.length > 0
  const directCount = match.matched.filter(m => m.via === 'name').length
  const aliasCount = match.matched.length - directCount

  // Roster sorted by similarity to each unmatched name, closest first.
  const suggestions = useMemo(() => {
    const out = new Map<string, BulkRaiderBonusRosterEntry[]>()
    for (const name of match.unmatched) {
      out.set(name, [...roster].sort((a, b) => nameSimilarity(b.name, name) - nameSimilarity(a.name, name)))
    }
    return out
  }, [match.unmatched, roster])

  // Only picks for names still in the paste count.
  const activePicks = match.unmatched
    .map(name => ({ name, pick: picks.get(name.toLowerCase()) }))
    .filter((p): p is { name: string; pick: { characterId: string; remember: boolean } } => !!p.pick)

  const characterIds = [...new Set([...match.matched.map(m => m.id), ...activePicks.map(p => p.pick.characterId)])]

  const amountNumber = Number(amount)
  const amountValid = amount.trim() !== '' && Number.isFinite(amountNumber) && amountNumber !== 0

  const bonusWindow = resolveBonusWindow(mode, today, weekResetDay, { start: customStart, end: customEnd })

  const canSave = characterIds.length > 0 && amountValid && bonusWindow.ok && !saving

  const setPick = (name: string, characterId: string) => {
    setPicks(prev => {
      const next = new Map(prev)
      const key = name.toLowerCase()
      if (!characterId) next.delete(key)
      else next.set(key, { characterId, remember: prev.get(key)?.remember ?? true })
      return next
    })
  }

  const setRemember = (name: string, remember: boolean) => {
    setPicks(prev => {
      const key = name.toLowerCase()
      const current = prev.get(key)
      if (!current) return prev
      const next = new Map(prev)
      next.set(key, { ...current, remember })
      return next
    })
  }

  const handleSave = () => {
    if (!canSave || !bonusWindow.ok) return
    const label = reason.trim()
    onSave({
      characterIds,
      amount: amountNumber,
      label: label === '' ? null : label,
      starts_at: bonusWindow.starts_at,
      expires_at: bonusWindow.expires_at,
      aliasesToSave: activePicks
        .filter(p => p.pick.remember)
        .map(p => ({ alias_name: p.name.toLowerCase(), character_id: p.pick.characterId })),
    })
  }

  const close = () => {
    if (!saving) onClose()
  }

  let windowText: string | null = null
  let windowError: string | null = null
  if (bonusWindow.ok) {
    windowText = bonusWindow.starts_at
      ? `${formatBonusDate(bonusWindow.starts_at)} to ${formatBonusDate(bonusWindow.expires_at)}`
      : `Until ${formatBonusDate(bonusWindow.expires_at)}`
  } else {
    windowError = bonusWindow.reason === 'end-before-start'
      ? "The end date can't be before the start date."
      : 'Pick an end date from today on.'
  }

  return (
    <Modal open={open} onClose={close} size="lg">
      <ModalHeader onClose={close}>
        <ModalTitle>Add a bonus for many raiders</ModalTitle>
        <ModalDescription>
          Paste names from your raid, a sheet or Discord. Everyone matched gets the same bonus.
        </ModalDescription>
      </ModalHeader>
      <ModalBody className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor={`${ids}-names`}>Raiders</Label>
          <Textarea
            id={`${ids}-names`}
            variant="rounded"
            value={namesText}
            onChange={(e) => setNamesText(e.target.value)}
            placeholder={NAMES_PLACEHOLDER}
            className="h-36 resize-none"
          />
          {hasNames && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" aria-live="polite">
              <span className="text-success">{directCount} matched</span>
              {aliasCount > 0 && <span className="text-accent">{aliasCount} via alias</span>}
              {match.unmatched.length > 0 && <span className="text-warning">{match.unmatched.length} unmatched</span>}
              {activePicks.length > 0 && <span className="text-muted-foreground">{activePicks.length} picked</span>}
              {match.repeatedCount > 0 && (
                <span className="text-muted-foreground">{match.repeatedCount} repeated names ignored</span>
              )}
            </div>
          )}
          {match.matched.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {match.matched.map(m => (
                <NameChip key={m.id} name={m.member.name} classColor={m.member.classColor} />
              ))}
            </div>
          )}
        </div>

        {match.unmatched.length > 0 && (
          <div className="space-y-2">
            <p className="text-12 text-muted-foreground">Not matched. These names are skipped unless you pick a raider.</p>
            <div className="space-y-2">
              {match.unmatched.map(name => {
                const pick = picks.get(name.toLowerCase())
                const rememberId = `${ids}-remember-${name.toLowerCase()}`
                return (
                  <div
                    key={name.toLowerCase()}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 bg-background border border-border rounded-lg px-3 py-2"
                  >
                    <span className="text-13 font-medium text-foreground sm:w-36 truncate">{name}</span>
                    <Select
                      variant="rounded"
                      size="sm"
                      value={pick?.characterId ?? ''}
                      onChange={(e) => setPick(name, e.target.value)}
                      className="sm:flex-1"
                      aria-label={`Raider for ${name}`}
                    >
                      <option value="">Skip</option>
                      {(suggestions.get(name) || []).map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </Select>
                    {pick && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Checkbox
                          id={rememberId}
                          size="sm"
                          checked={pick.remember}
                          onCheckedChange={(checked) => setRemember(name, checked === true)}
                        />
                        <Label htmlFor={rememberId} className="text-12 font-normal">Remember this name</Label>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${ids}-amount`}>Amount</Label>
            <Input
              id={`${ids}-amount`}
              variant="rounded"
              size="sm"
              type="number"
              inputMode="numeric"
              step="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="+5 or -2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${ids}-reason`}>Reason (optional)</Label>
            <Input
              id={`${ids}-reason`}
              variant="rounded"
              size="sm"
              value={reason}
              maxLength={RAIDER_BONUS_LABEL_MAX}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Full enchants and world buffs"
              aria-describedby={`${ids}-reason-hint`}
            />
            <p id={`${ids}-reason-hint`} className="text-12 text-muted-foreground">
              Raiders see this reason in their score breakdown.
            </p>
          </div>
        </div>

        <div className="space-y-2" role="group" aria-labelledby={`${ids}-applies`}>
          <Label id={`${ids}-applies`}>Applies</Label>
          <div>
            <SegmentedControl options={DURATION_OPTIONS} value={mode} onChange={setMode} size="sm" />
          </div>
          {mode === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${ids}-start`}>Starts</Label>
                <DatePicker
                  id={`${ids}-start`}
                  variant="rounded"
                  size="sm"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${ids}-end`}>Ends</Label>
                <DatePicker
                  id={`${ids}-end`}
                  variant="rounded"
                  size="sm"
                  value={customEnd}
                  min={today}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </div>
          )}
          {windowText && <p className="text-12 text-muted-foreground">{windowText}</p>}
          {windowError && <p className="text-12 text-destructive" role="alert">{windowError}</p>}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={close} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!canSave}>
          {`Add bonus for ${raiders(characterIds.length)}`}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
