/** The MyBricks mark: three courses of bricks. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <g fill="currentColor">
        <rect x="4" y="7" width="11" height="5" rx="1.2" />
        <rect x="17" y="7" width="11" height="5" rx="1.2" />
        <rect x="4" y="14" width="5" height="5" rx="1.2" />
        <rect x="11" y="14" width="10" height="5" rx="1.2" />
        <rect x="23" y="14" width="5" height="5" rx="1.2" />
        <rect x="4" y="21" width="11" height="5" rx="1.2" />
        <rect x="17" y="21" width="11" height="5" rx="1.2" />
      </g>
    </svg>
  )
}
