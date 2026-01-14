'use client'

import { Character } from '@/app/contexts/GuildContext'

// Get WoWhead class icon URL
function getClassIconUrl(className: string | undefined): string {
  if (!className) return ''
  const classNameLower = className.toLowerCase().replace(' ', '')
  return `https://wow.zamimg.com/images/wow/icons/large/classicon_${classNameLower}.jpg`
}

interface CharacterCardProps {
  character: Character
  onClick?: () => void
  isActive?: boolean
  showGuildCount?: boolean
  guildCount?: number
  className?: string
}

export function CharacterCard({
  character,
  onClick,
  isActive = false,
  showGuildCount = false,
  guildCount = 0,
  className = ''
}: CharacterCardProps) {
  const classColor = character.class?.color_hex || '#808080'

  return (
    <div
      className={`
        bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-4
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:bg-[#1a1a1f] hover:border-[rgba(255,255,255,0.2)]' : ''}
        ${isActive ? 'ring-2 ring-[#ff8000]' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Character Class Icon */}
        {character.class?.name ? (
          <img
            src={getClassIconUrl(character.class.name)}
            alt={character.class.name}
            className="w-12 h-12 rounded-full border border-border flex-shrink-0"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg border border-border flex-shrink-0"
            style={{ backgroundColor: classColor }}
          >
            {character.name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Character Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className="font-semibold text-base truncate"
              style={{ color: classColor }}
            >
              {character.name}
            </h3>
            {character.is_main && (
              <span className="px-2 py-0.5 bg-[#ff8000]/20 border border-[#ff8000] rounded-full text-[#ff8000] text-[11px] font-medium">
                Main
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-[13px] text-[#a1a1a1]">
            <span>
              {character.spec?.name
                ? `${character.spec.name} ${character.class?.name || 'Unknown'}`
                : character.class?.name || 'Unknown'}
            </span>
          </div>

          {showGuildCount && (
            <div className="mt-1 text-[12px] text-[#a1a1a1]">
              {guildCount === 0 && 'No guilds'}
              {guildCount === 1 && '1 guild'}
              {guildCount > 1 && `${guildCount} guilds`}
            </div>
          )}
        </div>

        {/* Active Indicator */}
        {isActive && (
          <div className="w-2 h-2 rounded-full bg-[#ff8000]" />
        )}
      </div>
    </div>
  )
}
