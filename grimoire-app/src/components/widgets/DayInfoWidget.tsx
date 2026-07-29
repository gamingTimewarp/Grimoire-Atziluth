/**
 * DayInfoWidget.tsx
 * Converted from the old Home page's DailyContextRow (index.tsx) — same
 * chip row (day ruler, moon phase, sun sign, wuxing phase, void-of-course),
 * now wrapped in WidgetCard instead of a bare margin div.
 */

import { useNavigate } from '@tanstack/react-router'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { getMoonPhase, getPlanetaryDayRuler, getWuxingPhase } from '@/lib/astro-calc'
import { getSunSignForMode, getVoidOfCourseMoon } from '@/lib/astro-engine'
import { loadTraditionSettings } from '@/lib/tradition-store'

export function DayInfoWidget() {
  const navigate = useNavigate()
  const date = new Date()
  const { astrologyMode } = loadTraditionSettings()
  const moon   = getMoonPhase(date)
  const ruler  = getPlanetaryDayRuler(date)
  const sun    = getSunSignForMode(date, astrologyMode)
  const wuxing = getWuxingPhase(date)
  const voc    = getVoidOfCourseMoon(date)

  const chip = (label: string, sub: string, cn?: string) => {
    const inner = (
      <>
        <div style={{ fontSize: '16px', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{sub}</div>
      </>
    )
    const sharedStyle = {
      padding: '10px 14px', background: 'var(--color-surface-3)',
      border: '1px solid var(--color-border)', borderRadius: '6px',
      flex: '1 1 100px', transition: 'border-color 0.15s',
    }
    if (cn) {
      return (
        <button
          key={label}
          type="button"
          onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })}
          style={{ ...sharedStyle, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'block' }}
          onMouseEnter={e => { (e.currentTarget).style.borderColor = 'var(--color-accent-muted)' }}
          onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--color-border)' }}
        >
          {inner}
        </button>
      )
    }
    return <div key={label} style={{ ...sharedStyle, cursor: 'default' }}>{inner}</div>
  }

  return (
    <WidgetCard title="Today">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {chip(`${ruler.symbol} ${ruler.name}`, 'Day ruler', ruler.canonicalName)}
        {chip(`${moon.emoji} ${moon.name}`, `${moon.illumination}% illuminated`, moon.canonicalName)}
        {chip(`${sun.symbol} ${sun.name}`, 'Sun sign', sun.canonicalName)}
        {chip(`${wuxing.nameZh} ${wuxing.name}`, wuxing.season + ' season', wuxing.canonicalName)}
        {voc.isVoid && chip('☽ v/c', `${voc.degreesRemaining.toFixed(1)}° to ingress`)}
      </div>
    </WidgetCard>
  )
}
