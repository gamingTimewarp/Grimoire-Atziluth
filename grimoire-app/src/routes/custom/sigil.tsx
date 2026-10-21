import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity } from '@grimoire/core'
import { saveCustomEntity, deleteCustomEntityByCN } from '@/lib/custom-db'
import {
  emptySigilDesign, sigilDesignFromExtendedData, sigilDesignToExtendedData,
} from '@/lib/sigil-data'
import type { SigilDesign } from '@/lib/sigil-data'
import { SigilEditor } from '@/components/ui/SigilEditor'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Trash2 } from 'lucide-react'

export const Route = createFileRoute('/custom/sigil')({
  validateSearch: (s: Record<string, unknown>) => ({
    edit: typeof s.edit === 'string' ? s.edit : undefined,
  }),
  component: SigilEditorPage,
})

const ENTITY_TYPE = 'magic.custom-sigil'

function slugify(s: string): string {
  return 'custom.sigil.' + s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function newId(): string {
  return crypto.randomUUID()
}

function SigilEditorPage() {
  const { edit } = Route.useSearch()
  const navigate  = useNavigate()
  const { engine } = useEngineStore()

  const [entity, setEntity] = useState<BaseEntity | null>(null)
  const [loading, setLoading] = useState(!!edit)
  const [displayName, setDisplayName] = useState('')
  const [canonicalName, setCanonicalName] = useState('')
  const [cnTouched, setCnTouched] = useState(false)
  const [design, setDesign] = useState<SigilDesign>(emptySigilDesign())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const loadEntity = useCallback(async () => {
    if (!engine || !edit) { setLoading(false); return }
    const e = await engine.adapter.getEntityByCanonicalName(edit)
    if (!e || e.isBuiltIn || e.entityType !== ENTITY_TYPE) { navigate({ to: '/custom' }); return }
    setEntity(e)
    setDisplayName(e.primaryDisplayName)
    setCanonicalName(e.canonicalName)
    setCnTouched(true)
    setDesign(sigilDesignFromExtendedData(e.extendedData))
    setLoading(false)
  }, [engine, edit, navigate])

  useEffect(() => { loadEntity() }, [loadEntity])

  const handleDisplayNameChange = (v: string) => {
    setDisplayName(v)
    if (!cnTouched) setCanonicalName(slugify(v))
  }

  const handleSave = async () => {
    if (!engine) return
    const dn = displayName.trim()
    const cn = canonicalName.trim()

    if (!dn) { setError('Name is required.'); return }
    if (!cn) { setError('Canonical name is required.'); return }
    if (!/^[a-z0-9][\w.-]*$/.test(cn)) {
      setError('Canonical name must be lowercase and contain only letters, numbers, hyphens, and dots.')
      return
    }
    if (design.points.length === 0 && design.circles.length === 0) {
      setError('Add at least one point or circle before saving.')
      return
    }
    if (!entity) {
      const existing = await engine.adapter.getEntityByCanonicalName(cn)
      if (existing) { setError(`Canonical name "${cn}" is already in use.`); return }
    }

    setSaving(true)
    setError(null)
    const extendedData = sigilDesignToExtendedData(design)
    const now = new Date().toISOString()

    try {
      if (entity) {
        await saveCustomEntity({
          id: entity.id, canonicalName: cn, entityType: ENTITY_TYPE, displayName: dn,
          description: entity.description ?? '', userNotes: entity.userNotes ?? '',
          tags: entity.tags, extendedData,
          createdAt: entity.createdAt, updatedAt: now,
        })
        await engine.adapter.updateEntity(entity.id, { primaryDisplayName: dn, extendedData })
      } else {
        const id = newId()
        await saveCustomEntity({
          id, canonicalName: cn, entityType: ENTITY_TYPE, displayName: dn,
          description: '', userNotes: '', tags: ['custom-sigil'], extendedData,
          createdAt: now, updatedAt: now,
        })
        await engine.adapter.createEntity({
          canonicalName: cn, entityType: ENTITY_TYPE, primaryDisplayName: dn,
          tags: ['custom-sigil'], extendedData, isBuiltIn: false,
        })
      }
      navigate({ to: '/custom' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save sigil.')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!engine || !entity) return
    await deleteCustomEntityByCN(entity.canonicalName)
    await engine.adapter.deleteEntity(entity.id)
    navigate({ to: '/custom' })
  }

  if (loading) return null

  return (
    <div style={{ maxWidth: '720px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/custom' })}>
            <ArrowLeft size={13} /> Custom
          </Button>
          <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>{entity ? 'Edit Sigil' : 'New Sigil'}</h1>
        </div>
        {entity && (
          confirmDel ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Delete this sigil?</span>
              <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDel(false)}>Cancel</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDel(true)}>
              <Trash2 size={13} /> Delete
            </Button>
          )
        )}
      </div>

      <div style={{ marginBottom: '20px', padding: '16px 18px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px' }}>
            <label style={labelStyle}>Name</label>
            <input
              value={displayName}
              onChange={e => handleDisplayNameChange(e.target.value)}
              placeholder="e.g. My Protection Sigil"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: '1 1 220px' }}>
            <label style={labelStyle}>Canonical name</label>
            <input
              value={canonicalName}
              onChange={e => { setCanonicalName(e.target.value); setCnTouched(true) }}
              placeholder="e.g. custom.sigil.my-protection-sigil"
              style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px' }}
            />
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 18px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '20px' }}>
        <SigilEditor design={design} onChange={setDesign} />
      </div>

      {error && (
        <div style={{ fontSize: '13px', color: 'var(--color-danger)', marginBottom: '14px' }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Sigil'}</Button>
        <Button variant="ghost" onClick={() => navigate({ to: '/custom' })}>Cancel</Button>
      </div>
    </div>
  )
}

const inputStyle: CSSProperties = {
  width: '100%', padding: '7px 10px',
  background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
  borderRadius: '5px', color: 'var(--color-text)', fontSize: '13px',
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  colorScheme: 'dark',
}

const labelStyle: CSSProperties = {
  display: 'block', fontSize: '12px', color: 'var(--color-text-subtle)',
  marginBottom: '6px',
}
