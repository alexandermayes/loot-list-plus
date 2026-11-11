import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ErrorState } from '@/components/ui/error-state'

describe('ErrorState retry button', () => {
  it('says Try again by default', () => {
    render(<ErrorState message="Nope" onRetry={() => {}} />)

    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('uses a custom label and calls onRetry', async () => {
    const onRetry = vi.fn()
    render(<ErrorState message="Nope" onRetry={onRetry} retryLabel="Retry loading it" />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry loading it' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  })

  it('shows no button without onRetry', () => {
    render(<ErrorState message="Nope" retryLabel="Retry loading it" />)

    expect(screen.queryByRole('button')).toBeNull()
  })
})
