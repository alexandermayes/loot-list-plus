'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Heading, Text, LabelText } from '@/components/ui/typography'
import { Skeleton } from '@/components/ui/skeletons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import ReserveItemPicker from '@/app/components/ReserveItemPicker'
import ItemLink from '@/app/components/ItemLink'
import { HugeiconsIcon } from '@hugeicons/react'
import { Calendar03Icon, LockIcon, CheckmarkCircle01Icon, UserMultiple02Icon, DiscordIcon } from '@hugeicons/core-free-icons'
import { refreshWowheadTooltips } from '@/lib/wowhead'
import { getRaidIcon } from '@/utils/raidIcons'
import { canClassReserveItem } from '@/utils/wowClassRestrictions'
import Image from 'next/image'
import Link from 'next/link'

// Hardcoded WoW classes for the public form
const WOW_CLASSES = [
  { name: 'Warrior', color: '#C79C6E' },
  { name: 'Paladin', color: '#F58CBA' },
  { name: 'Hunter', color: '#ABD473' },
  { name: 'Rogue', color: '#FFF569' },
  { name: 'Priest', color: '#FFFFFF' },
  { name: 'Death Knight', color: '#C41E3A' },
  { name: 'Shaman', color: '#0070DE' },
  { name: 'Mage', color: '#69CCF0' },
  { name: 'Warlock', color: '#9482C9' },
  { name: 'Druid', color: '#FF7D0A' },
]

type LootItem = {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
  classification?: string
  armor_type?: string | null
  weapon_type?: string | null
}

type Submission = {
  id: string
  character_name: string
  character_class: string
  character_spec: string | null
  items: string[]
  created_at: string
}

type Award = {
  id: string
  loot_item_id: string
  character_name: string
  awarded_at: string
  notes: string | null
}

type RunData = {
  id: string
  title: string
  status: 'open' | 'locked' | 'completed'
  raid_at: string
  lock_at: string
  locked_at: string | null
  max_reserves: number
  max_reserves_per_item: number | null
  allow_duplicates: boolean
  enforce_class_restrictions: boolean
  visibility: string
  rules_note: string | null
  discord_invite_url: string | null
  hard_reserves: Array<{ loot_item_id: string; reserved_for?: string }>
  raid_tier_name: string | null
  guild_name: string | null
}

const STATUS_LABELS: Record<string, { text: string; className: string }> = {
  open: { text: 'Open for reserves', className: 'text-success bg-success/15' },
  locked: { text: 'Reserves locked', className: 'text-warning bg-warning/15' },
  completed: { text: 'Completed', className: 'text-muted-foreground bg-muted/30' },
}

export default function ReserveJoinPage() {
  const { token } = useParams<{ token: string }>()

  const [run, setRun] = useState<RunData | null>(null)
  const [items, setItems] = useState<LootItem[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [awards, setAwards] = useState<Award[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [characterName, setCharacterName] = useState('')
  const [characterClass, setCharacterClass] = useState('')
  const [characterSpec, setCharacterSpec] = useState('')
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])

  // Load saved character from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lootlist_reserve_character')
    if (saved) {
      try {
        const { name, class: cls } = JSON.parse(saved)
        if (name) setCharacterName(name)
        if (cls) setCharacterClass(cls)
      } catch {}
    }
  }, [])

  // Fetch run data
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/reserve-runs/join/${token}`)
        const data = await res.json()
        if (data.success) {
          setRun(data.run)
          setItems(data.items || [])
          setSubmissions(data.submissions || [])
          setAwards(data.awards || [])

          // Check if user already submitted (by character name)
          const savedName = localStorage.getItem('lootlist_reserve_character')
          if (savedName) {
            try {
              const { name } = JSON.parse(savedName)
              const existing = (data.submissions || []).find(
                (s: Submission) => s.character_name.toLowerCase() === name?.toLowerCase()
              )
              if (existing) {
                setCharacterName(existing.character_name)
                setCharacterClass(existing.character_class)
                setCharacterSpec(existing.character_spec || '')
                setSelectedItemIds(existing.items || [])
                setSubmitted(true)
              }
            } catch {}
          }
        } else {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  useEffect(() => {
    if (run) {
      document.title = `${run.title} \u2014 LootList+ Reserve`
      refreshWowheadTooltips()
    }
  }, [run])

  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items])

  // Drop selected items that become disabled when class changes
  useEffect(() => {
    if (!run?.enforce_class_restrictions || !characterClass) return
    setSelectedItemIds((prev) => {
      if (prev.length === 0) return prev
      const filtered = prev.filter((id) => {
        const item = items.find((i) => i.id === id)
        if (!item) return true
        return canClassReserveItem(characterClass, item)
      })
      return filtered.length === prev.length ? prev : filtered
    })
  }, [characterClass, run?.enforce_class_restrictions, items])

  const disabledItemIds = useMemo(() => {
    const set = new Set<string>()
    if (!run) return set
    for (const hr of run.hard_reserves || []) set.add(hr.loot_item_id)
    if (run.enforce_class_restrictions && characterClass) {
      for (const item of items) {
        if (!canClassReserveItem(characterClass, item)) {
          set.add(item.id)
        }
      }
    }
    return set
  }, [run, items, characterClass])

  const handleSubmit = async () => {
    if (!characterName.trim() || !characterClass) {
      setError('Enter your character name and select a class')
      return
    }
    if (selectedItemIds.length === 0) {
      setError('Select at least one item to reserve')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/reserve-runs/join/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_name: characterName.trim(),
          character_class: characterClass,
          character_spec: characterSpec.trim() || null,
          items: selectedItemIds,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSubmitted(true)
        setSuccess(data.updated ? 'Reserves updated.' : 'Reserves submitted.')
        // Save character for next time
        localStorage.setItem('lootlist_reserve_character', JSON.stringify({
          name: characterName.trim(),
          class: characterClass,
        }))
      } else {
        setError(data.error || 'Failed to submit')
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-xl mx-auto p-4 sm:p-6 pt-8 space-y-6">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-60 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (notFound || !run) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <Heading level={2} className="mb-2">Run not found</Heading>
          <Text color="muted">This reserve link is invalid or has expired.</Text>
          <Link href="/" className="text-accent text-sm mt-4 block hover:underline">
            Go to LootList+
          </Link>
        </div>
      </div>
    )
  }

  const statusInfo = STATUS_LABELS[run.status]
  const isOpen = run.status === 'open'
  const showSubmissions = run.status !== 'open' || run.visibility === 'public_live'

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <div className="border-b border-border bg-background-elevated">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="LootList+" width={20} height={20} />
            <span className="text-[14px] font-bold text-foreground">LootList+</span>
          </Link>
          <span className="text-[11px] text-muted-foreground">Reserve</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Run info card */}
        <div className="bg-background-elevated border border-border rounded-xl p-5">
          <div className="flex items-start gap-4">
            {run.raid_tier_name && (
              <img
                src={getRaidIcon(run.raid_tier_name)}
                alt=""
                className="w-14 h-14 rounded-lg border border-border/50 flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              {run.guild_name && (
                <Text size="xs" color="muted" className="uppercase tracking-wide font-semibold mb-1">{run.guild_name}</Text>
              )}
              <Heading level={2} className="mb-2">{run.title}</Heading>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground mb-3 mt-3">
            {run.raid_tier_name && <span>{run.raid_tier_name}</span>}
            <span className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Calendar03Icon} size={14} />
              {formatDate(run.raid_at)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${statusInfo.className}`}>
              {statusInfo.text}
            </span>
            <span className="text-[12px] text-muted-foreground">
              {run.max_reserves} reserve{run.max_reserves !== 1 ? 's' : ''} / player
            </span>
            {run.max_reserves_per_item && (
              <span className="text-[12px] text-muted-foreground">
                Max {run.max_reserves_per_item} per item
              </span>
            )}
            {run.enforce_class_restrictions && (
              <span className="text-[12px] text-muted-foreground">
                Class restrictions enforced
              </span>
            )}
          </div>

          {run.discord_invite_url && (
            <div className="mt-3 pt-3 border-t border-border">
              <a
                href={run.discord_invite_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[13px] text-accent hover:underline"
              >
                <HugeiconsIcon icon={DiscordIcon} size={16} />
                Join the guild Discord
              </a>
            </div>
          )}

          {/* Rules */}
          {(run.rules_note || run.hard_reserves.length > 0) && (
            <div className="mt-4 pt-3 border-t border-border space-y-2">
              {run.rules_note && (
                <Text size="sm" color="secondary">{run.rules_note}</Text>
              )}
              {run.hard_reserves.length > 0 && (
                <div>
                  <Text size="xs" color="muted" className="font-semibold uppercase tracking-wide mb-1.5">Hard reserves</Text>
                  <div className="flex flex-wrap gap-1.5">
                    {run.hard_reserves.map((hr) => {
                      const item = itemMap.get(hr.loot_item_id)
                      return item ? (
                        <span key={hr.loot_item_id} className="inline-flex items-center px-2 py-0.5 bg-destructive/10 text-[12px] rounded border border-destructive/20">
                          <ItemLink name={item.name} wowheadId={item.wowhead_id} clickable={false} />
                        </span>
                      ) : null
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submission form (only when open) */}
        {isOpen && (
          <div className="bg-background-elevated border border-border rounded-xl p-5">
            <Heading level={3} className="mb-4">
              {submitted ? 'Edit your reserves' : 'Submit your reserves'}
            </Heading>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 border-success/30 bg-success/10">
                <AlertDescription className="text-success">{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {/* Character info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Character name</Label>
                  <Input
                    variant="rounded"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder="e.g. Legolas"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Class</Label>
                  <Select
                    variant="rounded"
                    value={characterClass}
                    onChange={(e) => setCharacterClass(e.target.value)}
                  >
                    <option value="" disabled>Select class</option>
                    {WOW_CLASSES.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Spec <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  variant="rounded"
                  value={characterSpec}
                  onChange={(e) => setCharacterSpec(e.target.value)}
                  placeholder="e.g. Fury, Holy, Balance"
                />
              </div>

              {/* Item picker */}
              <div className="space-y-1.5">
                <Label>Reserve items ({selectedItemIds.length}/{run.max_reserves})</Label>
                <ReserveItemPicker
                  items={items}
                  selectedIds={selectedItemIds}
                  onChange={setSelectedItemIds}
                  maxSelections={run.max_reserves}
                  disabledIds={disabledItemIds}
                  placeholder="Search for items..."
                />
              </div>

              <Button
                variant="primary"
                onClick={handleSubmit}
                loading={submitting}
                disabled={selectedItemIds.length === 0 || !characterName.trim() || !characterClass}
                className="w-full"
              >
                {submitted ? 'Update reserves' : 'Submit reserves'}
              </Button>
            </div>
          </div>
        )}

        {/* Locked / read-only message */}
        {!isOpen && !submitted && (
          <div className="bg-background-elevated border border-border rounded-xl p-5 text-center">
            <HugeiconsIcon icon={LockIcon} size={24} className="text-warning mx-auto mb-2" />
            <Text className="font-semibold mb-1">
              {run.status === 'locked' ? 'Reserves are locked' : 'This run is completed'}
            </Text>
            <Text color="muted" size="sm">Submissions are no longer accepted.</Text>
          </div>
        )}

        {/* Submissions list (visible based on rules) */}
        {showSubmissions && submissions.length > 0 && (
          <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <HugeiconsIcon icon={UserMultiple02Icon} size={16} className="text-muted-foreground" />
              <Text size="sm" className="font-semibold">Reserves ({submissions.length})</Text>
            </div>
            <div className="divide-y divide-border">
              {submissions.map((sub) => {
                const classInfo = WOW_CLASSES.find(c => c.name.toLowerCase() === sub.character_class.toLowerCase())
                return (
                  <div key={sub.id} className="px-5 py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[14px] font-semibold" style={{ color: classInfo?.color || '#FFFFFF' }}>
                        {sub.character_name}
                      </span>
                      {sub.character_spec && (
                        <span className="text-[11px] text-muted-foreground">({sub.character_spec})</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sub.items.map((itemId) => {
                        const item = itemMap.get(itemId)
                        return item ? (
                          <span key={itemId} className="inline-flex items-center px-2 py-0.5 bg-background-subtle rounded text-[12px]">
                            <ItemLink name={item.name} wowheadId={item.wowhead_id} clickable={false} />
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Awards */}
        {awards.length > 0 && (
          <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} className="text-success" />
              <Text size="sm" className="font-semibold">Awards</Text>
            </div>
            <div className="divide-y divide-border">
              {awards.map((award) => {
                const item = itemMap.get(award.loot_item_id)
                return (
                  <div key={award.id} className="px-5 py-3 flex items-center gap-3">
                    {item && <ItemLink name={item.name} wowheadId={item.wowhead_id} clickable={false} />}
                    <span className="text-[13px] text-muted-foreground">{'\u2192'}</span>
                    <span className="text-[13px] font-medium">{award.character_name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-background-elevated border border-accent/20 rounded-xl p-5 text-center">
          <Image src="/logo.svg" alt="" width={28} height={28} className="mx-auto mb-2" />
          <Text className="font-semibold mb-1">Run your own guild loot with LootList+</Text>
          <Text color="muted" size="sm" className="mb-3">
            Loot lists, attendance, Master Sheet, and more. Free to start.
          </Text>
          <Link href="/about">
            <Button variant="primary" size="sm">
              Learn more
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 pb-8">
          <Link href="/" className="text-[12px] text-muted-foreground hover:text-accent transition-colors">
            Powered by LootList+
          </Link>
        </div>
      </div>
    </div>
  )
}
