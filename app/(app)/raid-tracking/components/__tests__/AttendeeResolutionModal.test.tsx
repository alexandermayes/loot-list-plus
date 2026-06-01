import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AttendeeResolutionModal } from '../AttendeeResolutionModal'
import type { Member } from '../types'

const alice: Member = {
  character_id: 'char-alice',
  user_id: 'user-alice',
  character_name: 'Alice',
  class_name: 'Paladin',
  class_color: '#f48cba',
  role: 'Officer',
}
const bob: Member = {
  character_id: 'char-bob',
  user_id: 'user-bob',
  character_name: 'Bob',
  class_name: 'Warrior',
  class_color: '#c69b6d',
  role: 'Raider',
}

const baseProps = {
  target: { index: 0, name: 'StrangerName' },
  totalUnmatched: 3,
  searchQuery: '',
  filteredMembers: [alice, bob],
  rememberAlias: false,
  onSearchQueryChange: () => {},
  onResolve: () => {},
  onSkip: () => {},
  onSkipAll: () => {},
  onCancel: () => {},
  onRememberAliasChange: () => {},
}

describe('AttendeeResolutionModal', () => {
  it('does not render when target is null', () => {
    render(<AttendeeResolutionModal {...baseProps} target={null} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the unmatched name and progress (index+1 / total)', () => {
    render(<AttendeeResolutionModal {...baseProps} target={{ index: 1, name: 'Foo' }} totalUnmatched={5} />)
    expect(screen.getByText('Foo')).toBeInTheDocument()
    expect(screen.getByText(/\(2\/5\)/)).toBeInTheDocument()
  })

  it('renders one button per filtered member with name and class', () => {
    render(<AttendeeResolutionModal {...baseProps} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Paladin')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Warrior')).toBeInTheDocument()
  })

  it('renders empty state when filteredMembers is empty', () => {
    render(<AttendeeResolutionModal {...baseProps} filteredMembers={[]} />)
    expect(screen.getByText('No members found')).toBeInTheDocument()
  })

  it('typing in search fires onSearchQueryChange (controlled input)', async () => {
    const user = userEvent.setup()
    const onSearchQueryChange = vi.fn()
    render(<AttendeeResolutionModal {...baseProps} onSearchQueryChange={onSearchQueryChange} />)
    await user.type(screen.getByPlaceholderText(/Search raiders/), 'A')
    expect(onSearchQueryChange).toHaveBeenCalledExactlyOnceWith('A')
  })

  it('clicking a member row fires onResolve with the member', async () => {
    const user = userEvent.setup()
    const onResolve = vi.fn()
    render(<AttendeeResolutionModal {...baseProps} onResolve={onResolve} />)
    await user.click(screen.getByText('Alice'))
    expect(onResolve).toHaveBeenCalledExactlyOnceWith(alice)
  })

  it('"Skip this name" fires onSkip', async () => {
    const user = userEvent.setup()
    const onSkip = vi.fn()
    render(<AttendeeResolutionModal {...baseProps} onSkip={onSkip} />)
    await user.click(screen.getByRole('button', { name: 'Skip this name' }))
    expect(onSkip).toHaveBeenCalledOnce()
  })

  it('"Skip all remaining" fires onSkipAll', async () => {
    const user = userEvent.setup()
    const onSkipAll = vi.fn()
    render(<AttendeeResolutionModal {...baseProps} onSkipAll={onSkipAll} />)
    await user.click(screen.getByRole('button', { name: 'Skip all remaining' }))
    expect(onSkipAll).toHaveBeenCalledOnce()
  })

  it('"Cancel import" fires onCancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<AttendeeResolutionModal {...baseProps} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: 'Cancel import' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('remember-alias checkbox reflects rememberAlias and fires onRememberAliasChange', async () => {
    const user = userEvent.setup()
    const onRememberAliasChange = vi.fn()
    render(
      <AttendeeResolutionModal
        {...baseProps}
        rememberAlias={false}
        onRememberAliasChange={onRememberAliasChange}
      />
    )
    const box = screen.getByRole('checkbox', { name: /Remember this alias/ })
    expect(box).not.toBeChecked()
    await user.click(box)
    expect(onRememberAliasChange).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('checked checkbox reflects rememberAlias=true', () => {
    render(<AttendeeResolutionModal {...baseProps} rememberAlias={true} />)
    expect(screen.getByRole('checkbox', { name: /Remember this alias/ })).toBeChecked()
  })
})
