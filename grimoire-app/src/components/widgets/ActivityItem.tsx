/**
 * ActivityItem.tsx
 * Shared clickable row used by TodaysActivityWidget and BookmarksWidget —
 * moved out of the old Home page (index.tsx) unchanged.
 */

import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

export function ActivityItem({ icon, label, sub, onClick }: {
  icon: ReactNode
  label: string
  sub?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px', background: 'var(--color-surface-3)',
        border: '1px solid var(--color-border)', borderRadius: '6px',
        cursor: 'pointer', transition: 'border-color 0.15s',
        width: '100%', fontFamily: 'inherit', textAlign: 'left',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
    >
      <span style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>{label}</span>
      {sub && <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginLeft: '4px' }}>{sub}</span>}
      <ChevronRight size={13} style={{ color: 'var(--color-text-subtle)', marginLeft: 'auto', flexShrink: 0 }} />
    </button>
  )
}
