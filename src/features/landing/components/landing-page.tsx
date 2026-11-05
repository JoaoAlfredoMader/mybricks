import '@fontsource-variable/archivo/standard.css'
import '@fontsource-variable/bricolage-grotesque/standard.css'
import '../landing.css'
import { useRef } from 'react'
import { ListingsShowcase } from '@/features/listings/components/listings-showcase'
import { useScene } from '../hooks/use-scene'
import { Hero } from './hero'
import { LandingFooter, Story } from './story'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function LandingPage() {
  const { scene, toggleScene } = useScene()
  const storyRef = useRef<HTMLElement>(null)

  function readStory() {
    storyRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  return (
    <div className="landing min-h-svh" data-scene={scene}>
      <Hero scene={scene} onToggleScene={toggleScene} onReadStory={readStory} />
      <main>
        <Story ref={storyRef} />
        <ListingsShowcase variant="landing" />
      </main>
      <LandingFooter />
    </div>
  )
}
