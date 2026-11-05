import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import type { Listing } from '../api/queries'
import { ListingCard } from './listing-card'

interface ListingsCarouselProps {
  listings: Listing[]
  whatsappNumber: string
  variant: 'app' | 'landing'
  /** Names the carousel for screen readers. */
  label: string
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const BUTTON =
  'flex size-10 items-center justify-center rounded-full border border-current/20 transition-colors enabled:hover:bg-current/8 disabled:opacity-35'

/** Cards in a row that snaps as it scrolls, with previous and next buttons and no autoplay. Nothing to show renders nothing. */
export function ListingsCarousel({ listings, whatsappNumber, variant, label }: ListingsCarouselProps) {
  const track = useRef<HTMLUListElement>(null)
  const [edges, setEdges] = useState({ overflowing: false, atStart: true, atEnd: true })

  const measure = useCallback(() => {
    const element = track.current
    if (!element) return
    const { scrollLeft, clientWidth, scrollWidth } = element
    setEdges({
      overflowing: scrollWidth > clientWidth + 1,
      atStart: scrollLeft <= 1,
      atEnd: scrollLeft + clientWidth >= scrollWidth - 1,
    })
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure, listings.length])

  if (listings.length === 0) return null

  function page(direction: 1 | -1) {
    const element = track.current
    if (!element) return
    element.scrollBy({ left: direction * element.clientWidth * 0.9, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      page(1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      page(-1)
    }
  }

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label}>
      {edges.overflowing && (
        <div className="mb-4 flex justify-end gap-2">
          <button type="button" className={BUTTON} aria-label="Anteriores" disabled={edges.atStart} onClick={() => page(-1)}>
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button type="button" className={BUTTON} aria-label="Próximos" disabled={edges.atEnd} onClick={() => page(1)}>
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      )}
      {/* The list scrolls, so it takes the keyboard: arrows move it, Tab still reaches each WhatsApp link. */}
      <ul
        ref={track}
        tabIndex={0}
        aria-label={`${label}, em ordem`}
        onScroll={measure}
        onKeyDown={onKeyDown}
        className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:thin] motion-safe:scroll-smooth"
      >
        {listings.map((listing, index) => (
          <li
            key={listing.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} de ${listings.length}`}
            className="flex w-[17rem] shrink-0 snap-start flex-col sm:w-72"
          >
            <ListingCard listing={listing} whatsappNumber={whatsappNumber} variant={variant} className="flex-1" />
          </li>
        ))}
      </ul>
    </div>
  )
}
