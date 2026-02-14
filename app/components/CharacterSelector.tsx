'use client'

import { useState, useEffect } from 'react'
// Icons imported via Next.js Image component (SVG files)
import { useGuildContext, Character } from '@/app/contexts/GuildContext'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { Spinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { useNotification } from '@/app/contexts/NotificationContext'

// Lazy load modal to reduce initial bundle size
const CreateCharacterModal = dynamic(() => import('./CreateCharacterModal').then(mod => ({ default: mod.CreateCharacterModal })), {
  loading: () => null
})

// WoW class names for rotating icon
const CLASS_NAMES = [
  'warrior',
  'paladin',
  'hunter',
  'rogue',
  'priest',
  'shaman',
  'mage',
  'warlock',
  'druid',
  'deathknight',
]

// Get WoWhead class icon URL
function getClassIconUrl(className: string | undefined): string {
  if (!className) return ''
  const classNameLower = className.toLowerCase().replace(' ', '')
  return `https://wow.zamimg.com/images/wow/icons/large/classicon_${classNameLower}.jpg`
}

// Rotating class icon for character setup prompt
function RotatingClassIcon() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % CLASS_NAMES.length)
        setIsTransitioning(false)
      }, 150)
    }, 1500) // Change every 1.5 seconds

    return () => clearInterval(interval)
  }, [])

  const iconUrl = `https://wow.zamimg.com/images/wow/icons/large/classicon_${CLASS_NAMES[currentIndex]}.jpg`

  return (
    <img
      src={iconUrl}
      alt="Class icon"
      className={`w-5 h-5 rounded-full flex-shrink-0 border border-primary/30 transition-all duration-300 ${
        isTransitioning ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
      }`}
    />
  )
}

export function CharacterSelector() {
  const {
    activeCharacter,
    userCharacters,
    characterMemberships,
    activeGuild,
    switchCharacter,
    refreshCharacters,
    loading
  } = useGuildContext()

  const { showNotification } = useNotification()
  const [isOpen, setIsOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [addingToGuild, setAddingToGuild] = useState<string | null>(null)
  const router = useRouter()

  // Filter characters that are in the active guild
  const charactersInGuild = activeGuild
    ? userCharacters.filter(char =>
        characterMemberships.some(
          m => m.character_id === char.id && m.guild_id === activeGuild.id
        )
      )
    : userCharacters

  const handleCharacterSelect = async (characterId: string) => {
    setIsOpen(false)
    await switchCharacter(characterId)
  }

  const handleCreateCharacter = () => {
    setIsOpen(false)
    setShowCreateModal(true)
  }

  const handleManageCharacters = () => {
    setIsOpen(false)
    router.push('/characters/manage')
  }

  const handleAddToGuild = async (characterId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!activeGuild) return

    setAddingToGuild(characterId)
    try {
      const response = await fetch(`/api/characters/${characterId}/guilds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: activeGuild.id,
          role: 'Member',
          joined_via: 'manual'
        })
      })

      if (response.ok) {
        // Refresh characters to update the memberships list
        await refreshCharacters()
        // Switch to the newly added character
        await switchCharacter(characterId)
        setIsOpen(false)
      } else {
        const data = await response.json()
        console.error('Error adding character to guild:', data.error)
        showNotification('error', data.error || 'Couldn\'t add character to guild. Try again.')
      }
    } catch (err) {
      console.error('Error adding character to guild:', err)
      showNotification('error', 'Couldn\'t add character to guild. Check your connection and try again.')
    } finally {
      setAddingToGuild(null)
    }
  }

  // Show loading skeleton while context is loading to prevent flicker
  if (loading) {
    return (
      <div className="w-full px-[14px] py-2 bg-background-elevated border border-border rounded-[12px] flex items-center gap-3 animate-pulse">
        <div className="w-5 h-5 rounded-full bg-border-strong flex-shrink-0 border border-border" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="h-3 bg-border-strong rounded w-24" />
          <div className="h-2 bg-border-strong rounded w-16" />
        </div>
      </div>
    )
  }

  if (!activeCharacter) {
    return (
      <>
        <Button
          variant="ghost"
          onClick={handleCreateCharacter}
          className="w-full px-[14px] py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-[12px] text-foreground text-left transition flex items-center gap-3 h-auto justify-start"
        >
          <RotatingClassIcon />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate">Character creation required</p>
            <p className="text-[10px] text-primary">Click here to create</p>
          </div>
        </Button>
        <CreateCharacterModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      </>
    )
  }

  const classColor = activeCharacter.class?.color_hex || '#808080'
  const needsSetup = !activeCharacter.class_id

  // If character needs setup, show a setup prompt instead of regular selector
  if (needsSetup) {
    return (
      <>
        <Button
          variant="ghost"
          onClick={() => setShowCreateModal(true)}
          className="w-full px-[14px] py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-[12px] text-foreground text-left transition flex items-center gap-3 h-auto justify-start"
        >
          <RotatingClassIcon />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate">{activeCharacter.name}</p>
            <p className="text-[10px] text-primary">Click here to create</p>
          </div>
        </Button>
        <CreateCharacterModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          suggestedName={activeCharacter.name}
        />
      </>
    )
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl bg-background-elevated border border-muted hover:bg-muted transition h-auto justify-start"
      >
        {/* Character Class Icon */}
        {activeCharacter.class?.name ? (
          <img
            src={getClassIconUrl(activeCharacter.class.name)}
            alt={activeCharacter.class.name}
            className="w-5 h-5 rounded-full flex-shrink-0 border border-border/50 shadow-sm"
          />
        ) : (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-foreground font-bold text-[10px] flex-shrink-0 border border-border"
            style={{ backgroundColor: classColor }}
          >
            {activeCharacter.name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Character Info */}
        <div className="flex flex-col flex-1 min-w-0 leading-[normal] text-left">
          <p
            className="font-poppins font-medium text-[13px] truncate text-left"
            style={{ color: classColor }}
          >
            {activeCharacter.name}
          </p>
          {(activeCharacter.spec?.name || activeCharacter.class?.name) && (
            <p className="font-poppins font-normal text-[10px] text-muted-foreground truncate text-left">
              {activeCharacter.spec?.name && activeCharacter.class?.name
                ? `${activeCharacter.spec.name} ${activeCharacter.class.name}`
                : activeCharacter.spec?.name || activeCharacter.class?.name}
            </p>
          )}
        </div>

        <Image
          src="/icons/arrow-down.svg"
          alt="Toggle"
          width={20}
          height={20}
          className={`icon-adaptive w-5 h-5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute top-full mt-2 left-0 right-0 bg-background-elevated border border-border rounded-[12px] shadow-lg z-50 py-2 overflow-hidden overflow-y-auto max-h-[60vh]">
            {/* Current Guild Characters */}
            {activeGuild && charactersInGuild.length > 0 && (
              <div>
                <div className="px-3 pt-2 pb-1">
                  <p className="font-poppins font-medium text-[10px] text-muted-foreground uppercase tracking-wide truncate">
                    {activeGuild.name}
                  </p>
                </div>
                {charactersInGuild.map(char => {
                  const charColor = char.class?.color_hex || '#808080'
                  const isSelected = char.id === activeCharacter?.id

                  return (
                    <Button
                      key={char.id}
                      variant="ghost"
                      onClick={() => handleCharacterSelect(char.id)}
                      className="w-full flex items-center gap-3 px-[14px] py-2 hover:!bg-muted transition text-left h-auto justify-start !rounded-none"
                    >
                      {/* Character Class Icon */}
                      {char.class?.name ? (
                        <img
                          src={getClassIconUrl(char.class.name)}
                          alt={char.class.name}
                          className="w-5 h-5 rounded-full flex-shrink-0 border border-border/50 shadow-sm"
                        />
                      ) : (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-foreground font-bold text-[10px] flex-shrink-0 border border-border"
                          style={{ backgroundColor: charColor }}
                        >
                          {char.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="flex flex-col flex-1 min-w-0 leading-[normal] text-left">
                        <p
                          className="font-poppins font-medium text-[13px] truncate"
                          style={{ color: charColor }}
                        >
                          {char.name}
                        </p>
                        {(char.spec?.name || char.class?.name) && (
                          <p className="font-poppins font-normal text-[10px] text-muted-foreground truncate">
                            {char.spec?.name && char.class?.name
                              ? `${char.spec.name} ${char.class.name}`
                              : char.spec?.name || char.class?.name}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <Image
                          src="/icons/tick.svg"
                          alt="Selected"
                          width={20}
                          height={20}
                          className="icon-adaptive w-5 h-5 shrink-0"
                        />
                      )}
                    </Button>
                  )
                })}
              </div>
            )}

            {/* Other Characters */}
            {activeGuild && charactersInGuild.length < userCharacters.length && (
              <div>
                <div className="px-3 pt-2 pb-1">
                  <p className="font-poppins font-medium text-[10px] text-muted-foreground uppercase tracking-wide truncate">
                    Not in {activeGuild.name}
                  </p>
                </div>
                {userCharacters
                  .filter(
                    char =>
                      !charactersInGuild.some(c => c.id === char.id)
                  )
                  .map(char => {
                    const charColor = char.class?.color_hex || '#808080'
                    const isAdding = addingToGuild === char.id

                    return (
                      <div
                        key={char.id}
                        className="w-full flex items-center gap-3 px-[14px] py-2 hover:bg-muted transition"
                      >
                        {/* Character Class Icon */}
                        {char.class?.name ? (
                          <img
                            src={getClassIconUrl(char.class.name)}
                            alt={char.class.name}
                            className="w-5 h-5 rounded-full flex-shrink-0 border border-border/50 shadow-sm"
                          />
                        ) : (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-foreground font-bold text-[10px] flex-shrink-0 border border-border"
                            style={{ backgroundColor: charColor }}
                          >
                            {char.name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="flex flex-col flex-1 min-w-0 leading-[normal] text-left">
                          <p
                            className="font-poppins font-medium text-[13px] truncate"
                            style={{ color: charColor }}
                          >
                            {char.name}
                          </p>
                          <p className="font-poppins font-normal text-[10px] text-muted-foreground truncate">
                            {char.is_main && <span className="text-foreground">Main</span>}
                            {char.is_main && (char.spec?.name || char.class?.name) && ' • '}
                            {char.spec?.name && char.class?.name
                              ? `${char.spec.name} ${char.class.name}`
                              : char.spec?.name || char.class?.name}
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleAddToGuild(char.id, e)}
                          disabled={isAdding}
                          className="shrink-0 h-8 w-8"
                        >
                          {isAdding ? (
                            <Spinner size="lg" className="text-muted-foreground" />
                          ) : (
                            <Image
                              src="/icons/add-circle.svg"
                              alt="Add to guild"
                              width={20}
                              height={20}
                              className="icon-adaptive w-5 h-5"
                            />
                          )}
                        </Button>
                      </div>
                    )
                  })}
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-border my-1" />

            {/* Create Character & Manage */}
            <div>
              <Button
                variant="ghost"
                onClick={handleCreateCharacter}
                className="w-full px-[14px] py-2 flex items-center gap-3 hover:!bg-muted transition text-left h-auto justify-start !rounded-none"
              >
                <Image
                  src="/icons/user-add.svg"
                  alt="Create"
                  width={20}
                  height={20}
                  className="icon-adaptive w-5 h-5 shrink-0"
                />
                <p className="font-poppins font-medium text-[13px] text-foreground">
                  Create character
                </p>
              </Button>
              <Button
                variant="ghost"
                onClick={handleManageCharacters}
                className="w-full px-[14px] py-2 flex items-center gap-3 hover:!bg-muted transition text-left h-auto justify-start !rounded-none"
              >
                <Image
                  src="/icons/user-settings.svg"
                  alt="Manage"
                  width={20}
                  height={20}
                  className="icon-adaptive w-5 h-5 shrink-0"
                />
                <p className="font-poppins font-medium text-[13px] text-foreground">
                  Manage characters
                </p>
              </Button>
            </div>
          </div>
        </>
      )}

      <CreateCharacterModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  )
}
