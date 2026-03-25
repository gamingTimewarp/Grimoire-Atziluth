/**
 * ZodiacYearSpread.tsx
 * Circular spread display for the Zodiac Year reading (12 or 13 cards).
 *
 * Position IDs are zodiac-sign canonical names, enabling clickable labels that
 * navigate to each sign's reference page.  Ophiuchus is included automatically
 * when the user's tradition settings use IAU mode.
 *
 * An optional "Show sky" toggle overlays the current WheelChart behind the
 * cards; it lazy-loads the user's self natal chart location on first use,
 * falling back to 51.5°N, -0.1°E if none is found.
 */

import React, { useEffect, useState } from 'react'
import { EntityArt } from './EntityArt'
import type { CardSlot } from './SpreadGrid'
import type { CardOrientation } from '@grimoire/core'
import { WheelChart, WheelChartTooltip } from './WheelChart'
import {
  getSignsForMode,
  getNatalChart,
  getAspects,
  getPlanetPositions,
  IAU_BOUNDARIES,
} from '@/lib/astro-engine'
import type { NatalChartData } from '@/lib/astro-engine'
import { loadTraditionSettings } from '@/lib/tradition-store'
import { listNatalCharts } from '@/lib/natal-db'

// ─── Elemental colours by sign canonical name ─────────────────────────────────
const SIGN_COLOUR: Record<string, string> = {
  // Fire
  'astrology.zodiac-sign.aries':       '#c04818',
  'astrology.zodiac-sign.leo':         '#c04818',
  'astrology.zodiac-sign.sagittarius': '#c04818',
  // Earth
  'astrology.zodiac-sign.taurus':      '#8a6c28',
  'astrology.zodiac-sign.virgo':       '#8a6c28',
  'astrology.zodiac-sign.capricorn':   '#8a6c28',
  // Air
  'astrology.zodiac-sign.gemini':      '#4888c8',
  'astrology.zodiac-sign.libra':       '#4888c8',
  'astrology.zodiac-sign.aquarius':    '#4888c8',
  // Water
  'astrology.zodiac-sign.cancer':      '#2858a8',
  'astrology.zodiac-sign.scorpio':     '#2858a8',
  'astrology.zodiac-sign.pisces':      '#2858a8',
  // Ophiuchus — the serpent-healer, associated with earthly healing
  'astrology.zodiac-sign.ophiuchus':   '#4a8040',
}

// ─── Geometry ─────────────────────────────────────────────────────────────────
const CARD_W    = 50
const CARD_H    = 80
const CONTAINER = 620    // square container
const CENTER    = 310
const RADIUS    = 230    // distance from centre to card centre
const WHEEL_D   = 390    // diameter of wheel underlay; zodiac ring outer (238) → 186px from centre,
                         // leaving a ~44px gap before the card ring at RADIUS=230.
// Angular convention matches WheelChart: ecliptic CCW, cards placed at sign-sector midpoints
// so they align with the sign glyphs rendered at (R_ZODIAC_OUTER+R_ZODIAC_INNER)/2 ≈ 217px.

// ─── Sign midpoint longitudes ─────────────────────────────────────────────────
// For tropical/sidereal: equal 30° sectors, midpoint at (i+0.5)*30.
// For IAU: unequal sectors from IAU_BOUNDARIES; midpoint = (start+end)/2.
// These must match what WheelChart uses for sign-glyph placement:
//   midLon = (lon1 + lon2) / 2  →  lonToSvgAngle(midLon, asc)
function signMidLons(mode: string): number[] {
  if (mode === 'iau') {
    return IAU_BOUNDARIES.map(([start], i) => {
      const end = i + 1 < IAU_BOUNDARIES.length
        ? IAU_BOUNDARIES[i + 1][0]
        : 360 + IAU_BOUNDARIES[0][0]
      return (start + end) / 2
    })
  }
  return Array.from({ length: 12 }, (_, i) => (i + 0.5) * 30)
}

// ─── Component ─────────────────────────────────────────────────────────────────

export interface ZodiacYearSpreadProps {
  cards: CardSlot[]
  currentPositionId?: string | null
  onCardClick: (canonicalName: string) => void
  onLabelClick?: (signCanonicalName: string) => void
  scale?: number
}

export function ZodiacYearSpreadDisplay({
  cards,
  currentPositionId = null,
  onCardClick,
  onLabelClick,
  scale = 1,
}: ZodiacYearSpreadProps) {
  const { astrologyMode, houseSystem } = loadTraditionSettings()
  const signs = getSignsForMode(astrologyMode)

  const [showWheel, setShowWheel]     = useState(true)
  const [skyChart, setSkyChart]       = useState<NatalChartData | null>(null)
  const [wheelHovered, setWheelHovered] = useState<string | null>(null)
  // ascendant ecliptic longitude — used to rotate card positions to match wheel
  const [chartAsc, setChartAsc]   = useState(0)

  // Lazy-load current sky when the wheel is first toggled on
  useEffect(() => {
    if (!showWheel || skyChart) return
    listNatalCharts()
      .then(records => {
        const self = records.find(r => r.isSelf)
        const lat  = self?.birthLat  ?? 51.5
        const lon  = self?.birthLon  ?? -0.1
        const chart = getNatalChart(new Date(), lat, lon, houseSystem, astrologyMode)
        setSkyChart(chart)
        setChartAsc(chart.houses.ascendant)
      })
      .catch(() => {
        // Fallback: planet positions only, equatorial houses
        const planets = getPlanetPositions(new Date(), astrologyMode)
        const chart = { planets, houses: { cusps: [], ascendant: 0, midheaven: 0, system: 'whole-sign' as const }, aspects: getAspects(planets), lots: [] }
        setSkyChart(chart)
        setChartAsc(0)
      })
  }, [showWheel])

  const cardMap  = new Map(cards.map(c => [c.positionId, c]))
  const n        = signs.length                   // 12 or 13
  const midLons  = signMidLons(astrologyMode)
  // Once a sky chart has been loaded, use its ascendant for card placement so the
  // orientation stays stable whether the wheel overlay is shown or hidden.
  const asc = skyChart ? chartAsc : 0

  const cw        = Math.round(CARD_W    * scale)
  const ch        = Math.round(CARD_H    * scale)
  const totalW    = Math.round(CONTAINER * scale)
  const totalH    = Math.round(CONTAINER * scale)
  const wheelSize = Math.round(WHEEL_D   * scale)
  const labelSize = Math.max(7, Math.round(9 * scale))

  const wheelOffset = Math.round(CENTER * scale - WHEEL_D / 2 * scale)

  return (
    <>
    <div style={{ position: 'relative', width: totalW, height: totalH, flexShrink: 0 }}>
      {/* ── Wheel underlay ────────────────────────────────────────────── */}
      {showWheel && skyChart && (
        <div style={{
          position: 'absolute', top: wheelOffset, left: wheelOffset,
          opacity: 0.5,
          zIndex: 0,
        }}>
          <WheelChart
            chart={skyChart}
            size={wheelSize}
            mode={astrologyMode}
            onNavigate={onLabelClick}
            showTooltip={false}
            onHoverChange={setWheelHovered}
          />
        </div>
      )}

      {/* ── Toggle button ─────────────────────────────────────────────── */}
      <button
        onClick={() => setShowWheel(s => !s)}
        title={showWheel ? 'Hide current sky wheel' : 'Show current sky wheel'}
        style={{
          position: 'absolute',
          top: Math.round(4 * scale), right: Math.round(4 * scale),
          zIndex: 10,
          background: showWheel ? 'var(--color-accent-muted)' : 'var(--color-surface-2)',
          border: `1px solid ${showWheel ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderRadius: '4px',
          padding: '3px 8px',
          fontSize: `${Math.max(9, Math.round(10 * scale))}px`,
          color: showWheel ? 'var(--color-accent)' : 'var(--color-text-muted)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          lineHeight: 1.4,
        }}
      >
        {showWheel ? '☽ Sky ✓' : '☽ Sky'}
      </button>

      {/* ── Sign nodes ────────────────────────────────────────────────── */}
      {signs.map((sign, i) => {
        const colour    = SIGN_COLOUR[sign.canonicalName] ?? 'var(--color-border)'
        const slot      = cardMap.get(sign.canonicalName)
        const isCurrent = currentPositionId === sign.canonicalName

        // Match WheelChart exactly: lonToSvgAngle(midLon, asc) = (180 - (midLon - asc)) % 360
        // midLons[i] is the actual sector midpoint (equal 30° steps or IAU boundaries).
        const angleDeg  = ((180 - (midLons[i] - asc)) % 360 + 360) % 360
        const angleRad  = angleDeg * (Math.PI / 180)
        const cx        = CENTER + RADIUS * Math.cos(angleRad)
        const cy        = CENTER + RADIUS * Math.sin(angleRad)
        const left      = Math.round((cx - CARD_W / 2) * scale)
        const top       = Math.round((cy - CARD_H / 2) * scale)

        return (
          <div
            key={sign.canonicalName}
            style={{ position: 'absolute', left, top, width: cw, textAlign: 'center', zIndex: 1 }}
          >
            {slot?.canonicalName ? (
              <DrawnCardSlot slot={slot} cw={cw} ch={ch} colour={colour} onCardClick={onCardClick} />
            ) : (
              <EmptySlot cw={cw} ch={ch} colour={colour} isCurrent={isCurrent} />
            )}

            {/* Sign label — navigates to reference page */}
            <button
              onClick={() => onLabelClick?.(sign.canonicalName)}
              title={onLabelClick ? `View ${sign.name} in Reference` : sign.name}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                width: '100%',
                marginTop: '3px',
                background: 'none', border: 'none', padding: 0,
                fontFamily: 'inherit',
                fontSize: `${labelSize}px`,
                color: onLabelClick ? colour : 'var(--color-text-subtle)',
                cursor: onLabelClick ? 'pointer' : 'default',
                textAlign: 'center',
                transition: 'opacity 0.15s',
                lineHeight: 1.2,
              }}
              onMouseEnter={e => { if (onLabelClick) e.currentTarget.style.opacity = '0.7' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              <span>{sign.symbol}</span>
              <span>{sign.name}</span>
            </button>
          </div>
        )
      })}
    </div>
    {wheelHovered && skyChart && (
      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
        <WheelChartTooltip
          hoveredKey={wheelHovered}
          chart={skyChart}
          mode={astrologyMode}
          onNavigate={onLabelClick}
        />
      </div>
    )}
    </>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function DrawnCardSlot({
  slot, cw, ch, colour, onCardClick,
}: {
  slot: CardSlot; cw: number; ch: number; colour: string
  onCardClick: (cn: string) => void
}) {
  const isReversed = slot.orientation === ('reversed' as CardOrientation)
  return (
    <div
      role="button" tabIndex={0}
      onClick={() => onCardClick(slot.canonicalName!)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onCardClick(slot.canonicalName!) }}
      title={`View ${slot.label} in Reference`}
      style={{
        position: 'relative', width: cw, height: ch,
        border: `2px solid ${colour}`, borderRadius: '4px',
        cursor: 'pointer', overflow: 'hidden',
        boxShadow: `0 0 6px ${colour}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-surface-2)',
      }}
    >
      {slot.entity ? (
        <div style={{ width: cw, height: ch, transform: isReversed ? 'rotate(180deg)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EntityArt entity={slot.entity} width={cw} height={ch} />
        </div>
      ) : (
        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', padding: '4px', textAlign: 'center' }}>
          {slot.label}
        </div>
      )}
      {isReversed && (
        <div style={{ position: 'absolute', bottom: 2, right: 2, fontSize: '9px', color: '#fff', background: 'rgba(0,0,0,0.55)', padding: '1px 3px', borderRadius: '2px', lineHeight: 1, pointerEvents: 'none' }}>↓</div>
      )}
    </div>
  )
}

function EmptySlot({ cw, ch, colour, isCurrent }: { cw: number; ch: number; colour: string; isCurrent: boolean }) {
  return (
    <div style={{
      width: cw, height: ch,
      border: `2px dashed ${colour}`, borderRadius: '4px',
      background: isCurrent ? `${colour}18` : 'var(--color-surface-1)',
      boxShadow: isCurrent ? `0 0 10px ${colour}70` : 'none',
      transition: 'box-shadow 0.25s, background 0.25s',
    }} />
  )
}
