'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { createClient } from '@/utils/supabase/client'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { Heading } from '@/components/ui/typography'

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
    <div className="min-h-screen bg-background-subtle p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
            <span className="text-[14px]">Back</span>
          </button>

          <Heading level={1}>Create Character</Heading>
          <p className="text-muted-foreground mt-1 text-base">
            Add a new character to your account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-xl">
            <p className="text-destructive text-[14px]">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-background-elevated border border-border rounded-xl p-6">
          <div className="space-y-6">
            {/* Character Name */}
            <div>
              <label className="block text-foreground text-[14px] font-medium mb-2">
                Character Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-background-subtle border border-border rounded-xl text-foreground text-[14px] focus:outline-none focus:border-accent transition"
                placeholder="Enter character name"
                required
              />
            </div>

            {/* Class */}
            <div>
              <label className="block text-foreground text-[14px] font-medium mb-2">
                Class <span className="text-destructive">*</span>
              </label>
              <select
                value={classId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full px-4 py-3 bg-background-subtle border border-border rounded-xl text-foreground text-[14px] focus:outline-none focus:border-accent transition"
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
                <label className="block text-foreground text-[14px] font-medium mb-2">
                  Specialization (Optional)
                </label>
                <select
                  value={specId}
                  onChange={(e) => setSpecId(e.target.value)}
                  className="w-full px-4 py-3 bg-background-subtle border border-border rounded-xl text-foreground text-[14px] focus:outline-none focus:border-accent transition"
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
              <label className="block text-foreground text-[14px] font-medium mb-3">
                Character Type
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsMain(true)}
                  className={`flex-1 px-6 py-3 rounded-xl text-[14px] font-medium transition ${
                    isMain
                      ? 'bg-accent text-foreground'
                      : 'bg-background-subtle border border-border text-muted-foreground hover:border-border-strong'
                  }`}
                >
                  Main
                </button>
                <button
                  type="button"
                  onClick={() => setIsMain(false)}
                  className={`flex-1 px-6 py-3 rounded-xl text-[14px] font-medium transition ${
                    !isMain
                      ? 'bg-accent text-foreground'
                      : 'bg-background-subtle border border-border text-muted-foreground hover:border-border-strong'
                  }`}
                >
                  Alt
                </button>
              </div>
              <p className="text-[12px] text-muted-foreground mt-2">
                You can only have one main character. Setting this as main will change your current main to an alt.
              </p>
            </div>

            <div className="text-[13px] text-muted-foreground bg-background-subtle border border-border rounded-lg p-4">
              <p className="font-medium text-foreground mb-2">Note:</p>
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
              className="px-8 py-3 bg-primary hover:bg-primary/90 rounded-[52px] text-primary-foreground font-medium text-[16px] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Character'}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="px-8 py-3 bg-background-elevated hover:bg-muted border border-border rounded-[52px] text-foreground font-medium text-[16px] transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
