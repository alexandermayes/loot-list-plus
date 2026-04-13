'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Text } from '@/components/ui/typography'
import { Skeleton } from '@/components/ui/skeletons'
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal'
import ReserveItemPicker from '@/app/components/ReserveItemPicker'
import { trackClientEvent } from '@/utils/analytics/client'
import { getExpansionVisuals } from '@/utils/expansionVisuals'
import { getRaidIcon } from '@/utils/raidIcons'

const EXPANSIONS_WITH_DATA = [
  'Classic',
  'The Burning Crusade',
  'Wrath of the Lich King',
  'Cataclysm',
  'Mists of Pandaria',
]

type RaidTier = {
  id: string
  name: string
  phase: number | null
}

type LootItem = {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
  classification?: string
}

interface CreateReserveRunModalProps {
  open: boolean
  onClose: () => void
}

/** Return a datetime-local string for today at 8 PM in the user's timezone. */
function defaultRaidTime(): string {
  const d = new Date()
  d.setHours(20, 0, 0, 0)
  // If it's already past 8 PM, default to tomorrow
  if (d < new Date()) d.setDate(d.getDate() + 1)
  // Format as datetime-local value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Return lock time = 1 hour before raid time */
function defaultLockTime(raidAt: string): string {
  if (!raidAt) return ''
  const d = new Date(raidAt)
  d.setHours(d.getHours() - 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function CreateReserveRunModal({ open, onClose }: CreateReserveRunModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const { activeGuild, isOfficer } = useGuildContext()
  const { showNotification } = useNotification()

  // Wizard step: 1 = pick expansion + raid, 2 = configure details
  const [step, setStep] = useState(1)

  const [raidTiers, setRaidTiers] = useState<RaidTier[]>([])
  const [items, setItems] = useState<LootItem[]>([])
  const [loadingTiers, setLoadingTiers] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [selectedExpansion, setSelectedExpansion] = useState('')
  const [selectedTierId, setSelectedTierId] = useState('')
  const [expansionId, setExpansionId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [raidAt, setRaidAt] = useState('')
  const [lockAt, setLockAt] = useState('')
  const [maxReserves, setMaxReserves] = useState(2)
  const [maxReservesPerItem, setMaxReservesPerItem] = useState<number | ''>('')
  const [visibility, setVisibility] = useState<'hidden_until_lock' | 'public_live'>('hidden_until_lock')
  const [allowDuplicates, setAllowDuplicates] = useState(false)
  const [enforceClassRestrictions, setEnforceClassRestrictions] = useState(false)
  const [rulesNote, setRulesNote] = useState('')
  const [discordInviteUrl, setDiscordInviteUrl] = useState('')
  const [hardReserveIds, setHardReserveIds] = useState<string[]>([])

  // Track whether the user has manually edited lock time
  const [lockTimeManual, setLockTimeManual] = useState(false)

  const isGuildMode = !!activeGuild && isOfficer

  // Reset form whenever the modal closes
  useEffect(() => {
    if (!open) {
      setStep(1)
      setSelectedExpansion('')
      setSelectedTierId('')
      setExpansionId(null)
      setTitle('')
      setRaidAt('')
      setLockAt('')
      setMaxReserves(2)
      setMaxReservesPerItem('')
      setVisibility('hidden_until_lock')
      setAllowDuplicates(false)
      setEnforceClassRestrictions(false)
      setRulesNote('')
      setDiscordInviteUrl('')
      setHardReserveIds([])
      setRaidTiers([])
      setItems([])
      setLockTimeManual(false)
    }
  }, [open])

  // Load raid tiers when expansion changes
  useEffect(() => {
    if (!selectedExpansion) {
      setRaidTiers([])
      setSelectedTierId('')
      return
    }

    const load = async () => {
      setLoadingTiers(true)
      setRaidTiers([])
      setSelectedTierId('')
      setItems([])
      setHardReserveIds([])

      if (isGuildMode && activeGuild) {
        const { data } = await supabase
          .from('raid_tiers')
          .select('id, name, phase')
          .eq('expansion_id', activeGuild.active_expansion_id!)
          .order('phase', { ascending: true })

        setRaidTiers(data || [])
        setExpansionId(activeGuild.active_expansion_id)
        if (data && data.length > 0) setSelectedTierId(data[0].id)
        setLoadingTiers(false)
        return
      }

      const res = await fetch(`/api/reserve-runs/raid-tiers?expansion=${encodeURIComponent(selectedExpansion)}`)
      const data = await res.json()
      if (data.success) {
        setRaidTiers(data.tiers || [])
        setExpansionId(data.expansion_id || null)
        if (data.tiers?.length > 0) setSelectedTierId(data.tiers[0].id)
      }
      setLoadingTiers(false)
    }
    load()
  }, [selectedExpansion])

  // Load items when tier changes
  useEffect(() => {
    if (!selectedTierId) {
      setItems([])
      return
    }

    const load = async () => {
      setLoadingItems(true)
      const res = await fetch(`/api/reserve-runs/items?raid_tier_id=${selectedTierId}`)
      const data = await res.json()
      if (data.success) {
        setItems(data.items || [])
      }
      setLoadingItems(false)
    }
    load()
  }, [selectedTierId])

  // Auto-generate title when tier changes
  useEffect(() => {
    const tier = raidTiers.find(t => t.id === selectedTierId)
    if (tier) {
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      setTitle(`${tier.name}, ${today}`)
    }
  }, [selectedTierId, raidTiers])

  // Set smart defaults for raid/lock time when moving to step 2
  const handleNext = () => {
    if (!raidAt) {
      const defaultRaid = defaultRaidTime()
      setRaidAt(defaultRaid)
      if (!lockTimeManual) {
        setLockAt(defaultLockTime(defaultRaid))
      }
    }
    setStep(2)
  }

  // Keep lock time in sync when raid time changes (unless manually edited)
  const handleRaidAtChange = (value: string) => {
    setRaidAt(value)
    if (!lockTimeManual) {
      setLockAt(defaultLockTime(value))
    }
  }

  const handleSubmit = async () => {
    if (!selectedTierId || !title.trim() || !raidAt || !lockAt) {
      showNotification('error', 'Fill in all required fields')
      return
    }

    setSubmitting(true)
    try {
      const hardReserves = hardReserveIds.map(id => ({ loot_item_id: id }))

      const res = await fetch('/api/reserve-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: isGuildMode ? activeGuild!.id : null,
          expansion_id: expansionId,
          raid_tier_id: selectedTierId,
          title: title.trim(),
          raid_at: new Date(raidAt).toISOString(),
          lock_at: new Date(lockAt).toISOString(),
          max_reserves: maxReserves,
          max_reserves_per_item: maxReservesPerItem === '' ? null : maxReservesPerItem,
          allow_duplicates: allowDuplicates,
          enforce_class_restrictions: enforceClassRestrictions,
          visibility,
          rules_note: rulesNote.trim() || null,
          discord_invite_url: discordInviteUrl.trim() || null,
          hard_reserves: hardReserves,
        }),
      })

      const data = await res.json()
      if (data.success) {
        trackClientEvent('reserve_run_created')
        showNotification('success', 'Reserve run created')
        onClose()
        router.push(`/reserve/runs/${data.run.id}`)
      } else {
        showNotification('error', data.error || 'Failed to create run')
      }
    } catch {
      showNotification('error', 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const canProceed = !!selectedTierId
  const canSubmit = !!selectedTierId && !!title.trim() && !!raidAt && !!lockAt

  const selectedTier = raidTiers.find(t => t.id === selectedTierId)
  const selectedTierIcon = selectedTier ? getRaidIcon(selectedTier.name) : null

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <ModalTitle>Create reserve run</ModalTitle>
        <ModalDescription>
          {step === 1
            ? 'Pick an expansion and raid to get started'
            : 'Review the defaults and tweak anything you need'}
        </ModalDescription>
      </ModalHeader>

      <ModalBody>
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step === 1 ? 'bg-accent text-accent-foreground' : 'bg-accent/20 text-accent'
            }`}>1</div>
            <span className={`text-[13px] font-medium ${step === 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
              Choose raid
            </span>
          </div>
          <div className="flex-1 h-px bg-border" />
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step === 2 ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
            }`}>2</div>
            <span className={`text-[13px] font-medium ${step === 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
              Settings
            </span>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            {/* Expansion selector */}
            <div className="space-y-3">
              <Label>Expansion</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EXPANSIONS_WITH_DATA.map(exp => {
                  const visuals = getExpansionVisuals(exp)
                  const isSelected = selectedExpansion === exp
                  return (
                    <button
                      key={exp}
                      type="button"
                      onClick={() => setSelectedExpansion(exp)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isSelected
                          ? 'border-accent bg-accent/10'
                          : 'border-border bg-background-elevated hover:border-border-strong hover:bg-muted'
                      }`}
                    >
                      {visuals && (
                        <img
                          src={visuals.logoUrl}
                          alt=""
                          className="w-8 h-8 rounded-lg border border-border/50 flex-shrink-0"
                        />
                      )}
                      <span className={`text-[13px] font-medium leading-tight ${isSelected ? 'text-accent' : 'text-foreground'}`}>
                        {visuals?.shortName || exp}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Raid tier selector */}
            {selectedExpansion && (
              <div className="space-y-2">
                <Label>Raid</Label>
                {loadingTiers ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-xl" />
                    ))}
                  </div>
                ) : raidTiers.length === 0 ? (
                  <Text color="muted" size="sm">No raid data available for this expansion yet.</Text>
                ) : (
                  <div className="space-y-1.5">
                    {raidTiers.map(tier => {
                      const isSelected = selectedTierId === tier.id
                      const iconUrl = getRaidIcon(tier.name)
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => {
                            setSelectedTierId(tier.id)
                            setHardReserveIds([])
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            isSelected
                              ? 'border-accent bg-accent/10'
                              : 'border-border bg-background-elevated hover:border-border-strong hover:bg-muted'
                          }`}
                        >
                          {iconUrl && (
                            <img
                              src={iconUrl}
                              alt=""
                              className="w-8 h-8 rounded-lg border border-border/50 flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className={`text-[14px] font-medium ${isSelected ? 'text-accent' : 'text-foreground'}`}>
                              {tier.name}
                            </span>
                            {tier.phase && (
                              <span className="text-[11px] text-muted-foreground ml-2">Phase {tier.phase}</span>
                            )}
                          </div>
                          {isSelected && items.length > 0 && (
                            <span className="text-[11px] text-muted-foreground">{items.length} items</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {/* Selected raid summary */}
            {selectedTier && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background-subtle border border-border">
                {selectedTierIcon && (
                  <img
                    src={selectedTierIcon}
                    alt=""
                    className="w-8 h-8 rounded-lg border border-border/50 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-[14px] font-medium text-foreground">{selectedTier.name}</span>
                  {selectedTier.phase && (
                    <span className="text-[11px] text-muted-foreground ml-2">Phase {selectedTier.phase}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[12px] text-accent hover:underline"
                >
                  Change
                </button>
              </div>
            )}

            {/* Run title */}
            <div className="space-y-2">
              <Label>Run title</Label>
              <Input
                variant="rounded"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Gruul/Mag, Apr 7"
              />
            </div>

            {/* Date/time row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Raid date and time</Label>
                <Input
                  variant="rounded"
                  type="datetime-local"
                  value={raidAt}
                  onChange={(e) => handleRaidAtChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Lock time</Label>
                <Input
                  variant="rounded"
                  type="datetime-local"
                  value={lockAt}
                  onChange={(e) => {
                    setLockAt(e.target.value)
                    setLockTimeManual(true)
                  }}
                />
                <Text color="muted" size="xs">Reserves lock manually. This is shown as guidance.</Text>
              </div>
            </div>

            {/* Core settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reserves per player</Label>
                <Select
                  variant="rounded"
                  value={maxReserves}
                  onChange={(e) => setMaxReserves(parseInt(e.target.value))}
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  variant="rounded"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as 'hidden_until_lock' | 'public_live')}
                >
                  <option value="hidden_until_lock">Hidden until locked</option>
                  <option value="public_live">Visible immediately</option>
                </Select>
              </div>
            </div>

            {/* Optional settings in a collapsible area */}
            <div className="border-t border-border pt-5 space-y-5">
              <Text size="xs" color="muted" className="uppercase tracking-wide font-semibold">Optional</Text>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max reserves per item</Label>
                  <Input
                    variant="rounded"
                    type="number"
                    min={1}
                    value={maxReservesPerItem}
                    onChange={(e) => {
                      const val = e.target.value
                      setMaxReservesPerItem(val === '' ? '' : Math.max(1, parseInt(val) || 1))
                    }}
                    placeholder="Unlimited"
                  />
                  <Text color="muted" size="xs">Cap how many players can reserve the same item.</Text>
                </div>
                <div className="space-y-2">
                  <Label>Discord invite link</Label>
                  <Input
                    variant="rounded"
                    type="url"
                    value={discordInviteUrl}
                    onChange={(e) => setDiscordInviteUrl(e.target.value)}
                    placeholder="https://discord.gg/..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Allow duplicate reserves</Label>
                  <Text color="muted" size="xs">Let a player reserve the same item multiple times</Text>
                </div>
                <Switch checked={allowDuplicates} onCheckedChange={setAllowDuplicates} />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Enforce class restrictions</Label>
                  <Text color="muted" size="xs">Cloth, leather, mail, and plate items can only be reserved by valid classes</Text>
                </div>
                <Switch checked={enforceClassRestrictions} onCheckedChange={setEnforceClassRestrictions} />
              </div>

              <div className="space-y-2">
                <Label>Rules note</Label>
                <Input
                  variant="rounded"
                  value={rulesNote}
                  onChange={(e) => setRulesNote(e.target.value)}
                  placeholder="e.g. MS > OS, 1 tier token max"
                />
              </div>

              {items.length > 0 && (
                <div className="space-y-2">
                  <Label>Hard reserves</Label>
                  <Text color="muted" size="xs">Items reserved for specific players or the guild bank. Players cannot reserve these.</Text>
                  {loadingItems ? (
                    <Skeleton className="h-40 w-full rounded-xl" />
                  ) : (
                    <ReserveItemPicker
                      items={items}
                      selectedIds={hardReserveIds}
                      onChange={setHardReserveIds}
                      maxSelections={20}
                      placeholder="Search items to hard reserve..."
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {step === 1 ? (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!canProceed}
            >
              Next
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={submitting}
              disabled={!canSubmit}
            >
              Create run
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  )
}
