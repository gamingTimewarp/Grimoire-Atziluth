/**
 * ChakraSpread.tsx
 * Custom spread display for the Chakra (7-card) reading.
 *
 * Position IDs are chakra canonical names, which enables:
 *  - Coloured card borders matching the traditional chakra colour
 *  - Clickable position labels that navigate to the chakra's reference page
 *
 * Layout: single vertical column, crown at top → root at bottom, with a
 * central sushumna line rendered in SVG behind the cards.
 */

import React from 'react'
import { EntityArt } from './EntityArt'
import type { CardSlot } from './SpreadGrid'
import type { CardOrientation } from '@grimoire/core'

// ─── Traditional chakra colours ───────────────────────────────────────────────
const CHAKRA_COLOUR: Record<string, string> = {
  'chakra.classical.sahasrara':   '#8020c0',  // Violet   — Crown
  'chakra.classical.ajna':        '#3040a8',  // Indigo   — Third Eye
  'chakra.classical.vishuddha':   '#2070d0',  // Blue     — Throat
  'chakra.classical.anahata':     '#28a028',  // Green    — Heart
  'chakra.classical.manipura':    '#c8a800',  // Yellow   — Solar Plexus
  'chakra.classical.svadhisthana':'#e06820',  // Orange   — Sacral
  'chakra.classical.muladhara':   '#cc2222',  // Red      — Root
}

// ─── Fixed geometry (before scaling) ─────────────────────────────────────────
// cx/cy = centre of card node; single column centred in the container.
const CARD_W      = 62
const CARD_H      = 100
const CONTAINER_W = 160
const NODE_CX     = 80   // horizontal centre

const STEP        = 115  // vertical distance between node centres
const FIRST_CY    = 66   // centre of the crown node

// Build the node list crown→root
const CHAKRA_NODES: { id: string; name: string; cy: number }[] = [
  { id: 'chakra.classical.sahasrara',    name: 'Sahasrara',    cy: FIRST_CY + 0 * STEP },
  { id: 'chakra.classical.ajna',         name: 'Ajna',         cy: FIRST_CY + 1 * STEP },
  { id: 'chakra.classical.vishuddha',    name: 'Vishuddha',    cy: FIRST_CY + 2 * STEP },
  { id: 'chakra.classical.anahata',      name: 'Anahata',      cy: FIRST_CY + 3 * STEP },
  { id: 'chakra.classical.manipura',     name: 'Manipura',     cy: FIRST_CY + 4 * STEP },
  { id: 'chakra.classical.svadhisthana', name: 'Svadhisthana', cy: FIRST_CY + 5 * STEP },
  { id: 'chakra.classical.muladhara',    name: 'Muladhara',    cy: FIRST_CY + 6 * STEP },
]

const LAST_CY = CHAKRA_NODES[CHAKRA_NODES.length - 1].cy
const CONTAINER_H = LAST_CY + CARD_H / 2 + 28  // room for label

// ─── Component ─────────────────────────────────────────────────────────────────

export interface ChakraSpreadProps {
  cards: CardSlot[]
  currentPositionId?: string | null
  onCardClick: (canonicalName: string) => void
  onLabelClick?: (chakraCanonicalName: string) => void
  scale?: number
}

export function ChakraSpreadDisplay({
  cards,
  currentPositionId = null,
  onCardClick,
  onLabelClick,
  scale = 1,
}: ChakraSpreadProps) {
  const cardMap = new Map(cards.map(c => [c.positionId, c]))

  const cw       = Math.round(CARD_W      * scale)
  const ch       = Math.round(CARD_H      * scale)
  const totalW   = Math.round(CONTAINER_W * scale)
  const totalH   = Math.round(CONTAINER_H * scale)
  const labelSize = Math.max(8, Math.round(10 * scale))

  // Sushumna line endpoints
  const sushmnaX  = Math.round(NODE_CX   * scale)
  const sushmnaY1 = Math.round(FIRST_CY  * scale)
  const sushmnaY2 = Math.round(LAST_CY   * scale)

  return (
    <div style={{ position: 'relative', width: totalW, height: totalH, flexShrink: 0 }}>
      {/* ── Sushumna (central channel) ──────────────────────────────────── */}
      <svg
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        width={totalW}
        height={totalH}
        viewBox={`0 0 ${CONTAINER_W} ${CONTAINER_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <line
          x1={NODE_CX} y1={sushmnaY1 / scale}
          x2={NODE_CX} y2={sushmnaY2 / scale}
          stroke="var(--color-border)"
          strokeWidth={1}
          opacity={0.4}
        />
      </svg>

      {/* ── Chakra nodes ────────────────────────────────────────────────── */}
      {CHAKRA_NODES.map(node => {
        const colour    = CHAKRA_COLOUR[node.id] ?? 'var(--color-border)'
        const slot      = cardMap.get(node.id)
        const isCurrent = currentPositionId === node.id

        const left = Math.round((NODE_CX - CARD_W / 2) * scale)
        const top  = Math.round((node.cy  - CARD_H / 2) * scale)

        return (
          <div
            key={node.id}
            style={{ position: 'absolute', left, top, width: cw, textAlign: 'center' }}
          >
            {slot?.canonicalName ? (
              <DrawnCardSlot
                slot={slot}
                cw={cw} ch={ch}
                colour={colour}
                onCardClick={onCardClick}
              />
            ) : (
              <EmptySlot
                cw={cw} ch={ch}
                colour={colour}
                isCurrent={isCurrent}
              />
            )}

            {/* Chakra label — navigates to reference page */}
            <button
              onClick={() => onLabelClick?.(node.id)}
              title={onLabelClick ? `View ${node.name} in Reference` : node.name}
              style={{
                display: 'block',
                width: '100%',
                marginTop: '3px',
                background: 'none',
                border: 'none',
                padding: 0,
                fontFamily: 'inherit',
                fontSize: `${labelSize}px`,
                color: onLabelClick ? colour : 'var(--color-text-subtle)',
                cursor: onLabelClick ? 'pointer' : 'default',
                textAlign: 'center',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { if (onLabelClick) e.currentTarget.style.opacity = '0.7' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              {node.name}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function DrawnCardSlot({
  slot, cw, ch, colour, onCardClick,
}: {
  slot: CardSlot
  cw: number
  ch: number
  colour: string
  onCardClick: (cn: string) => void
}) {
  const isReversed = slot.orientation === ('reversed' as CardOrientation)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onCardClick(slot.canonicalName!)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') onCardClick(slot.canonicalName!)
      }}
      title={`View ${slot.label} in Reference`}
      style={{
        position: 'relative',
        width: cw, height: ch,
        border: `2px solid ${colour}`,
        borderRadius: '4px',
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: `0 0 6px ${colour}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-surface-2)',
      }}
    >
      {slot.entity ? (
        <div style={{
          width: cw, height: ch,
          transform: isReversed ? 'rotate(180deg)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <EntityArt entity={slot.entity} width={cw} height={ch} />
        </div>
      ) : (
        <div style={{
          fontSize: '10px', color: 'var(--color-text-muted)',
          padding: '4px', textAlign: 'center',
        }}>
          {slot.label}
        </div>
      )}
      {isReversed && (
        <div style={{
          position: 'absolute', bottom: 2, right: 2,
          fontSize: '9px', color: '#fff',
          background: 'rgba(0,0,0,0.55)',
          padding: '1px 3px', borderRadius: '2px', lineHeight: 1,
          pointerEvents: 'none',
        }}>
          ↓
        </div>
      )}
    </div>
  )
}

function EmptySlot({
  cw, ch, colour, isCurrent,
}: {
  cw: number
  ch: number
  colour: string
  isCurrent: boolean
}) {
  return (
    <div
      style={{
        width: cw, height: ch,
        border: `2px dashed ${colour}`,
        borderRadius: '4px',
        background: isCurrent ? `${colour}18` : 'var(--color-surface-1)',
        boxShadow: isCurrent ? `0 0 10px ${colour}70` : 'none',
        transition: 'box-shadow 0.25s, background 0.25s',
      }}
    />
  )
}
