'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useGuildContext, Character } from '@/app/contexts/GuildContext'
import { CharacterCard } from '@/app/components/CharacterCard'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon } from '@hugeicons/core-free-icons'

// Lazy load modals to reduce initial bundle size
const CreateCharacterModal = dynamic(() => import('@/app/components/CreateCharacterModal').then(mod => ({ default: mod.CreateCharacterModal })), {
  loading: () => null
})
const EditCharacterModal = dynamic(() => import('@/app/components/EditCharacterModal').then(mod => ({ default: mod.EditCharacterModal })), {
  loading: () => null
})

export default function ManageCharactersPage() {
  const { userCharacters, characterMemberships, refreshCharacters, loading } = useGuildContext()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)

  useEffect(() => {
    document.title = 'LootList+ • Manage Characters'
  }, [])

  const getGuildCount = (characterId: string) => {
    return characterMemberships.filter(m => m.character_id === characterId).length
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-foreground-muted text-[16px]">Loading characters...</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[42px] font-bold text-white mb-2">My Characters</h1>
          <p className="text-[16px] text-foreground-muted">
            Manage your characters and their guild memberships
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-white hover:bg-gray-100 rounded-[52px] text-black font-medium text-[16px] transition flex items-center gap-2"
        >
          <HugeiconsIcon icon={Add01Icon} size={20} />
          Create Character
        </button>
      </div>

      {/* Characters List */}
      {userCharacters.length === 0 ? (
        <div className="bg-background-elevated border border-[rgba(255,255,255,0.1)] rounded-xl p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-[#1a1a1f] rounded-full flex items-center justify-center mx-auto mb-4">
              <HugeiconsIcon icon={Add01Icon} size={32} className="text-foreground-muted" />
            </div>
            <h3 className="text-[24px] font-bold text-white mb-2">
              No Characters Yet
            </h3>
            <p className="text-[14px] text-foreground-muted mb-6">
              Create your first character to start managing loot lists and joining guilds
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-3 bg-white hover:bg-gray-100 rounded-[52px] text-black font-medium text-[16px] transition"
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
                      onClick={() => setEditingCharacter(character)}
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
                      onClick={() => setEditingCharacter(character)}
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
        <div className="bg-background-elevated border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
          <h3 className="text-[16px] font-semibold text-white mb-3">
            Character Management Tips
          </h3>
          <ul className="space-y-2 text-[14px] text-foreground-muted">
            <li>• Click on a character to view and edit details</li>
            <li>• Each character can join multiple guilds</li>
            <li>• Each character has separate loot lists per raid tier</li>
            <li>• Main characters are prioritized in character selection</li>
            <li>• Battle.net integration for automatic character import coming soon</li>
          </ul>
        </div>
      )}

      {/* Modals */}
      <CreateCharacterModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refreshCharacters()}
      />
      <EditCharacterModal
        isOpen={editingCharacter !== null}
        onClose={() => setEditingCharacter(null)}
        character={editingCharacter}
        onSuccess={() => refreshCharacters()}
      />
    </div>
  )
}
