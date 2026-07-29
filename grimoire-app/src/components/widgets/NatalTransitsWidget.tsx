/**
 * NatalTransitsWidget.tsx
 * Current transit aspects to your saved "Self" natal chart, if one exists.
 * Renders nothing at all (not even an empty-state card) when no Self chart
 * is saved, regardless of the widget's own visibility toggle.
 *
 * The "find Self chart -> build both charts -> diff aspects" orchestration
 * here is the same ~15 lines already duplicated inline in astrology/index.tsx,
 * journal/index.tsx, and astrology/animate.tsx (CurrentSkyPanel and friends).
 * Deliberately not extracted into a shared lib helper for those three to
 * also use — natal-db.ts (a pure DB-persistence file with no astro-engine/
 * settings-store imports today) isn't a clean fit, and touching those three
 * working call sites is a separate refactor, not part of adding this widget.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { listNatalCharts } from '@/lib/natal-db'
import { getNatalChart, getTransitAspects } from '@/lib/astro-engine'
import type { TransitAspect } from '@/lib/astro-engine'
import { getEffectiveDate, getHomeLocation } from '@/lib/settings-store'
import { zonedTimeToUtc } from '@/lib/timezone'
import { loadTraditionSettings } from '@/lib/tradition-store'

const ASPECT_COLORS: Record<string, string> = {
  conjunction: 'var(--color-text)',
  sextile:     '#6ab0a8',
  square:      '#c44a4a',
  trine:       '#6aa86a',
  opposition:  '#c47a4a',
}

export function NatalTransitsWidget() {
  const navigate = useNavigate()
  const [hasSelf, setHasSelf] = useState<boolean | null>(null)
  const [aspects, setAspects] = useState<TransitAspect[]>([])

  useEffect(() => {
    listNatalCharts().then(records => {
      const self = records.find(r => r.isSelf)
      if (!self) { setHasSelf(false); return }
      setHasSelf(true)

      const { astrologyMode, houseSystem, showNodes, activeTraditions } = loadTraditionSettings()
      const showModernPlanets = activeTraditions.includes('tradition.modern-astrology')
      const birthDate = zonedTimeToUtc(self.birthDate, self.birthTime ?? '12:00', self.birthTimezone)
      const selfChart = getNatalChart(birthDate, self.birthLat ?? 0, self.birthLon ?? 0, houseSystem, astrologyMode, { showNodes, showModernPlanets })

      const now = getEffectiveDate()
      const loc = getHomeLocation()
      const currentChart = getNatalChart(now, loc?.lat ?? 0, loc?.lon ?? 0, houseSystem, astrologyMode, { showNodes, showModernPlanets })
      setAspects(getTransitAspects(currentChart.planets, selfChart.planets, now))
    }).catch(() => setHasSelf(false))
  }, [])

  if (!hasSelf) return null

  return (
    <WidgetCard
      title="Natal Transits"
      action={
        <button
          onClick={() => navigate({ to: '/astrology' })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: 'var(--color-text-subtle)', padding: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
        >
          Full page <ChevronRight size={12} />
        </button>
      }
    >
      {aspects.length === 0 ? (
        <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>No major transit aspects at the moment.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {aspects.slice(0, 5).map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <span style={{ color: ASPECT_COLORS[a.type] ?? 'var(--color-text-muted)' }}>{a.symbol}</span>
              <span style={{ color: 'var(--color-text)' }}>
                {a.transitPlanet.name} {a.type} {a.natalPlanet.name}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginLeft: 'auto' }}>{a.orb.toFixed(1)}°</span>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  )
}
