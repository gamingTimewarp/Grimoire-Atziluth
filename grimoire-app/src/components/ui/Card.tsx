import type { CSSProperties, ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  style?: CSSProperties
  onClick?: () => void
  selected?: boolean
  /** Accessible label — required when the card contains no readable text (e.g. icon-only). */
  ariaLabel?: string
}

const BASE_STYLE: CSSProperties = {
  background: 'var(--color-surface-2)',
  borderRadius: '8px',
  padding: '16px',
  transition: 'border-color 0.15s, background 0.15s',
}

export function Card({ children, style, onClick, selected, ariaLabel }: CardProps) {
  const borderColor = selected ? 'var(--color-accent)' : 'var(--color-border)'
  const outline     = selected ? '1px solid var(--color-accent)' : undefined

  const sharedStyle: CSSProperties = {
    ...BASE_STYLE,
    border: `1px solid ${borderColor}`,
    outline,
    ...style,
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        aria-label={ariaLabel}
        style={{
          ...sharedStyle,
          cursor: 'pointer',
          // Reset button chrome
          fontFamily: 'inherit',
          fontSize: 'inherit',
          textAlign: 'left',
          width: '100%',
          display: 'block',
        }}
        onMouseEnter={e => { (e.currentTarget.style.background = 'var(--color-surface-3)') }}
        onMouseLeave={e => { (e.currentTarget.style.background = 'var(--color-surface-2)') }}
      >
        {children}
      </button>
    )
  }

  return (
    <div style={{ ...sharedStyle, cursor: 'default' }}>
      {children}
    </div>
  )
}

/** Placeholder card art for Phase 3 — TODO: replace in Polish Phase. */
export function CardArtPlaceholder({
  label,
  width = 120,
  height = 200,
}: {
  label: string
  width?: number
  height?: number
}) {
  return (
    <div
      style={{
        width,
        height,
        background: 'var(--color-surface-3)',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px',
      }}
    >
      <div style={{ fontSize: '32px', opacity: 0.4 }}>✦</div>
      <div
        style={{
          fontSize: '11px',
          color: 'var(--color-text-muted)',
          textAlign: 'center',
          lineHeight: '1.3',
          wordBreak: 'break-word',
        }}
      >
        {label}
      </div>
    </div>
  )
}
