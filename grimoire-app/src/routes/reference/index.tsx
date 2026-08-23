import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useState, useEffect, useRef } from 'react'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity } from '@grimoire/core'
import { loadTraditionSettings, resolveDisplayName } from '@/lib/tradition-store'
import { Search, X, Shuffle, SlidersHorizontal } from 'lucide-react'
import { formatEntityType, formatTag } from '@/lib/format'
import { getRecentEntities, removeRecentEntity, clearRecentEntities } from '@/lib/recent-entities'
import type { RecentEntity } from '@/lib/recent-entities'
import { computeReferenceTopLevelOverviews, getRandomEntity } from '@/lib/entity-attributes'
import type { GroupOverview } from '@/lib/entity-attributes'
import { ENTITY_TYPE_GROUPS } from '@/lib/entity-type-groups'
import { Chip, TagInput } from '@/components/ui/TagInput'
import { Toast } from '@/components/ui/Toast'
import { SegmentedToggle } from '@/components/ui/SegmentedToggle'

export const Route = createFileRoute('/reference/')(({
  validateSearch: (search: Record<string, unknown>) => ({
    tag: typeof search.tag === 'string' ? search.tag : undefined,
    // Incoming text query from GlobalSearch's "press Enter with nothing
    // highlighted" handoff — consumed once on arrival, then cleared (see the
    // qParam effect below), unlike `tag` which persists as an active filter.
    q: typeof search.q === 'string' ? search.q : undefined,
    // One-shot entry point from the Browse grid's "Browse All Custom Entities"
    // tile — consumed once (like `q`) to switch sourceFilter into 'custom',
    // which itself persists in component state afterward, not the URL.
    custom: typeof search.custom === 'string' ? search.custom : undefined,
  }),
  component: ReferencePage,
}))

// ─── Page ─────────────────────────────────────────────────────────────────────

function ReferencePage() {
  const { engine }  = useEngineStore()
  const navigate    = useNavigate()
  const { tag: tagFilter, q: qParam, custom: customParam } = Route.useSearch()
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
  const [eggToast,     setEggToast]     = useState(false)
  const eggToastShown = useRef(false)

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

  // Auto-load when arriving via the Browse grid's "Browse All Custom Entities"
  // tile — switches into the same isBuiltIn:false view the filter panel's
  // "Custom" segmented control already produces, then clears the one-shot URL
  // param (sourceFilter itself is what persists the mode afterward).
  useEffect(() => {
    if (!engine || !customParam) return
    setSourceFilter('custom')
    engine.adapter.listEntities({ isBuiltIn: false }, { offset: 0, limit: 500 })
      .then(r => {
        setResults(r.items)
        setSearched(true)
        setQuery('')
      })
      .catch(console.error)
    navigate({ to: '/reference', search: { tag: tagFilter, q: undefined, custom: undefined } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, customParam])

  // Load tag list when filter panel opens
  useEffect(() => {
    if (!engine || !filterOpen || allTags.length > 0) return
    engine.adapter.listAllTags().then(setAllTags).catch(console.error)
  }, [engine, filterOpen])

  // A quiet nod for anyone who notices the odd one out among Easter's real
  // tags and clicks it — whether that's the URL-driven tag pill or the "egg"
  // filter added through the panel's multi-select.
  useEffect(() => {
    const hasEgg = tagFilter?.toLowerCase() === 'egg' || tagFilters.some(t => t.toLowerCase() === 'egg')
    if (hasEgg && !eggToastShown.current) {
      eggToastShown.current = true
      setEggToast(true)
      setTimeout(() => setEggToast(false), 3000)
    } else if (!hasEgg) {
      eggToastShown.current = false
    }
  }, [tagFilter, tagFilters])

  // ── Search ────────────────────────────────────────────────────────────────

  // Accepts an optional override so callers that just set `query` via setState
  // (e.g. the qParam effect below) don't run into the stale-closure problem of
  // reading `query` before that state update has actually committed.
  const handleSearch = async (queryOverride?: string) => {
    if (!engine) return
    const effectiveQuery = queryOverride ?? query

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

    if (effectiveQuery.trim()) {
      // Text search, then post-filter by tags and source
      const r = await engine.adapter.searchEntities(
        effectiveQuery.trim(),
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
      navigate({ to: '/reference', search: { tag: undefined, q: undefined, custom: undefined } })
    }
  }

  // Auto-search when arriving via URL query (e.g. pressing Enter in the sidebar
  // search with nothing highlighted) — consumed once, then cleared from the URL
  // so it doesn't linger and re-fire on an unrelated back/forward navigation.
  useEffect(() => {
    if (!engine || !qParam) return
    setQuery(qParam)
    handleSearch(qParam)
    navigate({ to: '/reference', search: { tag: tagFilter, q: undefined, custom: undefined } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, qParam])

  const handleRandom = async () => {
    if (!engine || randomising) return
    setRandomising(true)
    try {
      const entity = await getRandomEntity(engine.adapter)
      if (entity) navigate({ to: '/reference/$canonicalName', params: { canonicalName: entity.canonicalName } })
    } finally {
      setRandomising(false)
    }
  }

  const clearTagFilter = () => {
    navigate({ to: '/reference', search: { tag: undefined, q: undefined, custom: undefined } })
    if (tagFilters.length === 0 && !typeFilter && sourceFilter === 'all') {
      setResults([])
      setSearched(false)
    }
  }

  const clearAllFilters = () => {
    setTypeFilter('')
    setTagFilters([])
    setSourceFilter('all')
    navigate({ to: '/reference', search: { tag: undefined, q: undefined, custom: undefined } })
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
          onClick={() => handleSearch()}
          style={{
            padding: '10px 20px', background: 'var(--color-accent)', color: 'var(--color-accent-contrast)',
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
              background: 'var(--color-accent)', color: 'var(--color-accent-contrast)',
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

      {eggToast && <Toast message="You found an Easter egg. Somewhat literally." />}
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

// ─── Browse grid ──────────────────────────────────────────────────────────────
// The browse list is loaded dynamically via computeReferenceTopLevelOverviews
// (entity-attributes.ts) rather than hardcoded, so it always reflects the current
// set of top-level tradition overviews — sub-topic overviews (e.g. Norse Deities,
// Tarot Decks) are reachable by drilling into their parent tradition instead.

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

type BrowseSortMode = 'alpha' | 'topic'

/**
 * Deliberate reading order for topic sections — roughly the app's own weight of
 * emphasis (cartomancy and divination first, since that's the primary use case)
 * rather than alphabetical, which would otherwise scatter Tarot to the bottom.
 * Any overview whose browseTopic isn't listed here falls into "Other", sorted
 * after every named topic.
 */
const TOPIC_ORDER = [
  'Tarot & Cartomancy',
  'Divination Systems',
  'Astrology & Calendar',
  'Qabalah & Ceremonial Magic',
  'World Mythology & Religion',
  'Eastern & Vedic Traditions',
  'Correspondences & Natural Magic',
  'Numerology & Sacred Pattern',
]

function BrowseTile({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
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
  )
}

function BrowseSortToggle({ mode, onChange }: { mode: BrowseSortMode; onChange: (m: BrowseSortMode) => void }) {
  return (
    <SegmentedToggle
      value={mode}
      onChange={onChange}
      options={[
        { value: 'alpha', label: 'ABC',   title: 'Sort alphabetically' },
        { value: 'topic',  label: 'Topic', title: 'Group by topic' },
      ]}
    />
  )
}

function BrowseGrid({ onNavigate, customEnabled }: { onNavigate: (cn: string) => void; customEnabled: boolean }) {
  const navigate = useNavigate()
  const { engine } = useEngineStore()
  const [browseItems, setBrowseItems] = useState<GroupOverview[]>([])
  const [browseSortMode, setBrowseSortMode] = useState<BrowseSortMode>('alpha')

  useEffect(() => {
    if (!engine) return
    computeReferenceTopLevelOverviews(engine.adapter).then(setBrowseItems).catch(console.error)
  }, [engine])

  const topicGroups = React.useMemo(() => {
    if (browseSortMode !== 'topic') return null
    const byTopic = new Map<string, GroupOverview[]>()
    for (const item of browseItems) {
      const topic = item.topic ?? 'Other'
      const list = byTopic.get(topic)
      if (list) list.push(item)
      else byTopic.set(topic, [item])
    }
    for (const list of byTopic.values()) list.sort((a, b) => a.label.localeCompare(b.label))
    return [...byTopic.entries()].sort(([a], [b]) => {
      const ia = TOPIC_ORDER.indexOf(a), ib = TOPIC_ORDER.indexOf(b)
      if (ia === -1 && ib === -1) return a.localeCompare(b)
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
  }, [browseItems, browseSortMode])

  return (
    <div>
      <RecentlyViewedSection onNavigate={onNavigate} />
      {customEnabled && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
            Custom
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
            <button
              onClick={() => navigate({ to: '/reference', search: { tag: undefined, q: undefined, custom: 'true' } })}
              title="Browse every custom entity you've created, right here in Reference"
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
              Browse All Custom Entities
            </button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Browse
        </div>
        <BrowseSortToggle mode={browseSortMode} onChange={setBrowseSortMode} />
      </div>
      {topicGroups ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {topicGroups.map(([topic, items]) => (
            <div key={topic}>
              <div style={{ fontSize: '11px', color: 'var(--color-accent)', letterSpacing: '0.04em', marginBottom: '8px' }}>
                {topic}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                {items.map(item => (
                  <BrowseTile key={item.canonicalName} label={item.label} onClick={() => onNavigate(item.canonicalName)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
          {browseItems.map(item => (
            <BrowseTile key={item.canonicalName} label={item.label} onClick={() => onNavigate(item.canonicalName)} />
          ))}
        </div>
      )}

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
            { to: '/reference/planet-in-sign',              label: 'Planet in Sign' },
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
