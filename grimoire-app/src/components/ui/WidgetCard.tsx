/**
 * WidgetCard.tsx
 * Shared "titled box" wrapper for Home page widgets — bordered card, title
 * row with an optional right-side action slot (e.g. a "view full page"
 * link). Supersedes the Home page's old HomeSection, which had no real card
 * chrome of its own; modeled closest on calendar/moon.tsx's Panel, the only
 * one of the app's three ad-hoc "titled box" components with both a border
 * and a header action slot.
 */

import type { ReactNode } from 'react'

export function WidgetCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ marginBottom: '20px', padding: '16px 18px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
