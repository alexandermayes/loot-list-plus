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

export function CreateCharacterModal({ isOpen, onClose, onSuccess, suggestedName }: CreateCharacterModalProps) {
  const { activeGuild, refreshCharacters, switchCharacter } = useGuildContext()
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
          // Check if user is the guild creator - they should be Guild Master
          // For pending guild joins, default to Member role
          let role = 'Member'
          if (activeGuild && user && activeGuild.created_by === user.id) {
            role = 'Guild Master'
          }

          const guildResponse = await fetch(`/api/characters/${data.character.id}/guilds`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              guild_id: targetGuildId,
              role,
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
      window.location.reload()
    } catch (err) {
      console.error('Error creating character:', err)
      setError('Couldn\'t create character. Check your connection and try again.')
      setLoading(false)
    }
  }

  const selectedClass = classes.find(c => c.id === classId)

  return (
    <Modal open={isOpen} onClose={onClose} size="default">
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
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsMain(true)}
                className={`relative z-10 flex-1 px-6 py-2 h-auto rounded-[44px] text-[13px] font-medium transition-colors duration-200 ${
                  isMain ? 'text-foreground' : 'text-foreground-muted'
                }`}
              >
                Main
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsMain(false)}
                className={`relative z-10 flex-1 px-6 py-2 h-auto rounded-[44px] text-[13px] font-medium transition-colors duration-200 ${
                  !isMain ? 'text-foreground' : 'text-foreground-muted'
                }`}
              >
                Alt
              </Button>
            </div>
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
  )
}
