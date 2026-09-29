import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
} from '../modal'

describe('Modal', () => {
  it('renders as an ARIA dialog whose aria-labelledby resolves to the ModalTitle id', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <ModalHeader showCloseButton={false}>
          <ModalTitle>Modal heading</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <button>Only button</button>
        </ModalBody>
      </Modal>
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    const title = screen.getByText('Modal heading')
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(title).toHaveAttribute('id', labelledBy as string)
  })

  it('moves focus to the first focusable descendant on mount, with no manual .focus() call', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <ModalHeader showCloseButton={false}>
          <ModalTitle>Modal heading</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <button>Only button</button>
        </ModalBody>
      </Modal>
    )

    expect(screen.getByRole('button', { name: 'Only button' })).toHaveFocus()
  })

  it('pressing Escape while open calls onClose exactly once', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose}>
        <ModalHeader showCloseButton={false}>
          <ModalTitle>Modal heading</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <button>Only button</button>
        </ModalBody>
      </Modal>
    )

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('returns focus to the trigger button after closing', async () => {
    const user = userEvent.setup()

    function Wrapper() {
      const [open, setOpen] = useState(false)
      return (
        <div>
          <button onClick={() => setOpen(true)}>Open modal</button>
          <Modal open={open} onClose={() => setOpen(false)}>
            <ModalHeader showCloseButton={false}>
              <ModalTitle>Modal heading</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <button onClick={() => setOpen(false)}>Close</button>
            </ModalBody>
          </Modal>
        </div>
      )
    }

    render(<Wrapper />)

    const trigger = screen.getByRole('button', { name: 'Open modal' })
    await user.click(trigger)

    const closeButton = await screen.findByRole('button', { name: 'Close' })
    await user.click(closeButton)

    // The Modal unmounts TRANSITION_MS after `open` flips false (exit
    // animation), and focus restoration is tied to that unmount — so wait
    // for it rather than asserting synchronously.
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('Tab wraps forward from the last focusable element to the first, and Shift+Tab wraps backward', async () => {
    const user = userEvent.setup()
    render(
      <Modal open={true} onClose={() => {}}>
        <ModalHeader showCloseButton={false}>
          <ModalTitle>Modal heading</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <button>First</button>
          <button>Last</button>
        </ModalBody>
      </Modal>
    )

    const first = screen.getByRole('button', { name: 'First' })
    const last = screen.getByRole('button', { name: 'Last' })

    // Initial focus lands on the first focusable descendant (Task 1, step 9).
    expect(first).toHaveFocus()

    await user.tab()
    expect(last).toHaveFocus()

    await user.tab()
    expect(first).toHaveFocus()

    await user.tab({ shift: true })
    expect(last).toHaveFocus()
  })

  it('D-04: only the topmost of two simultaneously-open Modals traps focus and handles Escape', async () => {
    const user = userEvent.setup()
    const onCloseA = vi.fn()
    const onCloseB = vi.fn()

    render(
      <>
        <Modal open={true} onClose={onCloseA} zIndex={50}>
          <ModalHeader showCloseButton={false}>
            <ModalTitle>Modal A</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <button>Button A</button>
          </ModalBody>
        </Modal>
        <Modal open={true} onClose={onCloseB} zIndex={100}>
          <ModalHeader showCloseButton={false}>
            <ModalTitle>Modal B</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <button>Button B</button>
          </ModalBody>
        </Modal>
      </>
    )

    // Static dialog semantics apply to every open Modal, not only the
    // topmost one.
    const dialogs = screen.getAllByRole('dialog')
    expect(dialogs).toHaveLength(2)
    dialogs.forEach((dialog) => {
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    // Only the higher-zIndex Modal (B) is topmost, so it — not A — traps focus.
    expect(screen.getByRole('button', { name: 'Button B' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(onCloseB).toHaveBeenCalledOnce()
    expect(onCloseA).not.toHaveBeenCalled()
  })

  it('D-04 (same zIndex): when two simultaneously-open Modals share the default zIndex, the later-mounted one is topmost, not the first-registered one', async () => {
    const user = userEvent.setup()
    const onCloseA = vi.fn()
    const onCloseB = vi.fn()

    render(
      <>
        {/* Neither Modal passes an explicit zIndex, so both use the shared
            default (50) — the realistic case, e.g. a Modal that opens its
            own confirm-modal dialog via useConfirm(). */}
        <Modal open={true} onClose={onCloseA}>
          <ModalHeader showCloseButton={false}>
            <ModalTitle>Modal A</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <button>Button A</button>
          </ModalBody>
        </Modal>
        <Modal open={true} onClose={onCloseB}>
          <ModalHeader showCloseButton={false}>
            <ModalTitle>Modal B</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <button>Button B</button>
          </ModalBody>
        </Modal>
      </>
    )

    const dialogs = screen.getAllByRole('dialog')
    expect(dialogs).toHaveLength(2)

    // B was registered second at the same (default) zIndex, so it — not A —
    // must be treated as topmost: it traps focus and owns the Escape handler.
    expect(screen.getByRole('button', { name: 'Button B' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(onCloseB).toHaveBeenCalledOnce()
    expect(onCloseA).not.toHaveBeenCalled()
  })
})
