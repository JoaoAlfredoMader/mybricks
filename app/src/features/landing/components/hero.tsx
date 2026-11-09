import { Link } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import type { Scene } from '../hooks/use-scene'
import { PhotoScene } from './scene/photo-scene'
import { SceneToggle } from './scene-toggle'

interface HeroProps {
  scene: Scene
  onToggleScene: () => void
  onReadStory: () => void
}

export function Hero({ scene, onToggleScene, onReadStory }: HeroProps) {
  return (
    <section className="relative h-svh min-h-[34rem] overflow-hidden" aria-labelledby="hero-title">
      <PhotoScene scene={scene} />
      <h1 id="hero-title" className="hero-title">
        MyBricks
      </h1>
      <div className="hero-frame" />

      <header className="absolute inset-x-(--frame-inset) top-(--frame-inset) flex items-center justify-between p-3 sm:p-5">
        <Link to="/" className="rounded-full text-white" aria-label="MyBricks, início">
          <BrandMark className="size-9 drop-shadow" />
        </Link>
        <div className="flex items-center gap-2">
          <SceneToggle scene={scene} onToggle={onToggleScene} />
          <Link
            to="/login"
            className="inline-flex h-11 items-center rounded-full bg-(--ink) px-6 font-semibold text-(--paper) transition-colors"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* Sits on the frame's bottom edge. */}
      <div className="hero-more absolute inset-x-0 bottom-(--frame-bottom) flex translate-y-1/2 justify-center">
        <button
          type="button"
          onClick={onReadStory}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-(--ink) pr-4 pl-6 font-semibold text-(--paper) shadow-lg"
        >
          Sobre
          <ChevronDown aria-hidden="true" className="size-5" />
        </button>
      </div>
    </section>
  )
}
