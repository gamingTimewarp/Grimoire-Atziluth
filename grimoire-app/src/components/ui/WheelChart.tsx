/**
 * WheelChart.tsx
 * SVG natal chart wheel: zodiac ring → house ring → planet glyphs → aspect lines.
 * Layout: Ascendant fixed at 9 o'clock (left). Ecliptic increases counter-clockwise.
 *
 * layout='classic' — all planets on a single ring (legacy)
 * layout='rings'   — four concentric rings by orbital group:
 *   Ring 1 (innermost): Moon, Sun, Mercury, Venus, Mars
 *   Ring 2: Jupiter, Saturn
 *   Ring 3: Uranus, Neptune, Pluto
 *   Ring 4 (outermost from centre): Asteroids, Nodes, Lilith
 *   Aspect lines project to a common inner circle regardless of ring.
 */

import React, { useState, useEffect } from 'react'
import type { NatalChartData } from '@/lib/astro-engine'
import { getSignsForMode, IAU_BOUNDARIES, HOUSE_NAMES } from '@/lib/astro-engine'
import type { AstrologyMode } from '@/lib/astro-engine'

const TRANSIT_COLOR = '#c4a44a'
const R_TRANSIT_PLANET = 168

// ─── Geometry helpers ─────────────────────────────────────────────────────────

const CX = 250
const CY = 250

// Shared radii (both modes)
const R_ZODIAC_OUTER = 238
const R_ZODIAC_INNER = 196
const R_HOUSE_OUTER  = 196
const R_HOUSE_INNER  = 174

// Classic layout
const R_PLANET = 155
const R_ASPECT = 110

// Rings layout — concentric planet rings
const R_RING_1       = 160  // Moon, Sun, Mercury, Venus, Mars
const R_RING_2       = 135  // Jupiter, Saturn
const R_RING_3       = 110  // Uranus, Neptune, Pluto
const R_RING_4       = 85   // Asteroids, Nodes, Lilith
const R_ASPECT_RINGS = 65   // aspect projection circle in rings mode

// Ring separator circles (drawn between rings in rings mode)
const R_SEP_12 = 147
const R_SEP_23 = 122
const R_SEP_34 = 97

const RING_1_CNS = new Set([
  'astrology.planet.sol', 'astrology.planet.luna',
  'astrology.planet.mercury', 'astrology.planet.venus', 'astrology.planet.mars',
])
const RING_2_CNS = new Set(['astrology.planet.jupiter', 'astrology.planet.saturn'])
const RING_3_CNS = new Set(['astrology.planet.uranus', 'astrology.planet.neptune', 'astrology.planet.pluto'])

function getRingRadius(cn: string): number {
  if (RING_1_CNS.has(cn)) return R_RING_1
  if (RING_2_CNS.has(cn)) return R_RING_2
  if (RING_3_CNS.has(cn)) return R_RING_3
  return R_RING_4
}

/** Convert ecliptic longitude + ascendant to SVG polar angle (0=right, CW). */
function lonToSvgAngle(lon: number, asc: number): number {
  return ((180 - (lon - asc)) % 360 + 360) % 360
}

function polar(angleDeg: number, r: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)]
}

function arcSector(lon1: number, lon2: number, r1: number, r2: number, asc: number): string {
  const a1 = lonToSvgAngle(lon1, asc)
  const a2 = lonToSvgAngle(lon2, asc)
  const [ox1, oy1] = polar(a1, r1)
  const [ox2, oy2] = polar(a2, r1)
  const [ix2, iy2] = polar(a2, r2)
  const [ix1, iy1] = polar(a1, r2)
  return `M ${ox1} ${oy1} A ${r1} ${r1} 0 0 0 ${ox2} ${oy2} L ${ix2} ${iy2} A ${r2} ${r2} 0 0 1 ${ix1} ${iy1} Z`
}

function tickLine(lon: number, r1: number, r2: number, asc: number): string {
  const a = lonToSvgAngle(lon, asc)
  const [x1, y1] = polar(a, r1)
  const [x2, y2] = polar(a, r2)
  return `M ${x1} ${y1} L ${x2} ${y2}`
}

// ─── Colour constants ─────────────────────────────────────────────────────────

const SIGN_ELEMENT_COLORS = [
  '#c44a4a', '#6aa86a', '#6ab0a8', '#6a86a8',
  '#c44a4a', '#6aa86a', '#6ab0a8', '#6a86a8',
  '#c44a4a', '#6aa86a', '#6ab0a8', '#6a86a8',
]
const SIGN_ELEMENT_COLORS_IAU = [
  '#c44a4a', '#6aa86a', '#6ab0a8', '#6a86a8',
  '#c44a4a', '#6aa86a', '#6ab0a8', '#6a86a8',
  '#8a7ab0',
  '#c44a4a', '#6aa86a', '#6ab0a8', '#6a86a8',
]
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

export type WheelLayout = 'classic' | 'rings'

export type WheelChartProps = {
  chart: NatalChartData
  transitChart?: NatalChartData
  size?: number
  mode?: AstrologyMode
  onNavigate?: (canonicalName: string) => void
  onHoverChange?: (key: string | null) => void
  showTooltip?: boolean
  defaultLayout?: WheelLayout
  /**
   * Hides the built-in Rings/Natal/Lots/Transits toggle row below the SVG — for
   * callers that render their own controls elsewhere, e.g. because this component
   * is absolutely-positioned as a background layer and the row's normal-flow
   * position would collide with other content placed below it (ZodiacYearSpread's
   * card ring). Pair with the `layout`/`onLayoutChange` and `showLots`/
   * `onShowLotsChange` controlled props below so the caller's own buttons still
   * drive the chart.
   */
  hideControls?: boolean
  /** Controlled ring layout. Omit to let WheelChart manage its own state (uncontrolled). */
  layout?: WheelLayout
  onLayoutChange?: (l: WheelLayout) => void
  /** Controlled Lots visibility. Omit to let WheelChart manage its own state (uncontrolled). */
  showLots?: boolean
  onShowLotsChange?: (v: boolean) => void
}

const SIGN_ELEMENTS     = ['Fire','Earth','Air','Water','Fire','Earth','Air','Water','Fire','Earth','Air','Water']
const SIGN_ELEMENTS_IAU = ['Fire','Earth','Air','Water','Fire','Earth','Air','Water','Serpent-bearer','Fire','Earth','Air','Water']
const LOT_COLOR = 'var(--color-accent)'

export function WheelChart({
  chart, transitChart, size = 500, mode = 'tropical',
  onNavigate, onHoverChange, showTooltip = true, defaultLayout = 'classic',
  hideControls = false,
  layout: layoutProp, onLayoutChange,
  showLots: showLotsProp, onShowLotsChange,
}: WheelChartProps) {
  const { planets, houses, aspects, lots } = chart
  const asc = houses.ascendant

  const [hovered,      setHovered]      = useState<string | null>(null)
  const [showNatal,    setShowNatal]    = useState(true)
  const [showTransits, setShowTransits] = useState(true)
  const [internalShowLots, setInternalShowLots] = useState(true)
  const [internalLayout,   setInternalLayout]   = useState<WheelLayout>(defaultLayout)

  // Controlled/uncontrolled dual mode: most callers let WheelChart manage its own
  // layout/showLots state, but ZodiacYearSpread drives these from buttons it renders
  // itself (see hideControls above), so it needs to pass the current value in and
  // hear about changes rather than have WheelChart own the state privately.
  const layout   = layoutProp   ?? internalLayout
  const showLots = showLotsProp ?? internalShowLots
  const toggleLayout = () => {
    const next: WheelLayout = layout === 'classic' ? 'rings' : 'classic'
    if (onLayoutChange) onLayoutChange(next)
    else setInternalLayout(next)
  }
  const toggleShowLots = () => {
    const next = !showLots
    if (onShowLotsChange) onShowLotsChange(next)
    else setInternalShowLots(next)
  }

  useEffect(() => { onHoverChange?.(hovered) }, [hovered])

  const isRings   = layout === 'rings'
  const rPlanet   = (cn: string) => isRings ? getRingRadius(cn) : R_PLANET
  const rAspect   = isRings ? R_ASPECT_RINGS : R_ASPECT
  const glyphSize = (hov: boolean) => isRings ? (hov ? 19 : 16) : (hov ? 17 : 14)

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: size }}>
      <svg viewBox="0 0 500 500" width="100%" style={{ display: 'block', aspectRatio: '1 / 1' }}>

        {/* ── Background ── */}
        <circle cx={CX} cy={CY} r={R_ZODIAC_OUTER} fill="var(--color-surface-1)" stroke="var(--color-border)" strokeWidth="1" />

        {/* ── Zodiac sign ring ── */}
        {(() => {
          const signs  = getSignsForMode(mode)
          const colors = mode === 'iau' ? SIGN_ELEMENT_COLORS_IAU : SIGN_ELEMENT_COLORS
          return signs.map((sign, i) => {
            const lon1     = mode === 'iau' ? IAU_RING_SEGMENTS[i][0] : i * 30
            const lon2     = mode === 'iau' ? IAU_RING_SEGMENTS[i][1] : (i + 1) * 30
            const midAngle = lonToSvgAngle((lon1 + lon2) / 2, asc)
            const [tx, ty] = polar(midAngle, (R_ZODIAC_OUTER + R_ZODIAC_INNER) / 2)
            const color    = colors[i]
            const isHov    = hovered === `s:${i}`
            return (
              <g key={sign.name} onMouseEnter={() => setHovered(`s:${i}`)} onMouseLeave={() => setHovered(null)}
                onClick={() => onNavigate?.(sign.canonicalName)} style={{ cursor: onNavigate ? 'pointer' : 'default' }}>
                <path d={arcSector(lon1, lon2, R_ZODIAC_OUTER, R_ZODIAC_INNER, asc)}
                  fill={isHov ? `${color}38` : `${color}18`} stroke="var(--color-border)" strokeWidth="0.5" />
                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                  fontSize={14} fill={color} opacity={isHov ? 1 : 0.9}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}>
                  {sign.symbol}
                </text>
              </g>
            )
          })
        })()}

        {/* ── House ring ── */}
        {houses.cusps.map((cuspLon, i) => {
          const nextCusp = houses.cusps[(i + 1) % 12]
          const midAngle = lonToSvgAngle(cuspLon + 15, asc)
          const [tx, ty] = polar(midAngle, (R_HOUSE_OUTER + R_HOUSE_INNER) / 2)
          const isAngular = [0, 3, 6, 9].includes(i)
          const isHov     = hovered === `h:${i}`
          return (
            <g key={i} onMouseEnter={() => setHovered(`h:${i}`)} onMouseLeave={() => setHovered(null)}
              onClick={() => onNavigate?.(`astrology.house.${i + 1}`)} style={{ cursor: onNavigate ? 'pointer' : 'default' }}>
              <path d={arcSector(cuspLon, nextCusp, R_HOUSE_OUTER, R_HOUSE_INNER, asc)}
                fill={isHov ? 'rgba(180,156,90,0.18)' : isAngular ? 'rgba(180,156,90,0.08)' : 'var(--color-surface-2)'}
                stroke="var(--color-border)" strokeWidth="0.5" />
              <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fill={isHov ? 'var(--color-accent)' : 'var(--color-text-subtle)'}
                style={{ userSelect: 'none', pointerEvents: 'none' }}>
                {i + 1}
              </text>
            </g>
          )
        })}

        {/* Inner chart circle */}
        <circle cx={CX} cy={CY} r={R_HOUSE_INNER} fill="var(--color-surface-2)" stroke="var(--color-border)" strokeWidth="0.5" />

        {/* ── Ring separators (rings mode only) ── */}
        {isRings && [R_SEP_12, R_SEP_23, R_SEP_34].map(r => (
          <circle key={r} cx={CX} cy={CY} r={r}
            fill="none" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="2,4" opacity={0.4} />
        ))}

        {/* Degree ticks */}
        {Array.from({ length: 72 }, (_, i) => i * 5).map(lon => (
          <path key={lon}
            d={tickLine(lon, R_ZODIAC_INNER,
              lon % 30 === 0 ? R_HOUSE_OUTER : lon % 10 === 0 ? R_ZODIAC_INNER - 4 : R_ZODIAC_INNER - 2,
              asc)}
            stroke="var(--color-border)" strokeWidth={lon % 30 === 0 ? 1 : 0.5} />
        ))}

        {/* ── House axis lines ── */}
        {[0, 3, 6, 9].map(i => {
          const angle    = lonToSvgAngle(houses.cusps[i], asc)
          const [x1, y1] = polar(angle, R_HOUSE_INNER)
          const [x2, y2] = polar(angle, rAspect - 10)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-accent-muted)" strokeWidth="0.8" strokeDasharray="3,3" />
        })}

        {/* ── Aspect lines ── */}
        {showNatal && aspects.map((asp, i) => {
          const p1 = planets.find(p => p.planet.name === asp.planet1.name)
          const p2 = planets.find(p => p.planet.name === asp.planet2.name)
          if (!p1 || !p2) return null
          const [x1, y1] = polar(lonToSvgAngle(p1.longitude, asc), rAspect)
          const [x2, y2] = polar(lonToSvgAngle(p2.longitude, asc), rAspect)
          const isHov    = hovered === 'n:' + asp.planet1.name || hovered === 'n:' + asp.planet2.name
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={ASPECT_COLORS[asp.type] ?? 'var(--color-border)'}
              strokeWidth={isHov ? 1.5 : 0.7} opacity={isHov ? 0.9 : 0.4} />
          )
        })}

        {/* Aspect circle */}
        <circle cx={CX} cy={CY} r={rAspect} fill="none" stroke="var(--color-border)" strokeWidth="0.3" strokeDasharray="2,4" />

        {/* ── Natal planet glyphs ── */}
        {showNatal && planets.map(pos => {
          const angle    = lonToSvgAngle(pos.longitude, asc)
          const r        = rPlanet(pos.planet.canonicalName)
          const [px, py] = polar(angle, r)
          const [tx, ty] = polar(angle, R_HOUSE_INNER + 10)
          const isHov    = hovered === 'n:' + pos.planet.name
          return (
            <g key={pos.planet.name}
              onMouseEnter={() => setHovered('n:' + pos.planet.name)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onNavigate?.(pos.planet.canonicalName)}
              style={{ cursor: onNavigate ? 'pointer' : 'default' }}>
              {!isRings && (
                <line x1={tx} y1={ty} x2={px} y2={py} stroke="var(--color-border)" strokeWidth="0.5" opacity={0.5} />
              )}
              <text x={px} y={py} textAnchor="middle" dominantBaseline="middle"
                fontSize={glyphSize(isHov)}
                fill={pos.retrograde ? 'var(--color-text-subtle)' : 'var(--color-text)'}
                style={{ userSelect: 'none', transition: 'font-size 0.1s' }}>
                {pos.planet.symbol}
              </text>
              {pos.retrograde && (
                <text x={px + (isRings ? 10 : 8)} y={py - (isRings ? 9 : 7)}
                  fontSize={isRings ? 9 : 8} fill="var(--color-danger)" opacity={0.8}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}>℞</text>
              )}
            </g>
          )
        })}

        {/* ── Hermetic Lot glyphs ── */}
        {showLots && lots?.map(lp => {
          const angle    = lonToSvgAngle(lp.longitude, asc)
          const [px, py] = polar(angle, R_PLANET)
          const isHov    = hovered === 'l:' + lp.lot.canonicalName
          const isMulti  = lp.lot.symbol.length > 1
          return (
            <g key={lp.lot.canonicalName}
              onMouseEnter={() => setHovered('l:' + lp.lot.canonicalName)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onNavigate?.(lp.lot.canonicalName)}
              style={{ cursor: onNavigate ? 'pointer' : 'default' }}>
              <circle cx={px} cy={py} r={isHov ? 9 : 7}
                fill="var(--color-surface-2)" stroke={LOT_COLOR} strokeWidth="0.8" opacity={0.85} />
              <text x={px} y={py} textAnchor="middle" dominantBaseline="middle"
                fontSize={isMulti ? (isHov ? 7 : 6) : (isHov ? 10 : 8)}
                fill={LOT_COLOR} opacity={isHov ? 1 : 0.9} style={{ userSelect: 'none' }}>
                {lp.lot.symbol}
              </text>
            </g>
          )
        })}

        {/* ── Transit planet glyphs ── */}
        {showTransits && transitChart && transitChart.planets.map(pos => {
          const angle    = lonToSvgAngle(pos.longitude, asc)
          const [px, py] = polar(angle, R_TRANSIT_PLANET)
          const isHov    = hovered === 't:' + pos.planet.name
          return (
            <g key={'t:' + pos.planet.name}
              onMouseEnter={() => setHovered('t:' + pos.planet.name)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onNavigate?.(pos.planet.canonicalName)}
              style={{ cursor: onNavigate ? 'pointer' : 'default' }}>
              <text x={px} y={py} textAnchor="middle" dominantBaseline="middle"
                fontSize={isHov ? 13 : 11} fill={TRANSIT_COLOR} opacity={isHov ? 1 : 0.8}
                style={{ userSelect: 'none', transition: 'font-size 0.1s' }}>
                {pos.planet.symbol}
              </text>
              {pos.retrograde && (
                <text x={px + 6} y={py - 5} fontSize={7} fill={TRANSIT_COLOR} opacity={0.7}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}>℞</text>
              )}
            </g>
          )
        })}

        {/* ── Cardinal labels ── */}
        <text x={CX - R_ZODIAC_OUTER + 8} y={CY - 6} fontSize={9} fill="var(--color-accent)" opacity={0.8} style={{ userSelect: 'none' }}>ASC</text>
        <text x={CX + R_ZODIAC_OUTER - 28} y={CY - 6} fontSize={9} fill="var(--color-text-subtle)" opacity={0.6} style={{ userSelect: 'none' }}>DSC</text>
        <text x={CX - 10} y={CY - R_ZODIAC_OUTER + 14} fontSize={9} fill="var(--color-text-subtle)" opacity={0.6} style={{ userSelect: 'none' }}>MC</text>
        <text x={CX - 8} y={CY + R_ZODIAC_OUTER - 6} fontSize={9} fill="var(--color-text-subtle)" opacity={0.6} style={{ userSelect: 'none' }}>IC</text>
      </svg>

      {/* ── Controls ── */}
      {!hideControls && (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={toggleLayout}
            title={isRings ? 'Switch to classic single-ring layout' : 'Switch to concentric rings layout'}
            style={toggleStyle(isRings)}
          >
            {isRings ? '◎ Rings' : '○ Rings'}
          </button>
          {transitChart && (
            <button onClick={() => setShowNatal(v => !v)} style={toggleStyle(showNatal)}>☉ Natal</button>
          )}
          {lots && lots.length > 0 && (
            <button onClick={toggleShowLots}
              style={{ ...toggleStyle(showLots), borderColor: showLots ? 'var(--color-accent-muted)' : 'var(--color-border)', color: showLots ? LOT_COLOR : 'var(--color-text-subtle)' }}>
              ⊕ Lots
            </button>
          )}
          {transitChart && (
            <button onClick={() => setShowTransits(v => !v)}
              style={{ ...toggleStyle(showTransits), borderColor: showTransits ? TRANSIT_COLOR + '80' : 'var(--color-border)', color: showTransits ? TRANSIT_COLOR : 'var(--color-text-subtle)', background: showTransits ? TRANSIT_COLOR + '18' : 'transparent' }}>
              ☿ Transits
            </button>
          )}
        </div>
      )}

      {/* ── Hover tooltip — always rendered, visibility-toggled to prevent layout shift ── */}
      {showTooltip && (
        <div style={{ minHeight: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '6px' }}>
          <WheelTooltipContent
            hovered={hovered}
            planets={planets} lots={lots}
            transitChart={transitChart}
            mode={mode}
            onNavigate={onNavigate}
          />
        </div>
      )}
    </div>
  )
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const TOOLTIP_BASE_STYLE: React.CSSProperties = {
  background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
  borderRadius: '6px', padding: '6px 12px', fontSize: '12px',
  color: 'var(--color-text)', whiteSpace: 'nowrap', pointerEvents: 'none',
}

// ─── Inline tooltip content (always rendered, visibility-toggled) ─────────────

function WheelTooltipContent({
  hovered, planets, lots, transitChart, mode, onNavigate,
}: {
  hovered: string | null
  planets: NatalChartData['planets']
  lots: NatalChartData['lots']
  transitChart?: NatalChartData
  mode: AstrologyMode
  onNavigate?: (cn: string) => void
}) {
  const signs    = getSignsForMode(mode)
  const elements = mode === 'iau' ? SIGN_ELEMENTS_IAU : SIGN_ELEMENTS

  if (!hovered) {
    return <div style={{ ...TOOLTIP_BASE_STYLE, visibility: 'hidden' }}>&nbsp;</div>
  }

  if (hovered.startsWith('s:')) {
    const i = Number(hovered.slice(2)); const sign = signs[i]
    if (!sign) return <div style={{ ...TOOLTIP_BASE_STYLE, visibility: 'hidden' }}>&nbsp;</div>
    return (
      <div style={TOOLTIP_BASE_STYLE}>
        {sign.symbol} {sign.name}
        <span style={{ color: 'var(--color-text-subtle)', marginLeft: '8px' }}>{elements[i]}</span>
        {onNavigate && <span style={{ color: 'var(--color-accent)', marginLeft: '8px', fontSize: '10px' }}>→ Reference</span>}
      </div>
    )
  }
  if (hovered.startsWith('h:')) {
    const i = Number(hovered.slice(2))
    return (
      <div style={TOOLTIP_BASE_STYLE}>
        House {i + 1}
        <span style={{ color: 'var(--color-text-subtle)', marginLeft: '8px' }}>{HOUSE_NAMES[i]}</span>
        {onNavigate && <span style={{ color: 'var(--color-accent)', marginLeft: '8px', fontSize: '10px' }}>→ Reference</span>}
      </div>
    )
  }
  if (hovered.startsWith('l:')) {
    const cn = hovered.slice(2); const lp = lots?.find(l => l.lot.canonicalName === cn)
    if (!lp) return <div style={{ ...TOOLTIP_BASE_STYLE, visibility: 'hidden' }}>&nbsp;</div>
    const sign = signs[lp.signIndex]
    return (
      <div style={{ ...TOOLTIP_BASE_STYLE, border: '1px solid var(--color-accent-muted)' }}>
        <span style={{ color: LOT_COLOR, marginRight: '6px' }}>{lp.lot.symbol}</span>
        {lp.lot.name} — {lp.degree}°{String(lp.minutes).padStart(2, '0')}′ {sign?.symbol} {sign?.name}
        {onNavigate && <span style={{ color: 'var(--color-accent)', marginLeft: '8px', fontSize: '10px' }}>→ Reference</span>}
      </div>
    )
  }
  const isTransit = hovered.startsWith('t:')
  const name      = hovered.slice(2)
  const source    = isTransit ? transitChart?.planets : planets
  const pos       = source?.find(p => p.planet.name === name)
  if (!pos) return <div style={{ ...TOOLTIP_BASE_STYLE, visibility: 'hidden' }}>&nbsp;</div>
  const sign = signs[pos.signIndex]
  return (
    <div style={TOOLTIP_BASE_STYLE}>
      {isTransit && <span style={{ color: TRANSIT_COLOR, marginRight: '6px', fontSize: '10px' }}>transit</span>}
      {pos.planet.symbol} {pos.planet.name} — {pos.degree}°{String(pos.minutes).padStart(2, '0')}′ {sign?.symbol} {sign?.name}
      {pos.retrograde && <span style={{ color: 'var(--color-danger)', marginLeft: '6px' }}>℞</span>}
      {onNavigate && <span style={{ color: 'var(--color-accent)', marginLeft: '8px', fontSize: '10px' }}>→ Reference</span>}
    </div>
  )
}

export function toggleStyle(active: boolean): React.CSSProperties {
  return {
    padding: '3px 10px', fontSize: '11px', cursor: 'pointer',
    border: '1px solid var(--color-border)', borderRadius: '4px',
    background: active ? 'var(--color-surface-3)' : 'transparent',
    color: active ? 'var(--color-text)' : 'var(--color-text-subtle)',
  }
}

// ─── Standalone tooltip ───────────────────────────────────────────────────────

export function WheelChartTooltip({
  hoveredKey, chart, mode = 'tropical', onNavigate, style,
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
    background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
    borderRadius: '6px', padding: '6px 12px', fontSize: '12px',
    color: 'var(--color-text)', whiteSpace: 'nowrap', pointerEvents: 'none',
    ...style,
  }

  if (hoveredKey.startsWith('s:')) {
    const i = Number(hoveredKey.slice(2)); const sign = signs[i]; if (!sign) return null
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
    const cn = hoveredKey.slice(2); const lp = lots?.find(l => l.lot.canonicalName === cn); if (!lp) return null
    const sign = signs[lp.signIndex]
    return (
      <div style={{ ...base, border: '1px solid var(--color-accent-muted)' }}>
        <span style={{ color: LOT_COLOR, marginRight: '6px' }}>{lp.lot.symbol}</span>
        {lp.lot.name} — {lp.degree}°{String(lp.minutes).padStart(2, '0')}′ {sign?.symbol} {sign?.name}
        {onNavigate && <span style={{ color: 'var(--color-accent)', marginLeft: '8px', fontSize: '10px' }}>→ Reference</span>}
      </div>
    )
  }
  const name = hoveredKey.slice(2)
  const pos  = planets.find(p => p.planet.name === name)
  if (!pos) return null
  const sign = signs[pos.signIndex]
  return (
    <div style={base}>
      {pos.planet.symbol} {pos.planet.name} — {pos.degree}°{String(pos.minutes).padStart(2, '0')}′ {sign?.symbol} {sign?.name}
      {pos.retrograde && <span style={{ color: 'var(--color-danger)', marginLeft: '6px' }}>℞</span>}
      {onNavigate && <span style={{ color: 'var(--color-accent)', marginLeft: '8px', fontSize: '10px' }}>→ Reference</span>}
    </div>
  )
}
