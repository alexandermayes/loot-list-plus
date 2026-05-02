'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { LabelText, Text } from '@/components/ui/typography'
import { useNotification } from '@/app/contexts/NotificationContext'
import { useConfirm } from '@/components/ui/confirm-modal'
import ItemLink from '@/app/components/ItemLink'
import { HugeiconsIcon } from '@hugeicons/react'
import { Edit02Icon, DiscordIcon, Cancel01Icon, Delete02Icon } from '@hugeicons/core-free-icons'

type LootItem = {
  id: string
  name: string
  wowhead_id: number
}

type HardReserve = {
  loot_item_id: string
  reserved_for?: string | null
}

interface InlineSettingsEditorProps {
  runId: string
  status: string
  title: string
  rulesNote: string | null
  discordInviteUrl: string | null
  hardReserves: HardReserve[]
  maxReserves: number
  maxReservesPerItem: number | null
  visibility: string
  allowDuplicates: boolean
  enforceClassRestrictions: boolean
  itemMap: Map<string, LootItem>
  authedFetch: (input: string, init?: RequestInit) => Promise<Response>
  onRunUpdated: () => void
  onRunDeleted: () => void
}

export default function InlineSettingsEditor({
  runId,
  status,
  title,
  rulesNote,
  discordInviteUrl,
  hardReserves,
  maxReserves,
  maxReservesPerItem,
  visibility,
  allowDuplicates,
  enforceClassRestrictions,
  itemMap,
  authedFetch,
  onRunUpdated,
  onRunDeleted,
}: InlineSettingsEditorProps) {
  const { showNotification } = useNotification()
  const { confirm, ConfirmDialog } = useConfirm()
  const isOpen = status === 'open'

  // Title editing (open only)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(title)

  // Rules editing (any status)
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState(rulesNote || '')

  // Discord editing (any status)
  const [editingDiscord, setEditingDiscord] = useState(false)
  const [discordDraft, setDiscordDraft] = useState(discordInviteUrl || '')

  // Settings editing (open only)
  const [editingSettings, setEditingSettings] = useState(false)
  const [maxReservesDraft, setMaxReservesDraft] = useState(maxReserves)
  const [maxPerItemDraft, setMaxPerItemDraft] = useState(maxReservesPerItem ?? 0)
  const [visibilityDraft, setVisibilityDraft] = useState(visibility)
  const [allowDuplicatesDraft, setAllowDuplicatesDraft] = useState(allowDuplicates)
  const [enforceClassDraft, setEnforceClassDraft] = useState(enforceClassRestrictions)

  const saveField = async (fields: Record<string, unknown>) => {
    try {
      const res = await authedFetch(`/api/reserve-runs/${runId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      const data = await res.json()
      if (data.success) {
        onRunUpdated()
        return true
      } else {
        showNotification('error', data.error || 'Failed to save')
        return false
      }
    } catch {
      showNotification('error', 'Something went wrong')
      return false
    }
  }

  const saveTitle = async () => {
    const trimmed = titleDraft.trim()
    if (!trimmed || trimmed === title) {
      setEditingTitle(false)
      setTitleDraft(title)
      return
    }
    const saved = await saveField({ title: trimmed })
    if (saved) {
      setEditingTitle(false)
      showNotification('success', 'Title updated')
    }
  }

  const saveNote = async () => {
    const saved = await saveField({ rules_note: noteDraft.trim() || null })
    if (saved) {
      setEditingNote(false)
      showNotification('success', 'Rules saved')
    }
  }

  const saveDiscord = async () => {
    const saved = await saveField({ discord_invite_url: discordDraft.trim() || null })
    if (saved) {
      setEditingDiscord(false)
      showNotification('success', 'Discord link saved')
    }
  }

  const saveSettings = async () => {
    const saved = await saveField({
      max_reserves: maxReservesDraft,
      max_reserves_per_item: maxPerItemDraft || null,
      visibility: visibilityDraft,
      allow_duplicates: allowDuplicatesDraft,
      enforce_class_restrictions: enforceClassDraft,
    })
    if (saved) {
      setEditingSettings(false)
      showNotification('success', 'Settings saved')
    }
  }

  const removeHardReserve = async (itemId: string) => {
    const updated = hardReserves.filter(hr => hr.loot_item_id !== itemId)
    const saved = await saveField({ hard_reserves: updated })
    if (saved) {
      showNotification('success', 'Hard reserve removed')
    }
  }

  const handleDeleteRun = () => {
    confirm({
      title: `Delete ${title}?`,
      description: 'This removes the run, all reserves, and all awards. This cannot be undone.',
      confirmLabel: 'Delete run',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await authedFetch(`/api/reserve-runs/${runId}`, { method: 'DELETE' })
          const data = await res.json()
          if (data.success) {
            showNotification('success', 'Run deleted')
            onRunDeleted()
          } else {
            showNotification('error', data.error || 'Failed to delete run')
          }
        } catch {
          showNotification('error', 'Something went wrong')
        }
      },
    })
  }

  return (
    <div className="space-y-3">
      {ConfirmDialog}

      {/* Title editing */}
      {isOpen && (
        editingTitle ? (
          <div className="flex items-center gap-2">
            <Input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              variant="rounded"
              className="text-lg font-semibold"
              onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(title) } }}
              autoFocus
            />
            <Button variant="primary" size="sm" onClick={saveTitle}>Save</Button>
            <Button variant="ghost" size="sm" onClick={() => { setEditingTitle(false); setTitleDraft(title) }}>
              <HugeiconsIcon icon={Cancel01Icon} size={16} />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => { setTitleDraft(title); setEditingTitle(true) }}
            className="group inline-flex items-center gap-2 hover:text-accent transition-colors"
          >
            <HugeiconsIcon icon={Edit02Icon} size={14} className="text-muted-foreground group-hover:text-accent" />
            <Text size="xs" color="muted">Edit title</Text>
          </button>
        )
      )}

      {/* Run settings (open only) */}
      {isOpen && (
        <div className="pt-3 border-t border-border">
          {editingSettings ? (
            <div className="space-y-4">
              <LabelText size="xs">Run settings</LabelText>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[12px] mb-1.5">Reserves per player</Label>
                  <Select
                    variant="rounded"
                    value={String(maxReservesDraft)}
                    onChange={(e) => setMaxReservesDraft(parseInt(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label className="text-[12px] mb-1.5">Max per item</Label>
                  <Select
                    variant="rounded"
                    value={String(maxPerItemDraft)}
                    onChange={(e) => setMaxPerItemDraft(parseInt(e.target.value))}
                  >
                    <option value="0">No limit</option>
                    {[1, 2, 3, 4, 5, 10, 15, 20].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-[12px] mb-1.5">Visibility</Label>
                <Select
                  variant="rounded"
                  value={visibilityDraft}
                  onChange={(e) => setVisibilityDraft(e.target.value)}
                >
                  <option value="hidden_until_lock">Hidden until locked</option>
                  <option value="public_live">Visible immediately</option>
                </Select>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[12px]">Allow duplicate reserves</Label>
                  <Switch checked={allowDuplicatesDraft} onCheckedChange={setAllowDuplicatesDraft} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-[12px]">Enforce class restrictions</Label>
                  <Switch checked={enforceClassDraft} onCheckedChange={setEnforceClassDraft} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={saveSettings}>Save settings</Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  setEditingSettings(false)
                  setMaxReservesDraft(maxReserves)
                  setMaxPerItemDraft(maxReservesPerItem ?? 0)
                  setVisibilityDraft(visibility)
                  setAllowDuplicatesDraft(allowDuplicates)
                  setEnforceClassDraft(enforceClassRestrictions)
                }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                <span>{maxReserves} reserve{maxReserves !== 1 ? 's' : ''} / player</span>
                {maxReservesPerItem && <span>Max {maxReservesPerItem} per item</span>}
                <span>{visibility === 'hidden_until_lock' ? 'Hidden until locked' : 'Visible immediately'}</span>
                {allowDuplicates && <span>Duplicates allowed</span>}
                {enforceClassRestrictions && <span>Class restrictions</span>}
              </div>
              <button
                onClick={() => setEditingSettings(true)}
                className="text-muted-foreground hover:text-accent transition-colors flex-shrink-0"
                title="Edit settings"
              >
                <HugeiconsIcon icon={Edit02Icon} size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Rules note */}
      <div className="pt-3 border-t border-border">
        {editingNote ? (
          <div className="space-y-2">
            <LabelText size="xs">Rules note</LabelText>
            <Textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              variant="rounded"
              rows={3}
              placeholder="Add rules or instructions for raiders..."
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={saveNote}>Save</Button>
              <Button variant="ghost" size="sm" onClick={() => { setEditingNote(false); setNoteDraft(rulesNote || '') }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              {rulesNote ? (
                <Text size="sm" color="secondary">{rulesNote}</Text>
              ) : (
                <Text size="sm" color="muted">No rules note set</Text>
              )}
            </div>
            <button
              onClick={() => { setNoteDraft(rulesNote || ''); setEditingNote(true) }}
              className="text-muted-foreground hover:text-accent transition-colors flex-shrink-0"
              title="Edit rules"
            >
              <HugeiconsIcon icon={Edit02Icon} size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Discord link */}
      <div className="pt-3 border-t border-border">
        {editingDiscord ? (
          <div className="space-y-2">
            <LabelText size="xs">Discord invite link</LabelText>
            <Input
              value={discordDraft}
              onChange={(e) => setDiscordDraft(e.target.value)}
              variant="rounded"
              placeholder="https://discord.gg/..."
              onKeyDown={(e) => { if (e.key === 'Enter') saveDiscord(); if (e.key === 'Escape') { setEditingDiscord(false); setDiscordDraft(discordInviteUrl || '') } }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={saveDiscord}>Save</Button>
              <Button variant="ghost" size="sm" onClick={() => { setEditingDiscord(false); setDiscordDraft(discordInviteUrl || '') }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            {discordInviteUrl ? (
              <a
                href={discordInviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[13px] text-accent hover:underline"
              >
                <HugeiconsIcon icon={DiscordIcon} size={16} />
                Join the guild Discord
              </a>
            ) : (
              <Text size="sm" color="muted" className="flex items-center gap-2">
                <HugeiconsIcon icon={DiscordIcon} size={16} />
                No Discord link set
              </Text>
            )}
            <button
              onClick={() => { setDiscordDraft(discordInviteUrl || ''); setEditingDiscord(true) }}
              className="text-muted-foreground hover:text-accent transition-colors flex-shrink-0"
              title="Edit Discord link"
            >
              <HugeiconsIcon icon={Edit02Icon} size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Hard reserves */}
      {hardReserves.length > 0 && (
        <div className="pt-3 border-t border-border">
          <LabelText size="xs" className="mb-1.5">Hard reserves</LabelText>
          <div className="flex flex-wrap gap-1.5">
            {hardReserves.map((hr) => {
              const item = itemMap.get(hr.loot_item_id)
              return item ? (
                <Badge
                  key={hr.loot_item_id}
                  variant="outline"
                  className="bg-destructive/10 text-destructive border-destructive/20 gap-1.5"
                >
                  <ItemLink name={item.name} wowheadId={item.wowhead_id} clickable={false} />
                  {isOpen && (
                    <button
                      onClick={() => removeHardReserve(hr.loot_item_id)}
                      className="hover:text-destructive/80 transition-colors ml-0.5"
                      title="Remove hard reserve"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={12} />
                    </button>
                  )}
                </Badge>
              ) : null
            })}
          </div>
        </div>
      )}

      {/* Delete run */}
      <div className="pt-3 border-t border-destructive/20">
        <button
          onClick={handleDeleteRun}
          className="text-[12px] text-muted-foreground hover:text-destructive transition-colors"
        >
          Delete this run
        </button>
      </div>
    </div>
  )
}
