import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  getAllCustomSpreads,
  saveCustomSpread,
  deleteCustomSpread,
  type CustomSpreadRecord,
} from '@/lib/custom-db'
import type { SpreadPosition } from '@grimoire/core'

export const Route = createFileRoute('/read/spreads')({
  component: SpreadsPage,
})

// ─── helpers ──────────────────────────────────────────────────────────────────

function newId() {
  return `custom-spread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function posId() {
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

/** Default grid coords for a new position: left-to-right, wrapping at col 5. */
function newBlankPosition(count: number): SpreadPosition {
  return {
    id: posId(),
    name: '',
    meaning: '',
    drawOrder: count + 1,
    orientationRule: 'upright-reversed',
    x: count % 5,
    y: Math.floor(count / 5) * 2,
    z: 0,
  }
}

function clampCoord(v: number) { return Math.max(0, Math.min(4, v || 0)) }

// ─── Position row editor ───────────────────────────────────────────────────────

function PositionRow({
  pos, index, total,
  onChange, onDelete, onMove,
}: {
  pos: SpreadPosition
  index: number
  total: number
  onChange: (p: SpreadPosition) => void
  onDelete: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const fieldStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
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
    <div style={{
      padding: '8px 10px',
      background: 'var(--color-surface-2)',
      borderRadius: '6px',
      border: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }}>
      {/* Row 1: index + name + meaning */}
      <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textAlign: 'center' }}>
          {index + 1}
        </span>
        <input
          value={pos.name}
          onChange={e => onChange({ ...pos, name: e.target.value })}
          placeholder="Position name…"
          style={fieldStyle}
        />
        <input
          value={pos.meaning}
          onChange={e => onChange({ ...pos, meaning: e.target.value })}
          placeholder="What this position means…"
          style={fieldStyle}
        />
      </div>

      {/* Row 2: orientation + coords + controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '32px', flexWrap: 'wrap' }}>
        <select
          value={pos.orientationRule}
          onChange={e => onChange({ ...pos, orientationRule: e.target.value as SpreadPosition['orientationRule'] })}
          style={{ ...fieldStyle, cursor: 'pointer', flex: '0 0 auto' }}
        >
          <option value="upright-reversed">Upright / Reversed</option>
          <option value="directional">Directional</option>
          <option value="none">No orientation</option>
        </select>

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginLeft: '4px' }}>
          <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)', marginRight: '2px' }}>Grid:</span>
          {(['x', 'y', 'z'] as const).map(axis => (
            <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)' }}>{axis.toUpperCase()}</span>
              <input
                type="number"
                min={0}
                max={4}
                value={pos[axis]}
                onChange={e => onChange({ ...pos, [axis]: clampCoord(parseInt(e.target.value)) })}
                style={{ ...fieldStyle, width: '42px', padding: '5px 4px', textAlign: 'center' }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '2px', marginLeft: 'auto' }}>
          <button onClick={() => onMove(-1)} disabled={index === 0} title="Move up"
            style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', padding: '4px', color: index === 0 ? 'var(--color-text-subtle)' : 'var(--color-text-muted)' }}>
            <ChevronUp size={14} />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} title="Move down"
            style={{ background: 'none', border: 'none', cursor: index === total - 1 ? 'default' : 'pointer', padding: '4px', color: index === total - 1 ? 'var(--color-text-subtle)' : 'var(--color-text-muted)' }}>
            <ChevronDown size={14} />
          </button>
          <button onClick={onDelete} title="Remove position"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--color-danger)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Spread preview ───────────────────────────────────────────────────────────

const CARD_W = 54
const CARD_H = 76
const CELL_GAP = 10

function SpreadPreview({ positions }: { positions: SpreadPosition[] }) {
  const valid = positions.filter(p => p.name.trim())
  if (valid.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', color: 'var(--color-text-subtle)', fontSize: '12px', fontStyle: 'italic' }}>
        Add positions to see preview
      </div>
    )
  }

  const xs = valid.map(p => p.x)
  const ys = valid.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const cols = maxX - minX + 1
  const rows = maxY - minY + 1
  const maxZ = Math.max(...valid.map(p => p.z))

  const containerW = cols * CARD_W + (cols - 1) * CELL_GAP + maxZ * 8
  const containerH = rows * CARD_H + (rows - 1) * CELL_GAP + maxZ * 8

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto' }}>
      <div style={{ position: 'relative', width: containerW, height: containerH, margin: '0 auto' }}>
        {valid.map((p, i) => {
          const left = (p.x - minX) * (CARD_W + CELL_GAP) + p.z * 8
          const top  = (p.y - minY) * (CARD_H + CELL_GAP) + p.z * 8
          const isStacked = p.z > 0
          return (
            <div
              key={p.id}
              title={p.meaning || p.name}
              style={{
                position: 'absolute',
                left, top,
                width: CARD_W,
                height: CARD_H,
                background: isStacked ? 'var(--color-surface-2)' : 'var(--color-surface-3)',
                border: `1px solid ${isStacked ? 'var(--color-accent)' : 'var(--color-accent-muted)'}`,
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                padding: '4px',
                userSelect: 'none',
              }}
            >
              <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-accent)', lineHeight: 1 }}>
                {i + 1}
              </span>
              <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>
                {p.name}
              </span>
              {p.z > 0 && (
                <span style={{ fontSize: '8px', color: 'var(--color-accent)', marginTop: '2px' }}>z={p.z}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Spread editor form ────────────────────────────────────────────────────────

function SpreadEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: CustomSpreadRecord | null  // null = new
  onSave: (r: CustomSpreadRecord) => void
  onCancel: () => void
}) {
  const [name, setName]               = useState(initial?.displayName ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [positions, setPositions]     = useState<SpreadPosition[]>(initial?.positions ?? [newBlankPosition(0)])
  const [error, setError]             = useState('')

  const updatePos = (i: number, p: SpreadPosition) =>
    setPositions(ps => ps.map((x, j) => j === i ? p : x))

  const deletePos = (i: number) =>
    setPositions(ps => ps.filter((_, j) => j !== i))

  const movePos = (i: number, dir: -1 | 1) => {
    setPositions(ps => {
      const copy = [...ps]
      const swap = i + dir
      if (swap < 0 || swap >= copy.length) return ps
      ;[copy[i], copy[swap]] = [copy[swap], copy[i]]
      return copy
    })
  }

  const handleSave = () => {
    if (!name.trim()) { setError('Name is required.'); return }
    const now = new Date().toISOString()
    const record: CustomSpreadRecord = {
      id:          initial?.id ?? newId(),
      displayName: name.trim(),
      description: description.trim(),
      positions:   positions.filter(p => p.name.trim()).map((p, i) => ({ ...p, drawOrder: i + 1 })),
      createdAt:   initial?.createdAt ?? now,
      updatedAt:   now,
    }
    onSave(record)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    color: 'var(--color-text)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  }

  return (
    <div style={{ border: '1px solid var(--color-accent-muted)', borderRadius: '8px', padding: '20px', background: 'var(--color-surface-2)' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 400 }}>
        {initial ? 'Edit Spread' : 'New Spread'}
      </h3>

      {error && (
        <div style={{ fontSize: '12px', color: 'var(--color-danger)', marginBottom: '12px' }}>{error}</div>
      )}

      {/* Name */}
      <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>
        Name
      </label>
      <input
        value={name}
        onChange={e => { setName(e.target.value); setError('') }}
        placeholder="e.g. Year Ahead"
        autoFocus
        style={{ ...inputStyle, marginBottom: '12px' }}
      />

      {/* Description */}
      <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>
        Description
      </label>
      <input
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Brief description…"
        style={{ ...inputStyle, marginBottom: '20px' }}
      />

      {/* Positions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Positions ({positions.length})
        </label>
        <button
          onClick={() => setPositions(ps => [...ps, newBlankPosition(ps.length)])}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit', padding: 0 }}
        >
          <Plus size={13} /> Add Position
        </button>
      </div>

      {positions.length === 0 ? (
        <p style={{ fontSize: '12px', color: 'var(--color-text-subtle)', margin: '8px 0 16px' }}>
          No positions — this will act as a free-form spread.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr', gap: '8px', padding: '0 10px' }}>
            {['#', 'Name', 'Meaning'].map(h => (
              <span key={h} style={{ fontSize: '10px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
            ))}
          </div>
          {positions.map((p, i) => (
            <PositionRow
              key={p.id}
              pos={p}
              index={i}
              total={positions.length}
              onChange={np => updatePos(i, np)}
              onDelete={() => deletePos(i)}
              onMove={dir => movePos(i, dir)}
            />
          ))}
          <button
            onClick={() => setPositions(ps => [...ps, newBlankPosition(ps.length)])}
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
            <Plus size={13} /> Add Position
          </button>
        </div>
      )}

      {/* Live preview */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
          Preview
        </label>
        <div style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '16px', minHeight: '120px' }}>
          <SpreadPreview positions={positions} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSave}>
          <Save size={13} /> Save Spread
        </Button>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function SpreadsPage() {
  const navigate = useNavigate()
  const [spreads, setSpreads]     = useState<CustomSpreadRecord[]>([])
  const [editing, setEditing]     = useState<CustomSpreadRecord | null | 'new'>( null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    getAllCustomSpreads().then(setSpreads).finally(() => setLoading(false))
  }, [])

  const handleSave = async (r: CustomSpreadRecord) => {
    await saveCustomSpread(r)
    setSpreads(prev => {
      const idx = prev.findIndex(x => x.id === r.id)
      return idx >= 0 ? prev.map(x => x.id === r.id ? r : x) : [...prev, r]
    })
    setEditing(null)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this spread?')) return
    await deleteCustomSpread(id)
    setSpreads(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/read' })}>
          <ArrowLeft size={14} /> Read
        </Button>
        <h1 style={{ fontSize: '20px', fontWeight: 300, margin: 0 }}>Custom Spreads</h1>
        {editing === null && (
          <Button variant="primary" size="sm" style={{ marginLeft: 'auto' }} onClick={() => setEditing('new')}>
            <Plus size={13} /> New Spread
          </Button>
        )}
      </div>

      {/* Editor (new or edit) */}
      {editing !== null && (
        <div style={{ marginBottom: '24px' }}>
          <SpreadEditor
            initial={editing === 'new' ? null : editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Loading…</p>
      ) : spreads.length === 0 && editing === null ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '0 0 12px' }}>No custom spreads yet.</p>
          <Button variant="primary" size="sm" onClick={() => setEditing('new')}>
            <Plus size={13} /> Create your first spread
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {spreads.map(s => (
            <div
              key={s.id}
              style={{ padding: '14px 16px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '3px' }}>{s.displayName}</div>
                {s.description && (
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{s.description}</div>
                )}
                <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>
                  {s.positions.length === 0 ? 'Free form' : `${s.positions.length} position${s.positions.length !== 1 ? 's' : ''}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>
                  <Pencil size={12} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}>
                  <Trash2 size={12} style={{ color: 'var(--color-danger)' }} />
                </Button>
              </div>
            </div>
          ))}
          {editing === null && (
            <Button variant="primary" size="sm" onClick={() => setEditing('new')} style={{ alignSelf: 'flex-start' }}>
              <Plus size={13} /> New Spread
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
