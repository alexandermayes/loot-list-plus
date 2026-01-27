'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Check, Plus } from 'lucide-react'
import { useGuildContext, Character } from '@/app/contexts/GuildContext'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'

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
      }
    } catch (err) {
      console.error('Error adding character to guild:', err)
    } finally {
      setAddingToGuild(null)
    }
  }

  // Show loading skeleton while context is loading to prevent flicker
  if (loading) {
    return (
      <div className="w-full px-[14px] py-2 bg-[#141519] border border-[#1a1a1a] rounded-xl flex items-center gap-3 animate-pulse">
        <div className="w-5 h-5 rounded-full bg-[#383838] flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="h-3 bg-[#383838] rounded w-24" />
          <div className="h-2 bg-[#383838] rounded w-16" />
        </div>
      </div>
    )
  }

  if (!activeCharacter) {
    return (
      <>
        <button
          onClick={handleCreateCharacter}
          className="w-full px-[14px] py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-white text-left transition flex items-center gap-3"
        >
          <RotatingClassIcon />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-white">Character creation required</p>
            <p className="text-[10px] text-primary">Click here to create</p>
          </div>
        </button>
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
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full px-[14px] py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-white text-left transition flex items-center gap-3"
        >
          <RotatingClassIcon />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-white truncate">{activeCharacter.name}</p>
            <p className="text-[10px] text-primary">Click here to create</p>
          </div>
        </button>
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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-[14px] py-2 rounded-[12px] bg-[#141519] border border-[rgba(255,255,255,0.1)] hover:bg-[#1a1a1a] transition"
      >
        {/* Character Class Icon */}
        {activeCharacter.class?.name ? (
          <img
            src={getClassIconUrl(activeCharacter.class.name)}
            alt={activeCharacter.class.name}
            className="w-5 h-5 rounded-full flex-shrink-0"
          />
        ) : (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
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
            <p className="font-poppins font-normal text-[10px] text-[#a1a1a1] truncate text-left">
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
          className={`w-5 h-5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute top-full mt-2 left-0 right-0 bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-[12px] shadow-lg z-50 py-2 overflow-hidden">
            {/* Current Guild Characters */}
            {activeGuild && charactersInGuild.length > 0 && (
              <div>
                <div className="px-3 pt-2 pb-1">
                  <p className="font-poppins font-medium text-[10px] text-[#a1a1a1] uppercase tracking-wide truncate">
                    {activeGuild.name}
                  </p>
                </div>
                {charactersInGuild.map(char => {
                  const charColor = char.class?.color_hex || '#808080'
                  const isSelected = char.id === activeCharacter?.id

                  return (
                    <button
                      key={char.id}
                      onClick={() => handleCharacterSelect(char.id)}
                      className="w-full flex items-center gap-3 px-[14px] py-2 hover:bg-[#1a1a1a] transition text-left"
                    >
                      {/* Character Class Icon */}
                      {char.class?.name ? (
                        <img
                          src={getClassIconUrl(char.class.name)}
                          alt={char.class.name}
                          className="w-5 h-5 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
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
                          <p className="font-poppins font-normal text-[10px] text-[#a1a1a1] truncate">
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
                          className="w-5 h-5 shrink-0"
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Other Characters */}
            {activeGuild && charactersInGuild.length < userCharacters.length && (
              <div>
                <div className="px-3 pt-2 pb-1">
                  <p className="font-poppins font-medium text-[10px] text-[#a1a1a1] uppercase tracking-wide truncate">
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
                        className="w-full flex items-center gap-3 px-[14px] py-2 hover:bg-[#1a1a1a] transition"
                      >
                        {/* Character Class Icon */}
                        {char.class?.name ? (
                          <img
                            src={getClassIconUrl(char.class.name)}
                            alt={char.class.name}
                            className="w-5 h-5 rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
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
                          <p className="font-poppins font-normal text-[10px] text-[#a1a1a1] truncate">
                            {char.is_main && <span className="text-white">Main</span>}
                            {char.is_main && (char.spec?.name || char.class?.name) && ' • '}
                            {char.spec?.name && char.class?.name
                              ? `${char.spec.name} ${char.class.name}`
                              : char.spec?.name || char.class?.name}
                          </p>
                        </div>

                        <button
                          onClick={(e) => handleAddToGuild(char.id, e)}
                          disabled={isAdding}
                          className="shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isAdding ? (
                            <div className="w-5 h-5 border-2 border-[#a1a1a1]/30 border-t-[#a1a1a1] rounded-full animate-spin" />
                          ) : (
                            <Image
                              src="/icons/add-circle.svg"
                              alt="Add to guild"
                              width={20}
                              height={20}
                              className="w-5 h-5"
                            />
                          )}
                        </button>
                      </div>
                    )
                  })}
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-[rgba(255,255,255,0.1)] my-1" />

            {/* Create Character & Manage */}
            <div>
              <button
                onClick={handleCreateCharacter}
                className="w-full px-[14px] py-2 flex items-center gap-3 hover:bg-[#1a1a1a] transition text-left"
              >
                <Image
                  src="/icons/user-add.svg"
                  alt="Create"
                  width={20}
                  height={20}
                  className="w-5 h-5 shrink-0"
                />
                <p className="font-poppins font-medium text-[13px] text-white">
                  Create character
                </p>
              </button>
              <button
                onClick={handleManageCharacters}
                className="w-full px-[14px] py-2 flex items-center gap-3 hover:bg-[#1a1a1a] transition text-left"
              >
                <Image
                  src="/icons/user-settings.svg"
                  alt="Manage"
                  width={20}
                  height={20}
                  className="w-5 h-5 shrink-0"
                />
                <p className="font-poppins font-medium text-[13px] text-white">
                  Manage characters
                </p>
              </button>
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
