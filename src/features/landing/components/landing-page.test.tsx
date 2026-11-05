import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fakeApi } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

describe('Landing page', () => {
  it('shows the brand and a way to sign in', async () => {
    fakeApi()
    renderRoute('/')

    expect(await screen.findByRole('heading', { level: 1, name: 'MyBricks' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Entrar como convidado' })).toBeInTheDocument()
  })

  it('switches the scene between day and night', async () => {
    const user = userEvent.setup()
    fakeApi()
    const { container } = renderRoute('/')

    const toggle = await screen.findByRole('button', { name: 'Modo noturno' })
    const landing = container.querySelector('.landing')
    expect(landing).toHaveAttribute('data-scene', 'day')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await user.click(toggle)
    expect(landing).toHaveAttribute('data-scene', 'night')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })

  it('scrolls down to the story', async () => {
    const user = userEvent.setup()
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    fakeApi()
    renderRoute('/')

    await user.click(await screen.findByRole('button', { name: 'Sobre' }))

    expect(scrollIntoView).toHaveBeenCalledOnce()
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('historia'))
  })
})
