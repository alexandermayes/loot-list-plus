'use client'

import { useState, useEffect } from 'react'
import { useGuildContext, Character } from '@/app/contexts/GuildContext'
import { createClient } from '@/utils/supabase/client'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete01Icon, Link01Icon } from '@hugeicons/core-free-icons'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useNotification } from '@/app/contexts/NotificationContext'
import { BattlenetCharacterPickerModal } from '@/app/components/BattlenetCharacterPickerModal'
import Image from 'next/image'
import { trackClientEvent } from '@/utils/analytics/client'

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
  const { refreshCharacters, characterMemberships, userCharacters } = useGuildContext()
  const { showNotification } = useNotification()
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
  const [hasBattlenet, setHasBattlenet] = useState(false)
  const [showLinkPicker, setShowLinkPicker] = useState(false)

  useEffect(() => {
    if (isOpen && character) {
      loadClasses()
      loadClassSpecs()
      checkBattlenetAccount()
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

  const checkBattlenetAccount = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('battlenet_accounts')
      .select('id')
      .eq('user_id', user.id)
      .single()

    setHasBattlenet(!!data)
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
      trackClientEvent('character_deleted')
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
  const existingBattleNetIds = userCharacters
    .map((c: { battle_net_id?: number | null }) => c.battle_net_id)
    .filter((id): id is number => id != null)

  return (
    <>
    <Modal open={isOpen && !showLinkPicker} onClose={onClose} size="default">
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <ModalHeader onClose={onClose}>
          <ModalTitle>Edit character</ModalTitle>
        </ModalHeader>

        <ModalBody className="space-y-5">
          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Character Name */}
          <div>
            <Label className="mb-2">
              Character name <span className="text-destructive">*</span>
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
          <div className="flex items-center justify-between">
            <Label>Character type</Label>
            <SegmentedControl
              size="sm"
              variant="primary"
              options={[
                { value: 'main', label: 'Main' },
                { value: 'alt', label: 'Alt' },
              ]}
              value={isMain ? 'main' : 'alt'}
              onChange={(value) => setIsMain(value === 'main')}
            />
          </div>

          {/* Guild Info */}
          {guildCount > 0 && (
            <div className="text-[13px] text-muted-foreground bg-background-elevated border border-border-strong rounded-xl p-4">
              <p className="font-medium text-foreground mb-1">Guild memberships</p>
              <p>This character is a member of {guildCount} guild{guildCount !== 1 ? 's' : ''}</p>
            </div>
          )}

          {/* Link to Battle.net */}
          {!character.battle_net_id && hasBattlenet && (
            <div className="flex items-center justify-between gap-3 p-3 bg-background-elevated border border-border rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-[#0074E0]/10 border border-[#0074E0]/30 rounded-lg flex items-center justify-center shrink-0">
                  <Image src="/icons/battlenet.svg" alt="Battle.net" width={20} height={20} className="w-5 h-5" style={{ filter: 'brightness(0) saturate(100%) invert(30%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(97%) contrast(101%)' }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">Link to Battle.net</p>
                  <p className="text-[12px] text-muted-foreground">Enable gear sync by linking to your account</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLinkPicker(true)}
              >
                <HugeiconsIcon icon={Link01Icon} size={14} />
                Link
              </Button>
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
                Delete character
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
                    {deleting ? 'Deleting...' : 'Delete forever'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
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
            variant="outline"
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
            Save changes
          </Button>
        </ModalFooter>
      </form>
    </Modal>

    <BattlenetCharacterPickerModal
      open={showLinkPicker}
      onClose={() => setShowLinkPicker(false)}
      existingBattleNetIds={existingBattleNetIds}
      mode="link"
      linkCharacterId={character.id}
      linkCharacterName={character.name}
      onLinkComplete={() => {
        refreshCharacters()
        onSuccess?.()
      }}
    />
    </>
  )
}
