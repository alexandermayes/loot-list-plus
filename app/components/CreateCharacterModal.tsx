'use client'

import { useState, useEffect } from 'react'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { createClient } from '@/utils/supabase/client'

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

interface CreateCharacterModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateCharacterModal({ isOpen, onClose, onSuccess }: CreateCharacterModalProps) {
  const { activeGuild, refreshCharacters } = useGuildContext()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [classId, setClassId] = useState('')
  const [specId, setSpecId] = useState('')
  const [isMain, setIsMain] = useState(true)

  const [classes, setClasses] = useState<WowClass[]>([])
  const [classSpecs, setClassSpecs] = useState<ClassSpec[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      loadClasses()
      loadClassSpecs()
      // Reset form when opening
      setName('')
      setClassId('')
      setSpecId('')
      setIsMain(true)
      setError('')
    }
  }, [isOpen])

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

    setLoading(true)

    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
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
        setError(data.error || 'Failed to create character')
        setLoading(false)
        return
      }

      // If user has an active guild, automatically add character to it
      if (activeGuild && data.character) {
        try {
          // Check if user is the guild creator - they should be Guild Master
          const { data: { user } } = await supabase.auth.getUser()
          const isGuildCreator = user && activeGuild.created_by === user.id
          const role = isGuildCreator ? 'Guild Master' : 'Member'

          await fetch(`/api/characters/${data.character.id}/guilds`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              guild_id: activeGuild.id,
              role,
              joined_via: 'manual'
            })
          })
        } catch (membershipErr) {
          console.error('Error adding character to guild:', membershipErr)
        }
      }

      // Refresh character list in context
      await refreshCharacters()

      setLoading(false)
      onClose()
      onSuccess?.()
    } catch (err) {
      console.error('Error creating character:', err)
      setError('An error occurred while creating the character')
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const selectedClass = classes.find(c => c.id === classId)

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
          <h3 className="text-[24px] font-bold text-white">Create Character</h3>
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
                autoFocus
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
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[#383838] bg-[#141519] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2.5 bg-[#151515] hover:bg-[#1a1a1a] border border-[#383838] rounded-[52px] text-white text-[13px] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-white hover:bg-gray-100 rounded-[52px] text-black text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Character'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
