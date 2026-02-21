'use client'

import Link from 'next/link'
import Image from 'next/image'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'

export default function LegalNav() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="w-full px-6 md:px-12 lg:px-20">
        <nav className="flex items-center justify-between h-16 md:h-20">
          {/* Back Button */}
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
              <span>Back</span>
            </Link>
          </Button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image
              src="/lootlist-icon.svg"
              alt="LootList+"
              width={28}
              height={36}
              className="h-7 w-auto"
            />
            <Image
              src="/logo.svg"
              alt="LootList+"
              width={100}
              height={16}
              className="h-4 w-auto hidden sm:block"
            />
          </Link>

          {/* Spacer for centering */}
          <div className="w-[88px]" />
        </nav>
      </div>
    </header>
  )
}
