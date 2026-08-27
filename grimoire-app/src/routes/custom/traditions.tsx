import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Plus, Trash2, Save, Pencil, Search, X, ChevronUp, ChevronDown, Download, Upload } from 'lucide-react'
import {
  pickAndImportCustomTraditions, exportTraditionImportTemplate,
  exportCustomTraditions, exportCustomTradition, type ImportTraditionSummary,
} from '@/lib/tradition-import'
import { Button } from '@/components/ui/Button'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity } from '@grimoire/core'

// Well-known built-in link labels (grimoire-core's `LinkLabel` is just `type LinkLabel = string` —
// no exported constants object — so the list is kept inline here).
const WELL_KNOWN_LABELS = new Set([
  'corresponds-to', 'opposes', 'complements', 'precedes', 'follows',
  'part-of', 'contains', 'connects', 'has-shadow',
  'attributed-planet', 'attributed-sign', 'attributed-element', 'attributed-path',
  'attributed-sephira', 'attributed-letter', 'attributed-number', 'attributed-rune',
  'attributed-chakra', 'attributed-demon', 'attributed-color', 'attributed-angel',
  'attributed-divine-name', 'governs', 'ranked-as', 'drawn-in', 'documented-in',
])
import {
  getAllCustomTraditions,
  saveCustomTradition,
  deleteCustomTraditionByCN,
  getCustomSecondaryNamesForTradition,
  saveCustomSecondaryName,
  deleteCustomSecondaryName,
  getCustomLinksForTradition,
  saveCustomLink,
  deleteCustomLink,
  type CustomTraditionRecord,
  type CustomRelType,
  type CustomSecondaryNameRecord,
  type CustomLinkRecord,
} from '@/lib/custom-db'

export const Route = createFileRoute('/custom/traditions')({
  component: TraditionsPage,
})

// ─── helpers ──────────────────────────────────────────────────────────────────

function newId() { return crypto.randomUUID() }

function slugifyTradition(name: string): string {
  return 'tradition.' + name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function shortId(cn: string) {
  return cn.replace(/^tradition\./, '')
}

// ─── Entity search input ───────────────────────────────────────────────────────

function EntitySearchInput({
  value, onChange, placeholder,
}: { value: BaseEntity | null; onChange: (e: BaseEntity | null) => void; placeholder?: string }) {
  const { engine } = useEngineStore()
  const [query, setQuery]     = useState(value?.primaryDisplayName ?? '')
  const [results, setResults] = useState<BaseEntity[]>([])
  const [open, setOpen]       = useState(false)

  useEffect(() => {
    if (value) setQuery(value.primaryDisplayName)
  }, [value])

  const search = async (q: string) => {
    setQuery(q)
    onChange(null)
    if (!engine || q.trim().length < 2) { setResults([]); setOpen(false); return }
    const r = await engine.adapter.searchEntities(q.trim(), undefined, { offset: 0, limit: 10 })
    setResults(r.items.map(i => i.entity))
    setOpen(true)
  }

  const select = (e: BaseEntity) => {
    setQuery(e.primaryDisplayName)
    setResults([])
    setOpen(false)
    onChange(e)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px',
    background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
    borderRadius: '4px', color: 'var(--color-text)', fontSize: '13px',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={11} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)', pointerEvents: 'none' }} />
        <input
          value={query}
          onChange={e => search(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder ?? 'Search entities…'}
          style={{ ...inputStyle, paddingLeft: '26px' }}
        />
        {query && <button onClick={() => { setQuery(''); onChange(null); setResults([]); setOpen(false) }} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text-subtle)' }}><X size={11} /></button>}
      </div>
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '4px', maxHeight: '180px', overflowY: 'auto' }}>
          {results.map(e => (
            <div key={e.id} onMouseDown={() => select(e)} style={{ padding: '7px 10px', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}
              onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--color-surface-3)')}
              onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
            >
              {e.primaryDisplayName}
              <span style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--color-text-subtle)' }}>{e.entityType}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Relationship type row ─────────────────────────────────────────────────────

function RelTypeRow({ rt, index, total, onChange, onDelete, onMove }: {
  rt: CustomRelType; index: number; total: number
  onChange: (r: CustomRelType) => void; onDelete: () => void; onMove: (d: -1 | 1) => void
}) {
  const f: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
    borderRadius: '4px', color: 'var(--color-text)', fontSize: '12px',
    padding: '5px 8px', outline: 'none', fontFamily: 'inherit',
  }
  const isWellKnown = rt.linkLabel.length > 0 && WELL_KNOWN_LABELS.has(rt.linkLabel)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '8px 10px', background: 'var(--color-surface-2)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 1fr', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)', textAlign: 'center' }}>{index + 1}</span>
        <input value={rt.linkLabel} onChange={e => onChange({ ...rt, linkLabel: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })} placeholder="link-label" style={{ ...f, borderColor: isWellKnown ? 'var(--color-warning, #b8860b)' : undefined }} />
        <input value={rt.displayName} onChange={e => onChange({ ...rt, displayName: e.target.value })} placeholder="Display Name" style={f} />
      </div>
      {isWellKnown && (
        <div style={{ paddingLeft: '26px', fontSize: '11px', color: 'var(--color-warning, #b8860b)' }}>
          "{rt.linkLabel}" is a built-in label — links with this label will be grouped with existing built-in attributions when displayed. Use a unique label if you want this to be distinct.
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingLeft: '26px', flexWrap: 'wrap' }}>
        <input value={rt.targetEntityType} onChange={e => onChange({ ...rt, targetEntityType: e.target.value })} placeholder="Target entity type (optional)" style={{ ...f, flex: '1 1 120px', minWidth: 0 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--color-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={rt.allowMultiple} onChange={e => onChange({ ...rt, allowMultiple: e.target.checked })} style={{ accentColor: 'var(--color-accent)' }} />
          Allow multiple
        </label>
        <div style={{ display: 'flex', gap: '2px', marginLeft: 'auto' }}>
          <button onClick={() => onMove(-1)} disabled={index === 0} style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', padding: '3px', color: index === 0 ? 'var(--color-text-subtle)' : 'var(--color-text-muted)' }}><ChevronUp size={13} /></button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} style={{ background: 'none', border: 'none', cursor: index === total - 1 ? 'default' : 'pointer', padding: '3px', color: index === total - 1 ? 'var(--color-text-subtle)' : 'var(--color-text-muted)' }}><ChevronDown size={13} /></button>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: 'var(--color-danger)' }}><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  )
}

// ─── Tradition editor (metadata + rel types) ──────────────────────────────────

function TraditionEditor({ initial, onSave, onCancel }: {
  initial: CustomTraditionRecord | null
  onSave: (r: CustomTraditionRecord) => void
  onCancel: () => void
}) {
  const [name, setName]         = useState(initial?.displayName ?? '')
  const [cn, setCn]             = useState(initial?.canonicalName ?? '')
  const [cnTouched, setCnTouched] = useState(!!initial)
  const [desc, setDesc]         = useState(initial?.description ?? '')
  const [relTypes, setRelTypes] = useState<CustomRelType[]>(initial?.relTypes ?? [])
  const [error, setError]       = useState('')

  const handleNameChange = (v: string) => {
    setName(v)
    if (!cnTouched) setCn(slugifyTradition(v))
  }

  const updateRt = (i: number, rt: CustomRelType) => setRelTypes(ps => ps.map((x, j) => j === i ? rt : x))
  const deleteRt = (i: number) => setRelTypes(ps => ps.filter((_, j) => j !== i))
  const moveRt = (i: number, dir: -1 | 1) => setRelTypes(ps => {
    const copy = [...ps]; const swap = i + dir
    if (swap < 0 || swap >= copy.length) return ps
    ;[copy[i], copy[swap]] = [copy[swap], copy[i]]; return copy
  })

  const handleSave = () => {
    if (!name.trim()) { setError('Name is required.'); return }
    if (!cn.trim()) { setError('Canonical name is required.'); return }
    if (!/^tradition\.[a-z0-9-]+$/.test(cn)) { setError('CN must be "tradition." followed by lowercase letters, numbers, hyphens.'); return }
    for (const rt of relTypes) {
      if (!rt.linkLabel.trim() || !rt.displayName.trim()) { setError('All relationship types need a label and display name.'); return }
    }
    const labels = relTypes.map(rt => rt.linkLabel)
    const dupe = labels.find((l, i) => labels.indexOf(l) !== i)
    if (dupe) { setError(`Duplicate link label "${dupe}" — each relationship type must have a unique label.`); return }
    const now = new Date().toISOString()
    onSave({ id: initial?.id ?? newId(), canonicalName: cn, displayName: name.trim(), description: desc.trim(), relTypes, createdAt: initial?.createdAt ?? now, updatedAt: now })
  }

  const inp: React.CSSProperties = { width: '100%', padding: '8px 11px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }

  return (
    <div style={{ border: '1px solid var(--color-accent-muted)', borderRadius: '8px', padding: '20px', background: 'var(--color-surface-2)' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 400 }}>{initial ? 'Edit Tradition' : 'New Tradition'}</h3>
      {error && <div style={{ fontSize: '12px', color: 'var(--color-danger)', marginBottom: '10px' }}>{error}</div>}

      <label style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Name</label>
      <input value={name} onChange={e => { handleNameChange(e.target.value); setError('') }} placeholder="e.g. My Solar Attributions" autoFocus style={{ ...inp, marginBottom: '10px' }} />

      <label style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Canonical Name</label>
      <input value={cn} onChange={e => { setCn(e.target.value); setCnTouched(true); setError('') }} disabled={!!initial} placeholder="tradition.my-tradition" style={{ ...inp, marginBottom: '10px', opacity: initial ? 0.6 : 1 }} />

      <label style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Description</label>
      <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief description…" style={{ ...inp, marginBottom: '20px' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ fontSize: '10px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Relationship Types ({relTypes.length})</label>
        <button onClick={() => setRelTypes(ps => [...ps, { linkLabel: '', displayName: '', targetEntityType: '', allowMultiple: false }])} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit', padding: 0 }}>
          <Plus size={12} /> Add
        </button>
      </div>
      {relTypes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 1fr', gap: '6px', padding: '0 10px' }}>
            {['#', 'Link Label (ID)', 'Display Name'].map(h => <span key={h} style={{ fontSize: '9px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>)}
          </div>
          {relTypes.map((rt, i) => <RelTypeRow key={i} rt={rt} index={i} total={relTypes.length} onChange={r => updateRt(i, r)} onDelete={() => deleteRt(i)} onMove={d => moveRt(i, d)} />)}
          <button
            onClick={() => setRelTypes(ps => [...ps, { linkLabel: '', displayName: '', targetEntityType: '', allowMultiple: false }])}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              padding: '8px', marginTop: '2px', width: '100%',
              background: 'none', border: '1px dashed var(--color-border)', borderRadius: '6px',
              cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-subtle)', fontFamily: 'inherit',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)'; e.currentTarget.style.color = 'var(--color-accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-subtle)' }}
          >
            <Plus size={12} /> Add
          </button>
        </div>
      )}
      {relTypes.length === 0 && <p style={{ fontSize: '12px', color: 'var(--color-text-subtle)', margin: '0 0 16px' }}>No relationship types yet. Add some to scope relationships to this tradition.</p>}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSave}><Save size={13} /> Save Tradition</Button>
      </div>
    </div>
  )
}

// ─── Display names section ─────────────────────────────────────────────────────

function DisplayNamesSection({ tradition }: { tradition: CustomTraditionRecord }) {
  const { engine } = useEngineStore()
  const [names, setNames]       = useState<CustomSecondaryNameRecord[]>([])
  const [entity, setEntity]     = useState<BaseEntity | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [error, setError]       = useState('')
  const [entityNames, setEntityNames] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    getCustomSecondaryNamesForTradition(tradition.canonicalName).then(setNames)
  }, [tradition.canonicalName])

  useEffect(() => {
    if (names.length === 0 || !engine) return
    const cns = [...new Set(names.map(n => n.entityCn))]
    Promise.all(cns.map(cn => engine.adapter.getEntityByCanonicalName(cn))).then(entities => {
      const map = new Map<string, string>()
      entities.forEach((e, i) => { if (e) map.set(cns[i], e.primaryDisplayName) })
      setEntityNames(map)
    })
  }, [names, engine])

  const handleAdd = async () => {
    if (!entity) { setError('Select an entity.'); return }
    if (!nameInput.trim()) { setError('Enter a name.'); return }
    const record: CustomSecondaryNameRecord = {
      id: newId(), entityCn: entity.canonicalName, traditionCn: tradition.canonicalName,
      name: nameInput.trim(), languageTag: shortId(tradition.canonicalName),
      visible: true, sortOrder: 0, createdAt: new Date().toISOString(),
    }
    await saveCustomSecondaryName(record)
    if (engine) {
      try { await engine.adapter.addSecondaryName(entity.id, { name: record.name, languageTag: record.languageTag, visible: true, sortOrder: 0 }) } catch { /* ok */ }
    }
    setNames(prev => [...prev, record])
    setEntity(null); setNameInput(''); setError('')
  }

  const handleDelete = async (record: CustomSecondaryNameRecord) => {
    await deleteCustomSecondaryName(record.id)
    if (engine) {
      const e = await engine.adapter.getEntityByCanonicalName(record.entityCn)
      if (e) {
        const match = e.secondaryNames.find(n => n.name === record.name && n.languageTag === record.languageTag)
        if (match) await engine.adapter.deleteSecondaryName(match.id).catch(() => {})
      }
    }
    setNames(prev => prev.filter(n => n.id !== record.id))
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px' }}>
          <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Entity</div>
          <EntitySearchInput value={entity} onChange={setEntity} placeholder="Search for entity…" />
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Name in this tradition</div>
          <input value={nameInput} onChange={e => { setNameInput(e.target.value); setError('') }} placeholder={`e.g. "Sol"`} onKeyDown={e => e.key === 'Enter' && handleAdd()} style={{ width: '100%', padding: '7px 10px', background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
        <Button variant="primary" size="sm" onClick={handleAdd}><Plus size={12} /> Add</Button>
      </div>
      {error && <div style={{ fontSize: '11px', color: 'var(--color-danger)', marginBottom: '8px' }}>{error}</div>}
      <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', marginBottom: '6px' }}>Language tag: <code style={{ background: 'var(--color-surface-3)', padding: '1px 5px', borderRadius: '3px' }}>{shortId(tradition.canonicalName)}</code></div>
      {names.length === 0 ? (
        <p style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>No display names yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {names.map(n => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', background: 'var(--color-surface-2)', borderRadius: '5px', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', flex: '0 0 auto' }}>{entityNames.get(n.entityCn) ?? n.entityCn}</span>
              <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)' }}>→</span>
              <span style={{ fontSize: '12px', color: 'var(--color-text)', flex: 1 }}>{n.name}</span>
              <button onClick={() => handleDelete(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--color-danger)' }}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Relationships section ─────────────────────────────────────────────────────

function RelationshipsSection({ tradition }: { tradition: CustomTraditionRecord }) {
  const { engine } = useEngineStore()
  const [links, setLinks]   = useState<CustomLinkRecord[]>([])
  const [entityA, setEntityA] = useState<BaseEntity | null>(null)
  const [entityB, setEntityB] = useState<BaseEntity | null>(null)
  const [relType, setRelType] = useState(tradition.relTypes[0]?.linkLabel ?? '')
  const [note, setNote]     = useState('')
  const [bidir, setBidir]   = useState(false)
  const [error, setError]   = useState('')
  const [entityNames, setEntityNames] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    getCustomLinksForTradition(tradition.canonicalName).then(setLinks)
  }, [tradition.canonicalName])

  useEffect(() => {
    if (links.length === 0 || !engine) return
    const cns = [...new Set(links.flatMap(l => [l.sourceCn, l.targetCn]))]
    Promise.all(cns.map(cn => engine.adapter.getEntityByCanonicalName(cn))).then(entities => {
      const map = new Map<string, string>()
      entities.forEach((e, i) => { if (e) map.set(cns[i], e.primaryDisplayName) })
      setEntityNames(map)
    })
  }, [links, engine])

  const effectiveRelType = relType || (tradition.relTypes[0]?.linkLabel ?? '')
  const relTypeLabel = tradition.relTypes.find(r => r.linkLabel === effectiveRelType)?.displayName ?? effectiveRelType

  const handleAdd = async () => {
    if (!entityA) { setError('Select Entity A.'); return }
    if (!entityB) { setError('Select Entity B.'); return }
    if (!effectiveRelType) { setError('No relationship types defined — add some in the editor.'); return }
    const record: CustomLinkRecord = {
      id: newId(), sourceCn: entityA.canonicalName, targetCn: entityB.canonicalName,
      label: effectiveRelType, traditionScope: [tradition.canonicalName],
      bidirectional: bidir, note: note.trim(), createdAt: new Date().toISOString(),
    }
    await saveCustomLink(record)
    if (engine) {
      try { await engine.adapter.createLink({ sourceCanonicalName: record.sourceCn, targetCanonicalName: record.targetCn, label: record.label, bidirectional: record.bidirectional, traditionScope: record.traditionScope, isBuiltIn: false, note: record.note || undefined, extendedData: {} }) } catch { /* ok */ }
    }
    setLinks(prev => [...prev, record])
    setEntityNames(prev => {
      const m = new Map(prev)
      m.set(entityA.canonicalName, entityA.primaryDisplayName)
      m.set(entityB.canonicalName, entityB.primaryDisplayName)
      return m
    })
    setEntityA(null); setEntityB(null); setNote(''); setError('')
  }

  const handleDelete = async (id: string) => {
    await deleteCustomLink(id)
    if (engine) { const link = links.find(l => l.id === id); if (link) { const l = await engine.adapter.queryLinks({ sourceCanonicalName: link.sourceCn, labels: [link.label] }); if (l.items[0]) await engine.adapter.deleteLink(l.items[0].id).catch(() => {}) } }
    setLinks(prev => prev.filter(l => l.id !== id))
  }

  const inp: React.CSSProperties = { width: '100%', padding: '7px 10px', background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

  return (
    <div>
      {tradition.relTypes.length === 0 ? (
        <p style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>Define relationship types first (in the editor above).</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
            <EntitySearchInput value={entityA} onChange={setEntityA} placeholder="Entity A…" />
            <select value={effectiveRelType} onChange={e => setRelType(e.target.value)} style={{ ...inp, cursor: 'pointer', colorScheme: 'dark', width: 'auto' }}>
              {tradition.relTypes.map(rt => <option key={rt.linkLabel} value={rt.linkLabel}>{rt.displayName}</option>)}
            </select>
            <EntitySearchInput value={entityB} onChange={setEntityB} placeholder="Entity B…" />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" style={{ ...inp, flex: '1 1 160px' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--color-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={bidir} onChange={e => setBidir(e.target.checked)} style={{ accentColor: 'var(--color-accent)' }} />
              Bidirectional
            </label>
            <Button variant="primary" size="sm" onClick={handleAdd}><Plus size={12} /> Add</Button>
          </div>
        </>
      )}
      {error && <div style={{ fontSize: '11px', color: 'var(--color-danger)', marginBottom: '8px' }}>{error}</div>}
      {links.length === 0 ? (
        <p style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>No relationships yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {links.map(l => {
            const rtLabel = tradition.relTypes.find(r => r.linkLabel === l.label)?.displayName ?? l.label
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: 'var(--color-surface-2)', borderRadius: '5px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text)', flex: '0 0 auto' }}>{entityNames.get(l.sourceCn) ?? l.sourceCn}</span>
                <span style={{ fontSize: '10px', color: 'var(--color-accent)', background: 'var(--color-surface-3)', padding: '1px 6px', borderRadius: '3px', flexShrink: 0 }}>{rtLabel}{l.bidirectional ? ' ↔' : ' →'}</span>
                <span style={{ fontSize: '12px', color: 'var(--color-text)', flex: '0 0 auto' }}>{entityNames.get(l.targetCn) ?? l.targetCn}</span>
                {l.note && <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.note}</span>}
                <button onClick={() => handleDelete(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--color-danger)', flexShrink: 0 }}><Trash2 size={12} /></button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Tradition detail view ────────────────────────────────────────────────────

function TraditionDetailView({ tradition, onBack, onEdit }: {
  tradition: CustomTraditionRecord
  onBack: () => void
  onEdit: () => void
}) {
  const sectionStyle: React.CSSProperties = { marginBottom: '24px', padding: '16px 20px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }
  const sectionTitle: React.CSSProperties = { fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'inherit', padding: 0 }}>
          <ArrowLeft size={13} /> All Traditions
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 400, color: 'var(--color-text)' }}>{tradition.displayName}</div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', fontFamily: 'monospace' }}>{tradition.canonicalName}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit}><Pencil size={12} /> Edit</Button>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitle}>Display Names</div>
        <p style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginBottom: '12px' }}>
          Assign this tradition's name for an existing entity. When this tradition is set as primary for its system, these names appear throughout the app.
        </p>
        <DisplayNamesSection tradition={tradition} />
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitle}>Relationships</div>
        <p style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginBottom: '12px' }}>
          Create relationships between entities scoped to this tradition. They appear when this tradition is active.
        </p>
        <RelationshipsSection tradition={tradition} />
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type PageView = 'list' | 'editor' | 'detail'

function TraditionsPage() {
  const { engine }                          = useEngineStore()
  const [traditions, setTraditions]         = useState<CustomTraditionRecord[]>([])
  const [loading, setLoading]               = useState(true)
  const [view, setView]                     = useState<PageView>('list')
  const [editingRecord, setEditingRecord]   = useState<CustomTraditionRecord | null>(null)
  const [detailRecord, setDetailRecord]     = useState<CustomTraditionRecord | null>(null)

  useEffect(() => {
    getAllCustomTraditions().then(setTraditions).finally(() => setLoading(false))
  }, [])

  const handleSave = async (record: CustomTraditionRecord) => {
    await saveCustomTradition(record)
    if (engine) {
      try {
        await engine.adapter.createTradition({
          canonicalName: record.canonicalName, displayName: record.displayName,
          description: record.description || undefined, isBuiltIn: false,
          attributionFields: record.relTypes.map((rt, i) => ({ linkLabel: rt.linkLabel, displayName: rt.displayName, targetEntityType: rt.targetEntityType || undefined, allowMultiple: rt.allowMultiple, sortOrder: i })),
        })
      } catch {
        // Update if already exists
        const existing = await engine.adapter.getTraditionByCanonicalName(record.canonicalName)
        if (existing) await engine.adapter.updateTradition(existing.id, { displayName: record.displayName, description: record.description || undefined }).catch(() => {})
      }
    }
    setTraditions(prev => { const idx = prev.findIndex(t => t.id === record.id); return idx >= 0 ? prev.map(t => t.id === record.id ? record : t) : [...prev, record] })
    setView('list'); setEditingRecord(null)
  }

  const handleDelete = async (cn: string) => {
    if (!window.confirm('Delete this tradition and all its display names and relationships?')) return
    await deleteCustomTraditionByCN(cn)
    if (engine) {
      const t = await engine.adapter.getTraditionByCanonicalName(cn)
      if (t) await engine.adapter.deleteTradition(t.id).catch(() => {})
    }
    setTraditions(prev => prev.filter(t => t.canonicalName !== cn))
  }

  const openEditor = (record: CustomTraditionRecord | null) => { setEditingRecord(record); setView('editor') }
  const openDetail = (record: CustomTraditionRecord) => { setDetailRecord(record); setView('detail') }

  const [importBusy,    setImportBusy]    = useState(false)
  const [importError,   setImportError]   = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<ImportTraditionSummary | null>(null)

  const handleDownloadTemplate = async () => {
    setImportError(null)
    try {
      await exportTraditionImportTemplate()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to save template.')
    }
  }

  const handleImportJson = async () => {
    if (!engine) return
    setImportError(null)
    setImportSummary(null)
    setImportBusy(true)
    try {
      const summary = await pickAndImportCustomTraditions(engine)
      if (summary) {
        setImportSummary(summary)
        getAllCustomTraditions().then(setTraditions)
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import file.')
    } finally {
      setImportBusy(false)
    }
  }

  const handleExportAll = async () => {
    setImportError(null)
    try {
      await exportCustomTraditions(traditions, 'custom-traditions')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to export traditions.')
    }
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      {view !== 'detail' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 300, margin: 0 }}>Custom Traditions</h1>
          {view === 'list' && (
            <Button variant="primary" size="sm" style={{ marginLeft: 'auto' }} onClick={() => openEditor(null)}>
              <Plus size={13} /> New Tradition
            </Button>
          )}
        </div>
      )}

      {view === 'editor' && (
        <TraditionEditor
          initial={editingRecord}
          onSave={handleSave}
          onCancel={() => { setView('list'); setEditingRecord(null) }}
        />
      )}

      {view === 'detail' && detailRecord && (
        <TraditionDetailView
          tradition={detailRecord}
          onBack={() => { setView('list'); setDetailRecord(null) }}
          onEdit={() => { setEditingRecord(detailRecord); setView('editor') }}
        />
      )}

      {view === 'list' && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {traditions.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleExportAll}>
              <Download size={12} /> Export all
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
            <Download size={12} /> Download template
          </Button>
          <Button variant="ghost" size="sm" onClick={handleImportJson} disabled={importBusy}>
            <Upload size={12} /> {importBusy ? 'Importing…' : 'Import JSON'}
          </Button>
        </div>
      )}

      {view === 'list' && importError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '10px 14px', background: 'rgba(200,60,60,0.1)', border: '1px solid rgba(200,60,60,0.3)', borderRadius: '6px', fontSize: '13px', color: 'var(--color-danger, #e06060)' }}>
          <div style={{ flex: 1 }}>{importError}</div>
          <button onClick={() => setImportError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {view === 'list' && importSummary && (
        <TraditionImportSummaryPanel summary={importSummary} onDismiss={() => setImportSummary(null)} />
      )}

      {view === 'list' && (
        loading ? (
          <p style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Loading…</p>
        ) : traditions.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '0 0 12px' }}>No custom traditions yet.</p>
            <Button variant="primary" size="sm" onClick={() => openEditor(null)}><Plus size={13} /> Create your first tradition</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {traditions.map(t => (
              <div key={t.id} style={{ padding: '14px 16px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '2px' }}>{t.displayName}</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', fontFamily: 'monospace', marginBottom: '3px' }}>{t.canonicalName}</div>
                  {t.description && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{t.description}</div>}
                  <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>
                    {t.relTypes.length} relationship type{t.relTypes.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <Button variant="ghost" size="sm" onClick={() => openDetail(t)}>Open</Button>
                  <Button variant="ghost" size="sm" onClick={() => exportCustomTradition(t).catch(err => setImportError(err instanceof Error ? err.message : 'Failed to export tradition.'))} title="Export as JSON">
                    <Download size={12} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEditor(t)}><Pencil size={12} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(t.canonicalName)}><Trash2 size={12} style={{ color: 'var(--color-danger)' }} /></Button>
                </div>
              </div>
            ))}
            <Button variant="primary" size="sm" onClick={() => openEditor(null)} style={{ alignSelf: 'flex-start' }}>
              <Plus size={13} /> New Tradition
            </Button>
          </div>
        )
      )}
    </div>
  )
}

// ─── Import results ─────────────────────────────────────────────────────────

function TraditionImportSummaryPanel({ summary, onDismiss }: { summary: ImportTraditionSummary; onDismiss: () => void }) {
  const created = summary.traditions.filter(t => t.status === 'created').length
  const updated = summary.traditions.filter(t => t.status === 'updated').length
  const skipped = summary.traditions.filter(t => t.status === 'skipped')

  return (
    <div style={{ marginBottom: '16px', padding: '14px 16px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>Import complete</div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex', padding: 0 }}>
          <X size={14} />
        </button>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: skipped.length > 0 ? '10px' : 0 }}>
        {created} tradition{created === 1 ? '' : 's'} created, {updated} updated, {skipped.length} skipped
      </div>
      {skipped.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {skipped.map((s, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>
              <code style={{ color: 'var(--color-text-muted)' }}>{s.canonicalName}</code> — {s.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
