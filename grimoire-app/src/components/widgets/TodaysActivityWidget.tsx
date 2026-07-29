/**
 * TodaysActivityWidget.tsx
 * Converted from the old Home page's "Today's Activity" block (index.tsx) —
 * same behavior (readings + journal entries made today, daily reading
 * excluded since it has its own widget), now self-contained and rendering
 * nothing at all when there's no activity, same as before.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { BookMarked, PenLine } from 'lucide-react'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { ActivityItem } from './ActivityItem'
import { listTodaysActivity } from '@/lib/reading-db'
import type { JournalEntry } from '@/lib/reading-db'
import type { Reading } from '@grimoire/core'
import { BUILT_IN_DECK_FILTERS } from '@/lib/built-in-data'
import { useSpreadById } from '@/lib/spread-hooks'

const deckById = new Map(BUILT_IN_DECK_FILTERS.map(d => [d.id, d]))

export function TodaysActivityWidget() {
  const navigate = useNavigate()
  const spreadById = useSpreadById()
  const [todayReadings, setTodayReadings] = useState<Reading[]>([])
  const [todayEntries,  setTodayEntries]  = useState<JournalEntry[]>([])

  useEffect(() => {
    listTodaysActivity()
      .then(({ readings, entries }) => {
        setTodayReadings(readings)
        setTodayEntries(entries)
      })
      .catch(console.error)
  }, [])

  const activityReadings = todayReadings.filter(r => !r.isDaily)
  if (activityReadings.length === 0 && todayEntries.length === 0) return null

  return (
    <WidgetCard title="Today's Activity">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {activityReadings.map(r => (
          <ActivityItem
            key={r.id}
            icon={<BookMarked size={13} />}
            label={spreadById.get(r.spreadId ?? '')?.displayName ?? 'Free Reading'}
            sub={deckById.get(r.deckId)?.displayName}
            onClick={() => navigate({ to: '/journal' })}
          />
        ))}
        {todayEntries.map(e => (
          <ActivityItem
            key={e.id}
            icon={<PenLine size={13} />}
            label={e.title ?? 'Journal Entry'}
            onClick={() => navigate({ to: '/journal' })}
          />
        ))}
      </div>
    </WidgetCard>
  )
}
