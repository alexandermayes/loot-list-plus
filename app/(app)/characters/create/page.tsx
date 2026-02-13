'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { createClient } from '@/utils/supabase/client'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { Heading } from '@/components/ui/typography'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CharacterFormSkeleton } from '@/components/ui/skeletons'
import { useNotification } from '@/app/contexts/NotificationContext'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
  const { showNotification } = useNotification()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [classId, setClassId] = useState('')
  const [specId, setSpecId] = useState('')
  const [isMain, setIsMain] = useState(true)

  const [classes, setClasses] = useState<WowClass[]>([])
  const [classSpecs, setClassSpecs] = useState<ClassSpec[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'LootList+ • Create Character'
    Promise.all([loadClasses(), loadClassSpecs()]).then(() => {
      setPageLoading(false)
    })
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
        setError(data.error || 'Couldn\'t create character. Check the form and try again.')
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
            showNotification('error', 'Character created, but couldn\'t add to guild. Try adding manually from the character page.')
          }
        } catch (membershipErr) {
          console.error('Error adding character to guild:', membershipErr)
          showNotification('error', 'Character created, but couldn\'t add to guild. Try adding manually from the character page.')
        }
      }

      // Refresh character list in context
      await refreshCharacters()

      // Redirect to character management page
      router.push('/characters/manage')
    } catch (err) {
      console.error('Error creating character:', err)
      setError('Couldn\'t create character. Check your connection and try again.')
      setLoading(false)
    }
  }

  if (pageLoading) {
    return <CharacterFormSkeleton />
  }

  return (
    <div className="min-h-screen bg-background-subtle p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 px-0"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
            <span className="text-[14px]">Back</span>
          </Button>

          <Heading level={1}>Create character</Heading>
          <p className="text-muted-foreground mt-1 text-base">
            Add a new character to your account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-background-elevated border border-border rounded-xl p-6">
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
              <Label size="lg" className="block mb-3">
                Character type
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

            <div className="text-[13px] text-muted-foreground bg-background-subtle border border-border rounded-lg p-4">
              <p className="font-medium text-foreground mb-2">Note:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Main characters are displayed first in character lists</li>
                <li>Battle.net integration for automatic character import coming soon</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mt-8">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              loadingText="Creating..."
            >
              Create character
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => router.back()}
            >
              Go back
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
