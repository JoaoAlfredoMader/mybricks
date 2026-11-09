import type { Scene } from '../../hooks/use-scene'
import { HERO_ASPECT, heroImage } from '../../lib/hero-images'
import { seeded } from '../../lib/seeded'

// The image covers the hero, so it is drawn at least as wide as the viewport
// and as tall as it: whichever is larger decides the file the browser picks.
const SIZES = `max(100vw, calc(100svh * ${HERO_ASPECT.toFixed(3)}))`

const TWINKLES = (() => {
  const random = seeded(5)
  return Array.from({ length: 22 }, () => ({
    left: `${(random() * 100).toFixed(2)}%`,
    top: `${(random() * 28).toFixed(2)}%`,
    delay: `${Math.round(random() * 4000)}ms`,
  }))
})()

interface PhotoSceneProps {
  scene: Scene
}

/** The day and night renders stacked; night is revealed over day when the scene changes. */
export function PhotoScene({ scene }: PhotoSceneProps) {
  return (
    <div className="scene-photo" aria-hidden="true">
      <img
        className="scene-photo-day"
        {...heroImage('day')}
        sizes={SIZES}
        alt=""
        fetchPriority={scene === 'day' ? 'high' : 'low'}
        decoding="async"
      />
      <img
        className="scene-photo-night"
        {...heroImage('night')}
        sizes={SIZES}
        alt=""
        fetchPriority={scene === 'night' ? 'high' : 'low'}
        decoding="async"
      />
      <div className="twinkles">
        {TWINKLES.map((star) => (
          <span key={`${star.left}-${star.top}`} style={{ left: star.left, top: star.top, animationDelay: star.delay }} />
        ))}
      </div>
    </div>
  )
}
