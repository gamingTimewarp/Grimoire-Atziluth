import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity } from '@grimoire/core'
import {
  saveCustomEntity, deleteCustomEntityByCN,
  getCustomLinksForEntity, saveCustomLink, deleteCustomLink,
} from '@/lib/custom-db'
import type { CustomLinkRecord } from '@/lib/custom-db'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Plus, X, Trash2 } from 'lucide-react'
import { formatEntityType } from '@/lib/format'

export const Route = createFileRoute('/custom/$cn')({
  component: EditCustomEntityPage,
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newId(): string { return crypto.randomUUID() }

// ─── Main component ───────────────────────────────────────────────────────────

function EditCustomEntityPage() {
  const { cn }       = Route.useParams()
  const navigate     = useNavigate()
  const { engine }   = useEngineStore()

  const [entity,      setEntity]     = useState<BaseEntity | null>(null)
  const [loading,     setLoading]    = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [userNotes,   setUserNotes]  = useState('')
  const [tagInput,    setTagInput]   = useState('')
  const [tags,        setTags]       = useState<string[]>([])
  const [extraData,   setExtraData]  = useState<{ key: string; value: string }[]>([])
  const [links,       setLinks]      = useState<CustomLinkRecord[]>([])
  const [saved,       setSaved]      = useState(false)
  const [saving,      setSaving]     = useState(false)
  const [error,       setError]      = useState<string | null>(null)
  const [confirmDel,  setConfirmDel] = useState(false)

  // Link form state
  const [linkTarget, setLinkTarget] = useState('')
  const [linkLabel,  setLinkLabel]  = useState('')
  const [linkBidi,   setLinkBidi]   = useState(false)
  const [linkErr,    setLinkErr]    = useState<string | null>(null)

  const loadEntity = useCallback(async () => {
    if (!engine) return
    const e = await engine.adapter.getEntityByCanonicalName(cn)
    if (!e || e.isBuiltIn) { navigate({ to: '/custom' }); return }
    setEntity(e)
    setDisplayName(e.primaryDisplayName)
    setDescription(e.description ?? '')
    setUserNotes(e.userNotes ?? '')
    setTags([...e.tags])
    setExtraData(
      Object.entries(e.extendedData).map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      })),
    )
    const savedLinks = await getCustomLinksForEntity(cn)
    setLinks(savedLinks)
    setLoading(false)
  }, [engine, cn, navigate])

  useEffect(() => { loadEntity() }, [loadEntity])

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) { setTags(prev => [...prev, t]); setTagInput('') }
  }

  const addExtraRow = () => setExtraData(prev => [...prev, { key: '', value: '' }])
  const updateExtraRow = (i: number, field: 'key' | 'value', val: string) =>
    setExtraData(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  const removeExtraRow = (i: number) => setExtraData(prev => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    if (!engine || !entity) return
    setSaving(true); setError(null)

    const extendedData: Record<string, unknown> = {}
    for (const row of extraData) {
      const k = row.key.trim()
      if (k) extendedData[k] = row.value
    }

    const now = new Date().toISOString()
    try {
      await saveCustomEntity({
        id: entity.id,
        canonicalName: cn,
        entityType: entity.entityType,
        displayName: displayName.trim() || entity.primaryDisplayName,
        description, userNotes, tags, extendedData,
        createdAt: entity.createdAt,
        updatedAt: now,
      })
      await engine.adapter.updateEntity(entity.id, {
        primaryDisplayName: displayName.trim() || entity.primaryDisplayName,
        description: description || undefined,
        userNotes:   userNotes   || undefined,
        tags, extendedData,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!engine || !entity) return
    await deleteCustomEntityByCN(cn)
    await engine.adapter.deleteEntity(entity.id)
    navigate({ to: '/custom' })
  }

  const handleAddLink = async () => {
    if (!engine) return
    const targetCn = linkTarget.trim()
    const label    = linkLabel.trim()
    if (!targetCn) { setLinkErr('Target canonical name is required.'); return }
    if (!label)    { setLinkErr('Link label is required.'); return }

    const target = await engine.adapter.getEntityByCanonicalName(targetCn)
    if (!target) { setLinkErr(`Entity "${targetCn}" not found.`); return }

    const now  = new Date().toISOString()
    const link: CustomLinkRecord = {
      id: newId(), sourceCn: cn, targetCn,
      label, traditionScope: [], bidirectional: linkBidi, note: '', createdAt: now,
    }

    try {
      await saveCustomLink(link)
      await engine.adapter.createLink({
        sourceCanonicalName: cn, targetCanonicalName: targetCn,
        label, bidirectional: linkBidi,
        traditionScope: [], isBuiltIn: false, extendedData: {},
      })
      setLinks(prev => [...prev, link])
      setLinkTarget(''); setLinkLabel(''); setLinkBidi(false); setLinkErr(null)
    } catch (err) {
      setLinkErr(err instanceof Error ? err.message : 'Failed to add link.')
    }
  }

  const handleDeleteLink = async (link: CustomLinkRecord) => {
    if (!engine) return
    await deleteCustomLink(link.id)
    // Remove from in-memory adapter: find the link by querying it
    const adapterLinks = await engine.adapter.queryLinks({
      sourceCanonicalName: link.sourceCn,
    })
    const found = adapterLinks.items.find(l =>
      l.targetCanonicalName === link.targetCn &&
      l.label === link.label &&
      !l.isBuiltIn,
    )
    if (found) await engine.adapter.deleteLink(found.id)
    setLinks(prev => prev.filter(l => l.id !== link.id))
  }

  if (loading) {
    return <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Loading…</div>
  }

  if (!entity) return null

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/custom' })}>
          <ArrowLeft size={13} /> Custom
        </Button>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Edit Entity</h1>
        {saved && <span style={{ fontSize: '12px', color: 'var(--color-accent)', marginLeft: 'auto' }}>Saved</span>}
      </div>

      {/* Identity (read-only fields) */}
      <FormSection label="Identity">
        <InfoRow label="Canonical name">
          <code style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{cn}</code>
        </InfoRow>
        <InfoRow label="Entity type">
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{formatEntityType(entity.entityType)}</span>
        </InfoRow>
        <FormRow label="Display name">
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            style={inputStyle}
          />
        </FormRow>
      </FormSection>

      {/* Content */}
      <FormSection label="Content">
        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Reference text or lore (markdown supported)"
            style={{ ...inputStyle, width: '100%', resize: 'vertical', height: '80px' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Personal notes</label>
          <textarea
            value={userNotes}
            onChange={e => setUserNotes(e.target.value)}
            rows={2}
            placeholder="Your private notes"
            style={{ ...inputStyle, width: '100%', resize: 'vertical', height: '60px' }}
          />
        </div>
      </FormSection>

      {/* Tags */}
      <FormSection label="Tags">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Add a tag…"
            style={{ ...inputStyle, flex: 1 }}
          />
          <Button size="sm" variant="ghost" onClick={addTag}>Add</Button>
        </div>
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {tags.map(t => (
              <span
                key={t}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '3px 8px', background: 'var(--color-surface-3)',
                  border: '1px solid var(--color-border)', borderRadius: '4px',
                  fontSize: '12px', color: 'var(--color-text-muted)',
                }}
              >
                {t}
                <button
                  onClick={() => setTags(prev => prev.filter(x => x !== t))}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex', lineHeight: 1 }}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </FormSection>

      {/* Extra fields */}
      <FormSection label="Extra Fields">
        {extraData.map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
            <input
              value={row.key}
              onChange={e => updateExtraRow(i, 'key', e.target.value)}
              placeholder="key"
              style={{ ...inputStyle, width: '140px', fontFamily: 'monospace', fontSize: '12px' }}
            />
            <input
              value={row.value}
              onChange={e => updateExtraRow(i, 'value', e.target.value)}
              placeholder="value"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={() => removeExtraRow(i)}
              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex' }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <Button size="sm" variant="ghost" onClick={addExtraRow}>
          <Plus size={12} /> Add field
        </Button>
      </FormSection>

      {/* Links */}
      <FormSection label="Links">
        {links.length > 0 && (
          <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {links.map(l => (
              <div
                key={l.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 10px', background: 'var(--color-surface-1)',
                  borderRadius: '5px', border: '1px solid var(--color-border)', fontSize: '12px',
                }}
              >
                <code style={{ color: 'var(--color-accent)', flexShrink: 0 }}>{l.label}</code>
                <span style={{ color: 'var(--color-text-subtle)' }}>→</span>
                <code style={{ color: 'var(--color-text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.sourceCn === cn ? l.targetCn : l.sourceCn}
                </code>
                {l.bidirectional && (
                  <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)', flexShrink: 0 }}>↔</span>
                )}
                <button
                  onClick={() => handleDeleteLink(l)}
                  style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex', flexShrink: 0 }}
                  title="Delete link"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginBottom: '10px' }}>
          Link this entity to another by canonical name.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={linkTarget}
              onChange={e => setLinkTarget(e.target.value)}
              placeholder="Target canonical name"
              style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', fontSize: '12px' }}
            />
            <input
              value={linkLabel}
              onChange={e => setLinkLabel(e.target.value)}
              placeholder="label (e.g. corresponds-to)"
              style={{ ...inputStyle, width: '180px', fontFamily: 'monospace', fontSize: '12px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={linkBidi}
                onChange={e => setLinkBidi(e.target.checked)}
                style={{ accentColor: 'var(--color-accent)' }}
              />
              Bidirectional
            </label>
            <Button size="sm" variant="ghost" onClick={handleAddLink}>
              <Plus size={12} /> Add Link
            </Button>
          </div>
          {linkErr && (
            <div style={{ fontSize: '12px', color: 'var(--color-danger, #e06060)' }}>{linkErr}</div>
          )}
        </div>
      </FormSection>

      {error && (
        <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(200,60,60,0.1)', border: '1px solid rgba(200,60,60,0.3)', borderRadius: '6px', fontSize: '13px', color: 'var(--color-danger, #e06060)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
          <Button variant="ghost" onClick={() => navigate({ to: '/custom' })}>Cancel</Button>
        </div>

        {!confirmDel ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDel(true)}
            style={{ color: 'var(--color-danger, #c44)', borderColor: 'var(--color-danger, #c44)' }}
          >
            <Trash2 size={13} /> Delete
          </Button>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Delete permanently?</span>
            <Button size="sm" onClick={handleDelete} style={{ background: 'var(--color-danger, #c44)', borderColor: 'var(--color-danger, #c44)', color: '#fff' }}>
              Yes, delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDel(false)}>Cancel</Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px', padding: '16px 18px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
      <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', flexShrink: 0, minWidth: '120px' }}>{label}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
      <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', flexShrink: 0, minWidth: '120px' }}>{label}</span>
      <div>{children}</div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px',
  background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
  borderRadius: '5px', color: 'var(--color-text)', fontSize: '13px',
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', color: 'var(--color-text-subtle)', marginBottom: '6px',
}
