/**
 * BookmarksWidget.tsx
 * Converted from the old Home page's Bookmarks block (index.tsx) — same
 * behavior, now self-contained and rendering nothing when there are no
 * bookmarks, same as before.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Star } from 'lucide-react'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { ActivityItem } from './ActivityItem'
import { useEngineStore } from '@/stores/engine'
import { getBookmarks } from '@/lib/bookmarks-store'
import { loadTraditionSettings, resolveDisplayName } from '@/lib/tradition-store'

export function BookmarksWidget() {
  const navigate = useNavigate()
  const { engine } = useEngineStore()
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [bookmarkNames, setBookmarkNames] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    setBookmarks(getBookmarks())
  }, [])

  useEffect(() => {
    if (!engine || bookmarks.length === 0) return
    const { primaryBySystem } = loadTraditionSettings()
    Promise.all(
      bookmarks.map(cn =>
        engine.adapter.getEntityByCanonicalName(cn)
          .then(e => e ? [cn, resolveDisplayName(e, primaryBySystem)] as const : null)
      )
    ).then(results => {
      const map = new Map<string, string>()
      for (const r of results) { if (r) map.set(r[0], r[1]) }
      setBookmarkNames(map)
    }).catch(console.error)
  }, [engine, bookmarks])

  if (bookmarks.length === 0) return null

  return (
    <WidgetCard title="Bookmarks">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {bookmarks.map(cn => (
          <ActivityItem
            key={cn}
            icon={<Star size={13} style={{ color: 'var(--color-accent)' }} />}
            label={bookmarkNames.get(cn) ?? cn}
            onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })}
          />
        ))}
      </div>
    </WidgetCard>
  )
}
