import { useEffect, useRef, useState } from 'react'

/**
 * The width of the box an element sits in, followed as the window or the layout changes. `initial` is
 * what is used until it is measured, and wherever there is no `ResizeObserver` (the tests).
 */
export function useElementWidth(initial = 720) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(initial)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => entry && setWidth(Math.round(entry.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}
