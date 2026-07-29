/**
 * DiscoverWidget.tsx
 * Spotlights one random entity from the full dataset per visit, using the
 * same getRandomEntity helper the Reference page's shuffle button uses.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Shuffle } from 'lucide-react'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { useEngineStore } from '@/stores/engine'
import { getRandomEntity } from '@/lib/entity-attributes'
import { formatEntityType } from '@/lib/format'
import type { BaseEntity } from '@grimoire/core'

export function DiscoverWidget() {
  const navigate = useNavigate()
  const { engine } = useEngineStore()
  const [entity, setEntity] = useState<BaseEntity | null | undefined>(undefined)

  const roll = () => {
    if (!engine) return
    setEntity(undefined)
    getRandomEntity(engine.adapter).then(setEntity).catch(() => setEntity(null))
  }

  useEffect(roll, [engine])

  return (
    <WidgetCard
      title="Discover"
      action={
        <button
          onClick={roll}
          title="Show another"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--color-text-subtle)', padding: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
        >
          <Shuffle size={13} />
        </button>
      }
    >
      {!entity ? (
        <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Loading…</div>
      ) : (
        <button
          onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: entity.canonicalName } })}
          style={{
            display: 'block', width: '100%', textAlign: 'left', fontFamily: 'inherit',
            padding: '10px 12px', background: 'var(--color-surface-3)',
            border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '2px' }}>{entity.primaryDisplayName}</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>{formatEntityType(entity.entityType)}</div>
          {entity.description && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
              {entity.description.slice(0, 140)}{entity.description.length > 140 ? '…' : ''}
            </div>
          )}
        </button>
      )}
    </WidgetCard>
  )
}
