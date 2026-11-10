'use client'

/**
 * ItemLink Component
 *
 * Client component: uses useState/useEffect and consumes ExpansionDataContext,
 * none of which exist in React's `react-server` build. Every importer today is
 * already a client component, so the directive changes no behaviour -- it makes
 * the requirement explicit so a future Server Component importer fails in review
 * rather than at "Collecting page data" during `next build`.
 *
 * Renders an item name as a Wowhead tooltip link with:
 * - Lazy-loaded icons (190KB icon map loaded on demand)
 * - Epic purple coloring
 * - Tooltips on hover via Wowhead power.js
 * - Correct wowhead domain based on active expansion
 */

import { memo, useContext, useState, useEffect } from 'react'
import { ExpansionDataContext } from '@/app/contexts/ExpansionContext'
import { QUALITY_COLORS } from '@/lib/design-system/quality-colors'
import { getWowheadDomain } from '@/domain/expansion/wowhead'
import { NeedLabel } from './NeedLabel'

// Lazy-load the 190KB item-icons module. Cache the getter once loaded.
let _getItemIconUrl: ((id: number, size: 'small' | 'medium' | 'large') => string | null) | null = null
let _loadPromise: Promise<void> | null = null

function ensureItemIconsLoaded(): Promise<void> {
  if (_getItemIconUrl) return Promise.resolve()
  if (!_loadPromise) {
    _loadPromise = import('@/data/item-icons').then(mod => {
      _getItemIconUrl = mod.getItemIconUrl
    })
  }
  return _loadPromise
}

/** Synchronous icon lookup - returns null if module not yet loaded */
function getIconUrl(wowheadId: number, size: 'small' | 'medium' | 'large' = 'small'): string | null {
  return _getItemIconUrl ? _getItemIconUrl(wowheadId, size) : null
}

// The expansion-to-domain map lives in domain/expansion/wowhead.ts (single map,
// shared with Discord and server code). Re-exported so existing importers and
// tests keep working.
export { getWowheadDomain }

interface ItemLinkProps {
  name: string
  /** Null for a need row (D-13): it has no Wowhead item yet, so it renders as a NeedLabel. */
  wowheadId: number | null
  className?: string
  clickable?: boolean
  showIcon?: boolean
  /** Override wowhead domain (e.g. 'tbc', 'wotlk'). Auto-detected from guild context if omitted. */
  domain?: string
  /** Custom click handler. If provided, prevents default navigation. */
  onClick?: (e: React.MouseEvent) => void
}

type WowheadItemLinkProps = ItemLinkProps & { wowheadId: number }

const WowheadItemLink = memo(function WowheadItemLink({ name, wowheadId, className = '', clickable = true, showIcon = true, domain: domainProp, onClick: onClickProp }: WowheadItemLinkProps) {
  // Read expansion from guild context (safe - returns undefined outside provider)
  const expansionData = useContext(ExpansionDataContext)
  const expansionDomain = domainProp ?? getWowheadDomain(expansionData?.currentExpansion?.expansion_name)

  // Fallback: guess from item ID ranges if no context available
  const domain = expansionDomain ?? (
    wowheadId >= 35000 && wowheadId < 51000 ? 'wotlk' :
    wowheadId >= 22000 && wowheadId < 35000 ? 'tbc' :
    'classic'
  )

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClickProp) {
      e.preventDefault()
      onClickProp(e)
      return
    }
    if (!clickable) {
      e.preventDefault()
    }
  }

  // Try synchronous lookup first (fast path when module already loaded)
  const [iconUrl, setIconUrl] = useState<string | null>(() =>
    showIcon ? getIconUrl(wowheadId, 'small') : null
  )

  // If icons aren't loaded yet, trigger async load
  useEffect(() => {
    if (!showIcon) return
    if (_getItemIconUrl) {
      // Module loaded, update if needed
      const url = _getItemIconUrl(wowheadId, 'small')
      setIconUrl(url)
      return
    }
    // Module not loaded yet - trigger lazy load
    ensureItemIconsLoaded().then(() => {
      setIconUrl(getIconUrl(wowheadId, 'small'))
    })
  }, [wowheadId, showIcon])

  return (
    <a
      href={clickable ? `https://www.wowhead.com/${domain}/item=${wowheadId}` : '#'}
      target={clickable ? "_blank" : undefined}
      rel={clickable ? "noopener noreferrer" : undefined}
      className={`inline-flex items-center gap-1 min-w-0 max-w-full align-middle ${className}`}
      style={{
        color: QUALITY_COLORS.epic
      }}
      data-wowhead={`item=${wowheadId}&domain=${domain}`}
      onClick={handleClick}
    >
      {showIcon && (
        iconUrl ? (
          <img
            src={iconUrl}
            alt=""
            width={18}
            height={18}
            className="inline-block rounded-sm flex-shrink-0 outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
            style={{ imageRendering: 'pixelated' }}
            loading="eager"
          />
        ) : (
          <span className="inline-block w-[18px] h-[18px] rounded-sm flex-shrink-0 bg-muted" />
        )
      )}
      <span className="truncate min-w-0">{name}</span>
    </a>
  )
})

// Hooks cannot sit behind an early return, so the need-row guard lives in this
// hooks-free wrapper and WowheadItemLink keeps every hook unconditional. One guard
// here covers every ItemLink call site, so a row with no wowhead_id never renders
// an `item=null` link or asks Wowhead for a tooltip (D-13, DISC-06).
const ItemLink = memo(function ItemLink(props: ItemLinkProps) {
  if (props.wowheadId == null) {
    return (
      <NeedLabel
        name={props.name}
        className={props.className}
        onClick={props.onClick}
        showIcon={props.showIcon}
      />
    )
  }
  return <WowheadItemLink {...props} wowheadId={props.wowheadId} />
})

export default ItemLink
