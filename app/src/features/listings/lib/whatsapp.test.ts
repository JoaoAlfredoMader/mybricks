import { describe, expect, it } from 'vitest'
import { makeListing } from '@/test/fake-api'
import { whatsappLink, whatsappMessage } from './whatsapp'

const listing = makeListing({ reference: 'AB12CD34', subtypeName: 'Apartamento', neighborhood: 'Centro', city: 'Florianópolis', state: 'SC' })

describe('WhatsApp link', () => {
  it('names the property, where it is and its reference', () => {
    expect(whatsappMessage(listing)).toBe(
      'Olá! Tenho interesse no imóvel "Apartamento no Centro" em Centro, Florianópolis/SC (ref. AB12CD34), anunciado na MyBricks.',
    )
  })

  it('opens a chat with the platform number, with the message encoded', () => {
    const url = new URL(whatsappLink('5548991802046', listing))
    expect(url.origin + url.pathname).toBe('https://wa.me/5548991802046')
    expect(url.searchParams.get('text')).toBe(whatsappMessage(listing))
    expect(whatsappLink('5548991802046', listing)).toContain('text=Ol%C3%A1!%20Tenho')
  })
})
