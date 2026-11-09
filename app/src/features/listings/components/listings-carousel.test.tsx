import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeListing } from '@/test/fake-api'
import { ListingsCarousel } from './listings-carousel'

/** jsdom does no layout: say how wide the track is and how far it is scrolled. */
function layout(track: HTMLElement, sizes: { clientWidth?: number; scrollWidth?: number; scrollLeft?: number }) {
  for (const [name, value] of Object.entries(sizes)) Object.defineProperty(track, name, { configurable: true, value })
}

function renderCarousel(count = 2) {
  const listings = Array.from({ length: count }, () => makeListing())
  render(<ListingsCarousel listings={listings} whatsappNumber="5548991802046" variant="app" label="Imóveis à venda" />)
  return screen.getByRole('list', { name: 'Imóveis à venda, em ordem' })
}

describe('Listings carousel', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders nothing without listings', () => {
    const { container } = render(<ListingsCarousel listings={[]} whatsappNumber="5548991802046" variant="app" label="Imóveis à venda" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('is a carousel of numbered slides, one card each, with no autoplay', () => {
    const listings = [makeListing(), makeListing({ neighborhood: 'Trindade' })]
    render(<ListingsCarousel listings={listings} whatsappNumber="5548991802046" variant="app" label="Imóveis à venda" />)

    const carousel = screen.getByRole('region', { name: 'Imóveis à venda' })
    expect(carousel).toHaveAttribute('aria-roledescription', 'carousel')
    const slides = within(carousel).getAllByRole('group')
    expect(slides.map((slide) => slide.getAttribute('aria-label'))).toEqual(['1 de 2', '2 de 2'])
    expect(slides.every((slide) => slide.getAttribute('aria-roledescription') === 'slide')).toBe(true)
    expect(within(slides[1]!).getByRole('heading', { name: 'Apartamento no Trindade' })).toBeInTheDocument()
  })

  it('shows the buttons only when the cards overflow, and pages the track with them', async () => {
    const user = userEvent.setup()
    const scrollBy = vi.fn()
    Element.prototype.scrollBy = scrollBy
    const track = renderCarousel()
    expect(screen.queryByRole('button', { name: 'Próximos' })).not.toBeInTheDocument()

    layout(track, { clientWidth: 400, scrollWidth: 900, scrollLeft: 0 })
    window.dispatchEvent(new Event('resize'))

    const previous = await screen.findByRole('button', { name: 'Anteriores' })
    const next = screen.getByRole('button', { name: 'Próximos' })
    expect(previous).toBeDisabled()
    expect(next).toBeEnabled()

    await user.click(next)
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 360, behavior: 'smooth' })

    layout(track, { scrollLeft: 500 })
    track.dispatchEvent(new Event('scroll'))
    await vi.waitFor(() => expect(next).toBeDisabled())
    expect(previous).toBeEnabled()
    await user.click(previous)
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -360, behavior: 'smooth' })
  })

  it('pages with the arrow keys when the track has focus', async () => {
    const user = userEvent.setup()
    const scrollBy = vi.fn()
    Element.prototype.scrollBy = scrollBy
    const track = renderCarousel()

    layout(track, { clientWidth: 400, scrollWidth: 900 })
    track.focus()
    await user.keyboard('{ArrowRight}')
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 360, behavior: 'smooth' })
    await user.keyboard('{ArrowLeft}')
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -360, behavior: 'smooth' })
  })
})
