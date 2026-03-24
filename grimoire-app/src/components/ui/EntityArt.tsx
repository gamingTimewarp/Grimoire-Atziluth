/**
 * EntityArt.tsx
 * Renders art for divination entities — tarot, runes, geomancy, mahjong, lenormand.
 *
 * Dispatches to Symbolic (programmatic) or Classic (image file) renderers based
 * on the user's art pack settings. Classic always falls back to Symbolic when the
 * image file is absent (assets are a separate download pass).
 */

import React, { useState } from 'react'
import type { BaseEntity } from '@grimoire/core'
import { loadArtSettings, artGroupForEntityType, imagePackArtUrl, isSymbolicPack } from '@/lib/art-store'
import type { ArtGroup, ArtPackId } from '@/lib/art-store'

// ─── Main component ────────────────────────────────────────────────────────────

export function EntityArt({
  entity,
  width = 120,
  height = 200,
}: {
  entity: BaseEntity
  width?: number
  height?: number
}) {
  const group = artGroupForEntityType(entity.entityType, entity.canonicalName)

  if (!group) {
    // Try entity types with distinct symbolic renderers but no art pack
    if (entity.entityType === 'iching.hexagram')       return <HexagramSymbolic entity={entity} width={width} height={height} />
    if (entity.entityType === 'astrology.zodiac-sign') return <ZodiacSignSymbolic entity={entity} width={width} height={height} />
    if (entity.entityType === 'astrology.planet')      return <PlanetSymbolic entity={entity} width={width} height={height} />
    if (entity.entityType === 'letter.hebrew')         return <HebrewLetterSymbolic entity={entity} width={width} height={height} />
    return <GenericSymbolic label={entity.primaryDisplayName} width={width} height={height} />
  }

  const { packByGroup } = loadArtSettings()
  const pack = packByGroup[group] ?? 'symbolic'

  if (!isSymbolicPack(group, pack)) {
    return <ClassicWithFallback entity={entity} group={group} packId={pack} width={width} height={height} />
  }

  return <SymbolicArt entity={entity} group={group} width={width} height={height} />
}

// ─── Classic (image) with Symbolic fallback ────────────────────────────────────

// ─── Hexagram Symbolic ────────────────────────────────────────────────────────
// Uses Unicode CJK hexagram symbols U+4DC0–U+4DFF (King Wen sequence).

function HexagramSymbolic({ entity, width, height }: { entity: BaseEntity; width: number; height: number }) {
  const ed  = entity.extendedData as Record<string, unknown>
  const num = ed.number as number | undefined

  const glyph = (num !== undefined && num >= 1 && num <= 64)
    ? String.fromCodePoint(0x4DBF + num)
    : '䷀'

  return (
    <div style={cardBase(width, height)}>
      <div style={{ fontSize: Math.round(height * 0.38), lineHeight: 1 }}>{glyph}</div>
      <div style={labelStyle(height)}>{entity.primaryDisplayName}</div>
    </div>
  )
}

// ─── Zodiac Sign Symbolic ─────────────────────────────────────────────────────

function ZodiacSignSymbolic({ entity, width, height }: { entity: BaseEntity; width: number; height: number }) {
  const ed     = entity.extendedData as Record<string, unknown>
  const symbol = (ed.symbol as string | undefined) ?? '☿'

  return (
    <div style={cardBase(width, height)}>
      <div style={{ fontSize: Math.round(height * 0.35), lineHeight: 1, color: 'var(--color-accent)' }}>{symbol}</div>
      <div style={labelStyle(height)}>{entity.primaryDisplayName}</div>
    </div>
  )
}

// ─── Planet Symbolic ──────────────────────────────────────────────────────────

function PlanetSymbolic({ entity, width, height }: { entity: BaseEntity; width: number; height: number }) {
  const ed     = entity.extendedData as Record<string, unknown>
  const symbol = (ed.symbol as string | undefined) ?? '✦'

  return (
    <div style={cardBase(width, height)}>
      <div style={{ fontSize: Math.round(height * 0.35), lineHeight: 1, color: 'var(--color-accent)' }}>{symbol}</div>
      <div style={labelStyle(height)}>{entity.primaryDisplayName}</div>
    </div>
  )
}

// ─── Hebrew Letter Symbolic ───────────────────────────────────────────────────

function HebrewLetterSymbolic({ entity, width, height }: { entity: BaseEntity; width: number; height: number }) {
  const ed         = entity.extendedData as Record<string, unknown>
  const letterForm = (ed.letterForm as string | undefined) ?? '?'

  return (
    <div style={cardBase(width, height)}>
      <div style={{
        fontSize: Math.round(height * 0.35), lineHeight: 1,
        fontFamily: '"SBL Hebrew", "Ezra SIL", serif',
        color: 'var(--color-text)',
      }}>
        {letterForm}
      </div>
      <div style={labelStyle(height)}>{entity.primaryDisplayName}</div>
    </div>
  )
}

// ─── Classic (image) with Symbolic fallback ────────────────────────────────────

function ClassicWithFallback({
  entity,
  group,
  packId,
  width,
  height,
}: {
  entity: BaseEntity
  group: ArtGroup
  packId: ArtPackId
  width: number
  height: number
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <SymbolicArt entity={entity} group={group} width={width} height={height} />
  }

  return (
    <img
      src={imagePackArtUrl(group, packId, entity.canonicalName)}
      alt={entity.primaryDisplayName}
      width={width}
      height={height}
      onError={() => setFailed(true)}
      style={{ objectFit: 'contain', borderRadius: '6px', display: 'block' }}
    />
  )
}

// ─── Symbolic dispatcher ───────────────────────────────────────────────────────

function SymbolicArt({
  entity,
  group,
  width,
  height,
}: {
  entity: BaseEntity
  group: ArtGroup
  width: number
  height: number
}) {
  switch (group) {
    case 'tarot':          return <TarotSymbolic entity={entity} width={width} height={height} />
    case 'runes':          return <RuneSymbolic entity={entity} width={width} height={height} />
    case 'geomancy':       return <GeomancySymbolic entity={entity} width={width} height={height} />
    case 'mahjong':        return <MahjongSymbolic entity={entity} width={width} height={height} />
    case 'lenormand':      return <LenormandSymbolic entity={entity} width={width} height={height} />
    case 'playing-cards':  return <PlayingCardSymbolic entity={entity} width={width} height={height} />
  }
}

// ─── Generic fallback ─────────────────────────────────────────────────────────

function GenericSymbolic({ label, width, height }: { label: string; width: number; height: number }) {
  return (
    <div style={cardBase(width, height)}>
      <div style={{ fontSize: Math.round(height * 0.15), opacity: 0.3 }}>✦</div>
      <div style={labelStyle(height)}>{label}</div>
    </div>
  )
}

// ─── Tarot Symbolic ───────────────────────────────────────────────────────────

const SUIT_SYMBOL: Record<string, string> = {
  Wands:     '♣',
  Cups:      '♥',
  Swords:    '♠',
  Pentacles: '♦',
  Coins:     '♦',
  Disks:     '♦',
}

const SUIT_COLOR: Record<string, string> = {
  Wands:     '#d06030',
  Cups:      '#6080d0',
  Swords:    '#90a0b0',
  Pentacles: '#70a050',
  Coins:     '#70a050',
  Disks:     '#70a050',
}

const ROMAN: string[] = [
  '', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI',
]

function TarotSymbolic({ entity, width, height }: { entity: BaseEntity; width: number; height: number }) {
  const ed = entity.extendedData as Record<string, unknown>
  const arcana  = ed.arcana  as string | undefined
  const suit    = ed.suit    as string | null | undefined
  const rank    = ed.rank    as string | undefined
  const cardNum = ed.cardNumber as number | undefined

  const suitKey = suit ?? ''
  const symbol  = SUIT_SYMBOL[suitKey] ?? '✦'
  const color   = SUIT_COLOR[suitKey] ?? 'var(--color-accent)'

  const pad     = Math.round(height * 0.05)
  const fontSize = Math.round(height * 0.11)

  if (arcana === 'major') {
    const roman = (cardNum !== undefined && cardNum >= 0 && cardNum <= 21) ? ROMAN[cardNum] : ''
    return (
      <div style={{ ...cardBase(width, height), justifyContent: 'space-between', padding: pad }}>
        <div style={{ fontSize: Math.round(height * 0.09), color: 'var(--color-accent)', opacity: 0.8, alignSelf: 'flex-start' }}>
          {roman}
        </div>
        <div style={{ fontSize: Math.round(height * 0.18), opacity: 0.25 }}>✦</div>
        <div style={{ fontSize: Math.round(height * 0.075), color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.3, wordBreak: 'break-word' }}>
          {entity.primaryDisplayName}
        </div>
      </div>
    )
  }

  // Minor arcana
  const rankLabel = rank === 'Ace' ? 'A' : (cardNum !== undefined ? String(cardNum) : (rank ?? ''))
  return (
    <div style={{ ...cardBase(width, height), justifyContent: 'space-between', padding: pad }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
        <span style={{ fontSize: Math.round(fontSize * 0.9), color, lineHeight: 1 }}>{symbol}</span>
        <span style={{ fontSize: Math.round(fontSize * 0.75), color: 'var(--color-text-muted)', lineHeight: 1 }}>{rankLabel}</span>
      </div>
      <div style={{ fontSize: Math.round(height * 0.22), color, opacity: 0.35 }}>{symbol}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end' }}>
        <span style={{ fontSize: Math.round(fontSize * 0.75), color: 'var(--color-text-muted)', lineHeight: 1 }}>{rankLabel}</span>
        <span style={{ fontSize: Math.round(fontSize * 0.9), color, lineHeight: 1, transform: 'rotate(180deg)' }}>{symbol}</span>
      </div>
    </div>
  )
}

// ─── Rune Symbolic ────────────────────────────────────────────────────────────

function RuneSymbolic({ entity, width, height }: { entity: BaseEntity; width: number; height: number }) {
  const ed = entity.extendedData as Record<string, unknown>
  const glyph = (ed.runeGlyph as string | undefined)
    ?? entity.secondaryNames.find(n => n.languageTag === 'runic')?.name
    ?? '?'

  return (
    <div style={cardBase(width, height)}>
      <div style={{
        fontSize: Math.round(height * 0.35),
        color: 'var(--color-text)',
        lineHeight: 1,
        fontFamily: '"BabelStone Runic", serif',
      }}>
        {glyph}
      </div>
      <div style={labelStyle(height)}>{entity.primaryDisplayName}</div>
    </div>
  )
}

// ─── Geomancy Symbolic ────────────────────────────────────────────────────────

// Rows top→bottom: Fire, Air, Water, Earth. 1 = single dot (active), 0 = double dot (passive).
const GEOMANCY_PATTERNS: Record<string, [number, number, number, number]> = {
  'geomancy.figure.via':            [1, 1, 1, 1],
  'geomancy.figure.populus':        [0, 0, 0, 0],
  'geomancy.figure.fortuna-major':  [0, 0, 1, 1],
  'geomancy.figure.fortuna-minor':  [1, 1, 0, 0],
  'geomancy.figure.puer':           [1, 0, 1, 1],
  'geomancy.figure.puella':         [1, 1, 0, 1],
  'geomancy.figure.rubeus':         [1, 0, 0, 1],
  'geomancy.figure.albus':          [0, 1, 0, 0],
  'geomancy.figure.amissio':        [0, 1, 1, 0],
  'geomancy.figure.conjunctio':     [0, 1, 0, 1],
  'geomancy.figure.laetitia':       [1, 0, 0, 0],
  'geomancy.figure.tristitia':      [0, 0, 0, 1],
  'geomancy.figure.acquisitio':     [0, 0, 1, 0],
  'geomancy.figure.carcer':         [1, 0, 1, 0],
  'geomancy.figure.caput-draconis': [0, 1, 1, 1],
  'geomancy.figure.cauda-draconis': [1, 1, 1, 0],
}

function GeomancySymbolic({ entity, width, height }: { entity: BaseEntity; width: number; height: number }) {
  const pattern = GEOMANCY_PATTERNS[entity.canonicalName] ?? [0, 0, 0, 0]
  const dotR    = Math.max(3, Math.round(width * 0.07))
  const gap     = dotR * 2.8
  const rowStep = (height * 0.55) / 5
  const startY  = height * 0.18
  const cx      = width / 2

  return (
    <div style={cardBase(width, height)}>
      <svg
        width={width}
        height={Math.round(height * 0.6)}
        style={{ overflow: 'visible' }}
      >
        {pattern.map((active, i) => {
          const cy = startY + (i + 0.5) * rowStep
          if (active === 1) {
            return <circle key={i} cx={cx} cy={cy} r={dotR} fill="var(--color-text)" />
          }
          return (
            <g key={i}>
              <circle cx={cx - gap / 2} cy={cy} r={dotR} fill="var(--color-text)" />
              <circle cx={cx + gap / 2} cy={cy} r={dotR} fill="var(--color-text)" />
            </g>
          )
        })}
      </svg>
      <div style={labelStyle(height)}>{entity.primaryDisplayName}</div>
    </div>
  )
}

// ─── Mahjong Symbolic ─────────────────────────────────────────────────────────

function mahjongUnicode(canonicalName: string): string {
  const name = canonicalName.replace('divination.mahjong-tile.', '')
  const bambooMatch  = name.match(/^bamboo-(\d)$/)
  const wanMatch     = name.match(/^wan-(\d)$/)
  const circleMatch  = name.match(/^circle-(\d)$/)

  if (bambooMatch)  return String.fromCodePoint(0x1F010 + parseInt(bambooMatch[1])  - 1)
  if (wanMatch)     return String.fromCodePoint(0x1F007 + parseInt(wanMatch[1])     - 1)
  if (circleMatch)  return String.fromCodePoint(0x1F019 + parseInt(circleMatch[1])  - 1)

  const windMap: Record<string, number> = {
    'wind-east': 0x1F000, 'wind-south': 0x1F001,
    'wind-west': 0x1F002, 'wind-north': 0x1F003,
  }
  const dragonMap: Record<string, number> = {
    'dragon-red': 0x1F004, 'dragon-green': 0x1F005, 'dragon-white': 0x1F006,
  }
  const flowerMap: Record<string, number> = {
    'flower-plum': 0x1F022, 'flower-orchid': 0x1F023,
    'flower-chrysanthemum': 0x1F024, 'flower-bamboo': 0x1F025,
  }
  const seasonMap: Record<string, number> = {
    'season-spring': 0x1F026, 'season-summer': 0x1F027,
    'season-autumn': 0x1F028, 'season-winter': 0x1F029,
  }

  const cp = windMap[name] ?? dragonMap[name] ?? flowerMap[name] ?? seasonMap[name]
  return cp ? String.fromCodePoint(cp) : '🀫'
}

function MahjongSymbolic({ entity, width, height }: { entity: BaseEntity; width: number; height: number }) {
  const glyph = mahjongUnicode(entity.canonicalName)

  return (
    <div style={cardBase(width, height)}>
      <div style={{ fontSize: Math.round(height * 0.38), lineHeight: 1 }}>{glyph}</div>
      <div style={labelStyle(height)}>{entity.primaryDisplayName}</div>
    </div>
  )
}

// ─── Lenormand Symbolic ───────────────────────────────────────────────────────

function LenormandSymbolic({ entity, width, height }: { entity: BaseEntity; width: number; height: number }) {
  const ed  = entity.extendedData as Record<string, unknown>
  const num = ed.cardNumber as number | undefined

  const pad = Math.round(height * 0.06)

  return (
    <div style={{ ...cardBase(width, height), justifyContent: 'space-between', padding: pad }}>
      <div style={{
        fontSize: Math.round(height * 0.1),
        color: 'var(--color-accent)',
        opacity: 0.7,
        alignSelf: 'flex-start',
        lineHeight: 1,
      }}>
        {num !== undefined ? num : ''}
      </div>
      <div style={{ fontSize: Math.round(height * 0.14), opacity: 0.2 }}>✦</div>
      <div style={{
        fontSize: Math.round(height * 0.08),
        color: 'var(--color-text-muted)',
        textAlign: 'center',
        lineHeight: 1.3,
        wordBreak: 'break-word',
      }}>
        {entity.primaryDisplayName}
      </div>
    </div>
  )
}

// ─── Playing Card Symbolic ────────────────────────────────────────────────────

const PLAYING_SUIT_SYMBOL: Record<string, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
}
const PLAYING_SUIT_COLOR: Record<string, string> = {
  hearts: '#c0404a', diamonds: '#c0404a', clubs: '#2a2a2a', spades: '#2a2a2a',
}

function PlayingCardSymbolic({ entity, width, height }: { entity: BaseEntity; width: number; height: number }) {
  const cn    = entity.canonicalName  // e.g. playing.card.hearts.ace
  const parts = cn.split('.')
  const suit  = parts[2] ?? ''
  const rank  = parts[3] ?? ''

  const symbol  = PLAYING_SUIT_SYMBOL[suit] ?? '?'
  const color   = PLAYING_SUIT_COLOR[suit]  ?? 'var(--color-text)'
  const rankLabel = rank === 'ace' ? 'A' : rank === 'jack' ? 'J' : rank === 'queen' ? 'Q' : rank === 'king' ? 'K' : rank === 'joker-black' ? '🃏' : rank === 'joker-red' ? '🃏' : rank.toUpperCase()

  const pad = Math.round(height * 0.06)
  const fs  = Math.round(height * 0.11)

  if (suit === '') {
    // Joker
    return (
      <div style={{ ...cardBase(width, height), background: '#fff' }}>
        <div style={{ fontSize: Math.round(height * 0.25) }}>🃏</div>
        <div style={{ fontSize: Math.round(height * 0.07), color: '#555' }}>Joker</div>
      </div>
    )
  }

  return (
    <div style={{ ...cardBase(width, height), justifyContent: 'space-between', padding: pad, background: '#fff', border: '1px solid #ddd' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1, color }}>
        <span style={{ fontSize: fs, fontWeight: 700 }}>{rankLabel}</span>
        <span style={{ fontSize: fs * 0.85 }}>{symbol}</span>
      </div>
      <div style={{ fontSize: Math.round(height * 0.3), lineHeight: 1, color, opacity: 0.6 }}>{symbol}</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1, color, transform: 'rotate(180deg)' }}>
        <span style={{ fontSize: fs, fontWeight: 700 }}>{rankLabel}</span>
        <span style={{ fontSize: fs * 0.85 }}>{symbol}</span>
      </div>
    </div>
  )
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

function cardBase(width: number, height: number): React.CSSProperties {
  return {
    width,
    height,
    background: 'var(--color-surface-3)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 6px',
    overflow: 'hidden',
    flexShrink: 0,
  }
}

function labelStyle(height: number): React.CSSProperties {
  return {
    fontSize: Math.max(9, Math.round(height * 0.065)),
    color: 'var(--color-text-muted)',
    textAlign: 'center',
    lineHeight: 1.3,
    wordBreak: 'break-word',
  }
}
