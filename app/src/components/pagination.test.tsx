import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './pagination'

describe('Pagination', () => {
  it('says which rows are on the page and goes to the next one', async () => {
    const onPageChange = vi.fn()
    render(<Pagination page={1} pageSize={20} total={45} onPageChange={onPageChange} />)

    expect(screen.getByText('1–20 de 45')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('stops at the last page, which can be short, and goes back from it', async () => {
    const onPageChange = vi.fn()
    render(<Pagination page={3} pageSize={20} total={45} onPageChange={onPageChange} />)

    expect(screen.getByText('41–45 de 45')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('has nothing to go to when there is nothing to show', () => {
    render(<Pagination page={1} pageSize={20} total={0} onPageChange={vi.fn()} />)

    expect(screen.getByText('Nenhum resultado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled()
  })
})
