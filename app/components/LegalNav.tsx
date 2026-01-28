'use client'

import Link from 'next/link'
import Image from 'next/image'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'

export default function LegalNav() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="mx-auto max-w-4xl px-6">
        <nav className="flex items-center justify-between h-16">
          {/* Back Button */}
          <Link
            href="/"
            className="flex items-center gap-2 text-foreground-secondary hover:text-foreground transition-colors"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
            <span className="text-sm font-medium">Back</span>
          </Link>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image
              src="/lootlist-icon.svg"
              alt="LootList+"
              width={24}
              height={32}
              className="h-6 w-auto"
            />
            <Image
              src="/logo.svg"
              alt="LootList+"
              width={90}
              height={14}
              className="h-3.5 w-auto hidden sm:block"
            />
          </Link>

          {/* Spacer for centering */}
          <div className="w-[72px]" />
        </nav>
      </div>
    </header>
  )
}
