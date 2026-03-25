/**
 * WheelChart.tsx
 * SVG natal chart wheel: zodiac ring → house ring → planet glyphs → aspect lines.
 * Layout: Ascendant fixed at 9 o'clock (left). Ecliptic increases counter-clockwise.
 */

import React, { useState, useEffect } from 'react'
import type { NatalChartData, PlanetPosition, Aspect, LotPosition } from '@/lib/astro-engine'
import { getSignsForMode, IAU_BOUNDARIES } from '@/lib/astro-engine'
import type { AstrologyMode } from '@/lib/astro-engine'

const TRANSIT_COLOR = '#c4a44a'
const R_TRANSIT_PLANET = 168

// ─── Geometry helpers ─────────────────────────────────────────────────────────

const CX = 250
const CY = 250

// Radii
const R_ZODIAC_OUTER = 238
const R_ZODIAC_INNER = 196
const R_HOUSE_OUTER  = 196
const R_HOUSE_INNER  = 174
const R_PLANET       = 155
const R_ASPECT       = 110
const R_CENTER_TEXT  = 60

/** Convert ecliptic longitude + ascendant to SVG polar angle (0=right, CW).
 *  Ascendant → 180° (left/9-o'clock). Ecliptic CCW = decreasing SVG angle. */
function lonToSvgAngle(lon: number, asc: number): number {
  return ((180 - (lon - asc)) % 360 + 360) % 360
}

function polar(angleDeg: number, r: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)]
}

/** SVG arc sector path between two ecliptic longitudes at given radii. */
function arcSector(lon1: number, lon2: number, r1: number, r2: number, asc: number): string {
  const a1 = lonToSvgAngle(lon1, asc)
  const a2 = lonToSvgAngle(lon2, asc)
  const [ox1, oy1] = polar(a1, r1)
  const [ox2, oy2] = polar(a2, r1)
  const [ix2, iy2] = polar(a2, r2)
  const [ix1, iy1] = polar(a1, r2)
  // 30° arc, always small (< 180°), outer CCW (sweep=0), inner CW (sweep=1)
  return `M ${ox1} ${oy1} A ${r1} ${r1} 0 0 0 ${ox2} ${oy2} L ${ix2} ${iy2} A ${r2} ${r2} 0 0 1 ${ix1} ${iy1} Z`
}

/** Tick line between two radii at a given longitude. */
function tickLine(lon: number, r1: number, r2: number, asc: number): string {
  const a = lonToSvgAngle(lon, asc)
  const [x1, y1] = polar(a, r1)
  const [x2, y2] = polar(a, r2)
  return `M ${x1} ${y1} L ${x2} ${y2}`
}

// ─── Colour constants ─────────────────────────────────────────────────────────

const SIGN_ELEMENT_COLORS = [
  '#c44a4a', '#6aa86a', '#6ab0a8', '#6a86a8',  // Aries Fire, Taurus Earth, Gemini Air, Cancer Water
  '#c44a4a', '#6aa86a', '#6ab0a8', '#6a86a8',  // Leo, Virgo, Libra, Scorpio
  '#c44a4a', '#6aa86a', '#6ab0a8', '#6a86a8',  // Sagittarius, Capricorn, Aquarius, Pisces
]

// IAU: 13 signs; Ophiuchus at index 8 is water-adjacent (#8a7ab0 = serpent/purple)
const SIGN_ELEMENT_COLORS_IAU = [
  '#c44a4a', '#6aa86a', '#6ab0a8', '#6a86a8',  // Aries, Taurus, Gemini, Cancer
  '#c44a4a', '#6aa86a', '#6ab0a8', '#6a86a8',  // Leo, Virgo, Libra, Scorpius
  '#8a7ab0',                                     // Ophiuchus
  '#c44a4a', '#6aa86a', '#6ab0a8', '#6a86a8',  // Sagittarius, Capricorn, Aquarius, Pisces
]

// Pre-computed IAU ring segments: [startLon, endLon] for each sign (in IAU order)
const IAU_RING_SEGMENTS: [number, number][] = IAU_BOUNDARIES.map(([start], i) => {
  const end = i + 1 < IAU_BOUNDARIES.length ? IAU_BOUNDARIES[i + 1][0] : 360 + IAU_BOUNDARIES[0][0]
  return [start, end]
})

const ASPECT_COLORS: Record<string, string> = {
  conjunction: '#c8b46e',
  sextile:     '#6ab0a8',
  square:      '#c44a4a',
  trine:       '#6aa86a',
  opposition:  '#c47a4a',
}

// ─── Main component ───────────────────────────────────────────────────────────

export type WheelChartProps = {
  chart: NatalChartData
  transitChart?: NatalChartData
  size?: number
  mode?: AstrologyMode
  onNavigate?: (canonicalName: string) => void
  /** Called whenever the hovered element key changes (or clears). Use to render the
   *  tooltip externally (e.g. outside the wheel container). */
  onHoverChange?: (key: string | null) => void
  /** Set to false to suppress the built-in inline tooltip. Default: true. */
  showTooltip?: boolean
}

const HOUSE_NAMES = [
  'House of Self',        'House of Possessions',  'House of Communication',
  'House of Home',        'House of Creativity',   'House of Health',
  'House of Partnership', 'House of Transformation','House of Philosophy',
  'House of Career',      'House of Community',    'House of Spirituality',
]

const SIGN_ELEMENTS = ['Fire','Earth','Air','Water','Fire','Earth','Air','Water','Fire','Earth','Air','Water']
const SIGN_ELEMENTS_IAU = ['Fire','Earth','Air','Water','Fire','Earth','Air','Water','Serpent-bearer','Fire','Earth','Air','Water']

const LOT_COLOR = 'var(--color-accent)'

export function WheelChart({ chart, transitChart, size = 500, mode = 'tropical', onNavigate, onHoverChange, showTooltip = true }: WheelChartProps) {
  const { planets, houses, aspects, lots } = chart
  const asc = houses.ascendant
  // hovered: 'n:PlanetName', 't:PlanetName', 'l:LotCanonicalName', 's:signIndex', 'h:houseIndex'
  const [hovered, setHovered] = useState<string | null>(null)
  const [showNatal,    setShowNatal]    = useState(true)
  const [showTransits, setShowTransits] = useState(true)
  const [showLots,     setShowLots]     = useState(true)

  useEffect(() => { onHoverChange?.(hovered) }, [hovered])

  const scale = size / 500

  return (
    <div style={{ position: 'relative', width: size, flexShrink: 0 }}>
      <svg
        viewBox="0 0 500 500"
        width={size}
        height={size}
        style={{ display: 'block' }}
      >
        {/* ── Background ── */}
        <circle cx={CX} cy={CY} r={R_ZODIAC_OUTER} fill="var(--color-surface-1)" stroke="var(--color-border)" strokeWidth="1" />

        {/* ── Zodiac sign ring ── */}
        {(() => {
          const signs = getSignsForMode(mode)
          const colors = mode === 'iau' ? SIGN_ELEMENT_COLORS_IAU : SIGN_ELEMENT_COLORS
          return signs.map((sign, i) => {
            const lon1 = mode === 'iau' ? IAU_RING_SEGMENTS[i][0] : i * 30
            const lon2 = mode === 'iau' ? IAU_RING_SEGMENTS[i][1] : (i + 1) * 30
            const midLon = (lon1 + lon2) / 2
            const midAngle = lonToSvgAngle(midLon, asc)
            const [tx, ty] = polar(midAngle, (R_ZODIAC_OUTER + R_ZODIAC_INNER) / 2)
            const color = colors[i]

            const isSignHovered = hovered === `s:${i}`
            return (
              <g
                key={sign.name}
                onMouseEnter={() => setHovered(`s:${i}`)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onNavigate?.(sign.canonicalName)}
                style={{ cursor: onNavigate ? 'pointer' : 'default' }}
              >
                <path
                  d={arcSector(lon1, lon2, R_ZODIAC_OUTER, R_ZODIAC_INNER, asc)}
                  fill={isSignHovered ? `${color}38` : `${color}18`}
                  stroke="var(--color-border)"
                  strokeWidth="0.5"
                />
                <text
                  x={tx} y={ty}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={14} fill={color} opacity={isSignHovered ? 1 : 0.9}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {sign.symbol}
                </text>
              </g>
            )
          })
        })()}

        {/* ── House ring ── */}
        {houses.cusps.map((cuspLon, i) => {
          const nextCusp = houses.cusps[(i + 1) % 12]
          const midLon = cuspLon + 15
          const midAngle = lonToSvgAngle(midLon, asc)
          const [tx, ty] = polar(midAngle, (R_HOUSE_OUTER + R_HOUSE_INNER) / 2)
          const isAngular = [0, 3, 6, 9].includes(i)
          const isHouseHovered = hovered === `h:${i}`

          return (
            <g
              key={i}
              onMouseEnter={() => setHovered(`h:${i}`)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onNavigate?.(`astrology.house.${i + 1}`)}
              style={{ cursor: onNavigate ? 'pointer' : 'default' }}
            >
              <path
                d={arcSector(cuspLon, nextCusp, R_HOUSE_OUTER, R_HOUSE_INNER, asc)}
                fill={isHouseHovered ? 'rgba(180,156,90,0.18)' : isAngular ? 'rgba(180,156,90,0.08)' : 'var(--color-surface-2)'}
                stroke="var(--color-border)"
                strokeWidth="0.5"
              />
              <text
                x={tx} y={ty}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fill={isHouseHovered ? 'var(--color-accent)' : 'var(--color-text-subtle)'}
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {i + 1}
              </text>
            </g>
          )
        })}

        {/* Inner chart circle */}
        <circle cx={CX} cy={CY} r={R_HOUSE_INNER} fill="var(--color-surface-2)" stroke="var(--color-border)" strokeWidth="0.5" />

        {/* Degree ticks at 5° intervals on inner zodiac ring */}
        {Array.from({ length: 72 }, (_, i) => i * 5).map(lon => (
          <path
            key={lon}
            d={tickLine(lon, R_ZODIAC_INNER, lon % 30 === 0 ? R_HOUSE_OUTER : lon % 10 === 0 ? R_ZODIAC_INNER - 4 : R_ZODIAC_INNER - 2, asc)}
            stroke="var(--color-border)"
            strokeWidth={lon % 30 === 0 ? 1 : 0.5}
          />
        ))}

        {/* ── House axis lines (Asc/Desc and MC/IC) ── */}
        {[0, 3, 6, 9].map(i => {
          const angle = lonToSvgAngle(houses.cusps[i], asc)
          const [x1, y1] = polar(angle, R_HOUSE_INNER)
          const [x2, y2] = polar(angle, R_ASPECT - 10)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-accent-muted)" strokeWidth="0.8" strokeDasharray="3,3" />
        })}

        {/* ── Aspect lines ── */}
        {showNatal && aspects.map((asp, i) => {
          const a1 = lonToSvgAngle(planets.find(p => p.planet.name === asp.planet1.name)!.longitude, asc)
          const a2 = lonToSvgAngle(planets.find(p => p.planet.name === asp.planet2.name)!.longitude, asc)
          const [x1, y1] = polar(a1, R_ASPECT)
          const [x2, y2] = polar(a2, R_ASPECT)
          const isHovered = hovered === 'n:' + asp.planet1.name || hovered === 'n:' + asp.planet2.name
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={ASPECT_COLORS[asp.type] ?? 'var(--color-border)'}
              strokeWidth={isHovered ? 1.5 : 0.7}
              opacity={isHovered ? 0.9 : 0.4}
            />
          )
        })}

        {/* Aspect circle (inner boundary) */}
        <circle cx={CX} cy={CY} r={R_ASPECT} fill="none" stroke="var(--color-border)" strokeWidth="0.3" strokeDasharray="2,4" />

        {/* ── Natal planet glyphs ── */}
        {showNatal && planets.map(pos => {
          const angle = lonToSvgAngle(pos.longitude, asc)
          const [px, py] = polar(angle, R_PLANET)
          const [tx, ty] = polar(angle, R_HOUSE_INNER + 10)
          const isHovered = hovered === 'n:' + pos.planet.name

          return (
            <g
              key={pos.planet.name}
              onMouseEnter={() => setHovered('n:' + pos.planet.name)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onNavigate?.(pos.planet.canonicalName)}
              style={{ cursor: onNavigate ? 'pointer' : 'default' }}
            >
              <line x1={tx} y1={ty} x2={px} y2={py} stroke="var(--color-border)" strokeWidth="0.5" opacity={0.5} />
              <text
                x={px} y={py}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={isHovered ? 17 : 14}
                fill={pos.retrograde ? 'var(--color-text-subtle)' : 'var(--color-text)'}
                style={{ userSelect: 'none', transition: 'font-size 0.1s' }}
              >
                {pos.planet.symbol}
              </text>
              {pos.retrograde && (
                <text x={px + 8} y={py - 7} fontSize={8} fill="var(--color-danger)" opacity={0.8} style={{ userSelect: 'none', pointerEvents: 'none' }}>℞</text>
              )}
            </g>
          )
        })}

        {/* ── Hermetic Lot glyphs ── */}
        {showLots && lots?.map(lp => {
          const angle = lonToSvgAngle(lp.longitude, asc)
          const [px, py] = polar(angle, R_PLANET)
          const isHovered = hovered === 'l:' + lp.lot.canonicalName
          const isMultiChar = lp.lot.symbol.length > 1

          return (
            <g
              key={lp.lot.canonicalName}
              onMouseEnter={() => setHovered('l:' + lp.lot.canonicalName)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onNavigate?.(lp.lot.canonicalName)}
              style={{ cursor: onNavigate ? 'pointer' : 'default' }}
            >
              <circle cx={px} cy={py} r={isHovered ? 9 : 7} fill="var(--color-surface-2)" stroke={LOT_COLOR} strokeWidth="0.8" opacity={0.85} />
              <text
                x={px} y={py}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={isMultiChar ? (isHovered ? 7 : 6) : (isHovered ? 10 : 8)}
                fill={LOT_COLOR}
                opacity={isHovered ? 1 : 0.9}
                style={{ userSelect: 'none' }}
              >
                {lp.lot.symbol}
              </text>
            </g>
          )
        })}

        {/* ── Transit planet glyphs ── */}
        {showTransits && transitChart && transitChart.planets.map(pos => {
          const angle = lonToSvgAngle(pos.longitude, asc)
          const [px, py] = polar(angle, R_TRANSIT_PLANET)
          const isHovered = hovered === 't:' + pos.planet.name

          return (
            <g
              key={'t:' + pos.planet.name}
              onMouseEnter={() => setHovered('t:' + pos.planet.name)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onNavigate?.(pos.planet.canonicalName)}
              style={{ cursor: onNavigate ? 'pointer' : 'default' }}
            >
              <text
                x={px} y={py}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={isHovered ? 13 : 11}
                fill={TRANSIT_COLOR}
                opacity={isHovered ? 1 : 0.8}
                style={{ userSelect: 'none', transition: 'font-size 0.1s' }}
              >
                {pos.planet.symbol}
              </text>
              {pos.retrograde && (
                <text x={px + 6} y={py - 5} fontSize={7} fill={TRANSIT_COLOR} opacity={0.7} style={{ userSelect: 'none', pointerEvents: 'none' }}>℞</text>
              )}
            </g>
          )
        })}

        {/* ── Ascendant label ── */}
        <text x={CX - R_ZODIAC_OUTER + 8} y={CY - 6} fontSize={9} fill="var(--color-accent)" opacity={0.8} style={{ userSelect: 'none' }}>ASC</text>
        <text x={CX + R_ZODIAC_OUTER - 28} y={CY - 6} fontSize={9} fill="var(--color-text-subtle)" opacity={0.6} style={{ userSelect: 'none' }}>DSC</text>
        <text x={CX - 10} y={CY - R_ZODIAC_OUTER + 14} fontSize={9} fill="var(--color-text-subtle)" opacity={0.6} style={{ userSelect: 'none' }}>MC</text>
        <text x={CX - 8} y={CY + R_ZODIAC_OUTER - 6} fontSize={9} fill="var(--color-text-subtle)" opacity={0.6} style={{ userSelect: 'none' }}>IC</text>
      </svg>

      {/* Hover tooltip */}
      {showTooltip && hovered && (() => {
        const signs = getSignsForMode(mode)
        const elements = mode === 'iau' ? SIGN_ELEMENTS_IAU : SIGN_ELEMENTS

        if (hovered.startsWith('s:')) {
          const i = Number(hovered.slice(2))
          const sign = signs[i]
          if (!sign) return null
          return (
            <div style={{
              position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
              borderRadius: '6px', padding: '6px 12px', fontSize: '12px',
              color: 'var(--color-text)', whiteSpace: 'nowrap', pointerEvents: 'none',
            }}>
              {sign.symbol} {sign.name}
              <span style={{ color: 'var(--color-text-subtle)', marginLeft: '8px' }}>{elements[i]}</span>
              {onNavigate && <span style={{ color: 'var(--color-accent)', marginLeft: '8px', fontSize: '10px' }}>→ Reference</span>}
            </div>
          )
        }

        if (hovered.startsWith('h:')) {
          const i = Number(hovered.slice(2))
          return (
            <div style={{
              position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
              borderRadius: '6px', padding: '6px 12px', fontSize: '12px',
              color: 'var(--color-text)', whiteSpace: 'nowrap', pointerEvents: 'none',
            }}>
              House {i + 1}
              <span style={{ color: 'var(--color-text-subtle)', marginLeft: '8px' }}>{HOUSE_NAMES[i]}</span>
              {onNavigate && <span style={{ color: 'var(--color-accent)', marginLeft: '8px', fontSize: '10px' }}>→ Reference</span>}
            </div>
          )
        }

        if (hovered.startsWith('l:')) {
          const cn = hovered.slice(2)
          const lp = lots?.find(l => l.lot.canonicalName === cn)
          if (!lp) return null
          const sign = signs[lp.signIndex]
          return (
            <div style={{
              position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--color-surface-3)', border: `1px solid var(--color-accent-muted)`,
              borderRadius: '6px', padding: '6px 12px', fontSize: '12px',
              color: 'var(--color-text)', whiteSpace: 'nowrap', pointerEvents: 'none',
            }}>
              <span style={{ color: LOT_COLOR, marginRight: '6px' }}>{lp.lot.symbol}</span>
              {lp.lot.name} — {lp.degree}°{String(lp.minutes).padStart(2, '0')}′ {sign?.symbol} {sign?.name}
              {onNavigate && <span style={{ color: 'var(--color-accent)', marginLeft: '8px', fontSize: '10px' }}>→ Reference</span>}
            </div>
          )
        }

        const isTransit = hovered.startsWith('t:')
        const name = hovered.slice(2)
        const source = isTransit ? transitChart?.planets : planets
        const pos = source?.find(p => p.planet.name === name)
        if (!pos) return null
        const sign = signs[pos.signIndex]
        return (
          <div style={{
            position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
            borderRadius: '6px', padding: '6px 12px', fontSize: '12px',
            color: 'var(--color-text)', whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>
            {isTransit && <span style={{ color: TRANSIT_COLOR, marginRight: '6px', fontSize: '10px' }}>transit</span>}
            {pos.planet.symbol} {pos.planet.name} — {pos.degree}°{String(pos.minutes).padStart(2, '0')}′ {sign?.symbol} {sign?.name}
            {pos.retrograde && <span style={{ color: 'var(--color-danger)', marginLeft: '6px' }}>℞</span>}
            {onNavigate && <span style={{ color: 'var(--color-accent)', marginLeft: '8px', fontSize: '10px' }}>→ Reference</span>}
          </div>
        )
      })()}

      {/* Layer toggles — shown when transit data or lots are available */}
      {(transitChart || (lots && lots.length > 0)) && (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
          {transitChart && (
            <button
              onClick={() => setShowNatal(v => !v)}
              style={{
                padding: '3px 10px', fontSize: '11px', cursor: 'pointer',
                border: '1px solid var(--color-border)', borderRadius: '4px',
                background: showNatal ? 'var(--color-surface-3)' : 'transparent',
                color: showNatal ? 'var(--color-text)' : 'var(--color-text-subtle)',
              }}
            >
              ☉ Natal
            </button>
          )}
          {lots && lots.length > 0 && (
            <button
              onClick={() => setShowLots(v => !v)}
              style={{
                padding: '3px 10px', fontSize: '11px', cursor: 'pointer',
                border: `1px solid ${showLots ? 'var(--color-accent-muted)' : 'var(--color-border)'}`, borderRadius: '4px',
                background: showLots ? 'rgba(180,156,90,0.1)' : 'transparent',
                color: showLots ? LOT_COLOR : 'var(--color-text-subtle)',
              }}
            >
              ⊕ Lots
            </button>
          )}
          {transitChart && (
            <button
              onClick={() => setShowTransits(v => !v)}
              style={{
                padding: '3px 10px', fontSize: '11px', cursor: 'pointer',
                border: `1px solid ${showTransits ? TRANSIT_COLOR + '80' : 'var(--color-border)'}`, borderRadius: '4px',
                background: showTransits ? TRANSIT_COLOR + '18' : 'transparent',
                color: showTransits ? TRANSIT_COLOR : 'var(--color-text-subtle)',
              }}
            >
              ☿ Transits
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Standalone tooltip ───────────────────────────────────────────────────────
// Renders the same tooltip content as WheelChart's inline tooltip, but as a
// standalone component so callers can place it anywhere in the DOM tree.

export function WheelChartTooltip({
  hoveredKey,
  chart,
  mode = 'tropical',
  onNavigate,
  style,
}: {
  hoveredKey: string
  chart: NatalChartData
  mode?: AstrologyMode
  onNavigate?: (cn: string) => void
  style?: React.CSSProperties
}) {
  const signs    = getSignsForMode(mode)
  const elements = mode === 'iau' ? SIGN_ELEMENTS_IAU : SIGN_ELEMENTS
  const { planets, lots } = chart

  const base: React.CSSProperties = {
    display: 'inline-block',
    background: 'var(--color-surface-3)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    color: 'var(--color-text)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    ...style,
  }

  if (hoveredKey.startsWith('s:')) {
    const i    = Number(hoveredKey.slice(2))
    const sign = signs[i]
    if (!sign) return null
    return (
      <div style={base}>
        {sign.symbol} {sign.name}
        <span style={{ color: 'var(--color-text-subtle)', marginLeft: '8px' }}>{elements[i]}</span>
        {onNavigate && <span style={{ color: 'var(--color-accent)', marginLeft: '8px', fontSize: '10px' }}>→ Reference</span>}
      </div>
    )
  }

  if (hoveredKey.startsWith('h:')) {
    const i = Number(hoveredKey.slice(2))
    return (
      <div style={base}>
        House {i + 1}
        <span style={{ color: 'var(--color-text-subtle)', marginLeft: '8px' }}>{HOUSE_NAMES[i]}</span>
        {onNavigate && <span style={{ color: 'var(--color-accent)', marginLeft: '8px', fontSize: '10px' }}>→ Reference</span>}
      </div>
    )
  }

  if (hoveredKey.startsWith('l:')) {
    const cn = hoveredKey.slice(2)
    const lp = lots?.find(l => l.lot.canonicalName === cn)
    if (!lp) return null
    const sign = signs[lp.signIndex]
    return (
      <div style={{ ...base, border: '1px solid var(--color-accent-muted)' }}>
        <span style={{ color: LOT_COLOR, marginRight: '6px' }}>{lp.lot.symbol}</span>
        {lp.lot.name} — {lp.degree}°{String(lp.minutes).padStart(2, '0')}′ {sign?.symbol} {sign?.name}
        {onNavigate && <span style={{ color: 'var(--color-accent)', marginLeft: '8px', fontSize: '10px' }}>→ Reference</span>}
      </div>
    )
  }

  const isTransit = hoveredKey.startsWith('t:')
  const name      = hoveredKey.slice(2)
  const source    = isTransit ? [] as typeof planets : planets
  const pos       = source.find(p => p.planet.name === name)
  if (!pos) return null
  const sign = signs[pos.signIndex]
  return (
    <div style={base}>
      {isTransit && <span style={{ color: TRANSIT_COLOR, marginRight: '6px', fontSize: '10px' }}>transit</span>}
      {pos.planet.symbol} {pos.planet.name} — {pos.degree}°{String(pos.minutes).padStart(2, '0')}′ {sign?.symbol} {sign?.name}
      {pos.retrograde && <span style={{ color: 'var(--color-danger)', marginLeft: '6px' }}>℞</span>}
      {onNavigate && <span style={{ color: 'var(--color-accent)', marginLeft: '8px', fontSize: '10px' }}>→ Reference</span>}
    </div>
  )
}
