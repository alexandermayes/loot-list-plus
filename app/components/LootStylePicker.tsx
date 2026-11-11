'use client'

import { useId } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-modal'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import {
  LOOT_STYLE_IDS,
  LOOT_STYLE_PRESETS,
  applyLootStyle,
  isLootStyleId,
  lootStyleStatus,
  presetDiff,
  type LootStyleId,
} from '@/domain/guild/loot-style-presets'

interface LootStylePickerProps {
  /** settings sits in the Loot system settings modal; create sits in guild creation. */
  variant: 'settings' | 'create'
  /** The live settings. Null in creation, where there are no knobs to compare yet. */
  settings: Record<string, unknown> | null
  /** Receives the settings with the preset's knobs and loot_style written over them. */
  onApply: (next: Record<string, unknown>) => void
  /** Creation only: the preset shown as selected. */
  value?: LootStyleId
}

// All copy here is DRAFT until the owner's 04-19 sign-off.
export function LootStylePicker({ variant, settings, onApply, value }: LootStylePickerProps) {
  const groupId = useId()
  const { confirm, ConfirmDialog } = useConfirm()

  const live = settings ?? {}
  const status = variant === 'settings' ? lootStyleStatus(live) : null
  const selectedId: LootStyleId | null =
    variant === 'create' ? (value ?? null) : status?.kind === 'preset' ? status.id : null
  const customisedId = status?.kind === 'preset' && status.customised ? status.id : null

  function apply(id: LootStyleId) {
    onApply(applyLootStyle(live, id))
  }

  // Replacing settings an officer set themselves is the one thing this picker
  // must never do silently (T-04-16-01). When nothing would change there is
  // nothing to ask about, even if no preset was recorded yet.
  function choose(id: LootStyleId) {
    const changes = presetDiff(live, id).length
    const mustAsk = status !== null && changes > 0 && (status.kind === 'custom' || status.customised)
    if (!mustAsk) {
      apply(id)
      return
    }
    const { name } = LOOT_STYLE_PRESETS[id]
    confirm({
      title: 'Replace your settings?',
      description: `${name} will change ${changes} ${changes === 1 ? 'setting' : 'settings'} you set yourself. You can fine-tune them again afterwards.`,
      confirmLabel: `Use ${name}`,
      cancelLabel: 'Keep my settings',
      variant: 'default',
      onConfirm: () => apply(id),
    })
  }

  return (
    <div className="space-y-3">
      {status?.kind === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Custom</Badge>
          <p className="text-14 text-foreground-secondary">
            {"Your settings don't match a preset. Pick one to replace them."}
          </p>
        </div>
      )}

      <RadioGroup
        aria-label="Loot style"
        value={selectedId ?? ''}
        onValueChange={(next) => {
          if (isLootStyleId(next)) choose(next)
        }}
        className={cn('gap-3', variant === 'settings' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1')}
      >
        {LOOT_STYLE_IDS.map((id) => {
          const preset = LOOT_STYLE_PRESETS[id]
          const selected = selectedId === id
          const inputId = `${groupId}-${id}`
          return (
            // The label is the card, so the whole card is the hit area. The
            // radio sits top-right and stays on the first line when the line wraps.
            <label
              key={id}
              htmlFor={inputId}
              className={cn(
                'flex min-h-[72px] cursor-pointer items-start justify-between gap-3 rounded-xl border p-4 transition-colors',
                selected ? 'border-accent bg-accent/5' : 'border-border hover:border-border-strong',
              )}
            >
              <span className="min-w-0 space-y-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-16 font-semibold text-foreground">{preset.name}</span>
                  {customisedId === id && <Badge variant="outline">Customised</Badge>}
                </span>
                <span className="block text-14 text-foreground-secondary">{preset.line}</span>
              </span>
              <RadioGroupItem id={inputId} value={id} variant="accent" className="mt-0.5 shrink-0" />
            </label>
          )
        })}
      </RadioGroup>

      {customisedId && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-14 text-foreground-secondary">You changed some settings from this preset.</p>
          <Button type="button" variant="ghost" onClick={() => choose(customisedId)}>
            Reset to {LOOT_STYLE_PRESETS[customisedId].name}
          </Button>
        </div>
      )}

      {ConfirmDialog}
    </div>
  )
}
