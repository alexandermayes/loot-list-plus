'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useGuildContext, Character } from '@/app/contexts/GuildContext'
import { createClient } from '@/utils/supabase/client'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Delete01Icon } from '@hugeicons/core-free-icons'
import { Heading } from '@/components/ui/typography'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CharacterFormSkeleton } from '@/components/ui/skeletons'

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

  // Initial values for change detection
  const [initialValues, setInitialValues] = useState({
    name: '',
    classId: '',
    specId: '',
    isMain: false
  })

  // Check if form has unsaved changes
  const hasChanges =
    name !== initialValues.name ||
    classId !== initialValues.classId ||
    specId !== initialValues.specId ||
    isMain !== initialValues.isMain

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

    // Store initial values for change detection
    setInitialValues({
      name: char.name,
      classId: char.class_id || '',
      specId: char.spec_id || '',
      isMain: char.is_main
    })
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
    return <CharacterFormSkeleton />
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-background-subtle p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-background-elevated border border-border rounded-xl p-12 text-center">
            <h2 className="text-[24px] font-bold text-foreground mb-4">Character not found</h2>
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/characters/manage')}
            >
              Back to Characters
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-subtle p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/characters/manage')}
            className="mb-4 px-0"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
            <span className="text-[14px]">Back to Characters</span>
          </Button>

          <Heading level={1}>Edit Character</Heading>
          <p className="text-muted-foreground mt-1 text-base">
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
              <Label size="lg" className="block mb-2">
                Character Name <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter character name"
                required
              />
            </div>

            {/* Class */}
            <div>
              <Label size="lg" className="block mb-2">
                Class <span className="text-destructive">*</span>
              </Label>
              <Select
                value={classId}
                onChange={(e) => handleClassChange(e.target.value)}
                required
              >
                <option value="">Select a class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Spec */}
            {classId && getAvailableSpecs().length > 0 && (
              <div>
                <Label size="lg" className="block mb-2">
                  Specialization (Optional)
                </Label>
                <Select
                  value={specId}
                  onChange={(e) => setSpecId(e.target.value)}
                >
                  <option value="">Select a specialization</option>
                  {getAvailableSpecs().map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Main/Alt Toggle */}
            <div>
              <Label size="lg" className="block mb-3">
                Character Type
              </Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={isMain ? 'accent-subtle' : 'secondary'}
                  onClick={() => setIsMain(true)}
                  className="flex-1"
                >
                  Main
                </Button>
                <Button
                  type="button"
                  variant={!isMain ? 'accent-subtle' : 'secondary'}
                  onClick={() => setIsMain(false)}
                  className="flex-1"
                >
                  Alt
                </Button>
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mt-8">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!hasChanges}
              loading={saving}
              loadingText="Saving..."
            >
              Save Changes
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => router.push('/characters/manage')}
            >
              Cancel
            </Button>
          </div>
        </form>

        {/* Delete Character Section */}
        <div className="bg-background-elevated border border-destructive/30 rounded-xl p-6">
          <h2 className="text-[18px] font-semibold text-destructive mb-2">Danger Zone</h2>
          <p className="text-[14px] text-muted-foreground mb-4">
            Deleting a character is permanent and cannot be undone. This will delete all loot submissions and remove the character from all guilds.
          </p>

          {!showDeleteConfirm ? (
            <Button
              variant="destructive-outline"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <HugeiconsIcon icon={Delete01Icon} size={16} />
              Delete Character
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-xl">
                <p className="text-destructive text-[14px] mb-3">
                  To confirm deletion, type <span className="font-bold text-foreground">{character?.name}</span> below:
                </p>
                <Input
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder="Type character name to confirm"
                  className="border-destructive/50 focus:border-destructive"
                  autoFocus
                />
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteConfirmName.toLowerCase() !== character?.name.toLowerCase()}
                  loading={deleting}
                  loadingText="Deleting..."
                >
                  <HugeiconsIcon icon={Delete01Icon} size={16} />
                  Delete Forever
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleCancelDelete}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
