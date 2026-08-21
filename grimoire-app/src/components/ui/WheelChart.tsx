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
import type { NatalChartData, AspectType, Planet } from '@/lib/astro-engine'
import { getSignsForMode, IAU_BOUNDARIES, HOUSE_NAMES } from '@/lib/astro-engine'
import type { AstrologyMode } from '@/lib/astro-engine'
import { getMoonPhase } from '@/lib/astro-calc'

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

/** Blend a hex colour toward a target hue by `amount` (0-1), for deriving a
 * whole palette's "family" variant rather than hand-picking five new hex
 * values per variant. Good enough for a UI accent, not colour-correct. */
function mixHex(hex: string, target: string, amount: number): string {
  const parse = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
  const [r1, g1, b1] = parse(hex)
  const [r2, g2, b2] = parse(target)
  const mix = (a: number, b: number) => Math.round(a * (1 - amount) + b * amount)
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(mix(r1, r2))}${toHex(mix(g1, g2))}${toHex(mix(b1, b2))}`
}

function mixPalette(base: Record<string, string>, target: string, amount: number): Record<string, string> {
  return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, mixHex(v, target, amount)]))
}

// Chart B's own aspects: the whole palette shifted toward the overlay's gold
// identity, not just conjunction recoloured — square/trine/etc. need to differ
// from Chart A's too, or the two charts' aspect lines are indistinguishable.
const TRANSIT_ASPECT_COLORS: Record<string, string> = mixPalette(ASPECT_COLORS, TRANSIT_COLOR, 0.4)

// Aspects *between* the two charts get a third, distinct family — violet, so
// they don't read as belonging to either chart's own colour scheme.
const CROSS_COLOR = '#8a7ac9'
const CROSS_ASPECT_COLORS: Record<string, string> = mixPalette(ASPECT_COLORS, CROSS_COLOR, 0.5)

// ─── Main component ───────────────────────────────────────────────────────────

export type WheelLayout = 'classic' | 'rings'

export type WheelChartProps = {
  chart: NatalChartData
  transitChart?: NatalChartData
  /** The moment `chart` represents — birth time for a natal chart, "as of" time for
   * a Current Sky snapshot. Only used to compute the Moon's phase for its hover
   * tooltip's second line; harmless to omit, the Moon tooltip just won't show a
   * phase. */
  date?: Date
  /** The moment `transitChart` represents, for its own Moon phase line. Defaults to
   * the actual current time — correct for every existing caller, where the overlay
   * really is "the sky right now" — but the Compare Charts page overlays a second
   * fixed chart that isn't "now" at all, so it passes that chart's own moment here. */
  transitDate?: Date
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
  /** Canonical names to exclude from the natal ring (and the transit ring too, if
   * `hiddenTransitPlanets` isn't given separately), and from any aspect line
   * touching one — the same filter driving the Positions page's Classical/Modern/
   * Asteroids/Nodes visibility groups. Omit to show everything. */
  hiddenPlanets?: Set<string>
  /** Independent visibility filter for the transit/overlay ring — e.g. the Compare
   * Charts page, where "Chart A" and "Chart B" need separately toggleable planets
   * rather than one filter driving both. Falls back to `hiddenPlanets` when omitted,
   * so existing single-filter callers (transit-to-natal on the chart detail page and
   * Current Sky) are unaffected. */
  hiddenTransitPlanets?: Set<string>
  /** Label shown next to a hovered overlay-ring planet, e.g. "transit" (default) or
   * a second chart's own name on the Compare Charts page — purely cosmetic. */
  overlayLabel?: string
  /** Render the overlay ring's glyphs at the same size/opacity as the natal ring's,
   * instead of the smaller, dimmer default. The default suits an actual transit
   * overlay (secondary context on top of your own chart); the Compare Charts page
   * treats both charts as equally significant, so it sets this. */
  overlayEqualWeight?: boolean
  /** Labels for the built-in "Natal"/"Transits" show/hide toggle buttons — override
   * when the two rings aren't actually natal-vs-transit, e.g. Compare Charts passing
   * each chart's own name so the buttons don't misname an arbitrary second chart. */
  natalLabel?: string
  transitLabel?: string
  /** Aspects *between* chart and transitChart — e.g. Compare Charts' synastry
   * aspects, already computed for its AspectsPanel below and passed straight
   * through here too rather than recomputed. `planet1` is always the `chart`
   * side, `planet2` always the `transitChart` side. Drawn in a third, distinct
   * colour family and toggleable independently of the natal/overlay rings. */
  crossAspects?: { planet1: Planet; planet2: Planet; type: AspectType; symbol: string; orb: number }[]
}

const SIGN_ELEMENTS     = ['Fire','Earth','Air','Water','Fire','Earth','Air','Water','Fire','Earth','Air','Water']
const SIGN_ELEMENTS_IAU = ['Fire','Earth','Air','Water','Fire','Earth','Air','Water','Serpent-bearer','Fire','Earth','Air','Water']
const LOT_COLOR = 'var(--color-accent)'

export function WheelChart({
  chart, transitChart, date, transitDate, size = 500, mode = 'tropical',
  onNavigate, onHoverChange, showTooltip = true, defaultLayout = 'classic',
  hideControls = false,
  layout: layoutProp, onLayoutChange,
  showLots: showLotsProp, onShowLotsChange,
  hiddenPlanets, hiddenTransitPlanets, overlayLabel = 'transit', overlayEqualWeight = false,
  natalLabel = 'Natal', transitLabel = 'Transits', crossAspects,
}: WheelChartProps) {
  const { planets, houses, aspects, lots } = chart
  const asc = houses.ascendant

  const [hovered,      setHovered]      = useState<string | null>(null)
  const [showNatal,    setShowNatal]    = useState(true)
  const [showTransits, setShowTransits] = useState(true)
  const [showCrossAspects, setShowCrossAspects] = useState(true)
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

  // Visibility filter (e.g. the Positions page's "Classical/Modern/Asteroids/Nodes"
  // groups) — applies to the natal ring and to any aspect whose either end is
  // hidden. The transit/overlay ring uses its own filter if given separately (the
  // Compare Charts page needs independent per-chart toggles), else falls back to
  // the same set. Houses/lots aren't planets and are unaffected.
  const isHidden         = (cn: string) => hiddenPlanets?.has(cn) ?? false
  const isHiddenInTransit = (cn: string) => (hiddenTransitPlanets ?? hiddenPlanets)?.has(cn) ?? false
  const visiblePlanets  = hiddenPlanets ? planets.filter(p => !isHidden(p.planet.canonicalName)) : planets
  const visibleAspects  = hiddenPlanets ? aspects.filter(a => !isHidden(a.planet1.canonicalName) && !isHidden(a.planet2.canonicalName)) : aspects
  const visibleTransitPlanets = (hiddenTransitPlanets ?? hiddenPlanets) && transitChart
    ? transitChart.planets.filter(p => !isHiddenInTransit(p.planet.canonicalName))
    : transitChart?.planets

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
        {showNatal && visibleAspects.map((asp, i) => {
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

        {/* ── Overlay chart's own aspect lines — like its house ring, only drawn when
             the overlay is being treated as a real chart of its own (Compare Charts),
             not an actual transiting moment (whose own internal aspects aren't what a
             transit overlay is for). Same shared aspect circle as the natal ring's,
             coloured to match the overlay's other markers. */}
        {overlayEqualWeight && showTransits && transitChart && visibleTransitPlanets && (() => {
          const visibleTransitCNs = new Set(visibleTransitPlanets.map(p => p.planet.canonicalName))
          return transitChart.aspects
            .filter(asp => visibleTransitCNs.has(asp.planet1.canonicalName) && visibleTransitCNs.has(asp.planet2.canonicalName))
            .map((asp, i) => {
              const p1 = transitChart.planets.find(p => p.planet.name === asp.planet1.name)
              const p2 = transitChart.planets.find(p => p.planet.name === asp.planet2.name)
              if (!p1 || !p2) return null
              const [x1, y1] = polar(lonToSvgAngle(p1.longitude, asc), rAspect)
              const [x2, y2] = polar(lonToSvgAngle(p2.longitude, asc), rAspect)
              const isHov    = hovered === 't:' + asp.planet1.name || hovered === 't:' + asp.planet2.name
              return (
                <line key={'ta:' + i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={TRANSIT_ASPECT_COLORS[asp.type] ?? TRANSIT_COLOR}
                  strokeWidth={isHov ? 1.5 : 0.7} opacity={isHov ? 0.9 : 0.4} />
              )
            })
        })()}

        {/* ── Cross-chart aspect lines — aspects *between* the two charts (e.g. Compare
             Charts synastry), kept visually distinct from either chart's own aspects
             via a third colour family and its own independent visibility toggle. */}
        {showCrossAspects && crossAspects && crossAspects.length > 0 && (() => {
          return crossAspects
            .filter(asp => !isHidden(asp.planet1.canonicalName) && !isHiddenInTransit(asp.planet2.canonicalName))
            .map((asp, i) => {
              const p1 = planets.find(p => p.planet.name === asp.planet1.name)
              const p2 = transitChart?.planets.find(p => p.planet.name === asp.planet2.name)
              if (!p1 || !p2) return null
              const [x1, y1] = polar(lonToSvgAngle(p1.longitude, asc), rAspect)
              const [x2, y2] = polar(lonToSvgAngle(p2.longitude, asc), rAspect)
              const isHov    = hovered === 'n:' + asp.planet1.name || hovered === 't:' + asp.planet2.name
              return (
                <line key={'xa:' + i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={CROSS_ASPECT_COLORS[asp.type] ?? CROSS_COLOR}
                  strokeWidth={isHov ? 1.5 : 0.7} opacity={isHov ? 0.9 : 0.4} />
              )
            })
        })()}

        {/* Aspect circle */}
        <circle cx={CX} cy={CY} r={rAspect} fill="none" stroke="var(--color-border)" strokeWidth="0.3" strokeDasharray="2,4" />

        {/* ── Natal planet glyphs ── */}
        {showNatal && visiblePlanets.map(pos => {
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
        {showTransits && transitChart && visibleTransitPlanets?.map(pos => {
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
                fontSize={overlayEqualWeight ? glyphSize(isHov) : (isHov ? 13 : 11)}
                fill={TRANSIT_COLOR} opacity={overlayEqualWeight ? 1 : (isHov ? 1 : 0.8)}
                style={{ userSelect: 'none', transition: 'font-size 0.1s' }}>
                {pos.planet.symbol}
              </text>
              {pos.retrograde && (
                <text x={px + (overlayEqualWeight && isRings ? 10 : 6)} y={py - (overlayEqualWeight && isRings ? 9 : 5)}
                  fontSize={overlayEqualWeight ? (isRings ? 9 : 8) : 7} fill={TRANSIT_COLOR} opacity={overlayEqualWeight ? 0.8 : 0.7}
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

        {/* ── Overlay chart's own house axis + cardinal points — the natal ring's ASC/
             MC/etc. above are fixed screen positions only because the whole wheel is
             rotated to put *this chart's* ascendant at 9 o'clock; the overlay chart's
             angles are wherever they actually fall relative to that rotation, so its
             labels have to be positioned dynamically instead. Only meaningful once
             the overlay is being treated as a real chart of its own (Compare Charts),
             not an actual transiting moment, which has no house wheel of its own here. */}
        {overlayEqualWeight && transitChart && transitChart.houses.cusps.length > 0 && (() => {
          const tCusps = transitChart.houses.cusps
          const CARDINALS: [number, string][] = [[0, 'ASC'], [3, 'IC'], [6, 'DSC'], [9, 'MC']]
          return (
            <React.Fragment>
              {CARDINALS.map(([i]) => {
                const angle    = lonToSvgAngle(tCusps[i], asc)
                const [x1, y1] = polar(angle, R_HOUSE_INNER)
                const [x2, y2] = polar(angle, rAspect - 10)
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={TRANSIT_COLOR} strokeWidth="0.8" strokeDasharray="3,3" opacity={0.7} />
              })}
              {CARDINALS.map(([i, label]) => {
                const angle   = lonToSvgAngle(tCusps[i], asc)
                const [x, y]  = polar(angle, rAspect + 6)
                return (
                  <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                    fontSize={9} fill={TRANSIT_COLOR} opacity={0.8} style={{ userSelect: 'none' }}>
                    {label}
                  </text>
                )
              })}
            </React.Fragment>
          )
        })()}
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
            <button onClick={() => setShowNatal(v => !v)} style={toggleStyle(showNatal)}>☉ {natalLabel}</button>
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
              ☿ {transitLabel}
            </button>
          )}
          {crossAspects && crossAspects.length > 0 && (
            <button onClick={() => setShowCrossAspects(v => !v)}
              style={{ ...toggleStyle(showCrossAspects), borderColor: showCrossAspects ? CROSS_COLOR + '80' : 'var(--color-border)', color: showCrossAspects ? CROSS_COLOR : 'var(--color-text-subtle)', background: showCrossAspects ? CROSS_COLOR + '18' : 'transparent' }}>
              ⇄ Cross
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
            date={date}
            transitDate={transitDate}
            overlayLabel={overlayLabel}
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
  hovered, planets, lots, transitChart, date, transitDate, overlayLabel = 'transit', mode, onNavigate,
}: {
  hovered: string | null
  planets: NatalChartData['planets']
  lots: NatalChartData['lots']
  transitChart?: NatalChartData
  date?: Date
  transitDate?: Date
  overlayLabel?: string
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
  // Transit is definitionally "right now" regardless of what `date` (the primary
  // chart's own moment) is set to; the natal/current-sky ring needs `date` passed in.
  const moonPhase = pos.planet.name === 'Luna' && (isTransit || date)
    ? getMoonPhase(isTransit ? (transitDate ?? new Date()) : date!)
    : null
  return (
    <div style={TOOLTIP_BASE_STYLE}>
      <div>
        {isTransit && <span style={{ color: TRANSIT_COLOR, marginRight: '6px', fontSize: '10px' }}>{overlayLabel}</span>}
        {pos.planet.symbol} {pos.planet.name} — {pos.degree}°{String(pos.minutes).padStart(2, '0')}′ {sign?.symbol} {sign?.name}
        {pos.retrograde && <span style={{ color: 'var(--color-danger)', marginLeft: '6px' }}>℞</span>}
        {onNavigate && <span style={{ color: 'var(--color-accent)', marginLeft: '8px', fontSize: '10px' }}>→ Reference</span>}
      </div>
      {moonPhase && (
        <div
          role={onNavigate ? 'button' : undefined} tabIndex={onNavigate ? 0 : undefined}
          style={{ marginTop: '2px', color: 'var(--color-text-subtle)', cursor: onNavigate ? 'pointer' : 'default', pointerEvents: onNavigate ? 'auto' : 'none' }}
          onClick={() => onNavigate?.(moonPhase.canonicalName)}
        >
          {moonPhase.emoji} {moonPhase.name} · {moonPhase.illumination}% lit
        </div>
      )}
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
  hoveredKey, chart, date, mode = 'tropical', onNavigate, style,
}: {
  hoveredKey: string
  chart: NatalChartData
  /** The moment `chart` represents — see WheelChartProps.date. Only used for the
   * Moon's phase, shown as a second tooltip line. */
  date?: Date
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
  const moonPhase = pos.planet.name === 'Luna' && date ? getMoonPhase(date) : null
  return (
    <div style={base}>
      <div>
        {pos.planet.symbol} {pos.planet.name} — {pos.degree}°{String(pos.minutes).padStart(2, '0')}′ {sign?.symbol} {sign?.name}
        {pos.retrograde && <span style={{ color: 'var(--color-danger)', marginLeft: '6px' }}>℞</span>}
        {onNavigate && <span style={{ color: 'var(--color-accent)', marginLeft: '8px', fontSize: '10px' }}>→ Reference</span>}
      </div>
      {moonPhase && (
        <div
          role={onNavigate ? 'button' : undefined} tabIndex={onNavigate ? 0 : undefined}
          style={{ marginTop: '2px', color: 'var(--color-text-subtle)', cursor: onNavigate ? 'pointer' : 'default', pointerEvents: onNavigate ? 'auto' : 'none' }}
          onClick={() => onNavigate?.(moonPhase.canonicalName)}
        >
          {moonPhase.emoji} {moonPhase.name} · {moonPhase.illumination}% lit
        </div>
      )}
    </div>
  )
}
