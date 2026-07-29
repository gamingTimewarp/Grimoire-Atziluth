/**
 * StatisticsWidget.tsx
 * At-a-glance reading count for the current month, linking through to the
 * full Journal Statistics page for the rich filterable breakdown.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { listReadingsByMonth } from '@/lib/reading-db'

export function StatisticsWidget() {
  const navigate = useNavigate()
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const now = new Date()
    listReadingsByMonth(now.getFullYear(), now.getMonth() + 1)
      .then(readings => setCount(readings.length))
      .catch(() => setCount(0))
  }, [])

  const monthLabel = new Date().toLocaleDateString(undefined, { month: 'long' })

  return (
    <WidgetCard
      title="Statistics"
      action={
        <button
          onClick={() => navigate({ to: '/journal/stats' })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: 'var(--color-text-subtle)', padding: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
        >
          Full page <ChevronRight size={12} />
        </button>
      }
    >
      {count === null ? (
        <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Loading…</div>
      ) : (
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          <span style={{ fontSize: '20px', fontWeight: 500, color: 'var(--color-text)', marginRight: '6px' }}>{count}</span>
          reading{count === 1 ? '' : 's'} in {monthLabel}
        </div>
      )}
    </WidgetCard>
  )
}
