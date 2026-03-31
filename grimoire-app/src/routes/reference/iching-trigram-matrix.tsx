import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useState } from 'react'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity } from '@grimoire/core'

export const Route = createFileRoute('/reference/iching-trigram-matrix')({
  component: IChingTrigramMatrix,
})

// Trigrams in King Wen sequence order
const TRIGRAM_ORDER = [
  'iching.trigram.heaven',
  'iching.trigram.lake',
  'iching.trigram.fire',
  'iching.trigram.thunder',
  'iching.trigram.wind',
  'iching.trigram.water',
  'iching.trigram.mountain',
  'iching.trigram.earth',
]

function IChingTrigramMatrix() {
  const { engine } = useEngineStore()
  const navigate = useNavigate()

  const [trigrams, setTrigrams] = useState<BaseEntity[]>([])
  const [hexagrams, setHexagrams] = useState<BaseEntity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!engine) return
    ;(async () => {
      setLoading(true)
      const [trigResult, hexResult] = await Promise.all([
        engine.adapter.listEntities({ entityType: 'iching.trigram' }, { limit: 20, offset: 0 }),
        engine.adapter.listEntities({ entityType: 'iching.hexagram' }, { limit: 70, offset: 0 }),
      ])
      const trigramMap = new Map(trigResult.items.map((t: BaseEntity) => [t.canonicalName, t]))
      const ordered = TRIGRAM_ORDER.map(cn => trigramMap.get(cn)).filter(Boolean) as BaseEntity[]
      setTrigrams(ordered)
      setHexagrams(hexResult.items)
      setLoading(false)
    })()
  }, [engine])

  // Build lookup: `${upperCN}__${lowerCN}` → hexagram
  const hexLookup = React.useMemo(() => {
    const map = new Map<string, BaseEntity>()
    for (const hex of hexagrams) {
      const upper = hex.extendedData?.upperTrigram as string | undefined
      const lower = hex.extendedData?.lowerTrigram as string | undefined
      if (upper && lower) {
        map.set(`${upper}__${lower}`, hex)
      }
    }
    return map
  }, [hexagrams])

  if (loading) {
    return (
      <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', padding: '24px' }}>
        Loading…
      </div>
    )
  }

  const cellSize = 72

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ fontSize: '13px', color: 'var(--color-accent)', marginBottom: '4px' }}>
        Reference › Guides
      </div>
      <h1 style={{ fontSize: '22px', fontWeight: 300, marginBottom: '6px' }}>
        I Ching Trigram Matrix
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px', marginTop: 0 }}>
        Rows are upper trigrams (heaven/sky); columns are lower trigrams (earth/ground). Each cell
        is the hexagram formed by their combination. Click any cell to open its reference page.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ width: cellSize, minWidth: cellSize, padding: '6px 8px' }}>
                <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', textAlign: 'right', lineHeight: 1.3 }}>
                  upper ↓<br />lower →
                </div>
              </th>
              {trigrams.map(t => (
                <th
                  key={t.canonicalName}
                  style={{
                    width: cellSize, minWidth: cellSize,
                    padding: '6px 4px', textAlign: 'center',
                    fontWeight: 400, color: 'var(--color-text-muted)',
                  }}
                >
                  <div style={{ fontSize: '22px', lineHeight: 1 }}>
                    {t.extendedData?.glyph as string ?? ''}
                  </div>
                  <div style={{ fontSize: '10px', marginTop: '3px', color: 'var(--color-text-subtle)' }}>
                    {t.primaryDisplayName}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trigrams.map(upper => (
              <tr key={upper.canonicalName}>
                <th style={{
                  padding: '6px 8px', textAlign: 'center',
                  fontWeight: 400, color: 'var(--color-text-muted)',
                  borderRight: '1px solid var(--color-border)',
                }}>
                  <div style={{ fontSize: '22px', lineHeight: 1 }}>
                    {upper.extendedData?.glyph as string ?? ''}
                  </div>
                  <div style={{ fontSize: '10px', marginTop: '3px', color: 'var(--color-text-subtle)' }}>
                    {upper.primaryDisplayName}
                  </div>
                </th>
                {trigrams.map(lower => {
                  const hex = hexLookup.get(`${upper.canonicalName}__${lower.canonicalName}`)
                  const num = hex?.extendedData?.number as number | undefined
                  return (
                    <td
                      key={lower.canonicalName}
                      onClick={() => hex && navigate({ to: '/reference/$canonicalName', params: { canonicalName: hex.canonicalName } })}
                      title={hex ? `${hex.primaryDisplayName} (${num})` : ''}
                      style={{
                        width: cellSize, minWidth: cellSize,
                        height: cellSize,
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        border: '1px solid var(--color-border)',
                        cursor: hex ? 'pointer' : 'default',
                        background: upper.canonicalName === lower.canonicalName
                          ? 'rgba(180,156,90,0.06)'
                          : 'var(--color-surface-2)',
                        transition: 'background 0.12s',
                        padding: '4px',
                      }}
                      onMouseEnter={e => { if (hex) e.currentTarget.style.background = 'rgba(180,156,90,0.14)' }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = upper.canonicalName === lower.canonicalName
                          ? 'rgba(180,156,90,0.06)'
                          : 'var(--color-surface-2)'
                      }}
                    >
                      {hex ? (
                        <>
                          <div style={{ fontSize: '20px', lineHeight: 1 }}>
                            {hex.extendedData?.glyph as string ?? ''}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
                            {num}
                          </div>
                          <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', lineHeight: 1.2, marginTop: '1px' }}>
                            {hex.primaryDisplayName}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: 'var(--color-border)' }}>—</span>
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
        Trigrams in King Wen sequence. Click a hexagram to open its reference page.
      </div>
    </div>
  )
}
