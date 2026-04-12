'use client'

import { useState } from 'react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useNotification } from '@/app/contexts/NotificationContext'

interface GuardianConversionModalProps {
  open: boolean
  onClose: () => void
  characterId: string
  characterName: string
  guardianSpecId: string
  onSpecChanged: () => void
}

export default function GuardianConversionModal({
  open,
  onClose,
  characterId,
  characterName,
  guardianSpecId,
  onSpecChanged,
}: GuardianConversionModalProps) {
  const [loading, setLoading] = useState(false)
  const { showNotification } = useNotification()

  async function dismissConversion() {
    // Set guardian_conversion_dismissed = true, keep Feral spec
    try {
      const res = await fetch(`/api/characters/${characterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guardian_conversion_dismissed: true }),
      })
      if (!res.ok) throw new Error('Failed to dismiss')
    } catch {
      // Non-critical, just close the modal
    }
    onClose()
  }

  async function keepFeral() {
    setLoading(true)
    try {
      const res = await fetch(`/api/characters/${characterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guardian_conversion_dismissed: true }),
      })
      if (!res.ok) throw new Error('Failed to update')
      showNotification('success', `${characterName} stays Feral (DPS).`)
      onClose()
    } catch {
      showNotification('error', 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function switchToGuardian() {
    setLoading(true)
    try {
      const res = await fetch(`/api/characters/${characterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spec_id: guardianSpecId,
          guardian_conversion_dismissed: true,
        }),
      })
      if (!res.ok) throw new Error('Failed to update')
      showNotification('success', `${characterName} is now Guardian (Tank).`)
      onSpecChanged()
      onClose()
    } catch {
      showNotification('error', 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={dismissConversion} size="default">
      <ModalHeader onClose={dismissConversion}>
        <ModalTitle>Are you a tank or DPS?</ModalTitle>
        <ModalDescription>
          Feral Druid has been split into two specs for more accurate loot scoring.
        </ModalDescription>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-3 text-[13px] text-foreground-secondary">
          <p>
            <span className="font-semibold text-foreground">Feral</span> is now
            DPS only (cat form). <span className="font-semibold text-foreground">Guardian</span> is
            the tank spec (bear form).
          </p>
          <p>
            This affects which role modifier applies to your Loot Score, and which
            items show as relevant on the Master Sheet.
          </p>
          <p className="text-muted-foreground">
            You can always change your spec later from your character settings.
          </p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={keepFeral} loading={loading}>
          I'm DPS (keep Feral)
        </Button>
        <Button variant="primary" onClick={switchToGuardian} loading={loading}>
          I'm a Tank (switch to Guardian)
        </Button>
      </ModalFooter>
    </Modal>
  )
}
