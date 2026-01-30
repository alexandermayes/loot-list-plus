'use client'

import { useState, useEffect } from 'react'
import { useGuildContext, Character } from '@/app/contexts/GuildContext'
import { createClient } from '@/utils/supabase/client'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete01Icon } from '@hugeicons/core-free-icons'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

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
      // Store initial values for change detection
      setInitialValues({
        name: character.name,
        classId: character.class_id || '',
        specId: character.spec_id || '',
        isMain: character.is_main
      })
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
        setError(data.error || 'Couldn\'t save changes. Check the name and try again.')
        setSaving(false)
        return
      }

      await refreshCharacters()
      setSaving(false)
      onClose()
      onSuccess?.()
    } catch (err) {
      console.error('Error updating character:', err)
      setError('Couldn\'t save changes. Check your connection and try again.')
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
        setError(data.error || 'Couldn\'t delete character. Try again or contact an officer.')
        setDeleting(false)
        return
      }

      // Redirect to dashboard to refresh all state
      window.location.href = '/overview'
    } catch (err) {
      console.error('Error deleting character:', err)
      setError('Couldn\'t delete character. Check your connection and try again.')
      setDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setDeleteConfirmName('')
  }

  if (!character) return null

  const selectedClass = classes.find(c => c.id === classId)
  const guildCount = characterMemberships.filter(m => m.character_id === character.id).length

  return (
    <Modal open={isOpen} onClose={onClose} size="default">
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <ModalHeader onClose={onClose}>
          <ModalTitle>Edit character</ModalTitle>
        </ModalHeader>

        <ModalBody className="space-y-5">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-xl">
              <p className="text-destructive text-[13px]">{error}</p>
            </div>
          )}

          {/* Character Name */}
          <div>
            <Label className="mb-2">
              Character Name <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter character name"
            />
          </div>

          {/* Class */}
          <div>
            <Label className="mb-2">
              Class <span className="text-destructive">*</span>
            </Label>
            <Select
              value={classId}
              onChange={(e) => handleClassChange(e.target.value)}
              style={selectedClass ? { color: selectedClass.color_hex } : undefined}
            >
              <option value="" className="text-foreground bg-background-elevated">Select a class</option>
              {classes.map((cls) => (
                <option
                  key={cls.id}
                  value={cls.id}
                  style={{ color: cls.color_hex }}
                  className="bg-background-elevated"
                >
                  {cls.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Spec */}
          {classId && getAvailableSpecs().length > 0 && (
            <div>
              <Label className="mb-2">
                Specialization <span className="text-destructive">*</span>
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
            <Label className="mb-3">Character type</Label>
            <div className="relative flex bg-background-subtle border border-border-strong rounded-[52px] p-1">
              {/* Sliding indicator */}
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-muted border border-border-strong rounded-[44px] transition-all duration-200 ease-out ${
                  isMain ? 'left-1' : 'left-[calc(50%+2px)]'
                }`}
              />
              <button
                type="button"
                onClick={() => setIsMain(true)}
                className={`relative z-10 flex-1 px-6 py-2 rounded-[44px] text-[13px] font-medium transition-colors duration-200 ${
                  isMain ? 'text-foreground' : 'text-foreground-muted'
                }`}
              >
                Main
              </button>
              <button
                type="button"
                onClick={() => setIsMain(false)}
                className={`relative z-10 flex-1 px-6 py-2 rounded-[44px] text-[13px] font-medium transition-colors duration-200 ${
                  !isMain ? 'text-foreground' : 'text-foreground-muted'
                }`}
              >
                Alt
              </button>
            </div>
          </div>

          {/* Guild Info */}
          {guildCount > 0 && (
            <div className="text-[13px] text-muted-foreground bg-background-elevated border border-border-strong rounded-xl p-4">
              <p className="font-medium text-foreground mb-1">Guild memberships</p>
              <p>This character is a member of {guildCount} guild{guildCount !== 1 ? 's' : ''}</p>
            </div>
          )}

          {/* Delete Section */}
          <div className="border-t border-border-strong pt-5">
            <p className="text-[13px] font-medium text-destructive mb-2">Danger zone</p>
            <p className="text-[12px] text-muted-foreground mb-3">
              Deleting a character will remove all loot submissions and guild memberships.
            </p>

            {!showDeleteConfirm ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                <HugeiconsIcon icon={Delete01Icon} size={16} />
                Delete Character
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-xl">
                  <p className="text-destructive text-[12px] mb-2">
                    Type <span className="font-bold text-foreground">{character.name}</span> to confirm:
                  </p>
                  <Input
                    type="text"
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder="Type character name"
                    variant="rounded"
                    size="sm"
                    className="border-destructive/50 focus:border-destructive"
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting || deleteConfirmName.toLowerCase() !== character.name.toLowerCase()}
                  >
                    <HugeiconsIcon icon={Delete01Icon} size={16} />
                    {deleting ? 'Deleting...' : 'Delete Forever'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCancelDelete}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={saving}
            disabled={!hasChanges}
          >
            Save Changes
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
