import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity } from '@grimoire/core'

export const Route = createFileRoute('/reference/planetary-matrix')({
  component: PlanetaryMatrix,
})

const PLANET_ORDER = [
  'astrology.planet.sol',
  'astrology.planet.luna',
  'astrology.planet.mercury',
  'astrology.planet.venus',
  'astrology.planet.mars',
  'astrology.planet.jupiter',
  'astrology.planet.saturn',
]

interface RowData {
  label: string
  key: string
  entries: Map<string, BaseEntity | string | null>
}

function PlanetaryMatrix() {
  const { engine } = useEngineStore()
  const navigate = useNavigate()

  const [planets, setPlanets] = useState<BaseEntity[]>([])
  const [rows, setRows] = useState<RowData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!engine) return
    ;(async () => {
      setLoading(true)

      const planetResult = await engine.adapter.listEntities({ entityType: 'astrology.planet' }, { limit: 20, offset: 0 })
      const planetMap = new Map((planetResult.items as BaseEntity[]).map(p => [p.canonicalName, p]))
      const ordered = PLANET_ORDER.map(cn => planetMap.get(cn)).filter(Boolean) as BaseEntity[]

      const [sephiraLinks, tarotLinks, allAttrLinks, spiritLinks, dayRulerLinks] = await Promise.all([
        engine.adapter.queryLinks({ labels: ['gd-planet-sephira'], limit: 20, offset: 0 }),
        engine.adapter.queryLinks({ labels: ['gd-tarot-planet'], limit: 20, offset: 0 }),
        engine.adapter.queryLinks({ labels: ['attributed-planet'], limit: 50, offset: 0 }),
        engine.adapter.queryLinks({ labels: ['serves'], limit: 20, offset: 0 }),
        engine.adapter.queryLinks({ labels: ['day-ruled-by'], limit: 20, offset: 0 }),
      ])

      // planet → sephira
      const planetSephira = new Map<string, string>()
      for (const link of sephiraLinks.items) {
        const src = link.sourceCanonicalName
        const tgt = link.targetCanonicalName
        const planet = src.startsWith('astrology.planet.') ? src : tgt
        const seph = src.startsWith('qabalah.sephira.') ? src : tgt
        if (planet.startsWith('astrology.planet.') && seph.startsWith('qabalah.sephira.')) {
          planetSephira.set(planet, seph)
        }
      }

      // planet → tarot trump
      const planetTarot = new Map<string, string>()
      for (const link of tarotLinks.items) {
        const src = link.sourceCanonicalName
        const tgt = link.targetCanonicalName
        const tarot = src.startsWith('tarot.') ? src : tgt
        const planet = src.startsWith('astrology.planet.') ? src : tgt
        if (tarot.startsWith('tarot.') && planet.startsWith('astrology.planet.')) {
          planetTarot.set(planet, tarot)
        }
      }

      // planet → metal / chakra
      const planetMetal = new Map<string, string>()
      const planetChakra = new Map<string, string>()
      for (const link of allAttrLinks.items) {
        const src = link.sourceCanonicalName
        const tgt = link.targetCanonicalName
        const planet = src.startsWith('astrology.planet.') ? src : tgt
        const other = src.startsWith('astrology.planet.') ? tgt : src
        if (!planet.startsWith('astrology.planet.')) continue
        if (other.startsWith('alchemy.metal.')) planetMetal.set(planet, other)
        else if (other.startsWith('chakra.classical.') && !planetChakra.has(planet)) {
          planetChakra.set(planet, other)
        }
      }

      // planet → intelligence spirit
      const planetSpirit = new Map<string, string>()
      for (const link of spiritLinks.items) {
        const src = link.sourceCanonicalName
        const tgt = link.targetCanonicalName
        const spirit = src.startsWith('spirit.intelligence.') ? src : tgt
        const planet = src.startsWith('astrology.planet.') ? src : tgt
        if (spirit.startsWith('spirit.intelligence.') && planet.startsWith('astrology.planet.')) {
          planetSpirit.set(planet, spirit)
        }
      }

      // planet → day-ruler entity (e.g. astrology.planet.mars → planetary-hour.day-ruler.tuesday-mars)
      const planetDayRuler = new Map<string, string>()
      for (const link of dayRulerLinks.items) {
        const src = link.sourceCanonicalName
        const tgt = link.targetCanonicalName
        const dayRuler = src.startsWith('planetary-hour.day-ruler.') ? src : tgt
        const planet = src.startsWith('astrology.planet.') ? src : tgt
        if (dayRuler.startsWith('planetary-hour.day-ruler.') && planet.startsWith('astrology.planet.')) {
          planetDayRuler.set(planet, dayRuler)
        }
      }

      // Collect all CNs to resolve
      const allCNs = new Set<string>([
        ...planetSephira.values(),
        ...planetTarot.values(),
        ...planetMetal.values(),
        ...planetChakra.values(),
        ...planetSpirit.values(),
        ...planetDayRuler.values(),
      ])
      const entityMap = new Map<string, BaseEntity>()
      await Promise.all(
        [...allCNs].map(cn =>
          engine.adapter.getEntityByCanonicalName(cn)
            .then((e: BaseEntity | null) => { if (e) entityMap.set(cn, e) })
            .catch(() => {})
        )
      )

      const makeRow = (label: string, key: string, cnMap: Map<string, string>): RowData => ({
        label,
        key,
        entries: new Map(
          PLANET_ORDER.map(planet => [
            planet,
            cnMap.has(planet) ? (entityMap.get(cnMap.get(planet)!) ?? null) : null,
          ])
        ),
      })

      setPlanets(ordered)
      setRows([
        makeRow('Sephira (GD)', 'sephira', planetSephira),
        makeRow('Tarot Trump', 'tarot', planetTarot),
        makeRow('Metal', 'metal', planetMetal),
        makeRow('Day of Week', 'day', planetDayRuler),
        makeRow('Chakra', 'chakra', planetChakra),
        makeRow('Intelligence', 'spirit', planetSpirit),
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
        Planetary Attributions
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px', marginTop: 0 }}>
        Cross-system attributions for the seven classical planets. Click any cell to open its reference page.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{
                padding: '8px 12px', textAlign: 'left', fontWeight: 400,
                color: 'var(--color-text-subtle)', borderBottom: '2px solid var(--color-border)',
                whiteSpace: 'nowrap', minWidth: '130px',
              }}>
                Attribution
              </th>
              {planets.map(p => (
                <th
                  key={p.canonicalName}
                  style={{
                    padding: '6px 8px', textAlign: 'center',
                    fontWeight: 400, borderBottom: '2px solid var(--color-border)',
                    minWidth: '90px',
                  }}
                >
                  <button
                    onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: p.canonicalName } })}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                      padding: '2px', fontFamily: 'inherit', width: '100%',
                    }}
                  >
                    <span style={{ fontSize: '18px', lineHeight: 1, display: 'block', textAlign: 'center', width: '100%' }}>
                      {p.extendedData?.symbol as string ?? ''}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text)', fontWeight: 500 }}>
                      {p.primaryDisplayName}
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
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)', fontSize: '11px',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}>
                  {row.label}
                </td>
                {planets.map(p => {
                  const val = row.entries.get(p.canonicalName)
                  return (
                    <td
                      key={p.canonicalName}
                      style={{
                        padding: '6px 8px', textAlign: 'center',
                        borderBottom: '1px solid var(--color-border)',
                        verticalAlign: 'middle',
                      }}
                    >
                      {val == null ? (
                        <span style={{ color: 'var(--color-border)' }}>—</span>
                      ) : typeof val === 'string' ? (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{val}</span>
                      ) : (
                        <button
                          onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: (val as BaseEntity).canonicalName } })}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--color-text)', fontSize: '12px',
                            fontFamily: 'inherit', padding: '2px 4px',
                            borderRadius: '3px', transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(180,156,90,0.12)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                        >
                          {((val as BaseEntity).extendedData?.dayOfWeek as string | undefined) ?? (val as BaseEntity).primaryDisplayName}
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
        Seven classical planets only. Sephira and Tarot Trump attributions follow the Golden Dawn system.
        Chakra attributions are from the classical Hindu seven-chakra system.
        Intelligence (planetary spirit) attributions are from the grimoire tradition (Agrippa).
      </div>
    </div>
  )
}
