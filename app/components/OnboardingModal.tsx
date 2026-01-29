'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Modal,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import { Target01Icon, CheckListIcon, SparklesIcon, Cancel01Icon } from '@hugeicons/core-free-icons'
import { staggerContainer, fadeInUp } from '@/lib/animations'

interface OnboardingModalProps {
  open: boolean
  onClose: () => void
}

export default function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <Modal open={open} onClose={onClose} size="default">
          {/* Custom branded header with gradient */}
          <div className="relative overflow-hidden rounded-t-xl">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-accent/10 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-background-elevated to-transparent" />

            {/* Glow effect behind logo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-accent/30 rounded-full blur-3xl" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-background/50 hover:bg-background/80 text-foreground-secondary hover:text-foreground transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} />
            </button>

            {/* Header content */}
            <motion.div
              className="relative z-10 flex flex-col items-center pt-8 pb-6 px-6"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              {/* Logo with glow animation */}
              <motion.div
                variants={fadeInUp}
                className="relative mb-4"
              >
                <motion.div
                  className="absolute inset-0 bg-accent/40 rounded-full blur-xl"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.4, 0.6, 0.4]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <Image
                  src="/lootlist-icon.svg"
                  alt="LootList+"
                  width={48}
                  height={56}
                  className="relative z-10 drop-shadow-lg"
                />
              </motion.div>

              <motion.h2
                variants={fadeInUp}
                className="text-xl font-semibold text-foreground mb-1"
              >
                Welcome to LootList+!
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                className="text-foreground-secondary text-[14px]"
              >
                Here&apos;s how the loot system works
              </motion.p>
            </motion.div>
          </div>

          <ModalBody className="pt-2">
            <motion.div
              className="space-y-5"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              {/* What is this */}
              <motion.div variants={fadeInUp} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <HugeiconsIcon icon={Target01Icon} size={20} className="text-accent" />
                </div>
                <div>
                  <h3 className="text-foreground font-semibold text-[15px] mb-1">What is this?</h3>
                  <p className="text-foreground-secondary text-[14px]">
                    A loot priority system that speeds up raid loot distribution, sets clear expectations, and removes drama.
                  </p>
                </div>
              </motion.div>

              {/* How it works */}
              <motion.div variants={fadeInUp} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <HugeiconsIcon icon={CheckListIcon} size={20} className="text-blue-500" />
                </div>
                <div>
                  <h3 className="text-foreground font-semibold text-[15px] mb-1">How it works</h3>
                  <ol className="text-foreground-secondary text-[14px] space-y-1.5 list-decimal list-inside">
                    <li>You rank the items you want (1-5, where 5 = most wanted)</li>
                    <li>Your attendance and guild rank affect your priority</li>
                    <li>When loot drops, the highest priority player gets it</li>
                    <li>Ties are broken by random roll</li>
                  </ol>
                </div>
              </motion.div>

              {/* Why use it */}
              <motion.div variants={fadeInUp} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <HugeiconsIcon icon={SparklesIcon} size={20} className="text-green-500" />
                </div>
                <div>
                  <h3 className="text-foreground font-semibold text-[15px] mb-1">Why use it?</h3>
                  <ul className="text-foreground-secondary text-[14px] space-y-1">
                    <li><span className="text-foreground">Faster loot distribution</span> = more raid time</li>
                    <li><span className="text-foreground">Clear expectations</span> = no surprises</li>
                    <li><span className="text-foreground">Transparent scoring</span> = no drama</li>
                  </ul>
                </div>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                className="bg-background-subtle border border-border rounded-lg p-4 text-center"
              >
                <p className="text-foreground-secondary text-[14px]">
                  Ready to get started? Head to your <span className="text-accent font-medium">Loot List</span> and rank the items you want!
                </p>
              </motion.div>
            </motion.div>
          </ModalBody>

          <ModalFooter>
            <motion.div
              className="w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <Button onClick={onClose} className="w-full">
                Got it!
              </Button>
            </motion.div>
          </ModalFooter>
        </Modal>
      )}
    </AnimatePresence>
  )
}
