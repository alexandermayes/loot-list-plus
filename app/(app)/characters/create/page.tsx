'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft } from 'lucide-react'

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

export default function CreateCharacterPage() {
  const router = useRouter()
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

  useEffect(() => {
    document.title = 'LootList+ • Create Character'
    loadClasses()
    loadClassSpecs()
  }, [])

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
          const membershipResponse = await fetch(`/api/characters/${data.character.id}/guilds`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              guild_id: activeGuild.id,
              role: 'Member',
              joined_via: 'manual'
            })
          })

          if (!membershipResponse.ok) {
            console.error('Failed to add character to guild')
          }
        } catch (membershipErr) {
          console.error('Error adding character to guild:', membershipErr)
        }
      }

      // Refresh character list in context
      await refreshCharacters()

      // Redirect to character management page
      router.push('/characters/manage')
    } catch (err) {
      console.error('Error creating character:', err)
      setError('An error occurred while creating the character')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0e11] p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-[#a1a1a1] hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[14px]">Back</span>
          </button>

          <h1 className="text-[42px] font-bold text-white mb-2">Create Character</h1>
          <p className="text-[16px] text-[#a1a1a1]">
            Add a new character to your account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-600 rounded-xl">
            <p className="text-red-200 text-[14px]">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
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

            <div className="text-[13px] text-[#a1a1a1] bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] rounded-lg p-4">
              <p className="font-medium text-white mb-2">Note:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Main characters are displayed first in character lists</li>
                <li>Battle.net integration for automatic character import coming soon</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 mt-8">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-[#ff8000] hover:bg-[#ff9500] rounded-[52px] text-white font-medium text-[16px] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Character'}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="px-8 py-3 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[52px] text-white font-medium text-[16px] transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
