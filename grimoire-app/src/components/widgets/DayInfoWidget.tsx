/**
 * DayInfoWidget.tsx
 * Converted from the old Home page's DailyContextRow (index.tsx) — same
 * chip row (day ruler, moon phase, sun sign, wuxing phase, void-of-course),
 * now wrapped in WidgetCard instead of a bare margin div.
 */

import { useNavigate } from '@tanstack/react-router'
import { Info } from 'lucide-react'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { getMoonPhase, getPlanetaryDayRuler, getWuxingPhase } from '@/lib/astro-calc'
import { getSunSignForMode, getVoidOfCourseMoon } from '@/lib/astro-engine'
import { getHolidaysForYear } from '@/lib/holiday-engine'
import { loadTraditionSettings } from '@/lib/tradition-store'

function getTodaysHolidays(date: Date) {
  return getHolidaysForYear(date.getFullYear()).filter(h =>
    h.time.getFullYear() === date.getFullYear() &&
    h.time.getMonth() === date.getMonth() &&
    h.time.getDate() === date.getDate()
  )
}

export function DayInfoWidget() {
  const navigate = useNavigate()
  const date = new Date()
  const { astrologyMode } = loadTraditionSettings()
  const moon     = getMoonPhase(date)
  const ruler    = getPlanetaryDayRuler(date)
  const sun      = getSunSignForMode(date, astrologyMode)
  const wuxing   = getWuxingPhase(date)
  const voc      = getVoidOfCourseMoon(date)
  const holidays = getTodaysHolidays(date)

  const chip = (label: string, sub: string, cn?: string, opts?: { info?: string; onClick?: () => void }) => {
    const inner = (
      <>
        <div style={{ fontSize: '16px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>{label}</span>
          {opts?.info && <Info size={11} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{sub}</div>
      </>
    )
    const sharedStyle = {
      padding: '10px 14px', background: 'var(--color-surface-3)',
      border: '1px solid var(--color-border)', borderRadius: '6px',
      flex: '1 1 100px', transition: 'border-color 0.15s',
    }
    const handleClick = opts?.onClick ?? (cn ? () => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } }) : undefined)
    if (handleClick) {
      return (
        <button
          key={label}
          type="button"
          title={opts?.info}
          onClick={handleClick}
          style={{ ...sharedStyle, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'block' }}
          onMouseEnter={e => { (e.currentTarget).style.borderColor = 'var(--color-accent-muted)' }}
          onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--color-border)' }}
        >
          {inner}
        </button>
      )
    }
    return <div key={label} title={opts?.info} style={{ ...sharedStyle, cursor: 'default' }}>{inner}</div>
  }

  return (
    <WidgetCard title="Today">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {chip(`${ruler.symbol} ${ruler.name}`, 'Day ruler', ruler.canonicalName)}
        {chip(`${moon.emoji} ${moon.name}`, `${moon.illumination}% illuminated`, moon.canonicalName)}
        {chip(`${sun.symbol} ${sun.name}`, 'Sun sign', sun.canonicalName)}
        {chip(`${wuxing.nameZh} ${wuxing.name}`, wuxing.season + ' season', wuxing.canonicalName)}
        {voc.isVoid && chip(
          '☽ v/c',
          `${voc.degreesRemaining.toFixed(1)}° to ingress`,
          undefined,
          {
            info: "Void-of-course: the Moon won't make any more major aspects before entering its next sign. Traditionally considered a poor time to start new ventures — plans made now are prone to fizzling or going nowhere.",
            onClick: () => navigate({ to: '/calendar/moon' }),
          }
        )}
        {holidays.map(h => chip(
          `${h.emoji} ${h.name}`,
          h.durationDays > 1 ? `Day ${h.dayIndex} of ${h.durationDays}` : 'Today',
          h.canonicalName
        ))}
      </div>
    </WidgetCard>
  )
}
