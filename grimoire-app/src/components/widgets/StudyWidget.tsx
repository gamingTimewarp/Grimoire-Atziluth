/**
 * StudyWidget.tsx
 * At-a-glance study/SRS progress — cards due today (against the Default
 * preset's scope, same as the Study dashboard's own aggregate) and current
 * streak — linking through to the full Study page.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronRight, Flame } from 'lucide-react'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { useEngineStore } from '@/stores/engine'
import { getAllCardStates, getStreak, getStudyPreset, DEFAULT_PRESET_ID } from '@/lib/quiz-db'
import { countDueCards } from '@/lib/quiz-engine'

export function StudyWidget() {
  const navigate = useNavigate()
  const { engine } = useEngineStore()
  const [due, setDue] = useState<number | null>(null)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    if (!engine) return
    ;(async () => {
      const [preset, states, str] = await Promise.all([
        getStudyPreset(DEFAULT_PRESET_ID),
        getAllCardStates(),
        getStreak(),
      ])
      setStreak(str)
      if (!preset) { setDue(0); return }
      const counts = await countDueCards(engine.adapter, preset.settings, states)
      setDue(counts.due)
    })().catch(() => setDue(0))
  }, [engine])

  return (
    <WidgetCard
      title="Study"
      action={
        <button
          onClick={() => navigate({ to: '/study' })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: 'var(--color-text-subtle)', padding: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
        >
          Full page <ChevronRight size={12} />
        </button>
      }
    >
      {due === null ? (
        <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: 'var(--color-text)' }}>{due}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>due today</div>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {streak > 0 && <Flame size={16} style={{ color: 'var(--color-accent)' }} />}
              {streak}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>day streak</div>
          </div>
        </div>
      )}
    </WidgetCard>
  )
}
