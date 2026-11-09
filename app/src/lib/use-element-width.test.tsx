import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useElementWidth } from './use-element-width'

function Box({ initial }: { initial?: number }) {
  const { ref, width } = useElementWidth(initial)
  return (
    <div ref={ref} data-testid="box">
      {width}
    </div>
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('useElementWidth', () => {
  it('uses the initial width where nothing can measure (the tests, old browsers)', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    render(<Box initial={500} />)
    expect(screen.getByTestId('box')).toHaveTextContent('500')
  })

  it('starts at 720 when no initial width is given', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    render(<Box />)
    expect(screen.getByTestId('box')).toHaveTextContent('720')
  })

  it('follows the box as it is resized, rounded, and lets go when unmounted', () => {
    let notify: ResizeObserverCallback = () => {}
    const disconnect = vi.fn()
    const observe = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          notify = callback
        }
        observe = observe
        disconnect = disconnect
      },
    )
    const { unmount } = render(<Box />)
    expect(observe).toHaveBeenCalledWith(screen.getByTestId('box'))

    act(() => notify([{ contentRect: { width: 612.6 } } as ResizeObserverEntry], {} as ResizeObserver))
    expect(screen.getByTestId('box')).toHaveTextContent('613')

    // An empty notification changes nothing.
    act(() => notify([], {} as ResizeObserver))
    expect(screen.getByTestId('box')).toHaveTextContent('613')

    unmount()
    expect(disconnect).toHaveBeenCalledOnce()
  })
})
