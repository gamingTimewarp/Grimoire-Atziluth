/**
 * TreeOfLifeSpread.tsx
 * Custom spread display for the Tree of Life (10-card) reading.
 *
 * Position IDs are sephira canonical names, which enables:
 *  - Coloured card borders matching the GD Queen Scale colour for each sephira
 *  - Clickable position labels that navigate to the sephira's reference page
 *
 * The component renders its own absolute-positioned layout; it does not use
 * SpreadGrid, as the ToL geometry doesn't map cleanly to a regular integer grid.
 */

import React from 'react'
import { EntityArt } from './EntityArt'
import type { CardSlot } from './SpreadGrid'
import type { CardOrientation } from '@grimoire/core'

// ─── GD Queen Scale colours per sephira ───────────────────────────────────────
// Source: stored gdColour descriptions in sephiroth.json, rendered as hex.
const SEPHIRA_BORDER: Record<string, string> = {
  'qabalah.sephira.kether':    '#e8e8ff',  // Brilliance (near-white)
  'qabalah.sephira.chokmah':   '#6080c8',  // Soft blue
  'qabalah.sephira.binah':     '#c02828',  // Crimson
  'qabalah.sephira.chesed':    '#5020a8',  // Deep violet
  'qabalah.sephira.geburah':   '#d06010',  // Orange
  'qabalah.sephira.tiphareth': '#d4b800',  // Clear yellow
  'qabalah.sephira.netzach':   '#b88800',  // Amber
  'qabalah.sephira.hod':       '#7030b0',  // Violet purple
  'qabalah.sephira.yesod':     '#4030c0',  // Violet
  'qabalah.sephira.malkuth':   '#a07820',  // Yellow (primary of quartered citrine)
}

// ─── Fixed geometry (before scaling) ─────────────────────────────────────────
// cx/cy = centre of card node in the 300×740 coordinate space.
//
// Vertical spacing is chosen so that same-column labels never overlap the card
// below them. Required gap between adjacent cy values in the same column:
//   CARD_H + label_height + margin + breathing = 100 + 13 + 3 + 14 = 130
//
// Changes from the naive layout:
//  • Chesed/Geburah row: 248 → 270  (+22; gap from Chokmah/Binah: 108 → 130)
//  • Tiphareth/Netzach/Hod/Yesod rows: each +22 to preserve relative spacings
//  • Malkuth: +64 total  (gap from Yesod: 88 → 130)
const CARD_W = 62
const CARD_H = 100
const CONTAINER_W = 300
const CONTAINER_H = 740

type NodeDef = { id: string; name: string; cx: number; cy: number }

const TOL_NODES: NodeDef[] = [
  { id: 'qabalah.sephira.kether',    name: 'Kether',    cx: 150, cy: 56  },
  { id: 'qabalah.sephira.chokmah',   name: 'Chokmah',   cx: 256, cy: 140 },
  { id: 'qabalah.sephira.binah',     name: 'Binah',     cx: 44,  cy: 140 },
  { id: 'qabalah.sephira.chesed',    name: 'Chesed',    cx: 256, cy: 270 },
  { id: 'qabalah.sephira.geburah',   name: 'Geburah',   cx: 44,  cy: 270 },
  { id: 'qabalah.sephira.tiphareth', name: 'Tiphareth', cx: 150, cy: 354 },
  { id: 'qabalah.sephira.netzach',   name: 'Netzach',   cx: 256, cy: 444 },
  { id: 'qabalah.sephira.hod',       name: 'Hod',       cx: 44,  cy: 444 },
  { id: 'qabalah.sephira.yesod',     name: 'Yesod',     cx: 150, cy: 526 },
  { id: 'qabalah.sephira.malkuth',   name: 'Malkuth',   cx: 150, cy: 656 },
]

// The 22 traditional paths connecting the sephiroth
const TOL_PATHS: [string, string][] = [
  ['qabalah.sephira.kether',    'qabalah.sephira.chokmah'],
  ['qabalah.sephira.kether',    'qabalah.sephira.binah'],
  ['qabalah.sephira.kether',    'qabalah.sephira.tiphareth'],
  ['qabalah.sephira.chokmah',   'qabalah.sephira.binah'],
  ['qabalah.sephira.chokmah',   'qabalah.sephira.chesed'],
  ['qabalah.sephira.chokmah',   'qabalah.sephira.tiphareth'],
  ['qabalah.sephira.binah',     'qabalah.sephira.geburah'],
  ['qabalah.sephira.binah',     'qabalah.sephira.tiphareth'],
  ['qabalah.sephira.chesed',    'qabalah.sephira.geburah'],
  ['qabalah.sephira.chesed',    'qabalah.sephira.tiphareth'],
  ['qabalah.sephira.chesed',    'qabalah.sephira.netzach'],
  ['qabalah.sephira.geburah',   'qabalah.sephira.tiphareth'],
  ['qabalah.sephira.geburah',   'qabalah.sephira.hod'],
  ['qabalah.sephira.tiphareth', 'qabalah.sephira.netzach'],
  ['qabalah.sephira.tiphareth', 'qabalah.sephira.hod'],
  ['qabalah.sephira.tiphareth', 'qabalah.sephira.yesod'],
  ['qabalah.sephira.netzach',   'qabalah.sephira.hod'],
  ['qabalah.sephira.netzach',   'qabalah.sephira.yesod'],
  ['qabalah.sephira.netzach',   'qabalah.sephira.malkuth'],
  ['qabalah.sephira.hod',       'qabalah.sephira.yesod'],
  ['qabalah.sephira.hod',       'qabalah.sephira.malkuth'],
  ['qabalah.sephira.yesod',     'qabalah.sephira.malkuth'],
]

// ─── Component ─────────────────────────────────────────────────────────────────

export interface TreeOfLifeSpreadProps {
  /** All 10 ToL positions (used to determine draw order / position metadata). */
  cards: CardSlot[]
  /** Currently active position waiting for a card (highlighted). */
  currentPositionId?: string | null
  /** Called when a drawn card is clicked — navigate to its reference page. */
  onCardClick: (canonicalName: string) => void
  /** Called when a sephira label is clicked — navigate to sephira reference page. */
  onLabelClick?: (sephiraCanonicalName: string) => void
  scale?: number
}

export function TreeOfLifeSpreadDisplay({
  cards,
  currentPositionId = null,
  onCardClick,
  onLabelClick,
  scale = 1,
}: TreeOfLifeSpreadProps) {
  const cardMap = new Map(cards.map(c => [c.positionId, c]))
  const nodeMap = new Map(TOL_NODES.map(n => [n.id, n]))

  const cw = Math.round(CARD_W * scale)
  const ch = Math.round(CARD_H * scale)
  const totalW = Math.round(CONTAINER_W * scale)
  const totalH = Math.round(CONTAINER_H * scale)
  const labelSize = Math.max(8, Math.round(10 * scale))

  return (
    <div style={{ position: 'relative', width: totalW, height: totalH, flexShrink: 0 }}>
      {/* ── Path lines ────────────────────────────────────────────────────── */}
      <svg
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        width={totalW}
        height={totalH}
        viewBox={`0 0 ${CONTAINER_W} ${CONTAINER_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {TOL_PATHS.map(([aId, bId]) => {
          const na = nodeMap.get(aId)
          const nb = nodeMap.get(bId)
          if (!na || !nb) return null
          return (
            <line
              key={`${aId}–${bId}`}
              x1={na.cx} y1={na.cy}
              x2={nb.cx} y2={nb.cy}
              stroke="var(--color-border)"
              strokeWidth={1}
              opacity={0.45}
            />
          )
        })}
      </svg>

      {/* ── Pass 1: card slots (rendered first so labels always paint on top) ── */}
      {TOL_NODES.map(node => {
        const color     = SEPHIRA_BORDER[node.id] ?? 'var(--color-border)'
        const slot      = cardMap.get(node.id)
        const isCurrent = currentPositionId === node.id
        const left      = Math.round((node.cx - CARD_W / 2) * scale)
        const top       = Math.round((node.cy - CARD_H / 2) * scale)

        return (
          <div key={node.id} style={{ position: 'absolute', left, top, width: cw }}>
            {slot?.canonicalName ? (
              <DrawnCardSlot slot={slot} cw={cw} ch={ch} color={color} onCardClick={onCardClick} />
            ) : (
              <EmptySlot cw={cw} ch={ch} color={color} isCurrent={isCurrent} />
            )}
          </div>
        )
      })}

      {/* ── Pass 2: labels (rendered after all cards so they're never occluded) ── */}
      {TOL_NODES.map(node => {
        const color     = SEPHIRA_BORDER[node.id] ?? 'var(--color-border)'
        const left      = Math.round((node.cx - CARD_W / 2) * scale)
        const labelTop  = Math.round((node.cy + CARD_H / 2) * scale) + 3

        return (
          <button
            key={`lbl-${node.id}`}
            onClick={() => onLabelClick?.(node.id)}
            title={onLabelClick ? `View ${node.name} in Reference` : node.name}
            style={{
              position: 'absolute',
              left,
              top: labelTop,
              width: cw,
              background: 'none',
              border: 'none',
              padding: 0,
              fontFamily: 'inherit',
              fontSize: `${labelSize}px`,
              color: onLabelClick ? color : 'var(--color-text-subtle)',
              cursor: onLabelClick ? 'pointer' : 'default',
              textAlign: 'center',
              transition: 'opacity 0.15s',
              lineHeight: 1,
            }}
            onMouseEnter={e => { if (onLabelClick) e.currentTarget.style.opacity = '0.7' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            {node.name}
          </button>
        )
      })}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function DrawnCardSlot({
  slot, cw, ch, color, onCardClick,
}: {
  slot: CardSlot
  cw: number
  ch: number
  color: string
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
        border: `2px solid ${color}`,
        borderRadius: '4px',
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: `0 0 6px ${color}55`,
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
  cw, ch, color, isCurrent,
}: {
  cw: number
  ch: number
  color: string
  isCurrent: boolean
}) {
  return (
    <div
      style={{
        width: cw, height: ch,
        border: `2px dashed ${color}`,
        borderRadius: '4px',
        background: isCurrent ? `${color}18` : 'var(--color-surface-1)',
        boxShadow: isCurrent ? `0 0 10px ${color}70` : 'none',
        transition: 'box-shadow 0.25s, background 0.25s',
      }}
    />
  )
}
