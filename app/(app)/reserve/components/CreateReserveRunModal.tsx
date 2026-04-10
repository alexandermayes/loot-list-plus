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

export function CreateReserveRunModal({ open, onClose }: CreateReserveRunModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const { activeGuild, isOfficer } = useGuildContext()
  const { showNotification } = useNotification()

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

  const isGuildMode = !!activeGuild && isOfficer

  // Reset form whenever the modal closes
  useEffect(() => {
    if (!open) {
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
      setTitle(`${tier.name} \u2014 ${today}`)
    }
  }, [selectedTierId, raidTiers])

  // Sync lockAt to raidAt
  useEffect(() => {
    if (raidAt && !lockAt) {
      setLockAt(raidAt)
    }
  }, [raidAt])

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

  const canSubmit = !!selectedTierId && !!title.trim() && !!raidAt && !!lockAt

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <ModalTitle>Create reserve run</ModalTitle>
        <ModalDescription>
          {isGuildMode ? 'Set up a reserve run for your guild' : 'Set up a quick reserve run for your raid'}
        </ModalDescription>
      </ModalHeader>

      <ModalBody>
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

          {/* Run details */}
          {selectedTierId && (
            <>
              <div className="space-y-2">
                <Label>Run title</Label>
                <Input
                  variant="rounded"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Gruul/Mag, Apr 7"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Raid date and time</Label>
                  <Input
                    variant="rounded"
                    type="datetime-local"
                    value={raidAt}
                    onChange={(e) => setRaidAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lock time</Label>
                  <Input
                    variant="rounded"
                    type="datetime-local"
                    value={lockAt}
                    onChange={(e) => setLockAt(e.target.value)}
                  />
                  <Text color="muted" size="xs">Reserves lock manually. This is shown as guidance.</Text>
                </div>
              </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max reserves per item <span className="text-muted-foreground font-normal">(optional)</span></Label>
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
                  <Text color="muted" size="xs">Cap how many players can reserve the same item. Leave empty for unlimited.</Text>
                </div>
                <div className="space-y-2">
                  <Label>Discord invite link <span className="text-muted-foreground font-normal">(optional)</span></Label>
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
                <Label>Rules note <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  variant="rounded"
                  value={rulesNote}
                  onChange={(e) => setRulesNote(e.target.value)}
                  placeholder="e.g. MS > OS, 1 tier token max"
                />
              </div>

              {items.length > 0 && (
                <div className="space-y-2">
                  <Label>Hard reserves <span className="text-muted-foreground font-normal">(optional)</span></Label>
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
            </>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={submitting}
          disabled={!canSubmit}
        >
          Create run
        </Button>
      </ModalFooter>
    </Modal>
  )
}
