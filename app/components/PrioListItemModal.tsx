'use client'

import { useState, useEffect } from 'react'
import ItemLink from './ItemLink'
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
  const [activeTab, setActiveTab] = useState<'roles' | 'classes' | 'characters'>('roles')
  const [saving, setSaving] = useState(false)

  // Role priorities state
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

  // Priority bonuses
  const [priorityBonuses, setPriorityBonuses] = useState(
    priority?.priority_bonuses || { role: 5, class: 3, character: 2 }
  )

  // Notes
  const [notes, setNotes] = useState(priority?.notes || '')

  // Dropdown states for adding new priorities
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [selectedSpec, setSelectedSpec] = useState<string>('')
  const [selectedCharacter, setSelectedCharacter] = useState<string>('')

  const getSpecColor = (specId: string) => {
    const spec = classSpecs.find(s => s.id === specId)
    if (!spec) return '#888888'
    const wowClass = wowClasses.find(c => c.id === spec.class_id)
    return wowClass?.color_hex || '#888888'
  }

  const getSpecName = (specId: string) => {
    const spec = classSpecs.find(s => s.id === specId)
    return spec?.combined_name || spec?.name || specId
  }

  const getCharacterColor = (charId: string) => {
    const char = characters.find(c => c.id === charId)
    return (char?.class as any)?.color_hex || '#888888'
  }

  const handleAddRole = () => {
    if (!selectedRole) return
    // Find the next available priority number
    const existingPrios = Object.values(rolePriorities).filter(p => p !== null) as number[]
    const nextPrio = existingPrios.length > 0 ? Math.max(...existingPrios) + 1 : 1
    setRolePriorities(prev => ({ ...prev, [selectedRole]: nextPrio }))
    setSelectedRole('')
  }

  const handleAddSpec = () => {
    if (!selectedSpec) return
    const existingPrios = Object.values(classPriorities).filter(p => p !== null) as number[]
    const nextPrio = existingPrios.length > 0 ? Math.max(...existingPrios) + 1 : 1
    setClassPriorities(prev => ({ ...prev, [selectedSpec]: nextPrio }))
    setSelectedSpec('')
  }

  const handleAddCharacter = () => {
    if (!selectedCharacter) return
    const existingPrios = Object.values(characterPriorities).filter(p => p !== null) as number[]
    const nextPrio = existingPrios.length > 0 ? Math.max(...existingPrios) + 1 : 1
    setCharacterPriorities(prev => ({ ...prev, [selectedCharacter]: nextPrio }))
    setSelectedCharacter('')
  }

  const handleRemoveRole = (role: string) => {
    setRolePriorities(prev => {
      const newPrios = { ...prev }
      delete newPrios[role]
      return newPrios
    })
  }

  const handleRemoveSpec = (specId: string) => {
    setClassPriorities(prev => {
      const newPrios = { ...prev }
      delete newPrios[specId]
      return newPrios
    })
  }

  const handleRemoveCharacter = (charId: string) => {
    setCharacterPriorities(prev => {
      const newPrios = { ...prev }
      delete newPrios[charId]
      return newPrios
    })
  }

  const handleUpdateRolePriority = (role: string, value: number) => {
    setRolePriorities(prev => ({ ...prev, [role]: value }))
  }

  const handleUpdateClassPriority = (specId: string, value: number) => {
    setClassPriorities(prev => ({ ...prev, [specId]: value }))
  }

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
        priority_bonuses: priorityBonuses,
        notes: notes || null
      })
    } finally {
      setSaving(false)
    }
  }

  // Sort priorities by rank number
  const sortedRolePriorities = Object.entries(rolePriorities)
    .filter(([_, rank]) => rank !== null)
    .sort(([, a], [, b]) => (a as number) - (b as number))

  const sortedClassPriorities = Object.entries(classPriorities)
    .filter(([_, rank]) => rank !== null)
    .sort(([, a], [, b]) => (a as number) - (b as number))

  const sortedCharacterPriorities = Object.entries(characterPriorities)
    .filter(([_, rank]) => rank !== null)
    .sort(([, a], [, b]) => (a as number) - (b as number))

  // Available options (not already added)
  const availableRoles = allRoles.filter(role => !(role in rolePriorities))
  const availableSpecs = classSpecs
    .filter(spec => !(spec.id in classPriorities))
    .sort((a, b) => (a.combined_name || a.name).localeCompare(b.combined_name || b.name))
  const availableCharacters = characters.filter(char => !(char.id in characterPriorities))

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[rgba(255,255,255,0.1)]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Set Item Priority</h2>
              <div className="flex items-center gap-2">
                <ItemLink name={item.name} wowheadId={item.wowhead_id} />
                <span className="text-[#a1a1a1] text-sm">({item.item_slot})</span>
              </div>
              <p className="text-[#666] text-sm mt-1">{item.boss_name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-[#a1a1a1] hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[rgba(255,255,255,0.1)]">
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'roles'
                ? 'text-[#ff8000] border-b-2 border-[#ff8000] bg-[#ff8000]/10'
                : 'text-[#a1a1a1] hover:text-white'
            }`}
          >
            Role Priority
            {sortedRolePriorities.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                {sortedRolePriorities.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'classes'
                ? 'text-[#ff8000] border-b-2 border-[#ff8000] bg-[#ff8000]/10'
                : 'text-[#a1a1a1] hover:text-white'
            }`}
          >
            Class/Spec Priority
            {sortedClassPriorities.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                {sortedClassPriorities.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('characters')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'characters'
                ? 'text-[#ff8000] border-b-2 border-[#ff8000] bg-[#ff8000]/10'
                : 'text-[#a1a1a1] hover:text-white'
            }`}
          >
            Individual Raiders
            {sortedCharacterPriorities.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                {sortedCharacterPriorities.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Role Priority Tab */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <p className="text-[#a1a1a1] text-sm">
                Set priority by role (Tank, Healer, Physical DPS, Caster DPS). Lower number = higher priority.
              </p>

              {/* Add Role */}
              <div className="flex gap-2">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="flex-1 px-4 py-2 bg-[#151515] border border-[#383838] rounded-lg text-white text-sm focus:outline-none focus:border-[#ff8000]"
                >
                  <option value="">Select a role to add...</option>
                  {availableRoles.map(role => (
                    <option key={role} value={role}>{getRoleDisplayName(role)}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddRole}
                  disabled={!selectedRole}
                  className="px-4 py-2 bg-[#ff8000] hover:bg-[#e67300] disabled:bg-[#333] disabled:text-[#666] text-white text-sm font-medium rounded-lg transition"
                >
                  Add
                </button>
              </div>

              {/* Role List */}
              <div className="space-y-2">
                {sortedRolePriorities.map(([role, rank]) => (
                  <div
                    key={role}
                    className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg"
                  >
                    <input
                      type="number"
                      value={rank || ''}
                      onChange={(e) => handleUpdateRolePriority(role, parseInt(e.target.value) || 1)}
                      min={1}
                      className="w-16 px-3 py-1.5 bg-[#151515] border border-[#383838] rounded text-white text-sm text-center focus:outline-none focus:border-[#ff8000]"
                    />
                    <span className="flex-1 text-white font-medium">
                      {getRoleDisplayName(role as Role)}
                    </span>
                    <button
                      onClick={() => handleRemoveRole(role)}
                      className="text-red-400 hover:text-red-300 transition"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {sortedRolePriorities.length === 0 && (
                  <p className="text-[#666] text-sm italic py-4 text-center">
                    No role priorities set. Add roles above.
                  </p>
                )}
              </div>

              {/* Bonus Value */}
              <div className="pt-4 border-t border-[rgba(255,255,255,0.1)]">
                <label className="block text-sm font-medium text-white mb-2">
                  Role Priority Bonus Value
                </label>
                <input
                  type="number"
                  value={priorityBonuses.role}
                  onChange={(e) => setPriorityBonuses(prev => ({
                    ...prev,
                    role: parseFloat(e.target.value) || 0
                  }))}
                  step={0.5}
                  className="w-32 px-4 py-2 bg-[#151515] border border-[#383838] rounded-lg text-white text-sm focus:outline-none focus:border-[#ff8000]"
                />
                <p className="text-[#666] text-xs mt-1">
                  Base bonus for priority 1. Priority 2 gets half, priority 3 gets third, etc.
                </p>
              </div>
            </div>
          )}

          {/* Class/Spec Priority Tab */}
          {activeTab === 'classes' && (
            <div className="space-y-4">
              <p className="text-[#a1a1a1] text-sm">
                Set priority by class/spec. This gives a bonus to specific specs regardless of role.
              </p>

              {/* Add Spec */}
              <div className="flex gap-2">
                <select
                  value={selectedSpec}
                  onChange={(e) => setSelectedSpec(e.target.value)}
                  className="flex-1 px-4 py-2 bg-[#151515] border border-[#383838] rounded-lg text-white text-sm focus:outline-none focus:border-[#ff8000]"
                >
                  <option value="">Select a class/spec to add...</option>
                  {availableSpecs.map(spec => (
                    <option key={spec.id} value={spec.id}>
                      {spec.combined_name || spec.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddSpec}
                  disabled={!selectedSpec}
                  className="px-4 py-2 bg-[#ff8000] hover:bg-[#e67300] disabled:bg-[#333] disabled:text-[#666] text-white text-sm font-medium rounded-lg transition"
                >
                  Add
                </button>
              </div>

              {/* Spec List */}
              <div className="space-y-2">
                {sortedClassPriorities.map(([specId, rank]) => (
                  <div
                    key={specId}
                    className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg"
                  >
                    <input
                      type="number"
                      value={rank || ''}
                      onChange={(e) => handleUpdateClassPriority(specId, parseInt(e.target.value) || 1)}
                      min={1}
                      className="w-16 px-3 py-1.5 bg-[#151515] border border-[#383838] rounded text-white text-sm text-center focus:outline-none focus:border-[#ff8000]"
                    />
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getSpecColor(specId) }}
                    />
                    <span className="flex-1 text-white font-medium">
                      {getSpecName(specId)}
                    </span>
                    <button
                      onClick={() => handleRemoveSpec(specId)}
                      className="text-red-400 hover:text-red-300 transition"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {sortedClassPriorities.length === 0 && (
                  <p className="text-[#666] text-sm italic py-4 text-center">
                    No class/spec priorities set. Add specs above.
                  </p>
                )}
              </div>

              {/* Bonus Value */}
              <div className="pt-4 border-t border-[rgba(255,255,255,0.1)]">
                <label className="block text-sm font-medium text-white mb-2">
                  Class Priority Bonus Value
                </label>
                <input
                  type="number"
                  value={priorityBonuses.class}
                  onChange={(e) => setPriorityBonuses(prev => ({
                    ...prev,
                    class: parseFloat(e.target.value) || 0
                  }))}
                  step={0.5}
                  className="w-32 px-4 py-2 bg-[#151515] border border-[#383838] rounded-lg text-white text-sm focus:outline-none focus:border-[#ff8000]"
                />
                <p className="text-[#666] text-xs mt-1">
                  Base bonus for priority 1. Priority 2 gets half, priority 3 gets third, etc.
                </p>
              </div>
            </div>
          )}

          {/* Characters Tab */}
          {activeTab === 'characters' && (
            <div className="space-y-4">
              <p className="text-[#a1a1a1] text-sm">
                Set priority for individual raiders. Use this for specific item assignments.
              </p>

              {/* Add Character */}
              <div className="flex gap-2">
                <select
                  value={selectedCharacter}
                  onChange={(e) => setSelectedCharacter(e.target.value)}
                  className="flex-1 px-4 py-2 bg-[#151515] border border-[#383838] rounded-lg text-white text-sm focus:outline-none focus:border-[#ff8000]"
                >
                  <option value="">Select a raider to add...</option>
                  {availableCharacters.map(char => (
                    <option key={char.id} value={char.id}>
                      {char.name} ({(char.class as any)?.name || 'Unknown'})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddCharacter}
                  disabled={!selectedCharacter}
                  className="px-4 py-2 bg-[#ff8000] hover:bg-[#e67300] disabled:bg-[#333] disabled:text-[#666] text-white text-sm font-medium rounded-lg transition"
                >
                  Add
                </button>
              </div>

              {/* Character List */}
              <div className="space-y-2">
                {sortedCharacterPriorities.map(([charId, rank]) => {
                  const char = characters.find(c => c.id === charId)
                  return (
                    <div
                      key={charId}
                      className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg"
                    >
                      <input
                        type="number"
                        value={rank || ''}
                        onChange={(e) => handleUpdateCharacterPriority(charId, parseInt(e.target.value) || 1)}
                        min={1}
                        className="w-16 px-3 py-1.5 bg-[#151515] border border-[#383838] rounded text-white text-sm text-center focus:outline-none focus:border-[#ff8000]"
                      />
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getCharacterColor(charId) }}
                      />
                      <span className="flex-1 text-white font-medium">
                        {char?.name || charId}
                        <span className="text-[#666] ml-2 text-sm">
                          ({(char?.class as any)?.name || 'Unknown'})
                        </span>
                      </span>
                      <button
                        onClick={() => handleRemoveCharacter(charId)}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
                {sortedCharacterPriorities.length === 0 && (
                  <p className="text-[#666] text-sm italic py-4 text-center">
                    No individual raider priorities set. Add raiders above.
                  </p>
                )}
              </div>

              {/* Bonus Value */}
              <div className="pt-4 border-t border-[rgba(255,255,255,0.1)]">
                <label className="block text-sm font-medium text-white mb-2">
                  Individual Raider Bonus Value
                </label>
                <input
                  type="number"
                  value={priorityBonuses.character}
                  onChange={(e) => setPriorityBonuses(prev => ({
                    ...prev,
                    character: parseFloat(e.target.value) || 0
                  }))}
                  step={0.5}
                  className="w-32 px-4 py-2 bg-[#151515] border border-[#383838] rounded-lg text-white text-sm focus:outline-none focus:border-[#ff8000]"
                />
                <p className="text-[#666] text-xs mt-1">
                  Base bonus for priority 1. Priority 2 gets half, priority 3 gets third, etc.
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="pt-6 mt-6 border-t border-[rgba(255,255,255,0.1)]">
            <label className="block text-sm font-medium text-white mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for loot council..."
              rows={2}
              className="w-full px-4 py-2 bg-[#151515] border border-[#383838] rounded-lg text-white text-sm focus:outline-none focus:border-[#ff8000] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[rgba(255,255,255,0.1)] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#2a2a2a] hover:bg-[#333] text-white text-sm font-medium rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#ff8000] hover:bg-[#e67300] disabled:bg-[#666] text-white text-sm font-medium rounded-lg transition"
          >
            {saving ? 'Saving...' : 'Save Priority'}
          </button>
        </div>
      </div>
    </div>
  )
}
