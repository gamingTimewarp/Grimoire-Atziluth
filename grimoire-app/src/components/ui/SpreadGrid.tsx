/**
 * SpreadGrid.tsx
 * Renders a spread's positions as a spatial grid.
 * Works from any card source — accepts a generic CardSlot[] so both the
 * draw screen and journal can reuse it without coupling to store types.
 */

import React, { useLayoutEffect, useRef, useState } from 'react'
import type { SpreadPosition, BaseEntity } from '@grimoire/core'
import type { CardOrientation } from '@grimoire/core'
import type { ReversedDisplay } from '@/lib/accessibility-store'
import { EntityArt } from './EntityArt'

export interface CardSlot {
  positionId: string
  label: string
  orientation: CardOrientation
  /** canonicalName of the entity — enables click-to-reference navigation. */
  canonicalName?: string
  /** Full entity object — enables EntityArt rendering. */
  entity?: BaseEntity
}

interface SpreadGridProps {
  positions: SpreadPosition[]
  cards: CardSlot[]
  /** Highlight this position as the one currently being drawn. */
  currentPositionId?: string | null
  /** Scale factor — defaults to 1. Use 0.6–0.8 for compact journal view. */
  scale?: number
  /** Called when a filled card slot is clicked. */
  onCardClick?: (canonicalName: string) => void
  /** Show card name as a visible caption overlaid on each filled slot. */
  showCaptions?: boolean
  /**
   * How reversed cards are displayed.
   * 'rotated' (default) = art rendered 180°; 'badge' = small ↓ Rev overlay.
   */
  reversedDisplay?: ReversedDisplay
}

const BASE_W = 88
const BASE_H = 140
const BASE_GAP = 8

export function SpreadGrid({
  positions, cards, currentPositionId, scale = 1, onCardClick,
  showCaptions, reversedDisplay = 'rotated',
}: SpreadGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState<number>(9999)

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

  if (!positions.length) return null

  const xs = positions.map(p => p.x)
  const ys = positions.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const cols = maxX - minX + 1
  const rows = maxY - minY + 1

  // Cap scale so the grid never exceeds the measured container width
  const naturalWidth = cols * BASE_W + (cols - 1) * BASE_GAP
  const effectiveScale = naturalWidth > containerWidth
    ? Math.min(scale, containerWidth / naturalWidth)
    : scale

  const W = Math.round(BASE_W * effectiveScale)
  const H = Math.round(BASE_H * effectiveScale)
  const GAP = Math.round(BASE_GAP * effectiveScale)

  const slotByPosition = new Map(cards.map(c => [c.positionId, c]))

  // Group positions by (x,y) cell to handle z-layering (e.g. Celtic Cross crossing card)
  const cellMap = new Map<string, SpreadPosition[]>()
  for (const pos of positions) {
    const key = `${pos.x},${pos.y}`
    cellMap.set(key, [...(cellMap.get(key) ?? []), pos])
  }

  return (
    <div ref={containerRef} style={{ width: '100%', overflowX: 'auto', overflowY: 'visible' }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, ${W}px)`,
      gridTemplateRows: `repeat(${rows}, ${H}px)`,
      gap: `${GAP}px`,
      width: 'fit-content',
    }}>
      {Array.from(cellMap.entries()).map(([key, cellPositions]) => {
        const [xStr, yStr] = key.split(',')
        const col = parseInt(xStr) - minX + 1
        const row = parseInt(yStr) - minY + 1

        return (
          <div key={key} style={{ gridColumn: col, gridRow: row, position: 'relative', width: W, height: H }}>
            {cellPositions.sort((a, b) => a.z - b.z).map((pos, zIdx) => {
              const slot = slotByPosition.get(pos.id)
              const isCurrent = pos.id === currentPositionId
              const isCrossing = pos.z > 0

              // Crossing card: render horizontally (H wide × W tall), centered over base cell.
              const cW = isCrossing ? H : W
              const cH = isCrossing ? W : H
              const offsetTop  = isCrossing ? (H - W) / 2 : 0
              const offsetLeft = isCrossing ? (W - H) / 2 : 0

              const wrapStyle: React.CSSProperties = isCrossing
                ? { position: 'absolute', top: offsetTop, left: offsetLeft, zIndex: zIdx + 1 }
                : { position: 'relative', zIndex: zIdx }

              if (!slot) {
                // Empty slot placeholder
                return (
                  <div key={pos.id} style={wrapStyle}>
                    <div style={{
                      width: cW, height: cH,
                      border: `1px dashed ${isCurrent ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      borderRadius: '6px',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      background: isCurrent ? 'rgba(196,146,42,0.05)' : 'transparent',
                      // Empty slots must not block clicks on filled cards beneath them
                      pointerEvents: 'none',
                    }}>
                      <div style={{
                        fontSize: `${Math.round(10 * scale)}px`,
                        color: isCurrent ? 'var(--color-accent)' : 'var(--color-text-subtle)',
                        textAlign: 'center', padding: '4px',
                      }}>
                        {pos.name}
                      </div>
                    </div>
                  </div>
                )
              }

              // Filled slot — build the inner art element
              const isReversed   = slot.orientation === 'reversed'
              const rotateArt    = isReversed && reversedDisplay !== 'badge'
              const showBadge    = isReversed && reversedDisplay === 'badge'

              const artEl = slot.entity
                ? <EntityArt entity={slot.entity} width={cW} height={cH} />
                : <div style={{
                    width: cW, height: cH,
                    background: 'var(--color-surface-3)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', color: 'var(--color-text-muted)',
                    textAlign: 'center', padding: '6px',
                  }}>{slot.label}</div>

              const artWrapper = rotateArt
                ? <div style={{ width: cW, height: cH, transform: 'rotate(180deg)', display: 'block', flexShrink: 0 }}>{artEl}</div>
                : artEl

              const overlays = (
                <>
                  {showBadge && (
                    <div style={{
                      position: 'absolute',
                      bottom: showCaptions ? '18px' : '3px',
                      right: '3px',
                      fontSize: '9px', color: 'var(--color-accent)',
                      background: 'rgba(0,0,0,0.7)', padding: '1px 4px', borderRadius: '3px',
                    }}>
                      ↓ Rev
                    </div>
                  )}
                  {showCaptions && (
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'rgba(0,0,0,0.75)', color: 'var(--color-text)',
                      fontSize: `${Math.round(9 * scale)}px`, textAlign: 'center',
                      padding: '2px 4px',
                      borderBottomLeftRadius: '6px', borderBottomRightRadius: '6px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {slot.label}
                    </div>
                  )}
                </>
              )

              return (
                <div key={pos.id} style={wrapStyle}>
                  {slot.canonicalName && onCardClick ? (
                    <button
                      type="button"
                      aria-label={`View ${slot.label} in Reference`}
                      onClick={() => onCardClick(slot.canonicalName!)}
                      style={{ position: 'relative', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                    >
                      {artWrapper}
                      {overlays}
                    </button>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      {artWrapper}
                      {overlays}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
    </div>
  )
}
