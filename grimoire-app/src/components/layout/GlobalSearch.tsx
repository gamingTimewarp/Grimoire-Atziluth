import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from '@tanstack/react-router'
import { Search, BookMarked, FileText, LayoutGrid, X } from 'lucide-react'
import { useEngineStore } from '@/stores/engine'
import { loadTraditionSettings, resolveDisplayName } from '@/lib/tradition-store'
import { searchJournalEntries } from '@/lib/reading-db'

// ─── Static page index ────────────────────────────────────────────────────────

const STATIC_PAGES: { label: string; sublabel: string; keywords: string; to: string }[] = [
  { label: 'Home',                  sublabel: 'Daily reading & activity',              keywords: 'home daily reading activity',                                       to: '/'                      },
  { label: 'Read',                  sublabel: 'Divination reading session',             keywords: 'read divination spread deck draw cards',                            to: '/read'                  },
  { label: 'Custom Spreads',        sublabel: 'Create & manage custom spreads',         keywords: 'custom spreads create manage positions layout',                     to: '/read/spreads'          },
  { label: 'Custom Decks',          sublabel: 'Create & manage custom decks',           keywords: 'custom decks create manage cards oracle runes',                     to: '/read/decks'            },
  { label: 'Calendar',              sublabel: 'Lunar calendar & transits',              keywords: 'calendar month lunar transit ingress moon',                         to: '/calendar'              },
  { label: 'Astrology',             sublabel: 'Chart & current sky',                    keywords: 'astrology chart natal wheel planets zodiac sky',                    to: '/astrology'             },
  { label: 'Qabalah',               sublabel: 'Tree of Life & Gematria',                keywords: 'qabalah tree of life sephiroth gematria',                           to: '/qabalah'               },
  { label: 'Gematria Calculator',   sublabel: 'Qabalah → Gematria',                    keywords: 'gematria calculator hebrew numerology qabalah',                     to: '/qabalah/gematria'      },
  { label: 'Numerology Calculator', sublabel: 'Qabalah → Numerology',                  keywords: 'numerology pythagorean chaldean life path name expression soul urge personality', to: '/qabalah/numerology' },
  { label: 'Study',                 sublabel: 'Flashcard review',                       keywords: 'study learn flashcard review quiz srs',                             to: '/study'                 },
  { label: 'Reference',             sublabel: 'Entity search & browse',                 keywords: 'reference search entities lookup browse',                           to: '/reference'             },
  { label: 'Journal',               sublabel: 'Readings log & journal entries',         keywords: 'journal entries log notes readings history',                        to: '/journal'               },
  { label: 'Bookmarks',             sublabel: 'Saved entity bookmarks',                 keywords: 'bookmarks saved favorites starred entities',                        to: '/bookmarks'             },
  { label: 'Custom Entities',       sublabel: 'My custom entities',                     keywords: 'custom entities create my',                                         to: '/custom'                },
  { label: 'Custom Traditions',     sublabel: 'Create & manage custom traditions',      keywords: 'custom traditions relationships display names attributions create',  to: '/custom/traditions'     },
  { label: 'Settings',              sublabel: 'Theme, font & preferences',              keywords: 'settings theme font appearance preference',                         to: '/settings'              },
  { label: 'Tradition Settings',    sublabel: 'Enable/disable traditions',              keywords: 'traditions golden dawn thoth settings enable',                      to: '/settings/traditions'   },
  { label: 'Study Settings',        sublabel: 'Study deck configuration',               keywords: 'study settings deck configuration',                                 to: '/study/settings'        },
  { label: 'Nav Settings',          sublabel: 'Sidebar navigation order & visibility',  keywords: 'nav navigation sidebar order hide show',                            to: '/settings/nav'          },
  { label: 'Data',                  sublabel: 'Backup & restore',                       keywords: 'data backup restore export import json',                            to: '/settings/data'         },
]

// ─── Result type ──────────────────────────────────────────────────────────────

type ResultItem = {
  key: string
  type: 'page' | 'entity' | 'journal'
  label: string
  sublabel: string
  onSelect: () => void
}

// ─── Shared results list ──────────────────────────────────────────────────────

function ResultsList({
  groups,
  results,
  activeIndex,
  onSelect,
  onHover,
}: {
  groups: { label: string; icon: React.ReactNode; items: ResultItem[] }[]
  results: ResultItem[]
  activeIndex: number
  onSelect: (item: ResultItem) => void
  onHover: (idx: number) => void
}) {
  return (
    <>
      {groups.map(group => (
        <div key={group.label}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 12px 4px',
            fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--color-text-subtle)',
          }}>
            {group.icon} {group.label}
          </div>
          {group.items.map(item => {
            const idx = results.indexOf(item)
            const isActive = idx === activeIndex
            return (
              <button
                key={item.key}
                onMouseDown={e => { e.preventDefault(); onSelect(item) }}
                onMouseEnter={() => onHover(idx)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 12px',
                  background: isActive ? 'var(--color-surface-3)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  borderLeft: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: isActive ? 500 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', fontFamily: item.type === 'entity' ? 'monospace' : undefined, marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.sublabel}
                </div>
              </button>
            )
          })}
        </div>
      ))}
    </>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface GlobalSearchProps {
  /** When true renders as a search-icon button that opens a full-screen spotlight overlay. */
  spotlight?: boolean
}

export function GlobalSearch({ spotlight = false }: GlobalSearchProps) {
  const [query, setQuery]           = useState('')
  const [open, setOpen]             = useState(false)
  const [results, setResults]       = useState<ResultItem[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [panelTop, setPanelTop]     = useState(0)

  const { engine } = useEngineStore()
  const navigate   = useNavigate()
  const inputRef   = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Close on outside click (inline mode only) ────────────────────────────────
  useEffect(() => {
    if (spotlight) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        containerRef.current?.contains(target) ||
        document.getElementById('global-search-panel')?.contains(target)
      ) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [spotlight])

  // ── Panel position (inline mode only) ────────────────────────────────────────
  useEffect(() => {
    if (spotlight || !open || !inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    setPanelTop(rect.top)
  }, [open, spotlight])

  // ── Debounced search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      if (!spotlight) setOpen(false)
      return
    }

    const q = query.trim().toLowerCase()
    const timer = setTimeout(async () => {
      const items: ResultItem[] = []

      for (const page of STATIC_PAGES) {
        if (page.label.toLowerCase().includes(q) || page.keywords.includes(q)) {
          const to = page.to
          items.push({ key: `page:${to}`, type: 'page', label: page.label, sublabel: page.sublabel, onSelect: () => navigate({ to: to as never }) })
        }
      }

      try {
        const entries = await searchJournalEntries(query.trim(), 5)
        for (const entry of entries) {
          const preview = entry.title ?? (entry.notes.slice(0, 50) + (entry.notes.length > 50 ? '…' : ''))
          items.push({ key: `journal:${entry.id}`, type: 'journal', label: preview, sublabel: `Journal · ${entry.entryDate}`, onSelect: () => navigate({ to: '/journal' }) })
        }
      } catch { /* DB not yet initialised */ }

      if (engine) {
        try {
          const r = await engine.adapter.searchEntities(query.trim(), undefined, { offset: 0, limit: 8 })
          const { customEnabled, primaryBySystem } = loadTraditionSettings()
          const entities = r.items.map(sr => sr.entity).filter(e => customEnabled || e.isBuiltIn)
          for (const entity of entities) {
            const cn = entity.canonicalName
            items.push({ key: `entity:${cn}`, type: 'entity', label: resolveDisplayName(entity, primaryBySystem), sublabel: cn, onSelect: () => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } }) })
          }
        } catch (err) { console.error('[GlobalSearch] entity search error:', err) }
      }

      setResults(items)
      setActiveIndex(-1)
      setOpen(items.length > 0)
    }, 200)

    return () => clearTimeout(timer)
  }, [query, engine, navigate, spotlight])

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      inputRef.current?.blur()
      return
    }
    if (!open || !results.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, -1)) }
    else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); handleSelect(results[activeIndex]) }
  }, [open, results, activeIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (item: ResultItem) => {
    item.onSelect()
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
  }

  const groups: { label: string; icon: React.ReactNode; items: ResultItem[] }[] = [
    { label: 'Pages',    icon: <LayoutGrid size={11} />, items: results.filter(r => r.type === 'page')    },
    { label: 'Entities', icon: <Search     size={11} />, items: results.filter(r => r.type === 'entity')  },
    { label: 'Journal',  icon: <BookMarked size={11} />, items: results.filter(r => r.type === 'journal') },
  ].filter(g => g.items.length > 0)

  // ── Spotlight mode ────────────────────────────────────────────────────────────
  if (spotlight) {
    return (
      <>
        <button
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
          aria-label="Search"
          title="Search"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '36px', height: '36px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-muted)',
            borderRadius: '6px',
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-3)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'; (e.currentTarget as HTMLElement).style.background = 'none' }}
        >
          <Search size={18} />
        </button>

        {open && createPortal(
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 9500,
              background: 'rgba(0,0,0,0.65)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', paddingTop: '15vh',
            }}
            onMouseDown={e => { if (e.target === e.currentTarget) { setOpen(false); setQuery('') } }}
          >
            <div style={{
              width: '100%', maxWidth: '520px', margin: '0 16px',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
              overflow: 'hidden',
              maxHeight: '70vh',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Input row */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--color-border)', gap: '10px' }}>
                <Search size={14} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages, entities, journal…"
                  style={{
                    flex: 1,
                    background: 'none', border: 'none', outline: 'none',
                    color: 'var(--color-text)', fontSize: '14px',
                  }}
                />
                <button
                  onMouseDown={() => { setOpen(false); setQuery('') }}
                  aria-label="Close search"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: '2px' }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  <ResultsList groups={groups} results={results} activeIndex={activeIndex} onSelect={handleSelect} onHover={setActiveIndex} />
                </div>
              )}
              {query.trim() && !results.length && (
                <div style={{ padding: '20px 16px', fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  No results for "{query}"
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
      </>
    )
  }

  // ── Inline mode (sidebar) ─────────────────────────────────────────────────────

  // Responsive panel position
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const panelLeft  = vw <= 680 ? '8px'   : '208px'
  const panelWidth = vw <= 680 ? `${vw - 16}px` : '320px'

  const panel = open && results.length > 0 ? createPortal(
    <div
      id="global-search-panel"
      style={{
        position: 'fixed',
        left: panelLeft,
        top: `${panelTop}px`,
        width: panelWidth,
        maxHeight: '480px',
        overflowY: 'auto',
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 9999,
      }}
    >
      <ResultsList groups={groups} results={results} activeIndex={activeIndex} onSelect={handleSelect} onHover={setActiveIndex} />
    </div>,
    document.body,
  ) : null

  return (
    <div ref={containerRef} style={{ padding: '0 8px 8px' }}>
      <div style={{ position: 'relative' }}>
        <Search size={12} style={{
          position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
          color: 'var(--color-text-subtle)', pointerEvents: 'none',
        }} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (results.length) setOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder="Search…"
          style={{
            width: '100%',
            padding: '7px 8px 7px 28px',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: '20px',
            color: 'var(--color-text)',
            fontSize: '12px',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-accent-muted)' }}
          onMouseLeave={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-border)' }}
        />
      </div>
      {panel}
    </div>
  )
}
