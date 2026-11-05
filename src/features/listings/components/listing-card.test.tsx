import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeListing } from '@/test/fake-api'
import { ListingCard } from './listing-card'

const plain = (value: string | null | undefined) => value?.replace(/ /g, ' ')

describe('Listing card', () => {
  it('shows the cover, the title, where it is, the price and the facts', () => {
    const listing = makeListing({ area: { value: 60, unit: 'm2' } })
    render(<ListingCard listing={listing} whatsappNumber="5548991802046" variant="app" />)

    const cover = screen.getByRole('img', { name: 'Foto de Apartamento no Centro, em Florianópolis/SC' })
    expect(cover).toHaveAttribute('src', `${location.origin}${listing.coverPhotoUrl}`)
    expect(cover).toHaveAttribute('loading', 'lazy')
    expect(cover).toHaveAttribute('width')
    expect(cover).toHaveAttribute('height')
    expect(screen.getByRole('heading', { level: 3, name: 'Apartamento no Centro' })).toBeInTheDocument()
    expect(screen.getByText('Centro · Florianópolis/SC')).toBeInTheDocument()
    expect(plain(screen.getByText(/^R\$\s450\.000$/).textContent)).toBe('R$ 450.000')
    const facts = within(screen.getByRole('list')).getAllByRole('listitem').map((item) => item.textContent)
    expect(facts).toEqual(['60 m²', '2 quartos', '1 suíte', '2 banheiros', '1 vaga'])
    expect(plain(screen.getByText(/Construído em 2012/).textContent)).toBe('R$ 7.500/m² · Construído em 2012 · Estado bom')
  })

  it('opens WhatsApp about this property in a new tab, safely', () => {
    const listing = makeListing()
    render(<ListingCard listing={listing} whatsappNumber="5548991802046" variant="landing" />)

    const link = screen.getByRole('link', { name: 'Falar no WhatsApp sobre Apartamento no Centro' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    const url = new URL(link.getAttribute('href')!)
    expect(url.origin + url.pathname).toBe('https://wa.me/5548991802046')
    expect(url.searchParams.get('text')).toContain(`(ref. ${listing.reference})`)
  })

  it('leaves out what the listing does not have', () => {
    const listing = makeListing({
      subtypeName: null,
      propertyType: 'rural',
      area: { value: 12, unit: 'ha' },
      bedrooms: null,
      suites: null,
      bathrooms: null,
      parkingSpaces: null,
      builtYear: null,
      conservationState: null,
    })
    render(<ListingCard listing={listing} whatsappNumber="5548991802046" variant="app" />)

    expect(screen.getByRole('heading', { level: 3, name: 'Rural no Centro' })).toBeInTheDocument()
    expect(within(screen.getByRole('list')).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['12 ha'])
    expect(screen.queryByText(/Construído/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Estado/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\/m²/)).not.toBeInTheDocument()
  })
})
