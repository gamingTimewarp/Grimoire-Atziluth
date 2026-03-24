/**
 * GrandTableauSpread.tsx
 * 9×4 grid display for the Lenormand Grand Tableau (36-card) reading.
 *
 * Position IDs are `house-1` … `house-36`, matching the traditional house
 * numbering. Each house is named after the Lenormand card that "belongs" there.
 *
 * Combination panel: clicking a drawn card selects it and shows its pairings
 * with drawn adjacent cards (horizontal + vertical neighbours). Each pair
 * displays the combination meaning from LENORMAND_COMBINATIONS. Clicking the
 * same card again deselects. Clicking in the panel links to reference.
 */

import React, { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { EntityArt } from './EntityArt'
import type { CardSlot } from './SpreadGrid'
import type { CardOrientation } from '@grimoire/core'
import {
  LENORMAND_COMBINATIONS,
  LENORMAND_CARD_NAMES,
  getLenormandCombination,
  type LenormandCombination,
} from '@/lib/lenormand-combinations'

// ─── House data ────────────────────────────────────────────────────────────────
const HOUSES: Array<{ name: string; meaning: string }> = [
  { name: 'Rider',      meaning: 'News, swift movement, a visitor arriving' },
  { name: 'Clover',     meaning: 'Luck, small opportunity, brief happiness' },
  { name: 'Ship',       meaning: 'Journey, distance, commerce, longing' },
  { name: 'House',      meaning: 'Home, family, property, security' },
  { name: 'Tree',       meaning: 'Health, slow growth, deep roots, life force' },
  { name: 'Clouds',     meaning: 'Uncertainty, confusion, hidden problems' },
  { name: 'Snake',      meaning: 'Desire, complications, a rival or detour' },
  { name: 'Coffin',     meaning: 'Endings, illness, transformation, stagnation' },
  { name: 'Bouquet',    meaning: 'Joy, gifts, beauty, social pleasures' },
  { name: 'Scythe',     meaning: 'Sudden cut, decision, harvest, danger' },
  { name: 'Whip',       meaning: 'Conflict, repetition, discipline, strife' },
  { name: 'Birds',      meaning: 'Worry, chatter, a couple, nervous energy' },
  { name: 'Child',      meaning: 'New beginning, innocence, a child, naivety' },
  { name: 'Fox',        meaning: 'Cunning, caution, work, self-interest' },
  { name: 'Bear',       meaning: 'Strength, authority, finances, a protector' },
  { name: 'Stars',      meaning: 'Hope, guidance, inspiration, long-term vision' },
  { name: 'Stork',      meaning: 'Change, improvement, relocation, transformation' },
  { name: 'Dog',        meaning: 'Loyalty, friendship, a trusted companion' },
  { name: 'Tower',      meaning: 'Solitude, authority, institutions, the ego' },
  { name: 'Garden',     meaning: 'Society, public life, gatherings, networks' },
  { name: 'Mountain',   meaning: 'Obstacles, delay, challenges, opposition' },
  { name: 'Crossroads', meaning: 'Choice, alternatives, freedom, divergence' },
  { name: 'Mice',       meaning: 'Loss, anxiety, gradual depletion, worry' },
  { name: 'Heart',      meaning: 'Love, emotion, desire, kindness' },
  { name: 'Ring',       meaning: 'Commitment, cycles, contracts, partnership' },
  { name: 'Book',       meaning: 'Secrets, hidden knowledge, study, mystery' },
  { name: 'Letter',     meaning: 'Written communication, documents, messages' },
  { name: 'Man',        meaning: 'A man significant to the querent or reading' },
  { name: 'Woman',      meaning: 'A woman significant to the querent or reading' },
  { name: 'Lily',       meaning: 'Maturity, peace, sensuality, an older person' },
  { name: 'Sun',        meaning: 'Success, vitality, clarity, happiness' },
  { name: 'Moon',       meaning: 'Emotions, intuition, recognition, the unconscious' },
  { name: 'Key',        meaning: 'Certainty, solution, destiny, access' },
  { name: 'Fish',       meaning: 'Abundance, finances, independence, flow' },
  { name: 'Anchor',     meaning: 'Stability, security, perseverance, holding fast' },
  { name: 'Cross',      meaning: 'Burden, fate, suffering, duty, the unavoidable' },
]

// ─── Geometry ─────────────────────────────────────────────────────────────────
const COLS   = 9
const CARD_W = 56
const CARD_H = 88
const GAP    = 5

// ─── Adjacency ────────────────────────────────────────────────────────────────
/** Returns house numbers adjacent (horiz + vert) to the given house number (1-indexed). */
function getAdjacentHouseNums(n: number): number[] {
  const col = (n - 1) % COLS
  const adj: number[] = []
  if (col > 0)      adj.push(n - 1)       // left
  if (col < COLS-1) adj.push(n + 1)       // right
  if (n > COLS)     adj.push(n - COLS)    // up
  if (n <= 36-COLS) adj.push(n + COLS)    // down
  return adj
}

// ─── Component ─────────────────────────────────────────────────────────────────

export interface GrandTableauSpreadProps {
  cards: CardSlot[]
  currentPositionId?: string | null
  onCardClick: (canonicalName: string) => void
  scale?: number
  /** When provided, enables the combination panel on card click. */
  combinations?: LenormandCombination[]
}

export function GrandTableauSpreadDisplay({
  cards,
  currentPositionId = null,
  onCardClick,
  scale = 1,
  combinations,
}: GrandTableauSpreadProps) {
  const [selectedHouseNum, setSelectedHouseNum] = useState<number | null>(null)
  const navigate = useNavigate()

  const cardMap   = new Map(cards.map(c => [c.positionId, c]))
  const cw        = Math.round(CARD_W * scale)
  const ch        = Math.round(CARD_H * scale)
  const gap       = Math.round(GAP    * scale)
  const numSize   = Math.max(9, Math.round(11 * scale))

  // Map house number → Lenormand card number (from entity extendedData)
  const houseToCardNum = new Map<number, number>()
  for (const [posId, slot] of cardMap) {
    if (slot.canonicalName && posId.startsWith('house-')) {
      const houseNum = parseInt(posId.slice(6))
      const cardNum = (slot.entity?.extendedData as Record<string, unknown> | undefined)?.cardNumber
      if (typeof cardNum === 'number') houseToCardNum.set(houseNum, cardNum)
    }
  }

  const showCombinations = !!combinations

  const handleCellClick = (houseNum: number, canonicalName: string) => {
    if (showCombinations) {
      setSelectedHouseNum(prev => prev === houseNum ? null : houseNum)
    } else {
      onCardClick(canonicalName)
    }
  }

  // Build combination panel data
  const comboPanelRows = (() => {
    if (!showCombinations || selectedHouseNum === null) return []
    const selCardNum = houseToCardNum.get(selectedHouseNum)
    if (!selCardNum) return []
    return getAdjacentHouseNums(selectedHouseNum)
      .filter(n => houseToCardNum.has(n))
      .map(adjHouseNum => {
        const adjCardNum = houseToCardNum.get(adjHouseNum)!
        const adjSlot = cardMap.get(`house-${adjHouseNum}`)
        const meaning = getLenormandCombination(selCardNum, adjCardNum, combinations)
        return { adjHouseNum, adjCardNum, adjSlot, meaning }
      })
  })()

  const selectedSlot = selectedHouseNum ? cardMap.get(`house-${selectedHouseNum}`) : null
  const selectedCardNum = selectedHouseNum ? houseToCardNum.get(selectedHouseNum) : undefined

  return (
    <div>
      {/* Outer wrapper allows horizontal scrolling on narrow viewports */}
      <div style={{ overflowX: 'auto', flexShrink: 0 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, ${cw}px)`,
          gap: `${gap}px`,
          width: 'fit-content',
        }}>
          {HOUSES.map((house, i) => {
            const houseNum  = i + 1
            const posId     = `house-${houseNum}`
            const slot      = cardMap.get(posId)
            const isCurrent = currentPositionId === posId
            const isSelected = showCombinations && selectedHouseNum === houseNum

            return (
              <div
                key={posId}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                {slot?.canonicalName ? (
                  <DrawnCardSlot
                    slot={slot}
                    cw={cw} ch={ch}
                    isCurrent={isCurrent}
                    isSelected={isSelected}
                    showCombinations={showCombinations}
                    onClick={() => handleCellClick(houseNum, slot.canonicalName!)}
                    onReferenceClick={() => onCardClick(slot.canonicalName!)}
                  />
                ) : (
                  <EmptySlot
                    cw={cw} ch={ch}
                    houseNum={houseNum}
                    isCurrent={isCurrent}
                    numSize={numSize}
                  />
                )}

              </div>
            )
          })}
        </div>
      </div>

      {/* ── Combination panel ─────────────────────────────────────────────── */}
      {showCombinations && selectedHouseNum !== null && selectedSlot && (
        <div style={{
          marginTop: '16px',
          padding: '14px 16px',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div>
              <span style={{ fontWeight: 500, color: 'var(--color-text)', fontSize: '14px' }}>
                {selectedSlot.label}
              </span>
              {selectedCardNum && (
                <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginLeft: '6px' }}>
                  #{selectedCardNum}
                </span>
              )}
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: '10px' }}>
                — combinations with drawn neighbours
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
              <button
                onClick={() => onCardClick(selectedSlot.canonicalName!)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontFamily: 'inherit', fontSize: '12px', padding: 0 }}
              >
                View in Reference →
              </button>
              <button
                onClick={() => navigate({ to: '/reference/lenormand-combinations' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', fontFamily: 'inherit', fontSize: '12px', padding: 0 }}
              >
                All combinations
              </button>
            </div>
          </div>

          {comboPanelRows.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              No drawn cards adjacent to this position.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {comboPanelRows.map(({ adjHouseNum, adjCardNum, adjSlot, meaning }) => (
                <div key={adjHouseNum} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px', alignItems: 'start' }}>
                  <button
                    onClick={() => adjSlot?.canonicalName && onCardClick(adjSlot.canonicalName)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      color: 'var(--color-accent)', fontFamily: 'inherit', fontSize: '13px',
                      fontWeight: 500, textAlign: 'left', whiteSpace: 'nowrap',
                    }}
                  >
                    {adjSlot?.label ?? LENORMAND_CARD_NAMES[adjCardNum]}
                    <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginLeft: '4px', fontWeight: 400 }}>
                      #{adjCardNum}
                    </span>
                  </button>
                  <span style={{ fontSize: '13px', color: meaning ? 'var(--color-text)' : 'var(--color-text-muted)', lineHeight: 1.4 }}>
                    {meaning ?? <em>No combination entry found.</em>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function DrawnCardSlot({
  slot, cw, ch, isCurrent, isSelected, showCombinations, onClick, onReferenceClick,
}: {
  slot: CardSlot; cw: number; ch: number; isCurrent: boolean; isSelected: boolean
  showCombinations: boolean
  onClick: () => void
  onReferenceClick: () => void
}) {
  const isReversed = slot.orientation === ('reversed' as CardOrientation)
  const borderColor = isSelected
    ? 'var(--color-accent)'
    : isCurrent
    ? 'var(--color-accent)'
    : 'var(--color-border)'

  return (
    <div
      style={{ position: 'relative', width: cw, height: ch }}
    >
      <div
        role="button" tabIndex={0}
        onClick={onClick}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
        title={showCombinations ? `${slot.label} — click for combinations` : `View ${slot.label} in Reference`}
        style={{
          position: 'relative', width: cw, height: ch,
          border: `2px solid ${borderColor}`,
          borderRadius: '3px',
          cursor: 'pointer', overflow: 'hidden',
          boxShadow: (isSelected || isCurrent) ? '0 0 8px var(--color-accent)' : '0 0 3px rgba(0,0,0,0.3)',
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
          <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', padding: '3px', textAlign: 'center' }}>
            {slot.label}
          </div>
        )}
        {isReversed && (
          <div style={{
            position: 'absolute', bottom: 2, right: 2,
            fontSize: '8px', color: '#fff',
            background: 'rgba(0,0,0,0.55)',
            padding: '1px 2px', borderRadius: '2px', lineHeight: 1,
            pointerEvents: 'none',
          }}>↓</div>
        )}
      </div>

      {/* Reference link icon — only shown in combination mode, on hover */}
      {showCombinations && (
        <button
          onClick={e => { e.stopPropagation(); onReferenceClick() }}
          title={`View ${slot.label} in Reference`}
          style={{
            position: 'absolute', top: 2, right: 2,
            background: 'rgba(0,0,0,0.55)', border: 'none',
            borderRadius: '2px', cursor: 'pointer',
            color: '#fff', fontSize: '8px', lineHeight: 1,
            padding: '2px 3px', zIndex: 1,
          }}
        >
          ↗
        </button>
      )}
    </div>
  )
}

function EmptySlot({
  cw, ch, houseNum, isCurrent, numSize,
}: {
  cw: number; ch: number; houseNum: number; isCurrent: boolean; numSize: number
}) {
  return (
    <div style={{
      width: cw, height: ch,
      border: `1px dashed ${isCurrent ? 'var(--color-accent)' : 'var(--color-border)'}`,
      borderRadius: '3px',
      background: isCurrent ? 'rgba(196,146,42,0.05)' : 'transparent',
      boxShadow: isCurrent ? '0 0 8px rgba(196,146,42,0.35)' : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'box-shadow 0.25s, background 0.25s',
    }}>
      <span style={{
        fontSize: `${numSize}px`,
        color: isCurrent ? 'var(--color-accent)' : 'var(--color-text-subtle)',
        fontWeight: 300,
        lineHeight: 1,
      }}>
        {houseNum}
      </span>
    </div>
  )
}
