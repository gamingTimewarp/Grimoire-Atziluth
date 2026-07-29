/**
 * RetrogradeWidget.tsx
 * At-a-glance list of currently retrograde planets — same underlying data
 * (getRetrogradeStrip) as the Calendar page's retrograde tracker, rendered
 * as a small standalone list rather than the calendar's per-day strip
 * (which needs a date range and tap-tooltip wiring this widget doesn't).
 */

import { useNavigate } from '@tanstack/react-router'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { getRetrogradeStrip } from '@/lib/astro-engine'

const RETROGRADE_COLORS: Record<string, string> = {
  'astrology.planet.mercury': '#d98a3d',
  'astrology.planet.venus':   '#5fae6f',
  'astrology.planet.mars':    '#c0504d',
  'astrology.planet.jupiter': '#4f7cc4',
  'astrology.planet.saturn':  '#8b6f47',
  'astrology.planet.uranus':  '#46b8b0',
  'astrology.planet.neptune': '#7b6fc4',
  'astrology.planet.pluto':   '#7a3b52',
}

export function RetrogradeWidget() {
  const navigate = useNavigate()
  const entries = getRetrogradeStrip(new Date()).filter(e => e.retrograde)

  return (
    <WidgetCard title="Retrograde">
      {entries.length === 0 ? (
        <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>No planets currently retrograde.</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {entries.map(e => (
            <button
              key={e.planet.canonicalName}
              onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: e.planet.canonicalName } })}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 12px', background: 'var(--color-surface-3)',
                border: `1px solid ${RETROGRADE_COLORS[e.planet.canonicalName] ?? 'var(--color-border)'}`,
                borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: '15px', color: RETROGRADE_COLORS[e.planet.canonicalName] ?? 'var(--color-text)' }}>{e.planet.symbol}</span>
              <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>{e.planet.name}</span>
            </button>
          ))}
        </div>
      )}
    </WidgetCard>
  )
}
