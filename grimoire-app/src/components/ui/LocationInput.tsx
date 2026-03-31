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
    outline: 'none', boxSizing: 'border-box',
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
      <div>
        <label style={FIELD_LABEL}>Timezone (IANA)</label>
        <input
          value={value.timezone}
          onChange={e => onChange({ ...value, timezone: e.target.value })}
          placeholder="e.g. Europe/Paris"
          style={baseInput}
        />
      </div>
    </div>
  )
}
