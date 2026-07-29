/**
 * OnThisDayWidget.tsx
 * Readings and journal entries made on this calendar month+day in past
 * years — a lookback, not a lookahead. Excludes the current year (that's
 * just "today," already covered by TodaysActivityWidget) and caps the list.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { BookMarked, PenLine } from 'lucide-react'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { ActivityItem } from './ActivityItem'
import { listReadingsOnThisDay, listJournalEntriesOnThisDay } from '@/lib/reading-db'
import type { JournalEntry } from '@/lib/reading-db'
import type { Reading } from '@grimoire/core'
import { BUILT_IN_DECK_FILTERS } from '@/lib/built-in-data'
import { useSpreadById } from '@/lib/spread-hooks'

const deckById = new Map(BUILT_IN_DECK_FILTERS.map(d => [d.id, d]))
const MAX_SHOWN = 5

export function OnThisDayWidget() {
  const navigate = useNavigate()
  const spreadById = useSpreadById()
  const [readings, setReadings] = useState<Reading[]>([])
  const [entries,  setEntries]  = useState<JournalEntry[]>([])
  const [loaded,   setLoaded]   = useState(false)

  useEffect(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    Promise.all([
      listReadingsOnThisDay(now.getMonth() + 1, now.getDate()),
      listJournalEntriesOnThisDay(now.getMonth() + 1, now.getDate()),
    ]).then(([r, e]) => {
      setReadings(r.filter(x => !x.readingDate.startsWith(String(currentYear))))
      setEntries(e.filter(x => !x.entryDate.startsWith(String(currentYear))))
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  if (!loaded) return null
  if (readings.length === 0 && entries.length === 0) return null

  const items = [
    ...readings.map(r => ({ kind: 'reading' as const, date: r.readingDate, data: r })),
    ...entries.map(e => ({ kind: 'entry' as const, date: e.entryDate, data: e })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, MAX_SHOWN)

  return (
    <WidgetCard title="On This Day">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map(item => {
          const year = item.date.slice(0, 4)
          if (item.kind === 'reading') {
            const r = item.data
            return (
              <ActivityItem
                key={r.id}
                icon={<BookMarked size={13} />}
                label={spreadById.get(r.spreadId ?? '')?.displayName ?? 'Free Reading'}
                sub={`${deckById.get(r.deckId)?.displayName ?? r.deckId} · ${year}`}
                onClick={() => navigate({ to: '/journal' })}
              />
            )
          }
          const e = item.data
          return (
            <ActivityItem
              key={e.id}
              icon={<PenLine size={13} />}
              label={e.title ?? 'Journal Entry'}
              sub={year}
              onClick={() => navigate({ to: '/journal' })}
            />
          )
        })}
      </div>
    </WidgetCard>
  )
}
