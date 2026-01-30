'use client'

import { useSidebar } from '../contexts/SidebarContext'
import { HugeiconsIcon } from '@hugeicons/react'
import { Menu01Icon, Cancel01Icon } from '@hugeicons/core-free-icons'

export function MobileMenuButton() {
  const { isMobileMenuOpen, toggleMobileMenu } = useSidebar()

  return (
    <button
      onClick={toggleMobileMenu}
      className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition"
      aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isMobileMenuOpen}
    >
      <HugeiconsIcon
        icon={isMobileMenuOpen ? Cancel01Icon : Menu01Icon}
        size={24}
        className="text-foreground"
      />
    </button>
  )
}
