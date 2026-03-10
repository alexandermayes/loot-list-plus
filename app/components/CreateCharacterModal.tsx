'use client'

import { useState, useEffect } from 'react'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { createClient } from '@/utils/supabase/client'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { HugeiconsIcon } from '@hugeicons/react'
import { Download04Icon, Link01Icon } from '@hugeicons/core-free-icons'
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

interface CreateCharacterModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  suggestedName?: string // Discord username to show as placeholder hint
}

// Classes gated by expansion - only show if guild's expansion is at or after the class's debut
const EXPANSION_CLASS_GATES: Record<string, string> = {
  'Death Knight': 'Wrath of the Lich King',
  'Monk': 'Mists of Pandaria',
}

const EXPANSION_ORDER = [
  'Classic', 'Classic WoW',
  'The Burning Crusade',
  'Wrath of the Lich King',
  'Cataclysm',
  'Mists of Pandaria',
  'Warlords of Draenor',
  'Legion',
  'Battle for Azeroth',
  'Shadowlands',
  'Dragonflight',
  'The War Within',
]

function isClassAvailableForExpansion(className: string, expansionName: string | undefined): boolean {
  const gate = EXPANSION_CLASS_GATES[className]
  if (!gate) return true // Most classes available everywhere
  if (!expansionName) return true // No expansion set, show all
  const gateIndex = EXPANSION_ORDER.indexOf(gate)
  const currentIndex = EXPANSION_ORDER.indexOf(expansionName)
  if (gateIndex === -1 || currentIndex === -1) return true
  return currentIndex >= gateIndex
}

export function CreateCharacterModal({ isOpen, onClose, onSuccess, suggestedName }: CreateCharacterModalProps) {
  const { activeGuild, userCharacters, refreshCharacters, switchCharacter, currentExpansion } = useGuildContext()
  const { showNotification } = useNotification()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [classId, setClassId] = useState('')
  const [specId, setSpecId] = useState('')
  const [isMain, setIsMain] = useState(true)

  const [classes, setClasses] = useState<WowClass[]>([])
  const [classSpecs, setClassSpecs] = useState<ClassSpec[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [hasBattlenet, setHasBattlenet] = useState(false)
  const [showBattlenetPicker, setShowBattlenetPicker] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadClasses()
      loadClassSpecs()
      checkBattlenetAccount()
      // Reset form when opening
      setName('')
      setClassId('')
      setSpecId('')
      setIsMain(true)
      setError('')
    }
  }, [isOpen])

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
      // Check for duplicate character name in the guild via API
      if (activeGuild) {
        try {
          const checkResponse = await fetch(`/api/guild-members?guild_id=${activeGuild.id}`)
          if (checkResponse.ok) {
            const { members } = await checkResponse.json()
            const existingNames = (members || [])
              .flatMap((m: any) => m.characters?.map((c: any) => c.name?.toLowerCase()) || [])
              .filter(Boolean)

            if (existingNames.includes(name.trim().toLowerCase())) {
              setError('A character with this name already exists in the guild')
              setLoading(false)
              return
            }
          }
        } catch (checkErr) {
          console.error('Error checking for duplicate names:', checkErr)
          // Continue with creation even if check fails
        }
      }

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
        setError(data.error || 'Couldn\'t create character. Check the name and try again.')
        setLoading(false)
        return
      }

      // Get user for setting active character
      const { data: { user } } = await supabase.auth.getUser()

      // Check if there's a pending guild join from Discord flow
      const pendingGuildJoin = typeof window !== 'undefined' ? sessionStorage.getItem('pending_guild_join') : null
      let targetGuildId = activeGuild?.id || pendingGuildJoin

      // If user has a guild to join, add character to it
      if (targetGuildId && data.character) {
        try {
          // Role is determined server-side (Guild Master for creator, Member for everyone else)
          const guildResponse = await fetch(`/api/characters/${data.character.id}/guilds`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              guild_id: targetGuildId,
              joined_via: pendingGuildJoin ? 'discord_verify' : 'manual'
            })
          })

          if (!guildResponse.ok) {
            const guildError = await guildResponse.json()
            console.error('Error adding character to guild:', guildError)
          }

          // Clear the pending guild join
          if (pendingGuildJoin) {
            sessionStorage.removeItem('pending_guild_join')
          }
        } catch (membershipErr) {
          console.error('Error adding character to guild:', membershipErr)
          showNotification('warning', 'Character created but couldn\'t add to guild. Try from the character settings.')
        }
      }

      // Set the new character as the active character using API (bypasses RLS issues)
      if (data.character) {
        try {
          const activeCharResponse = await fetch('/api/user/active-character', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              character_id: data.character.id,
              guild_id: targetGuildId || null
            })
          })

          if (!activeCharResponse.ok) {
            const activeCharError = await activeCharResponse.json()
            console.error('Error setting active character:', activeCharError)
          }
        } catch (activeCharErr) {
          console.error('Error setting active character:', activeCharErr)
          showNotification('warning', 'Character created but couldn\'t set as active. Switch to it manually.')
        }
      }

      // If user has no guild, redirect to guild selection
      if (!targetGuildId) {
        window.location.href = '/guild-select'
        return
      }

      // Force a full page reload to ensure all state is refreshed
      trackClientEvent('character_created')
      window.location.reload()
    } catch (err) {
      console.error('Error creating character:', err)
      setError('Couldn\'t create character. Check your connection and try again.')
      setLoading(false)
    }
  }

  const selectedClass = classes.find(c => c.id === classId)

  const existingBattleNetIds = userCharacters
    .map((c: { battle_net_id?: number | null }) => c.battle_net_id)
    .filter((id): id is number => id != null)

  return (
    <>
    <Modal open={isOpen && !showBattlenetPicker} onClose={onClose} size="default">
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <ModalHeader onClose={onClose}>
          <ModalTitle>Create character</ModalTitle>
        </ModalHeader>

        <ModalBody className="space-y-5">
          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Battle.net Import Option */}
          <div className="flex items-center justify-between gap-3 p-3 bg-background-elevated border border-border rounded-lg">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-[#0074E0]/10 border border-[#0074E0]/30 rounded-lg flex items-center justify-center shrink-0">
                <Image src="/icons/battlenet.svg" alt="Battle.net" width={20} height={20} className="w-5 h-5" style={{ filter: 'brightness(0) saturate(100%) invert(30%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(97%) contrast(101%)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground">Import from Battle.net</p>
                <p className="text-[12px] text-muted-foreground">
                  {hasBattlenet ? 'Auto-import with class, spec and gear' : 'Connect your account in profile settings'}
                </p>
              </div>
            </div>
            {hasBattlenet ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowBattlenetPicker(true)}
              >
                <HugeiconsIcon icon={Download04Icon} size={14} />
                Import
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose()
                  window.location.href = '/profile'
                }}
              >
                <HugeiconsIcon icon={Link01Icon} size={14} />
                Connect
              </Button>
            )}
          </div>

          {/* Character Name */}
          <div>
            <Label className="mb-2">
              Character name <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Zevinall"
              autoFocus
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
              {classes
                .filter(cls => isClassAvailableForExpansion(cls.name, currentExpansion?.expansion_name))
                .map((cls) => (
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
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            Create character
          </Button>
        </ModalFooter>
      </form>
    </Modal>

    <BattlenetCharacterPickerModal
      open={showBattlenetPicker}
      onClose={() => setShowBattlenetPicker(false)}
      existingBattleNetIds={existingBattleNetIds}
      onImportComplete={onClose}
    />
    </>
  )
}
