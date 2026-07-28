/**
 * EntityLink.tsx
 * A plain inline link to an entity's Reference page — the shared version of
 * the `navigate({ to: '/reference/$canonicalName', params: { canonicalName } })`
 * one-liner duplicated across the app (calendar/moon.tsx, qabalah/gematria.tsx,
 * read/draw.tsx, journal, etc.). Stops propagation so it's safe to nest inside
 * other clickable rows/cards.
 */

import type { CSSProperties, ReactNode, MouseEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'

export function EntityLink({
  canonicalName,
  children,
  style,
  title,
}: {
  canonicalName: string
  children: ReactNode
  style?: CSSProperties
  title?: string
}) {
  const navigate = useNavigate()

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    navigate({ to: '/reference/$canonicalName', params: { canonicalName } })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={title ?? canonicalName}
      style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        color: 'inherit', font: 'inherit', textAlign: 'left',
        textDecoration: 'underline', textDecorationColor: 'var(--color-border)',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
