'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useGuildContext, Character } from '@/app/contexts/GuildContext'
import { createClient } from '@/utils/supabase/client'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Delete01Icon } from '@hugeicons/core-free-icons'
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
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
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
    if (!character) return

    // Verify name matches
    if (deleteConfirmName.toLowerCase() !== character.name.toLowerCase()) {
      setError('Character name does not match')
      return
    }

    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/characters/${characterId}`, {
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

      // Refresh character list in context
      await refreshCharacters()

      // Redirect back to management page
      router.push('/characters/manage')
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

  const guildCount = characterMemberships.filter(
    m => m.character_id === characterId
  ).length

  if (loading) {
    return (
      <div className="min-h-screen bg-background-subtle p-8 flex items-center justify-center">
        <p className="text-muted-foreground text-[16px]">Loading character...</p>
      </div>
    )
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-background-subtle p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-background-elevated border border-border rounded-xl p-12 text-center">
            <h2 className="text-[24px] font-bold text-foreground mb-4">Character not found</h2>
            <button
              onClick={() => router.push('/characters/manage')}
              className="px-8 py-3 bg-primary hover:bg-primary/90 rounded-[52px] text-primary-foreground font-medium text-[16px] transition"
            >
              Back to Characters
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-subtle p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/characters/manage')}
            className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
            <span className="text-[14px]">Back to Characters</span>
          </button>

          <Heading level={1} className="mb-2">Edit Character</Heading>
          <p className="text-[16px] text-muted-foreground">
            Update character details and settings
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-xl">
            <p className="text-destructive text-[14px]">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-background-elevated border border-border rounded-xl p-6 mb-6">
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

            {/* Guild Info */}
            {guildCount > 0 && (
              <div className="text-[13px] text-muted-foreground bg-background-subtle border border-border rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">Guild Memberships</p>
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
                className="px-8 py-3 bg-primary hover:bg-primary/90 rounded-[52px] text-primary-foreground font-medium text-[16px] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                type="button"
                onClick={() => router.push('/characters/manage')}
                className="px-8 py-3 bg-background-elevated hover:bg-muted border border-border rounded-[52px] text-foreground font-medium text-[16px] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>

        {/* Delete Character Section */}
        <div className="bg-background-elevated border border-destructive/30 rounded-xl p-6">
          <h2 className="text-[18px] font-semibold text-destructive mb-2">Danger Zone</h2>
          <p className="text-[14px] text-muted-foreground mb-4">
            Deleting a character is permanent and cannot be undone. This will delete all loot submissions and remove the character from all guilds.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-6 py-3 bg-destructive/10 hover:bg-destructive/20 border border-destructive rounded-[52px] text-destructive font-medium text-[14px] transition flex items-center gap-2"
            >
              <HugeiconsIcon icon={Delete01Icon} size={16} />
              Delete Character
            </button>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-xl">
                <p className="text-destructive text-[14px] mb-3">
                  To confirm deletion, type <span className="font-bold text-foreground">{character?.name}</span> below:
                </p>
                <input
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder="Type character name to confirm"
                  className="w-full px-4 py-3 bg-background-subtle border border-destructive/50 rounded-xl text-foreground text-[14px] focus:outline-none focus:border-destructive transition"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleDelete}
                  disabled={deleting || deleteConfirmName.toLowerCase() !== character?.name.toLowerCase()}
                  className="px-6 py-3 bg-destructive hover:bg-destructive/90 rounded-[52px] text-destructive-foreground font-medium text-[14px] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <HugeiconsIcon icon={Delete01Icon} size={16} />
                  {deleting ? 'Deleting...' : 'Delete Forever'}
                </button>
                <button
                  onClick={handleCancelDelete}
                  disabled={deleting}
                  className="px-6 py-3 bg-background-elevated hover:bg-muted border border-border rounded-[52px] text-foreground font-medium text-[14px] transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
