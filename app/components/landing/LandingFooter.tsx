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
      className="relative py-12 bg-[#080808] border-t border-[#383838]/50"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <Image
              src="/images/landing/logo-landing.svg"
              alt="LootList+"
              width={120}
              height={19}
              className="h-5 w-auto opacity-70"
            />
            <p className="text-xs text-[#bababa]/50">
              &copy; {new Date().getFullYear()} LootList+. All rights reserved.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <a
              href="/about"
              className="text-sm text-[#bababa] hover:text-white transition-colors"
            >
              About
            </a>
            <a
              href="/compare"
              className="text-sm text-[#bababa] hover:text-white transition-colors"
            >
              Compare
            </a>
            <a
              href="/blog"
              className="text-sm text-[#bababa] hover:text-white transition-colors"
            >
              Blog
            </a>
            <a
              href="/changelog"
              className="text-sm text-[#bababa] hover:text-white transition-colors"
            >
              Changelog
            </a>
            <a
              href="/terms"
              className="text-sm text-[#bababa] hover:text-white transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="/privacy"
              className="text-sm text-[#bababa] hover:text-white transition-colors"
            >
              Privacy Policy
            </a>
          </div>

          {/* Tagline */}
          <div className="text-xs text-[#bababa]/50 text-center md:text-right space-y-1">
            <p>
              Made with ❤️ by{' '}
              <a
                href="https://discord.gg/JNJewThYAB"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#bababa] hover:text-white transition-colors"
              >
                Big Yikes
              </a>
            </p>
            <p>
              Parses by{' '}
              <a
                href="https://parseforge.gg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#bababa] hover:text-white transition-colors"
              >
                parseforge.gg
              </a>
            </p>
            <p>
              The LootList+ app lives at{' '}
              <a
                href="https://www.lootlistplus.com"
                className="text-[#bababa] hover:text-white transition-colors"
              >
                lootlistplus.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </motion.footer>
  )
}
