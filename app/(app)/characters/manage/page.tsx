'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useGuildContext, Character } from '@/app/contexts/GuildContext'
import { CharacterCard } from '@/app/components/CharacterCard'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon } from '@hugeicons/core-free-icons'
import { Heading } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Heading level={1}>My characters</Heading>
          <p className="text-muted-foreground mt-1 text-base">
            Manage your characters and their guild memberships
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          className="rounded-[52px] w-full sm:w-auto"
        >
          <HugeiconsIcon icon={Add01Icon} size={20} />
          Create character
        </Button>
      </div>

      {/* Characters List */}
      {userCharacters.length === 0 ? (
        <div className="bg-background-elevated border border-border rounded-xl p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-background-elevated rounded-full flex items-center justify-center mx-auto mb-4">
              <HugeiconsIcon icon={Add01Icon} size={32} className="text-foreground-muted" />
            </div>
            <h3 className="text-[24px] font-bold text-foreground mb-2">
              No characters yet
            </h3>
            <p className="text-[14px] text-foreground-muted mb-6">
              Create your first character to start managing loot lists and joining guilds
            </p>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              className="rounded-[52px]"
            >
              Create your first character
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Main Characters */}
          {userCharacters.some(c => c.is_main) && (
            <div>
              <h2 className="text-[18px] font-semibold text-foreground mb-4 px-2">
                Main characters
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              <h2 className="text-[18px] font-semibold text-foreground mb-4 px-2">
                Alt characters
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
        <div className="bg-background-elevated border border-border rounded-xl p-6">
          <h3 className="text-[16px] font-semibold text-foreground mb-3">
            Character management tips
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
