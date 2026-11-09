import { useState } from 'react'

export type Scene = 'day' | 'night'

export const SCENE_STORAGE_KEY = 'mybricks:landing-scene'

function readStoredScene(): Scene | null {
  try {
    const value = window.localStorage.getItem(SCENE_STORAGE_KEY)
    return value === 'day' || value === 'night' ? value : null
  } catch {
    return null
  }
}

function storeScene(scene: Scene) {
  try {
    window.localStorage.setItem(SCENE_STORAGE_KEY, scene)
  } catch {
    // Storage can be blocked (private mode); the choice just isn't remembered.
  }
}

function preferredScene(): Scene {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day'
}

/** Day or night for the landing scene: the visitor's last choice, else the OS preference. */
export function useScene() {
  const [scene, setScene] = useState<Scene>(() => readStoredScene() ?? preferredScene())

  function toggleScene() {
    const next = scene === 'day' ? 'night' : 'day'
    setScene(next)
    storeScene(next)
  }

  return { scene, toggleScene }
}
