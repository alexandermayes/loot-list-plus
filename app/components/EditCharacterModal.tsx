'use client'

import { useState, useEffect } from 'react'
import { useGuildContext, Character } from '@/app/contexts/GuildContext'
import { createClient } from '@/utils/supabase/client'
import { Trash2 } from 'lucide-react'

interface WowClass {
  id: string
  name: string
  color_hex: string
}

interface ClassSpec {
  id: string
  class_id: string
  name: string
}

interface EditCharacterModalProps {
  isOpen: boolean
  onClose: () => void
  character: Character | null
  onSuccess?: () => void
}

export function EditCharacterModal({ isOpen, onClose, character, onSuccess }: EditCharacterModalProps) {
  const { refreshCharacters, characterMemberships } = useGuildContext()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [classId, setClassId] = useState('')
  const [specId, setSpecId] = useState('')
  const [isMain, setIsMain] = useState(false)

  const [classes, setClasses] = useState<WowClass[]>([])
  const [classSpecs, setClassSpecs] = useState<ClassSpec[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && character) {
      loadClasses()
      loadClassSpecs()
      // Set form values from character
      setName(character.name)
      setClassId(character.class_id || '')
      setSpecId(character.spec_id || '')
      setIsMain(character.is_main)
      setError('')
      setShowDeleteConfirm(false)
      setDeleteConfirmName('')
    }
  }, [isOpen, character])

  const loadClasses = async () => {
    const { data, error } = await supabase
      .from('wow_classes')
      .select('*')
      .order('name', { ascending: true })

    if (!error) {
      setClasses(data || [])
    }
  }

  const loadClassSpecs = async () => {
    const { data, error } = await supabase
      .from('class_specs')
      .select('*')
      .order('name', { ascending: true })

    if (!error) {
      setClassSpecs(data || [])
    }
  }

  const getAvailableSpecs = () => {
    if (!classId) return []
    return classSpecs.filter(spec => spec.class_id === classId)
  }

  const handleClassChange = (newClassId: string) => {
    setClassId(newClassId)
    setSpecId('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!character) return
    setError('')

    if (!name.trim()) {
      setError('Character name is required')
      return
    }

    if (!classId) {
      setError('Character class is required')
      return
    }

    // Spec is required if the class has specs available
    const availableSpecs = classSpecs.filter(spec => spec.class_id === classId)
    if (availableSpecs.length > 0 && !specId) {
      setError('Specialization is required')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/characters/${character.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          realm: null,
          class_id: classId,
          spec_id: specId || null,
          level: null,
          is_main: isMain,
          region: 'us'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to update character')
        setSaving(false)
        return
      }

      await refreshCharacters()
      setSaving(false)
      onClose()
      onSuccess?.()
    } catch (err) {
      console.error('Error updating character:', err)
      setError('An error occurred while updating the character')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!character) return

    if (deleteConfirmName.toLowerCase() !== character.name.toLowerCase()) {
      setError('Character name does not match')
      return
    }

    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/characters/${character.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmName: deleteConfirmName
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to delete character')
        setDeleting(false)
        return
      }

      await refreshCharacters()
      setDeleting(false)
      onClose()
      onSuccess?.()
    } catch (err) {
      console.error('Error deleting character:', err)
      setError('An error occurred while deleting the character')
      setDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setDeleteConfirmName('')
  }

  if (!isOpen || !character) return null

  const selectedClass = classes.find(c => c.id === classId)
  const guildCount = characterMemberships.filter(m => m.character_id === character.id).length

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0d0e11] border border-[#383838] rounded-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#383838] flex items-center justify-between bg-[#141519]">
          <h3 className="text-[24px] font-bold text-white">Edit Character</h3>
          <button
            onClick={onClose}
            className="text-[#a1a1a1] hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-5 overflow-y-auto">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-900/20 border border-red-600 rounded-xl">
                <p className="text-red-200 text-[13px]">{error}</p>
              </div>
            )}

            {/* Character Name */}
            <div>
              <label className="block text-[13px] font-medium text-white mb-2">
                Character Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition"
                placeholder="Enter character name"
              />
            </div>

            {/* Class */}
            <div>
              <label className="block text-[13px] font-medium text-white mb-2">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                value={classId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full pl-4 pr-12 py-2.5 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition select-custom-sm cursor-pointer"
                style={selectedClass ? { color: selectedClass.color_hex } : undefined}
              >
                <option value="" className="text-white bg-[#151515]">Select a class</option>
                {classes.map((cls) => (
                  <option
                    key={cls.id}
                    value={cls.id}
                    style={{ color: cls.color_hex }}
                    className="bg-[#151515]"
                  >
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Spec */}
            {classId && getAvailableSpecs().length > 0 && (
              <div>
                <label className="block text-[13px] font-medium text-white mb-2">
                  Specialization <span className="text-red-500">*</span>
                </label>
                <select
                  value={specId}
                  onChange={(e) => setSpecId(e.target.value)}
                  className="w-full pl-4 pr-12 py-2.5 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition select-custom-sm cursor-pointer"
                >
                  <option value="">Select a specialization</option>
                  {getAvailableSpecs().map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Main/Alt Toggle */}
            <div>
              <label className="block text-[13px] font-medium text-white mb-3">
                Character Type
              </label>
              <div className="relative flex bg-[#0d0e11] border border-[#383838] rounded-[52px] p-1">
                {/* Sliding indicator */}
                <div
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#252525] border border-[#404040] rounded-[44px] transition-all duration-200 ease-out ${
                    isMain ? 'left-1' : 'left-[calc(50%+2px)]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setIsMain(true)}
                  className={`relative z-10 flex-1 px-6 py-2 rounded-[44px] text-[13px] font-medium transition-colors duration-200 ${
                    isMain ? 'text-white' : 'text-[#606060]'
                  }`}
                >
                  Main
                </button>
                <button
                  type="button"
                  onClick={() => setIsMain(false)}
                  className={`relative z-10 flex-1 px-6 py-2 rounded-[44px] text-[13px] font-medium transition-colors duration-200 ${
                    !isMain ? 'text-white' : 'text-[#606060]'
                  }`}
                >
                  Alt
                </button>
              </div>
            </div>

            {/* Guild Info */}
            {guildCount > 0 && (
              <div className="text-[13px] text-[#a1a1a1] bg-[#151515] border border-[#383838] rounded-xl p-4">
                <p className="font-medium text-white mb-1">Guild Memberships</p>
                <p>This character is a member of {guildCount} guild{guildCount !== 1 ? 's' : ''}</p>
              </div>
            )}

            {/* Delete Section */}
            <div className="border-t border-[#383838] pt-5">
              <p className="text-[13px] font-medium text-red-400 mb-2">Danger Zone</p>
              <p className="text-[12px] text-[#a1a1a1] mb-3">
                Deleting a character will remove all loot submissions and guild memberships.
              </p>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-900/20 hover:bg-red-900/30 border border-red-600/50 rounded-[52px] text-red-400 text-[13px] font-medium transition flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Character
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-red-900/20 border border-red-600/50 rounded-xl">
                    <p className="text-red-200 text-[12px] mb-2">
                      Type <span className="font-bold text-white">{character.name}</span> to confirm:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmName}
                      onChange={(e) => setDeleteConfirmName(e.target.value)}
                      placeholder="Type character name"
                      className="w-full px-3 py-2 bg-[#0d0e11] border border-red-600/50 rounded-lg text-white text-[13px] focus:outline-none focus:border-red-500 transition"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting || deleteConfirmName.toLowerCase() !== character.name.toLowerCase()}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-[52px] text-white text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleting ? 'Deleting...' : 'Delete Forever'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelDelete}
                      disabled={deleting}
                      className="px-4 py-2 bg-[#151515] hover:bg-[#1a1a1a] border border-[#383838] rounded-[52px] text-white text-[13px] font-medium transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[#383838] bg-[#141519] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2.5 bg-[#151515] hover:bg-[#1a1a1a] border border-[#383838] rounded-[52px] text-white text-[13px] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-white hover:bg-gray-100 rounded-[52px] text-black text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
