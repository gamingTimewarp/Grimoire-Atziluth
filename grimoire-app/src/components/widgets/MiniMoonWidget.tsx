/**
 * MiniMoonWidget.tsx
 * At-a-glance current Moon phase, with a link through to the full Moon
 * calendar page for more detail (phases, size/brightness, position,
 * aspects, eclipses, full moon names).
 */

import { useNavigate } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { getMoonPhase } from '@/lib/astro-calc'

export function MiniMoonWidget() {
  const navigate = useNavigate()
  const moon = getMoonPhase(new Date())

  return (
    <WidgetCard
      title="Moon"
      action={
        <button
          onClick={() => navigate({ to: '/calendar/moon' })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: 'var(--color-text-subtle)', padding: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
        >
          Full page <ChevronRight size={12} />
        </button>
      }
    >
      <div
        onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: moon.canonicalName } })}
        style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
        title="View in Reference"
      >
        <div style={{ fontSize: '32px', lineHeight: 1 }}>{moon.emoji}</div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>{moon.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{moon.illumination}% illuminated</div>
        </div>
      </div>
    </WidgetCard>
  )
}
