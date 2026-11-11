'use client'

/**
 * NeedLabel Component
 *
 * A need row ("Trinket, Healing") is a generic loot need, not an item, so it has
 * no Wowhead id yet (D-13). It therefore gets no link, no tooltip attribute and no
 * icon request: just the name and a neutral icon. It uses plain foreground and
 * muted tokens, never the epic purple ItemLink uses, so a need never reads as a
 * Wowhead item.
 *
 * ItemLink renders this when it is handed a null wowheadId, which is how all of
 * its call sites show a need row without an `item=null` link. With an onClick it
 * renders a button, because BossSection and the candidate modal open a modal from
 * the row.
 */

import { HugeiconsIcon } from '@hugeicons/react'
import { Target02Icon } from '@hugeicons/core-free-icons'

export interface NeedLabelProps {
  name: string
  className?: string
  /** Custom click handler. If provided, the label renders as a button. */
  onClick?: (e: React.MouseEvent) => void
  showIcon?: boolean
}

export function NeedLabel({ name, className = '', onClick, showIcon = true }: NeedLabelProps) {
  const classes = `inline-flex items-center gap-1 min-w-0 max-w-full align-middle text-foreground ${className}`

  const content = (
    <>
      {showIcon && (
        <HugeiconsIcon
          icon={Target02Icon}
          size={16}
          aria-hidden="true"
          className="flex-shrink-0 text-muted-foreground"
        />
      )}
      <span className="truncate min-w-0">{name}</span>
    </>
  )

  if (onClick) {
    // The underline and ring say "clickable" without the link colour an item gets;
    // the span branch below stays plain because it does nothing on click.
    const buttonClasses = `${classes} text-left rounded-sm hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
    return (
      <button type="button" data-need-label="" className={buttonClasses} onClick={onClick}>
        {content}
      </button>
    )
  }

  return (
    <span data-need-label="" className={classes}>
      {content}
    </span>
  )
}

export default NeedLabel
