'use client'

import { useSidebar } from '../contexts/SidebarContext'
import { HugeiconsIcon } from '@hugeicons/react'
import { Menu01Icon, Cancel01Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'

export function MobileMenuButton() {
  const { isMobileMenuOpen, toggleMobileMenu } = useSidebar()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleMobileMenu}
      aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isMobileMenuOpen}
    >
      <HugeiconsIcon
        icon={isMobileMenuOpen ? Cancel01Icon : Menu01Icon}
        size={24}
        className="text-foreground"
      />
    </Button>
  )
}
