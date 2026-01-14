'use client'

import { useState } from 'react'
import { ChevronDown, Plus, Check } from 'lucide-react'
import { useGuildContext, Character } from '@/app/contexts/GuildContext'
import { useRouter } from 'next/navigation'

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
    router.push('/characters/create')
  }

  if (!activeCharacter) {
    return (
      <button
        onClick={handleCreateCharacter}
        className="w-full px-[14px] py-2 bg-[#141519] hover:bg-[#1a1a1a] border border-[#1a1a1a] rounded-xl text-foreground text-left transition flex items-center gap-3"
      >
        <Plus className="w-5 h-5 text-primary" />
        <span className="text-[13px] font-medium">Create Character</span>
      </button>
    )
  }

  const classColor = activeCharacter.class?.color_hex || '#808080'

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
            className="w-5 h-5 rounded-full flex-shrink-0 border border-border"
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

        <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
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
                              className="w-5 h-5 rounded-full flex-shrink-0 border border-border"
                            />
                          ) : (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0 border border-border"
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
                                  className="w-5 h-5 rounded-full flex-shrink-0 border border-border"
                                />
                              ) : (
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0 border border-border"
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

              {/* Create New Character */}
              <div className="border-t border-[#1a1a1a] mt-2 pt-2">
                <button
                  onClick={handleCreateCharacter}
                  className="w-full px-3 py-2 text-sm text-left text-primary hover:bg-accent rounded transition"
                >
                  + Create New Character
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
