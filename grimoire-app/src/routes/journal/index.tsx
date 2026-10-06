import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  listReadings, listJournalEntries, saveJournalEntry, updateJournalEntry, deleteJournalEntry, deleteReading,
  getEntityLinksForEntry, addEntityLinkToEntry, removeEntityLinkFromEntry,
  getEntityLinksForReading, addEntityLinkToReading, removeEntityLinkFromReading,
  attachReadingToEntry, detachReadingFromEntry, searchUnattachedReadings,
} from '@/lib/reading-db'
import type { JournalEntry } from '@/lib/reading-db'
import type { Reading } from '@grimoire/core'
import { BUILT_IN_DECK_FILTERS } from '@/lib/built-in-data'
import { useSpreadById } from '@/lib/spread-hooks'
import type { SpreadPosition } from '@grimoire/core'
import { useReadingStore } from '@/stores/reading'
import { pickAndImportJournalEntry, exportJournalEntry } from '@/lib/journal-import'
import type { JournalEntryImportSummary } from '@/lib/journal-import'
import { BookMarked, ChevronDown, ChevronRight, Plus, PenLine, Trash2, List, Circle, X, Link2, BarChart2, Share2, Unlink, Pencil, Upload, CheckCircle, AlertCircle } from 'lucide-react'
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
import { useBreakpoint } from '@/hooks/useBreakpoint'

export const Route = createFileRoute('/journal/')({
  validateSearch: (s: Record<string, unknown>) => ({
    // Set by the "+" button on a reference entity's Journal section — opens
    // the New Entry form with that entity already attached as a link.
    linkEntity: typeof s.linkEntity === 'string' ? s.linkEntity : undefined,
  }),
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
  const { linkEntity } = Route.useSearch()
  const { engine } = useEngineStore()
  const [items, setItems] = useState<ListItem[]>([])
  const [readingsByEntry, setReadingsByEntry] = useState<Map<string, Reading[]>>(new Map())
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
  // The form always renders near the top of the page — scroll it into view when
  // opened so the bottom "New Entry" button (for long lists) doesn't just open
  // an invisible off-screen form.
  const formRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (showForm) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [showForm])

  // Arrived via the "+" button on a reference entity's Journal section — open
  // the New Entry form with that entity already attached as a link. Consumes
  // (clears) the search param immediately so it doesn't re-trigger on a later
  // back/forward navigation or refresh.
  useEffect(() => {
    if (!linkEntity || !engine) return
    navigate({ to: '/journal', search: { linkEntity: undefined }, replace: true })
    engine.adapter.getEntityByCanonicalName(linkEntity).then(entity => {
      setFormEntityLinks(ls => ls.includes(linkEntity) ? ls : [...ls, linkEntity])
      setFormEntityNames(m => new Map(m).set(linkEntity, entity?.primaryDisplayName ?? linkEntity))
      setShowForm(true)
    }).catch(console.error)
  }, [linkEntity, engine, navigate])

  const loadAll = () => {
    setLoading(true)
    Promise.all([listReadings(10000), listJournalEntries(10000)])
      .then(([readings, entries]) => {
        // Readings grouped under an entry (journalEntryId set) render nested
        // inside that entry's expanded view, not as their own top-level row —
        // only standalone readings join the merged top-level timeline.
        const grouped = new Map<string, Reading[]>()
        const standalone: Reading[] = []
        for (const r of readings) {
          if (r.journalEntryId) {
            const list = grouped.get(r.journalEntryId) ?? []
            list.push(r)
            grouped.set(r.journalEntryId, list)
          } else {
            standalone.push(r)
          }
        }
        setReadingsByEntry(grouped)

        const merged: ListItem[] = [
          ...standalone.map(r => ({ type: 'reading' as const, date: r.readingDate, data: r })),
          ...entries.map(e => ({ type: 'entry' as const, date: e.entryDate, data: e })),
        ]
        merged.sort((a, b) => b.date.localeCompare(a.date))
        setItems(merged)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAll() }, [])

  // Import a single journal-entry file (see journal-import.ts) — the
  // entry-scoped counterpart to the full backup at Settings > Data.
  const [importBusy, setImportBusy] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<JournalEntryImportSummary | null>(null)

  const handleImportEntry = async () => {
    if (!engine) return
    setImportError(null)
    setImportSummary(null)
    setImportBusy(true)
    try {
      const summary = await pickAndImportJournalEntry(engine)
      if (summary) {
        setImportSummary(summary)
        loadAll()
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import file.')
    } finally {
      setImportBusy(false)
    }
  }

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
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/journal/stats' })}>
            <BarChart2 size={13} /> Statistics
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/read/record' })}>
            <PenLine size={14} /> Record Physical
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setShowForm(s => !s) }}>
            <PenLine size={14} /> New Entry
          </Button>
          <Button variant="ghost" size="sm" onClick={handleImportEntry} disabled={importBusy}>
            <Upload size={14} /> {importBusy ? 'Importing…' : 'Import Entry'}
          </Button>
          <Button size="sm" onClick={() => navigate({ to: '/read' })}>
            <Plus size={14} /> New Reading
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={toggleCompact}
          title={compact ? 'Switch to standard view' : 'Switch to compact view'}
          aria-pressed={compact}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center', gap: '5px', color: compact ? 'var(--color-accent)' : 'var(--color-text-subtle)', fontSize: '12px' }}
        >
          {compact ? <AlignLeft size={13} /> : <AlignJustify size={13} />}
          {compact ? 'Compact view' : 'Standard view'}
        </button>
      </div>

      {importError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '10px 14px', background: 'rgba(200,60,60,0.1)', border: '1px solid rgba(200,60,60,0.3)', borderRadius: '6px', fontSize: '13px', color: 'var(--color-danger, #e06060)' }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>{importError}</div>
          <button onClick={() => setImportError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {importSummary && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '16px', padding: '10px 14px', background: 'rgba(80,160,80,0.1)', border: '1px solid rgba(80,160,80,0.35)', borderRadius: '6px', fontSize: '13px', color: 'var(--color-text)' }}>
          <CheckCircle size={15} style={{ color: '#5ca05c', flexShrink: 0, marginTop: '1px' }} />
          <div style={{ flex: 1 }}>
            <div>
              {importSummary.entryAlreadyExisted
                ? <>"{importSummary.title}" was already present — no changes made to the entry.</>
                : <>Imported "{importSummary.title}".</>}
            </div>
            {(importSummary.readingsImported > 0 || importSummary.readingsAlreadyExisted > 0) && (
              <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
                {importSummary.readingsImported} reading{importSummary.readingsImported !== 1 ? 's' : ''} imported
                {importSummary.readingsAlreadyExisted > 0 && `, ${importSummary.readingsAlreadyExisted} already present`}.
              </div>
            )}
            {importSummary.reconstructedFromMarkdown && (
              <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
                This file had no exact data embedded, so it was reconstructed from its visible Markdown (deck/spread/cards matched by name).
                {importSummary.cardsSkipped > 0 && ` ${importSummary.cardsSkipped} card${importSummary.cardsSkipped !== 1 ? 's' : ''} couldn't be matched and ${importSummary.cardsSkipped !== 1 ? 'were' : 'was'} skipped.`}
              </div>
            )}
          </div>
          <button onClick={() => setImportSummary(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
            <X size={14} />
          </button>
        </div>
      )}

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
        <div ref={formRef} style={{
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
              const matchesReading = (r: Reading) => (
                r.question?.toLowerCase().includes(q) ||
                r.notes?.toLowerCase().includes(q) ||
                r.deckId?.toLowerCase().includes(q) ||
                r.cards.some(c => c.cardCanonicalName.toLowerCase().includes(q))
              )
              if (item.type === 'reading') return matchesReading(item.data)
              return Boolean(
                item.data.title?.toLowerCase().includes(q) ||
                item.data.notes?.toLowerCase().includes(q) ||
                (readingsByEntry.get(item.data.id) ?? []).some(matchesReading)
              )
            })
          : items
        return visible.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '6px' : '12px' }}>
            {visible.map(item =>
              item.type === 'reading'
                ? <ReadingRow key={`r-${item.data.id}`} reading={item.data} compact={compact} reversedDisplay={a11y.reversedDisplay} onDelete={label => handlePendingDelete(item, label)} />
                : (
                  <EntryRow
                    key={`e-${item.data.id}`}
                    entry={item.data}
                    readings={readingsByEntry.get(item.data.id) ?? []}
                    compact={compact}
                    reversedDisplay={a11y.reversedDisplay}
                    onDelete={label => handlePendingDelete(item, label)}
                    onRefresh={loadAll}
                  />
                )
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(true)}>
                <PenLine size={14} /> New Entry
              </Button>
              <Button size="sm" onClick={() => navigate({ to: '/read' })}>
                <Plus size={14} /> New Reading
              </Button>
            </div>
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

// ─── Journal entry row (title + notes, grouping zero or more readings) ────────

function EntryRow({
  entry, readings, onDelete, onRefresh, compact = false, reversedDisplay,
}: {
  entry: JournalEntry
  readings: Reading[]
  onDelete: (label: string) => void
  onRefresh: () => void
  compact?: boolean
  reversedDisplay?: import('@/lib/accessibility-store').ReversedDisplay
}) {
  const navigate = useNavigate()
  const { engine } = useEngineStore()
  const spreadById = useSpreadById()
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [entityLinks, setEntityLinks] = useState<string[]>([])
  const [entityNames, setEntityNames] = useState<Map<string, string>>(new Map())
  const [linksLoaded, setLinksLoaded] = useState(false)

  // Edit mode — title/date/notes only; readings are managed separately below.
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(entry.title ?? '')
  const [editNotes, setEditNotes] = useState(entry.notes)
  const [editDate, setEditDate] = useState(entry.entryDate.slice(0, 10))
  const [savingEdit, setSavingEdit] = useState(false)

  const startEditing = () => {
    setEditTitle(entry.title ?? '')
    setEditNotes(entry.notes)
    setEditDate(entry.entryDate.slice(0, 10))
    setEditing(true)
  }

  const handleSaveEdit = async () => {
    if (isRichTextEmpty(editNotes)) return
    setSavingEdit(true)
    try {
      await updateJournalEntry(entry.id, { title: editTitle.trim() || null, notes: editNotes, entryDate: editDate })
      setEditing(false)
      onRefresh()
    } catch (e) {
      console.error(e)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleNewReadingHere = () => {
    useReadingStore.getState().setJournalEntryId(entry.id)
    navigate({ to: '/read' })
  }

  const handleDetachReading = async (readingId: string) => {
    await detachReadingFromEntry(readingId)
    onRefresh()
  }

  const handleDeleteNestedReading = async (readingId: string) => {
    await deleteReading(readingId)
    onRefresh()
  }

  const [exportingEntry, setExportingEntry] = useState(false)
  const handleExportEntry = async () => {
    if (!engine) return
    setExportingEntry(true)
    try {
      await exportJournalEntry(entry, readings, engine, spreadById)
    } catch (e) {
      console.error(e)
    } finally {
      setExportingEntry(false)
    }
  }

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
        {editing ? (
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="Title (optional)"
            autoFocus
            style={{
              flex: 1, minWidth: 0, marginRight: '10px', padding: '5px 8px',
              background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
              borderRadius: '4px', color: 'var(--color-text)', fontSize: '15px', fontWeight: 500,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        ) : (
          <div
            onClick={() => setExpanded(e => !e)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1, minWidth: 0 }}
          >
            <PenLine size={14} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text)' }}>
              {entry.title ?? 'Journal Entry'}
            </span>
            {readings.length > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>
                · {readings.length} reading{readings.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!editing && <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>{date}</span>}
          {editing ? (
            <>
              <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit || isRichTextEmpty(editNotes)}>
                {savingEdit ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            </>
          ) : confirmDelete ? (
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
            <>
              {expanded && (
                <button
                  onClick={e => { e.stopPropagation(); handleExportEntry() }}
                  disabled={exportingEntry}
                  style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex' }}
                  title="Export entry (and its readings) as a file"
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
                >
                  <Share2 size={14} />
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); setExpanded(true); startEditing() }}
                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex' }}
                title="Edit entry"
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex' }}
                title="Delete entry"
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-danger)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
              >
                <Trash2 size={14} />
              </button>
            </>
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
          {entry.notes.replace(/[#*`_~>-]/g, '').slice(0, 120)}{entry.notes.replace(/[#*`_~>-]/g, '').length > 120 ? '…' : ''}
        </div>
      )}

      {expanded && (
        <div style={{ padding: '14px 20px 20px', borderTop: '1px solid var(--color-border)' }}>
          <DailyContextBar dateStr={entry.entryDate} />

          {editing ? (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '10px' }}>
                <DateInput
                  value={editDate}
                  onChange={setEditDate}
                  style={{
                    padding: '6px 10px', background: 'var(--color-surface-3)',
                    border: '1px solid var(--color-border)', borderRadius: '6px',
                    color: 'var(--color-text)', fontSize: '13px', outline: 'none',
                    colorScheme: 'dark',
                  }}
                />
              </div>
              <RichTextEditor value={editNotes} onChange={setEditNotes} minHeight={120} />
            </div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <RichTextRenderer markdown={entry.notes} />
            </div>
          )}

          {/* Readings grouped under this entry */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <BarChart2 size={11} /> Readings
              </div>
              <Button variant="ghost" size="sm" onClick={handleNewReadingHere}>
                <Plus size={13} /> New Reading Here
              </Button>
            </div>
            {readings.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '6px' : '10px', marginBottom: '10px' }}>
                {readings.map(r => (
                  <ReadingRow
                    key={r.id}
                    reading={r}
                    compact={compact}
                    reversedDisplay={reversedDisplay}
                    nested
                    onDetach={() => handleDetachReading(r.id)}
                    onDelete={() => handleDeleteNestedReading(r.id)}
                  />
                ))}
              </div>
            )}
            <ReadingAttachPicker entryId={entry.id} onAttached={onRefresh} />
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

function ReadingRow({
  reading, onDelete, compact = false, reversedDisplay, nested = false, onDetach,
}: {
  reading: Reading
  onDelete: (label: string) => void
  compact?: boolean
  reversedDisplay?: import('@/lib/accessibility-store').ReversedDisplay
  /** True when rendered inside an EntryRow's readings list rather than the top-level timeline. */
  nested?: boolean
  /** Removes this reading from its entry without deleting it — only meaningful when nested. */
  onDetach?: () => void
}) {
  const navigate = useNavigate()
  const isMobile = useBreakpoint() === 'mobile'
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
          display: 'flex', flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? '4px' : 0,
        }}
      >
        <div onClick={() => setExpanded(e => !e)} style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}>
          <div style={isMobile ? { display: 'flex', flexDirection: 'column', gap: '2px' } : undefined}>
            <span style={{
              fontSize: '15px', fontWeight: 500, color: 'var(--color-text)',
              ...(isMobile ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } : {}),
            }}>
              {spread?.displayName ?? 'Free Reading'}
            </span>
            <span style={{
              fontSize: '13px', color: 'var(--color-text-muted)', marginLeft: isMobile ? 0 : '8px',
              ...(isMobile ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } : {}),
            }}>
              {deckName}
            </span>
            {reading.subject && reading.subject !== 'self' && (
              <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginLeft: isMobile ? 0 : '8px' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: isMobile ? 'space-between' : undefined }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>{date}</span>
          {expanded && (
            <>
              <button
                onClick={e => { e.stopPropagation(); handleExportMarkdown() }}
                disabled={exporting}
                title="Export as Markdown"
                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
              ><Share2 size={13} /><span style={{ fontSize: '11px', marginLeft: '3px' }}>md</span></button>
              <button
                onClick={e => { e.stopPropagation(); handleExportImage() }}
                disabled={exporting}
                title="Export as Image"
                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
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
            <>
              {nested && onDetach && (
                <button
                  onClick={e => { e.stopPropagation(); onDetach() }}
                  style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex' }}
                  title="Remove from this entry (keeps the reading, unattached)"
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
                >
                  <Unlink size={14} />
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex' }}
                title="Delete reading"
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-danger)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
              >
                <Trash2 size={14} />
              </button>
            </>
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

// ─── Attach an existing standalone reading to an entry ─────────────────────────

function ReadingAttachPicker({ entryId, onAttached }: { entryId: string; onAttached: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Reading[]>([])
  const [open, setOpen] = useState(false)
  const [attaching, setAttaching] = useState<string | null>(null)
  const spreadById = useSpreadById()

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      const r = await searchUnattachedReadings(query.trim())
      setResults(r)
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  const handleAttach = async (reading: Reading) => {
    setAttaching(reading.id)
    try {
      await attachReadingToEntry(reading.id, entryId)
      setQuery('')
      setResults([])
      setOpen(false)
      onAttached()
    } catch (e) {
      console.error(e)
    } finally {
      setAttaching(null)
    }
  }

  const label = (r: Reading) => {
    const spread = r.spreadId ? spreadById.get(r.spreadId)?.displayName : null
    const parts = [spread ?? 'Free Reading']
    if (r.subject && r.subject !== 'self') parts.push(r.subject)
    if (r.question) parts.push(`"${r.question}"`)
    return parts.join(' · ')
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Link2 size={13} /> Attach Existing Reading
      </Button>
    )
  }

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search unattached readings by question, subject, or deck…"
          autoFocus
          style={{
            width: '100%', padding: '6px 10px',
            background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
            borderRadius: '6px', color: 'var(--color-text)', fontSize: '13px', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
      {results.length > 0 && (
        <div style={{
          marginTop: '6px', background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
          borderRadius: '6px', overflow: 'hidden',
        }}>
          {results.map(r => (
            <button
              key={r.id}
              onClick={() => handleAttach(r)}
              disabled={attaching === r.id}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '12px', color: 'var(--color-text)', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              {attaching === r.id ? 'Attaching…' : label(r)}
              <span style={{ color: 'var(--color-text-subtle)', marginLeft: '6px' }}>
                {new Date(r.readingDate).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => { setOpen(false); setQuery(''); setResults([]) }}
        style={{ background: 'none', border: 'none', padding: '4px 0', marginTop: '4px', cursor: 'pointer', fontSize: '11px', color: 'var(--color-text-subtle)' }}
      >
        Cancel
      </button>
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
