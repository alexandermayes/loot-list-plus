'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useGuildContext, Character } from '@/app/contexts/GuildContext'
import { createClient } from '@/utils/supabase/client'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Delete01Icon, Download04Icon, Link01Icon, Logout01Icon } from '@hugeicons/core-free-icons'
import { useNotification } from '@/app/contexts/NotificationContext'
import { Heading } from '@/components/ui/typography'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CharacterFormSkeleton } from '@/components/ui/skeletons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { BattlenetCharacterPickerModal } from '@/app/components/BattlenetCharacterPickerModal'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/modal'
import Image from 'next/image'

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
  const { user, userCharacters, characterMemberships, refreshCharacters } = useGuildContext()
  const { showNotification } = useNotification()
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
  const [syncingGear, setSyncingGear] = useState(false)
  const [error, setError] = useState('')
  const [hasBattlenet, setHasBattlenet] = useState(false)
  const [showLinkPicker, setShowLinkPicker] = useState(false)
  const [removeGuildId, setRemoveGuildId] = useState<string | null>(null)
  const [removingGuildId, setRemovingGuildId] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'LootList+ • Edit Character'
    loadClasses()
    loadClassSpecs()
    loadCharacter()
    checkBattlenetAccount()
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
        setError(data.error || 'Couldn\'t update character. Check the form and try again.')
        setSaving(false)
        return
      }

      // Refresh character list in context
      await refreshCharacters()

      // Redirect back to management page
      router.push('/characters/manage')
    } catch (err) {
      console.error('Error updating character:', err)
      setError('Couldn\'t update character. Check your connection and try again.')
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
        setError(data.error || 'Couldn\'t delete character. Try again.')
        setDeleting(false)
        return
      }

      // Refresh character list in context
      await refreshCharacters()

      // Redirect back to management page
      router.push('/characters/manage')
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

  const handleSyncGear = async () => {
    if (!character?.battle_net_id) return

    setSyncingGear(true)

    try {
      const response = await fetch('/api/battlenet/characters/sync-gear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          version: character.game_version || 'cata-classic',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        showNotification('error', data.error || 'Couldn\'t sync gear from Battle.net')
        return
      }

      showNotification('success', `Gear synced. ${data.gear_synced} items updated.`)
    } catch {
      showNotification('error', 'Couldn\'t sync gear. Check your connection.')
    } finally {
      setSyncingGear(false)
    }
  }

  const characterGuildMemberships = characterMemberships.filter(
    m => m.character_id === characterId
  )

  const isLastOwnCharacterInGuild = (guildId: string) =>
    !characterMemberships.some(
      m => m.guild_id === guildId && m.character_id !== characterId
    )

  const handleRemoveFromGuild = async (guildId: string) => {
    setRemovingGuildId(guildId)
    try {
      const response = await fetch(`/api/characters/${characterId}/guilds`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: guildId }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        showNotification('error', data.error || 'Couldn\'t remove character from guild. Try again.')
        return
      }

      await refreshCharacters()
      showNotification('success', 'Character removed from guild.')
    } catch {
      showNotification('error', 'Couldn\'t remove character from guild. Check your connection and try again.')
    } finally {
      setRemovingGuildId(null)
      setRemoveGuildId(null)
    }
  }

  const pendingRemovalMembership = removeGuildId
    ? characterGuildMemberships.find(m => m.guild_id === removeGuildId)
    : null

  const existingBattleNetIds = userCharacters
    .map((c: { battle_net_id?: number | null }) => c.battle_net_id)
    .filter((id): id is number => id != null)

  if (loading) {
    return <CharacterFormSkeleton />
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-background-subtle p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-background-elevated border border-border rounded-xl p-12 text-center">
            <Heading level={2} className="mb-4">Character not found</Heading>
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/characters/manage')}
            >
              Back to characters
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
            <span className="text-[14px]">Back to characters</span>
          </Button>

          <Heading level={1}>Edit character</Heading>
          <p className="text-muted-foreground mt-1 text-base">
            Update character details and settings
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-background-elevated border border-border rounded-xl p-6 mb-6">
          <div className="space-y-6">
            {/* Character Name */}
            <div>
              <Label size="lg" className="block mb-2">
                Character name <span className="text-destructive">*</span>
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
                  Specialization (optional)
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
              <div className="flex items-center justify-between mb-2">
                <Label size="lg">Character type</Label>
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
              <p className="text-[12px] text-muted-foreground">
                You can only have one main character. Setting this as main will change your current main to an alt.
              </p>
            </div>

            {/* Guild memberships */}
            {characterGuildMemberships.length > 0 && (
              <div className="bg-background-subtle border border-border rounded-lg p-4">
                <p className="font-medium text-foreground mb-1 text-[14px]">Guild memberships</p>
                <p className="text-[13px] text-muted-foreground mb-3">
                  This character is a member of {characterGuildMemberships.length} guild{characterGuildMemberships.length !== 1 ? 's' : ''}
                </p>
                <div className="space-y-2">
                  {characterGuildMemberships.map((membership) => {
                    const guild = membership.guild
                    const isCreator = !!user && guild.created_by === user.id
                    const blockRemove = isCreator && isLastOwnCharacterInGuild(guild.id)
                    return (
                      <div
                        key={membership.id}
                        className="flex items-center justify-between gap-3 p-3 bg-background-elevated border border-border rounded-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {guild.icon_url ? (
                            <Image
                              src={guild.icon_url}
                              alt={guild.name}
                              width={32}
                              height={32}
                              className="w-8 h-8 rounded outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
                              <span className="text-accent text-[12px] font-bold">{guild.name.charAt(0)}</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-foreground truncate">{guild.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {membership.role}
                            </p>
                          </div>
                        </div>
                        {blockRemove ? (
                          <span
                            className="text-[12px] text-muted-foreground text-right shrink-0"
                            title="You created this guild and this is your last character in it. Add another character first or delete the guild."
                          >
                            Last creator character
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant="destructive-outline"
                            size="sm"
                            onClick={() => setRemoveGuildId(guild.id)}
                            disabled={removingGuildId !== null}
                            className="shrink-0"
                          >
                            <HugeiconsIcon icon={Logout01Icon} size={14} />
                            Remove
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
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
              Save changes
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.push('/characters/manage')}
            >
              Go back
            </Button>
          </div>
        </form>

        {/* Gear Sync / Link Section */}
        {character.battle_net_id ? (
          <div className="bg-background-elevated border border-border rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Heading level={5}>Battle.net gear sync</Heading>
                <p className="text-[13px] text-muted-foreground mt-1">
                  Replace equipped gear with the latest data from Battle.net
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleSyncGear}
                loading={syncingGear}
                loadingText="Syncing..."
              >
                <HugeiconsIcon icon={Download04Icon} size={16} />
                Sync gear
              </Button>
            </div>
          </div>
        ) : hasBattlenet ? (
          <div className="bg-background-elevated border border-border rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0074E0]/10 border border-[#0074E0]/30 rounded-lg flex items-center justify-center shrink-0">
                  <Image src="/icons/battlenet.svg" alt="Battle.net" width={20} height={20} className="w-5 h-5" style={{ filter: 'brightness(0) saturate(100%) invert(30%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(97%) contrast(101%)' }} />
                </div>
                <div>
                  <Heading level={5}>Link to Battle.net</Heading>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    Connect this character to your Battle.net account to enable gear sync
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowLinkPicker(true)}
                className="shrink-0"
              >
                <HugeiconsIcon icon={Link01Icon} size={16} />
                Link character
              </Button>
            </div>
          </div>
        ) : null}

        {/* Delete Character Section */}
        <div className="bg-background-elevated border border-destructive/30 rounded-xl p-6">
          <Heading level={4} className="text-destructive mb-2">Danger zone</Heading>
          <p className="text-[14px] text-muted-foreground mb-4">
            Deleting a character is permanent and cannot be undone. This will delete all loot submissions and remove the character from all guilds.
          </p>

          {!showDeleteConfirm ? (
            <Button
              variant="destructive-outline"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <HugeiconsIcon icon={Delete01Icon} size={16} />
              Delete character
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
                  Delete forever
                </Button>
                <Button
                  variant="outline"
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

      <BattlenetCharacterPickerModal
        open={showLinkPicker}
        onClose={() => setShowLinkPicker(false)}
        existingBattleNetIds={existingBattleNetIds}
        mode="link"
        linkCharacterId={character.id}
        linkCharacterName={character.name}
        onLinkComplete={() => {
          refreshCharacters()
          router.refresh()
        }}
      />

      <Modal
        open={!!removeGuildId}
        onClose={() => {
          if (removingGuildId === null) setRemoveGuildId(null)
        }}
        size="sm"
      >
        <ModalHeader>
          <ModalTitle>Remove from guild?</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className="text-muted-foreground text-[14px]">
            {character?.name} will be removed from {pendingRemovalMembership?.guild.name ?? 'this guild'}. Their loot list and submissions in this guild will no longer be visible until you add them back.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setRemoveGuildId(null)}
            disabled={removingGuildId !== null}
          >
            Keep in guild
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (removeGuildId) handleRemoveFromGuild(removeGuildId)
            }}
            loading={removingGuildId !== null}
            loadingText="Removing..."
          >
            <HugeiconsIcon icon={Logout01Icon} size={16} />
            Remove from guild
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
