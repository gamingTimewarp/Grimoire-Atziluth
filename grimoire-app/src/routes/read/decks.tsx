import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Plus, Trash2, Save, Pencil, Search, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TagInput } from '@/components/ui/TagInput'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity } from '@grimoire/core'
import {
  getAllCustomDecks,
  saveCustomDeck,
  deleteCustomDeck,
  type CustomDeckRecord,
} from '@/lib/custom-db'
import { ENTITY_TYPE_GROUPS, KNOWN_ENTITY_TYPES } from '@/lib/entity-type-groups'
import { formatEntityType } from '@/lib/format'
import { loadTraditionSettings } from '@/lib/tradition-store'

export const Route = createFileRoute('/read/decks')({
  component: DecksPage,
})

function newId() {
  return `custom-deck-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ─── Card picker ───────────────────────────────────────────────────────────────

function CardPicker({
  selected,
  onToggle,
}: {
  selected: Set<string>
  onToggle: (cn: string) => void
}) {
  const { engine } = useEngineStore()
  const { customEnabled } = loadTraditionSettings()
  const [allEntities, setAllEntities]   = useState<BaseEntity[]>([])
  const [entityTypes, setEntityTypes]   = useState<string[]>([])
  const [allTags,     setAllTags]       = useState<string[]>([])
  const [typeFilter,  setTypeFilter]    = useState('')
  const [sourceFilter,setSourceFilter]  = useState<'all' | 'built-in' | 'custom'>('all')
  const [tagFilters,  setTagFilters]    = useState<string[]>([])
  const [search, setSearch]             = useState('')
  const [showSelected, setShowSelected] = useState(false)

  useEffect(() => {
    if (!engine) return
    // Fetch the true total first — a single capped listEntities() call would
    // silently truncate to whatever page happens to come back first, and
    // since built-in entities are seeded before custom ones, a fixed cap
    // smaller than the built-in count (as it once was here) meant custom
    // entities could never appear in this list at all.
    engine.adapter.listEntities({}, { offset: 0, limit: 1 })
      .then(({ total }) => engine.adapter.listEntities({}, { offset: 0, limit: total }))
      .then(r => {
        setAllEntities(r.items)
        const types = [...new Set(r.items.map(e => e.entityType))].sort()
        setEntityTypes(types)
      })
    engine.adapter.listAllTags().then(setAllTags).catch(() => {})
  }, [engine])

  const customTypeOptions = useMemo(
    () => entityTypes.filter(t => !KNOWN_ENTITY_TYPES.has(t)).map(t => ({ value: t, label: formatEntityType(t) })),
    [entityTypes],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allEntities.filter(e => {
      if (showSelected && !selected.has(e.canonicalName)) return false
      if (typeFilter && e.entityType !== typeFilter) return false
      if (sourceFilter === 'built-in' && !e.isBuiltIn) return false
      if (sourceFilter === 'custom' && e.isBuiltIn) return false
      if (tagFilters.length > 0 && !tagFilters.every(t => e.tags.includes(t))) return false
      if (q && !e.primaryDisplayName.toLowerCase().includes(q) && !e.canonicalName.includes(q)) return false
      return true
    }).slice(0, 100)
  }, [allEntities, typeFilter, sourceFilter, tagFilters, search, showSelected, selected])

  const inputStyle: React.CSSProperties = {
    background: 'var(--color-surface-3)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    color: 'var(--color-text)',
    fontSize: '13px',
    padding: '6px 10px',
    outline: 'none',
    fontFamily: 'inherit',
    colorScheme: 'dark',
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 160px' }}>
          <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search entities…"
            style={{ ...inputStyle, width: '100%', paddingLeft: '28px', boxSizing: 'border-box' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text-subtle)' }}>
              <X size={12} />
            </button>
          )}
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{ ...inputStyle, flex: '0 0 auto', cursor: 'pointer' }}
        >
          <option value="">All types</option>
          {ENTITY_TYPE_GROUPS.map(group => {
            const opts = group.options.filter(opt => entityTypes.includes(opt.value))
            if (opts.length === 0) return null
            return (
              <optgroup key={group.label} label={group.label}>
                {opts.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </optgroup>
            )
          })}
          {customTypeOptions.length > 0 && (
            <optgroup label="Custom Types">
              {customTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </optgroup>
          )}
        </select>
        {customEnabled && (
          <div style={{ display: 'flex', flex: '0 0 auto' }}>
            {(['all', 'built-in', 'custom'] as const).map((opt, i) => (
              <button
                key={opt}
                onClick={() => setSourceFilter(opt)}
                style={{
                  padding: '6px 10px', fontSize: '12px', cursor: 'pointer',
                  background: sourceFilter === opt ? 'var(--color-accent-muted)' : 'var(--color-surface-3)',
                  border: '1px solid',
                  borderColor: sourceFilter === opt ? 'var(--color-accent-muted)' : 'var(--color-border)',
                  borderRadius: i === 0 ? '4px 0 0 4px' : i === 2 ? '0 4px 4px 0' : '0',
                  borderLeft: i > 0 ? 'none' : undefined,
                  color: sourceFilter === opt ? 'var(--color-accent)' : 'var(--color-text-subtle)',
                  fontFamily: 'inherit',
                }}
              >
                {opt === 'all' ? 'All' : opt === 'built-in' ? 'Built-in' : 'Custom'}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setShowSelected(s => !s)}
          style={{
            ...inputStyle,
            cursor: 'pointer',
            background: showSelected ? 'var(--color-accent-muted)' : 'var(--color-surface-3)',
            color: showSelected ? 'var(--color-accent)' : 'var(--color-text-muted)',
            border: `1px solid ${showSelected ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
            display: 'flex', alignItems: 'center', gap: '5px',
          }}
        >
          <Check size={12} />
          {selected.size} selected
        </button>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <TagInput
            chips={tagFilters}
            suggestions={allTags}
            onAdd={t => setTagFilters(prev => prev.includes(t) ? prev : [...prev, t])}
            onRemove={t => setTagFilters(prev => prev.filter(x => x !== t))}
          />
        </div>
      )}

      {/* Entity list */}
      <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-subtle)' }}>
            {showSelected ? 'No cards selected yet.' : 'No entities match.'}
          </div>
        ) : filtered.map(e => {
          const inDeck = selected.has(e.canonicalName)
          return (
            <div
              key={e.canonicalName}
              onClick={() => onToggle(e.canonicalName)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 12px',
                cursor: 'pointer',
                background: inDeck ? 'rgba(196,146,42,0.07)' : 'transparent',
                borderBottom: '1px solid var(--color-border)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!inDeck) e.currentTarget.style.background = 'var(--color-surface-3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = inDeck ? 'rgba(196,146,42,0.07)' : 'transparent' }}
            >
              <div style={{
                width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                border: `1px solid ${inDeck ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: inDeck ? 'var(--color-accent)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {inDeck && <Check size={11} style={{ color: '#0d0d12' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>{e.primaryDisplayName}</span>
                <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)', marginLeft: '8px' }}>{formatEntityType(e.entityType)}</span>
                {!e.isBuiltIn && (
                  <span style={{ fontSize: '9px', color: 'var(--color-accent)', border: '1px solid var(--color-accent-muted)', borderRadius: '3px', padding: '1px 5px', marginLeft: '6px' }}>
                    Custom
                  </span>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 100 && (
          <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--color-text-subtle)', textAlign: 'center' }}>
            Showing first 100 results — refine your search to see more.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Deck editor ───────────────────────────────────────────────────────────────

function DeckEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: CustomDeckRecord | null
  onSave: (r: CustomDeckRecord) => void
  onCancel: () => void
}) {
  const [name, setName]               = useState(initial?.displayName ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [reversals, setReversals]     = useState(initial?.reversalEnabled ?? false)
  const [selected, setSelected]       = useState<Set<string>>(new Set(initial?.cardCanonicalNames ?? []))
  const [error, setError]             = useState('')

  const toggle = (cn: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(cn) ? next.delete(cn) : next.add(cn)
      return next
    })

  const handleSave = () => {
    if (!name.trim()) { setError('Name is required.'); return }
    if (selected.size === 0) { setError('Add at least one card.'); return }
    const now = new Date().toISOString()
    onSave({
      id:                 initial?.id ?? newId(),
      displayName:        name.trim(),
      description:        description.trim(),
      reversalEnabled:    reversals,
      cardCanonicalNames: [...selected],
      createdAt:          initial?.createdAt ?? now,
      updatedAt:          now,
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
    borderRadius: '6px', color: 'var(--color-text)', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div style={{ border: '1px solid var(--color-accent-muted)', borderRadius: '8px', padding: '20px', background: 'var(--color-surface-2)' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 400 }}>
        {initial ? 'Edit Deck' : 'New Deck'}
      </h3>

      {error && <div style={{ fontSize: '12px', color: 'var(--color-danger)', marginBottom: '12px' }}>{error}</div>}

      <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Name</label>
      <input value={name} onChange={e => { setName(e.target.value); setError('') }} placeholder="e.g. My Majors + Runes" autoFocus style={{ ...inputStyle, marginBottom: '12px' }} />

      <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Description</label>
      <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description…" style={{ ...inputStyle, marginBottom: '12px' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-muted)', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={reversals}
            onChange={e => setReversals(e.target.checked)}
            style={{ accentColor: 'var(--color-accent)', width: '14px', height: '14px' }}
          />
          Enable reversals
        </label>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Cards
        </label>
        {selected.size > 0 && (
          <button onClick={() => setSelected(new Set())} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--color-danger)', fontFamily: 'inherit', padding: 0 }}>
            Clear all
          </button>
        )}
      </div>
      <CardPicker selected={selected} onToggle={toggle} />

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSave}>
          <Save size={13} /> Save Deck
        </Button>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function DecksPage() {
  const navigate = useNavigate()
  const [decks, setDecks]     = useState<CustomDeckRecord[]>([])
  const [editing, setEditing] = useState<CustomDeckRecord | null | 'new'>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllCustomDecks().then(setDecks).finally(() => setLoading(false))
  }, [])

  const handleSave = async (r: CustomDeckRecord) => {
    await saveCustomDeck(r)
    setDecks(prev => {
      const idx = prev.findIndex(x => x.id === r.id)
      return idx >= 0 ? prev.map(x => x.id === r.id ? r : x) : [...prev, r]
    })
    setEditing(null)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this deck?')) return
    await deleteCustomDeck(id)
    setDecks(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/read' })}>
          <ArrowLeft size={14} /> Read
        </Button>
        <h1 style={{ fontSize: '20px', fontWeight: 300, margin: 0 }}>Custom Decks</h1>
        {editing === null && (
          <Button variant="primary" size="sm" style={{ marginLeft: 'auto' }} onClick={() => setEditing('new')}>
            <Plus size={13} /> New Deck
          </Button>
        )}
      </div>

      {editing !== null && (
        <div style={{ marginBottom: '24px' }}>
          <DeckEditor
            initial={editing === 'new' ? null : editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Loading…</p>
      ) : decks.length === 0 && editing === null ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '0 0 12px' }}>No custom decks yet.</p>
          <Button variant="primary" size="sm" onClick={() => setEditing('new')}>
            <Plus size={13} /> Create your first deck
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {decks.map(d => (
            <div key={d.id} style={{ padding: '14px 16px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '3px' }}>{d.displayName}</div>
                {d.description && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{d.description}</div>}
                <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>
                  {d.cardCanonicalNames.length} card{d.cardCanonicalNames.length !== 1 ? 's' : ''}
                  {d.reversalEnabled ? ' · Reversals on' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <Button variant="ghost" size="sm" onClick={() => setEditing(d)}><Pencil size={12} /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id)}><Trash2 size={12} style={{ color: 'var(--color-danger)' }} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
