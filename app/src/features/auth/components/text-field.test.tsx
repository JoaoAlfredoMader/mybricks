import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TextField } from './text-field'

describe('TextField', () => {
  it('ties the label to the input', () => {
    render(<TextField label="E-mail" />)
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'text')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('announces the error and ties it to the input', () => {
    render(<TextField label="E-mail" error="Informe o e-mail." />)
    const input = screen.getByLabelText('E-mail')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Informe o e-mail.')
  })

  it('is not marked invalid without an error', () => {
    render(<TextField label="E-mail" />)
    expect(screen.getByLabelText('E-mail')).not.toHaveAttribute('aria-invalid')
  })

  it('hides a password until asked to show it, and hides it again', async () => {
    const user = userEvent.setup()
    render(<TextField label="Senha" type="password" />)
    const input = screen.getByLabelText('Senha')
    expect(input).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Esconder senha' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Esconder senha' }))
    expect(input).toHaveAttribute('type', 'password')
  })
})
