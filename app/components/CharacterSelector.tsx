'use client'

import { useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { useGuildContext, Character } from '@/app/contexts/GuildContext'
import { useRouter } from 'next/navigation'

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
        className="w-full px-4 py-3 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-xl text-white text-left transition-colors flex items-center gap-3"
      >
        <Plus className="w-5 h-5 text-[#ff8000]" />
        <span className="text-[14px]">Create Character</span>
      </button>
    )
  }

  const classColor = activeCharacter.class?.color_hex || '#808080'

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-xl text-white text-left transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Class Icon */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: classColor }}
          >
            {activeCharacter.name.charAt(0).toUpperCase()}
          </div>

          {/* Character Info */}
          <div className="flex-1 min-w-0">
            <div
              className="font-semibold text-[14px] truncate"
              style={{ color: classColor }}
            >
              {activeCharacter.name}
            </div>
            <div className="text-[12px] text-[#a1a1a1] truncate">
              {activeCharacter.spec?.name
                ? `${activeCharacter.spec.name} ${activeCharacter.class?.name || 'Unknown'}`
                : activeCharacter.class?.name || 'Unknown'}
            </div>
          </div>

          <ChevronDown
            className={`w-4 h-4 text-[#a1a1a1] transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
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
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-lg z-50 max-h-[400px] overflow-y-auto">
            {/* Current Guild Characters */}
            {charactersInGuild.length > 0 && (
              <div className="p-2">
                {activeGuild && (
                  <div className="px-3 py-2 text-[11px] font-semibold text-[#a1a1a1] uppercase tracking-wide">
                    {activeGuild.name}
                  </div>
                )}
                {charactersInGuild.map(char => {
                  const charColor = char.class?.color_hex || '#808080'
                  const isActive = char.id === activeCharacter?.id

                  return (
                    <button
                      key={char.id}
                      onClick={() => handleCharacterSelect(char.id)}
                      className={`
                        w-full px-3 py-2 rounded-lg text-left transition-colors
                        ${
                          isActive
                            ? 'bg-[#1a1a1f] border border-[rgba(255,255,255,0.2)]'
                            : 'hover:bg-[#1a1a1f]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ backgroundColor: charColor }}
                        >
                          {char.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-semibold text-[13px] truncate"
                              style={{ color: charColor }}
                            >
                              {char.name}
                            </span>
                            {char.is_main && (
                              <span className="px-1.5 py-0.5 bg-[#ff8000]/20 border border-[#ff8000] rounded text-[#ff8000] text-[10px] font-medium">
                                Main
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#a1a1a1] truncate">
                            {char.spec?.name
                              ? `${char.spec.name} ${char.class?.name || 'Unknown'}`
                              : char.class?.name || 'Unknown'}
                          </div>
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 rounded-full bg-[#ff8000] flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Other Characters */}
            {activeGuild && charactersInGuild.length < userCharacters.length && (
              <>
                <div className="border-t border-[rgba(255,255,255,0.1)]" />
                <div className="p-2">
                  <div className="px-3 py-2 text-[11px] font-semibold text-[#a1a1a1] uppercase tracking-wide">
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
                          className="w-full px-3 py-2 rounded-lg text-left hover:bg-[#1a1a1f] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                              style={{ backgroundColor: charColor }}
                            >
                              {char.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="font-semibold text-[13px] truncate"
                                  style={{ color: charColor }}
                                >
                                  {char.name}
                                </span>
                                {char.is_main && (
                                  <span className="px-1.5 py-0.5 bg-[#ff8000]/20 border border-[#ff8000] rounded text-[#ff8000] text-[10px] font-medium">
                                    Main
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#a1a1a1] truncate">
                                {char.spec?.name
                                  ? `${char.spec.name} ${char.class?.name || 'Unknown'}`
                                  : char.class?.name || 'Unknown'}
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                </div>
              </>
            )}

            {/* Create New Character */}
            <div className="border-t border-[rgba(255,255,255,0.1)]" />
            <div className="p-2">
              <button
                onClick={handleCreateCharacter}
                className="w-full px-3 py-2 rounded-lg text-left hover:bg-[#1a1a1f] transition-colors flex items-center gap-3 text-[#ff8000]"
              >
                <Plus className="w-4 h-4" />
                <span className="text-[13px] font-medium">Create New Character</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
