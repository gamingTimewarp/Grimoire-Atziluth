import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { listReadings, listJournalEntries, saveJournalEntry, deleteJournalEntry, deleteReading, getEntityLinksForEntry, addEntityLinkToEntry, removeEntityLinkFromEntry, getEntityLinksForReading, addEntityLinkToReading, removeEntityLinkFromReading } from '@/lib/reading-db'
import type { JournalEntry } from '@/lib/reading-db'
import type { Reading } from '@grimoire/core'
import { BUILT_IN_DECK_FILTERS } from '@/lib/built-in-data'
import { useSpreadById } from '@/lib/spread-hooks'
import type { SpreadPosition } from '@grimoire/core'
import { BookMarked, ChevronDown, ChevronRight, Plus, PenLine, Trash2, List, Circle, X, Link2, BarChart2, Share2 } from 'lucide-react'
import { RichTextEditor, RichTextRenderer, isRichTextEmpty } from '@/components/ui/RichText'
import { DateInput } from '@/components/ui/DateInput'
import { SpreadGrid } from '@/components/ui/SpreadGrid'
import type { CardSlot } from '@/components/ui/SpreadGrid'
import { TreeOfLifeSpreadDisplay } from '@/components/ui/TreeOfLifeSpread'
import { ChakraSpreadDisplay } from '@/components/ui/ChakraSpread'
import { YearAheadSpreadDisplay } from '@/components/ui/YearAheadSpread'
import { ZodiacYearSpreadDisplay } from '@/components/ui/ZodiacYearSpread'
import { EntityArt } from '@/components/ui/EntityArt'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity } from '@grimoire/core'
import { WheelChart } from '@/components/ui/WheelChart'
import { ZoomableSVGContainer } from '@/components/ui/ZoomableSVGContainer'
import { exportReadingAsMarkdown, exportReadingAsImage } from '@/lib/reading-export'
import { Button } from '@/components/ui/Button'
import { getMoonPhase, getPlanetaryDayRuler, getWuxingPhase } from '@/lib/astro-calc'
import { loadTraditionSettings } from '@/lib/tradition-store'
import { loadAccessibilitySettings } from '@/lib/accessibility-store'
import { loadSettings, saveSettings } from '@/lib/settings-store'
import { zonedTimeToUtc } from '@/lib/timezone'
import { AlignJustify, AlignLeft } from 'lucide-react'
import type { NatalChartData } from '@/lib/astro-engine'
import { getSignsForMode, getSunSignForMode, getNatalChart, getTransitAspects, MODERN_PLANET_CNS } from '@/lib/astro-engine'
import { listNatalCharts } from '@/lib/natal-db'

export const Route = createFileRoute('/journal/')({
  component: JournalPage,
})

// Index both parent deck IDs and variant IDs → display label
const deckNameById = new Map<string, string>()
for (const d of BUILT_IN_DECK_FILTERS) {
  deckNameById.set(d.id, d.displayName)
  for (const v of d.variants ?? []) {
    deckNameById.set(v.id, `${d.displayName} — ${v.label}`)
  }
}

type ListItem =
  | { type: 'reading'; date: string; data: Reading }
  | { type: 'entry';   date: string; data: JournalEntry }

type PendingDelete = {
  label: string
  item: ListItem
  timer: ReturnType<typeof setTimeout>
}

function JournalPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [compact, setCompact] = useState(() => loadSettings().defaultCompactJournal)
  const [pendingDeletes, setPendingDeletes] = useState<Map<string, PendingDelete>>(new Map())
  const a11y = loadAccessibilitySettings()

  const handlePendingDelete = (item: ListItem, label: string) => {
    const id = item.data.id
    setItems(prev => prev.filter(i => i.data.id !== id))
    const timer = setTimeout(async () => {
      try {
        if (item.type === 'reading') await deleteReading(id)
        else await deleteJournalEntry(id)
      } catch (e) { console.error(e) }
      setPendingDeletes(m => { const next = new Map(m); next.delete(id); return next })
    }, 5000)
    setPendingDeletes(m => new Map(m).set(id, { label, item, timer }))
  }

  const handleUndoDelete = (id: string) => {
    setPendingDeletes(prev => {
      const pending = prev.get(id)
      if (!pending) return prev
      clearTimeout(pending.timer)
      setItems(items => {
        const merged = [...items, pending.item]
        merged.sort((a, b) => b.date.localeCompare(a.date))
        return merged
      })
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }

  const toggleCompact = () => {
    const next = !compact
    setCompact(next)
    // Persist as new default
    const settings = loadSettings()
    saveSettings({ ...settings, defaultCompactJournal: next })
  }

  // New-entry form state
  const [showForm, setShowForm] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [formEntityLinks, setFormEntityLinks] = useState<string[]>([])
  const [formEntityNames, setFormEntityNames] = useState<Map<string, string>>(new Map())
  const [saving, setSaving] = useState(false)

  const loadAll = () => {
    setLoading(true)
    Promise.all([listReadings(), listJournalEntries()])
      .then(([readings, entries]) => {
        const merged: ListItem[] = [
          ...readings.map(r => ({ type: 'reading' as const, date: r.readingDate, data: r })),
          ...entries.map(e => ({ type: 'entry' as const, date: e.entryDate, data: e })),
        ]
        merged.sort((a, b) => b.date.localeCompare(a.date))
        setItems(merged)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAll() }, [])

  const handleSaveEntry = async () => {
    if (isRichTextEmpty(formNotes)) return
    setSaving(true)
    try {
      const entry = await saveJournalEntry({ title: formTitle.trim() || undefined, notes: formNotes.trim(), entryDate: formDate })
      await Promise.all(formEntityLinks.map(cn => addEntityLinkToEntry(entry.id, cn)))
      setFormTitle('')
      setFormNotes('')
      setFormDate(new Date().toISOString().slice(0, 10))
      setFormEntityLinks([])
      setFormEntityNames(new Map())
      setShowForm(false)
      loadAll()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Loading…</div>
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Journal</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/journal/stats"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-text-muted)', textDecoration: 'none', padding: '4px 8px' }}
          >
            <BarChart2 size={13} /> Statistics
          </Link>
          <button
            type="button"
            onClick={toggleCompact}
            title={compact ? 'Switch to standard view' : 'Switch to compact view'}
            aria-pressed={compact}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: compact ? 'var(--color-accent)' : 'var(--color-text-subtle)', display: 'flex', alignItems: 'center' }}
          >
            {compact ? <AlignLeft size={14} /> : <AlignJustify size={14} />}
          </button>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/read/record' })}>
            <PenLine size={14} /> Record Physical
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setShowForm(s => !s) }}>
            <PenLine size={14} /> New Entry
          </Button>
          <Button size="sm" onClick={() => navigate({ to: '/read' })}>
            <Plus size={14} /> New Reading
          </Button>
        </div>
      </div>

      {/* Filter */}
      {items.length > 0 && (
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter entries…"
          style={{
            width: '100%', padding: '8px 12px', marginBottom: '16px',
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            borderRadius: '6px', color: 'var(--color-text)', fontSize: '13px',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      )}

      {/* Inline new-entry form */}
      {showForm && (
        <div style={{
          marginBottom: '20px', padding: '16px 20px',
          background: 'var(--color-surface-2)', border: '1px solid var(--color-accent-muted)',
          borderRadius: '8px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '12px' }}>
            New Journal Entry
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', marginBottom: '10px' }}>
            <input
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="Title (optional)"
              style={{
                padding: '8px 12px', background: 'var(--color-surface-3)',
                border: '1px solid var(--color-border)', borderRadius: '6px',
                color: 'var(--color-text)', fontSize: '14px', outline: 'none',
              }}
            />
            <DateInput
              value={formDate}
              onChange={setFormDate}
              style={{
                padding: '8px 10px', background: 'var(--color-surface-3)',
                border: '1px solid var(--color-border)', borderRadius: '6px',
                color: 'var(--color-text)', fontSize: '14px', outline: 'none',
                colorScheme: 'dark',
              }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <RichTextEditor
              value={formNotes}
              onChange={setFormNotes}
              placeholder="Write your observations, reflections, or ritual notes…"
              minHeight={120}
            />
          </div>
          <EntityLinksEditor
            links={formEntityLinks}
            displayNames={formEntityNames}
            onAdd={(cn, name) => {
              setFormEntityLinks(ls => [...ls, cn])
              setFormEntityNames(m => new Map(m).set(cn, name))
            }}
            onRemove={cn => setFormEntityLinks(ls => ls.filter(l => l !== cn))}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <Button onClick={handleSaveEntry} disabled={saving || isRichTextEmpty(formNotes)}>
              {saving ? 'Saving…' : 'Save Entry'}
            </Button>
            <Button variant="ghost" onClick={() => { setShowForm(false); setFormEntityLinks([]); setFormEntityNames(new Map()) }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div style={{
          padding: '40px', textAlign: 'center',
          background: 'var(--color-surface-1)', borderRadius: '8px', border: '1px solid var(--color-border)',
        }}>
          <BookMarked size={32} style={{ color: 'var(--color-text-subtle)', marginBottom: '12px' }} />
          <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            No entries yet. Start a reading or write a new entry.
          </div>
        </div>
      )}

      {/* Undo delete toast */}
      {pendingDeletes.size > 0 && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="false"
          style={{
            position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1000, alignItems: 'center',
          }}
        >
          {Array.from(pendingDeletes.entries()).map(([id, { label }]) => (
            <div key={id} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '10px 18px',
              background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
              borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              fontSize: '13px', color: 'var(--color-text)',
            }}>
              <span>Deleted <strong>{label}</strong></span>
              <button
                onClick={() => handleUndoDelete(id)}
                style={{
                  background: 'none', border: '1px solid var(--color-accent)',
                  borderRadius: '4px', padding: '2px 10px',
                  cursor: 'pointer', color: 'var(--color-accent)', fontSize: '12px',
                }}
              >
                Undo
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Combined list */}
      {items.length > 0 && (() => {
        const q = filter.trim().toLowerCase()
        const visible = q
          ? items.filter(item => {
              if (item.type === 'reading') {
                const r = item.data
                return (
                  r.question?.toLowerCase().includes(q) ||
                  r.notes?.toLowerCase().includes(q) ||
                  r.deckId?.toLowerCase().includes(q) ||
                  r.cards.some(c => c.cardCanonicalName.toLowerCase().includes(q))
                )
              }
              return (
                item.data.title?.toLowerCase().includes(q) ||
                item.data.notes?.toLowerCase().includes(q)
              )
            })
          : items
        return visible.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '6px' : '12px' }}>
            {visible.map(item =>
              item.type === 'reading'
                ? <ReadingRow key={`r-${item.data.id}`} reading={item.data} compact={compact} reversedDisplay={a11y.reversedDisplay} onDelete={label => handlePendingDelete(item, label)} />
                : <EntryRow key={`e-${item.data.id}`} entry={item.data} compact={compact} onDelete={label => handlePendingDelete(item, label)} />
            )}
          </div>
        ) : (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>No entries match "{filter}".</div>
        )
      })()}
    </div>
  )
}

// ─── Daily context bar (shown in expanded entry/reading views) ────────────────

function DailyContextBar({ dateStr }: { dateStr: string }) {
  const navigate = useNavigate()
  const date = new Date(dateStr.slice(0, 10) + 'T12:00:00')
  const { astrologyMode } = loadTraditionSettings()
  const moon   = getMoonPhase(date)
  const ruler  = getPlanetaryDayRuler(date)
  const sun    = getSunSignForMode(date, astrologyMode)
  const wuxing = getWuxingPhase(date)

  const item = (text: string, cn?: string) => (
    <span
      onClick={cn ? () => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } }) : undefined}
      style={{ cursor: cn ? 'pointer' : 'default', color: 'var(--color-text-subtle)', fontSize: '11px' }}
      onMouseEnter={cn ? e => { e.currentTarget.style.color = 'var(--color-accent)' } : undefined}
      onMouseLeave={cn ? e => { e.currentTarget.style.color = 'var(--color-text-subtle)' } : undefined}
    >
      {text}
    </span>
  )

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
      <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: '2px' }}>Day</span>
      {item(`${ruler.symbol} ${ruler.name}`, ruler.canonicalName)}
      <span style={{ color: 'var(--color-border)' }}>·</span>
      {item(`${moon.emoji} ${moon.name} ${moon.illumination}%`)}
      <span style={{ color: 'var(--color-border)' }}>·</span>
      {item(`${sun.symbol} ${sun.name}`, sun.canonicalName)}
      <span style={{ color: 'var(--color-border)' }}>·</span>
      {item(`${wuxing.nameZh} ${wuxing.name}`, wuxing.canonicalName)}
    </div>
  )
}

// ─── Standalone journal entry row ─────────────────────────────────────────────

function EntryRow({ entry, onDelete, compact = false }: { entry: JournalEntry; onDelete: (label: string) => void; compact?: boolean }) {
  const navigate = useNavigate()
  const { engine } = useEngineStore()
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [entityLinks, setEntityLinks] = useState<string[]>([])
  const [entityNames, setEntityNames] = useState<Map<string, string>>(new Map())
  const [linksLoaded, setLinksLoaded] = useState(false)

  // Load entity links on first expand
  useEffect(() => {
    if (!expanded || linksLoaded) return
    getEntityLinksForEntry(entry.id)
      .then(async cns => {
        setEntityLinks(cns)
        if (cns.length > 0 && engine) {
          const pairs = await Promise.all(
            cns.map(cn => engine.adapter.getEntityByCanonicalName(cn).then(e => [cn, e?.primaryDisplayName ?? cn] as const))
          )
          setEntityNames(new Map(pairs))
        }
        setLinksLoaded(true)
      })
      .catch(console.error)
  }, [expanded, linksLoaded, entry.id, engine])

  const handleAddLink = async (cn: string, displayName: string) => {
    await addEntityLinkToEntry(entry.id, cn)
    setEntityLinks(ls => [...ls, cn])
    setEntityNames(m => new Map(m).set(cn, displayName))
  }

  const handleRemoveLink = async (cn: string) => {
    await removeEntityLinkFromEntry(entry.id, cn)
    setEntityLinks(ls => ls.filter(l => l !== cn))
  }

  const date = new Date(entry.entryDate).toLocaleDateString(undefined, {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  })

  return (
    <div style={{
      background: 'var(--color-surface-2)',
      borderRadius: '8px', border: '1px solid var(--color-border)',
      overflow: 'hidden',
    }}>
      <div
        style={{
          padding: compact ? '10px 16px' : '16px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <div
          onClick={() => setExpanded(e => !e)}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1, minWidth: 0 }}
        >
          <PenLine size={14} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
          <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text)' }}>
            {entry.title ?? 'Journal Entry'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>{date}</span>
          {confirmDelete ? (
            <>
              <button
                onClick={() => { setConfirmDelete(false); onDelete(entry.title ?? 'Journal Entry') }}
                style={{ background: 'none', border: 'none', padding: '2px 6px', cursor: 'pointer', fontSize: '12px', color: 'var(--color-danger)', whiteSpace: 'nowrap' }}
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ background: 'none', border: 'none', padding: '2px 4px', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-muted)' }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex', opacity: 0.5 }}
              title="Delete entry"
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--color-danger)' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--color-text-subtle)' }}
            >
              <Trash2 size={14} />
            </button>
          )}
          <div onClick={() => setExpanded(e => !e)} style={{ cursor: 'pointer', display: 'flex' }}>
            {expanded
              ? <ChevronDown size={16} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
              : <ChevronRight size={16} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
            }
          </div>
        </div>
      </div>

      {!expanded && entry.notes && (
        <div style={{ padding: '0 20px 14px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          {entry.notes.replace(/[#*`_~>\-]/g, '').slice(0, 120)}{entry.notes.replace(/[#*`_~>\-]/g, '').length > 120 ? '…' : ''}
        </div>
      )}

      {expanded && (
        <div style={{ padding: '14px 20px 20px', borderTop: '1px solid var(--color-border)' }}>
          <DailyContextBar dateStr={entry.entryDate} />
          <div style={{ marginBottom: '16px' }}>
            <RichTextRenderer markdown={entry.notes} />
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <Link2 size={11} /> Linked Entities
            </div>
            {/* Entity chips with navigate */}
            {entityLinks.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {entityLinks.map(cn => (
                  <span
                    key={cn}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '3px 8px', background: 'var(--color-surface-3)',
                      border: '1px solid var(--color-accent-muted)', borderRadius: '4px',
                      fontSize: '12px', color: 'var(--color-accent)',
                    }}
                  >
                    <button
                      onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-accent)', fontSize: '12px' }}
                    >
                      {entityNames.get(cn) ?? cn.split('.').pop()}
                    </button>
                    <button
                      onClick={() => handleRemoveLink(cn)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-accent)', lineHeight: 1, display: 'flex' }}
                      title="Remove link"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <EntityLinksEditor
              links={entityLinks}
              displayNames={entityNames}
              onAdd={handleAddLink}
              onRemove={handleRemoveLink}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Reading row ───────────────────────────────────────────────────────────────

function ReadingRow({ reading, onDelete, compact = false, reversedDisplay }: { reading: Reading; onDelete: (label: string) => void; compact?: boolean; reversedDisplay?: import('@/lib/accessibility-store').ReversedDisplay }) {
  const navigate = useNavigate()
  const { engine } = useEngineStore()
  const spreadById = useSpreadById()
  const [expanded,       setExpanded]      = useState(false)
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [entityMap,      setEntityMap]      = useState<Map<string, BaseEntity>>(new Map())
  const [entityLinks,    setEntityLinks]    = useState<string[]>([])
  const [entityNames,    setEntityNames]    = useState<Map<string, string>>(new Map())
  const [linksLoaded,    setLinksLoaded]    = useState(false)
  const [exporting,      setExporting]      = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  const date = new Date(reading.readingDate).toLocaleDateString(undefined, {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  })

  const deckName = deckNameById.get(reading.deckId) ?? reading.deckId
  const spread = reading.spreadId ? spreadById.get(reading.spreadId) : null
  const positions: SpreadPosition[] = spread?.positions ?? []
  const sortedCards = [...reading.cards].sort((a, b) => a.drawOrder - b.drawOrder)

  // Lazy-load entities the first time this reading is expanded
  useEffect(() => {
    if (!expanded || !engine || entityMap.size > 0) return
    const cns = [...new Set(sortedCards.map(c => c.cardCanonicalName))]
    Promise.all(cns.map(cn => engine.adapter.getEntityByCanonicalName(cn)))
      .then(entities => {
        const map = new Map<string, BaseEntity>()
        entities.forEach((e, i) => { if (e) map.set(cns[i], e) })
        setEntityMap(map)
      })
      .catch(console.error)
  }, [expanded, engine])

  // Load entity links on first expand
  useEffect(() => {
    if (!expanded || linksLoaded) return
    getEntityLinksForReading(reading.id)
      .then(async cns => {
        setEntityLinks(cns)
        if (cns.length > 0 && engine) {
          const pairs = await Promise.all(
            cns.map(cn => engine.adapter.getEntityByCanonicalName(cn).then(e => [cn, e?.primaryDisplayName ?? cn] as const))
          )
          setEntityNames(new Map(pairs))
        }
        setLinksLoaded(true)
      })
      .catch(console.error)
  }, [expanded, linksLoaded, reading.id, engine])

  const handleAddLink = async (cn: string, displayName: string) => {
    await addEntityLinkToReading(reading.id, cn)
    setEntityLinks(ls => [...ls, cn])
    setEntityNames(m => new Map(m).set(cn, displayName))
  }

  const handleRemoveLink = async (cn: string) => {
    await removeEntityLinkFromReading(reading.id, cn)
    setEntityLinks(ls => ls.filter(l => l !== cn))
  }

  const handleCardClick = (canonicalName: string) => {
    navigate({ to: '/reference/$canonicalName', params: { canonicalName } })
  }

  const handleExportMarkdown = async () => {
    setExporting(true)
    try {
      const positionNameMap = new Map(positions.map(p => [p.id, p.name]))
      const entityNameMap   = new Map(Array.from(entityMap.entries()).map(([cn, e]) => [cn, e.primaryDisplayName]))
      await exportReadingAsMarkdown(reading, spread?.displayName ?? null, deckName, positionNameMap, entityNameMap)
    } catch (e) { console.error(e) } finally { setExporting(false) }
  }

  const handleExportImage = async () => {
    if (!exportRef.current) return
    setExporting(true)
    try {
      await exportReadingAsImage(exportRef.current)
    } catch (e) { console.error(e) } finally { setExporting(false) }
  }

  // Build CardSlot array for SpreadGrid — include entity when loaded
  const cardSlots: CardSlot[] = sortedCards.map(c => ({
    positionId: c.positionId ?? '',
    label: c.cardCanonicalName.split('.').pop()?.replace(/-/g, ' ') ?? c.cardCanonicalName,
    orientation: c.orientation,
    canonicalName: c.cardCanonicalName,
    entity: entityMap.get(c.cardCanonicalName),
  }))

  const hasSpreadLayout = positions.length > 0

  return (
    <div style={{
      background: 'var(--color-surface-2)',
      borderRadius: '8px', border: '1px solid var(--color-border)',
      overflow: 'hidden',
    }}>
      {/* Header — always visible, click to expand */}
      <div
        style={{
          padding: compact ? '10px 16px' : '16px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <div onClick={() => setExpanded(e => !e)} style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}>
          <div>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text)' }}>
              {spread?.displayName ?? 'Free Reading'}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
              {deckName}
            </span>
            {reading.subject && reading.subject !== 'self' && (
              <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginLeft: '8px' }}>
                · {reading.subject}
              </span>
            )}
          </div>
          {reading.question && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
              "{reading.question}"
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>{date}</span>
          {expanded && (
            <>
              <button
                onClick={e => { e.stopPropagation(); handleExportMarkdown() }}
                disabled={exporting}
                title="Export as Markdown"
                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex', opacity: 0.5 }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0.5' }}
              ><Share2 size={13} /><span style={{ fontSize: '11px', marginLeft: '3px' }}>md</span></button>
              <button
                onClick={e => { e.stopPropagation(); handleExportImage() }}
                disabled={exporting}
                title="Export as Image"
                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex', opacity: 0.5 }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0.5' }}
              ><Share2 size={13} /><span style={{ fontSize: '11px', marginLeft: '3px' }}>img</span></button>
            </>
          )}
          {confirmDelete ? (
            <>
              <button
                onClick={() => { setConfirmDelete(false); onDelete(spread?.displayName ?? 'Free Reading') }}
                style={{ background: 'none', border: 'none', padding: '2px 6px', cursor: 'pointer', fontSize: '12px', color: 'var(--color-danger)', whiteSpace: 'nowrap' }}
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ background: 'none', border: 'none', padding: '2px 4px', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-muted)' }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex', opacity: 0.5 }}
              title="Delete reading"
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--color-danger)' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--color-text-subtle)' }}
            >
              <Trash2 size={14} />
            </button>
          )}
          <div onClick={() => setExpanded(e => !e)} style={{ cursor: 'pointer', display: 'flex' }}>
            {expanded
              ? <ChevronDown size={16} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
              : <ChevronRight size={16} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
            }
          </div>
        </div>
      </div>

      {/* Collapsed summary: card names in a row */}
      {!expanded && (
        <div style={{ padding: '0 20px 14px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {sortedCards.map((c, i) => (
            <span
              key={i}
              onClick={e => { e.stopPropagation(); handleCardClick(c.cardCanonicalName) }}
              style={{
                fontSize: '12px', padding: '2px 8px',
                background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
                borderRadius: '4px', color: 'var(--color-text-muted)', cursor: 'pointer',
              }}
              title={`View ${c.cardCanonicalName} in Reference`}
            >
              {c.cardCanonicalName.split('.').pop()?.replace(/-/g, ' ') ?? c.cardCanonicalName}
              {c.orientation === 'reversed' && <span style={{ color: 'var(--color-accent)', marginLeft: '3px' }}>↓</span>}
            </span>
          ))}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div ref={exportRef} style={{ padding: '16px 20px 20px', borderTop: '1px solid var(--color-border)' }}>
          {!compact && <DailyContextBar dateStr={reading.readingDate} />}
          <div>
            {hasSpreadLayout ? (
              spread?.id === 'tree-of-life' ? (
                <TreeOfLifeSpreadDisplay
                  cards={cardSlots}
                  onCardClick={handleCardClick}
                  onLabelClick={cn => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })}
                  scale={0.75}
                />
              ) : spread?.id === 'chakra' ? (
                <ChakraSpreadDisplay
                  cards={cardSlots}
                  onCardClick={handleCardClick}
                  onLabelClick={cn => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })}
                  scale={0.75}
                />
              ) : spread?.id === 'year-ahead' ? (
                <YearAheadSpreadDisplay
                  cards={cardSlots}
                  onCardClick={handleCardClick}
                  startDate={new Date(reading.readingDate)}
                  scale={0.75}
                />
              ) : spread?.id === 'zodiac-year' ? (
                <ZodiacYearSpreadDisplay
                  cards={cardSlots}
                  onCardClick={handleCardClick}
                  onLabelClick={cn => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })}
                  scale={0.75}
                />
              ) : (
                <SpreadGrid
                  positions={positions}
                  cards={cardSlots}
                  scale={0.75}
                  onCardClick={handleCardClick}
                  showCaptions={loadAccessibilitySettings().cardCaptions}
                  reversedDisplay={reversedDisplay}
                />
              )
            ) : (
              /* Free reading: horizontal card row */
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {sortedCards.map((c, i) => {
                  const entity = entityMap.get(c.cardCanonicalName)
                  const label  = c.cardCanonicalName.split('.').pop()?.replace(/-/g, ' ') ?? c.cardCanonicalName
                  return (
                    <div
                      key={i}
                      onClick={() => handleCardClick(c.cardCanonicalName)}
                      style={{ cursor: 'pointer', textAlign: 'center' }}
                      title={`View ${label} in Reference`}
                    >
                      {entity
                        ? <EntityArt entity={entity} width={66} height={106} />
                        : (
                          <div style={{ width: 66, height: 106, background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--color-text-muted)', padding: '6px', textAlign: 'center' }}>
                            {label}
                          </div>
                        )
                      }
                      <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', marginTop: '3px' }}>
                        {c.orientation === 'reversed' ? '↓ Rev' : '↑'}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {reading.notes && (
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--color-border)' }}>
              <RichTextRenderer markdown={reading.notes} />
            </div>
          )}

          {reading.astroSnapshot && (
            <AstroSnapshotSection snapshot={reading.astroSnapshot as NatalChartData} />
          )}

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', marginTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <Link2 size={11} /> Linked Entities
            </div>
            {entityLinks.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {entityLinks.map(cn => (
                  <span
                    key={cn}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '3px 8px', background: 'var(--color-surface-3)',
                      border: '1px solid var(--color-accent-muted)', borderRadius: '4px',
                      fontSize: '12px', color: 'var(--color-accent)',
                    }}
                  >
                    <button
                      onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-accent)', fontSize: '12px' }}
                    >
                      {entityNames.get(cn) ?? cn.split('.').pop()}
                    </button>
                    <button
                      onClick={() => handleRemoveLink(cn)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-accent)', lineHeight: 1, display: 'flex' }}
                      title="Remove link"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <EntityLinksEditor
              links={entityLinks}
              displayNames={entityNames}
              onAdd={handleAddLink}
              onRemove={handleRemoveLink}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Astro snapshot section ────────────────────────────────────────────────────

function AstroSnapshotSection({ snapshot }: { snapshot: NatalChartData }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)
  const [view, setView] = useState<'table' | 'wheel'>('wheel')
  const [selfChart, setSelfChart] = useState<NatalChartData | null>(null)
  const { astrologyMode, houseSystem, showNodes, activeTraditions } = loadTraditionSettings()
  const showModernPlanets = activeTraditions.includes('tradition.modern-astrology')
  const signs = getSignsForMode(astrologyMode)
  const visiblePlanets = snapshot.planets.filter(pos => {
    const cn = pos.planet.canonicalName
    if (MODERN_PLANET_CNS.has(cn) && !showModernPlanets) return false
    if ((cn === 'astrology.node.rahu' || cn === 'astrology.node.ketu' || cn === 'astrology.point.black-moon-lilith') && !showNodes) return false
    return true
  })

  // Load self natal chart once when section is opened
  useEffect(() => {
    if (!open || selfChart !== null) return
    listNatalCharts().then(records => {
      const self = records.find(r => r.isSelf)
      if (!self || !self.birthLat || !self.birthLon) return
      const birthDate = zonedTimeToUtc(self.birthDate, self.birthTime ?? '12:00', self.birthTimezone)
      setSelfChart(getNatalChart(birthDate, self.birthLat, self.birthLon, houseSystem, astrologyMode, { showNodes, showModernPlanets }))
    }).catch(() => {})
  }, [open])

  // Transit aspects: snapshot positions vs self natal positions
  const transitAspects = selfChart ? getTransitAspects(snapshot.planets, selfChart.planets) : []

  // The base chart for wheel view: self natal if available, else the snapshot itself
  const baseChart = selfChart ?? snapshot
  const transitChart = selfChart ? snapshot : undefined

  return (
    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: open ? '12px' : 0 }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Sky at reading time
        </span>
        {open && (
          <button
            onClick={e => { e.stopPropagation(); setView(v => v === 'table' ? 'wheel' : 'table') }}
            style={{ marginLeft: '4px', display: 'flex', alignItems: 'center', gap: '3px', background: 'none', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', color: 'var(--color-text-muted)', padding: '1px 6px' }}
          >
            {view === 'table' ? <><Circle size={9} /> Wheel</> : <><List size={9} /> Table</>}
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--color-text-subtle)' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && view === 'table' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: '3px 8px', alignItems: 'center' }}>
            {visiblePlanets.map(pos => {
              const sign = signs[pos.signIndex]
              return (
                <React.Fragment key={pos.planet.name}>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-subtle)', fontFamily: 'monospace' }}>{pos.planet.symbol}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{pos.planet.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text)' }}>
                    {pos.degree}°{String(pos.minutes).padStart(2, '0')}′ {sign?.symbol} {sign?.name}
                  </span>
                  <span title={pos.retrograde ? 'Retrograde' : undefined} style={{ fontSize: '10px', color: 'var(--color-danger)' }}>{pos.retrograde ? '℞' : ''}</span>
                </React.Fragment>
              )
            })}
          </div>
          {transitAspects.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Transit aspects to natal</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto 1fr', gap: '2px 8px', alignItems: 'center' }}>
                {transitAspects.map((a, i) => (
                  <React.Fragment key={i}>
                    <span style={{ fontSize: '12px', color: '#c4a44a', fontFamily: 'monospace' }}>{a.transitPlanet.symbol}</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{a.symbol}</span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', fontFamily: 'monospace' }}>{a.natalPlanet.symbol}</span>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{a.orb.toFixed(1)}°{a.applying ? ' app' : ' sep'}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {open && view === 'wheel' && (
        <ZoomableSVGContainer style={{ maxWidth: 340, borderRadius: '8px' }}>
          <WheelChart chart={baseChart} transitChart={transitChart} size={340} mode={astrologyMode} onNavigate={cn => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })} />
        </ZoomableSVGContainer>
      )}
    </div>
  )
}

// ─── Entity links editor ───────────────────────────────────────────────────────

function EntityLinksEditor({
  links,
  displayNames,
  onAdd,
  onRemove,
}: {
  links: string[]
  displayNames: Map<string, string>
  onAdd: (cn: string, displayName: string) => void
  onRemove: (cn: string) => void
}) {
  const { engine } = useEngineStore()
  const { customEnabled } = loadTraditionSettings()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BaseEntity[]>([])
  const [showResults, setShowResults] = useState(false)
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Recompute the dropdown's screen position whenever it opens, and keep it
  // attached to the input while scrolling/resizing — it's portaled to
  // document.body (position: fixed) so it can't be clipped by an ancestor's
  // overflow:hidden (e.g. the journal entry card) or buried by z-index.
  useEffect(() => {
    if (!showResults) return
    const updateRect = () => {
      const r = inputRef.current?.getBoundingClientRect()
      if (r) setDropdownRect({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    updateRect()
    window.addEventListener('scroll', updateRect, true)
    window.addEventListener('resize', updateRect)
    return () => {
      window.removeEventListener('scroll', updateRect, true)
      window.removeEventListener('resize', updateRect)
    }
  }, [showResults])

  useEffect(() => {
    if (!searchQuery.trim() || !engine) {
      setSearchResults([])
      setShowResults(false)
      return
    }
    const timer = setTimeout(async () => {
      const r = await engine.adapter.searchEntities(searchQuery.trim(), undefined, { offset: 0, limit: 8 })
      const entities = r.items
        .map(sr => sr.entity)
        .filter(e => (customEnabled || e.isBuiltIn) && !links.includes(e.canonicalName))
      setSearchResults(entities)
      setShowResults(entities.length > 0)
    }, 200)
    return () => clearTimeout(timer)
  }, [searchQuery, engine, links, customEnabled])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!inputRef.current?.contains(e.target as Node) && !resultsRef.current?.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // In new-entry form context, chips are shown here; in expanded-entry context they're shown above
  const showChips = links.length > 0 && !displayNames.size

  return (
    <div>
      {showChips && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
          {links.map(cn => (
            <span key={cn} style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '3px 8px', background: 'var(--color-surface-3)',
              border: '1px solid var(--color-accent-muted)', borderRadius: '4px',
              fontSize: '12px', color: 'var(--color-accent)',
            }}>
              {displayNames.get(cn) ?? cn.split('.').pop()}
              <button
                onClick={() => onRemove(cn)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-accent)', lineHeight: 1, display: 'flex' }}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => { if (searchResults.length) setShowResults(true) }}
          placeholder="Link an entity…"
          style={{
            width: '100%', padding: '6px 10px',
            background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
            borderRadius: '6px', color: 'var(--color-text)', fontSize: '13px', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {showResults && dropdownRect && createPortal(
          <div ref={resultsRef} style={{
            position: 'fixed', top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width,
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            borderRadius: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            zIndex: 9999, overflow: 'hidden',
          }}>
            {searchResults.map(entity => (
              <button
                key={entity.canonicalName}
                onMouseDown={e => {
                  e.preventDefault()
                  onAdd(entity.canonicalName, entity.primaryDisplayName)
                  setSearchQuery('')
                  setShowResults(false)
                }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-3)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                <div style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 500 }}>
                  {entity.primaryDisplayName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', fontFamily: 'monospace' }}>
                  {entity.canonicalName}
                </div>
              </button>
            ))}
          </div>,
          document.body
        )}
      </div>
    </div>
  )
}
