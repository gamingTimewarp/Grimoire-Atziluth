/**
 * CollapsibleSection.tsx
 * Small collapsible block: a chevron + uppercase label header that toggles its
 * body. Pulled out once the astrology chart detail page needed the same
 * chevron-header pattern already used by the reference page's Section and by
 * AspectsPanel for a fifth time (Positions, Lots, Houses, Asteroids, Mutual
 * Reception) — past the point where re-inlining it again was worth it.
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export function CollapsibleSection({ header, defaultOpen = true, children }: {
  /** Header content — usually the label text plus any inline badges/icons (day-night
   * marker, info link, etc). Rendered next to the chevron, not inside a button of
   * its own, so any interactive elements inside it still need their own click
   * handlers to stop propagation if they shouldn't also toggle the section. */
  header: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div>
      <div
        role="button" tabIndex={0}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: isOpen ? '8px' : 0, cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setIsOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(o => !o) } }}
        aria-expanded={isOpen}
      >
        {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {header}
        </div>
      </div>
      {isOpen && children}
    </div>
  )
}
