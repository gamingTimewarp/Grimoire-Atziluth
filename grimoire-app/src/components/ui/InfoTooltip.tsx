/**
 * InfoTooltip.tsx
 * Wraps a trigger element with a small explainer tooltip that works on both
 * hover (desktop) and tap (touch/mobile) — a plain `title` attribute is
 * hover-only and unreliable-to-absent on touch devices, which has bitten this
 * app before. Tapping toggles the tooltip open; tapping anywhere else closes
 * it, since touch has no hover-out equivalent to rely on.
 */

import { useEffect, useRef, useState } from 'react'

export function InfoTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  // Touch/click-outside dismissal — hover has mouseleave, tap has nothing
  // equivalent, so the open tooltip needs an explicit way to close again.
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [open])

  return (
    <span
      ref={ref}
      role="button" tabIndex={0}
      aria-label={text}
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) } }}
    >
      {children}
      {open && (
        <span style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '6px', zIndex: 20,
          background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
          borderRadius: '6px', padding: '8px 10px', fontSize: '11px', lineHeight: '1.5',
          color: 'var(--color-text)', width: 'max-content', maxWidth: '260px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>
          {text}
        </span>
      )}
    </span>
  )
}
