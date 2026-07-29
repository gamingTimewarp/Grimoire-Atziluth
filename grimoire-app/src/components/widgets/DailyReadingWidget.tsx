/**
 * DailyReadingWidget.tsx
 * Converted from the old Home page's DailyReadingSection (index.tsx) — same
 * behavior, now self-contained (fetches its own reading) and wrapped in
 * WidgetCard instead of the old bare HomeSection.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { useEngineStore } from '@/stores/engine'
import { getTodaysDailyReading } from '@/lib/reading-db'
import { loadTraditionSettings, resolveDisplayName } from '@/lib/tradition-store'
import { BUILT_IN_DECK_FILTERS } from '@/lib/built-in-data'
import type { Reading } from '@grimoire/core'

const deckById = new Map(BUILT_IN_DECK_FILTERS.map(d => [d.id, d]))

export function DailyReadingWidget() {
  const navigate = useNavigate()
  const { engine } = useEngineStore()
  const [reading, setReading] = useState<Reading | null | undefined>(undefined)
  const [cardNames, setCardNames] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    getTodaysDailyReading()
      .then(r => setReading(r))
      .catch(() => setReading(null))
  }, [])

  useEffect(() => {
    if (!reading || !engine) return
    const { primaryBySystem } = loadTraditionSettings()
    Promise.all(
      reading.cards.map(c =>
        engine.adapter.getEntityByCanonicalName(c.cardCanonicalName)
          .then(e => [c.cardCanonicalName, e ? resolveDisplayName(e, primaryBySystem) : c.cardCanonicalName.split('.').pop()?.replace(/-/g, ' ') ?? c.cardCanonicalName] as const)
      )
    ).then(pairs => setCardNames(new Map(pairs))).catch(console.error)
  }, [reading, engine])

  return (
    <WidgetCard title="Daily Reading">
      {reading === undefined && (
        <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Loading…</div>
      )}
      {reading === null && (
        <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>
          No daily reading yet — it will appear here shortly after the app loads.
        </div>
      )}
      {reading && (
        <button
          type="button"
          onClick={() => navigate({ to: '/journal' })}
          aria-label="View daily reading in journal"
          style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            cursor: 'pointer', padding: '14px 16px',
            background: 'var(--color-surface-3)', borderRadius: '8px',
            border: '1px solid var(--color-border)',
            transition: 'border-color 0.15s',
            width: '100%', fontFamily: 'inherit', textAlign: 'left',
          }}
          onMouseEnter={e => { (e.currentTarget).style.borderColor = 'var(--color-accent-muted)' }}
          onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--color-border)' }}
        >
          <div style={{
            width: 48, height: 76, flexShrink: 0, borderRadius: '4px',
            background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', color: 'var(--color-accent)',
          }}>
            🂠
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {reading.cards.map((c, i) => {
              const label = cardNames.get(c.cardCanonicalName) ?? c.cardCanonicalName.split('.').pop()?.replace(/-/g, ' ') ?? c.cardCanonicalName
              return (
                <div key={i} style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '2px' }}>
                  {label}
                  {c.orientation === 'reversed' && <span style={{ fontSize: '12px', color: 'var(--color-accent)', marginLeft: '6px' }}>↓ Reversed</span>}
                </div>
              )
            })}
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {deckById.get(reading.deckId)?.displayName ?? reading.deckId}
            </div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
        </button>
      )}
    </WidgetCard>
  )
}
