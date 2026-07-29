/**
 * RecentlyViewedWidget.tsx
 * Small Home-page rendering of getRecentEntities — the data layer is
 * shared with the Reference page's own Recently Viewed section, but that
 * component is private to reference/index.tsx, so this is a new (smaller,
 * 5-item) renderer rather than a reuse.
 */

import { useNavigate } from '@tanstack/react-router'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { getRecentEntities } from '@/lib/recent-entities'
import { formatEntityType } from '@/lib/format'

export function RecentlyViewedWidget() {
  const navigate = useNavigate()
  const recent = getRecentEntities(5)

  if (recent.length === 0) return null

  return (
    <WidgetCard title="Recently Viewed">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {recent.map(r => (
          <button
            key={r.canonicalName}
            onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: r.canonicalName } })}
            style={{
              display: 'flex', alignItems: 'baseline', gap: '10px',
              padding: '8px 12px', background: 'var(--color-surface-3)',
              border: '1px solid var(--color-border)', borderRadius: '6px',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%',
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--color-text)', flex: 1 }}>{r.displayName}</span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>{formatEntityType(r.entityType)}</span>
          </button>
        ))}
      </div>
    </WidgetCard>
  )
}
