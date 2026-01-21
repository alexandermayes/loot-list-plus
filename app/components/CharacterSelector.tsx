'use client'

import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { useGuildContext, Character } from '@/app/contexts/GuildContext'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CreateCharacterModal } from './CreateCharacterModal'

// Get WoWhead class icon URL
function getClassIconUrl(className: string | undefined): string {
  if (!className) return ''
  const classNameLower = className.toLowerCase().replace(' ', '')
  return `https://wow.zamimg.com/images/wow/icons/large/classicon_${classNameLower}.jpg`
}

export function CharacterSelector() {
  const {
    activeCharacter,
    userCharacters,
    characterMemberships,
    activeGuild,
    switchCharacter
  } = useGuildContext()

  const [isOpen, setIsOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
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

  if (!activeCharacter) {
    return (
      <>
        <button
          onClick={handleCreateCharacter}
          className="w-full px-[14px] py-2.5 bg-white hover:bg-gray-100 rounded-[52px] text-black text-left transition flex items-center gap-3"
        >
          <Image
            src="/icons/add-circle.svg"
            alt="Create"
            width={20}
            height={20}
            className="w-5 h-5 shrink-0"
          />
          <span className="text-[13px] font-medium">Create Character</span>
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
          onClick={() => router.push(`/characters/${activeCharacter.id}/edit`)}
          className="w-full px-[14px] py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-white text-left transition flex items-center gap-3"
        >
          <div className="w-5 h-5 rounded-full flex items-center justify-center bg-primary/20 text-primary font-bold text-[10px] flex-shrink-0 border border-primary/30">
            {activeCharacter.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-white truncate">{activeCharacter.name}</p>
            <p className="text-[10px] text-primary">Setup required - tap to configure</p>
          </div>
          <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <CreateCharacterModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      </>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-[14px] py-2 rounded-xl bg-[#141519] border border-[#1a1a1a] hover:bg-[#1a1a1a] transition"
      >
        {/* Character Class Icon */}
        {activeCharacter.class?.name ? (
          <img
            src={getClassIconUrl(activeCharacter.class.name)}
            alt={activeCharacter.class.name}
            className="w-5 h-5 rounded-full flex-shrink-0 border border-[#383838]"
          />
        ) : (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0 border border-border"
            style={{ backgroundColor: classColor }}
          >
            {activeCharacter.name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Character Info */}
        <div className="flex flex-col flex-1 min-w-0 leading-normal text-left">
          <p
            className="text-[13px] font-medium truncate text-left"
            style={{ color: classColor }}
          >
            {activeCharacter.name}
          </p>
          {(activeCharacter.spec?.name || activeCharacter.class?.name) && (
            <p className="text-[10px] text-[#a1a1a1] truncate text-left">
              {activeCharacter.spec?.name && activeCharacter.class?.name
                ? `${activeCharacter.spec.name} ${activeCharacter.class.name}`
                : activeCharacter.spec?.name || activeCharacter.class?.name}
            </p>
          )}
        </div>

        <ChevronDown className="w-5 h-5 text-[#a1a1a1] flex-shrink-0" />
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
          <div className="absolute top-full mt-2 left-0 right-0 bg-[#141519] border border-[#1a1a1a] rounded-xl shadow-lg z-50">
            <div className="p-2">
              {/* Current Guild Characters */}
              {activeGuild && charactersInGuild.length > 0 && (
                <>
                  <div className="px-3 py-2 text-[10px] font-semibold text-[#a1a1a1] uppercase tracking-wider text-left">
                    {activeGuild.name}
                  </div>
                  {charactersInGuild.map(char => {
                    const charColor = char.class?.color_hex || '#808080'
                    const isActive = char.id === activeCharacter?.id

                    return (
                      <button
                        key={char.id}
                        onClick={() => handleCharacterSelect(char.id)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1a1a1a] transition text-left"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Character Class Icon */}
                          {char.class?.name ? (
                            <img
                              src={getClassIconUrl(char.class.name)}
                              alt={char.class.name}
                              className="w-5 h-5 rounded-full flex-shrink-0 border border-[#383838]"
                            />
                          ) : (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0 border border-[#383838]"
                              style={{ backgroundColor: charColor }}
                            >
                              {char.name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="flex flex-col flex-1 min-w-0 leading-normal text-left">
                            <div className="flex items-center gap-2">
                              <p
                                className="text-[13px] font-medium truncate text-left"
                                style={{ color: charColor }}
                              >
                                {char.name}
                              </p>
                              {char.is_main && (
                                <span className="px-1.5 py-0.5 bg-primary/20 border border-primary rounded text-primary text-[10px] font-medium">
                                  Main
                                </span>
                              )}
                            </div>
                            {(char.spec?.name || char.class?.name) && (
                              <p className="text-[10px] text-[#a1a1a1] truncate text-left">
                                {char.spec?.name && char.class?.name
                                  ? `${char.spec.name} ${char.class.name}`
                                  : char.spec?.name || char.class?.name}
                              </p>
                            )}
                          </div>
                        </div>
                        {isActive && (
                          <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </>
              )}

              {/* Other Characters */}
              {activeGuild && charactersInGuild.length < userCharacters.length && (
                <>
                  <div className="border-t border-[#1a1a1a] mt-2 pt-2">
                    <div className="px-3 py-2 text-[10px] font-semibold text-[#a1a1a1] uppercase tracking-wider text-left">
                      Other Characters
                    </div>
                    {userCharacters
                      .filter(
                        char =>
                          !charactersInGuild.some(c => c.id === char.id)
                      )
                      .map(char => {
                        const charColor = char.class?.color_hex || '#808080'

                        return (
                          <button
                            key={char.id}
                            onClick={() => handleCharacterSelect(char.id)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1a1a1a] transition text-left"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {/* Character Class Icon */}
                              {char.class?.name ? (
                                <img
                                  src={getClassIconUrl(char.class.name)}
                                  alt={char.class.name}
                                  className="w-5 h-5 rounded-full flex-shrink-0 border border-[#383838]"
                                />
                              ) : (
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0 border border-[#383838]"
                                  style={{ backgroundColor: charColor }}
                                >
                                  {char.name.charAt(0).toUpperCase()}
                                </div>
                              )}

                              <div className="flex flex-col flex-1 min-w-0 leading-normal text-left">
                                <div className="flex items-center gap-2">
                                  <p
                                    className="text-[13px] font-medium truncate text-left"
                                    style={{ color: charColor }}
                                  >
                                    {char.name}
                                  </p>
                                  {char.is_main && (
                                    <span className="px-1.5 py-0.5 bg-primary/20 border border-primary rounded text-primary text-[10px] font-medium">
                                      Main
                                    </span>
                                  )}
                                </div>
                                {(char.spec?.name || char.class?.name) && (
                                  <p className="text-[10px] text-[#a1a1a1] truncate text-left">
                                    {char.spec?.name && char.class?.name
                                      ? `${char.spec.name} ${char.class.name}`
                                      : char.spec?.name || char.class?.name}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                  </div>
                </>
              )}

              {/* Create Character & Manage */}
              <div className="border-t border-[#1a1a1a] mt-2 pt-2">
                <button
                  onClick={handleCreateCharacter}
                  className="w-full px-3 py-2 flex items-center gap-3 hover:bg-[#1a1a1a] rounded-lg transition text-left"
                >
                  <Image
                    src="/icons/add-circle.svg"
                    alt="Create"
                    width={20}
                    height={20}
                    className="w-5 h-5 shrink-0 brightness-0 invert"
                  />
                  <div className="flex-1">
                    <p className="font-poppins font-medium text-[13px] text-white">
                      Create character
                    </p>
                  </div>
                </button>
                <button
                  onClick={handleManageCharacters}
                  className="w-full px-3 py-2 flex items-center gap-3 hover:bg-[#1a1a1a] rounded-lg transition text-left"
                >
                  <svg className="w-5 h-5 shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-poppins font-medium text-[13px] text-white">
                      Manage characters
                    </p>
                  </div>
                </button>
              </div>
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
