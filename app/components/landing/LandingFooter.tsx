'use client'

import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/animations'
import Image from 'next/image'

export default function LandingFooter() {
  return (
    <motion.footer
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeIn}
      className="relative py-12 bg-background border-t border-border"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <Image
              src="/logo.svg"
              alt="LootList+"
              width={120}
              height={19}
              className="h-5 w-auto opacity-70"
            />
            <p className="text-xs text-foreground-muted">
              &copy; {new Date().getFullYear()} LootList+. All rights reserved.
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a
              href="/terms"
              className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="/privacy"
              className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="/blog"
              className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
            >
              Blog
            </a>
          </div>

          {/* Tagline */}
          <p className="text-xs text-foreground-muted text-center md:text-right">
            Made with &lt;3 by{' '}
            <a
              href="https://discord.gg/bigyikes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground-secondary hover:text-foreground transition-colors"
            >
              Big Yikes
            </a>
          </p>
        </div>
      </div>
    </motion.footer>
  )
}
