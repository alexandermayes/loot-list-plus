'use client'

import { memo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { StickyNote01Icon } from '@hugeicons/core-free-icons'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/components/ui/select'
import ItemLink from '@/app/components/ItemLink'
import MultiSelectDropdown from '@/app/components/MultiSelectDropdown'
import type { ClassSpecOption, LootItem, SpecType } from './types'

interface ItemRowProps {
  item: LootItem
  specs: { primary: Set<string>; secondary: Set<string> } | undefined
  note: string
  classSpecOptions: ClassSpecOption[]
  onToggleAvailability: (itemId: string, current: boolean) => void
  onToggleLootCouncil: (itemId: string, current: boolean) => void
  onUpdateClassification: (itemId: string, value: string) => void
  onAddSpec: (itemId: string, specId: string, type: SpecType) => void
  onRemoveSpec: (itemId: string, specId: string, type: SpecType) => void
  onRemoveAllSpecs: (itemId: string, type: SpecType) => void
  onOpenNotes: (item: LootItem, currentNote: string) => void
  getSpecName: (id: string) => string
  getSpecColor: (id: string) => string | undefined
  getConsolidatedSpecNames: (ids: Set<string>) => { name: string; color?: string }[]
  isRoleGroupSelected: (id: string, ids: Set<string>) => boolean
}

const ROLE_GROUP_OPTIONS = [
  { id: 'all', label: 'All specs/roles', isRoleGroup: true },
  { id: 'role:tank', label: 'All tanks', isRoleGroup: true },
  { id: 'role:healer', label: 'All healers', isRoleGroup: true },
  { id: 'role:physical', label: 'All physical DPS', isRoleGroup: true },
  { id: 'role:caster', label: 'All caster DPS', isRoleGroup: true },
]

function ItemRowInner({
  item,
  specs,
  note,
  classSpecOptions,
  onToggleAvailability,
  onToggleLootCouncil,
  onUpdateClassification,
  onAddSpec,
  onRemoveSpec,
  onRemoveAllSpecs,
  onOpenNotes,
  getSpecName,
  getSpecColor,
  getConsolidatedSpecNames,
  isRoleGroupSelected,
}: ItemRowProps) {
  const primary = specs?.primary ?? new Set<string>()
  const secondary = specs?.secondary ?? new Set<string>()

  return (
    <tr className="hover:bg-muted/50">
      <td className="px-4 py-2.5">
        <Checkbox
          size="sm"
          checked={item.is_available}
          onCheckedChange={() => onToggleAvailability(item.id, item.is_available)}
          aria-label={`Toggle availability for ${item.name}`}
        />
      </td>
      <td className="px-2 py-2.5 text-center">
        <Checkbox
          size="sm"
          variant="accent"
          checked={item.is_loot_council ?? false}
          onCheckedChange={() => onToggleLootCouncil(item.id, item.is_loot_council ?? false)}
          disabled={!item.is_available}
          aria-label={`Toggle Loot Council for ${item.name}`}
        />
      </td>
      <td className="px-4 py-2.5 text-[13px] text-foreground">
        <div className="truncate overflow-hidden">
          <ItemLink name={item.name} wowheadId={item.wowhead_id} />
        </div>
      </td>
      <td className="px-4 py-2.5 text-[12px] text-foreground-muted">
        <div className="truncate">{item.boss_name}</div>
      </td>
      <td className="px-4 py-2.5 text-[12px] text-foreground-muted">
        <div className="truncate">{item.item_slot}</div>
      </td>
      <td className="px-4 py-2.5 text-[12px] text-foreground-muted">
        <div className="truncate">{item.raid_tier?.name}</div>
      </td>
      <td className="px-2 py-2.5">
        <Select
          variant="pill"
          size="sm"
          value={item.classification}
          onChange={(e) => onUpdateClassification(item.id, e.target.value)}
          className="bg-background-elevated font-medium"
          style={{
            color:
              item.classification === 'Reserved'
                ? '#ef4444'
                : item.classification === 'Limited'
                  ? '#eab308'
                  : item.classification === 'Unlimited'
                    ? '#22c55e'
                    : undefined,
          }}
        >
          <option value="Reserved" className="bg-background-elevated" style={{ color: '#ef4444' }}>
            Reserved
          </option>
          <option value="Limited" className="bg-background-elevated" style={{ color: '#eab308' }}>
            Limited
          </option>
          <option value="Unlimited" className="bg-background-elevated" style={{ color: '#22c55e' }}>
            Unlimited
          </option>
        </Select>
      </td>
      <td className="px-2 py-2.5">
        <MultiSelectDropdown
          placeholder="Primary"
          selectedIds={primary}
          options={[]}
          optionGroups={[
            { label: '', options: ROLE_GROUP_OPTIONS },
            {
              label: 'Individual specs',
              options: classSpecOptions.map((opt) => ({
                id: opt.id,
                label: opt.label,
                disabled: secondary.has(opt.id),
              })),
            },
          ]}
          onAdd={(id) => onAddSpec(item.id, id, 'primary')}
          onRemove={(id) => onRemoveSpec(item.id, id, 'primary')}
          onClear={() => onRemoveAllSpecs(item.id, 'primary')}
          getDisplayName={(id) => getSpecName(id)}
          getClassColor={(id) => getSpecColor(id)}
          getConsolidatedDisplay={(ids) => getConsolidatedSpecNames(ids)}
          isOptionSelected={(optionId, selectedIds) => isRoleGroupSelected(optionId, selectedIds)}
          variant="primary"
        />
      </td>
      <td className="px-2 py-2.5">
        <MultiSelectDropdown
          placeholder="Secondary"
          selectedIds={secondary}
          options={[]}
          optionGroups={[
            { label: '', options: ROLE_GROUP_OPTIONS },
            {
              label: 'Individual specs',
              options: classSpecOptions.map((opt) => ({
                id: opt.id,
                label: opt.label,
                disabled: primary.has(opt.id),
              })),
            },
          ]}
          onAdd={(id) => onAddSpec(item.id, id, 'secondary')}
          onRemove={(id) => onRemoveSpec(item.id, id, 'secondary')}
          onClear={() => onRemoveAllSpecs(item.id, 'secondary')}
          getDisplayName={(id) => getSpecName(id)}
          getClassColor={(id) => getSpecColor(id)}
          getConsolidatedDisplay={(ids) => getConsolidatedSpecNames(ids)}
          isOptionSelected={(optionId, selectedIds) => isRoleGroupSelected(optionId, selectedIds)}
          variant="secondary"
        />
      </td>
      <td className="px-2 py-2.5 text-center sm:static sticky right-0 bg-background-elevated shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.3)] sm:shadow-none">
        <button
          onClick={() => onOpenNotes(item, note)}
          title={note || 'Add note'}
          className={`p-1.5 rounded-md transition-colors ${
            note
              ? 'text-accent hover:bg-accent/10'
              : 'text-foreground-muted hover:text-foreground hover:bg-background-elevated'
          }`}
        >
          <HugeiconsIcon icon={StickyNote01Icon} size={16} />
        </button>
      </td>
    </tr>
  )
}

export const ItemRow = memo(ItemRowInner)
