import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddonImportDialog } from '../AddonImportDialog'

vi.mock('@/app/contexts/NotificationContext', () => ({
  useNotification: () => ({ showNotification: vi.fn() }),
}))

function stubImportResponse(awards: Record<string, number>) {
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: { awards, attendance: { processed: 1, errors: 0 } } }),
    } as Response)
  ))
}

async function runImport() {
  render(<AddonImportDialog open onClose={() => {}} />)
  await userEvent.type(screen.getByPlaceholderText(/Paste addon export string here/), 'LLP1E:1:abc')
  await userEvent.click(screen.getByRole('button', { name: 'Import' }))
  return screen.findByText('Loot awards')
}

describe('AddonImportDialog loot awards row (GH #295 COPY-1)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows "{processed - n} imported, {n} already recorded" when some awards were already recorded', async () => {
    stubImportResponse({ processed: 15, errors: 0, already_recorded: 3 })
    const label = await runImport()
    expect(label.parentElement).toHaveTextContent('12 imported, 3 already recorded')
  })

  it('shows only "{processed} imported" when nothing was already recorded', async () => {
    stubImportResponse({ processed: 15, errors: 0, already_recorded: 0 })
    const label = await runImport()
    expect(label.parentElement).toHaveTextContent('15 imported')
    expect(label.parentElement).not.toHaveTextContent('already recorded')
  })

  it('treats an older response without already_recorded as zero', async () => {
    stubImportResponse({ processed: 4, errors: 1 })
    const label = await runImport()
    expect(label.parentElement).toHaveTextContent('4 imported')
    expect(label.parentElement).toHaveTextContent('1 failed')
    expect(label.parentElement).not.toHaveTextContent('already recorded')
  })
})
