/**
 * EntityArt.tsx
 * Renders art for divination entities — tarot, runes, geomancy, mahjong, lenormand.
 *
 * Dispatches to Symbolic (programmatic) or Classic (image file) renderers based
 * on the user's art pack settings. Classic always falls back to Symbolic when the
 * image file is absent (assets are a separate download pass).
 */

import React, { useState, useEffect } from 'react'
import type { BaseEntity } from '@grimoire/core'
import { loadArtSettings, artGroupForEntityType, imagePackArtUrl, isSymbolicPack, ART_GROUPS } from '@/lib/art-store'
import type { ArtGroup, ArtPackId } from '@/lib/art-store'
import { getCustomImageFileName, useCustomImageUrl } from '@/lib/custom-art'
import { resolvePackImageUrl } from '@/lib/art-pack-import'

// ─── Main component ────────────────────────────────────────────────────────────

export function EntityArt({
  entity,
  width = 120,
  height = 200,
  hideLabel = false,
  packIdOverride,
}: {
  entity: BaseEntity
  width?: number
  height?: number
  /** Suppresses the entity's name from being rendered/baked into the artwork —
   * for blind visual-recognition quiz questions, where showing the name would
   * give the answer away. Only affects the programmatic Symbolic/Classic
   * renderers; real image-pack photos never included a name to begin with. */
  hideLabel?: boolean
  /** Forces a specific pack id for this render, bypassing the user's globally
   * selected pack for the entity's art group — e.g. Study substitutes a
   * non-symbolic pack when Symbolic is selected, since generic per-rank
   * glyphs don't distinguish between decks sharing the same group schema. */
  packIdOverride?: ArtPackId
}) {
  const customImageFile = getCustomImageFileName(entity)
  if (customImageFile) {
    return <CustomImageArt fileName={customImageFile} label={entity.primaryDisplayName} width={width} height={height} />
  }

  const group = artGroupForEntityType(entity.entityType, entity.canonicalName)

  if (!group) {
    // Try entity types with distinct symbolic renderers but no art pack
    if (entity.entityType === 'iching.hexagram')       return <HexagramSymbolic entity={entity} width={width} height={height} hideLabel={hideLabel} />
    if (entity.entityType === 'astrology.zodiac-sign') return <ZodiacSignSymbolic entity={entity} width={width} height={height} hideLabel={hideLabel} />
    if (entity.entityType === 'astrology.planet')      return <PlanetSymbolic entity={entity} width={width} height={height} hideLabel={hideLabel} />
    if (entity.entityType === 'astrology.node')        return <PlanetSymbolic entity={entity} width={width} height={height} hideLabel={hideLabel} />
    if (entity.entityType === 'astrology.element')     return <ElementSymbolic entity={entity} width={width} height={height} hideLabel={hideLabel} />
    if (entity.entityType === 'letter.hebrew')         return <HebrewLetterSymbolic entity={entity} width={width} height={height} hideLabel={hideLabel} />
    if (entity.entityType === 'colour.colour')         return <ColourSwatchSymbolic entity={entity} width={width} height={height} hideLabel={hideLabel} />
    return <GenericSymbolic label={entity.primaryDisplayName} width={width} height={height} hideLabel={hideLabel} />
  }

  const { packByGroup } = loadArtSettings()
  const pack = packIdOverride ?? packByGroup[group] ?? 'symbolic'

  // A pack id not present in the group's built-in pack list is a custom (user-imported) pack.
  const isBuiltInPack = ART_GROUPS.find(g => g.id === group)?.packs.some(p => p.id === pack) ?? false
  if (!isBuiltInPack) {
    return <CustomPackArt entity={entity} group={group} packId={pack} width={width} height={height} hideLabel={hideLabel} />
  }

  if (!isSymbolicPack(group, pack)) {
    return <ClassicWithFallback entity={entity} group={group} packId={pack} width={width} height={height} hideLabel={hideLabel} />
  }

  return <SymbolicArt entity={entity} group={group} width={width} height={height} hideLabel={hideLabel} />
}

// ─── Custom art pack image (with Symbolic fallback) ────────────────────────────

function CustomPackArt({ entity, group, packId, width, height, hideLabel }: {
  entity: BaseEntity; group: ArtGroup; packId: ArtPackId; width: number; height: number; hideLabel?: boolean
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    setChecked(false)
    resolvePackImageUrl(packId, entity.canonicalName).then(u => {
      if (cancelled) return
      setUrl(u)
      setChecked(true)
    }).catch(() => { if (!cancelled) setChecked(true) })
    return () => { cancelled = true }
  }, [packId, entity.canonicalName])

  if (!checked || !url) {
    return <SymbolicArt entity={entity} group={group} width={width} height={height} hideLabel={hideLabel} />
  }

  if (url.endsWith('.svg')) {
    return <InlineSvg src={url} width={width} height={height} onError={() => setUrl(null)} />
  }

  return (
    <img
      src={url}
      alt={entity.primaryDisplayName}
      width={width}
      height={height}
      onError={() => setUrl(null)}
      style={{ objectFit: 'contain', borderRadius: '6px', display: 'block' }}
    />
  )
}

// ─── Custom entity image ────────────────────────────────────────────────────────

function CustomImageArt({ fileName, label, width, height }: {
  fileName: string; label: string; width: number; height: number
}) {
  const url = useCustomImageUrl(fileName)
  const [failed, setFailed] = useState(false)

  if (failed || !url) {
    return <GenericSymbolic label={label} width={width} height={height} />
  }

  return (
    <img
      src={url}
      alt={label}
      width={width}
      height={height}
      onError={() => setFailed(true)}
      style={{ objectFit: 'contain', borderRadius: '6px', display: 'block' }}
    />
  )
}

// ─── Classic (image) with Symbolic fallback ────────────────────────────────────

// ─── Hexagram Symbolic ────────────────────────────────────────────────────────
// Uses Unicode CJK hexagram symbols U+4DC0–U+4DFF (King Wen sequence).

function HexagramSymbolic({ entity, width, height, hideLabel }: { entity: BaseEntity; width: number; height: number; hideLabel?: boolean }) {
  const ed  = entity.extendedData as Record<string, unknown>
  const num = ed.number as number | undefined

  const glyph = (num !== undefined && num >= 1 && num <= 64)
    ? String.fromCodePoint(0x4DBF + num)
    : '䷀'

  return (
    <div style={cardBase(width, height)}>
      <div style={{ fontSize: Math.round(height * 0.38), lineHeight: 1 }}>{glyph}</div>
      {!hideLabel && <div style={labelStyle(height)}>{entity.primaryDisplayName}</div>}
    </div>
  )
}

// ─── Zodiac Sign Symbolic ─────────────────────────────────────────────────────

function ZodiacSignSymbolic({ entity, width, height, hideLabel }: { entity: BaseEntity; width: number; height: number; hideLabel?: boolean }) {
  const ed     = entity.extendedData as Record<string, unknown>
  const symbol = (ed.symbol as string | undefined) ?? '☿'

  return (
    <div style={cardBase(width, height)}>
      <div style={{ fontSize: Math.round(height * 0.35), lineHeight: 1, color: 'var(--color-accent)' }}>{symbol}</div>
      {!hideLabel && <div style={labelStyle(height)}>{entity.primaryDisplayName}</div>}
    </div>
  )
}

// ─── Planet Symbolic ──────────────────────────────────────────────────────────

const PLANET_TO_METAL: Record<string, string> = {
  'astrology.planet.sol':     'alchemy.metal.gold',
  'astrology.planet.luna':    'alchemy.metal.silver',
  'astrology.planet.mercury': 'alchemy.metal.mercury',
  'astrology.planet.venus':   'alchemy.metal.copper',
  'astrology.planet.mars':    'alchemy.metal.iron',
  'astrology.planet.jupiter': 'alchemy.metal.tin',
  'astrology.planet.saturn':  'alchemy.metal.lead',
}

function PlanetSymbolic({ entity, width, height, hideLabel }: { entity: BaseEntity; width: number; height: number; hideLabel?: boolean }) {
  const metalCN = PLANET_TO_METAL[entity.canonicalName]
  const ed      = entity.extendedData as Record<string, unknown>
  const symbol  = (ed.symbol as string | undefined) ?? '✦'

  return (
    <div style={cardBase(width, height)}>
      {metalCN
        ? <MetalSymbolSvg canonicalName={metalCN} color="var(--color-accent)"
            size={Math.min(Math.round(height * 0.52), height - 38)} />
        : <div style={{ fontSize: Math.round(height * 0.35), lineHeight: 1, color: 'var(--color-accent)' }}>{symbol}</div>
      }
      {!hideLabel && <div style={labelStyle(height)}>{entity.primaryDisplayName}</div>}
    </div>
  )
}

// ─── Hebrew Letter Symbolic ───────────────────────────────────────────────────

function HebrewLetterSymbolic({ entity, width, height, hideLabel }: { entity: BaseEntity; width: number; height: number; hideLabel?: boolean }) {
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
      {!hideLabel && <div style={labelStyle(height)}>{entity.primaryDisplayName}</div>}
    </div>
  )
}

// ─── Colour Swatch Symbolic ───────────────────────────────────────────────────
// Renders the full saturation×value gamut at the colour's representative hue —
// the same SV-square gradient as HsvColorPicker's picker widget, but static and
// filling the entity image slot. That single-hue square is, in effect, every
// shade traditionally called by that colour's name (pale to deep, muted to
// vivid). Achromatic entries (black/white/grey) have no hue and fall back to a
// plain light→dark gradient instead of a tinted square.

function ColourSwatchSymbolic({ entity, width, height, hideLabel }: { entity: BaseEntity; width: number; height: number; hideLabel?: boolean }) {
  const ed  = entity.extendedData as Record<string, unknown>
  const hue = typeof ed.hue === 'number' ? ed.hue : null

  const labelH  = Math.max(18, Math.round(height * 0.11))
  const squareH = height - labelH

  return (
    <div style={{
      width, height,
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid var(--color-border)',
      borderRadius: '6px',
      overflow: 'hidden',
      flexShrink: 0,
      background: 'var(--color-surface-3)',
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        height: squareH,
        background: hue !== null ? `hsl(${hue}, 100%, 50%)` : 'linear-gradient(to bottom, #fff, #000)',
      }}>
        {hue !== null && (
          <>
            {/* saturation: white → transparent (left → right) */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #fff, transparent)' }} />
            {/* value: transparent → black (top → bottom) */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, #000)' }} />
          </>
        )}
      </div>
      {!hideLabel && <div style={{ ...labelStyle(height), padding: '4px 6px 0' }}>{entity.primaryDisplayName}</div>}
    </div>
  )
}

// ─── Inline SVG loader ─────────────────────────────────────────────────────────
// SVGs loaded via <img> are sandboxed and cannot access specialised Unicode fonts
// (e.g. Runic block U+16A0–U+16FF). Fetching and injecting inline lets the SVG
// text elements use the page's full font context.

function InlineSvg({ src, width, height, onError }: {
  src: string; width: number; height: number; onError: () => void
}) {
  const [markup, setMarkup] = useState<string | null>(null)

  useEffect(() => {
    fetch(src)
      .then(r => { if (!r.ok) throw new Error(); return r.text() })
      .then(text => {
        // Strip hardcoded width/height so the SVG fills its container.
        // If the SVG has no viewBox, synthesise one from the original w/h so
        // the internal coordinate system is preserved (otherwise content clips
        // to the top-left corner).
        const wMatch = text.match(/\s+width="([^"]+)"/)
        const hMatch = text.match(/\s+height="([^"]+)"/)
        const hasViewBox = /viewBox=/i.test(text)
        const scaled = text.replace(/<svg([^>]*)>/i, (_, attrs) => {
          let a = attrs.replace(/\s+(width|height)="[^"]*"/g, '')
          if (!hasViewBox && wMatch && hMatch) {
            a += ` viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"`
          }
          return `<svg${a} style="width:100%;height:100%;display:block;">`
        })
        setMarkup(scaled)
      })
      .catch(onError)
  }, [src])

  if (!markup) return null
  return (
    <div
      style={{ width, height, borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}

// ─── Classic (image) with Symbolic fallback ────────────────────────────────────

function ClassicWithFallback({
  entity,
  group,
  packId,
  width,
  height,
  hideLabel,
}: {
  entity: BaseEntity
  group: ArtGroup
  packId: ArtPackId
  width: number
  height: number
  hideLabel?: boolean
}) {
  const [failed, setFailed] = useState(false)

  // Runes: render stone-tablet aesthetic using page fonts instead of SVG text
  // (SVG <text> can't reliably access specialised Unicode fonts like BabelStone Runic)
  if (group === 'runes') {
    return <RuneClassic entity={entity} width={width} height={height} hideLabel={hideLabel} />
  }

  // Alchemy metals: path-based SVG symbols — no Unicode font dependency
  if (group === 'alchemy-metals') {
    return <AlchemyMetalClassic entity={entity} width={width} height={height} hideLabel={hideLabel} />
  }

  if (failed) {
    return <SymbolicArt entity={entity} group={group} width={width} height={height} hideLabel={hideLabel} />
  }

  const url = imagePackArtUrl(group, packId, entity.canonicalName)

  if (url.endsWith('.svg')) {
    return <InlineSvg src={url} width={width} height={height} onError={() => setFailed(true)} />
  }

  return (
    <img
      src={url}
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
  hideLabel,
}: {
  entity: BaseEntity
  group: ArtGroup
  width: number
  height: number
  hideLabel?: boolean
}) {
  switch (group) {
    case 'tarot-rws':
    case 'tarot-tdm':
    case 'tarot-thoth':
    case 'tarot-etteilla':   return <TarotSymbolic entity={entity} width={width} height={height} hideLabel={hideLabel} />
    case 'runes':            return <RuneSymbolic entity={entity} width={width} height={height} hideLabel={hideLabel} />
    case 'geomancy':         return <GeomancySymbolic entity={entity} width={width} height={height} hideLabel={hideLabel} />
    case 'mahjong':          return <MahjongSymbolic entity={entity} width={width} height={height} hideLabel={hideLabel} />
    case 'lenormand':        return <LenormandSymbolic entity={entity} width={width} height={height} hideLabel={hideLabel} />
    case 'playing-cards':    return <PlayingCardSymbolic entity={entity} width={width} height={height} />
    case 'alchemy-metals':   return <AlchemyMetalSymbolic entity={entity} width={width} height={height} hideLabel={hideLabel} />
  }
}

// ─── Generic fallback ─────────────────────────────────────────────────────────

function GenericSymbolic({ label, width, height, hideLabel }: { label: string; width: number; height: number; hideLabel?: boolean }) {
  return (
    <div style={cardBase(width, height)}>
      <div style={{ fontSize: Math.round(height * 0.15), opacity: 0.3 }}>✦</div>
      {!hideLabel && <div style={labelStyle(height)}>{label}</div>}
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

function TarotSymbolic({ entity, width, height, hideLabel }: { entity: BaseEntity; width: number; height: number; hideLabel?: boolean }) {
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
        {!hideLabel && (
          <div style={{ fontSize: Math.round(height * 0.075), color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.3, wordBreak: 'break-word' }}>
            {entity.primaryDisplayName}
          </div>
        )}
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

// ─── Rune stroke glyphs ────────────────────────────────────────────────────────
// Each rune is defined as [x1,y1,x2,y2] line segments in a 24×36 viewBox.
// Font-independent: no Unicode coverage required.

type RuneSeg = [number, number, number, number]

const RUNE_STROKES: Record<string, RuneSeg[]> = {
  'rune.elder-futhark.fehu':     [[12,2,12,34],[12,11,20,4],[12,20,20,13]],
  'rune.elder-futhark.uruz':     [[6,2,6,34],[6,2,18,14],[18,14,18,34]],
  'rune.elder-futhark.thurisaz': [[12,2,12,34],[12,12,20,18],[12,24,20,18]],
  'rune.elder-futhark.ansuz':    [[12,2,12,34],[12,10,20,16],[12,19,20,25]],
  'rune.elder-futhark.raidho':   [[9,2,9,34],[9,2,17,10],[17,10,9,19],[9,19,17,34]],
  'rune.elder-futhark.kenaz':    [[8,8,16,18],[8,28,16,18]],
  'rune.elder-futhark.gebo':     [[5,4,19,32],[19,4,5,32]],
  'rune.elder-futhark.wunjo':    [[9,2,9,34],[9,2,17,10],[17,10,9,18]],
  'rune.elder-futhark.hagalaz':  [[7,2,7,34],[17,2,17,34],[7,10,17,26]],
  'rune.elder-futhark.nauthiz':  [[12,2,12,34],[4,8,20,28]],
  'rune.elder-futhark.isa':      [[12,2,12,34]],
  'rune.elder-futhark.jera':     [[12,2,20,10],[20,10,12,18],[12,18,4,26],[4,26,12,34]],
  'rune.elder-futhark.eihwaz':   [[12,2,12,34],[12,6,20,2],[12,30,4,34]],
  'rune.elder-futhark.perthro':  [[7,8,7,28],[7,8,16,16],[7,28,16,16]],
  'rune.elder-futhark.algiz':    [[12,14,12,34],[12,14,5,4],[12,14,19,4]],
  'rune.elder-futhark.sowilo':   [[16,2,4,10],[4,10,16,26],[16,26,4,34]],
  'rune.elder-futhark.tiwaz':    [[12,2,12,34],[12,10,4,18],[12,10,20,18]],
  'rune.elder-futhark.berkano':  [[8,2,8,34],[8,4,16,11],[16,11,8,18],[8,18,16,25],[16,25,8,32]],
  'rune.elder-futhark.ehwaz':    [[7,2,7,34],[17,2,17,34],[7,2,17,18],[17,2,7,18]],
  'rune.elder-futhark.mannaz':   [[7,2,7,34],[17,2,17,34],[7,2,12,14],[17,2,12,14]],
  'rune.elder-futhark.laguz':    [[12,2,12,28],[12,28,18,34]],
  'rune.elder-futhark.ingwaz':   [[12,2,20,14],[20,14,12,26],[12,26,4,14],[4,14,12,2]],
  'rune.elder-futhark.dagaz':    [[4,2,20,18],[4,34,20,18],[20,2,4,18],[20,34,4,18]],
  'rune.elder-futhark.othala':   [[12,4,18,14],[18,14,12,24],[12,24,6,14],[6,14,12,4],[6,14,4,34],[18,14,20,34]],

  // ── Ogham ── stem + strokes in 24×36 viewBox ──────────────────────────────
  // Aicme Beithe: 1–5 right horizontal strokes
  'ogham.letter.beith':    [[12,2,12,34],[12,18,20,18]],
  'ogham.letter.luis':     [[12,2,12,34],[12,13,20,13],[12,23,20,23]],
  'ogham.letter.fearn':    [[12,2,12,34],[12,11,20,11],[12,18,20,18],[12,25,20,25]],
  'ogham.letter.sail':     [[12,2,12,34],[12,9,20,9],[12,15,20,15],[12,21,20,21],[12,27,20,27]],
  'ogham.letter.nion':     [[12,2,12,34],[12,8,20,8],[12,13,20,13],[12,18,20,18],[12,23,20,23],[12,28,20,28]],
  // Aicme hÚatha: 1–5 left horizontal strokes
  'ogham.letter.huath':    [[12,2,12,34],[12,18,4,18]],
  'ogham.letter.dair':     [[12,2,12,34],[12,13,4,13],[12,23,4,23]],
  'ogham.letter.tinne':    [[12,2,12,34],[12,11,4,11],[12,18,4,18],[12,25,4,25]],
  'ogham.letter.coll':     [[12,2,12,34],[12,9,4,9],[12,15,4,15],[12,21,4,21],[12,27,4,27]],
  'ogham.letter.quert':    [[12,2,12,34],[12,8,4,8],[12,13,4,13],[12,18,4,18],[12,23,4,23],[12,28,4,28]],
  // Aicme Muine: 1–5 diagonal strokes crossing the stem (lower-left → upper-right)
  'ogham.letter.muin':     [[12,2,12,34],[4,22,20,14]],
  'ogham.letter.gort':     [[12,2,12,34],[4,17,20,9],[4,27,20,19]],
  'ogham.letter.ngeadal':  [[12,2,12,34],[4,15,20,7],[4,22,20,14],[4,29,20,21]],
  'ogham.letter.straif':   [[12,2,12,34],[4,13,20,5],[4,19,20,11],[4,25,20,17],[4,31,20,23]],
  'ogham.letter.ruis':     [[12,2,12,34],[4,12,20,4],[4,17,20,9],[4,22,20,14],[4,27,20,19],[4,32,20,24]],
  // Aicme Ailme: 1–5 horizontal strokes going all the way through
  'ogham.letter.ailm':     [[12,2,12,34],[4,18,20,18]],
  'ogham.letter.onn':      [[12,2,12,34],[4,13,20,13],[4,23,20,23]],
  'ogham.letter.ur':       [[12,2,12,34],[4,11,20,11],[4,18,20,18],[4,25,20,25]],
  'ogham.letter.edad':     [[12,2,12,34],[4,9,20,9],[4,15,20,15],[4,21,20,21],[4,27,20,27]],
  'ogham.letter.idad':     [[12,2,12,34],[4,8,20,8],[4,13,20,13],[4,18,20,18],[4,23,20,23],[4,28,20,28]],
  // Forfeda (supplementary letters)
  'ogham.letter.eabhadh':  [[12,2,12,34],[8,12,16,18],[16,12,8,18],[8,20,16,26],[16,20,8,26]],
  'ogham.letter.or':       [[12,2,12,34],[12,12,18,18],[18,18,12,24],[12,24,6,18],[6,18,12,12]],
  'ogham.letter.uilleann': [[12,2,12,34],[4,16,12,20],[12,20,20,16],[4,22,12,26],[12,26,20,22]],
  'ogham.letter.ifin':     [[12,2,12,34],[12,12,20,8],[12,18,20,14],[12,24,20,20]],
  'ogham.letter.emancholl':[[12,2,12,34],[12,14,20,10],[12,22,20,26],[12,14,4,10],[12,22,4,26]],
}

function RuneStrokeSvg({ canonicalName, color, size }: {
  canonicalName: string; color: string; size: number
}) {
  const segs = RUNE_STROKES[canonicalName]
  if (!segs) return null
  const svgW = Math.round(size * 24 / 36)
  return (
    <svg viewBox="0 0 24 36" width={svgW} height={size} style={{ display: 'block', overflow: 'visible' }}>
      {segs.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color} strokeWidth={2} strokeLinecap="round" />
      ))}
    </svg>
  )
}

// ─── Rune Classic ─────────────────────────────────────────────────────────────

function RuneClassic({ entity, width, height, hideLabel }: { entity: BaseEntity; width: number; height: number; hideLabel?: boolean }) {
  const label = entity.primaryDisplayName.toUpperCase()
  const baseFontSize = Math.max(9, Math.round(height * 0.065))
  const letterSpacing = Math.max(0.5, Math.round(height * 0.01))
  // Scale font down so the label fits on one line within the card's inner width
  const innerWidth = width - 12  // 6px padding each side from cardBase
  const estimatedCharWidth = baseFontSize * 0.62 + letterSpacing
  const scaledFontSize = estimatedCharWidth * label.length > innerWidth
    ? Math.max(7, Math.floor(innerWidth / label.length / 0.62))
    : baseFontSize
  return (
    <div style={{
      ...cardBase(width, height),
      background: '#3a332c',
      border: '2px solid #504840',
      boxShadow: '0 0 0 4px #28231e',
    }}>
      <RuneStrokeSvg canonicalName={entity.canonicalName} color="#c8b880" size={Math.min(Math.round(height * 0.52), height - 38)} />
      {!hideLabel && (
        <div style={{
          ...labelStyle(height),
          fontFamily: '"Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif',
          color: '#8a7a58',
          letterSpacing: `${letterSpacing}px`,
          fontSize: scaledFontSize,
          whiteSpace: 'nowrap',
        }}>
          {label}
        </div>
      )}
    </div>
  )
}

// ─── Rune Symbolic ────────────────────────────────────────────────────────────

function RuneSymbolic({ entity, width, height, hideLabel }: { entity: BaseEntity; width: number; height: number; hideLabel?: boolean }) {
  return (
    <div style={cardBase(width, height)}>
      <RuneStrokeSvg canonicalName={entity.canonicalName} color="var(--color-text)" size={Math.min(Math.round(height * 0.52), height - 38)} />
      {!hideLabel && <div style={labelStyle(height)}>{entity.primaryDisplayName}</div>}
    </div>
  )
}

// ─── Geomancy Symbolic ────────────────────────────────────────────────────────

// Rows top→bottom: Fire, Air, Water, Earth. 1 = single dot (active), 0 = double dot (passive).
const GEOMANCY_PATTERNS: Record<string, [number, number, number, number]> = {
  'geomancy.figure.via':            [1, 1, 1, 1],
  'geomancy.figure.populus':        [0, 0, 0, 0],
  'geomancy.figure.rubeus':         [0, 1, 0, 1],   // spatial reverse of Puer
  'geomancy.figure.albus':          [0, 0, 1, 0],
  'geomancy.figure.fortuna-minor':  [0, 0, 1, 1],
  'geomancy.figure.puella':         [0, 1, 0, 0],
  'geomancy.figure.amissio':        [0, 0, 0, 1],   // spatial reverse of Acquisitio
  'geomancy.figure.conjunctio':     [0, 1, 1, 0],
  'geomancy.figure.tristitia':      [0, 1, 1, 1],
  'geomancy.figure.acquisitio':     [1, 0, 0, 0],
  'geomancy.figure.carcer':         [1, 0, 0, 1],
  'geomancy.figure.puer':           [1, 0, 1, 0],
  'geomancy.figure.cauda-draconis': [1, 0, 1, 1],
  'geomancy.figure.fortuna-major':  [1, 1, 0, 0],
  'geomancy.figure.caput-draconis': [1, 1, 0, 1],
  'geomancy.figure.laetitia':       [1, 1, 1, 0],
}

function GeomancySymbolic({ entity, width, height, hideLabel }: { entity: BaseEntity; width: number; height: number; hideLabel?: boolean }) {
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
      {!hideLabel && <div style={labelStyle(height)}>{entity.primaryDisplayName}</div>}
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

function MahjongSymbolic({ entity, width, height, hideLabel }: { entity: BaseEntity; width: number; height: number; hideLabel?: boolean }) {
  const glyph = mahjongUnicode(entity.canonicalName)

  return (
    <div style={cardBase(width, height)}>
      <div style={{ fontSize: Math.round(height * 0.38), lineHeight: 1 }}>{glyph}</div>
      {!hideLabel && <div style={labelStyle(height)}>{entity.primaryDisplayName}</div>}
    </div>
  )
}

// ─── Lenormand Symbolic ───────────────────────────────────────────────────────

function LenormandSymbolic({ entity, width, height, hideLabel }: { entity: BaseEntity; width: number; height: number; hideLabel?: boolean }) {
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
      {!hideLabel && (
        <div style={{
          fontSize: Math.round(height * 0.08),
          color: 'var(--color-text-muted)',
          textAlign: 'center',
          lineHeight: 1.3,
          wordBreak: 'break-word',
        }}>
          {entity.primaryDisplayName}
        </div>
      )}
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

// ─── Elemental symbol paths ────────────────────────────────────────────────────
// All symbols in a 24×36 viewBox. Classical triangle glyphs: Fire △, Water ▽,
// Air △̄ (triangle + crossbar), Earth ▽̄ (inverted triangle + crossbar).

type ElementRenderer = (color: string, sw: number) => React.ReactNode

const ELEMENT_SYMBOL: Record<string, ElementRenderer> = {
  'astrology.element.fire': (c, sw) => (
    <polygon points="12,4 23,32 1,32" fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round"/>
  ),
  'astrology.element.water': (c, sw) => (
    <polygon points="12,32 23,4 1,4" fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round"/>
  ),
  'astrology.element.air': (c, sw) => (<>
    <polygon points="12,4 23,32 1,32" fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round"/>
    <line x1="6.5" y1="18" x2="17.5" y2="18" stroke={c} strokeWidth={sw} strokeLinecap="round"/>
  </>),
  'astrology.element.earth': (c, sw) => (<>
    <polygon points="12,32 23,4 1,4" fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round"/>
    <line x1="6.5" y1="18" x2="17.5" y2="18" stroke={c} strokeWidth={sw} strokeLinecap="round"/>
  </>),
}

const ELEMENT_COLOR: Record<string, string> = {
  'astrology.element.fire':  '#d06030',
  'astrology.element.water': '#4070c0',
  'astrology.element.air':   '#c0a030',
  'astrology.element.earth': '#608050',
}

function ElementSymbolSvg({ canonicalName, color, size }: {
  canonicalName: string; color: string; size: number
}) {
  const render = ELEMENT_SYMBOL[canonicalName]
  if (!render) return null
  // Constant ~5px visual stroke regardless of zoom: sw = 5 * viewBoxHeight / displayHeight
  const sw = Math.max(1.2, 180 / size)
  return (
    <svg viewBox="0 0 24 36" width={Math.round(size * 24 / 36)} height={size}
      style={{ display: 'block', overflow: 'visible' }}>
      {render(color, sw)}
    </svg>
  )
}

function ElementSymbolic({ entity, width, height, hideLabel }: { entity: BaseEntity; width: number; height: number; hideLabel?: boolean }) {
  const color = ELEMENT_COLOR[entity.canonicalName] ?? 'var(--color-text)'
  return (
    <div style={cardBase(width, height)}>
      <ElementSymbolSvg canonicalName={entity.canonicalName} color={color}
        size={Math.min(Math.round(height * 0.52), height - 38)} />
      {!hideLabel && <div style={labelStyle(height)}>{entity.primaryDisplayName}</div>}
    </div>
  )
}

// ─── Alchemy Metal symbol paths ────────────────────────────────────────────────
// All symbols defined in a 24×36 viewBox. Pure SVG geometry — no font required.
// Gold ☉, Silver ☽, Mercury ☿, Copper ♀, Iron ♂, Tin ♃, Lead ♄

type MetalRenderer = (color: string, sw: number) => React.ReactNode

const METAL_SYMBOL: Record<string, MetalRenderer> = {
  'alchemy.metal.gold': (c, sw) => (<>
    <circle cx="12" cy="18" r="8.5" fill="none" stroke={c} strokeWidth={sw}/>
    <circle cx="12" cy="18" r="2.3" fill={c}/>
  </>),

  // Crescent: outer right-semicircle (r=10, center (7,18)) minus inner arc (r=12, center (0.37,18))
  'alchemy.metal.silver': (c, _sw) => (
    <path d="M 7,8 A 10,10 0 0,1 7,28 A 12,12 0 0,0 7,8 Z" fill={c}/>
  ),

  // Dome arch (upward semicircle) + circle + cross
  'alchemy.metal.mercury': (c, sw) => (<>
    <path d="M 6,14 A 6,6 0 0,0 18,14" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"/>
    <circle cx="12" cy="21" r="5.5" fill="none" stroke={c} strokeWidth={sw}/>
    <line x1="12" y1="26.5" x2="12" y2="33" stroke={c} strokeWidth={sw} strokeLinecap="round"/>
    <line x1="6.5" y1="30" x2="17.5" y2="30" stroke={c} strokeWidth={sw} strokeLinecap="round"/>
  </>),

  // Circle + cross below
  'alchemy.metal.copper': (c, sw) => (<>
    <circle cx="12" cy="14" r="8.5" fill="none" stroke={c} strokeWidth={sw}/>
    <line x1="12" y1="22.5" x2="12" y2="33" stroke={c} strokeWidth={sw} strokeLinecap="round"/>
    <line x1="5.5" y1="28.5" x2="18.5" y2="28.5" stroke={c} strokeWidth={sw} strokeLinecap="round"/>
  </>),

  // Circle (lower-left) + arrow upper-right
  'alchemy.metal.iron': (c, sw) => (<>
    <circle cx="9" cy="21" r="7.5" fill="none" stroke={c} strokeWidth={sw}/>
    <line x1="14.3" y1="15.7" x2="22" y2="8" stroke={c} strokeWidth={sw} strokeLinecap="round"/>
    <line x1="22" y1="8" x2="17" y2="8" stroke={c} strokeWidth={sw} strokeLinecap="round"/>
    <line x1="22" y1="8" x2="22" y2="13" stroke={c} strokeWidth={sw} strokeLinecap="round"/>
  </>),

  // Vertical staff + curved left arm + crossbar
  'alchemy.metal.tin': (c, sw) => (<>
    <line x1="14" y1="4" x2="14" y2="33" stroke={c} strokeWidth={sw} strokeLinecap="round"/>
    <path d="M 14,8 Q 4,8 5,23" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"/>
    <line x1="4" y1="23" x2="21" y2="23" stroke={c} strokeWidth={sw} strokeLinecap="round"/>
  </>),

  // Vertical staff + scythe-curve upper-left + crossbar
  'alchemy.metal.lead': (c, sw) => (<>
    <line x1="12" y1="4" x2="12" y2="33" stroke={c} strokeWidth={sw} strokeLinecap="round"/>
    <path d="M 12,9 C 4,7 3,14 5,21" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"/>
    <line x1="4" y1="21" x2="21" y2="21" stroke={c} strokeWidth={sw} strokeLinecap="round"/>
  </>),
}

function MetalSymbolSvg({ canonicalName, color, size }: {
  canonicalName: string; color: string; size: number
}) {
  const render = METAL_SYMBOL[canonicalName]
  if (!render) return null
  // Constant ~5px visual stroke regardless of zoom: sw = 5 * viewBoxHeight / displayHeight
  const sw = Math.max(1.2, 180 / size)
  return (
    <svg viewBox="0 0 24 36" width={Math.round(size * 24 / 36)} height={size}
      style={{ display: 'block', overflow: 'visible' }}>
      {render(color, sw)}
    </svg>
  )
}

// ─── Alchemy Metal Classic ─────────────────────────────────────────────────────

function AlchemyMetalClassic({ entity, width, height, hideLabel }: { entity: BaseEntity; width: number; height: number; hideLabel?: boolean }) {
  const label = entity.primaryDisplayName.toUpperCase()
  const baseFontSize = Math.max(9, Math.round(height * 0.065))
  return (
    <div style={{
      ...cardBase(width, height),
      background: '#3a332c',
      border: '2px solid #504840',
      boxShadow: '0 0 0 4px #28231e',
    }}>
      <MetalSymbolSvg canonicalName={entity.canonicalName} color="#c8b880"
        size={Math.min(Math.round(height * 0.52), height - 38)} />
      {!hideLabel && (
        <div style={{
          ...labelStyle(height),
          fontFamily: '"Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif',
          color: '#8a7a58',
          letterSpacing: '2px',
          fontSize: baseFontSize,
          whiteSpace: 'nowrap',
        }}>
          {label}
        </div>
      )}
    </div>
  )
}

// ─── Alchemy Metal Symbolic ────────────────────────────────────────────────────

function AlchemyMetalSymbolic({ entity, width, height, hideLabel }: { entity: BaseEntity; width: number; height: number; hideLabel?: boolean }) {
  return (
    <div style={cardBase(width, height)}>
      <MetalSymbolSvg canonicalName={entity.canonicalName} color="var(--color-text)"
        size={Math.min(Math.round(height * 0.52), height - 38)} />
      {!hideLabel && <div style={labelStyle(height)}>{entity.primaryDisplayName}</div>}
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
    width: '100%',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }
}
