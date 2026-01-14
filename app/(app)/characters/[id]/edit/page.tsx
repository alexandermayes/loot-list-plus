'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useGuildContext, Character } from '@/app/contexts/GuildContext'
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft, Trash2 } from 'lucide-react'

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

export default function EditCharacterPage() {
  const router = useRouter()
  const params = useParams()
  const characterId = params.id as string
  const { userCharacters, characterMemberships, refreshCharacters } = useGuildContext()
  const supabase = createClient()

  const [character, setCharacter] = useState<Character | null>(null)
  const [name, setName] = useState('')
  const [classId, setClassId] = useState('')
  const [specId, setSpecId] = useState('')
  const [isMain, setIsMain] = useState(false)

  const [classes, setClasses] = useState<WowClass[]>([])
  const [classSpecs, setClassSpecs] = useState<ClassSpec[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'LootList+ • Edit Character'
    loadClasses()
    loadClassSpecs()
    loadCharacter()
  }, [characterId, userCharacters])

  const loadClasses = async () => {
    const { data, error } = await supabase
      .from('wow_classes')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading classes:', error)
    } else {
      setClasses(data || [])
    }
  }

  const loadClassSpecs = async () => {
    const { data, error } = await supabase
      .from('class_specs')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading class specs:', error)
    } else {
      setClassSpecs(data || [])
    }
  }

  // Get available specs for the selected class
  const getAvailableSpecs = () => {
    if (!classId) return []
    return classSpecs.filter(spec => spec.class_id === classId)
  }

  // Reset spec when class changes
  const handleClassChange = (newClassId: string) => {
    setClassId(newClassId)
    setSpecId('') // Reset spec when class changes
  }

  const loadCharacter = () => {
    const char = userCharacters.find(c => c.id === characterId)
    if (!char) {
      setError('Character not found')
      setLoading(false)
      return
    }

    setCharacter(char)
    setName(char.name)
    setClassId(char.class_id || '')
    setSpecId(char.spec_id || '')
    setIsMain(char.is_main)
    setLoading(false)
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

    setSaving(true)

    try {
      const response = await fetch(`/api/characters/${characterId}`, {
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

      // Refresh character list in context
      await refreshCharacters()

      // Redirect back to management page
      router.push('/characters/manage')
    } catch (err) {
      console.error('Error updating character:', err)
      setError('An error occurred while updating the character')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/characters/${characterId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to delete character')
        setDeleting(false)
        setShowDeleteConfirm(false)
        return
      }

      // Refresh character list in context
      await refreshCharacters()

      // Redirect back to management page
      router.push('/characters/manage')
    } catch (err) {
      console.error('Error deleting character:', err)
      setError('An error occurred while deleting the character')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const guildCount = characterMemberships.filter(
    m => m.character_id === characterId
  ).length

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0e11] p-8 flex items-center justify-center">
        <p className="text-[#a1a1a1] text-[16px]">Loading character...</p>
      </div>
    )
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-[#0d0e11] p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-12 text-center">
            <h2 className="text-[24px] font-bold text-white mb-4">Character Not Found</h2>
            <button
              onClick={() => router.push('/characters/manage')}
              className="px-8 py-3 bg-[#ff8000] hover:bg-[#ff9500] rounded-[52px] text-white font-medium text-[16px] transition"
            >
              Back to Characters
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0e11] p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/characters/manage')}
            className="mb-4 flex items-center gap-2 text-[#a1a1a1] hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[14px]">Back to Characters</span>
          </button>

          <h1 className="text-[42px] font-bold text-white mb-2">Edit Character</h1>
          <p className="text-[16px] text-[#a1a1a1]">
            Update character details and settings
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-600 rounded-xl">
            <p className="text-red-200 text-[14px]">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 mb-6">
          <div className="space-y-6">
            {/* Character Name */}
            <div>
              <label className="block text-white text-[14px] font-medium mb-2">
                Character Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] rounded-xl text-white text-[14px] focus:outline-none focus:border-[#ff8000] transition"
                placeholder="Enter character name"
                required
              />
            </div>

            {/* Class */}
            <div>
              <label className="block text-white text-[14px] font-medium mb-2">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                value={classId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full px-4 py-3 bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] rounded-xl text-white text-[14px] focus:outline-none focus:border-[#ff8000] transition"
                required
              >
                <option value="">Select a class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Spec */}
            {classId && getAvailableSpecs().length > 0 && (
              <div>
                <label className="block text-white text-[14px] font-medium mb-2">
                  Specialization (Optional)
                </label>
                <select
                  value={specId}
                  onChange={(e) => setSpecId(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] rounded-xl text-white text-[14px] focus:outline-none focus:border-[#ff8000] transition"
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
              <label className="block text-white text-[14px] font-medium mb-3">
                Character Type
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsMain(true)}
                  className={`flex-1 px-6 py-3 rounded-xl text-[14px] font-medium transition ${
                    isMain
                      ? 'bg-[#ff8000] text-white'
                      : 'bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] text-[#a1a1a1] hover:border-[rgba(255,255,255,0.2)]'
                  }`}
                >
                  Main
                </button>
                <button
                  type="button"
                  onClick={() => setIsMain(false)}
                  className={`flex-1 px-6 py-3 rounded-xl text-[14px] font-medium transition ${
                    !isMain
                      ? 'bg-[#ff8000] text-white'
                      : 'bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] text-[#a1a1a1] hover:border-[rgba(255,255,255,0.2)]'
                  }`}
                >
                  Alt
                </button>
              </div>
              <p className="text-[12px] text-[#a1a1a1] mt-2">
                You can only have one main character. Setting this as main will change your current main to an alt.
              </p>
            </div>

            {/* Guild Info */}
            {guildCount > 0 && (
              <div className="text-[13px] text-[#a1a1a1] bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] rounded-lg p-4">
                <p className="font-medium text-white mb-1">Guild Memberships</p>
                <p>This character is a member of {guildCount} guild{guildCount !== 1 ? 's' : ''}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-8">
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 bg-[#ff8000] hover:bg-[#ff9500] rounded-[52px] text-white font-medium text-[16px] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                type="button"
                onClick={() => router.push('/characters/manage')}
                className="px-8 py-3 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[52px] text-white font-medium text-[16px] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>

        {/* Delete Character Section */}
        <div className="bg-[#141519] border border-red-900/50 rounded-xl p-6">
          <h2 className="text-[18px] font-semibold text-red-400 mb-2">Danger Zone</h2>
          <p className="text-[14px] text-[#a1a1a1] mb-4">
            Deleting a character is permanent and cannot be undone. {guildCount > 0 && 'This will remove the character from all guilds.'}
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-6 py-3 bg-red-900/20 hover:bg-red-900/30 border border-red-600 rounded-[52px] text-red-400 font-medium text-[14px] transition flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Character
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-[52px] text-white font-medium text-[14px] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-6 py-3 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[52px] text-white font-medium text-[14px] transition"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
