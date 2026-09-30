/**
 * LocationInput.tsx
 * City-search geocoder + coordinate override input.
 *
 * Priority order (matching spec):
 *   1. Manual coordinate entry  — always available, always takes final effect
 *   2. City search              — populates all fields from offline city database
 *
 * The database is loaded lazily on first render and cached globally by geocoder.ts.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { searchCities, prefetchGeodata } from '@/lib/geocoder'
import type { CityResult } from '@/lib/geocoder'
import {
  isValidIanaZone, isManualTimezone, formatUtcOffset, WELL_KNOWN_UTC_OFFSETS, DST_RULE_PRESETS,
  parseManualTimezone, serializeManualTimezone,
  type ManualTimezone, type DstTransitionRule,
} from '@/lib/timezone'

export interface LocationValue {
  label:    string
  lat:      string   // string so partial/empty input is representable
  lon:      string
  timezone: string
}

export interface LocationInputProps {
  value:    LocationValue
  onChange: (v: LocationValue) => void
  /** Passed to the coordinate input fields */
  inputStyle?: React.CSSProperties
}

const FIELD_LABEL: React.CSSProperties = {
  display: 'block', fontSize: '11px', color: 'var(--color-text-subtle)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px',
}

export function LocationInput({ value, onChange, inputStyle }: LocationInputProps) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<CityResult[]>([])
  const [active,  setActive]  = useState(-1)   // keyboard-highlighted result index
  const [busy,    setBusy]    = useState(false) // debounced search in flight
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listRef   = useRef<HTMLDivElement>(null)

  // Kick off the database prefetch immediately on mount
  useEffect(() => { prefetchGeodata() }, [])

  // Debounced search
  const handleQueryChange = useCallback((q: string) => {
    setQuery(q)
    setActive(-1)
    if (debounce.current) clearTimeout(debounce.current)
    if (q.trim().length < 3) { setResults([]); return }
    setBusy(true)
    debounce.current = setTimeout(async () => {
      const r = await searchCities(q)
      setResults(r)
      setBusy(false)
    }, 200)
  }, [])

  const selectCity = useCallback((city: CityResult) => {
    const label = [city.displayName, city.admin1, city.country].filter(Boolean).join(', ')
    onChange({
      label,
      lat:      city.lat.toString(),
      lon:      city.lon.toString(),
      timezone: city.timezone,
    })
    setQuery('')
    setResults([])
    setActive(-1)
  }, [onChange])

  const clearAll = () => {
    onChange({ label: '', lat: '', lon: '', timezone: '' })
    setQuery('')
    setResults([])
  }

  // Keyboard navigation in results
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && active >= 0) { e.preventDefault(); selectCity(results[active]) }
    if (e.key === 'Escape') { setResults([]); setActive(-1) }
  }

  const hasCoords = value.lat !== '' || value.lon !== ''

  const baseInput: React.CSSProperties = {
    width: '100%', padding: '8px 12px',
    background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
    borderRadius: '6px', color: 'var(--color-text)', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box', colorScheme: 'dark',
    ...inputStyle,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* ── City search ──────────────────────────────────────────────────── */}
      <div>
        <label style={FIELD_LABEL}>Search City</label>
        <div style={{ position: 'relative' }}>
          <input
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => { setResults([]); setActive(-1) }, 150)}
            placeholder="Type 3+ characters…"
            autoComplete="off"
            style={baseInput}
          />
          {busy && (
            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--color-text-subtle)' }}>
              …
            </span>
          )}

          {/* Results dropdown */}
          {results.length > 0 && (
            <div
              ref={listRef}
              style={{
                position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, zIndex: 50,
                background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
                borderRadius: '6px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {results.map((city, i) => {
                const sub = [city.admin1, city.country].filter(Boolean).join(', ')
                return (
                  <div
                    key={`${city.lat},${city.lon}`}
                    onMouseDown={() => selectCity(city)}
                    style={{
                      padding: '8px 12px', cursor: 'pointer',
                      background: i === active ? 'var(--color-surface-2)' : 'transparent',
                      borderBottom: i < results.length - 1 ? '1px solid var(--color-border)' : 'none',
                    }}
                    onMouseEnter={() => setActive(i)}
                  >
                    <div style={{ fontSize: '13px', color: 'var(--color-text)' }}>{city.displayName}</div>
                    {sub && <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '1px' }}>{sub}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Location label (auto-filled, editable) ──────────────────────── */}
      <div>
        <label style={FIELD_LABEL}>Location Label</label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            value={value.label}
            onChange={e => onChange({ ...value, label: e.target.value })}
            placeholder="e.g. Paris, Île-de-France, France"
            style={baseInput}
          />
          {(value.label || hasCoords) && (
            <button
              onClick={clearAll}
              title="Clear location"
              style={{
                flexShrink: 0, padding: '0 10px',
                background: 'none', border: '1px solid var(--color-border)',
                borderRadius: '6px', color: 'var(--color-text-subtle)',
                cursor: 'pointer', fontSize: '14px',
              }}
            >×</button>
          )}
        </div>
      </div>

      {/* ── Coordinates ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={FIELD_LABEL}>Latitude</label>
          <input
            value={value.lat}
            onChange={e => onChange({ ...value, lat: e.target.value })}
            placeholder="e.g. 48.857"
            style={baseInput}
          />
        </div>
        <div>
          <label style={FIELD_LABEL}>Longitude</label>
          <input
            value={value.lon}
            onChange={e => onChange({ ...value, lon: e.target.value })}
            placeholder="e.g. 2.352"
            style={baseInput}
          />
        </div>
      </div>

      {/* ── Timezone ────────────────────────────────────────────────────── */}
      <TimezoneField
        timezone={value.timezone}
        onChange={tz => onChange({ ...value, timezone: tz })}
        baseInput={baseInput}
      />
    </div>
  )
}

// ─── Timezone field (IANA text entry, or advanced fixed-offset/DST mode) ─────

const WEEK_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '1st' }, { value: 2, label: '2nd' }, { value: 3, label: '3rd' },
  { value: 4, label: '4th' }, { value: 5, label: 'Last' },
]
const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DEFAULT_DST_RULE: ManualTimezone['dst'] = {
  offsetMinutes: 60,
  start: { month: 3, week: 2, weekday: 0, minuteOfDay: 120 },
  end: { month: 11, week: 1, weekday: 0, minuteOfDay: 120 },
}

function minuteOfDayToTimeInput(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
function timeInputToMinuteOfDay(s: string): number {
  const [h, m] = s.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

const smallSelect: React.CSSProperties = {
  padding: '6px 8px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
  borderRadius: '6px', color: 'var(--color-text)', fontSize: '13px', outline: 'none', colorScheme: 'dark',
}
const linkButton: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
  color: 'var(--color-accent)', fontSize: '11px', fontFamily: 'inherit', textDecoration: 'underline',
}

function TransitionRuleRow({ rule, onChange }: { rule: DstTransitionRule; onChange: (r: DstTransitionRule) => void }) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      <select style={smallSelect} value={rule.week} onChange={e => onChange({ ...rule, week: Number(e.target.value) })}>
        {WEEK_OPTIONS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
      </select>
      <select style={smallSelect} value={rule.weekday} onChange={e => onChange({ ...rule, weekday: Number(e.target.value) })}>
        {WEEKDAY_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
      </select>
      <span style={{ fontSize: '13px', color: 'var(--color-text-subtle)', alignSelf: 'center' }}>in</span>
      <select style={smallSelect} value={rule.month} onChange={e => onChange({ ...rule, month: Number(e.target.value) })}>
        {MONTH_LABELS.map((mo, i) => <option key={i} value={i + 1}>{mo}</option>)}
      </select>
      <span style={{ fontSize: '13px', color: 'var(--color-text-subtle)', alignSelf: 'center' }}>at</span>
      <input
        type="time"
        value={minuteOfDayToTimeInput(rule.minuteOfDay)}
        onChange={e => onChange({ ...rule, minuteOfDay: timeInputToMinuteOfDay(e.target.value) })}
        style={smallSelect}
      />
    </div>
  )
}

function TimezoneField({
  timezone, onChange, baseInput,
}: {
  timezone: string
  onChange: (tz: string) => void
  baseInput: React.CSSProperties
}) {
  const advanced = isManualTimezone(timezone)
  const manual = advanced ? parseManualTimezone(timezone) : null
  const invalid = !advanced && timezone.trim() !== '' && !isValidIanaZone(timezone.trim())

  const setManual = (next: ManualTimezone) => onChange(serializeManualTimezone(next))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <label style={FIELD_LABEL}>{advanced ? 'Timezone (advanced: fixed offset)' : 'Timezone (IANA)'}</label>
        <button
          type="button"
          style={linkButton}
          onClick={() => onChange(advanced ? '' : serializeManualTimezone({ baseOffsetMinutes: 0, dst: null }))}
        >
          {advanced ? 'Switch to automatic (timezone name)' : 'Advanced: use a fixed offset instead'}
        </button>
      </div>

      {!advanced && (
        <>
          <input
            value={timezone}
            onChange={e => onChange(e.target.value)}
            placeholder="e.g. Europe/Paris"
            style={{ ...baseInput, ...(invalid ? { borderColor: 'var(--color-danger, #c44)' } : {}) }}
          />
          {invalid && (
            <div style={{ fontSize: '11px', color: 'var(--color-danger, #c44)', marginTop: '4px' }}>
              Not a recognized IANA timezone (e.g. "Europe/Paris", "America/Chicago"). Leave blank to use the
              viewing device's own timezone, or switch to advanced mode to enter a fixed offset instead.
            </div>
          )}
        </>
      )}

      {advanced && manual && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', background: 'var(--color-surface-2)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>

          {/* Base UTC offset */}
          <div>
            <label style={FIELD_LABEL}>UTC Offset {manual.dst ? '(standard time)' : ''}</label>
            <select
              style={{ ...baseInput, cursor: 'pointer', colorScheme: 'dark' }}
              value={manual.baseOffsetMinutes}
              onChange={e => setManual({ ...manual, baseOffsetMinutes: Number(e.target.value) })}
            >
              {WELL_KNOWN_UTC_OFFSETS.map(m => <option key={m} value={m}>{formatUtcOffset(m)}</option>)}
            </select>
          </div>

          {/* DST toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!manual.dst}
              onChange={e => setManual({ ...manual, dst: e.target.checked ? DEFAULT_DST_RULE : null })}
            />
            Observes Daylight Saving Time
          </label>

          {manual.dst && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '4px', borderLeft: '2px solid var(--color-border)' }}>

              {/* Presets */}
              <div>
                <label style={FIELD_LABEL}>Preset (fills in the fields below — all editable)</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {Object.entries(DST_RULE_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      title={preset.note}
                      onClick={() => setManual({
                        ...manual,
                        dst: { offsetMinutes: preset.dstOffsetMinutes, start: preset.start, end: preset.end },
                      })}
                      style={{
                        padding: '4px 10px', fontSize: '12px', cursor: 'pointer',
                        background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
                        borderRadius: '4px', color: 'var(--color-text)', fontFamily: 'inherit',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* DST amount */}
              <div>
                <label style={FIELD_LABEL}>Clocks move forward by (minutes)</label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={manual.dst.offsetMinutes}
                  onChange={e => setManual({ ...manual, dst: { ...manual.dst!, offsetMinutes: Number(e.target.value) || 0 } })}
                  style={{ ...baseInput, width: '100px' }}
                />
              </div>

              {/* Start / End transitions */}
              <div>
                <label style={FIELD_LABEL}>DST Starts (clocks spring forward)</label>
                <TransitionRuleRow
                  rule={manual.dst.start}
                  onChange={r => setManual({ ...manual, dst: { ...manual.dst!, start: r } })}
                />
              </div>
              <div>
                <label style={FIELD_LABEL}>DST Ends (clocks fall back)</label>
                <TransitionRuleRow
                  rule={manual.dst.end}
                  onChange={r => setManual({ ...manual, dst: { ...manual.dst!, end: r } })}
                />
              </div>

              <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>
                Presets are civil-law approximations for the rare case an IANA timezone doesn't already cover this
                location correctly — prefer automatic mode above whenever it applies.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
