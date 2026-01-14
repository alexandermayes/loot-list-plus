'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { CharacterCard } from '@/app/components/CharacterCard'
import { Plus, ArrowLeft } from 'lucide-react'

export default function ManageCharactersPage() {
  const router = useRouter()
  const { userCharacters, characterMemberships, refreshCharacters, loading } = useGuildContext()

  useEffect(() => {
    document.title = 'LootList+ • Manage Characters'
  }, [])

  const getGuildCount = (characterId: string) => {
    return characterMemberships.filter(m => m.character_id === characterId).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0e11] p-8 flex items-center justify-center">
        <p className="text-[#a1a1a1] text-[16px]">Loading characters...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0e11] p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-[#a1a1a1] hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[14px]">Back</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[42px] font-bold text-white mb-2">My Characters</h1>
              <p className="text-[16px] text-[#a1a1a1]">
                Manage your characters and their guild memberships
              </p>
            </div>

            <button
              onClick={() => router.push('/characters/create')}
              className="px-6 py-3 bg-[#ff8000] hover:bg-[#ff9500] rounded-[52px] text-white font-medium text-[16px] transition flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Character
            </button>
          </div>
        </div>

        {/* Characters List */}
        {userCharacters.length === 0 ? (
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-[#1a1a1f] rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-[#a1a1a1]" />
              </div>
              <h3 className="text-[24px] font-bold text-white mb-2">
                No Characters Yet
              </h3>
              <p className="text-[14px] text-[#a1a1a1] mb-6">
                Create your first character to start managing loot lists and joining guilds
              </p>
              <button
                onClick={() => router.push('/characters/create')}
                className="px-8 py-3 bg-[#ff8000] hover:bg-[#ff9500] rounded-[52px] text-white font-medium text-[16px] transition"
              >
                Create Your First Character
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Main Characters */}
            {userCharacters.some(c => c.is_main) && (
              <div>
                <h2 className="text-[18px] font-semibold text-white mb-4 px-2">
                  Main Characters
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userCharacters
                    .filter(c => c.is_main)
                    .map(character => (
                      <CharacterCard
                        key={character.id}
                        character={character}
                        onClick={() => router.push(`/characters/${character.id}/edit`)}
                        showGuildCount
                        guildCount={getGuildCount(character.id)}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Alt Characters */}
            {userCharacters.some(c => !c.is_main) && (
              <div>
                <h2 className="text-[18px] font-semibold text-white mb-4 px-2">
                  Alt Characters
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userCharacters
                    .filter(c => !c.is_main)
                    .map(character => (
                      <CharacterCard
                        key={character.id}
                        character={character}
                        onClick={() => router.push(`/characters/${character.id}/edit`)}
                        showGuildCount
                        guildCount={getGuildCount(character.id)}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        {userCharacters.length > 0 && (
          <div className="mt-8 bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
            <h3 className="text-[16px] font-semibold text-white mb-3">
              Character Management Tips
            </h3>
            <ul className="space-y-2 text-[14px] text-[#a1a1a1]">
              <li>• Click on a character to view and edit details</li>
              <li>• Each character can join multiple guilds</li>
              <li>• Each character has separate loot lists per raid tier</li>
              <li>• Main characters are prioritized in character selection</li>
              <li>• Battle.net integration for automatic character import coming soon</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
