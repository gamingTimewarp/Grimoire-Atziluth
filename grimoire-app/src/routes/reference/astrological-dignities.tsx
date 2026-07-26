import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity, Link } from '@grimoire/core'

export const Route = createFileRoute('/reference/astrological-dignities')({
  component: AstrologicalDignitiesTable,
})

const SIGN_ORDER = [
  'astrology.zodiac-sign.aries',
  'astrology.zodiac-sign.taurus',
  'astrology.zodiac-sign.gemini',
  'astrology.zodiac-sign.cancer',
  'astrology.zodiac-sign.leo',
  'astrology.zodiac-sign.virgo',
  'astrology.zodiac-sign.libra',
  'astrology.zodiac-sign.scorpio',
  'astrology.zodiac-sign.sagittarius',
  'astrology.zodiac-sign.capricorn',
  'astrology.zodiac-sign.aquarius',
  'astrology.zodiac-sign.pisces',
]

const PLANET_ORDER = [
  'astrology.planet.sol', 'astrology.planet.luna',
  'astrology.planet.mercury', 'astrology.planet.venus',
  'astrology.planet.mars', 'astrology.planet.jupiter',
  'astrology.planet.saturn', 'astrology.planet.uranus',
  'astrology.planet.neptune', 'astrology.planet.pluto',
]

const DIGNITY_LABELS = ['traditional-ruler', 'exaltation', 'detriment', 'fall'] as const
type DignityLabel = typeof DIGNITY_LABELS[number]

const DIGNITY_DISPLAY: Record<DignityLabel, { label: string; color: string; bg: string }> = {
  'traditional-ruler': { label: 'Rulership',  color: '#a3d48a', bg: 'rgba(100,180,60,0.15)' },
  'exaltation':        { label: 'Exaltation', color: '#b49c5a', bg: 'rgba(180,156,90,0.15)' },
  'detriment':         { label: 'Detriment',  color: '#c08080', bg: 'rgba(180,80,80,0.13)' },
  'fall':              { label: 'Fall',        color: '#8898b0', bg: 'rgba(80,100,150,0.13)' },
}

function AstrologicalDignitiesTable() {
  const { engine } = useEngineStore()
  const navigate = useNavigate()

  const [signs, setSigns] = useState<BaseEntity[]>([])
  const [planets, setPlanets] = useState<BaseEntity[]>([])
  // Map: planetCN → DignityLabel → signCN
  const [planetDigs, setPlanetDigs] = useState<Map<string, Map<DignityLabel, string>>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!engine) return
    ;(async () => {
      setLoading(true)
      const [signResult, planetResult, linkResult] = await Promise.all([
        engine.adapter.listEntities({ entityType: 'astrology.zodiac-sign' }, { limit: 15, offset: 0 }),
        engine.adapter.listEntities({ entityType: 'astrology.planet' }, { limit: 20, offset: 0 }),
        engine.adapter.queryLinks({ labels: ['traditional-ruler', 'exaltation', 'detriment', 'fall'], limit: 200, offset: 0 }),
      ])

      const allLinks: Link[] = linkResult.items

      // Build planet → label → sign
      const pMap = new Map<string, Map<DignityLabel, string>>()
      for (const link of allLinks) {
        if (!DIGNITY_LABELS.includes(link.label as DignityLabel)) continue
        const src = link.sourceCanonicalName
        const tgt = link.targetCanonicalName
        const signCN = src.startsWith('astrology.zodiac-sign.') ? src : tgt
        const planetCN = src.startsWith('astrology.planet.') ? src : tgt
        if (!signCN.startsWith('astrology.zodiac-sign.')) continue
        if (!planetCN.startsWith('astrology.planet.')) continue
        if (!pMap.has(planetCN)) pMap.set(planetCN, new Map())
        pMap.get(planetCN)!.set(link.label as DignityLabel, signCN)
      }

      const signMap = new Map(signResult.items.map((s: BaseEntity) => [s.canonicalName, s]))
      const orderedSigns = SIGN_ORDER.map(cn => signMap.get(cn)).filter(Boolean) as BaseEntity[]

      const planetMap = new Map(planetResult.items.map((p: BaseEntity) => [p.canonicalName, p]))
      const orderedPlanets = [
        ...PLANET_ORDER.map(cn => planetMap.get(cn)).filter(Boolean) as BaseEntity[],
        ...planetResult.items.filter((p: BaseEntity) => !PLANET_ORDER.includes(p.canonicalName)),
      ]

      setSigns(orderedSigns)
      setPlanets(orderedPlanets)
      setPlanetDigs(pMap)
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

  const signMap = new Map(signs.map(s => [s.canonicalName, s]))

  return (
    <div style={{ maxWidth: '900px' }}>
      <Button variant="ghost" size="sm" onClick={() => window.history.back()} style={{ marginBottom: '12px' }}>
        <ArrowLeft size={14} /> Back
      </Button>
      <div style={{ fontSize: '13px', color: 'var(--color-accent)', marginBottom: '4px' }}>
        Reference › Guides
      </div>
      <h1 style={{ fontSize: '22px', fontWeight: 300, marginBottom: '6px' }}>
        Astrological Dignities
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px', marginTop: 0 }}>
        Traditional essential dignities: Rulership, Exaltation, Detriment, and Fall.
        Click any sign or planet to open its reference page.
      </p>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {DIGNITY_LABELS.map(d => {
          const info = DIGNITY_DISPLAY[d]
          return (
            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <span style={{
                display: 'inline-block', width: '12px', height: '12px',
                borderRadius: '2px', background: info.bg, border: `1px solid ${info.color}55`,
              }} />
              <span style={{ color: 'var(--color-text-muted)' }}>{info.label}</span>
            </div>
          )
        })}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '12px', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 400, color: 'var(--color-text-subtle)', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap', minWidth: '110px' }}>
                Planet
              </th>
              {DIGNITY_LABELS.map(d => (
                <th key={d} style={{
                  padding: '6px 8px', textAlign: 'center',
                  fontWeight: 400, color: 'var(--color-text-subtle)',
                  borderBottom: '1px solid var(--color-border)',
                  whiteSpace: 'nowrap', minWidth: '100px',
                }}>
                  {DIGNITY_DISPLAY[d].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {planets.map((planet, i) => {
              const pdigs = planetDigs.get(planet.canonicalName)
              return (
                <tr
                  key={planet.canonicalName}
                  style={{ background: i % 2 === 0 ? 'var(--color-surface-2)' : 'transparent' }}
                >
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border)' }}>
                    <button
                      onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: planet.canonicalName } })}
                      style={{
                        background: 'none', border: 'none', padding: 0,
                        cursor: 'pointer', color: 'var(--color-text)',
                        fontSize: '13px', fontWeight: 500,
                        fontFamily: 'inherit', textAlign: 'left',
                      }}
                    >
                      {planet.extendedData?.symbol as string ?? ''} {planet.primaryDisplayName}
                    </button>
                  </td>
                  {DIGNITY_LABELS.map(d => {
                    const signCN = pdigs?.get(d)
                    const sign = signCN ? signMap.get(signCN) : undefined
                    const info = DIGNITY_DISPLAY[d]
                    return (
                      <td key={d} style={{
                        padding: '6px 8px', textAlign: 'center',
                        borderBottom: '1px solid var(--color-border)',
                      }}>
                        {sign ? (
                          <button
                            onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: sign.canonicalName } })}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              background: info.bg, border: `1px solid ${info.color}22`,
                              borderRadius: '4px', padding: '3px 8px',
                              cursor: 'pointer', color: info.color,
                              fontSize: '12px', fontFamily: 'inherit',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span>{sign.extendedData?.symbol as string ?? ''}</span>
                            <span>{sign.primaryDisplayName}</span>
                          </button>
                        ) : (
                          <span style={{ color: 'var(--color-border)' }}>—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '16px' }}>
        Traditional rulerships only. Modern rulerships (Uranus, Neptune, Pluto) are not included in dignity calculations by classical astrologers.
      </div>
    </div>
  )
}
