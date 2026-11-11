'use client'

/**
 * SetYourFiveLinkEntry: the way the Discord "Set your 5" link lands on the
 * right character's picker (D-24, DISC-11).
 *
 * The link is `/loot-list?guild=<uuid>&picker=1`. The guild value only chooses
 * which of the member's own guilds to switch to: it is never used to read data,
 * `switchGuild` refuses a guild the user is not in, and every route checks
 * membership again (T-04-13-01). A malformed value is ignored by
 * parseSetYourFiveParams (T-04-13-02).
 *
 * On the normal path this renders nothing. When the member has no character in
 * the linked guild it renders the create-character step and tells the page to
 * show nothing else, so another guild's list never sits under that step.
 */
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { UserAdd01Icon } from '@hugeicons/core-free-icons'

import { useGuildContext } from '@/app/contexts/GuildContext'
import { EmptyState } from '@/components/ui/empty-state'
import { parseSetYourFiveParams, pickLinkCharacter } from '@/domain/loot/set-your-five'

const CreateCharacterModal = dynamic(() =>
  import('@/app/components/CreateCharacterModal').then((mod) => ({ default: mod.CreateCharacterModal })),
)

// DRAFT copy, UI-SPEC "Picker (surface 1)": the owner signs it off in 04-19.
const NO_CHARACTER_TITLE = 'Create a character first'
const NO_CHARACTER_BODY = 'You need a character in this guild before you can set your 5.'
const NO_CHARACTER_ACTION = 'Create character'

interface SetYourFiveLinkEntryProps {
  /** True while this component owns the page, so the page can hide the picker and editor. */
  onBlockingChange?: (blocking: boolean) => void
}

export function SetYourFiveLinkEntry({ onBlockingChange }: SetYourFiveLinkEntryProps) {
  const searchParams = useSearchParams()
  const { loading, userGuilds, characterMemberships, activeGuild, activeCharacter, switchGuild } = useGuildContext()
  const [creating, setCreating] = useState(false)
  // One switch per link target: the context re-renders as it updates, and a
  // refused or failed switch must not retry in a loop.
  const switchedFor = useRef<string | null>(null)

  const { guildId, picker } = parseSetYourFiveParams(searchParams)
  const wanted = picker ? guildId : null
  // Membership comes from the user's own guild list, never from the link.
  const isMember = wanted !== null && userGuilds.some((g) => g.guild.id === wanted)
  const target = !loading && wanted !== null && isMember ? wanted : null
  const character = target !== null ? pickLinkCharacter(characterMemberships, target) : null
  const characterId = character?.id ?? null
  const needsCharacter = target !== null && character === null
  const alreadyThere = target !== null && activeGuild?.id === target && (characterId === null || activeCharacter?.id === characterId)

  useEffect(() => {
    onBlockingChange?.(needsCharacter)
  }, [needsCharacter, onBlockingChange])

  useEffect(() => {
    if (target === null || alreadyThere) return
    const key = `${target}:${characterId ?? 'none'}`
    if (switchedFor.current === key) return
    switchedFor.current = key
    // Without a character the guild still moves, so the create-character modal
    // (which writes into the active guild) adds the character to the linked one.
    void (characterId ? switchGuild(target, characterId) : switchGuild(target))
  }, [target, characterId, alreadyThere, switchGuild])

  if (!needsCharacter || target === null) return null

  const openCreate = async () => {
    if (activeGuild?.id !== target) await switchGuild(target)
    setCreating(true)
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-2">
      <EmptyState
        icon={UserAdd01Icon}
        title={NO_CHARACTER_TITLE}
        description={NO_CHARACTER_BODY}
        action={{ label: NO_CHARACTER_ACTION, onClick: () => void openCreate() }}
        variant="card"
        size="lg"
      />
      {creating ? <CreateCharacterModal isOpen onClose={() => setCreating(false)} /> : null}
    </div>
  )
}
