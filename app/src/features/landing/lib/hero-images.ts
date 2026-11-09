import manifest from '../assets/hero/manifest.json'

export type HeroScene = 'day' | 'night'

// Built by `npm run hero:images`: <scene>-<width>.webp next to manifest.json.
const FILES = import.meta.glob<string>('../assets/hero/*.webp', { eager: true, query: '?url', import: 'default' })

function fileUrl(scene: HeroScene, width: number) {
  const url = FILES[`../assets/hero/${scene}-${width}.webp`]
  if (!url) throw new Error(`Missing hero image ${scene}-${width}.webp; run npm run hero:images`)
  return url
}

export const HERO_ASPECT = manifest.width / manifest.height

/** `src` (the largest file) and `srcSet` for one of the renders. */
export function heroImage(scene: HeroScene) {
  return {
    src: fileUrl(scene, Math.max(...manifest.widths)),
    srcSet: manifest.widths.map((width) => `${fileUrl(scene, width)} ${width}w`).join(', '),
  }
}
