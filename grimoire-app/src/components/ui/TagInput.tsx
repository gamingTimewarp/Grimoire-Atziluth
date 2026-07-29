/**
 * TagInput.tsx
 * Multi-tag filter chip input with autocomplete — moved out of
 * reference/index.tsx (its original, sole owner) so the Custom Deck
 * editor's card picker can reuse the exact same tag-filtering UX.
 */

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

export function Chip({ label, onRemove, accent }: { label: string; onRemove: () => void; accent?: boolean }) {
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

export function TagInput({
  chips, urlChip, suggestions, onAdd, onRemove, onUrlRemove,
}: {
  chips: string[]
  urlChip?: string | undefined
  suggestions: string[]
  onAdd: (t: string) => void
  onRemove: (t: string) => void
  onUrlRemove?: () => void
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
      {urlChip && onUrlRemove && <Chip label={urlChip} onRemove={onUrlRemove} accent />}
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
