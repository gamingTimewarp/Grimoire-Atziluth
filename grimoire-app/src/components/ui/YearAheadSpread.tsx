/**
 * YearAheadSpread.tsx
 * Circular 12-card spread display for the Year Ahead reading.
 *
 * Position IDs are `month-0`…`month-11` (abstract slots); actual month names
 * are derived at render time from the `startDate` prop, which defaults to
 * today. Passing `startDate={new Date(reading.readingDate)}` in the journal
 * reconstructs the correct month labels.
 *
 * Cards are arranged in a clock-face circle starting at 12 o'clock and
 * proceeding clockwise. Each month is colour-coded by season.
 */

import React, { useLayoutEffect, useRef, useState } from 'react'
import { EntityArt } from './EntityArt'
import type { CardSlot } from './SpreadGrid'
import type { CardOrientation } from '@grimoire/core'

// ─── Seasonal colours (by Gregorian month index 0–11) ─────────────────────────
const SEASON_COLOUR: Record<number, string> = {
  0:  '#5090c8',  // January   — winter blue
  1:  '#5090c8',  // February  — winter blue
  2:  '#48a048',  // March     — spring green
  3:  '#48a048',  // April     — spring green
  4:  '#48a048',  // May       — spring green
  5:  '#c89828',  // June      — summer gold
  6:  '#c89828',  // July      — summer gold
  7:  '#c89828',  // August    — summer gold
  8:  '#b85018',  // September — autumn amber
  9:  '#b85018',  // October   — autumn amber
  10: '#b85018',  // November  — autumn amber
  11: '#5090c8',  // December  — winter blue
}

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ─── Geometry ─────────────────────────────────────────────────────────────────
const CARD_W      = 50
const CARD_H      = 80
const CONTAINER   = 600   // square container
const CENTER      = 300
const RADIUS      = 220   // distance from centre to card centre
const STEP_DEG    = 30    // 360 / 12
const START_DEG   = -90   // 12 o'clock

// ─── Component ─────────────────────────────────────────────────────────────────

export interface YearAheadSpreadProps {
  cards: CardSlot[]
  currentPositionId?: string | null
  onCardClick: (canonicalName: string) => void
  /** The month whose index is position `month-0`. Defaults to today. */
  startDate?: Date
  scale?: number
}

export function YearAheadSpreadDisplay({
  cards,
  currentPositionId = null,
  onCardClick,
  startDate,
  scale = 1,
}: YearAheadSpreadProps) {
  const start = startDate ?? new Date()
  const startMonthIndex = start.getMonth()   // 0 = January

  const cardMap = new Map(cards.map(c => [c.positionId, c]))

  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(9999)
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setContainerWidth(w)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  const effectiveScale = containerWidth < CONTAINER ? Math.min(scale, containerWidth / CONTAINER) : scale

  const cw     = Math.round(CARD_W  * effectiveScale)
  const ch     = Math.round(CARD_H  * effectiveScale)
  const totalW = Math.round(CONTAINER * effectiveScale)
  const totalH = Math.round(CONTAINER * effectiveScale)
  const labelSize = Math.max(7, Math.round(9 * effectiveScale))

  return (
    <div ref={containerRef}>
    <div style={{ position: 'relative', width: totalW, height: totalH }}>
      {Array.from({ length: 12 }, (_, i) => {
        const posId      = `month-${i}`
        const monthIndex = (startMonthIndex + i) % 12
        const abbr       = MONTH_ABBR[monthIndex]
        const colour     = SEASON_COLOUR[monthIndex]
        const slot       = cardMap.get(posId)
        const isCurrent  = currentPositionId === posId

        const angleDeg   = START_DEG + i * STEP_DEG
        const angleRad   = angleDeg * (Math.PI / 180)
        const cx         = CENTER + RADIUS * Math.cos(angleRad)
        const cy         = CENTER + RADIUS * Math.sin(angleRad)
        const left       = Math.round((cx - CARD_W / 2) * effectiveScale)
        const top        = Math.round((cy - CARD_H / 2) * effectiveScale)

        return (
          <div
            key={posId}
            style={{ position: 'absolute', left, top, width: cw, textAlign: 'center' }}
          >
            {slot?.canonicalName ? (
              <DrawnCardSlot slot={slot} cw={cw} ch={ch} colour={colour} onCardClick={onCardClick} />
            ) : (
              <EmptySlot cw={cw} ch={ch} colour={colour} isCurrent={isCurrent} />
            )}
            <div style={{
              marginTop: '3px',
              fontSize: `${labelSize}px`,
              color: colour,
              textAlign: 'center',
              pointerEvents: 'none',
              userSelect: 'none',
            }}>
              {abbr}
            </div>
          </div>
        )
      })}
    </div>
    </div>
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
