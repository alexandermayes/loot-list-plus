'use client'

import { useState, useCallback, useEffect } from 'react'
import ItemLink from './ItemLink'
import MultiSelectDropdown from './MultiSelectDropdown'
import { allRoles, getRoleDisplayName, type Role } from '@/utils/spec-role-mapping'

interface LootItem {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
  classification: string
  is_available: boolean
}

interface ItemPriority {
  id?: string
  item_id: string
  guild_id: string
  raid_tier_id: string
  role_priorities: Record<string, number | null>
  class_priorities: Record<string, number | null>
  character_priorities: Record<string, number | null>
  priority_bonuses: { role: number; class: number; character: number }
  notes: string | null
}

interface Character {
  id: string
  name: string
  class?: {
    name: string
    color_hex: string
  }
}

interface ClassSpec {
  id: string
  class_id: string
  name: string
  combined_name?: string
}

interface WowClass {
  id: string
  name: string
  color_hex: string
}

interface Props {
  item: LootItem
  priority?: ItemPriority
  classSpecs: ClassSpec[]
  wowClasses: WowClass[]
  characters: Character[]
  onSave: (priority: Partial<ItemPriority>) => Promise<void>
  onClose: () => void
}

export function PrioListItemModal({
  item,
  priority,
  classSpecs,
  wowClasses,
  characters,
  onSave,
  onClose
}: Props) {
  const [saving, setSaving] = useState(false)

  // Role priorities state - stores point values
  const [rolePriorities, setRolePriorities] = useState<Record<string, number | null>>(
    priority?.role_priorities || {}
  )

  // Class/spec priorities state
  const [classPriorities, setClassPriorities] = useState<Record<string, number | null>>(
    priority?.class_priorities || {}
  )

  // Character priorities state
  const [characterPriorities, setCharacterPriorities] = useState<Record<string, number | null>>(
    priority?.character_priorities || {}
  )

  // Notes
  const [notes, setNotes] = useState(priority?.notes || '')

  // Convert to Sets for MultiSelectDropdown
  const selectedRoles = new Set(Object.keys(rolePriorities))
  const selectedSpecs = new Set(Object.keys(classPriorities))
  const selectedCharacters = new Set(Object.keys(characterPriorities))

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Helper functions for spec colors/names
  const getSpecColor = useCallback((specId: string) => {
    const spec = classSpecs.find(s => s.id === specId)
    if (!spec) return '#888888'
    const wowClass = wowClasses.find(c => c.id === spec.class_id)
    return wowClass?.color_hex || '#888888'
  }, [classSpecs, wowClasses])

  const getSpecName = useCallback((specId: string) => {
    const spec = classSpecs.find(s => s.id === specId)
    return spec?.combined_name || spec?.name || specId
  }, [classSpecs])

  const getCharacterColor = useCallback((charId: string) => {
    const char = characters.find(c => c.id === charId)
    return char?.class?.color_hex || '#888888'
  }, [characters])

  const getCharacterName = useCallback((charId: string) => {
    const char = characters.find(c => c.id === charId)
    return char?.name || charId
  }, [characters])

  // Role handlers
  const handleAddRole = useCallback((roleId: string) => {
    setRolePriorities(prev => ({ ...prev, [roleId]: 0 }))
  }, [])

  const handleRemoveRole = useCallback((roleId: string) => {
    setRolePriorities(prev => {
      const newPrios = { ...prev }
      delete newPrios[roleId]
      return newPrios
    })
  }, [])

  const handleClearRoles = useCallback(() => {
    setRolePriorities({})
  }, [])

  const handleUpdateRolePriority = (role: string, value: number) => {
    setRolePriorities(prev => ({ ...prev, [role]: value }))
  }

  // Spec handlers
  const handleAddSpec = useCallback((specId: string) => {
    setClassPriorities(prev => ({ ...prev, [specId]: 0 }))
  }, [])

  const handleRemoveSpec = useCallback((specId: string) => {
    setClassPriorities(prev => {
      const newPrios = { ...prev }
      delete newPrios[specId]
      return newPrios
    })
  }, [])

  const handleClearSpecs = useCallback(() => {
    setClassPriorities({})
  }, [])

  const handleUpdateClassPriority = (specId: string, value: number) => {
    setClassPriorities(prev => ({ ...prev, [specId]: value }))
  }

  // Character handlers
  const handleAddCharacter = useCallback((charId: string) => {
    setCharacterPriorities(prev => ({ ...prev, [charId]: 0 }))
  }, [])

  const handleRemoveCharacter = useCallback((charId: string) => {
    setCharacterPriorities(prev => {
      const newPrios = { ...prev }
      delete newPrios[charId]
      return newPrios
    })
  }, [])

  const handleClearCharacters = useCallback(() => {
    setCharacterPriorities({})
  }, [])

  const handleUpdateCharacterPriority = (charId: string, value: number) => {
    setCharacterPriorities(prev => ({ ...prev, [charId]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({
        role_priorities: rolePriorities,
        class_priorities: classPriorities,
        character_priorities: characterPriorities,
        priority_bonuses: { role: 5, class: 3, character: 2 }, // Default values
        notes: notes || null
      })
    } finally {
      setSaving(false)
    }
  }

  // Build options for dropdowns
  const roleOptions = allRoles.map(role => ({
    id: role,
    label: getRoleDisplayName(role)
  }))

  // Group specs by class
  const specOptionGroups = wowClasses.map(wowClass => ({
    label: wowClass.name,
    options: classSpecs
      .filter(spec => spec.class_id === wowClass.id)
      .map(spec => ({
        id: spec.id,
        label: spec.name
      }))
  })).filter(group => group.options.length > 0)

  const characterOptions = characters.map(char => ({
    id: char.id,
    label: `${char.name} (${char.class?.name || 'Unknown'})`
  }))

  // Sort selected items by their point values
  const sortedRoles = Object.entries(rolePriorities).sort(([, a], [, b]) => (b || 0) - (a || 0))
  const sortedSpecs = Object.entries(classPriorities).sort(([, a], [, b]) => (b || 0) - (a || 0))
  const sortedCharacters = Object.entries(characterPriorities).sort(([, a], [, b]) => (b || 0) - (a || 0))

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background-subtle border border-border-strong rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border-strong flex items-start justify-between bg-background-elevated">
          <div>
            <h3 className="text-[24px] font-bold text-white mb-2">Set item priority</h3>
            <div className="flex items-center gap-2">
              <ItemLink name={item.name} wowheadId={item.wowhead_id} />
              <span className="text-muted-foreground text-[13px]">({item.item_slot})</span>
            </div>
            <p className="text-foreground-muted text-[13px] mt-1">{item.boss_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Role Priority */}
          <div className="space-y-3">
            <div>
              <label className="block text-[13px] font-medium text-white mb-1">
                Role Priority
              </label>
              <p className="text-foreground-muted text-[12px]">
                Select roles and set point values for this item
              </p>
            </div>
            <MultiSelectDropdown
              placeholder="Select roles..."
              selectedIds={selectedRoles}
              options={roleOptions}
              onAdd={handleAddRole}
              onRemove={handleRemoveRole}
              onClear={handleClearRoles}
              getDisplayName={(id) => getRoleDisplayName(id as Role)}
            />
            {/* Selected roles with point values */}
            {sortedRoles.length > 0 && (
              <div className="space-y-2 mt-3">
                {sortedRoles.map(([role, points]) => (
                  <div
                    key={role}
                    className="flex items-center gap-3 p-3 bg-background-elevated border border-border-strong rounded-xl"
                  >
                    <span className="flex-1 text-white font-medium text-[13px]">
                      {getRoleDisplayName(role as Role)}
                    </span>
                    <input
                      type="number"
                      value={points === 0 || points === null ? '' : points}
                      onChange={(e) => handleUpdateRolePriority(role, e.target.value === '' ? 0 : Number(e.target.value))}
                      placeholder="0"
                      step="any"
                      className="w-20 px-3 py-1.5 bg-background-subtle border border-border-strong rounded-lg text-white text-[13px] text-center focus:outline-none focus:border-accent transition"
                    />
                    <span className="text-foreground-muted text-[12px]">pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Class/Spec Priority */}
          <div className="space-y-3">
            <div>
              <label className="block text-[13px] font-medium text-white mb-1">
                Class/Spec Priority
              </label>
              <p className="text-foreground-muted text-[12px]">
                Select specs and set point values for this item
              </p>
            </div>
            <MultiSelectDropdown
              placeholder="Select specs..."
              selectedIds={selectedSpecs}
              options={[]}
              optionGroups={specOptionGroups}
              onAdd={handleAddSpec}
              onRemove={handleRemoveSpec}
              onClear={handleClearSpecs}
              getDisplayName={getSpecName}
              getClassColor={getSpecColor}
            />
            {/* Selected specs with point values */}
            {sortedSpecs.length > 0 && (
              <div className="space-y-2 mt-3">
                {sortedSpecs.map(([specId, points]) => (
                  <div
                    key={specId}
                    className="flex items-center gap-3 p-3 bg-background-elevated border border-border-strong rounded-xl"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getSpecColor(specId) }}
                    />
                    <span className="flex-1 text-white font-medium text-[13px]">
                      {getSpecName(specId)}
                    </span>
                    <input
                      type="number"
                      value={points === 0 || points === null ? '' : points}
                      onChange={(e) => handleUpdateClassPriority(specId, e.target.value === '' ? 0 : Number(e.target.value))}
                      placeholder="0"
                      step="any"
                      className="w-20 px-3 py-1.5 bg-background-subtle border border-border-strong rounded-lg text-white text-[13px] text-center focus:outline-none focus:border-accent transition"
                    />
                    <span className="text-foreground-muted text-[12px]">pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Individual Raiders */}
          <div className="space-y-3">
            <div>
              <label className="block text-[13px] font-medium text-white mb-1">
                Individual Raiders
              </label>
              <p className="text-foreground-muted text-[12px]">
                Select specific raiders and set point values for this item
              </p>
            </div>
            <MultiSelectDropdown
              placeholder="Select raiders..."
              selectedIds={selectedCharacters}
              options={characterOptions}
              onAdd={handleAddCharacter}
              onRemove={handleRemoveCharacter}
              onClear={handleClearCharacters}
              getDisplayName={getCharacterName}
              getClassColor={getCharacterColor}
            />
            {/* Selected characters with point values */}
            {sortedCharacters.length > 0 && (
              <div className="space-y-2 mt-3">
                {sortedCharacters.map(([charId, points]) => {
                  const char = characters.find(c => c.id === charId)
                  return (
                    <div
                      key={charId}
                      className="flex items-center gap-3 p-3 bg-background-elevated border border-border-strong rounded-xl"
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getCharacterColor(charId) }}
                      />
                      <span className="flex-1 text-white font-medium text-[13px]">
                        {char?.name || charId}
                        <span className="text-foreground-muted ml-2">
                          ({char?.class?.name || 'Unknown'})
                        </span>
                      </span>
                      <input
                        type="number"
                        value={points === 0 || points === null ? '' : points}
                        onChange={(e) => handleUpdateCharacterPriority(charId, e.target.value === '' ? 0 : Number(e.target.value))}
                        placeholder="0"
                        step="any"
                        className="w-20 px-3 py-1.5 bg-background-subtle border border-border-strong rounded-lg text-white text-[13px] text-center focus:outline-none focus:border-accent transition"
                      />
                      <span className="text-foreground-muted text-[12px]">pts</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-3 pt-4 border-t border-border-strong">
            <label className="block text-[13px] font-medium text-white">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for loot council..."
              rows={2}
              className="w-full px-5 py-3 bg-background-elevated border border-border-strong rounded-xl text-white text-[13px] focus:outline-none focus:border-accent transition resize-none placeholder-[#606060]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border-strong flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-3 bg-background-elevated hover:bg-muted border border-border-strong text-white text-[13px] font-medium rounded-[52px] transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-3 bg-white hover:bg-gray-100 disabled:bg-[#333] disabled:text-foreground-muted text-black text-[13px] font-medium rounded-[52px] transition"
          >
            {saving ? 'Saving...' : 'Save Priority'}
          </button>
        </div>
      </div>
    </div>
  )
}
