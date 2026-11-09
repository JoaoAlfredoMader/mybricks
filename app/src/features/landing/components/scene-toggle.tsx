import { Moon, Sun } from 'lucide-react'
import type { Scene } from '../hooks/use-scene'

interface SceneToggleProps {
  scene: Scene
  onToggle: () => void
}

export function SceneToggle({ scene, onToggle }: SceneToggleProps) {
  const isNight = scene === 'night'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isNight}
      aria-label="Modo noturno"
      title={isNight ? 'Voltar para o dia' : 'Ver à noite'}
      className="grid size-11 place-items-center rounded-full bg-(--card) text-(--ink) shadow-sm backdrop-blur transition-colors"
    >
      {isNight ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  )
}
