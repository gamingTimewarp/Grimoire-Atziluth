import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity } from '@grimoire/core'
import { Button } from '@/components/ui/Button'
import { Plus, Pencil, LayoutList, BookOpen, GitBranch, Layers, Download, Upload, X, ChevronDown, ChevronRight, Folder, FolderOpen, Search } from 'lucide-react'
import { formatEntityType } from '@/lib/format'
import { TagInput } from '@/components/ui/TagInput'
import { getAllCustomSpreads, getAllCustomDecks, getAllCustomTraditions, type CustomSpreadRecord, type CustomDeckRecord, type CustomTraditionRecord } from '@/lib/custom-db'
import { pickAndImportCustomEntities, exportImportTemplate, type ImportSummary } from '@/lib/custom-import'
import { exportSingleEntity, exportEntitySet, exportDeckRecord, exportDeckRecords } from '@/lib/entity-export'

export const Route = createFileRoute('/custom/')({
  component: CustomEntitiesPage,
})

// ─── Entity folder tree ────────────────────────────────────────────────────
// Groups custom entities into folders by entityType, one folder level per
// dot-separated segment (e.g. "calendar.meteor-shower" → folder "Calendar" >
// subfolder "Meteor Shower"), the same hierarchy entityType already encodes
// everywhere else in the app (ENTITY_TYPE_GROUPS, formatEntityType, etc.) —
// a flat, single-segment type (e.g. "herb") is just a top-level folder with
// no subfolder. Entities live at the node matching their exact, full
// entityType, not scattered across every ancestor folder.

interface EntityFolderNode {
  segment: string
  path: string
  children: Map<string, EntityFolderNode>
  entities: BaseEntity[]
}

function buildEntityFolderTree(entities: BaseEntity[]): EntityFolderNode {
  const root: EntityFolderNode = { segment: '', path: '', children: new Map(), entities: [] }
  for (const e of entities) {
    let node = root
    let path = ''
    for (const seg of e.entityType.split('.')) {
      path = path ? `${path}.${seg}` : seg
      let child = node.children.get(seg)
      if (!child) {
        child = { segment: seg, path, children: new Map(), entities: [] }
        node.children.set(seg, child)
      }
      node = child
    }
    node.entities.push(e)
  }
  return root
}

/** Total entity count across a folder and every descendant — used for the folder header badge. */
function folderEntityCount(node: EntityFolderNode): number {
  let count = node.entities.length
  for (const child of node.children.values()) count += folderEntityCount(child)
  return count
}

function CustomEntitiesPage() {
  const { engine } = useEngineStore()
  const navigate   = useNavigate()
  const [entities, setEntities] = useState<BaseEntity[]>([])
  const [spreads,    setSpreads]    = useState<CustomSpreadRecord[]>([])
  const [decks,      setDecks]      = useState<CustomDeckRecord[]>([])
  const [traditions, setTraditions] = useState<CustomTraditionRecord[]>([])
  const [loading,    setLoading]    = useState(true)
  const [importBusy,    setImportBusy]    = useState(false)
  const [importError,   setImportError]   = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [tagFilters,    setTagFilters]    = useState<string[]>([])
  const [query,         setQuery]         = useState('')
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set())

  const loadAll = useCallback(() => {
    if (!engine) return
    Promise.all([
      engine.adapter.listEntities({ isBuiltIn: false }, { offset: 0, limit: 500 }),
      getAllCustomSpreads(),
      getAllCustomDecks(),
      getAllCustomTraditions(),
    ]).then(([r, s, d, tr]) => {
      setEntities(r.items)
      setSpreads(s)
      setDecks(d)
      setTraditions(tr)
    }).finally(() => setLoading(false))
  }, [engine])

  useEffect(() => { loadAll() }, [loadAll])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const e of entities) for (const t of e.tags) set.add(t)
    return [...set].sort()
  }, [entities])

  const filteredEntities = useMemo(() => {
    let result = entities
    const q = query.trim().toLowerCase()
    if (q) {
      result = result.filter(e =>
        e.primaryDisplayName.toLowerCase().includes(q) ||
        e.canonicalName.toLowerCase().includes(q) ||
        (e.description?.toLowerCase().includes(q) ?? false) ||
        (e.userNotes?.toLowerCase().includes(q) ?? false) ||
        e.secondaryNames.some(n => n.name.toLowerCase().includes(q))
      )
    }
    if (tagFilters.length > 0) {
      result = result.filter(e => tagFilters.every(t => e.tags.includes(t)))
    }
    return result
  }, [entities, query, tagFilters])

  const entityTree = useMemo(() => buildEntityFolderTree(filteredEntities), [filteredEntities])

  const addTagFilter = (t: string) => { if (!tagFilters.includes(t)) setTagFilters(prev => [...prev, t]) }
  const removeTagFilter = (t: string) => setTagFilters(prev => prev.filter(x => x !== t))

  const toggleFolder = (path: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path); else next.add(path)
      return next
    })
  }

  const handleDownloadTemplate = async () => {
    setImportError(null)
    try {
      await exportImportTemplate()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to save template.')
    }
  }

  const handleExportAllEntities = async () => {
    setImportError(null)
    try {
      await exportEntitySet(entities, 'custom-entities')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to export entities.')
    }
  }

  const handleExportAllDecks = async () => {
    setImportError(null)
    try {
      await exportDeckRecords(decks, 'custom-decks')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to export decks.')
    }
  }

  const handleImportJson = async () => {
    if (!engine) return
    setImportError(null)
    setImportSummary(null)
    setImportBusy(true)
    try {
      const summary = await pickAndImportCustomEntities(engine)
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

  return (
    <div style={{ maxWidth: '720px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Custom</h1>
      </div>

      {/* Custom traditions section */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <GitBranch size={14} /> Traditions
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/custom/traditions' })}>
            <Plus size={12} /> Manage traditions
          </Button>
        </div>
        {loading ? null : traditions.length === 0 ? (
          <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px', color: 'var(--color-text-subtle)' }}>
            No custom traditions yet.{' '}
            <button onClick={() => navigate({ to: '/custom/traditions' })} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', padding: 0 }}>
              Create one →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {traditions.map(t => (
              <div
                key={t.id}
                onClick={() => navigate({ to: '/custom/traditions' })}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: '6px', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent-muted)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>{t.displayName}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginLeft: '10px' }}>
                    {t.relTypes.length} rel type{t.relTypes.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <Pencil size={12} style={{ color: 'var(--color-text-subtle)' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom decks section */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookOpen size={14} /> Decks
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {decks.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleExportAllDecks}>
                <Download size={12} /> Export all
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/read/decks', search: { edit: undefined } })}>
              <Plus size={12} /> Manage decks
            </Button>
          </div>
        </div>
        {loading ? null : decks.length === 0 ? (
          <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px', color: 'var(--color-text-subtle)' }}>
            No custom decks yet.{' '}
            <button onClick={() => navigate({ to: '/read/decks', search: { edit: undefined } })} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', padding: 0 }}>
              Create one →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {decks.map(d => (
              <div
                key={d.id}
                onClick={() => navigate({ to: '/read/decks', search: { edit: d.canonicalName } })}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: '6px', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent-muted)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>{d.displayName}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginLeft: '10px' }}>
                    {d.cardCanonicalNames.length} cards{d.reversalEnabled ? ' · Reversals' : ''}
                  </span>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); exportDeckRecord(d).catch(err => setImportError(err instanceof Error ? err.message : 'Failed to export deck.')) }}
                  title="Export as JSON"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', color: 'var(--color-text-subtle)', flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
                >
                  <Download size={14} />
                </button>
                <Pencil size={12} style={{ color: 'var(--color-text-subtle)' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom spreads section */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LayoutList size={14} /> Spreads
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/read/spreads' })}>
            <Plus size={12} /> Manage spreads
          </Button>
        </div>
        {loading ? null : spreads.length === 0 ? (
          <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px', color: 'var(--color-text-subtle)' }}>
            No custom spreads yet.{' '}
            <button onClick={() => navigate({ to: '/read/spreads' })} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', padding: 0 }}>
              Create one →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {spreads.map(s => (
              <div
                key={s.id}
                onClick={() => navigate({ to: '/read/spreads' })}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: '6px', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent-muted)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>{s.displayName}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginLeft: '10px' }}>
                    {s.positions.length === 0 ? 'Free form' : `${s.positions.length} positions`}
                  </span>
                </div>
                <Pencil size={12} style={{ color: 'var(--color-text-subtle)' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} /> Entities
        </h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {entities.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleExportAllEntities}>
              <Download size={12} /> Export all
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
            <Download size={12} /> Download template
          </Button>
          <Button variant="ghost" size="sm" onClick={handleImportJson} disabled={importBusy}>
            <Upload size={12} /> {importBusy ? 'Importing…' : 'Import JSON'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/custom/new' })}>
            <Plus size={12} /> New entity
          </Button>
        </div>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginBottom: '12px', maxWidth: '560px' }}>
        Build a batch of entities in an external file and import them all at once, instead of
        adding them one by one. Download the template to see the exact JSON format — importing a
        file whose canonical name matches an existing custom entity updates it in place rather
        than duplicating it. See the manual (Custom Content) for the full field reference.
      </div>

      {importError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '10px 14px', background: 'rgba(200,60,60,0.1)', border: '1px solid rgba(200,60,60,0.3)', borderRadius: '6px', fontSize: '13px', color: 'var(--color-danger, #e06060)' }}>
          <div style={{ flex: 1 }}>{importError}</div>
          <button onClick={() => setImportError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {importSummary && (
        <ImportSummaryPanel summary={importSummary} onDismiss={() => setImportSummary(null)} />
      )}

      {loading && (
        <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Loading…</div>
      )}

      {!loading && entities.length === 0 && (
        <div style={{ padding: '32px 24px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
            No custom entities yet.
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px' }}>
            Create your own entities — deities, herbs, crystals, oracle cards, or anything else you want to study or reference. They'll appear in search, reference, and study sessions.
          </div>
          <Button onClick={() => navigate({ to: '/custom/new' })}>
            <Plus size={14} /> Create First Entity
          </Button>
        </div>
      )}

      {entities.length > 0 && (
        <>
          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search name, description, notes…"
              style={{
                width: '100%', padding: '9px 12px 9px 36px', boxSizing: 'border-box',
                background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                borderRadius: '6px', color: 'var(--color-text)', fontSize: '13px', outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <TagInput chips={tagFilters} suggestions={allTags} onAdd={addTagFilter} onRemove={removeTagFilter} />
            {(tagFilters.length > 0 || query) && (
              <button
                onClick={() => { setTagFilters([]); setQuery('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', fontSize: '11px', padding: 0 }}
              >
                Clear
              </button>
            )}
          </div>

          {filteredEntities.length === 0 ? (
            <div style={{ padding: '20px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-subtle)' }}>
              No entities match your search.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[...entityTree.children.values()]
                .sort((a, b) => a.segment.localeCompare(b.segment))
                .map(child => (
                  <FolderView
                    key={child.path}
                    node={child}
                    depth={0}
                    collapsed={collapsedFolders}
                    onToggle={toggleFolder}
                    navigate={navigate}
                    onViewReference={cn => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })}
                    onExport={e => exportSingleEntity(e).catch(err => setImportError(err instanceof Error ? err.message : 'Failed to export entity.'))}
                  />
                ))}
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/custom/new' })} style={{ marginTop: '12px' }}>
            <Plus size={12} /> New entity
          </Button>
        </>
      )}
    </div>
  )
}

function FolderView({
  node, depth, collapsed, onToggle, navigate, onViewReference, onExport,
}: {
  node: EntityFolderNode
  depth: number
  collapsed: Set<string>
  onToggle: (path: string) => void
  navigate: ReturnType<typeof useNavigate>
  onViewReference: (canonicalName: string) => void
  onExport: (entity: BaseEntity) => void
}) {
  const isCollapsed = collapsed.has(node.path)
  const count = folderEntityCount(node)
  const children = [...node.children.values()].sort((a, b) => a.segment.localeCompare(b.segment))
  const sortedEntities = [...node.entities].sort((a, b) => a.primaryDisplayName.localeCompare(b.primaryDisplayName))

  return (
    <div>
      <button
        onClick={() => onToggle(node.path)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
          padding: '8px 10px', paddingLeft: `${10 + depth * 18}px`,
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
          borderRadius: '6px',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-2)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
      >
        {isCollapsed ? <ChevronRight size={13} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} /> : <ChevronDown size={13} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />}
        {isCollapsed ? <Folder size={14} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} /> : <FolderOpen size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />}
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>{formatEntityType(node.segment)}</span>
        <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>{count}</span>
      </button>

      {!isCollapsed && (
        <div>
          {children.map(child => (
            <FolderView
              key={child.path}
              node={child}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
              navigate={navigate}
              onViewReference={onViewReference}
              onExport={onExport}
            />
          ))}
          {sortedEntities.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: `${10 + (depth + 1) * 18}px`, marginBottom: '4px' }}>
              {sortedEntities.map(e => (
                <EntityRow
                  key={e.id}
                  entity={e}
                  onClick={() => navigate({ to: '/custom/$cn', params: { cn: e.canonicalName } })}
                  onViewReference={() => onViewReference(e.canonicalName)}
                  onExport={() => onExport(e)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EntityRow({ entity, onClick, onViewReference, onExport }: { entity: BaseEntity; onClick: () => void; onViewReference: () => void; onExport: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 16px', background: 'var(--color-surface-2)',
        borderRadius: '6px', border: '1px solid var(--color-border)',
        cursor: 'pointer', transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent-muted)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '2px' }}>
          <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>
            {entity.primaryDisplayName}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', flexShrink: 0 }}>
            {formatEntityType(entity.entityType)}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', fontFamily: 'monospace' }}>
          {entity.canonicalName}
        </div>
        {entity.description && (
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {entity.description.slice(0, 120)}{entity.description.length > 120 ? '…' : ''}
          </div>
        )}
      </div>
      <button
        onClick={e => { e.stopPropagation(); onViewReference() }}
        title="View in Reference"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
          display: 'flex', color: 'var(--color-text-subtle)', flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
      >
        <BookOpen size={14} />
      </button>
      <button
        onClick={e => { e.stopPropagation(); onExport() }}
        title="Export as JSON"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
          display: 'flex', color: 'var(--color-text-subtle)', flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
      >
        <Download size={14} />
      </button>
      <Pencil size={14} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
    </div>
  )
}

// ─── Import results ─────────────────────────────────────────────────────────

function ImportSummaryPanel({ summary, onDismiss }: { summary: ImportSummary; onDismiss: () => void }) {
  const created = summary.entities.filter(e => e.status === 'created').length
  const updated = summary.entities.filter(e => e.status === 'updated').length
  const skipped = summary.entities.filter(e => e.status === 'skipped')
  const linksCreated = summary.links.filter(l => l.status === 'created').length
  const linksSkipped = summary.links.filter(l => l.status === 'skipped')

  return (
    <div style={{ marginBottom: '16px', padding: '14px 16px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>Import complete</div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex', padding: 0 }}>
          <X size={14} />
        </button>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: skipped.length + linksSkipped.length > 0 ? '10px' : 0 }}>
        {created} entit{created === 1 ? 'y' : 'ies'} created, {updated} updated, {skipped.length} skipped
        {summary.links.length > 0 && <>, {linksCreated} link{linksCreated === 1 ? '' : 's'} created</>}
        {linksSkipped.length > 0 && <>, {linksSkipped.length} link{linksSkipped.length === 1 ? '' : 's'} skipped</>}
      </div>
      {(skipped.length > 0 || linksSkipped.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {skipped.map((s, i) => (
            <div key={`e${i}`} style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>
              <code style={{ color: 'var(--color-text-muted)' }}>{s.canonicalName}</code> — {s.message}
            </div>
          ))}
          {linksSkipped.map((l, i) => (
            <div key={`l${i}`} style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>
              <code style={{ color: 'var(--color-text-muted)' }}>{l.source} → {l.target}</code> — {l.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
