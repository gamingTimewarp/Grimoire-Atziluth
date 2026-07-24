import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useEngineStore } from '@/stores/engine'
import { saveCustomEntity } from '@/lib/custom-db'
import { CUSTOM_IMAGE_KEY, pickAndStoreCustomImage, removeCustomImage, useCustomImageUrl } from '@/lib/custom-art'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Plus, X, Image as ImageIcon } from 'lucide-react'

export const Route = createFileRoute('/custom/new')({
  component: NewCustomEntityPage,
})

// ─── Entity type options ──────────────────────────────────────────────────────

const COMMON_TYPES = [
  { value: 'deity',       label: 'Deity / Divine Being' },
  { value: 'spirit',      label: 'Spirit / Daemon'      },
  { value: 'herb',        label: 'Herb / Plant'         },
  { value: 'crystal',     label: 'Crystal / Stone'      },
  { value: 'ritual',      label: 'Ritual / Practice'    },
  { value: 'concept',     label: 'Concept / Idea'       },
  { value: 'place',       label: 'Sacred Place'         },
  { value: 'symbol',      label: 'Symbol / Sigil'       },
  { value: 'oracle.card', label: 'Oracle Card'          },
  { value: '',            label: 'Other (enter below)…' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return 'custom.' + s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function newId(): string {
  return crypto.randomUUID()
}

// ─── Component ────────────────────────────────────────────────────────────────

function NewCustomEntityPage() {
  const navigate     = useNavigate()
  const { engine }   = useEngineStore()

  const [displayName,   setDisplayName]   = useState('')
  const [canonicalName, setCanonicalName] = useState('')
  const [cnTouched,     setCnTouched]     = useState(false)
  const [entityTypeKey, setEntityTypeKey] = useState('concept')
  const [customType,    setCustomType]    = useState('')
  const [description,   setDescription]  = useState('')
  const [userNotes,     setUserNotes]     = useState('')
  const [tagInput,      setTagInput]      = useState('')
  const [tags,          setTags]          = useState<string[]>([])
  const [extraData,     setExtraData]     = useState<{ key: string; value: string }[]>([])
  const [imageFileName, setImageFileName] = useState<string | null>(null)
  const [imageBusy,     setImageBusy]     = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [saving,        setSaving]        = useState(false)

  const effectiveType = entityTypeKey === '' ? customType.trim() : entityTypeKey

  const handleDisplayNameChange = (v: string) => {
    setDisplayName(v)
    if (!cnTouched) setCanonicalName(slugify(v))
  }

  const handleCanonicalNameChange = (v: string) => {
    setCanonicalName(v)
    setCnTouched(true)
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t])
      setTagInput('')
    }
  }

  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t))

  const addExtraRow = () => setExtraData(prev => [...prev, { key: '', value: '' }])

  const updateExtraRow = (i: number, field: 'key' | 'value', val: string) => {
    setExtraData(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  const removeExtraRow = (i: number) => setExtraData(prev => prev.filter((_, idx) => idx !== i))

  const handlePickImage = async () => {
    setImageBusy(true)
    try {
      const fileName = await pickAndStoreCustomImage()
      if (fileName) {
        // A prior pick in this session was never saved — it has no references, clean it up.
        if (imageFileName) await removeCustomImage(imageFileName)
        setImageFileName(fileName)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to add image: ${String(err)}`)
    } finally {
      setImageBusy(false)
    }
  }

  const handleRemoveImage = async () => {
    if (imageFileName) await removeCustomImage(imageFileName)
    setImageFileName(null)
  }

  const handleCancel = async () => {
    if (imageFileName) await removeCustomImage(imageFileName)
    navigate({ to: '/custom' })
  }

  const handleSave = async () => {
    if (!engine) return
    const cn = canonicalName.trim()
    const dn = displayName.trim()
    const et = effectiveType

    if (!dn)  { setError('Display name is required.'); return }
    if (!cn)  { setError('Canonical name is required.'); return }
    if (!et)  { setError('Entity type is required.'); return }
    if (!/^[a-z0-9][\w.-]*$/.test(cn)) {
      setError('Canonical name must be lowercase and contain only letters, numbers, hyphens, and dots.')
      return
    }

    // Check for collision
    const existing = await engine.adapter.getEntityByCanonicalName(cn)
    if (existing) { setError(`Canonical name "${cn}" is already in use.`); return }

    setSaving(true)
    setError(null)

    const now = new Date().toISOString()
    const id  = newId()

    const extendedData: Record<string, unknown> = {}
    for (const row of extraData) {
      const k = row.key.trim()
      if (k) extendedData[k] = row.value
    }
    if (imageFileName) extendedData[CUSTOM_IMAGE_KEY] = imageFileName

    const record = {
      id, canonicalName: cn, entityType: et, displayName: dn,
      description, userNotes,
      tags, extendedData,
      createdAt: now, updatedAt: now,
    }

    try {
      await saveCustomEntity(record)
      await engine.adapter.createEntity({
        canonicalName: cn, entityType: et, primaryDisplayName: dn,
        description: description || undefined,
        userNotes:   userNotes   || undefined,
        tags, extendedData,
        isBuiltIn: false,
      })
      navigate({ to: '/custom' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entity.')
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/custom' })}>
          <ArrowLeft size={13} /> Custom
        </Button>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>New Entity</h1>
      </div>

      <FormSection label="Identity">
        <FormRow label="Display name">
          <input
            value={displayName}
            onChange={e => handleDisplayNameChange(e.target.value)}
            placeholder="e.g. Brigid"
            style={inputStyle}
          />
        </FormRow>
        <FormRow label="Canonical name">
          <input
            value={canonicalName}
            onChange={e => handleCanonicalNameChange(e.target.value)}
            placeholder="e.g. custom.brigid"
            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px' }}
          />
        </FormRow>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginBottom: '8px' }}>
          Canonical names are permanent identifiers. Use lowercase, hyphens, and dots only. A <code>custom.</code> prefix is recommended.
        </div>
        <FormRow label="Entity type">
          <select
            value={entityTypeKey}
            onChange={e => setEntityTypeKey(e.target.value)}
            style={inputStyle}
          >
            {COMMON_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </FormRow>
        {entityTypeKey === '' && (
          <FormRow label="Custom type">
            <input
              value={customType}
              onChange={e => setCustomType(e.target.value)}
              placeholder="e.g. genius.loci"
              style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px' }}
            />
          </FormRow>
        )}
        <FormRow label="Image">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ImageThumb fileName={imageFileName} />
            <Button size="sm" variant="ghost" onClick={handlePickImage} disabled={imageBusy}>
              {imageBusy ? 'Adding…' : imageFileName ? 'Replace…' : 'Choose Image…'}
            </Button>
            {imageFileName && (
              <button
                onClick={handleRemoveImage}
                title="Remove image"
                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </FormRow>
      </FormSection>

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
            placeholder="Your private notes about this entity"
            style={{ ...inputStyle, width: '100%', resize: 'vertical', height: '60px' }}
          />
        </div>
      </FormSection>

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
                  onClick={() => removeTag(t)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex', lineHeight: 1 }}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </FormSection>

      <FormSection label="Extra Fields">
        <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginBottom: '10px' }}>
          Store any structured key/value metadata for this entity.
        </div>
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

      {error && (
        <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(200,60,60,0.1)', border: '1px solid rgba(200,60,60,0.3)', borderRadius: '6px', fontSize: '13px', color: 'var(--color-danger, #e06060)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Create Entity'}
        </Button>
        <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ImageThumb({ fileName }: { fileName: string | null }) {
  const url = useCustomImageUrl(fileName)
  return (
    <div style={{
      width: 56, height: 78, borderRadius: '6px', flexShrink: 0, overflow: 'hidden',
      border: '1px solid var(--color-border)', background: 'var(--color-surface-1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {url
        ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <ImageIcon size={18} style={{ color: 'var(--color-text-subtle)' }} />}
    </div>
  )
}

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px', padding: '16px 18px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '12px' }}>
      <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', flexShrink: 0, minWidth: '120px' }}>{label}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px',
  background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
  borderRadius: '5px', color: 'var(--color-text)', fontSize: '13px',
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  colorScheme: 'dark',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', color: 'var(--color-text-subtle)',
  marginBottom: '6px',
}
