'use client'

// Raider bonuses card on Loot Management > Priorities (#329).
// Officers add one raider at a time here, or open the bulk modal to paste a
// list. Bonuses from one paste share a batch id and show as a single row.

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  getCurrentResetWeekEnd,
  groupRaiderBonuses,
  removeRaiderBonusBatch,
  removeRaiderBonusEntry,
  tidyRaiderModifiers,
  formatBonusDate,
  type RaiderBonusEntry,
  type RaiderBonusMap,
  type RaiderBonusStatus,
} from '@/domain/scoring'

interface RaiderBonusCharacter {
  id: string
  name: string
  class?: { name: string; color_hex: string } | null
}

interface RaiderBonusesCardProps {
  characters: RaiderBonusCharacter[]
  raiderMods: RaiderBonusMap
  /** Local YYYY-MM-DD. */
  today: string
  weekResetDay: number | null
  saving: boolean
  /** Saves the whole map; resolves true on success. */
  onPersist: (next: RaiderBonusMap) => Promise<boolean>
  onAddForMany: () => void
}

function raiderCount(n: number): string {
  return n === 1 ? '1 raider' : `${n} raiders`
}

/** Status text and colour for a bonus row. */
function StatusText({ status, starts_at, expires_at }: {
  status: RaiderBonusStatus
  starts_at: string | null
  expires_at: string | null
}) {
  if (status === 'upcoming' && starts_at) {
    return <span className="text-11 text-accent whitespace-nowrap">starts {formatBonusDate(starts_at)}</span>
  }
  if (status === 'ended' && expires_at) {
    return <span className="text-11 text-muted-foreground whitespace-nowrap">ended {formatBonusDate(expires_at)}</span>
  }
  if (expires_at) {
    return <span className="text-11 text-warning whitespace-nowrap">until {formatBonusDate(expires_at)}</span>
  }
  return <span className="text-11 text-muted-foreground whitespace-nowrap">permanent</span>
}

function Amount({ amount, ended }: { amount: number; ended: boolean }) {
  const positive = amount > 0
  const tone = ended ? 'text-muted-foreground' : positive ? 'text-success' : 'text-destructive'
  return (
    <span className={`text-13 font-semibold tabular-nums ${tone}`}>
      {positive ? '+' : ''}{amount}
    </span>
  )
}

export function RaiderBonusesCard({
  characters,
  raiderMods,
  today,
  weekResetDay,
  saving,
  onPersist,
  onAddForMany,
}: RaiderBonusesCardProps) {
  const [addRaiderId, setAddRaiderId] = useState('')
  const [addAmount, setAddAmount] = useState('')
  const [addDuration, setAddDuration] = useState<'permanent' | 'week'>('permanent')

  const charactersById = useMemo(
    () => new Map(characters.map((c) => [c.id, c])),
    [characters],
  )

  const thisWeekExpiry = useMemo(
    () => getCurrentResetWeekEnd(today, weekResetDay),
    [today, weekResetDay],
  )

  const { batches, singles, endedCount } = useMemo(
    () => groupRaiderBonuses(raiderMods, today, (id) => charactersById.get(id)?.name || ''),
    [raiderMods, today, charactersById],
  )

  const nameStyle = (id: string) => {
    const color = charactersById.get(id)?.class?.color_hex
    return color
      ? { className: '', style: { color } }
      : { className: ' text-foreground', style: undefined }
  }

  const handleAddRaiderBonus = () => {
    const amount = Number(addAmount)
    if (!addRaiderId || addAmount.trim() === '' || Number.isNaN(amount) || amount === 0) return
    const expires_at = addDuration === 'week' ? thisWeekExpiry : null
    const entry: RaiderBonusEntry = { amount, expires_at }
    const next = { ...raiderMods, [addRaiderId]: [...(raiderMods[addRaiderId] || []), entry] }
    setAddRaiderId('')
    setAddAmount('')
    setAddDuration('permanent')
    onPersist(next)
  }

  const isEmpty = batches.length === 0 && singles.length === 0

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-15 font-semibold text-foreground">Raider bonuses</p>
          <p className="text-12 text-muted-foreground text-pretty">
            Give raiders a bonus or penalty on every item&apos;s Loot Score. Add one raider here, or paste a list for a timed bonus.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {saving && <span className="text-12 text-muted-foreground">Saving...</span>}
          <Button variant="outline" size="sm" onClick={onAddForMany}>
            Add for many raiders
          </Button>
        </div>
      </div>

      {/* Add row */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Select
          variant="rounded"
          size="sm"
          value={addRaiderId}
          onChange={(e) => setAddRaiderId(e.target.value)}
          className="sm:flex-1"
          aria-label="Raider"
        >
          <option value="">Select a raider...</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Input
          variant="rounded"
          size="sm"
          type="number"
          inputMode="numeric"
          step="0.1"
          value={addAmount}
          onChange={(e) => setAddAmount(e.target.value)}
          placeholder="+5 or -2"
          className="sm:w-32"
          aria-label="Amount"
        />
        <Select
          variant="rounded"
          size="sm"
          value={addDuration}
          onChange={(e) => setAddDuration(e.target.value as 'permanent' | 'week')}
          className="sm:w-56"
          aria-label="Duration"
        >
          <option value="permanent">Permanent</option>
          <option value="week">This week (until {formatBonusDate(thisWeekExpiry)})</option>
        </Select>
        <Button
          variant="primary"
          size="sm"
          onClick={handleAddRaiderBonus}
          disabled={!addRaiderId || addAmount.trim() === '' || Number(addAmount) === 0}
        >
          Add
        </Button>
      </div>

      {/* Configured list */}
      {isEmpty ? (
        <p className="text-12 text-muted-foreground">No raider bonuses yet. Add one above.</p>
      ) : (
        <div className="space-y-2">
          {batches.map((batch) => {
            const n = batch.raiders.length
            const ended = batch.status === 'ended'
            return (
              <div key={batch.batchId} className="bg-background border border-border rounded-lg px-3 py-2 space-y-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={`flex-1 min-w-0 text-13 font-medium truncate ${ended ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {batch.label || (n === 1 ? 'Bonus for 1 raider' : `Bonus for ${n} raiders`)}
                  </span>
                  <Amount amount={batch.amount} ended={ended} />
                  <StatusText status={batch.status} starts_at={batch.starts_at} expires_at={batch.expires_at} />
                  <span className="text-11 text-muted-foreground whitespace-nowrap">{raiderCount(n)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPersist(removeRaiderBonusBatch(raiderMods, batch.batchId))}
                    aria-label={`Remove this bonus for all ${n} raiders`}
                  >
                    Remove all
                  </Button>
                </div>
                <div className="flex flex-wrap gap-x-1 gap-y-1">
                  {batch.raiders.map(({ characterId, index }) => {
                    const name = charactersById.get(characterId)?.name || 'Unknown raider'
                    const { className, style } = nameStyle(characterId)
                    return (
                      <span key={`${characterId}-${index}`} className="inline-flex items-center">
                        <span className={`text-12 font-medium${className}`} style={style}>{name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPersist(removeRaiderBonusEntry(raiderMods, characterId, index))}
                          className="!px-2"
                          aria-label={`Remove ${name} from this bonus`}
                        >
                          ✕
                        </Button>
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {singles.map(({ characterId, index, entry, status }) => {
            const char = charactersById.get(characterId)
            const { className, style } = nameStyle(characterId)
            return (
              <div key={`${characterId}-${index}`} className="flex items-center gap-3 bg-background border border-border rounded-lg px-3 py-2">
                <span className={`flex-1 text-13 font-medium truncate${className}`} style={style}>
                  {char?.name || 'Unknown raider'}
                </span>
                <Amount amount={entry.amount} ended={status === 'ended'} />
                <StatusText status={status} starts_at={entry.starts_at ?? null} expires_at={entry.expires_at} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPersist(removeRaiderBonusEntry(raiderMods, characterId, index))}
                  className="!px-2"
                  aria-label={`Remove ${entry.amount > 0 ? 'bonus' : 'penalty'} for ${char?.name || 'raider'}`}
                >
                  ✕
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {endedCount > 0 && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => onPersist(tidyRaiderModifiers(raiderMods, today))}>
            Clear ended bonuses
          </Button>
        </div>
      )}
    </Card>
  )
}
