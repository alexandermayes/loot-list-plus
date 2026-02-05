'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import type { IconSvgElement } from '@hugeicons/react'
import { StarIcon, CheckmarkCircle01Icon, Clock01Icon, AlertCircleIcon, Cancel01Icon } from '@hugeicons/core-free-icons'

// Re-export HugeiconsIcon for convenience
export { HugeiconsIcon }

// Helper component for easier icon usage
interface IconProps {
  icon: IconSvgElement
  size?: number
  className?: string
  color?: string
  strokeWidth?: number
}

export function Icon({ icon, size = 20, className, color = 'currentColor', strokeWidth = 1.5 }: IconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
    />
  )
}

// Status indicator icons using HugeIcons
interface FilledIconProps {
  className?: string
  size?: number
}

export function StarFilledIcon({ className = '', size = 14 }: FilledIconProps) {
  return (
    <HugeiconsIcon
      icon={StarIcon}
      size={size}
      color="currentColor"
      className={className}
    />
  )
}

export function CheckFilledIcon({ className = '', size = 14 }: FilledIconProps) {
  return (
    <HugeiconsIcon
      icon={CheckmarkCircle01Icon}
      size={size}
      color="currentColor"
      className={className}
    />
  )
}

export function ClockFilledIcon({ className = '', size = 14 }: FilledIconProps) {
  return (
    <HugeiconsIcon
      icon={Clock01Icon}
      size={size}
      color="currentColor"
      className={className}
    />
  )
}

export function AlertFilledIcon({ className = '', size = 14 }: FilledIconProps) {
  return (
    <HugeiconsIcon
      icon={AlertCircleIcon}
      size={size}
      color="currentColor"
      className={className}
    />
  )
}

export function CancelFilledIcon({ className = '', size = 14 }: FilledIconProps) {
  return (
    <HugeiconsIcon
      icon={Cancel01Icon}
      size={size}
      color="currentColor"
      className={className}
    />
  )
}
