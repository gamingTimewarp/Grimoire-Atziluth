import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Bookmark, X } from 'lucide-react'
import { getBookmarks, removeBookmark } from '@/lib/bookmarks-store'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity } from '@grimoire/core'
import { EntityArt } from '@/components/ui/EntityArt'

export const Route = createFileRoute('/bookmarks/')({
  component: BookmarksPage,
})

function BookmarksPage() {
  const navigate = useNavigate()
  const { engine } = useEngineStore()
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [entities, setEntities] = useState<Map<string, BaseEntity>>(new Map())

  const refresh = () => setBookmarks(getBookmarks())

  useEffect(() => { refresh() }, [])

  useEffect(() => {
    if (!engine || bookmarks.length === 0) return
    Promise.all(bookmarks.map(cn => engine.adapter.getEntityByCanonicalName(cn)))
      .then(results => {
        const map = new Map<string, BaseEntity>()
        results.forEach((e, i) => { if (e) map.set(bookmarks[i], e) })
        setEntities(map)
      })
      .catch(console.error)
  }, [engine, bookmarks])

  const handleRemove = (cn: string) => {
    removeBookmark(cn)
    refresh()
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Bookmarks</h1>
        <span style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>{bookmarks.length} saved</span>
      </div>

      {bookmarks.length === 0 && (
        <div style={{
          padding: '40px', textAlign: 'center',
          background: 'var(--color-surface-1)', borderRadius: '8px', border: '1px solid var(--color-border)',
        }}>
          <Bookmark size={32} style={{ color: 'var(--color-text-subtle)', marginBottom: '12px' }} />
          <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            No bookmarks yet. Use the ☆ button on any entity's reference page to save it here.
          </div>
        </div>
      )}

      {bookmarks.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
          {bookmarks.map(cn => {
            const entity = entities.get(cn)
            const label = entity?.primaryDisplayName ?? cn.split('.').pop()?.replace(/-/g, ' ') ?? cn
            return (
              <div
                key={cn}
                style={{
                  background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                  borderRadius: '8px', overflow: 'hidden', position: 'relative',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
              >
                {/* Remove button */}
                <button
                  onClick={() => handleRemove(cn)}
                  title="Remove bookmark"
                  style={{
                    position: 'absolute', top: '6px', right: '6px', zIndex: 1,
                    background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
                    borderRadius: '4px', padding: '3px', cursor: 'pointer',
                    display: 'flex', color: 'var(--color-text-subtle)', opacity: 0.7,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--color-danger)' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.color = 'var(--color-text-subtle)' }}
                >
                  <X size={12} />
                </button>

                {/* Card art + label */}
                <div
                  onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })}
                  style={{ cursor: 'pointer', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                >
                  {entity && (
                    <EntityArt entity={entity} width={80} height={128} />
                  )}
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', textAlign: 'center', lineHeight: 1.3 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', fontFamily: 'monospace', textAlign: 'center', wordBreak: 'break-all' }}>
                    {cn}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
