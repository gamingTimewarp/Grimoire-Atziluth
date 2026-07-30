import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity } from '@grimoire/core'

export const Route = createFileRoute('/reference/sephirothic-matrix')({
  component: SephirothicMatrix,
})

const SEPHIRA_ORDER = [
  'qabalah.sephira.kether',
  'qabalah.sephira.chokmah',
  'qabalah.sephira.binah',
  'qabalah.sephira.chesed',
  'qabalah.sephira.geburah',
  'qabalah.sephira.tiphareth',
  'qabalah.sephira.netzach',
  'qabalah.sephira.hod',
  'qabalah.sephira.yesod',
  'qabalah.sephira.malkuth',
]

// Queen Scale (Briah) colours — GD Four Scales of Colour chart
const QUEEN_SCALE_CSS: Record<string, string> = {
  'qabalah.sephira.kether':    '#ffffff',   // White
  'qabalah.sephira.chokmah':   '#808080',   // Grey
  'qabalah.sephira.binah':     '#1a1a1a',   // Black
  'qabalah.sephira.chesed':    '#2040a0',   // Blue
  'qabalah.sephira.geburah':   '#c01818',   // Scarlet
  'qabalah.sephira.tiphareth': '#d8b800',   // Yellow
  'qabalah.sephira.netzach':   '#008040',   // Emerald green
  'qabalah.sephira.hod':       '#d06010',   // Orange
  'qabalah.sephira.yesod':     '#7030b0',   // Violet
  'qabalah.sephira.malkuth':   'quartered', // Citrine / Olive / Russet / Black
}

const QUEEN_SCALE_LABEL: Record<string, string> = {
  'qabalah.sephira.kether':    'White',
  'qabalah.sephira.chokmah':   'Grey',
  'qabalah.sephira.binah':     'Black',
  'qabalah.sephira.chesed':    'Blue',
  'qabalah.sephira.geburah':   'Scarlet',
  'qabalah.sephira.tiphareth': 'Yellow',
  'qabalah.sephira.netzach':   'Emerald',
  'qabalah.sephira.hod':       'Orange',
  'qabalah.sephira.yesod':     'Violet',
  'qabalah.sephira.malkuth':   'Citrine · Olive · Russet · Black',
}

// Queen Scale hue -> the nearest colour.colour.* entity, so the label becomes a real
// clickable link. Malkuth's quartered Citrine/Olive/Russet/Black has no single matching
// entity (only Black exists in the base 12-colour palette) and stays plain text.
const QUEEN_SCALE_COLOUR_CN: Partial<Record<string, string>> = {
  'qabalah.sephira.kether':    'colour.colour.white',
  'qabalah.sephira.chokmah':   'colour.colour.grey',
  'qabalah.sephira.binah':     'colour.colour.black',
  'qabalah.sephira.chesed':    'colour.colour.blue',
  'qabalah.sephira.geburah':   'colour.colour.red',    // secondary name "Scarlet"
  'qabalah.sephira.tiphareth': 'colour.colour.yellow',
  'qabalah.sephira.netzach':   'colour.colour.green',  // secondary name "Emerald"
  'qabalah.sephira.hod':       'colour.colour.orange',
  'qabalah.sephira.yesod':     'colour.colour.violet',
}

// Malkuth Queen Scale quartered colours: Citrine, Olive, Russet, Black
const MALKUTH_COLOURS = ['#c8b020', '#4a5218', '#7a3018', '#1a1a1a']

interface RowData {
  label: string
  key: string
  entries: Map<string, BaseEntity | string | null>
  /** When set, cells show a colour swatch before their text/entity label */
  cssColours?: Map<string, string>
}

// ─── Colour swatch ────────────────────────────────────────────────────────────

function ColourSwatch({ css }: { css: string }) {
  if (css === 'quartered') {
    // 2×2 quartered square for Malkuth
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0, borderRadius: '2px', overflow: 'hidden' }}>
        <rect x="0" y="0" width="7" height="7" fill={MALKUTH_COLOURS[0]} />
        <rect x="7" y="0" width="7" height="7" fill={MALKUTH_COLOURS[1]} />
        <rect x="0" y="7" width="7" height="7" fill={MALKUTH_COLOURS[2]} />
        <rect x="7" y="7" width="7" height="7" fill={MALKUTH_COLOURS[3]} />
      </svg>
    )
  }
  return (
    <span style={{
      display: 'inline-block', width: '12px', height: '12px',
      borderRadius: '2px', flexShrink: 0,
      background: css,
      border: css === '#e8e8e0' ? '1px solid var(--color-border)' : undefined,
    }} />
  )
}

function SephirothicMatrix() {
  const { engine } = useEngineStore()
  const navigate = useNavigate()

  const [sephiroth, setSephiroth] = useState<BaseEntity[]>([])
  const [rows, setRows] = useState<RowData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!engine) return
    ;(async () => {
      setLoading(true)

      const sephResult = await engine.adapter.listEntities({ entityType: 'qabalah.sephira' }, { limit: 15, offset: 0 })
      const sephMap = new Map((sephResult.items as BaseEntity[]).map(s => [s.canonicalName, s]))
      const ordered = SEPHIRA_ORDER.map(cn => sephMap.get(cn)).filter(Boolean) as BaseEntity[]

      const [planetLinks, tarotLinks, archangelLinks, orderLinks, divNameLinks, chakraLinks] = await Promise.all([
        engine.adapter.queryLinks({ labels: ['gd-planet-sephira'], limit: 20, offset: 0 }),
        engine.adapter.queryLinks({ labels: ['gd-tarot-planet'], limit: 20, offset: 0 }),
        engine.adapter.queryLinks({ labels: ['attributed-archangel'], limit: 15, offset: 0 }),
        engine.adapter.queryLinks({ labels: ['attributed-angelic-order'], limit: 15, offset: 0 }),
        engine.adapter.queryLinks({ labels: ['attributed-divine-name'], limit: 15, offset: 0 }),
        engine.adapter.queryLinks({ labels: ['corresponds-to'], limit: 200, offset: 0 }),
      ])

      // sephira → planet
      const sephPlanet = new Map<string, string>()
      for (const link of planetLinks.items) {
        const src = link.sourceCanonicalName
        const tgt = link.targetCanonicalName
        const seph = src.startsWith('qabalah.sephira.') ? src : tgt
        const planet = src.startsWith('astrology.planet.') ? src : tgt
        if (seph.startsWith('qabalah.sephira.') && planet.startsWith('astrology.planet.')) {
          sephPlanet.set(seph, planet)
        }
      }

      // planet → sephira (reverse for tarot)
      const planetToSeph = new Map<string, string>()
      for (const [seph, planet] of sephPlanet) planetToSeph.set(planet, seph)

      // sephira → tarot (via planet)
      const sephTarot = new Map<string, string>()
      for (const link of tarotLinks.items) {
        const src = link.sourceCanonicalName
        const tgt = link.targetCanonicalName
        const tarot = src.startsWith('tarot.') ? src : tgt
        const planet = src.startsWith('astrology.planet.') ? src : tgt
        const seph = planetToSeph.get(planet)
        if (seph) sephTarot.set(seph, tarot)
      }

      // sephira → archangel
      const sephArchangel = new Map<string, string>()
      for (const link of archangelLinks.items) {
        const src = link.sourceCanonicalName
        const tgt = link.targetCanonicalName
        const seph = src.startsWith('qabalah.sephira.') ? src : tgt
        const angel = src.startsWith('angel.archangel.') ? src : tgt
        if (seph.startsWith('qabalah.sephira.') && angel.startsWith('angel.archangel.')) {
          sephArchangel.set(seph, angel)
        }
      }

      // sephira → angelic order
      const sephOrder = new Map<string, string>()
      for (const link of orderLinks.items) {
        const src = link.sourceCanonicalName
        const tgt = link.targetCanonicalName
        const seph = src.startsWith('qabalah.sephira.') ? src : tgt
        const ord = src.startsWith('angel.order.') ? src : tgt
        if (seph.startsWith('qabalah.sephira.') && ord.startsWith('angel.order.')) {
          sephOrder.set(seph, ord)
        }
      }

      // sephira → divine name
      const sephDivName = new Map<string, string>()
      for (const link of divNameLinks.items) {
        const src = link.sourceCanonicalName
        const tgt = link.targetCanonicalName
        const seph = src.startsWith('qabalah.sephira.') ? src : tgt
        const div = src.startsWith('qabalah.divine-name.') ? src : tgt
        if (seph.startsWith('qabalah.sephira.') && div.startsWith('qabalah.divine-name.')) {
          sephDivName.set(seph, div)
        }
      }

      // sephira → chakra (classical only, from corresponds-to links)
      const sephChakra = new Map<string, string>()
      for (const link of chakraLinks.items) {
        const src = link.sourceCanonicalName
        const tgt = link.targetCanonicalName
        const chakra = src.startsWith('chakra.classical.') ? src : tgt.startsWith('chakra.classical.') ? tgt : null
        const seph = src.startsWith('qabalah.sephira.') ? src : tgt.startsWith('qabalah.sephira.') ? tgt : null
        if (chakra && seph) sephChakra.set(seph, chakra)
      }

      // Fetch all referenced entities
      const allCNs = new Set<string>([
        ...sephPlanet.values(),
        ...sephTarot.values(),
        ...sephArchangel.values(),
        ...sephOrder.values(),
        ...sephDivName.values(),
        ...sephChakra.values(),
        ...Object.values(QUEEN_SCALE_COLOUR_CN).filter((cn): cn is string => !!cn),
      ])

      const entityMap = new Map<string, BaseEntity>()
      await Promise.all(
        [...allCNs].map(cn =>
          engine.adapter.getEntityByCanonicalName(cn)
            .then((e: BaseEntity | null) => { if (e) entityMap.set(cn, e) })
            .catch(() => {})
        )
      )

      const makeRow = (label: string, key: string, cnMap: Map<string, string>, cssColours?: Map<string, string>): RowData => ({
        label,
        key,
        cssColours,
        entries: new Map(
          SEPHIRA_ORDER.map(seph => [seph, cnMap.has(seph) ? (entityMap.get(cnMap.get(seph)!) ?? null) : null])
        ),
      })

      // Queen Scale colour row — swatch hues are hardcoded from the GD Four Scales chart;
      // the label links through to the matching colour.colour.* entity where one exists
      // (Malkuth's quartered Citrine/Olive/Russet/Black has no single match and stays text).
      const queenScaleRow: RowData = {
        label: 'Queen Scale',
        key: 'queen-scale',
        cssColours: new Map(SEPHIRA_ORDER.map(seph => [seph, QUEEN_SCALE_CSS[seph] ?? ''])),
        entries: new Map(SEPHIRA_ORDER.map(seph => {
          // Link to the colour entity but keep showing the traditional GD term (e.g.
          // "Scarlet", "Emerald") rather than the entity's generic display name
          // ("Red", "Green") — the entity is only a secondary name away from GD usage.
          const colourCn = QUEEN_SCALE_COLOUR_CN[seph]
          const colourEntity = colourCn ? entityMap.get(colourCn) : undefined
          const gdLabel = QUEEN_SCALE_LABEL[seph]
          const displayEntity = colourEntity ? { ...colourEntity, primaryDisplayName: gdLabel ?? colourEntity.primaryDisplayName } : null
          return [seph, displayEntity ?? gdLabel ?? null]
        })),
      }

      const hebrewRow: RowData = {
        label: 'Hebrew Name',
        key: 'hebrew',
        entries: new Map(
          SEPHIRA_ORDER.map(seph => {
            const s = sephMap.get(seph)
            return [seph, s ? ((s.extendedData?.hebrewName as string | undefined) ?? null) : null]
          })
        ),
      }

      setSephiroth(ordered)
      setRows([
        hebrewRow,
        makeRow('Planet (GD)', 'planet', sephPlanet),
        makeRow('Tarot Trump', 'tarot', sephTarot),
        makeRow('Archangel', 'archangel', sephArchangel),
        makeRow('Angelic Order', 'order', sephOrder),
        makeRow('Divine Name', 'divine', sephDivName),
        makeRow('Chakra', 'chakra', sephChakra),
        queenScaleRow,
      ])
      setLoading(false)
    })()
  }, [engine])

  if (loading) {
    return (
      <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', padding: '24px' }}>
        Loading…
      </div>
    )
  }

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => window.history.back()} style={{ marginBottom: '12px' }}>
        <ArrowLeft size={14} /> Back
      </Button>
      <div style={{ fontSize: '13px', color: 'var(--color-accent)', marginBottom: '4px' }}>
        Reference › Guides
      </div>
      <h1 style={{ fontSize: '22px', fontWeight: 300, marginBottom: '6px' }}>
        Sephirothic Attributions
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px', marginTop: 0 }}>
        Golden Dawn attributions for the 10 Sephiroth. Click any cell to open its reference page.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '11px', width: '100%', tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th style={{
                padding: '6px 10px', textAlign: 'left', fontWeight: 400,
                color: 'var(--color-text-subtle)', borderBottom: '2px solid var(--color-border)',
                whiteSpace: 'nowrap',
              }}>
                Attribution
              </th>
              {sephiroth.map(s => (
                <th
                  key={s.canonicalName}
                  style={{
                    padding: '4px 4px', textAlign: 'center',
                    fontWeight: 400, borderBottom: '2px solid var(--color-border)',
                  }}
                >
                  <button
                    onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: s.canonicalName } })}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                      padding: '2px', fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text)' }}>
                      {s.primaryDisplayName}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)' }}>
                      {s.extendedData?.number as number}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={row.key}
                style={{ background: rowIdx % 2 === 0 ? 'var(--color-surface-2)' : 'transparent' }}
              >
                <td style={{
                  padding: '6px 10px',
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)', fontSize: '10px',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}>
                  {row.label}
                </td>
                {sephiroth.map(s => {
                  const val = row.entries.get(s.canonicalName)
                  const css = row.cssColours?.get(s.canonicalName)
                  return (
                    <td
                      key={s.canonicalName}
                      style={{
                        padding: '4px 4px', textAlign: 'center',
                        borderBottom: '1px solid var(--color-border)',
                        verticalAlign: 'middle',
                      }}
                    >
                      {val == null ? (
                        <span style={{ color: 'var(--color-border)' }}>—</span>
                      ) : typeof val === 'string' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          {css && <ColourSwatch css={css} />}
                          {val}
                        </span>
                      ) : (
                        <button
                          onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: (val as BaseEntity).canonicalName } })}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--color-text)', fontSize: '11px',
                            fontFamily: 'inherit', padding: '2px 3px',
                            borderRadius: '3px', transition: 'background 0.1s',
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(180,156,90,0.12)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                        >
                          {css && <ColourSwatch css={css} />}
                          {(val as BaseEntity).extendedData?.symbol as string
                            ? `${(val as BaseEntity).extendedData?.symbol} ${(val as BaseEntity).primaryDisplayName}`
                            : (val as BaseEntity).primaryDisplayName}
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '16px' }}>
        Attributions follow the Golden Dawn system. Planetary attributions for Chokmah (Uranus) and
        Kether (Neptune) are modern GD additions; classical GD attributed Chokmah to the sphere of
        the Zodiac. Queen Scale colours are from the GD Four Scales of Colour (Briah/Queen scale).
        Chakra correspondences follow the classical seven-chakra system.
      </div>
    </div>
  )
}
