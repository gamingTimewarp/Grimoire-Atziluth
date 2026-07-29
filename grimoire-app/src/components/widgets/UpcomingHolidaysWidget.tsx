/**
 * UpcomingHolidaysWidget.tsx
 * Next few Sabbats and calendar.holiday entries (Twelve Nights, Hanukkah,
 * Navratri, etc.), merged and sorted by date. Both getSabbatsForYear and
 * getHolidaysForYear are whole-year, sorted-by-time arrays with no
 * "upcoming" filter of their own (confirmed absent elsewhere in the
 * codebase) — this widget is exactly that trivial glue: fetch this year
 * (and next year's, near the boundary, so the list doesn't go empty in
 * December), filter to future, merge, sort, take the first few.
 */

import { useNavigate } from '@tanstack/react-router'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { getSabbatsForYear } from '@/lib/astro-engine'
import { getHolidaysForYear } from '@/lib/holiday-engine'

const MAX_SHOWN = 4

export interface UpcomingEntry {
  canonicalName: string
  name: string
  emoji: string
  time: Date
}

export function getUpcoming(now: Date): UpcomingEntry[] {
  const year = now.getFullYear()
  const years = now.getMonth() >= 10 ? [year, year + 1] : [year] // Nov/Dec: also pull next year

  const entries: UpcomingEntry[] = []
  for (const y of years) {
    for (const s of getSabbatsForYear(y)) entries.push({ canonicalName: s.canonicalName, name: s.name, emoji: s.emoji, time: s.time })
    for (const h of getHolidaysForYear(y)) {
      if (h.dayIndex !== 1) continue // only the start of each holiday, not every day of a multi-day span
      entries.push({ canonicalName: h.canonicalName, name: h.name, emoji: h.emoji, time: h.time })
    }
  }

  return entries
    .filter(e => e.time >= now)
    .sort((a, b) => a.time.getTime() - b.time.getTime())
    .slice(0, MAX_SHOWN)
}

export function UpcomingHolidaysWidget() {
  const navigate = useNavigate()
  const upcoming = getUpcoming(new Date())

  return (
    <WidgetCard title="Upcoming">
      {upcoming.length === 0 ? (
        <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Nothing upcoming.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {upcoming.map(e => (
            <button
              key={e.canonicalName + e.time.toISOString()}
              onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: e.canonicalName } })}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 12px', background: 'var(--color-surface-3)',
                border: '1px solid var(--color-border)', borderRadius: '6px',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%',
              }}
            >
              <span style={{ fontSize: '15px' }}>{e.emoji}</span>
              <span style={{ fontSize: '13px', color: 'var(--color-text)', flex: 1 }}>{e.name}</span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                {e.time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </button>
          ))}
        </div>
      )}
    </WidgetCard>
  )
}
