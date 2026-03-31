import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useState } from 'react'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity } from '@grimoire/core'

export const Route = createFileRoute('/reference/chinese-zodiac-compatibility')({
  component: ChineseZodiacCompatibility,
})

function ChineseZodiacCompatibility() {
  const { engine } = useEngineStore()
  const navigate = useNavigate()

  const [animals, setAnimals] = useState<BaseEntity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!engine) return
    ;(async () => {
      setLoading(true)
      const result = await engine.adapter.listEntities({ entityType: 'chinese-zodiac.animal' }, { limit: 15, offset: 0 })
      const sorted = [...result.items as BaseEntity[]].sort((a, b) =>
        ((a.extendedData?.orderNumber as number) ?? 99) - ((b.extendedData?.orderNumber as number) ?? 99)
      )
      setAnimals(sorted)
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

  const compatSet = new Map<string, Set<string>>()
  for (const animal of animals) {
    const compat = (animal.extendedData?.compatibility as string[] | undefined) ?? []
    compatSet.set(animal.canonicalName, new Set(compat))
  }

  const cellSize = 52

  return (
    <div style={{ maxWidth: '760px' }}>
      <div style={{ fontSize: '13px', color: 'var(--color-accent)', marginBottom: '4px' }}>
        Reference › Guides
      </div>
      <h1 style={{ fontSize: '22px', fontWeight: 300, marginBottom: '6px' }}>
        Chinese Zodiac Compatibility
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px', marginTop: 0 }}>
        Traditional compatibility between the 12 animals. Click any animal name to open its reference page.
      </p>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
          <span style={{ display: 'inline-block', width: '18px', height: '18px', borderRadius: '3px', background: 'rgba(100,180,60,0.18)', border: '1px solid rgba(100,180,60,0.4)' }} />
          <span style={{ color: 'var(--color-text-muted)' }}>Compatible</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
          <span style={{ display: 'inline-block', width: '18px', height: '18px', borderRadius: '3px', background: 'rgba(180,156,90,0.12)', border: '1px solid var(--color-border)' }} />
          <span style={{ color: 'var(--color-text-muted)' }}>Same sign</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
          <span style={{ display: 'inline-block', width: '18px', height: '18px', borderRadius: '3px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />
          <span style={{ color: 'var(--color-text-muted)' }}>Neutral / Challenging</span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ width: cellSize + 30, padding: '4px 8px', fontWeight: 400, color: 'var(--color-text-subtle)' }} />
              {animals.map(animal => (
                <th
                  key={animal.canonicalName}
                  style={{ width: cellSize, minWidth: cellSize, padding: '4px 2px', textAlign: 'center', fontWeight: 400 }}
                >
                  <button
                    onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: animal.canonicalName } })}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                      padding: '2px',
                    }}
                    title={animal.primaryDisplayName}
                  >
                    <span style={{ fontSize: '18px', lineHeight: 1 }}>
                      {animal.extendedData?.chineseChar as string ?? ''}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>
                      {animal.primaryDisplayName}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {animals.map(rowAnimal => (
              <tr key={rowAnimal.canonicalName}>
                <td style={{ padding: '2px 8px', whiteSpace: 'nowrap' }}>
                  <button
                    onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: rowAnimal.canonicalName } })}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '2px', fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>
                      {rowAnimal.extendedData?.chineseChar as string ?? ''}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text)', fontWeight: 500 }}>
                      {rowAnimal.primaryDisplayName}
                    </span>
                  </button>
                </td>
                {animals.map(colAnimal => {
                  const isSelf = rowAnimal.canonicalName === colAnimal.canonicalName
                  const isCompat = compatSet.get(rowAnimal.canonicalName)?.has(colAnimal.canonicalName) ?? false
                  const isReverseCompat = !isCompat && !isSelf && (compatSet.get(colAnimal.canonicalName)?.has(rowAnimal.canonicalName) ?? false)

                  let bg = 'var(--color-surface-2)'
                  let content: React.ReactNode = null

                  if (isSelf) {
                    bg = 'rgba(180,156,90,0.10)'
                    content = <span style={{ color: 'var(--color-text-subtle)', fontSize: '14px' }}>☯</span>
                  } else if (isCompat || isReverseCompat) {
                    bg = 'rgba(100,180,60,0.14)'
                    content = <span style={{ color: 'rgba(100,180,60,0.9)', fontSize: '14px' }}>✓</span>
                  }

                  return (
                    <td
                      key={colAnimal.canonicalName}
                      style={{
                        width: cellSize, height: cellSize,
                        textAlign: 'center', verticalAlign: 'middle',
                        border: '1px solid var(--color-border)',
                        background: bg,
                        fontSize: '13px',
                      }}
                    >
                      {content}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '16px' }}>
        Compatibility data is based on traditional Chinese sources. The grid is symmetric — a check mark
        in either direction indicates a compatible pairing.
      </div>
    </div>
  )
}
