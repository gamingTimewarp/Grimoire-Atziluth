import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useState, useEffect, useRef } from 'react'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity } from '@grimoire/core'
import { loadTraditionSettings, resolveDisplayName } from '@/lib/tradition-store'
import { Search, X, Shuffle, SlidersHorizontal } from 'lucide-react'
import { formatEntityType, formatTag } from '@/lib/format'
import { getRecentEntities, removeRecentEntity, clearRecentEntities } from '@/lib/recent-entities'
import type { RecentEntity } from '@/lib/recent-entities'

export const Route = createFileRoute('/reference/')(({
  validateSearch: (search: Record<string, unknown>) => ({
    tag: typeof search.tag === 'string' ? search.tag : undefined,
  }),
  component: ReferencePage,
}))

// ─── Entity type groups for the type filter select ────────────────────────────

const ENTITY_TYPE_GROUPS: { label: string; options: { value: string; label: string }[] }[] = [
  { label: 'Tarot', options: [
    { value: 'tarot.card',  label: 'Cards' },
    { value: 'tarot.deck',  label: 'Decks' },
    { value: 'tarot.suit',  label: 'Suits' },
  ]},
  { label: 'Divination', options: [
    { value: 'rune',                    label: 'Runes' },
    { value: 'ogham.letter',            label: 'Ogham' },
    { value: 'iching.hexagram',         label: 'I Ching Hexagrams' },
    { value: 'iching.trigram',          label: 'I Ching Trigrams' },
    { value: 'geomancy.figure',         label: 'Geomantic Figures' },
    { value: 'divination.mahjong-tile', label: 'Mahjong Tiles' },
    { value: 'divination.tea-symbol',   label: 'Tea Leaf Symbols' },
  ]},
  { label: 'Astrology', options: [
    { value: 'astrology.zodiac-sign',    label: 'Zodiac Signs' },
    { value: 'astrology.planet',         label: 'Planets' },
    { value: 'astrology.node',           label: 'Lunar Nodes' },
    { value: 'astrology.house',          label: 'Houses' },
    { value: 'astrology.aspect',         label: 'Aspects' },
    { value: 'astrology.element',        label: 'Elements' },
    { value: 'astrology.decan',          label: 'Decans' },
    { value: 'astrology.fixed-star',     label: 'Fixed Stars' },
    { value: 'astrology.nakshatra',      label: 'Nakshatras' },
    { value: 'astrology.lunar-mansion',  label: 'Lunar Mansions' },
    { value: 'astrology.full-moon-name', label: 'Full Moon Names' },
  ]},
  { label: 'Qabalah', options: [
    { value: 'qabalah.sephira',        label: 'Sephiroth' },
    { value: 'qabalah.path',           label: 'Paths' },
    { value: 'qabalah.qliphoth',       label: 'Qliphoth' },
    { value: 'qabalah.world',          label: 'Worlds' },
    { value: 'qabalah.pillar',         label: 'Pillars' },
    { value: 'qabalah.partzuf',        label: 'Partzufim' },
    { value: 'qabalah.tunnel-of-set',  label: 'Tunnels of Set' },
  ]},
  { label: 'Angels & Demons', options: [
    { value: 'angel.shem',     label: 'Shem Angels (72)' },
    { value: 'angel.order',    label: 'Angelic Orders' },
    { value: 'angel.archangel',label: 'Archangels' },
    { value: 'goetia.demon',   label: 'Goetia Demons' },
    { value: 'spirit.olympic', label: 'Olympic Spirits' },
    { value: 'enochian.aethyr',label: 'Enochian Aethyrs' },
  ]},
  { label: 'Deities', options: [
    { value: 'deity.greek',     label: 'Greek Deities' },
    { value: 'deity.egyptian',  label: 'Egyptian Deities' },
    { value: 'norse.deity',     label: 'Norse Deities' },
    { value: 'taoism.immortal', label: 'Taoist Immortals' },
  ]},
  { label: 'Letters', options: [
    { value: 'letter.hebrew',   label: 'Hebrew' },
    { value: 'letter.greek',    label: 'Greek' },
    { value: 'letter.arabic',   label: 'Arabic' },
    { value: 'letter.enochian', label: 'Enochian' },
    { value: 'letter.latin',    label: 'Latin' },
  ]},
  { label: 'Nature & Magic', options: [
    { value: 'herb',              label: 'Herbs' },
    { value: 'chakra',            label: 'Chakras' },
    { value: 'tattwa',            label: 'Tattwas' },
    { value: 'calendar.sabbat',   label: 'Sabbats / Wheel of the Year' },
    { value: 'alchemy.metal',     label: 'Alchemical Metals' },
    { value: 'alchemy.operation', label: 'Alchemical Operations' },
    { value: 'geometry.shape',    label: 'Sacred Geometry' },
  ]},
  { label: 'Colour & Gemstone', options: [
    { value: 'colour.colour',       label: 'Colours' },
    { value: 'gemstone.gemstone',   label: 'Gemstones' },
  ]},
  { label: 'Other', options: [
    { value: 'numerology.digit',    label: 'Numerology' },
    { value: 'chinese-zodiac.animal', label: 'Chinese Zodiac' },
    { value: 'wuxing.phase',        label: 'Wu Xing / Five Phases' },
    { value: 'gnostic.aeon',        label: 'Gnostic Aeons' },
    { value: 'western.polarity',    label: 'Western Polarity' },
    { value: 'palmistry.line',      label: 'Palmistry Lines' },
    { value: 'palmistry.mount',     label: 'Palmistry Mounts' },
    { value: 'rosicrucian.symbol',  label: 'Rosicrucian Symbols' },
  ]},
]

// ─── Page ─────────────────────────────────────────────────────────────────────

function ReferencePage() {
  const { engine }  = useEngineStore()
  const navigate    = useNavigate()
  const { tag: tagFilter } = Route.useSearch()
  const { customEnabled, primaryBySystem } = loadTraditionSettings()

  // Search state
  const [query,      setQuery]      = useState('')
  const [results,    setResults]    = useState<BaseEntity[]>([])
  const [searched,   setSearched]   = useState(false)
  const [randomising,setRandomising]= useState(false)

  // Filter panel state
  const [filterOpen,   setFilterOpen]   = useState(false)
  const [typeFilter,   setTypeFilter]   = useState('')
  const [tagFilters,   setTagFilters]   = useState<string[]>([])
  const [sourceFilter, setSourceFilter] = useState<'all' | 'built-in' | 'custom'>('all')
  const [allTags,      setAllTags]      = useState<string[]>([])

  const activeFilterCount =
    (typeFilter ? 1 : 0) +
    tagFilters.length +
    (sourceFilter !== 'all' ? 1 : 0)

  // Auto-load when arriving via URL tag filter
  useEffect(() => {
    if (!engine || !tagFilter) return
    engine.adapter.listEntities({ tags: [tagFilter] }, { offset: 0, limit: 200 })
      .then(r => {
        const items = customEnabled ? r.items : r.items.filter(e => e.isBuiltIn)
        setResults(items)
        setSearched(true)
        setQuery('')
      })
      .catch(console.error)
  }, [engine, tagFilter])

  // Load tag list when filter panel opens
  useEffect(() => {
    if (!engine || !filterOpen || allTags.length > 0) return
    engine.adapter.listAllTags().then(setAllTags).catch(console.error)
  }, [engine, filterOpen])

  // ── Search ────────────────────────────────────────────────────────────────

  const handleSearch = async () => {
    if (!engine) return

    // Merge URL tag param with panel tags (deduplicated)
    const activeTags = tagFilter && !tagFilters.includes(tagFilter)
      ? [...tagFilters, tagFilter]
      : tagFilters

    const effectiveType = typeFilter || undefined

    // Resolve isBuiltIn from source filter, overridden by customEnabled setting
    let isBuiltIn: boolean | undefined
    if (!customEnabled) {
      isBuiltIn = true
    } else if (sourceFilter === 'built-in') {
      isBuiltIn = true
    } else if (sourceFilter === 'custom') {
      isBuiltIn = false
    }

    let items: BaseEntity[]

    if (query.trim()) {
      // Text search, then post-filter by tags and source
      const r = await engine.adapter.searchEntities(
        query.trim(),
        effectiveType ? { entityType: effectiveType } : undefined,
        { offset: 0, limit: 500 },
      )
      items = r.items.map(sr => sr.entity)
      if (activeTags.length > 0) {
        items = items.filter(e => activeTags.every(t => e.tags.includes(t)))
      }
      if (isBuiltIn !== undefined) {
        items = items.filter(e => e.isBuiltIn === isBuiltIn)
      }
      items = items.slice(0, 200)
    } else {
      // No text — pure filter query
      const r = await engine.adapter.listEntities(
        {
          entityType: effectiveType,
          tags: activeTags.length > 0 ? activeTags : undefined,
          isBuiltIn,
        },
        { offset: 0, limit: 500 },
      )
      items = r.items
    }

    setResults(items)
    setSearched(true)

    // Absorb URL tag into state (keep showing as chip in panel)
    if (tagFilter) {
      if (!tagFilters.includes(tagFilter)) setTagFilters(prev => [...prev, tagFilter])
      navigate({ to: '/reference', search: { tag: undefined } })
    }
  }

  const handleRandom = async () => {
    if (!engine || randomising) return
    setRandomising(true)
    try {
      const { total } = await engine.adapter.listEntities({}, { offset: 0, limit: 1 })
      if (total === 0) return
      const offset = Math.floor(Math.random() * total)
      const { items } = await engine.adapter.listEntities({}, { offset, limit: 1 })
      if (items[0]) navigate({ to: '/reference/$canonicalName', params: { canonicalName: items[0].canonicalName } })
    } finally {
      setRandomising(false)
    }
  }

  const clearTagFilter = () => {
    navigate({ to: '/reference', search: { tag: undefined } })
    if (tagFilters.length === 0 && !typeFilter && sourceFilter === 'all') {
      setResults([])
      setSearched(false)
    }
  }

  const clearAllFilters = () => {
    setTypeFilter('')
    setTagFilters([])
    setSourceFilter('all')
    navigate({ to: '/reference', search: { tag: undefined } })
    setResults([])
    setSearched(false)
    setQuery('')
  }

  const handleNavigate = (canonicalName: string) => {
    navigate({ to: '/reference/$canonicalName', params: { canonicalName } })
  }

  const removeTagFilter = (tag: string) => {
    setTagFilters(prev => prev.filter(t => t !== tag))
  }

  const allActiveTagCount = tagFilters.length + (tagFilter ? 1 : 0)

  return (
    <div style={{ maxWidth: '760px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 300, marginBottom: '24px' }}>Reference</h1>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); if (!e.target.value && !activeFilterCount && !tagFilter) { setResults([]); setSearched(false) } }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search entities…"
            style={{
              width: '100%', padding: '10px 12px 10px 36px',
              background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
              borderRadius: '6px', color: 'var(--color-text)', fontSize: '14px', outline: 'none',
            }}
          />
        </div>
        <button
          onClick={handleSearch}
          style={{
            padding: '10px 20px', background: 'var(--color-accent)', color: '#0d0d12',
            border: 'none', borderRadius: '6px', fontWeight: 500, cursor: 'pointer', fontSize: '14px',
          }}
        >
          Search
        </button>
        <button
          onClick={() => setFilterOpen(o => !o)}
          title="Advanced filters"
          style={{
            padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '6px',
            background: (filterOpen || activeFilterCount > 0) ? 'rgba(180,156,90,0.1)' : 'var(--color-surface-2)',
            border: `1px solid ${(filterOpen || activeFilterCount > 0) ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
            borderRadius: '6px', cursor: 'pointer',
            color: (filterOpen || activeFilterCount > 0) ? 'var(--color-accent)' : 'var(--color-text-subtle)',
            transition: 'border-color 0.15s, color 0.15s',
          }}
        >
          <SlidersHorizontal size={15} />
          {activeFilterCount > 0 && (
            <span style={{
              fontSize: '10px', fontWeight: 600, lineHeight: 1,
              background: 'var(--color-accent)', color: '#0d0d12',
              borderRadius: '8px', padding: '2px 5px', minWidth: '14px', textAlign: 'center',
            }}>
              {activeFilterCount}
            </span>
          )}
        </button>
        <button
          onClick={handleRandom}
          disabled={randomising}
          title="Navigate to a random reference entry"
          style={{
            padding: '10px 12px', background: 'var(--color-surface-2)', color: 'var(--color-text-subtle)',
            border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', opacity: randomising ? 0.5 : 1,
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)'; e.currentTarget.style.color = 'var(--color-accent)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-subtle)' }}
        >
          <Shuffle size={16} />
        </button>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <FilterPanel
          typeFilter={typeFilter}
          tagFilters={tagFilters}
          urlTag={tagFilter}
          sourceFilter={sourceFilter}
          allTags={allTags}
          customEnabled={customEnabled}
          onTypeChange={setTypeFilter}
          onTagAdd={tag => { if (!tagFilters.includes(tag)) setTagFilters(prev => [...prev, tag]) }}
          onTagRemove={removeTagFilter}
          onUrlTagRemove={clearTagFilter}
          onSourceChange={setSourceFilter}
          onClearAll={activeFilterCount > 0 || !!tagFilter ? clearAllFilters : undefined}
        />
      )}

      {/* Active filter chips summary (when panel closed) */}
      {!filterOpen && (tagFilter || tagFilters.length > 0 || typeFilter) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', alignItems: 'center' }}>
          {typeFilter && (
            <Chip label={ENTITY_TYPE_GROUPS.flatMap(g => g.options).find(o => o.value === typeFilter)?.label ?? typeFilter} onRemove={() => setTypeFilter('')} />
          )}
          {tagFilters.map(t => <Chip key={t} label={t} onRemove={() => removeTagFilter(t)} />)}
          {tagFilter && <Chip key="__url" label={tagFilter} onRemove={clearTagFilter} />}
          {(activeFilterCount > 0 || tagFilter) && (
            <button onClick={clearAllFilters} style={{ fontSize: '11px', color: 'var(--color-text-subtle)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', textDecoration: 'underline' }}>
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Results */}
      <div style={{ marginTop: filterOpen ? '4px' : (tagFilter || tagFilters.length > 0 || typeFilter ? '4px' : '14px') }}>
        {searched && results.length === 0 && (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>No results found.</div>
        )}

        {results.length > 0 && (
          <>
            <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginBottom: '12px' }}>
              {results.length} result{results.length === 1 ? '' : 's'}
              {(allActiveTagCount > 0 || typeFilter) && (
                <span style={{ color: 'var(--color-text-muted)' }}>
                  {typeFilter && ` · type: ${ENTITY_TYPE_GROUPS.flatMap(g => g.options).find(o => o.value === typeFilter)?.label ?? typeFilter}`}
                  {allActiveTagCount > 0 && ` · ${allActiveTagCount} tag${allActiveTagCount === 1 ? '' : 's'}`}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {results.map(entity => (
                <EntityRow
                  key={entity.id}
                  entity={entity}
                  displayName={resolveDisplayName(entity, primaryBySystem)}
                  onClick={() => handleNavigate(entity.canonicalName)}
                />
              ))}
            </div>
          </>
        )}

        {!searched && (
          <BrowseGrid onNavigate={handleNavigate} customEnabled={customEnabled} />
        )}
      </div>
    </div>
  )
}

// ─── Filter panel ─────────────────────────────────────────────────────────────

function FilterPanel({
  typeFilter, tagFilters, urlTag, sourceFilter, allTags, customEnabled,
  onTypeChange, onTagAdd, onTagRemove, onUrlTagRemove, onSourceChange, onClearAll,
}: {
  typeFilter: string
  tagFilters: string[]
  urlTag: string | undefined
  sourceFilter: 'all' | 'built-in' | 'custom'
  allTags: string[]
  customEnabled: boolean
  onTypeChange: (t: string) => void
  onTagAdd: (t: string) => void
  onTagRemove: (t: string) => void
  onUrlTagRemove: () => void
  onSourceChange: (s: 'all' | 'built-in' | 'custom') => void
  onClearAll?: () => void
}) {
  return (
    <div style={{
      padding: '14px 16px', marginBottom: '12px',
      background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
      borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '14px',
    }}>
      {/* Row 1: type + source */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {/* Entity type */}
        <div style={{ flex: '1', minWidth: '160px' }}>
          <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>
            Entity type
          </div>
          <select
            value={typeFilter}
            onChange={e => onTypeChange(e.target.value)}
            style={{
              width: '100%', padding: '6px 10px',
              background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
              borderRadius: '5px', color: 'var(--color-text)', fontSize: '13px',
              outline: 'none', colorScheme: 'dark',
            }}
          >
            <option value="">All types</option>
            {ENTITY_TYPE_GROUPS.map(group => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Source (only when custom content is possible) */}
        {customEnabled && (
          <div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>
              Source
            </div>
            <div style={{ display: 'flex' }}>
              {(['all', 'built-in', 'custom'] as const).map((opt, i) => (
                <button
                  key={opt}
                  onClick={() => onSourceChange(opt)}
                  style={{
                    padding: '5px 10px', fontSize: '12px', cursor: 'pointer',
                    background: sourceFilter === opt ? 'rgba(180,156,90,0.12)' : 'var(--color-surface-3)',
                    border: '1px solid',
                    borderColor: sourceFilter === opt ? 'var(--color-accent-muted)' : 'var(--color-border)',
                    borderRadius: i === 0 ? '5px 0 0 5px' : i === 2 ? '0 5px 5px 0' : '0',
                    borderLeft: i > 0 ? 'none' : undefined,
                    color: sourceFilter === opt ? 'var(--color-accent)' : 'var(--color-text-subtle)',
                    fontFamily: 'inherit',
                  }}
                >
                  {opt === 'all' ? 'All' : opt === 'built-in' ? 'Built-in' : 'Custom'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Clear all */}
        {onClearAll && (
          <button
            onClick={onClearAll}
            style={{ fontSize: '11px', color: 'var(--color-text-subtle)', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 4px', textDecoration: 'underline', alignSelf: 'flex-end' }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Row 2: tags */}
      <div>
        <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
          Tags
        </div>
        <TagInput
          chips={tagFilters}
          urlChip={urlTag}
          suggestions={allTags}
          onAdd={onTagAdd}
          onRemove={onTagRemove}
          onUrlRemove={onUrlTagRemove}
        />
      </div>
    </div>
  )
}

// ─── Tag input with autocomplete ──────────────────────────────────────────────

function TagInput({
  chips, urlChip, suggestions, onAdd, onRemove, onUrlRemove,
}: {
  chips: string[]
  urlChip: string | undefined
  suggestions: string[]
  onAdd: (t: string) => void
  onRemove: (t: string) => void
  onUrlRemove: () => void
}) {
  const [input, setInput] = useState('')
  const [open, setOpen]   = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = input.length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(input.toLowerCase()) && !chips.includes(s) && s !== urlChip).slice(0, 8)
    : []

  const commit = (tag: string) => {
    const t = tag.trim()
    if (!t) return
    onAdd(t)
    setInput('')
    setOpen(false)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
      {/* URL-sourced chip */}
      {urlChip && <Chip label={urlChip} onRemove={onUrlRemove} accent />}
      {/* Panel chips */}
      {chips.map(t => <Chip key={t} label={t} onRemove={() => onRemove(t)} />)}
      {/* Input */}
      <div ref={ref} style={{ position: 'relative' }}>
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true) }}
          onFocus={() => { if (input) setOpen(true) }}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); if (filtered[0]) commit(filtered[0]); else if (input.trim()) commit(input) }
            if (e.key === 'Escape') { setOpen(false); setInput('') }
          }}
          placeholder={chips.length || urlChip ? 'Add tag…' : 'Filter by tag…'}
          style={{
            padding: '4px 8px', fontSize: '12px',
            background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
            borderRadius: '4px', color: 'var(--color-text)', outline: 'none',
            width: '120px',
          }}
        />
        {open && filtered.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 3px)', left: 0, zIndex: 20,
            background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
            borderRadius: '5px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            minWidth: '160px', overflow: 'hidden',
          }}>
            {filtered.map(s => (
              <div
                key={s}
                onMouseDown={e => { e.preventDefault(); commit(s) }}
                style={{
                  padding: '6px 10px', fontSize: '12px', cursor: 'pointer',
                  color: 'var(--color-text)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ label, onRemove, accent }: { label: string; onRemove: () => void; accent?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 8px',
      background: accent ? 'rgba(180,156,90,0.1)' : 'var(--color-surface-3)',
      border: `1px solid ${accent ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
      borderRadius: '4px', fontSize: '11px',
      color: accent ? 'var(--color-accent)' : 'var(--color-text-muted)',
    }}>
      {label}
      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'inherit', lineHeight: 1, opacity: 0.7 }}
      >
        <X size={10} />
      </button>
    </span>
  )
}

// ─── Browse grid ──────────────────────────────────────────────────────────────

const BROWSE_ITEMS = [
  { canonicalName: 'system.overview.tarot-decks',          label: 'Tarot Decks'        },
  { canonicalName: 'system.overview.lenormand',            label: 'Lenormand'          },
  { canonicalName: 'system.overview.playing-cards',        label: 'Playing Cards'      },
  { canonicalName: 'system.overview.geomancy',             label: 'Geomancy'           },
  { canonicalName: 'system.overview.iching',               label: 'I Ching'            },
  { canonicalName: 'system.overview.runes',                label: 'Elder Futhark'      },
  { canonicalName: 'system.overview.ogham',                label: 'Ogham'              },
  { canonicalName: 'system.overview.mahjong',              label: 'Mahjong Divination' },
  { canonicalName: 'system.overview.tasseomancy',          label: 'Tea Leaf Reading'   },
  { canonicalName: 'system.overview.palmistry',            label: 'Palmistry'          },
  { canonicalName: 'system.overview.astrology',            label: 'Astrology'          },
  { canonicalName: 'system.overview.elements',             label: 'Elements'           },
  { canonicalName: 'system.overview.nakshatras',           label: 'Nakshatras'         },
  { canonicalName: 'system.overview.navaratna',            label: 'Navaratna (Gems)'   },
  { canonicalName: 'system.overview.jyotish-dasha',        label: 'Vimshottari Dasha'  },
  { canonicalName: 'system.overview.doshas',                label: 'Doshas'            },
  { canonicalName: 'system.overview.qabalah',              label: 'Qabalah'            },
  { canonicalName: 'system.overview.numerology',           label: 'Numerology'         },
  { canonicalName: 'system.overview.letters',              label: 'Letters'            },
  { canonicalName: 'system.overview.chakras',              label: 'Chakras'            },
  { canonicalName: 'system.overview.chinese-zodiac',       label: 'Chinese Zodiac'     },
  { canonicalName: 'system.overview.alchemy',              label: 'Alchemy'            },
  { canonicalName: 'system.overview.sacred-geometry',      label: 'Sacred Geometry'    },
  { canonicalName: 'system.overview.tattwas',              label: 'Tattwas'            },
  { canonicalName: 'system.overview.western-polarity',     label: 'Western Polarity'   },
  { canonicalName: 'system.overview.feng-shui-directions', label: 'Feng Shui'          },
  { canonicalName: 'system.overview.herbs',                label: 'Magical Herbs'      },
  { canonicalName: 'system.overview.sabbats',              label: 'Wheel of the Year'  },
  { canonicalName: 'system.overview.greek-deities',        label: 'Greek Deities'      },
  { canonicalName: 'system.overview.egyptian-deities',     label: 'Egyptian Deities'   },
  { canonicalName: 'system.overview.norse-deities',        label: 'Norse Deities'      },
  { canonicalName: 'system.overview.norse-worlds',         label: 'Nine Worlds'        },
  { canonicalName: 'system.overview.ba-xian',              label: 'Eight Immortals'    },
  { canonicalName: 'system.overview.angel-orders',         label: 'Angelic Orders'     },
  { canonicalName: 'system.overview.shem-angels',          label: '72 Shem Angels'     },
  { canonicalName: 'system.overview.goetia',               label: 'Goetia'             },
  { canonicalName: 'system.overview.enochian-aethyrs',     label: 'Enochian Aethyrs'   },
  { canonicalName: 'system.overview.valentinian-aeons',    label: 'Valentinian Aeons'  },
  { canonicalName: 'system.overview.sethian-aeons',        label: 'Sethian Aeons'      },
  { canonicalName: 'system.overview.rosicrucian',          label: 'Rosicrucian'        },
  { canonicalName: 'system.overview.divine-names',         label: '99 Names of Allah'  },
  { canonicalName: 'system.overview.magic-circles',        label: 'Magic Circles'       },
  { canonicalName: 'system.overview.magic-pentagrams',     label: 'Elemental Pentagrams'},
  { canonicalName: 'system.overview.magic-hexagrams',      label: 'Planetary Hexagrams' },
  { canonicalName: 'system.overview.colours',               label: 'Colours'            },
  { canonicalName: 'system.overview.gemstones',              label: 'Gemstones'          },
]

// ─── Recently viewed ──────────────────────────────────────────────────────────

function RecentlyViewedSection({ onNavigate }: { onNavigate: (cn: string) => void }) {
  const [recents, setRecents] = useState<RecentEntity[]>([])

  useEffect(() => {
    setRecents(getRecentEntities(8))
  }, [])

  if (recents.length === 0) return null

  const handleRemove = (cn: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeRecentEntity(cn)
    setRecents(getRecentEntities(8))
  }

  const handleClearAll = () => {
    clearRecentEntities()
    setRecents([])
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Recently Viewed
        </div>
        <button
          onClick={handleClearAll}
          style={{
            background: 'none', border: 'none', padding: '2px 4px', cursor: 'pointer',
            fontSize: '11px', color: 'var(--color-text-subtle)', fontFamily: 'inherit',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
        >
          Clear all
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {recents.map(r => (
          <button
            key={r.canonicalName}
            onClick={() => onNavigate(r.canonicalName)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '5px 10px', background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)', borderRadius: '5px',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
          >
            <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>{r.displayName}</span>
            <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)', flexShrink: 0 }}>{formatEntityType(r.entityType)}</span>
            <span
              onClick={e => handleRemove(r.canonicalName, e)}
              style={{ fontSize: '11px', color: 'var(--color-text-subtle)', lineHeight: 1, opacity: 0.6, marginLeft: '2px' }}
              title="Remove from history"
            >×</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Browse grid ──────────────────────────────────────────────────────────────

function BrowseGrid({ onNavigate, customEnabled }: { onNavigate: (cn: string) => void; customEnabled: boolean }) {
  const navigate = useNavigate()
  return (
    <div>
      <RecentlyViewedSection onNavigate={onNavigate} />
      {customEnabled && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
            Custom
          </div>
          <button
            onClick={() => navigate({ to: '/custom' })}
            style={{
              padding: '12px 14px', background: 'var(--color-surface-2)',
              border: '1px solid var(--color-accent-muted)', borderRadius: '6px',
              cursor: 'pointer', color: 'var(--color-accent)', fontSize: '13px',
              textAlign: 'left', fontFamily: 'inherit', fontWeight: 500,
            }}
          >
            My Entities
          </button>
        </div>
      )}
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
        Browse
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
        {BROWSE_ITEMS.map(item => (
          <button
            key={item.canonicalName}
            onClick={() => onNavigate(item.canonicalName)}
            style={{
              padding: '12px 14px', background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)', borderRadius: '6px',
              cursor: 'pointer', color: 'var(--color-text)', fontSize: '13px',
              textAlign: 'left', fontFamily: 'inherit', fontWeight: 500,
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '20px' }}>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
          Guides
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
          {[
            { to: '/reference/lenormand-combinations',      label: 'Lenormand Combinations' },
            { to: '/reference/iching-trigram-matrix',       label: 'I Ching Trigram Matrix' },
            { to: '/reference/wuxing-phases',               label: 'I Ching Elements' },
            { to: '/reference/astrological-dignities',      label: 'Astrological Dignities' },
            { to: '/reference/chinese-zodiac-compatibility',label: 'Chinese Zodiac Compatibility' },
            { to: '/reference/sephirothic-matrix',          label: 'Sephirothic Attributions' },
            { to: '/reference/planetary-matrix',            label: 'Planetary Attributions' },
            { to: '/reference/geomancy-shield-chart',       label: 'Geomancy Shield Chart'      },
          ].map(({ to, label }) => (
            <button
              key={to}
              onClick={() => navigate({ to: to as never })}
              style={{
                padding: '12px 14px', background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)', borderRadius: '6px',
                cursor: 'pointer', color: 'var(--color-text)', fontSize: '13px',
                textAlign: 'left', fontFamily: 'inherit', fontWeight: 500,
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Entity row ───────────────────────────────────────────────────────────────

function EntityRow({ entity, displayName, onClick }: { entity: BaseEntity; displayName: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '14px 16px', background: 'var(--color-surface-2)',
        borderRadius: '6px', border: '1px solid var(--color-border)',
        cursor: 'pointer', transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent-muted)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
        <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>{displayName}</span>
        <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>{formatEntityType(entity.entityType)}</span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
        {entity.canonicalName}
      </div>
      {entity.description && (
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
          {entity.description.slice(0, 200)}{entity.description.length > 200 ? '…' : ''}
        </div>
      )}
    </div>
  )
}
