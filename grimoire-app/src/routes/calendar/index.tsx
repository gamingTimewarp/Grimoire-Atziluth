import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  getMoonPhase, getPlanetaryDayRuler, getWuxingPhase,
  getChineseZodiacYear,
  buildCalendarGrid, buildCalendarGridFromDates, toDateString, WEEKDAY_HEADERS,
} from '@/lib/astro-calc'
import {
  computeMonthAstroData, computeAstroDataForRange, getPlanetPositions, getAspects, formatLongitude, formatTime,
  getSignsForMode, getSunSignForMode, getSabbatsForYear,
  getRetrogradeStrip, getRetrogradeStationInfo,
} from '@/lib/astro-engine'
import type { MonthAstroData, PlanetPosition, Aspect, MoonEvent, Ingress, Sabbat, RetrogradeStripEntry } from '@/lib/astro-engine'
import { loadTraditionSettings } from '@/lib/tradition-store'
import { loadSettings, patchSettings } from '@/lib/settings-store'
import { listReadingsByMonth, listJournalEntriesByMonth } from '@/lib/reading-db'
import type { JournalEntry } from '@/lib/reading-db'
import type { Reading } from '@grimoire/core'
import { BUILT_IN_DECK_FILTERS } from '@/lib/built-in-data'
import { useSpreadById } from '@/lib/spread-hooks'
import { CALENDAR_TABS, getCalendarTab, GREGORIAN_MONTH_CANONICAL_NAMES } from '@/lib/calendar-systems'
import type { CalendarTabDefinition } from '@/lib/calendar-systems'
import { ChevronLeft, ChevronRight, BookOpen, PenLine, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export const Route = createFileRoute('/calendar/')({
  component: CalendarPage,
})

const deckNameById = new Map<string, string>()
for (const d of BUILT_IN_DECK_FILTERS) {
  deckNameById.set(d.id, d.displayName)
  for (const v of d.variants ?? []) {
    deckNameById.set(v.id, `${d.displayName} — ${v.label}`)
  }
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

// ─── Today cosmic info strip ──────────────────────────────────────────────────

function CosmicInfoStrip({ date, navigate }: { date: Date; navigate: ReturnType<typeof useNavigate> }) {
  const { astrologyMode } = loadTraditionSettings()
  const moon   = getMoonPhase(date)
  const ruler  = getPlanetaryDayRuler(date)
  const wuxing = getWuxingPhase(date)
  const sun    = getSunSignForMode(date, astrologyMode)
  const chineseAnimal = getChineseZodiacYear(date)

  const chip = (label: string, canonicalName: string, sub?: string) => (
    <span
      key={label}
      onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName } })}
      title={`View ${label} in Reference`}
      style={{
        display: 'inline-flex', alignItems: 'baseline', gap: '5px',
        padding: '4px 10px', background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)', borderRadius: '4px',
        fontSize: '13px', color: 'var(--color-text)', cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
    >
      {label}
      {sub && <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>{sub}</span>}
    </span>
  )

  return (
    <div style={{
      padding: '14px 18px', background: 'var(--color-surface-1)',
      border: '1px solid var(--color-border)', borderRadius: '8px', marginBottom: '24px',
    }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
        Today — {date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        {chip(`${ruler.symbol} ${ruler.name}`, ruler.canonicalName, 'Day Ruler')}
        {chip(`${moon.emoji} ${moon.name}`, moon.canonicalName, `${moon.illumination}%`)}
        {chip(`${sun.symbol} ${sun.name}`, sun.canonicalName, 'Sun')}
        {chip(`${wuxing.nameZh} ${wuxing.name}`, wuxing.canonicalName, wuxing.season)}
        {chineseAnimal && chip(`${chineseAnimal.emoji} ${chineseAnimal.chineseChar} ${chineseAnimal.name}`, chineseAnimal.canonicalName, 'Lunar Year')}
      </div>
    </div>
  )
}

// ─── Retrograde tracker strip ─────────────────────────────────────────────────

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

function RetrogradeToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Retrograde tracker</span>
      <span
        style={{
          width: '36px', height: '20px', borderRadius: '10px', padding: 0,
          background: on ? 'var(--color-accent)' : 'var(--color-border)', position: 'relative', flexShrink: 0,
          transition: 'background 0.15s', display: 'inline-block',
        }}
      >
        <span style={{
          width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
          position: 'absolute', top: '3px', left: on ? '19px' : '3px',
          transition: 'left 0.15s', display: 'block',
        }} />
      </span>
    </button>
  )
}

function RetrogradeSegment({ entry, date, color }: { entry: RetrogradeStripEntry; date: Date; color: string }) {
  const [title, setTitle] = useState<string | undefined>(
    entry.retrograde ? `${entry.planet.name} is in retrograde` : undefined
  )
  return (
    <div
      title={title}
      onMouseEnter={() => {
        if (!entry.retrograde || !entry.planet.body) return
        const info = getRetrogradeStationInfo(entry.planet.body, date)
        if (info) setTitle(`${entry.planet.name} is in retrograde, Day ${info.dayNumber} of ${info.totalDays}`)
      }}
      style={{ flex: 1, background: entry.retrograde ? color : 'transparent' }}
    />
  )
}

function RetrogradeStrip({ date }: { date: Date }) {
  const entries = getRetrogradeStrip(date)
  return (
    <div
      style={{
        width: '7px', flexShrink: 0, alignSelf: 'stretch',
        display: 'flex', flexDirection: 'column',
        border: '1px solid var(--color-border)', borderRadius: '3px', overflow: 'hidden',
      }}
    >
      {entries.map(entry => (
        <RetrogradeSegment
          key={entry.planet.canonicalName}
          entry={entry}
          date={date}
          color={RETROGRADE_COLORS[entry.planet.canonicalName] ?? 'var(--color-text-subtle)'}
        />
      ))}
    </div>
  )
}

// ─── Calendar grid ────────────────────────────────────────────────────────────

type DayEntries = { readings: Reading[]; entries: JournalEntry[] }

/** Given a real date, returns what to show as its day-of-month number and
 *  whether it belongs to the period currently being viewed (vs. leading/
 *  trailing padding from an adjacent period). Lets CalendarGrid render either
 *  the Gregorian month or a native calendar-system month (Hebrew, Islamic…). */
type DateLabeler = (date: Date) => { label: string | number; inPeriod: boolean }

function CalendarGrid({
  weeks, today, selectedDate, entriesByDate, astroByDate, sabbatsByDate, onDayClick, navigate, showRetrograde, labelForDate,
}: {
  weeks: Date[][]
  today: string
  selectedDate: string | null
  entriesByDate: Map<string, DayEntries>
  astroByDate: MonthAstroData['byDate'] | null
  sabbatsByDate: Map<string, Sabbat>
  onDayClick: (dateStr: string) => void
  navigate: ReturnType<typeof useNavigate>
  showRetrograde: boolean
  labelForDate: DateLabeler
}) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '4px', marginBottom: '4px' }}>
        {WEEKDAY_HEADERS.map(h => (
          <button
            key={h.label}
            onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: h.canonicalName } })}
            title={`View ${h.label}'s ruling planet in Reference`}
            style={{
              textAlign: 'center', padding: '6px 0', background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', borderRadius: '4px', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          >
            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', letterSpacing: '0.05em' }}>{h.label}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', opacity: 0.6 }}>{h.symbol}</div>
          </button>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '4px', marginBottom: '4px' }}>
          {week.map(date => {
            const ds = toDateString(date)
            const { label: dayLabel, inPeriod: isCurrentMonth } = labelForDate(date)
            const isToday    = ds === today
            const isSelected = ds === selectedDate
            const moon = getMoonPhase(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12))
            const dayEntries = entriesByDate.get(ds)
            const astroDay   = astroByDate?.get(ds)
            const hasReadings = (dayEntries?.readings.length ?? 0) > 0
            const hasJournal  = (dayEntries?.entries.length ?? 0) > 0
            // Use precise moon event from astro-engine if available, else approximate
            const preciseMoon = astroDay?.moonEvents[0]
            const sabbat = sabbatsByDate.get(ds)

            return (
              <div
                key={ds}
                onClick={() => onDayClick(ds)}
                style={{
                  minHeight: '80px', padding: '6px 8px', overflow: 'hidden',
                  background: isSelected ? 'var(--color-surface-3)' : isToday ? 'var(--color-surface-2)' : 'var(--color-surface-1)',
                  border: `1px solid ${isSelected || isToday ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
                  borderRadius: '6px', cursor: 'pointer',
                  opacity: isCurrentMonth ? 1 : 0.35,
                  transition: 'border-color 0.1s, background 0.1s',
                  display: 'flex', flexDirection: 'row', gap: '5px',
                  minWidth: 0,
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
                onMouseLeave={e => {
                  if (!isSelected && !isToday) e.currentTarget.style.borderColor = 'var(--color-border)'
                }}
              >
                {showRetrograde && <RetrogradeStrip date={date} />}

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {/* Row 1: day number + moon */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{
                      fontSize: '14px', fontWeight: isToday ? 600 : 400,
                      color: isToday ? 'var(--color-accent)' : isCurrentMonth ? 'var(--color-text)' : 'var(--color-text-subtle)',
                    }}>
                      {dayLabel}
                    </span>
                    <span
                      style={{ fontSize: moon.isMajor ? '13px' : '11px', opacity: moon.isMajor ? 0.9 : 0.4, lineHeight: 1 }}
                      title={preciseMoon ? `${preciseMoon.type} at ${formatTime(preciseMoon.time)}` : `${moon.name} (${moon.illumination}%)`}
                    >
                      {preciseMoon?.emoji ?? moon.emoji}
                    </span>
                  </div>

                  {/* Sabbat label */}
                  {sabbat && (
                    <div
                      onClick={e => { e.stopPropagation(); navigate({ to: '/reference/$canonicalName', params: { canonicalName: sabbat.canonicalName } }) }}
                      title={`${sabbat.name} — Sun at ${sabbat.sunLongitude}° — view in Reference`}
                      style={{ fontSize: '9px', color: 'var(--color-accent)', fontWeight: 500, letterSpacing: '0.04em', lineHeight: 1.2, marginTop: '1px', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {sabbat.emoji} {sabbat.name}
                    </div>
                  )}

                  {/* Row 2: ingress chips */}
                  {astroDay && astroDay.ingresses.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                      {astroDay.ingresses.map((ing, i) => (
                        <span
                          key={i}
                          title={`${ing.planet.name} enters ${ing.sign.name} at ${formatTime(ing.time)}`}
                          style={{
                            fontSize: '10px', lineHeight: 1.2,
                            color: 'var(--color-accent)', opacity: 0.85,
                          }}
                        >
                          {ing.planet.symbol}{ing.sign.symbol}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Row 3: entry dots */}
                  {(hasReadings || hasJournal) && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: 'auto' }}>
                      {hasReadings && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0 }} title={`${dayEntries!.readings.length} reading(s)`} />}
                      {hasJournal  && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-text-subtle)', flexShrink: 0 }} title={`${dayEntries!.entries.length} journal entry/entries`} />}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Transits panel (planet positions + aspects) ──────────────────────────────

const ASPECT_COLORS: Record<string, string> = {
  conjunction: 'var(--color-text)',
  sextile:     '#6ab0a8',
  square:      '#c44a4a',
  trine:       '#6aa86a',
  opposition:  '#c47a4a',
}

function TransitsPanel({
  dateStr, astroDay, navigate,
}: {
  dateStr: string
  astroDay: MonthAstroData['byDate'] extends Map<string, infer V> ? V : never
  navigate: ReturnType<typeof useNavigate>
}) {
  const date = new Date(dateStr.slice(0, 10) + 'T12:00:00')
  const { showNodes, activeTraditions, astrologyMode } = loadTraditionSettings()
  const showModernPlanets = activeTraditions.includes('tradition.modern-astrology')
  const signs = getSignsForMode(astrologyMode)
  const positions = useMemo(() => getPlanetPositions(date, astrologyMode, { showNodes, showModernPlanets }), [dateStr, astrologyMode])
  const aspects   = useMemo(() => getAspects(positions, date), [positions])
  const [showTable, setShowTable] = useState(false)

  return (
    <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Transits
        </span>
        <button
          onClick={() => setShowTable(s => !s)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--color-text-subtle)', padding: 0 }}
        >
          {showTable ? 'Hide positions' : 'Show positions'}
        </button>
      </div>

      {/* Moon events */}
      {astroDay.moonEvents.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          {astroDay.moonEvents.map((e, i) => (
            <span key={i} style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {e.emoji} <strong style={{ color: 'var(--color-text)' }}>{e.type.replace('-', ' ')}</strong> at {formatTime(e.time)}
            </span>
          ))}
        </div>
      )}

      {/* Ingresses */}
      {astroDay.ingresses.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          {astroDay.ingresses.map((ing, i) => (
            <span key={i} style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              <span
                onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: ing.planet.canonicalName } })}
                style={{ cursor: 'pointer', color: 'var(--color-accent)' }}
                title="View in Reference"
              >{ing.planet.symbol} {ing.planet.name}</span>
              {' enters '}
              <span
                onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: ing.sign.canonicalName } })}
                style={{ cursor: 'pointer', color: 'var(--color-accent)' }}
                title="View in Reference"
              >{ing.sign.symbol} {ing.sign.name}</span>
              {' at '}{formatTime(ing.time)}
            </span>
          ))}
        </div>
      )}

      {/* Planet positions table */}
      {showTable && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '2px 12px' }}>
            {positions.map(pos => (
              <React.Fragment key={pos.planet.name}>
                <span
                  onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: pos.planet.canonicalName } })}
                  style={{ fontSize: '13px', color: 'var(--color-text-subtle)', fontFamily: 'monospace', cursor: 'pointer' }}
                  title={`View ${pos.planet.name} in Reference`}
                >
                  {pos.planet.symbol}
                </span>
                <span
                  onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: signs[pos.signIndex]?.canonicalName ?? '' } })}
                  style={{ fontSize: '12px', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                  title="View sign in Reference"
                >
                  {formatLongitude(pos, astrologyMode)}
                </span>
                <span title={pos.retrograde ? 'Retrograde' : undefined} style={{ fontSize: '11px', color: 'var(--color-danger)', opacity: pos.retrograde ? 1 : 0 }}>℞</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Aspects */}
      {aspects.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {aspects.slice(0, 12).map((asp, i) => (
            <span
              key={i}
              style={{
                fontSize: '11px', padding: '2px 7px',
                background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
                borderRadius: '4px', color: ASPECT_COLORS[asp.type] ?? 'var(--color-text-muted)',
                whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '1px',
              }}
            >
              <span
                onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: asp.planet1.canonicalName } })}
                style={{ cursor: 'pointer' }} title={asp.planet1.name}
              >{asp.planet1.symbol}</span>
              <span
                onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: 'astrology.aspect.' + asp.type } })}
                style={{ margin: '0 2px', opacity: 0.7, cursor: 'pointer' }} title={asp.type}
              >{asp.symbol}</span>
              <span
                onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: asp.planet2.canonicalName } })}
                style={{ cursor: 'pointer' }} title={asp.planet2.name}
              >{asp.planet2.symbol}</span>
              <span style={{ marginLeft: '3px', opacity: 0.6, fontSize: '10px' }}>{asp.orb}°</span>
            </span>
          ))}
        </div>
      )}

      {aspects.length === 0 && !astroDay.moonEvents.length && !astroDay.ingresses.length && (
        <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>No major aspects or events today.</div>
      )}
    </div>
  )
}

// ─── Day detail panel ─────────────────────────────────────────────────────────

function DayDetail({
  dateStr, entries, astroDay, sabbat, navigate, nativeLabel,
}: {
  dateStr: string
  entries: DayEntries | undefined
  astroDay: MonthAstroData['byDate'] extends Map<string, infer V> ? V : never
  sabbat: Sabbat | undefined
  navigate: ReturnType<typeof useNavigate>
  /** e.g. "5 Iyar 5786" — shown alongside the Gregorian date on a native-calendar tab. */
  nativeLabel?: string
}) {
  const spreadById = useSpreadById()
  const date = new Date(dateStr.slice(0, 10) + 'T12:00:00')
  const { astrologyMode } = loadTraditionSettings()
  const moon   = getMoonPhase(date)
  const ruler  = getPlanetaryDayRuler(date)
  const sun    = getSunSignForMode(date, astrologyMode)
  const wuxing = getWuxingPhase(date)
  const gregorianLabel = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  // On a native-calendar tab, that calendar's own date is the point of the
  // view — it should read as the headline, with the Gregorian date as the
  // secondary cross-reference, not the other way around.
  const label = nativeLabel ?? gregorianLabel
  const secondaryLabel = nativeLabel ? gregorianLabel : undefined
  const readings = entries?.readings ?? []
  const journalEntries = entries?.entries ?? []

  const navLink = (text: string, cn: string) => (
    <span
      style={{ cursor: 'pointer', color: 'var(--color-text-muted)' }}
      onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })}
      title="View in Reference"
    >{text}</span>
  )

  return (
    <div style={{ marginTop: '20px', padding: '20px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
      {/* Day header */}
      <div style={{ marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '8px' }}>
          <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text)' }}>{label}</div>
          {secondaryLabel && (
            <span style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>{secondaryLabel}</span>
          )}
          {sabbat && (
            <span
              onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: sabbat.canonicalName } })}
              title="View in Reference"
              style={{ fontSize: '13px', color: 'var(--color-accent)', fontWeight: 400, cursor: 'pointer' }}
            >
              {sabbat.emoji} {sabbat.name}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '12px' }}>
          {navLink(`${ruler.symbol} ${ruler.name}`, ruler.canonicalName)}
          <span style={{ color: 'var(--color-border)' }}>·</span>
          {navLink(`${moon.emoji} ${moon.name} (${moon.illumination}%)`, moon.canonicalName)}
          <span style={{ color: 'var(--color-border)' }}>·</span>
          {navLink(`${sun.symbol} ${sun.name}`, sun.canonicalName)}
          <span style={{ color: 'var(--color-border)' }}>·</span>
          {navLink(`${wuxing.nameZh} ${wuxing.name}`, wuxing.canonicalName)}
        </div>
      </div>

      {/* Transits panel */}
      <TransitsPanel dateStr={dateStr} astroDay={astroDay} navigate={navigate} />

      {/* Journal/readings */}
      {(readings.length > 0 || journalEntries.length > 0) && (
        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--color-border)' }}>
          {readings.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Readings</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {readings.map(r => {
                  const spread = r.spreadId ? spreadById.get(r.spreadId) : null
                  const deckName = deckNameById.get(r.deckId) ?? r.deckId
                  return (
                    <div key={r.id} style={{ padding: '10px 14px', background: 'var(--color-surface-3)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <BookOpen size={12} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>{spread?.displayName ?? 'Free Reading'}</span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>· {deckName}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {[...r.cards].sort((a, b) => a.drawOrder - b.drawOrder).map((c, i) => (
                          <span key={i} onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: c.cardCanonicalName } })}
                            style={{ fontSize: '11px', padding: '2px 7px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '3px', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                            {c.cardCanonicalName.split('.').pop()?.replace(/-/g, ' ')}
                            {c.orientation === 'reversed' && <span style={{ color: 'var(--color-accent)', marginLeft: '2px' }}>↓</span>}
                          </span>
                        ))}
                      </div>
                      {r.notes && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px', lineHeight: '1.5' }}>{r.notes.slice(0, 200)}{r.notes.length > 200 ? '…' : ''}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {journalEntries.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Journal Entries</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {journalEntries.map(e => (
                  <div key={e.id} style={{ padding: '10px 14px', background: 'var(--color-surface-3)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: e.notes ? '6px' : 0 }}>
                      <PenLine size={12} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>{e.title ?? 'Journal Entry'}</span>
                    </div>
                    {e.notes && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>{e.notes.slice(0, 200)}{e.notes.length > 200 ? '…' : ''}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({
  activeTab, enabledTabs, onSelectTab, onOpenManage,
}: {
  activeTab: string
  enabledTabs: CalendarTabDefinition[]
  onSelectTab: (id: string) => void
  onOpenManage: () => void
}) {
  const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '6px 12px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer',
    border: `1px solid ${isActive ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
    background: isActive ? 'var(--color-surface-3)' : 'var(--color-surface-1)',
    color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
    fontFamily: 'inherit', whiteSpace: 'nowrap',
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
      <button style={tabButtonStyle(activeTab === 'gregorian')} onClick={() => onSelectTab('gregorian')}>
        Gregorian
      </button>
      {enabledTabs.map(tab => (
        <button key={tab.id} style={tabButtonStyle(activeTab === tab.id)} onClick={() => onSelectTab(tab.id)}>
          {tab.emoji} {tab.tabLabel}
        </button>
      ))}
      <button
        onClick={onOpenManage}
        title="Manage calendar tabs"
        style={{
          display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px',
          padding: '6px 8px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer',
          border: '1px solid transparent', background: 'none', color: 'var(--color-text-subtle)',
          fontFamily: 'inherit',
        }}
      >
        <Settings2 size={14} />
      </button>
    </div>
  )
}

// ─── Gregorian calendar view ──────────────────────────────────────────────────

const EMPTY_ASTRO_DAY: { moonEvents: MoonEvent[]; ingresses: Ingress[] } = { moonEvents: [], ingresses: [] }

function GregorianCalendarView({ navigate, today }: { navigate: ReturnType<typeof useNavigate>; today: string }) {
  const [year, setYear]   = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState<string | null>(today)
  const [monthReadings, setMonthReadings] = useState<Reading[]>([])
  const [monthEntries,  setMonthEntries]  = useState<JournalEntry[]>([])
  const [monthAstro,    setMonthAstro]    = useState<MonthAstroData | null>(null)
  const [showRetrograde, setShowRetrograde] = useState(() => loadSettings().showRetrogradeTracker)

  // Sabbats keyed by date string YYYY-MM-DD (computed per year)
  const sabbatsByDate = useMemo(() => {
    const map = new Map<string, Sabbat>()
    try {
      for (const s of getSabbatsForYear(year)) {
        const ds = toDateString(s.time)
        map.set(ds, s)
      }
    } catch { /* silently skip */ }
    return map
  }, [year])

  useEffect(() => {
    Promise.all([
      listReadingsByMonth(year, month),
      listJournalEntriesByMonth(year, month),
    ]).then(([readings, entries]) => {
      setMonthReadings(readings)
      setMonthEntries(entries)
    }).catch(console.error)

    // Compute astro data after render (synchronous but ~30ms)
    const { astrologyMode } = loadTraditionSettings()
    const id = setTimeout(() => setMonthAstro(computeMonthAstroData(year, month, astrologyMode)), 0)
    return () => clearTimeout(id)
  }, [year, month])

  const entriesByDate = useMemo(() => {
    const map = new Map<string, DayEntries>()
    for (const r of monthReadings) {
      const ds = r.readingDate.slice(0, 10)
      const ex = map.get(ds) ?? { readings: [], entries: [] }
      ex.readings.push(r); map.set(ds, ex)
    }
    for (const e of monthEntries) {
      const ds = e.entryDate.slice(0, 10)
      const ex = map.get(ds) ?? { readings: [], entries: [] }
      ex.entries.push(e); map.set(ds, ex)
    }
    return map
  }, [monthReadings, monthEntries])

  const weeks = useMemo(() => buildCalendarGrid(year, month), [year, month])
  const currentMonthStr = `${year}-${String(month).padStart(2, '0')}`
  const labelForDate = useCallback<DateLabeler>(
    date => ({ label: date.getDate(), inPeriod: toDateString(date).startsWith(currentMonthStr) }),
    [currentMonthStr],
  )

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }
  const goToToday = () => { const n = new Date(); setYear(n.getFullYear()); setMonth(n.getMonth() + 1); setSelectedDate(today) }
  const isViewingCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth() + 1
  const toggleRetrograde = () => {
    setShowRetrograde(v => {
      const next = !v
      patchSettings({ showRetrogradeTracker: next })
      return next
    })
  }

  const selectedAstroDay = selectedDate
    ? (monthAstro?.byDate.get(selectedDate) ?? EMPTY_ASTRO_DAY)
    : EMPTY_ASTRO_DAY

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '16px' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px', display: 'flex', flexShrink: 0 }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: GREGORIAN_MONTH_CANONICAL_NAMES[month - 1] as string } })}
            title={`View ${MONTH_NAMES[month - 1]} in Reference`}
            style={{ fontSize: '16px', fontWeight: 400, color: 'var(--color-text)', textAlign: 'center', cursor: 'pointer' }}
          >
            {MONTH_NAMES[month - 1]} {year}
          </span>
          {!isViewingCurrentMonth && <Button variant="ghost" size="sm" onClick={goToToday}>Today</Button>}
        </div>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px', display: 'flex', flexShrink: 0 }}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <RetrogradeToggle on={showRetrograde} onToggle={toggleRetrograde} />
      </div>

      <CalendarGrid
        weeks={weeks} today={today}
        selectedDate={selectedDate}
        entriesByDate={entriesByDate}
        astroByDate={monthAstro?.byDate ?? null}
        sabbatsByDate={sabbatsByDate}
        onDayClick={setSelectedDate}
        navigate={navigate}
        showRetrograde={showRetrograde}
        labelForDate={labelForDate}
      />

      {selectedDate && (
        <DayDetail
          dateStr={selectedDate}
          entries={entriesByDate.get(selectedDate)}
          astroDay={selectedAstroDay}
          sabbat={sabbatsByDate.get(selectedDate)}
          navigate={navigate}
        />
      )}
    </div>
  )
}

// ─── Native calendar-system view (Hebrew, Islamic, …) ─────────────────────────

function addDays(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)
}

/** Every distinct (year, month) Gregorian pair a real-date range spans, used
 *  to fetch readings/journal entries (whose queries are Gregorian-month-based)
 *  for a native calendar month that may straddle two Gregorian months. */
function monthsSpanned(start: Date, end: Date): Array<{ year: number; month: number }> {
  const out: Array<{ year: number; month: number }> = []
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cursor.getTime() <= last.getTime()) {
    out.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 })
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }
  return out
}

function TraditionCalendarView({
  tab, navigate, today, todayDate,
}: {
  tab: CalendarTabDefinition
  navigate: ReturnType<typeof useNavigate>
  today: string
  todayDate: Date
}) {
  const { system } = tab
  const todayNative = useMemo(() => system.fromGregorian(todayDate), [system, todayDate])
  const [nativeYear, setNativeYear] = useState(todayNative.year)
  const [nativeMonth, setNativeMonth] = useState(todayNative.month)
  // Some systems (Chinese) reuse a leap month's predecessor's number — this
  // disambiguates which of the two (regular vs. leap) is being viewed.
  const [nativeIsLeap, setNativeIsLeap] = useState(!!todayNative.isLeapMonth)
  const [selectedDate, setSelectedDate] = useState<string | null>(today)
  const [monthReadings, setMonthReadings] = useState<Reading[]>([])
  const [monthEntries,  setMonthEntries]  = useState<JournalEntry[]>([])
  const [monthAstro,    setMonthAstro]    = useState<MonthAstroData | null>(null)
  const [showRetrograde, setShowRetrograde] = useState(() => loadSettings().showRetrogradeTracker)

  const daysInMonth  = system.daysInMonth(nativeYear, nativeMonth, nativeIsLeap)
  const firstOfMonth = useMemo(() => system.toGregorian({ year: nativeYear, month: nativeMonth, day: 1, isLeapMonth: nativeIsLeap }), [system, nativeYear, nativeMonth, nativeIsLeap])
  const lastOfMonth  = useMemo(() => system.toGregorian({ year: nativeYear, month: nativeMonth, day: daysInMonth, isLeapMonth: nativeIsLeap }), [system, nativeYear, nativeMonth, nativeIsLeap, daysInMonth])
  const monthLabel   = system.monthName(nativeYear, nativeMonth, nativeIsLeap)

  const sabbatsByDate = useMemo(() => {
    const map = new Map<string, Sabbat>()
    try {
      for (const y of new Set([firstOfMonth.getFullYear(), lastOfMonth.getFullYear()])) {
        for (const s of getSabbatsForYear(y)) map.set(toDateString(s.time), s)
      }
    } catch { /* silently skip */ }
    return map
  }, [firstOfMonth, lastOfMonth])

  useEffect(() => {
    const spans = monthsSpanned(firstOfMonth, lastOfMonth)
    Promise.all([
      Promise.all(spans.map(s => listReadingsByMonth(s.year, s.month))).then(rs => rs.flat()),
      Promise.all(spans.map(s => listJournalEntriesByMonth(s.year, s.month))).then(es => es.flat()),
    ]).then(([readings, entries]) => {
      setMonthReadings(readings)
      setMonthEntries(entries)
    }).catch(console.error)

    const { astrologyMode } = loadTraditionSettings()
    const rangeEnd = addDays(lastOfMonth, 1)
    const id = setTimeout(() => setMonthAstro(computeAstroDataForRange(firstOfMonth, rangeEnd, astrologyMode)), 0)
    return () => clearTimeout(id)
  }, [firstOfMonth, lastOfMonth])

  const entriesByDate = useMemo(() => {
    const map = new Map<string, DayEntries>()
    for (const r of monthReadings) {
      const ds = r.readingDate.slice(0, 10)
      const ex = map.get(ds) ?? { readings: [], entries: [] }
      ex.readings.push(r); map.set(ds, ex)
    }
    for (const e of monthEntries) {
      const ds = e.entryDate.slice(0, 10)
      const ex = map.get(ds) ?? { readings: [], entries: [] }
      ex.entries.push(e); map.set(ds, ex)
    }
    return map
  }, [monthReadings, monthEntries])

  const weeks = useMemo(() => {
    const startPad = firstOfMonth.getDay()
    const days: Date[] = []
    for (let i = startPad - 1; i >= 0; i--) days.push(addDays(firstOfMonth, -i - 1))
    let cursor = firstOfMonth
    for (let i = 0; i < daysInMonth; i++) {
      days.push(cursor)
      cursor = addDays(cursor, 1)
    }
    return buildCalendarGridFromDates(days)
  }, [firstOfMonth, daysInMonth])

  const labelForDate = useCallback<DateLabeler>(
    date => {
      const cd = system.fromGregorian(date)
      return { label: cd.day, inPeriod: cd.year === nativeYear && cd.month === nativeMonth && !!cd.isLeapMonth === nativeIsLeap }
    },
    [system, nativeYear, nativeMonth, nativeIsLeap],
  )

  const prevMonth = () => {
    const prev = system.addMonths({ year: nativeYear, month: nativeMonth, isLeapMonth: nativeIsLeap }, -1)
    setNativeYear(prev.year); setNativeMonth(prev.month); setNativeIsLeap(!!prev.isLeapMonth)
  }
  const nextMonth = () => {
    const next = system.addMonths({ year: nativeYear, month: nativeMonth, isLeapMonth: nativeIsLeap }, 1)
    setNativeYear(next.year); setNativeMonth(next.month); setNativeIsLeap(!!next.isLeapMonth)
  }
  const goToToday = () => {
    setNativeYear(todayNative.year); setNativeMonth(todayNative.month); setNativeIsLeap(!!todayNative.isLeapMonth)
    setSelectedDate(today)
  }
  const isViewingCurrentMonth = nativeYear === todayNative.year && nativeMonth === todayNative.month && nativeIsLeap === !!todayNative.isLeapMonth
  const toggleRetrograde = () => {
    setShowRetrograde(v => {
      const next = !v
      patchSettings({ showRetrogradeTracker: next })
      return next
    })
  }

  const selectedAstroDay = selectedDate
    ? (monthAstro?.byDate.get(selectedDate) ?? EMPTY_ASTRO_DAY)
    : EMPTY_ASTRO_DAY
  const selectedNativeLabel = selectedDate
    ? (() => {
        const cd = system.fromGregorian(new Date(selectedDate.slice(0, 10) + 'T12:00:00'))
        return `${cd.day} ${cd.monthName} ${cd.year}${cd.era ? ' ' + cd.era : ''}`
      })()
    : undefined

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '16px' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px', display: 'flex', flexShrink: 0 }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: tab.monthCanonicalNames[nativeMonth - 1] as string } })}
            title={`View ${monthLabel} in Reference`}
            style={{ fontSize: '16px', fontWeight: 400, color: 'var(--color-text)', textAlign: 'center', cursor: 'pointer' }}
          >
            {monthLabel} {nativeYear}
          </span>
          {!isViewingCurrentMonth && <Button variant="ghost" size="sm" onClick={goToToday}>Today</Button>}
        </div>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px', display: 'flex', flexShrink: 0 }}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <RetrogradeToggle on={showRetrograde} onToggle={toggleRetrograde} />
      </div>

      <CalendarGrid
        weeks={weeks} today={today}
        selectedDate={selectedDate}
        entriesByDate={entriesByDate}
        astroByDate={monthAstro?.byDate ?? null}
        sabbatsByDate={sabbatsByDate}
        onDayClick={setSelectedDate}
        navigate={navigate}
        showRetrograde={showRetrograde}
        labelForDate={labelForDate}
      />

      {selectedDate && (
        <DayDetail
          dateStr={selectedDate}
          entries={entriesByDate.get(selectedDate)}
          astroDay={selectedAstroDay}
          sabbat={sabbatsByDate.get(selectedDate)}
          navigate={navigate}
          nativeLabel={selectedNativeLabel}
        />
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function CalendarPage() {
  const navigate = useNavigate()
  const today     = useMemo(() => toDateString(new Date()), [])
  const todayDate = useMemo(() => new Date(), [])

  const [enabledSystems, setEnabledSystems] = useState(() => loadSettings().enabledCalendarSystems)
  const [activeTab, setActiveTab] = useState<string>('gregorian')

  const enabledTabs = useMemo(
    () => CALENDAR_TABS.filter(t => enabledSystems.includes(t.id)),
    [enabledSystems],
  )

  // If the active tab gets disabled (e.g. via the manage panel), fall back to Gregorian.
  useEffect(() => {
    if (activeTab !== 'gregorian' && !enabledSystems.includes(activeTab)) {
      setActiveTab('gregorian')
    }
  }, [activeTab, enabledSystems])

  const toggleCalendarSystem = (id: string) => {
    setEnabledSystems(current => {
      const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id]
      patchSettings({ enabledCalendarSystems: next })
      return next
    })
  }

  const [showManage, setShowManage] = useState(false)
  const activeTabDef = activeTab === 'gregorian' ? null : getCalendarTab(activeTab)

  return (
    <div style={{ maxWidth: '860px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Calendar</h1>
      </div>

      <CosmicInfoStrip date={todayDate} navigate={navigate} />

      <TabBar
        activeTab={activeTab}
        enabledTabs={enabledTabs}
        onSelectTab={setActiveTab}
        onOpenManage={() => setShowManage(s => !s)}
      />

      {showManage && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px',
          padding: '14px 16px', background: 'var(--color-surface-1)', border: '1px solid var(--color-border)', borderRadius: '8px',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Calendar tabs
          </div>
          {CALENDAR_TABS.map(tab => (
            <label key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text)' }}>
              <input
                type="checkbox"
                checked={enabledSystems.includes(tab.id)}
                onChange={() => toggleCalendarSystem(tab.id)}
              />
              {tab.emoji} {tab.tabLabel}
            </label>
          ))}
        </div>
      )}

      {activeTab === 'gregorian' && <GregorianCalendarView navigate={navigate} today={today} />}
      {activeTabDef && <TraditionCalendarView key={activeTabDef.id} tab={activeTabDef} navigate={navigate} today={today} todayDate={todayDate} />}
    </div>
  )
}
